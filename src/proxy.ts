import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

function requestUsesHttps(request: NextRequest): boolean {
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",", 1)[0]
    ?.trim()
    .toLowerCase();

  return forwardedProtocol ? forwardedProtocol === "https" : request.nextUrl.protocol === "https:";
}

/*
 * Two CSP modes (see docs/architecture/ADR-003-public-caching.md):
 *
 * - Admin and TV routes render per-request and get a fresh nonce with
 *   strict-dynamic — the strongest policy, affordable because those routes
 *   are never shared-cached.
 * - Public routes are ISR-cached at the CDN. Cached HTML cannot carry a
 *   per-request nonce (the middleware would stamp a fresh-nonce header onto
 *   cached markup holding the old nonce, blocking every script), so they use
 *   a static policy allowing the framework's inline bootstrap. All other
 *   directives are identical, and the app itself never injects inline
 *   event handlers or third-party scripts.
 */
function contentSecurityPolicy(nonce: string | null, upgradeInsecureRequests: boolean): string {
  const developmentScript = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
  const scriptSource = nonce
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${developmentScript}`
    : `script-src 'self' 'unsafe-inline'${developmentScript}`;
  const directives = [
    "default-src 'self'",
    scriptSource,
    "style-src 'self'",
    "img-src 'self' data: blob: https://*.supabase.co",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "media-src 'self' https://*.supabase.co",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // Owner-approved exception: the embedded Google map on /contact.
    "frame-src 'self' https://www.google.com",
  ];

  if (upgradeInsecureRequests) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

function applyResponseSecurity(
  response: NextResponse,
  policy: string,
  secureTransport: boolean,
): NextResponse {
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  );
  if (process.env.NODE_ENV === "production" && secureTransport) {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  return response;
}

function usesPerRequestNonce(pathname: string): boolean {
  return pathname.startsWith("/admin") || pathname.startsWith("/tv");
}

function hasSupabaseSession(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-"));
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const secureTransport = requestUsesHttps(request);
  const nonced = usesPerRequestNonce(request.nextUrl.pathname);
  const nonce = nonced ? createNonce() : null;
  const policy = contentSecurityPolicy(nonce, secureTransport);
  const requestHeaders = new Headers(request.headers);
  if (nonce) {
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", policy);
  }

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  let refreshedCookies = false;

  // Anonymous visitors never pay the auth round trip; session cookie
  // validation and rotation only run when a Supabase session cookie exists.
  if (url && key && hasSupabaseSession(request)) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          refreshedCookies = true;
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          requestHeaders.set("cookie", request.cookies.toString());
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    // This validates the access token and lets @supabase/ssr rotate expired auth cookies.
    await supabase.auth.getClaims();
  }

  if (refreshedCookies) {
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Pragma", "no-cache");
  }
  return applyResponseSecurity(response, policy, secureTransport);
}

export const config = {
  matcher: [
    {
      source:
        "/((?!api/|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
