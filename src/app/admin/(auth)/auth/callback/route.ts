import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { AdminAccessError } from "@/lib/auth/errors";
import { requireAdmin } from "@/lib/auth/session";
import { getSiteUrl } from "@/lib/site-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AllowedOtpType = Extract<EmailOtpType, "email" | "invite" | "magiclink">;
type ServerSupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type AuthenticationResult = {
  client: ServerSupabaseClient;
  error: { message: string } | null;
};
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
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        return { client: supabase, error };
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
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        return { client: supabase, error };
      },
    };
  }

  return null;
}

function signInRedirect(request: NextRequest, error: string) {
  const url = new URL("/admin/sign-in", getSiteUrl() ?? request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const callback = parseCallback(request.nextUrl.searchParams);
  if (!callback) return signInRedirect(request, "missing-token");

  let authenticatedClient: ServerSupabaseClient | null = null;
  try {
    const { client, error } = await callback.completeCallback();
    authenticatedClient = client;
    if (error) return signInRedirect(request, "invalid-link");

    // Reuse the client that completed Auth: its cookie store contains the new session during this
    // response, while a second SSR client may still see only the incoming request cookies.
    await requireAdmin(client);
    return NextResponse.redirect(new URL("/admin", getSiteUrl() ?? request.url));
  } catch (error) {
    try {
      const supabase = authenticatedClient ?? (await createSupabaseServerClient());
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // The route still fails closed if the Auth service is unavailable.
    }
    const reason = error instanceof AdminAccessError ? error.code : "callback";
    return signInRedirect(request, reason);
  }
}
