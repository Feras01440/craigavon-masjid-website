import sanitizeHtml from "sanitize-html";
import { z } from "zod";

import {
  contentDocumentIsCompatible,
  contentDocumentSchema,
  type ContentDocument,
} from "@/lib/content/content-documents";

export const publicContentTypes = [
  "news",
  "event",
  "service",
  "education",
  "policy",
  "faq",
] as const;

export const publicContentTypeSchema = z.enum(publicContentTypes);
export type PublicContentType = z.infer<typeof publicContentTypeSchema>;

export const publicDatabaseContentKinds = [
  "announcement",
  "emergency_notice",
  "event",
  "service",
  "education",
  "policy",
  "faq",
] as const;

export type PublicDatabaseContentKind = (typeof publicDatabaseContentKinds)[number];

const publicDatabaseContentKindSchema = z.enum(publicDatabaseContentKinds);
const dateTimeSchema = z.string().datetime({ offset: true });
const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const publishedContentRowSchema = z
  .object({
    id: z.string().uuid(),
    kind: publicDatabaseContentKindSchema,
    slug: slugSchema,
    title: z.string().min(1).max(160),
    summary: z.string().max(500).nullable(),
    body: contentDocumentSchema,
    category: z.string().max(80).nullable(),
    status: z.enum(["published", "scheduled"]),
    featured: z.boolean(),
    publish_at: dateTimeSchema.nullable(),
    expires_at: dateTimeSchema.nullable(),
    published_by: z.string().uuid(),
    published_at: dateTimeSchema,
    deleted_at: z.null(),
    updated_at: dateTimeSchema,
  })
  .strict()
  .superRefine((row, context) => {
    if (!contentDocumentIsCompatible(row.kind, row.body)) {
      context.addIssue({
        code: "custom",
        path: ["body", "format"],
        message: "The document format does not match the content type.",
      });
    }
    if (row.body.format === "event") {
      if (!row.body.starts_at) {
        context.addIssue({
          code: "custom",
          path: ["body", "starts_at"],
          message: "A published structured event needs a start time.",
        });
      }
      if (!row.body.location) {
        context.addIssue({
          code: "custom",
          path: ["body", "location"],
          message: "A published structured event needs a location.",
        });
      }
    }
    if (row.body.format === "policy") {
      if (!row.body.owner) {
        context.addIssue({
          code: "custom",
          path: ["body", "owner"],
          message: "A published structured policy needs an owner.",
        });
      }
      if (!row.body.effective_on) {
        context.addIssue({
          code: "custom",
          path: ["body", "effective_on"],
          message: "A published structured policy needs an effective date.",
        });
      }
    }
  });

const kindToPublicType: Record<PublicDatabaseContentKind, PublicContentType> = {
  announcement: "news",
  emergency_notice: "news",
  event: "event",
  service: "service",
  education: "education",
  policy: "policy",
  faq: "faq",
};

const typeToDatabaseKinds: Record<PublicContentType, readonly PublicDatabaseContentKind[]> = {
  news: ["announcement", "emergency_notice"],
  event: ["event"],
  service: ["service"],
  education: ["education"],
  policy: ["policy"],
  faq: ["faq"],
};

const unsafeControlCharacters =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu;
const sanitisedEntity = /&(amp|lt|gt|quot|apos|nbsp|#\d+|#x[\da-f]+);/giu;
const sanitisedNamedEntities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
};

export type PublicContentDetails =
  | {
      format: "notice";
      actionLabel: string | null;
      actionUrl: string | null;
    }
  | {
      format: "event";
      startsAt: string;
      endsAt: string | null;
      location: string;
      eventUrl: string | null;
    }
  | {
      format: "service";
      audience: string | null;
      availability: string | null;
      accessInstructions: string | null;
      serviceUrl: string | null;
    }
  | {
      format: "education";
      audience: string | null;
      schedule: string | null;
      registrationUrl: string | null;
      safeguardingNote: string | null;
    }
  | {
      format: "policy";
      owner: string;
      effectiveOn: string;
      reviewOn: string | null;
    }
  | { format: "faq" };

export type PublicContentItem = {
  id: string;
  type: PublicContentType;
  sourceKind: PublicDatabaseContentKind;
  slug: string;
  title: string;
  summary: string | null;
  bodyBlocks: string[];
  details?: PublicContentDetails;
  category: string | null;
  featured: boolean;
  publishedAt: string;
  updatedAt: string;
  expiresAt: string | null;
};

export type PublicContentMappingResult = {
  items: PublicContentItem[];
  rejectedCount: number;
};

export function databaseKindsFor(types: readonly PublicContentType[]): PublicDatabaseContentKind[] {
  const kinds = new Set<PublicDatabaseContentKind>();

  for (const type of types) {
    const mappedKinds = typeToDatabaseKinds[type];
    if (!mappedKinds) continue;
    for (const kind of mappedKinds) {
      kinds.add(kind);
    }
  }

  return [...kinds];
}

