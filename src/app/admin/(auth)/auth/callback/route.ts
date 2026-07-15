import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { AdminAccessError } from "@/lib/auth/errors";
import { requireAdmin } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AllowedOtpType = Extract<EmailOtpType, "email" | "invite" | "magiclink">;
type AuthenticationResult = { error: { message: string } | null };
type ValidatedCallback = {
  completeCallback: () => Promise<AuthenticationResult>;
};

function isAllowedOtpType(value: string): value is AllowedOtpType {
  return value === "email" || value === "invite" || value === "magiclink";
}

function parseCallback(searchParams: URLSearchParams): ValidatedCallback | null {
  const codes = searchParams.getAll("code");
  const tokenHashes = searchParams.getAll("token_hash");
  const types = searchParams.getAll("type");
  const code = codes[0];
  const tokenHash = tokenHashes[0];
  const type = types[0];

  if (
    codes.length === 1 &&
    typeof code === "string" &&
    code.trim().length > 0 &&
    tokenHashes.length === 0 &&
    types.length === 0
  ) {
    return {
      completeCallback: async () => {
        const supabase = await createSupabaseServerClient();
        return supabase.auth.exchangeCodeForSession(code);
      },
    };
  }

  if (
    codes.length === 0 &&
    tokenHashes.length === 1 &&
    typeof tokenHash === "string" &&
    tokenHash.trim().length > 0 &&
    types.length === 1 &&
    typeof type === "string" &&
    isAllowedOtpType(type)
  ) {
    return {
      completeCallback: async () => {
        const supabase = await createSupabaseServerClient();
        return supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      },
    };
  }

  return null;
}

function signInRedirect(request: NextRequest, error: string) {
  const url = new URL("/admin/sign-in", request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const callback = parseCallback(request.nextUrl.searchParams);
  if (!callback) return signInRedirect(request, "missing-token");

  try {
    const { error } = await callback.completeCallback();
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
