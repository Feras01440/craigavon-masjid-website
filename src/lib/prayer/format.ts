/* Human-readable remaining time for next-prayer surfaces. */
export function formatRemaining(milliseconds: number): string | null {
  if (milliseconds <= 0) return null;
  const totalMinutes = Math.floor(milliseconds / 60_000);
  if (totalMinutes < 1) return "under a minute";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours} hr ${minutes} min`;
  return `${minutes} min`;
}
