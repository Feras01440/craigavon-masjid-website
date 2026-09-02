import Link from "next/link";

import { MediaStatusForm } from "@/components/admin/media-status-form";
import { MediaUploadForm } from "@/components/admin/media-upload-form";
import { roleHasPermission } from "@/lib/permissions";
import { requirePermission } from "@/lib/auth/session";

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function MediaPage() {
  const context = await requirePermission("media:read");
  const { data: assets, error } = await context.supabase
    .from("media_assets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error || !assets) throw new Error("The media library could not be loaded safely.");
  const canWrite = roleHasPermission(context.role, "media:write");

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">Files and images</p>
          <h1>Media library</h1>
          <p>Every upload is checked by content signature and records its accessibility purpose.</p>
        </div>
      </div>
      {canWrite && (
        <section className="admin-section admin-section--first" aria-labelledby="upload-heading">
          <h2 id="upload-heading">Upload media</h2>
          <MediaUploadForm />
        </section>
      )}
      <section className="admin-section" aria-labelledby="library-heading">
        <h2 id="library-heading">Stored media</h2>
        {!assets.length ? (
          <div className="admin-empty">
            <h3>No media uploaded</h3>
            <p>Safe uploads will appear here with their publication and accessibility details.</p>
          </div>
        ) : (
          <div className="admin-card-grid">
            {assets.map((asset) => {
              return (
                <article className="admin-media-card" key={asset.id}>
                  <div className="admin-media-card__heading">
                    <h3>{asset.original_name}</h3>
                    <span className={`admin-status admin-status--${asset.status}`}>
                      {asset.status}
                    </span>
                  </div>
                  <dl className="admin-compact-list">
                    <div>
                      <dt>Type</dt>
                      <dd>{asset.mime_type}</dd>
                    </div>
                    <div>
                      <dt>Size</dt>
                      <dd>{fileSize(asset.byte_size)}</dd>
                    </div>
                    {asset.width && asset.height && (
                      <div>
                        <dt>Dimensions</dt>
                        <dd>
                          {asset.width} × {asset.height} px
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt>Accessibility</dt>
                      <dd>{asset.decorative ? "Decorative" : asset.alt_text}</dd>
                    </div>
                    {asset.caption && (
                      <div>
                        <dt>Caption</dt>
                        <dd>{asset.caption}</dd>
                      </div>
                    )}
                    {asset.credit && (
                      <div>
                        <dt>Credit</dt>
                        <dd>{asset.credit}</dd>
                      </div>
                    )}
                  </dl>
                  {asset.status === "published" && !asset.deleted_at && (
                    <p>
                      <Link href={`/media/${asset.id}`} target="_blank" rel="noreferrer">
                        Open published file
                        <span className="admin-visually-hidden"> {asset.original_name}</span>
                      </Link>
                    </p>
                  )}
                  {canWrite && (
                    <MediaStatusForm
                      id={asset.id}
                      status={asset.status}
                      updatedAt={asset.updated_at}
                    />
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