export function isPublicContentSlug(value: string): boolean {
  return slugSchema.safeParse(value).success;
}

function sanitizePlainText(value: string): string {
  const stripped = sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: "discard",
    nonTextTags: ["script", "style", "textarea", "option", "noscript"],
  });

  return stripped
    .replace(sanitisedEntity, (entity) => {
      const normalised = entity.slice(1, -1).toLowerCase();
      if (normalised in sanitisedNamedEntities) return sanitisedNamedEntities[normalised]!;

      const radix = normalised.startsWith("#x") ? 16 : 10;
      const digits = normalised.slice(radix === 16 ? 2 : 1);
      const codePoint = Number.parseInt(digits, radix);
      if (
        !Number.isInteger(codePoint) ||
        codePoint > 0x10ffff ||
        (codePoint >= 0xd800 && codePoint <= 0xdfff)
      ) {
        return "\ufffd";
      }
      return String.fromCodePoint(codePoint);
    })
    .replace(unsafeControlCharacters, "")
    .replace(/\r\n?/gu, "\n")
    .normalize("NFC")
    .trim();
}

function bodyBlocks(value: string): string[] {
  return sanitizePlainText(value)
    .split(/\n[\t ]*\n+/gu)
    .map((block) => block.trim())
    .filter(Boolean);
}

function optionalSanitizedText(value: string | null): string | null {
  if (!value) return null;
  return sanitizePlainText(value) || null;
}

function mapDocumentDetails(document: ContentDocument): PublicContentDetails | undefined {
  switch (document.format) {
    case "plain_text":
      return undefined;
    case "notice":
      return {
        format: "notice",
        actionLabel: optionalSanitizedText(document.action_label),
        actionUrl: document.action_url,
      };
    case "event":
      if (!document.starts_at || !document.location) return undefined;
      return {
        format: "event",
        startsAt: document.starts_at,
        endsAt: document.ends_at,
        location: sanitizePlainText(document.location),
        eventUrl: document.event_url,
      };
    case "service":
      return {
        format: "service",
        audience: optionalSanitizedText(document.audience),
        availability: optionalSanitizedText(document.availability),
        accessInstructions: optionalSanitizedText(document.access_instructions),
        serviceUrl: document.service_url,
      };
    case "education":
      return {
        format: "education",
        audience: optionalSanitizedText(document.audience),
        schedule: optionalSanitizedText(document.schedule),
        registrationUrl: document.registration_url,
        safeguardingNote: optionalSanitizedText(document.safeguarding_note),
      };
    case "policy":
      if (!document.owner || !document.effective_on) return undefined;
      return {
        format: "policy",
        owner: sanitizePlainText(document.owner),
        effectiveOn: document.effective_on,
        reviewOn: document.review_on,
      };
    case "faq":
      return { format: "faq" };
  }
}

export function mapPublishedContentRow(
  value: unknown,
  now: Date = new Date(),
): PublicContentItem | null {
  const parsed = publishedContentRowSchema.safeParse(value);
  if (!parsed.success || Number.isNaN(now.getTime())) return null;

  const row = parsed.data;
  const nowTime = now.getTime();
  const publishedTime = Date.parse(row.published_at);
  const effectiveTime = Date.parse(row.publish_at ?? row.published_at);
  const expiryTime = row.expires_at ? Date.parse(row.expires_at) : null;

  if (publishedTime > nowTime || effectiveTime > nowTime) return null;
  if (expiryTime !== null && expiryTime <= nowTime) return null;

  const title = sanitizePlainText(row.title);
  const summary = row.summary ? sanitizePlainText(row.summary) : null;
  const category = row.category ? sanitizePlainText(row.category) : null;
  const blocks = bodyBlocks(row.body.text);
  const details = mapDocumentDetails(row.body);

  if (!title || blocks.length === 0) return null;
  if (details?.format === "event" && !details.location) return null;
  if (details?.format === "policy" && !details.owner) return null;
  if (
    details?.format === "notice" &&
    (details.actionLabel === null) !== (details.actionUrl === null)
  ) {
    return null;
  }

  return {
    id: row.id,
    type: kindToPublicType[row.kind],
    sourceKind: row.kind,
    slug: row.slug,
    title,
    summary: summary || null,
    bodyBlocks: blocks,
    ...(details ? { details } : {}),
    category: category || null,
    featured: row.featured,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
  };
}

export function mapPublishedContentRows(
  values: readonly unknown[],
  now: Date = new Date(),
): PublicContentMappingResult {
  const items: PublicContentItem[] = [];
  let rejectedCount = 0;

  for (const value of values) {
    const item = mapPublishedContentRow(value, now);
    if (item) items.push(item);
    else rejectedCount += 1;
  }

  return { items, rejectedCount };
}
