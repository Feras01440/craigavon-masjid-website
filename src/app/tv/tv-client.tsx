"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";

import { nextEvent } from "@/lib/prayer/events";
import { prayerKeys, type PrayerApiResponse, type PrayerSchedule } from "@/lib/prayer/types";
import { dateKeyInZone, formatHijriDate, formatTime } from "@/lib/prayer/timezone";
import {
  managedSettingDefaults,
  tvDisplaySchema,
  type TvDisplaySetting,
} from "@/lib/settings/site-settings";
import type { PublicNoticeResult } from "@/server/repositories/notices";

import styles from "./tv.module.css";

type DisplayPayload = {
  generatedAt: string;
  prayer: PrayerApiResponse;
  notices: PublicNoticeResult;
  display?: TvDisplaySetting;
};

const names = {
  fajr: ["Fajr", "الفجر"],
  sunrise: ["Sunrise", "الشروق"],
  dhuhr: ["Dhuhr", "الظهر"],
  asr: ["Asr", "العصر"],
  maghrib: ["Maghrib", "المغرب"],
  isha: ["Isha", "العشاء"],
} as const;

const cacheKey = "mac-tv-last-known-good-v1";

function DemoMarker(): React.ReactNode {
  return (
    <p className={styles.demoMarker}>
      Local demonstration — prayer values and notices are not committee approved
    </p>
  );
}

