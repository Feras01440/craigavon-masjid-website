import Link from "next/link";

import { PrayerSettingsForm } from "@/components/admin/prayer-settings-form";
import { requirePermission } from "@/lib/auth/session";

export default async function NewPrayerSettingsPage() {
  await requirePermission("prayer:write");
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">Prayer timetable draft</p>
          <h1>Create prayer timetable</h1>
          <p>
            <Link href="/admin/prayer-times">Back to all prayer timetables</Link>
          </p>
        </div>
      </div>
      <div className="admin-feedback" role="status">
        Saving creates a private draft. It will not appear on the website or TV display until an
        authorised editor reviews the preview, records committee approval and publishes it.
      </div>
      <section className="admin-section admin-section--first" aria-label="Timetable settings">
        <PrayerSettingsForm />
      </section>
    </>
  );
}
