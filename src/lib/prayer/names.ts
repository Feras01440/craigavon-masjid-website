import type { PrayerKey } from "@/lib/prayer/types";

/* Single source for public prayer display names (English + Arabic). */
export const prayerDisplayNames: Record<PrayerKey | "jumuah", readonly [string, string]> = {
  fajr: ["Fajr", "الفجر"],
  sunrise: ["Sunrise", "الشروق"],
  dhuhr: ["Dhuhr", "الظهر"],
  asr: ["ʿAsr", "العصر"],
  maghrib: ["Maghrib", "المغرب"],
  isha: ["ʿIshāʾ", "العشاء"],
  jumuah: ["Jumuʿah", "الجمعة"],
};
