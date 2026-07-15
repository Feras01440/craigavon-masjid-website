import Link from "next/link";
import { z } from "zod";

import { ConfirmedActionButton } from "@/components/admin/confirmed-action-button";
import { PrayerOverrideForm } from "@/components/admin/prayer-override-form";
import { PrayerPreview } from "@/components/admin/prayer-preview";
import { PrayerPublishForm } from "@/components/admin/prayer-publish-form";
import { PrayerSettingsForm } from "@/components/admin/prayer-settings-form";
import { PrayerSeasonalForm } from "@/components/admin/prayer-seasonal-form";
import {
  PrayerWithdrawalForm,
  type PrayerReplacementDraft,
} from "@/components/admin/prayer-withdrawal-form";
import { requirePermission } from "@/lib/auth/session";
import { roleHasPermission } from "@/lib/permissions";
import type { CongregationRule, PrayerConfiguration } from "@/lib/prayer/types";
import {
  clonePrayerSettingsAction,
  deletePrayerOverrideAction,
  deleteSeasonalArrangementAction,
  restorePrayerRevisionAction,
} from "@/server/actions/prayer";
import { getPrayerConfigurationForAdmin } from "@/server/repositories/prayer-admin";

const statusLabels = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
} as const;

const calculationLabels: Record<PrayerConfiguration["calculationMethod"], string> = {
  moonsighting_committee: "Moonsighting Committee",
  muslim_world_league: "Muslim World League",
  north_america: "North America",
  karachi: "University of Islamic Sciences, Karachi",
  egyptian: "Egyptian General Authority",
  umm_al_qura: "Umm al-Qura University",
  imported_official: "Committee-approved imported timetable",
};

const prayerLabels = {
  fajr: "Fajr",
  sunrise: "Sunrise",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
} as const;

const seasonalKindLabels = {
  ramadan: "Ramadan",
  eid_al_fitr: "Eid al-Fitr",
  eid_al_adha: "Eid al-Adha",
  closure: "Temporary closure",
  other: "Other",
} as const;

function formatAdminDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date(value));
}

function MissingConfiguration() {
  return (
    <div className="admin-card admin-card--narrow">
      <p className="admin-eyebrow">Timetable unavailable</p>
      <h1>We could not find that prayer configuration</h1>
      <p>It may have been removed, or your committee role may not allow you to review it.</p>
      <Link className="admin-button" href="/admin/prayer-times">
        Back to prayer timetables
      </Link>
    </div>
  );
}

function congregationRuleLabel(rule: CongregationRule): string {
  if (rule.type === "unavailable") return "Not confirmed";
  if (rule.type === "fixed") return `Fixed at ${rule.time}`;
  if (rule.type === "joined") return `Joined with ${prayerLabels[rule.with]}`;
  return `${rule.minutes} minutes after the start, rounded up to ${rule.roundTo} minute${
    rule.roundTo === 1 ? "" : "s"
  }${rule.latest ? `, no later than ${rule.latest}` : ""}`;
}

