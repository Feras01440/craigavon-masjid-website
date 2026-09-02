"use client";

import { useNow } from "@/components/prayer/use-now";
import { prayerDisplayNames } from "@/lib/prayer/names";
import { formatTime } from "@/lib/prayer/timezone";
import { prayerKeys, type PrayerSchedule } from "@/lib/prayer/types";

/*
 * The day drawn as an arc: from Fajr on the left, over the sun's path, to
 * ʿIshāʾ on the right, with each prayer marked at its true position in the
 * day and a sun that travels the arc on the shared client clock. Purely
 * illustrative — the table beside it carries the accessible data.
 */
const WIDTH = 640;
const RADIUS = 250;
const CENTER_X = WIDTH / 2;
const BASELINE = 268;
const LABEL_OFFSET = 30;

function pointAt(progress: number, radius = RADIUS) {
  const angle = Math.PI * (1 - progress);
  return {
    x: CENTER_X + radius * Math.cos(angle),
    y: BASELINE - radius * Math.sin(angle),
  };
}

function arcPath(progress: number): string {
  const end = pointAt(progress);
  const start = pointAt(0);
  // The path always travels the short way over the top: at most a semicircle.
  const largeArc = 0;
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export function DayArc({
  today,
  initialNowIso,
}: {
  today: PrayerSchedule;
  initialNowIso: string;
}): React.ReactNode {
  const now = useNow(initialNowIso);
  const fajr = today.prayers.fajr.startsAt;
  const isha = today.prayers.isha;
  const dayEnd = isha.congregationAt ?? isha.startsAt;
  if (!fajr || !dayEnd) return null;

  const start = new Date(fajr).getTime();
  const end = new Date(dayEnd).getTime();
  if (end <= start) return null;

  const progress = Math.min(1, Math.max(0, (now.getTime() - start) / (end - start)));
  const sun = pointAt(progress);
  const markers = prayerKeys
    .map((key) => {
      const at = today.prayers[key].startsAt;
      if (!at) return null;
      const p = Math.min(1, Math.max(0, (new Date(at).getTime() - start) / (end - start)));
      return {
        key,
        progress: p,
        label: prayerDisplayNames[key][0],
        time: formatTime(at, today.timezone),
        passed: p <= progress,
      };
    })
    .filter((marker): marker is NonNullable<typeof marker> => marker !== null);

  return (
    <figure className="day-arc" aria-hidden="true">
      <svg viewBox={`0 0 ${WIDTH} ${BASELINE + 44}`} className="day-arc__svg">
        <path className="day-arc__track" d={arcPath(1)} />
        {progress > 0 ? <path className="day-arc__progress" d={arcPath(progress)} /> : null}
        {markers.map((marker) => {
          const tick = pointAt(marker.progress);
          // Labels near the baseline sit further out so they clear their marker.
          const nearEnd = marker.progress < 0.2 || marker.progress > 0.8;
          const label = pointAt(
            marker.progress,
            RADIUS + (nearEnd ? LABEL_OFFSET + 18 : LABEL_OFFSET),
          );
          const anchor = marker.progress < 0.2 ? "end" : marker.progress > 0.8 ? "start" : "middle";
          return (
            <g
              key={marker.key}
              className={`day-arc__marker${marker.passed ? " day-arc__marker--passed" : ""}`}
            >
              <circle cx={tick.x} cy={tick.y} r={5} />
              <text x={label.x} y={label.y} textAnchor={anchor} className="day-arc__label">
                {marker.label}
              </text>
              <text x={label.x} y={label.y + 17} textAnchor={anchor} className="day-arc__time">
                {marker.time}
              </text>
            </g>
          );
        })}
        <g className="day-arc__sun" style={{ transform: `translate(${sun.x}px, ${sun.y}px)` }}>
          <circle r={16} className="day-arc__sun-glow" />
          <circle r={8} className="day-arc__sun-core" />
        </g>
      </svg>
    </figure>
  );
}
