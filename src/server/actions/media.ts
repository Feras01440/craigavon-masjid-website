"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { z } from "zod";

import type { ActionState } from "@/lib/auth/errors";
import { AdminAccessError, safeActionError } from "@/lib/auth/errors";
import { requirePermission } from "@/lib/auth/session";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 12_000;
const MAX_IMAGE_PIXELS = 40_000_000;

const acceptedFiles = {
  "image/jpeg": { extension: "jpg", sharpFormat: "jpeg" },
  "image/png": { extension: "png", sharpFormat: "png" },
  "image/webp": { extension: "webp", sharpFormat: "webp" },
  "image/avif": { extension: "avif", sharpFormat: "heif" },
  "application/pdf": { extension: "pdf", sharpFormat: null },
} as const;

type AcceptedMime = keyof typeof acceptedFiles;

const metadataSchema = z
  .object({
    purpose: z.enum(["meaningful", "decorative"]),
    altText: z.string().trim().max(500),
    caption: z.string().trim().max(1_000),
    credit: z.string().trim().max(300),
    status: z.enum(["draft", "published"]),
  })
  .superRefine((value, context) => {
    if (value.purpose === "meaningful" && value.altText.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["altText"],
        message: "Describe what the image communicates.",
      });
    }
    if (value.purpose === "decorative" && value.altText.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["altText"],
        message: "Leave alternative text empty for a decorative image.",
      });
    }
  });

const statusSchema = z.object({
  id: z.uuid(),
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
  status: z.enum(["draft", "published", "archived"]),
});

function textField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function fieldFailure(message: string, field: string): ActionState {
  return {
    status: "error",
    message: "Check the upload details. Nothing was saved.",
    fieldErrors: { [field]: [message] },
  };
}

function detectMime(buffer: Buffer): AcceptedMime | null {
  if (buffer.length >= 12) {
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
    if (
      buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ) {
      return "image/png";
    }
    if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
      return "image/webp";
    }
    if (buffer.toString("ascii", 4, 8) === "ftyp") {
      const brandBlock = buffer.toString("ascii", 8, Math.min(buffer.length, 32));
      if (brandBlock.includes("avif") || brandBlock.includes("avis")) return "image/avif";
    }
  }
  if (buffer.length >= 5 && buffer.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  return null;
}

function safeOriginalName(name: string): string {
  const cleaned = name
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/]/g, "-")
    .trim();
  return (cleaned || "upload").slice(0, 255);
}

function safeStem(name: string): string {
  const withoutExtension = name.replace(/\.[^.]+$/, "");
  const stem = withoutExtension
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return stem || "media";
}

async function prepareImage(
  buffer: Buffer,
  mime: AcceptedMime,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  if (mime === "application/pdf") {
    throw new AdminAccessError(
      "validation",
      "PDF uploads are disabled until production malware scanning is configured.",
    );
  }
  let metadata: { width?: number; height?: number; format?: string };
  try {
    metadata = await sharp(buffer, {
      limitInputPixels: MAX_IMAGE_PIXELS,
      failOn: "error",
    }).metadata();
  } catch {
    throw new AdminAccessError("validation", "The image data is damaged or unsafe to process.");
  }
  const width = metadata.width;
  const height = metadata.height;
  const expectedFormat = acceptedFiles[mime].sharpFormat;
  if (!width || !height || metadata.format !== expectedFormat) {
    throw new AdminAccessError(
      "validation",
      "The image contents do not match the selected file type.",
    );
  }
  if (
    width > MAX_IMAGE_DIMENSION ||
    height > MAX_IMAGE_DIMENSION ||
    width * height > MAX_IMAGE_PIXELS
  ) {
    throw new AdminAccessError(
      "validation",
      "The image dimensions are too large. Use an image under 12,000 pixels per side.",
    );
  }
  let pipeline = sharp(buffer, {
    limitInputPixels: MAX_IMAGE_PIXELS,
    failOn: "error",
  })
    .rotate()
    .resize({
      width: 2560,
      height: 2560,
      fit: "inside",
      withoutEnlargement: true,
    });
  switch (mime) {
    case "image/jpeg":
      pipeline = pipeline.jpeg({ quality: 85, mozjpeg: true });
      break;
    case "image/png":
      pipeline = pipeline.png({ compressionLevel: 9 });
      break;
    case "image/webp":
      pipeline = pipeline.webp({ quality: 85 });
      break;
    case "image/avif":
      pipeline = pipeline.avif({ quality: 60 });
      break;
  }
  const prepared = await pipeline.toBuffer({ resolveWithObject: true });
  if (!prepared.info.width || !prepared.info.height || prepared.data.byteLength > MAX_FILE_BYTES) {
    throw new AdminAccessError(
      "validation",
      "The processed image is too large. Use a smaller source image.",
    );
  }
  return {
    buffer: prepared.data,
    width: prepared.info.width,
    height: prepared.info.height,
  };
}

