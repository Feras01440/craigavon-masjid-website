import { SiteSettingForm } from "@/components/admin/site-setting-form";
import { requirePermission } from "@/lib/auth/session";
import { roleHasPermission } from "@/lib/permissions";
import {
  managedSettingDefaults,
  managedSettingKeys,
  type ManagedSettingKey,
  type ManagedSettingStatus,
  validateManagedSettingValue,
} from "@/lib/settings/site-settings";
import { listSiteSettingsForAdmin } from "@/server/repositories/site-settings";

function formatUpdatedAt(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date(value));
}

export default async function SiteSettingsPage() {
  const context = await requirePermission("content:read");
  const records = await listSiteSettingsForAdmin(context.supabase);
  const recordsByKey = new Map(records.map((record) => [record.setting.key, record]));
  const managedKeys = new Set<string>(managedSettingKeys);
  const otherRecords = records.filter((record) => !managedKeys.has(record.setting.key));
  const canWrite = roleHasPermission(context.role, "content:write");

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">Controlled public configuration</p>
          <h1>Website settings</h1>
          <p>
            Manage verified identity, contact, navigation, display and feature controls through
            fixed fields. Blank values remain private until an authorised editor publishes them.
          </p>
        </div>
      </div>

      <div className="admin-card admin-card--narrow">
        <h2>Before publishing</h2>
        <p>
          Check factual details against the committee-confirmation register. Publishing or changing
          a public setting requires an authenticator-confirmed session and is written to the audit
          log.
        </p>
        {!canWrite && (
          <p>
            Your role can review these settings but cannot change them. Disabled fields below show
            the currently stored values.
          </p>
        )}
      </div>

      <div className="admin-settings-list">
        {managedSettingKeys.map((settingKey: ManagedSettingKey) => {
          const record = recordsByKey.get(settingKey);
          const parsed = record
            ? validateManagedSettingValue(settingKey, record.setting.value, "draft")
            : { success: true as const, data: managedSettingDefaults[settingKey] };
          const supportedStatus =
            !record || record.setting.status !== "scheduled"
              ? (record?.setting.status as ManagedSettingStatus | undefined)
              : undefined;
          const invalidStoredValue = !parsed.success || (!!record && !supportedStatus);
          return (
            <SiteSettingForm
              key={`${settingKey}-${record?.setting.version ?? "new"}`}
              settingKey={settingKey}
              initialValue={parsed.success ? parsed.data : managedSettingDefaults[settingKey]}
              metadata={
                record && supportedStatus
                  ? {
                      version: record.setting.version,
                      status: supportedStatus,
                      updatedAt: record.setting.updated_at,
                      updatedByName: record.updatedByName,
                      hasActor: !!record.setting.updated_by,
                    }
                  : null
              }
              canWrite={canWrite}
              invalidStoredValue={invalidStoredValue}
            />
          );
        })}
      </div>

      {otherRecords.length > 0 && (
        <section className="admin-section" aria-labelledby="other-settings-heading">
          <h2 id="other-settings-heading">System-managed setting records</h2>
          <p>
            These records are retained for operational checks but are not editable through the
            public-settings forms.
          </p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <caption className="admin-visually-hidden">Other site setting records</caption>
              <thead>
                <tr>
                  <th scope="col">Key</th>
                  <th scope="col">Status</th>
                  <th scope="col">Version</th>
                  <th scope="col">Updated</th>
                </tr>
              </thead>
              <tbody>
                {otherRecords.map(({ setting }) => (
                  <tr key={setting.key}>
                    <th scope="row">
                      <code>{setting.key}</code>
                    </th>
                    <td>
                      <span className={`admin-status admin-status--${setting.status}`}>
                        {setting.status}
                      </span>
                    </td>
                    <td>{setting.version}</td>
                    <td>
                      <time dateTime={setting.updated_at}>
                        {formatUpdatedAt(setting.updated_at)}
                      </time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