function ConfigurationSummary({ configuration }: { configuration: PrayerConfiguration }) {
  return (
    <div className="admin-card">
      <h2>Configuration record</h2>
      <dl className="admin-compact-list">
        <div>
          <dt>Status</dt>
          <dd>
            <span className={`admin-status admin-status--${configuration.status}`}>
              {statusLabels[configuration.status]}
            </span>
          </dd>
        </div>
        <div>
          <dt>Effective</dt>
          <dd>
            <time dateTime={configuration.effectiveFrom}>{configuration.effectiveFrom}</time> to{" "}
            {configuration.effectiveTo ? (
              <time dateTime={configuration.effectiveTo}>{configuration.effectiveTo}</time>
            ) : (
              "no fixed end date"
            )}
          </dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>
            {configuration.sourceName}
            {configuration.sourceReference && (
              <span className="admin-table-secondary">{configuration.sourceReference}</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Calculation</dt>
          <dd>
            {calculationLabels[configuration.calculationMethod]} · {configuration.madhab} Asr ·{" "}
            {configuration.highLatitudeRule.replaceAll("_", " ")}
            <span className="admin-table-secondary">
              Hijri date adjustment: {configuration.hijriAdjustment > 0 ? "+" : ""}
              {configuration.hijriAdjustment} day
            </span>
          </dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>
            {configuration.latitude}, {configuration.longitude} · {configuration.timezone}
          </dd>
        </div>
        <div>
          <dt>Engine</dt>
          <dd>
            {configuration.calculationLibrary} {configuration.calculationLibraryVersion}
          </dd>
        </div>
        <div>
          <dt>Last updated</dt>
          <dd>
            <time dateTime={configuration.updatedAt}>
              {formatAdminDateTime(configuration.updatedAt)}
            </time>
          </dd>
        </div>
        {configuration.publishedAt && (
          <div>
            <dt>Published</dt>
            <dd>
              <time dateTime={configuration.publishedAt}>
                {formatAdminDateTime(configuration.publishedAt)}
              </time>
            </dd>
          </div>
        )}
        {configuration.approvalNote && (
          <div>
            <dt>Approval</dt>
            <dd>{configuration.approvalNote}</dd>
          </div>
        )}
      </dl>
      <h3>Minute adjustments</h3>
      <dl className="admin-compact-list">
        {Object.entries(configuration.adjustments).map(([prayer, minutes]) => (
          <div key={prayer}>
            <dt>{prayerLabels[prayer as keyof typeof prayerLabels]}</dt>
            <dd>
              {minutes > 0 ? "+" : ""}
              {minutes} minutes
            </dd>
          </div>
        ))}
      </dl>
      <h3>Congregation rules</h3>
      <dl className="admin-compact-list">
        {Object.entries(configuration.congregationRules).map(([prayer, rule]) => (
          <div key={prayer}>
            <dt>{prayerLabels[prayer as keyof typeof prayerLabels]}</dt>
            <dd>{congregationRuleLabel(rule)}</dd>
          </div>
        ))}
      </dl>
      <h3>Friday prayer sessions</h3>
      {configuration.jumuahSessions.length > 0 ? (
        <ol>
          {configuration.jumuahSessions.map((session) => (
            <li key={session.id ?? `${session.displayOrder}-${session.label}`}>
              <strong>{session.label}</strong>: khutbah {session.khutbahTime}
              {session.prayerTime ? `, prayer ${session.prayerTime}` : ""}
              {session.notes ? ` — ${session.notes}` : ""}
            </li>
          ))}
        </ol>
      ) : (
        <p className="admin-muted">No Friday prayer sessions are configured.</p>
      )}
    </div>
  );
}

export default async function PrayerSettingsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requirePermission("prayer:read");
  if (!z.uuid().safeParse(id).success) return <MissingConfiguration />;

  const [configuration, revisionsResult] = await Promise.all([
    getPrayerConfigurationForAdmin(context.supabase, id),
    context.supabase
      .from("prayer_settings_revisions")
      .select("id, version, reason, created_at, created_by")
      .eq("prayer_settings_id", id)
      .order("version", { ascending: false })
      .limit(30),
  ]);
  if (revisionsResult.error || !revisionsResult.data) {
    throw new Error("Prayer timetable history could not be loaded safely.");
  }
  if (!configuration) return <MissingConfiguration />;

  const canWrite = roleHasPermission(context.role, "prayer:write");
  const canPublish = roleHasPermission(context.role, "prayer:publish");
  const isDraft = configuration.status === "draft";
  let replacementDrafts: PrayerReplacementDraft[] = [];
  if (configuration.status === "published" && canPublish) {
    const { data: drafts, error: draftsError } = await context.supabase
      .from("prayer_settings")
      .select("id, name, version, effective_from, effective_to")
      .eq("status", "draft")
      .neq("id", configuration.id)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (draftsError || !drafts) {
      throw new Error("Replacement prayer drafts could not be loaded safely.");
    }
    replacementDrafts = drafts.map((draft) => ({
      id: draft.id,
      name: draft.name,
      version: draft.version,
      effectiveFrom: draft.effective_from,
      effectiveTo: draft.effective_to,
    }));
  }

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">
            {statusLabels[configuration.status]} · version {configuration.version}
          </p>
          <h1>{configuration.name}</h1>
          <p>
            <Link href="/admin/prayer-times">Back to all prayer timetables</Link>
          </p>
        </div>
        {!isDraft && canWrite && (
          <form action={clonePrayerSettingsAction}>
            <input name="id" type="hidden" value={configuration.id} />
            <ConfirmedActionButton
              className="admin-button"
              question="Create a separate editable draft from this timetable? The published version will remain unchanged."
            >
              Create editable draft
            </ConfirmedActionButton>
          </form>
        )}
      </div>

      {!isDraft && (
        <div className="admin-feedback" role="status">
          This {statusLabels[configuration.status].toLowerCase()} configuration is immutable. Any
          future change must be prepared and approved as a separate draft.
        </div>
      )}

      {isDraft && canWrite ? (
        <section aria-labelledby="settings-heading">
          <h2 className="admin-visually-hidden" id="settings-heading">
            Edit timetable settings
          </h2>
          <PrayerSettingsForm configuration={configuration} />
        </section>
      ) : (
        <ConfigurationSummary configuration={configuration} />
      )}

      <PrayerPreview configuration={configuration} />

      <section className="admin-section" aria-labelledby="override-heading">
        <h2 id="override-heading">Dated overrides</h2>
        <p>
          Overrides are explicit exceptions for one prayer on one date. Each one remains visible in
          the audit trail and the preview.
        </p>
        {configuration.overrides.length === 0 ? (
          <p className="admin-muted">No dated overrides are recorded.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <caption className="admin-visually-hidden">
                Existing dated prayer-time overrides
              </caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Prayer</th>
                  <th scope="col">Replacement</th>
                  <th scope="col">Reason</th>
                  {isDraft && canWrite && (
                    <th scope="col">
                      <span className="admin-visually-hidden">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {configuration.overrides.map((override) => (
                  <tr key={override.id ?? `${override.date}-${override.prayer}`}>
                    <th scope="row">
                      <time dateTime={override.date}>{override.date}</time>
                    </th>
                    <td>{prayerLabels[override.prayer]}</td>
                    <td>
                      {override.unavailable ? (
                        "Unavailable"
                      ) : (
                        <>
                          {override.beginsAt ? `Begins ${override.beginsAt}` : "Start unchanged"}
                          <span className="admin-table-secondary">
                            {override.congregationAt
                              ? `Congregation ${override.congregationAt}`
                              : "Congregation unchanged"}
                          </span>
                        </>
                      )}
                    </td>
                    <td>{override.reason}</td>
                    {isDraft && canWrite && (
                      <td>
                        {override.id && (
                          <form action={deletePrayerOverrideAction}>
                            <input name="settingsId" type="hidden" value={configuration.id} />
                            <input
                              name="expectedVersion"
                              type="hidden"
                              value={configuration.version}
                            />
                            <input name="id" type="hidden" value={override.id} />
                            <ConfirmedActionButton
                              question={`Remove the ${prayerLabels[override.prayer]} override for ${override.date}?`}
                            >
                              Remove
                              <span className="admin-visually-hidden">
                                {" "}
                                {prayerLabels[override.prayer]} override for {override.date}
                              </span>
                            </ConfirmedActionButton>
                          </form>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {isDraft && canWrite && (
          <div className="admin-section">
            <PrayerOverrideForm settingsId={configuration.id} version={configuration.version} />
          </div>
        )}
      </section>

      <section className="admin-section" aria-labelledby="seasonal-heading">
        <h2 id="seasonal-heading">Ramadan, Eid and seasonal arrangements</h2>
        <p>
          Date-bounded notes and congregation rules are included in previews, public prayer data and
          the TV display. Dated overrides still take final precedence for a particular prayer.
        </p>
        {configuration.seasonalArrangements.length === 0 ? (
          <p className="admin-muted">No seasonal arrangements are recorded.</p>
        ) : (
          <div className="admin-stack">
            {configuration.seasonalArrangements.map((arrangement) => (
              <article
                className="admin-card"
                key={arrangement.id ?? `${arrangement.startsOn}-${arrangement.title}`}
              >
                <p className="admin-eyebrow">{seasonalKindLabels[arrangement.kind]}</p>
                <h3>{arrangement.title}</h3>
                <p>
                  <time dateTime={arrangement.startsOn}>{arrangement.startsOn}</time> to{" "}
                  <time dateTime={arrangement.endsOn}>{arrangement.endsOn}</time>
                </p>
                {arrangement.publicNote && <p>{arrangement.publicNote}</p>}
                <p className="admin-muted">
                  {Object.keys(arrangement.congregationRules).length} seasonal congregation rule(s)
                </p>
                {isDraft && canWrite && (
                  <>
                    <details>
                      <summary>Edit this arrangement</summary>
                      <PrayerSeasonalForm
                        settingsId={configuration.id}
                        version={configuration.version}
                        arrangement={arrangement}
                      />
                    </details>
                    {arrangement.id && (
                      <form action={deleteSeasonalArrangementAction}>
                        <input name="settingsId" type="hidden" value={configuration.id} />
                        <input name="expectedVersion" type="hidden" value={configuration.version} />
                        <input name="id" type="hidden" value={arrangement.id} />
                        <ConfirmedActionButton
                          question={`Remove the seasonal arrangement “${arrangement.title}”?`}
                        >
                          Remove arrangement
                        </ConfirmedActionButton>
                      </form>
                    )}
                  </>
                )}
              </article>
            ))}
          </div>
        )}
        {isDraft && canWrite && (
          <div className="admin-section">
            <PrayerSeasonalForm settingsId={configuration.id} version={configuration.version} />
          </div>
        )}
      </section>

      {isDraft && canPublish && (
        <section className="admin-section" aria-labelledby="publish-heading">
          <h2 className="admin-visually-hidden" id="publish-heading">
            Publish this prayer timetable
          </h2>
          <PrayerPublishForm id={configuration.id} version={configuration.version} />
        </section>
      )}

      {configuration.status === "published" && canPublish && (
        <section className="admin-section" aria-labelledby="withdrawal-heading">
          <h2 className="admin-visually-hidden" id="withdrawal-heading">
            Withdraw or replace this prayer timetable
          </h2>
          <PrayerWithdrawalForm
            id={configuration.id}
            version={configuration.version}
            replacementDrafts={replacementDrafts}
          />
        </section>
      )}

      <section className="admin-section" aria-labelledby="history-heading">
        <h2 id="history-heading">Revision history</h2>
        <p>
          Restoring a revision always creates a separate draft. It never changes or republishes the
          version being reviewed.
        </p>
        {revisionsResult.data.length === 0 ? (
          <p className="admin-muted">No earlier revisions have been recorded.</p>
        ) : (
          <ol className="admin-revision-list">
            {revisionsResult.data.map((revision) => (
              <li key={revision.id}>
                <div>
                  <strong>Version {revision.version}</strong>
                  <span>
                    <time dateTime={revision.created_at}>
                      {formatAdminDateTime(revision.created_at)}
                    </time>
                    {revision.reason ? ` · ${revision.reason}` : ""}
                  </span>
                </div>
                {canWrite && (
                  <form action={restorePrayerRevisionAction}>
                    <input name="id" type="hidden" value={configuration.id} />
                    <input name="revisionId" type="hidden" value={revision.id} />
                    <ConfirmedActionButton
                      className="admin-button admin-button--quiet"
                      question={`Restore version ${revision.version} as a separate draft?`}
                    >
                      Restore as new draft
                    </ConfirmedActionButton>
                  </form>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