function countdown(targetIso: string | undefined, now: Date): string {
  if (!targetIso) return "—";
  const remaining = Math.max(0, new Date(targetIso).getTime() - now.getTime());
  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function activePrayerHold(
  schedule: PrayerSchedule | undefined,
  now: Date,
  holdMinutes: number,
): string | null {
  if (!schedule) return null;
  for (const key of ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const) {
    const at = schedule.prayers[key].congregationAt;
    if (!at || schedule.prayers[key].joinedWith) continue;
    const start = new Date(at).getTime();
    if (now.getTime() >= start && now.getTime() < start + holdMinutes * 60_000) {
      return names[key][0];
    }
  }
  for (const session of schedule.jumuah) {
    const at = new Date(session.prayerAt ?? session.khutbahAt).getTime();
    if (now.getTime() >= at && now.getTime() < at + holdMinutes * 60_000) {
      return session.label;
    }
  }
  return null;
}

export function TvClient({
  demoMode,
  initialPayload,
}: {
  demoMode: boolean;
  initialPayload: DisplayPayload;
}): React.ReactNode {
  const [payload, setPayload] = useState(initialPayload);
  // Use the server-generated timestamp for the hydration frame. The live clock takes over after
  // mount, preventing a date/minute boundary from producing different server and client markup.
  const [now, setNow] = useState(() => new Date(initialPayload.generatedAt));
  const [online, setOnline] = useState(true);
  const [usingCachedData, setUsingCachedData] = useState(
    initialPayload.prayer.status !== "available" || initialPayload.notices.status !== "available",
  );
  const [noticeIndex, setNoticeIndex] = useState(0);
  const display = useMemo(() => {
    const parsed = tvDisplaySchema.safeParse(payload.display);
    return parsed.success ? parsed.data : managedSettingDefaults.tv_display;
  }, [payload.display]);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    const notice = window.setInterval(
      () => setNoticeIndex((current) => current + 1),
      display.notice_rotation_seconds * 1000,
    );
    return () => window.clearInterval(notice);
  }, [display.notice_rotation_seconds]);

  useEffect(() => {
    const updateNetwork = () => setOnline(navigator.onLine);
    updateNetwork();
    window.addEventListener("online", updateNetwork);
    window.addEventListener("offline", updateNetwork);

    const refresh = async () => {
      try {
        const response = await fetch("/api/display", { cache: "no-store" });
        if (!response.ok) throw new Error(`Display refresh returned ${response.status}.`);
        const fresh = (await response.json()) as DisplayPayload;
        if (fresh.prayer.status === "available" && fresh.notices.status === "available") {
          setPayload(fresh);
          setUsingCachedData(false);
          window.localStorage.setItem(cacheKey, JSON.stringify(fresh));
        } else {
          setUsingCachedData(true);
        }
      } catch {
        setUsingCachedData(true);
        const cached = window.localStorage.getItem(cacheKey);
        if (cached) {
          try {
            setPayload(JSON.parse(cached) as DisplayPayload);
            setUsingCachedData(true);
          } catch {
            window.localStorage.removeItem(cacheKey);
          }
        }
      }
    };
    void refresh();
    const poll = window.setInterval(() => void refresh(), display.refresh_seconds * 1000);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener("online", updateNetwork);
      window.removeEventListener("offline", updateNetwork);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [display.refresh_seconds]);

  const dateKey = dateKeyInZone(now, "Europe/London");
  const schedules = useMemo(
    () => (payload.prayer.status === "available" ? payload.prayer.schedules : []),
    [payload.prayer],
  );
  const today = schedules.find((schedule) => schedule.date === dateKey);
  const nextStart = useMemo(() => nextEvent(schedules, now, ["prayer_start"]), [schedules, now]);
  const nextCongregation = useMemo(
    () => nextEvent(schedules, now, ["congregation", "jumuah"]),
    [schedules, now],
  );
  const hold = activePrayerHold(today, now, display.prayer_hold_minutes);
  const activeNotices =
    display.show_notices && payload.notices.status === "available"
      ? payload.notices.notices.filter(
          (notice) => !notice.expiresAt || new Date(notice.expiresAt).getTime() > now.getTime(),
        )
      : [];
  const emergency = activeNotices.find((notice) => notice.kind === "emergency_notice");
  const regularNotices = activeNotices.filter((notice) => notice.kind === "announcement");
  const currentNotice = regularNotices[noticeIndex % Math.max(regularNotices.length, 1)];
  const seasonalArrangement = today?.seasonalArrangements[0];
  const generatedAt = payload.generatedAt;

  if (emergency) {
    return (
      <main className={styles.emergency}>
        {demoMode ? <DemoMarker /> : null}
        <p>Urgent notice</p>
        <h2>{emergency.title}</h2>
        {emergency.summary ? <div>{emergency.summary}</div> : null}
        <div className={styles.network} role="status">
          {online && !usingCachedData
            ? "Live data checked"
            : "Check connection — retained data may be stale"}
          {" · "}Dataset{" "}
          {new Intl.DateTimeFormat("en-GB", {
            dateStyle: "medium",
            timeStyle: "medium",
            timeZone: "Europe/London",
          }).format(new Date(generatedAt))}
        </div>
      </main>
    );
  }

  if (hold) {
    return (
      <main className={styles.prayerHold}>
        {demoMode ? <DemoMarker /> : null}
        <span lang="ar" dir="rtl">
          الصلاة قائمة
        </span>
        <h2>{hold} prayer in progress</h2>
        <p>Please silence phones and avoid disturbing those praying.</p>
        <div className={styles.network} role="status">
          {online && !usingCachedData
            ? "Live data checked"
            : "Check connection — retained data may be stale"}
          {" · "}Dataset{" "}
          {new Intl.DateTimeFormat("en-GB", {
            dateStyle: "medium",
            timeStyle: "medium",
            timeZone: "Europe/London",
          }).format(new Date(generatedAt))}
        </div>
      </main>
    );
  }

  return (
    <main className={styles.screen}>
      {demoMode ? <DemoMarker /> : null}
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <img
            className={styles.brandLogo}
            src="/brand/muslim-association-of-craigavon-logo-64.png"
            alt=""
            aria-hidden="true"
            width={64}
            height={64}
            loading="eager"
            decoding="async"
          />
          <div>
            <strong>Muslim Association of Craigavon</strong>
            <span>Prayer display</span>
          </div>
        </div>
        <time className={styles.clock} dateTime={now.toISOString()}>
          {new Intl.DateTimeFormat("en-GB", {
            timeZone: "Europe/London",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(now)}
        </time>
        <div className={styles.dates}>
          <time dateTime={dateKey}>
            {new Intl.DateTimeFormat("en-GB", {
              timeZone: "Europe/London",
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(now)}
          </time>
          {display.show_hijri_date ? (
            <span>
              {today?.hijriLabel ?? formatHijriDate(dateKey, schedules[0]?.hijriAdjustment ?? 0)}
            </span>
          ) : null}
        </div>
      </header>

      <div className={styles.network} role="status">
        <span className={!online ? styles.offline : undefined}>
          {online ? "Online" : "Offline"}
        </span>
        <span aria-hidden="true">·</span>
        <span>
          {usingCachedData ? "Showing last confirmed download" : "Data connection checked"}
        </span>
      </div>

      <div className={styles.main}>
        {today ? (
          <>
            <section className={styles.prayerGrid} aria-label="Today's prayer timetable">
              {prayerKeys.map((key) => {
                const prayer = today.prayers[key];
                const highlighted = nextStart?.key === key;
                return (
                  <article
                    className={`${styles.prayer} ${highlighted ? styles.next : ""}`}
                    key={key}
                  >
                    <div className={styles.prayerName}>
                      <span>{names[key][0]}</span>
                      <span lang="ar" dir="rtl">
                        {names[key][1]}
                      </span>
                    </div>
                    <div className={styles.start}>
                      {formatTime(prayer.startsAt, today.timezone)}
                    </div>
                    {key !== "sunrise" ? (
                      <div className={styles.congregation}>
                        Congregation{" "}
                        <strong>{formatTime(prayer.congregationAt, today.timezone)}</strong>
                        {prayer.joinedWith ? ` · with ${names[prayer.joinedWith][0]}` : ""}
                      </div>
                    ) : (
                      <div className={styles.congregation}>Sunrise</div>
                    )}
                  </article>
                );
              })}
            </section>
            <aside className={styles.aside} aria-label="Next times and notices">
              <section className={styles.panel}>
                <h2>Next prayer start</h2>
                <p className={styles.nextValue}>{nextStart?.label ?? "No start published"}</p>
                <p className={styles.countdown}>{countdown(nextStart?.at, now)}</p>
              </section>
              <section className={styles.panel}>
                <h2>Next congregation</h2>
                <p className={styles.nextValue}>{nextCongregation?.label ?? "Not confirmed"}</p>
                <p className={styles.countdown}>{countdown(nextCongregation?.at, now)}</p>
              </section>
              <section className={styles.notice} aria-label="Association notice">
                {currentNotice ? (
                  <>
                    <h2>{currentNotice.title}</h2>
                    {currentNotice.summary ? <p>{currentNotice.summary}</p> : null}
                  </>
                ) : seasonalArrangement ? (
                  <>
                    <h2>{seasonalArrangement.title}</h2>
                    <p>
                      {seasonalArrangement.publicNote ||
                        `${seasonalArrangement.startsOn} to ${seasonalArrangement.endsOn}`}
                    </p>
                  </>
                ) : (
                  <>
                    <h2>No notices published</h2>
                    <p>Committee-approved notices will appear here.</p>
                  </>
                )}
              </section>
            </aside>
          </>
        ) : (
          <section className={styles.unavailable}>
            <h1>Prayer information is not available</h1>
            <p>
              No approved timetable can be shown. Please contact the masjid through a confirmed
              channel before relying on a congregation time.
            </p>
          </section>
        )}
      </div>
      <footer className={styles.footer}>
        <span>
          {display.footer_message ||
            "Europe/London · Use browser full-screen mode for the clearest display"}
        </span>
        <span>
          Last successful data update:{" "}
          {new Intl.DateTimeFormat("en-GB", {
            dateStyle: "medium",
            timeStyle: "medium",
            timeZone: "Europe/London",
          }).format(new Date(generatedAt))}
        </span>
      </footer>
    </main>
  );
}
