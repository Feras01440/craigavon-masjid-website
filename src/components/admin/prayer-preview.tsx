import { buildScheduleRange } from "@/lib/prayer/engine";
import { dateKeyInZone, formatTime } from "@/lib/prayer/timezone";
import {
  prayerKeys,
  type PrayerConfiguration,
  type PrayerIssue,
  type PrayerKey,
  type PrayerSchedule,
  type SchedulePrayer,
} from "@/lib/prayer/types";
import { publicationHorizon, validateConfigurationSchedule } from "@/lib/prayer/validation";

const prayerLabels: Record<PrayerKey, string> = {
  fajr: "Fajr",
  sunrise: "Sunrise",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

type GroupedIssue = Omit<PrayerIssue, "date"> & {
  dates: string[];
  occurrences: number;
};

function daysBetween(firstDate: string, finalDate: string): number {
  const first = new Date(`${firstDate}T12:00:00Z`);
  const final = new Date(`${finalDate}T12:00:00Z`);
  return Math.floor((final.getTime() - first.getTime()) / 86_400_000);
}

function previewPeriod(configuration: PrayerConfiguration): {
  firstDate: string;
  days: number;
  historical: boolean;
} {
  const today = dateKeyInZone(new Date(), configuration.timezone);
  const historical = Boolean(configuration.effectiveTo && configuration.effectiveTo < today);
  const firstDate = historical
    ? configuration.effectiveFrom
    : configuration.effectiveFrom > today
      ? configuration.effectiveFrom
      : today;
  const remainingDays = configuration.effectiveTo
    ? daysBetween(firstDate, configuration.effectiveTo) + 1
    : 30;
  return {
    firstDate,
    days: Math.min(30, Math.max(1, remainingDays)),
    historical,
  };
}

function candidateForPreview(configuration: PrayerConfiguration): PrayerConfiguration {
  return {
    ...configuration,
    status: "published",
    approvalNote: configuration.approvalNote ?? "Unpublished preview only",
    approvedBy: configuration.approvedBy ?? configuration.id,
    publishedAt: configuration.publishedAt ?? new Date().toISOString(),
  };
}

function groupIssues(issues: PrayerIssue[]): GroupedIssue[] {
  const groups = new Map<string, GroupedIssue>();
  for (const issue of issues) {
    const key = [issue.severity, issue.code, issue.prayer ?? "", issue.message].join("|");
    const existing = groups.get(key);
    if (existing) {
      existing.occurrences += 1;
      if (issue.date && !existing.dates.includes(issue.date)) existing.dates.push(issue.date);
    } else {
      groups.set(key, {
        severity: issue.severity,
        code: issue.code,
        message: issue.message,
        prayer: issue.prayer,
        dates: issue.date ? [issue.date] : [],
        occurrences: 1,
      });
    }
  }
  return [...groups.values()].sort((left, right) => {
    if (left.severity !== right.severity) return left.severity === "error" ? -1 : 1;
    return left.message.localeCompare(right.message);
  });
}

function dateRangeLabel(dates: string[]): string | null {
  if (dates.length === 0) return null;
  if (dates.length === 1) return dates[0] ?? null;
  return `${dates[0]} to ${dates.at(-1)}`;
}

function DisplayTime({ value, timezone }: { value: string | null; timezone: string }) {
  if (!value) return <>Not confirmed</>;
  return <time dateTime={value}>{formatTime(value, timezone)}</time>;
}

function PrayerTimeCell({ prayer, timezone }: { prayer: SchedulePrayer; timezone: string }) {
  if (prayer.unavailable) {
    return (
      <span>
        Unavailable
        {prayer.overrideReason && (
          <span className="admin-table-secondary">{prayer.overrideReason}</span>
        )}
      </span>
    );
  }
  return (
    <span>
      Begins: <DisplayTime value={prayer.startsAt} timezone={timezone} />
      {prayer.key !== "sunrise" && (
        <span className="admin-table-secondary">
          Congregation: <DisplayTime value={prayer.congregationAt} timezone={timezone} />
          {prayer.joinedWith ? ` (joined with ${prayerLabels[prayer.joinedWith]})` : ""}
        </span>
      )}
      {prayer.overrideReason && (
        <span className="admin-table-secondary">Override: {prayer.overrideReason}</span>
      )}
    </span>
  );
}

export function PrayerPreview({ configuration }: { configuration: PrayerConfiguration }) {
  const period = previewPeriod(configuration);
  const candidate = candidateForPreview(configuration);
  const horizon = publicationHorizon(configuration);
  let schedules: PrayerSchedule[];
  let validationSchedules: PrayerSchedule[];
  try {
    schedules = buildScheduleRange(candidate, period.firstDate, period.days);
    validationSchedules = horizon.ok
      ? buildScheduleRange(candidate, horizon.firstDate, horizon.days)
      : schedules;
  } catch {
    return (
      <section className="admin-section" aria-labelledby="preview-heading">
        <h2 id="preview-heading">Timetable validation preview</h2>
        <div className="admin-feedback admin-feedback--error" role="alert">
          This configuration cannot be calculated safely. Correct its effective dates and source
          settings before publication.
        </div>
      </section>
    );
  }

  const issues = [
    ...(horizon.ok ? [] : [horizon.issue]),
    ...validateConfigurationSchedule(configuration, validationSchedules),
  ];
  const groupedIssues = groupIssues(issues);
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.length - errorCount;

  return (
    <section className="admin-section" aria-labelledby="preview-heading">
      <div className="admin-page-heading">
        <div>
          <h2 id="preview-heading">30-day preview and full-horizon validation</h2>
          <p>
            {period.historical
              ? "This timetable has ended, so the preview starts at its original effective date."
              : "The table starts on the next applicable date and uses the same calculation path as the public timetable."}{" "}
            {horizon.ok
              ? `All ${horizon.days} effective days are checked before publication; the table shows up to 30 days.`
              : "Publication remains blocked until a bounded effective period is set."}
          </p>
        </div>
        <p aria-live="polite">
          <span
            className={`admin-status ${errorCount ? "admin-status--disabled" : "admin-status--published"}`}
          >
            {errorCount} {errorCount === 1 ? "error" : "errors"}
          </span>{" "}
          <span className="admin-status admin-status--scheduled">
            {warningCount} {warningCount === 1 ? "warning" : "warnings"}
          </span>
        </p>
      </div>

      {groupedIssues.length > 0 ? (
        <div className="admin-card" role={errorCount ? "alert" : "status"}>
          <h3>Validation findings</h3>
          <p>
            Errors block publication. Warnings identify information that needs a deliberate
            committee decision or may remain visibly unconfirmed.
          </p>
          <ol className="admin-revision-list">
            {groupedIssues.map((issue) => {
              const dates = dateRangeLabel(issue.dates);
              return (
                <li
                  key={`${issue.severity}-${issue.code}-${issue.prayer ?? "all"}-${issue.message}`}
                >
                  <div>
                    <strong>
                      <span
                        className={`admin-status ${
                          issue.severity === "error"
                            ? "admin-status--disabled"
                            : "admin-status--scheduled"
                        }`}
                      >
                        {issue.severity}
                      </span>{" "}
                      {issue.message}
                    </strong>
                    <span>
                      {dates ? `${dates} · ` : ""}
                      {issue.occurrences} {issue.occurrences === 1 ? "occurrence" : "occurrences"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ) : (
        <div className="admin-feedback admin-feedback--success" role="status">
          No validation findings were detected in this preview. Publication still requires the
          recorded committee approval and explicit confirmation.
        </div>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <caption className="admin-visually-hidden">
            Prayer timetable preview from {schedules[0]?.date} for {schedules.length} days
          </caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              {prayerKeys.map((prayer) => (
                <th key={prayer} scope="col">
                  {prayerLabels[prayer]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedules.map((schedule) => (
              <tr key={schedule.date}>
                <th scope="row">
                  {schedule.gregorianLabel}
                  <span className="admin-table-secondary">{schedule.hijriLabel}</span>
                </th>
                {prayerKeys.map((prayer) => (
                  <td key={prayer}>
                    <PrayerTimeCell
                      prayer={schedule.prayers[prayer]}
                      timezone={schedule.timezone}
                    />
                    {prayer === "dhuhr" && schedule.jumuah.length > 0 && (
                      <span className="admin-table-secondary">
                        {schedule.jumuah.map((session) => (
                          <span className="admin-table-secondary" key={session.id ?? session.label}>
                            {session.label}: khutbah{" "}
                            {formatTime(session.khutbahAt, schedule.timezone)}
                            {session.prayerAt
                              ? `, prayer ${formatTime(session.prayerAt, schedule.timezone)}`
                              : ""}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
