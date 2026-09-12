import { ContentForm } from "@/components/admin/content-form";
import { requirePermission } from "@/lib/auth/session";

export default async function NewContentPage() {
  await requirePermission("content:write");
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">Website information</p>
          <h1>Create content</h1>
          <p>Save as a draft first when another committee member needs to review it.</p>
        </div>
      </div>
      <ContentForm />
    </>
  );
}
