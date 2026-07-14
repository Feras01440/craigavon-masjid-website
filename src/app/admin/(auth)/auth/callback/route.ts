import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { AdminAccessError } from "@/lib/auth/errors";
import { requireAdmin } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedOtpTypes = new Set<EmailOtpType>(["email", "invite", "magiclink"]);

function signInRedirect(request: NextRequest, error: string) {
  const url = new URL("/admin/sign-in", request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const code = request.nextUrl.searchParams.get("code");
    const tokenHash = request.nextUrl.searchParams.get("token_hash");
    const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
    let error: { message: string } | null = null;

    if (code) {
      ({ error } = await supabase.auth.exchangeCodeForSession(code));
    } else if (tokenHash && type && allowedOtpTypes.has(type)) {
      ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
    } else {
      return signInRedirect(request, "missing-token");
    }
    if (error) return signInRedirect(request, "invalid-link");

    await requireAdmin();
    return NextResponse.redirect(new URL("/admin", request.url));
  } catch (error) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // The route still fails closed if the Auth service is unavailable.
    }
    const reason = error instanceof AdminAccessError ? error.code : "callback";
    return signInRedirect(request, reason);
  }
}