export async function uploadMediaAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsedMetadata = metadataSchema.safeParse({
      purpose: textField(formData, "purpose"),
      altText: textField(formData, "altText"),
      caption: textField(formData, "caption"),
      credit: textField(formData, "credit"),
      status: textField(formData, "status"),
    });
    if (!parsedMetadata.success) {
      const flattened = z.flattenError(parsedMetadata.error);
      return {
        status: "error",
        message: "Check the upload details. Nothing was saved.",
        fieldErrors: flattened.fieldErrors,
      };
    }

    const value = formData.get("file");
    if (!(value instanceof File) || value.size === 0)
      return fieldFailure("Choose a file to upload.", "file");
    if (value.size > MAX_FILE_BYTES)
      return fieldFailure("The file must be 10 MB or smaller.", "file");

    const context = await requirePermission("media:write", { requireAal2: true });
    const service = createSupabaseServiceClient();
    const buffer = Buffer.from(await value.arrayBuffer());
    const mime = detectMime(buffer);
    if (!mime) return fieldFailure("Use a genuine JPEG, PNG, WebP, AVIF, or PDF file.", "file");
    if (value.type && value.type !== mime) {
      return fieldFailure("The file contents do not match the browser-reported file type.", "file");
    }
    const prepared = await prepareImage(buffer, mime);
    const originalName = safeOriginalName(value.name);
    const dateFolder = new Date().toISOString().slice(0, 7);
    const objectPath = `${context.userId}/${dateFolder}/${randomUUID()}-${safeStem(originalName)}.${acceptedFiles[mime].extension}`;

    const { error: uploadError } = await service.storage
      .from("media")
      .upload(objectPath, prepared.buffer, {
        contentType: mime,
        cacheControl: "31536000",
        upsert: false,
      });
    if (uploadError)
      throw new AdminAccessError(
        "service",
        "The media store refused the upload. Nothing was saved.",
      );

    const { error: insertError } = await context.supabase.rpc("register_media_asset", {
      p_object_path: objectPath,
      p_original_name: originalName,
      p_mime_type: mime,
      p_byte_size: prepared.buffer.byteLength,
      p_width: prepared.width,
      p_height: prepared.height,
      p_alt_text: parsedMetadata.data.altText,
      p_decorative: parsedMetadata.data.purpose === "decorative",
      p_caption: parsedMetadata.data.caption,
      p_credit: parsedMetadata.data.credit,
      p_status: parsedMetadata.data.status,
    });
    if (insertError) {
      const cleanup = await service.storage.from("media").remove([objectPath]);
      if (cleanup.error) {
        console.error(
          "Orphaned media object after database failure",
          objectPath,
          cleanup.error.message,
        );
        throw new AdminAccessError(
          "service",
          "The media record was not saved and the uploaded file needs technical cleanup.",
        );
      }
      throw new AdminAccessError(
        "service",
        "The media record could not be saved, so the uploaded file was removed.",
      );
    }

    revalidatePath("/admin/media");
    revalidatePath("/", "layout");
    return { status: "success", message: "Media uploaded successfully." };
  } catch (error) {
    return safeActionError(error);
  }
}

export async function updateMediaStatusAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = statusSchema.safeParse({
      id: textField(formData, "id"),
      expectedUpdatedAt: textField(formData, "expectedUpdatedAt"),
      status: textField(formData, "status"),
    });
    if (!parsed.success) return { status: "error", message: "Choose a valid media status." };
    const context = await requirePermission("media:write", { requireAal2: true });
    const { data, error } = await context.supabase.rpc("update_media_asset_status", {
      p_id: parsed.data.id,
      p_expected_updated_at: parsed.data.expectedUpdatedAt,
      p_status: parsed.data.status,
    });
    if (error?.code === "23503") {
      throw new AdminAccessError(
        "validation",
        "This asset is still used by content. Replace those uses before archiving it.",
      );
    }
    if (error?.code === "40001") {
      throw new AdminAccessError(
        "conflict",
        "This media asset changed. Reload before updating its status.",
      );
    }
    if (error || !data) {
      throw new AdminAccessError("service", "The media status could not be changed.");
    }
    revalidatePath("/admin/media");
    revalidatePath("/", "layout");
    return { status: "success", message: "Media status updated." };
  } catch (error) {
    return safeActionError(error);
  }
}
