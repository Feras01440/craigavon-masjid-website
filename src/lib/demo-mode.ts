function isLoopbackUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const { hostname, protocol } = new URL(value);
    return (
      protocol === "http:" &&
      (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1")
    );
  } catch {
    return false;
  }
}

/**
 * Demo mode is deliberately fail-closed. The flag alone is insufficient: both
 * the public application and Supabase must be running on an explicit loopback
 * origin, so a production deployment cannot display local demonstration data.
 */
export function demoModeIsActive(): boolean {
  return (
    process.env.NEXT_PUBLIC_DEMO_MODE === "true" &&
    isLoopbackUrl(process.env.NEXT_PUBLIC_SITE_URL) &&
    isLoopbackUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  );
}
