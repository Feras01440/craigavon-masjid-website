import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) throw new Error("Usage: pnpm local:link -- <local-account-email>");

const values = Object.fromEntries(
  readFileSync(resolve(".env.local"), "utf8")
    .split(/\r?\n/u)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);
const apiUrl = values.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = values.SUPABASE_SERVICE_ROLE_KEY;
if (!apiUrl || !serviceRoleKey || values.NEXT_PUBLIC_DEMO_MODE !== "true") {
  throw new Error("Run pnpm setup:local before generating a local sign-in link.");
}
const url = new URL(apiUrl);
if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
  throw new Error("Refusing to use local:link with a non-loopback Supabase project.");
}

const client = createClient(apiUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});
const link = await client.auth.admin.generateLink({
  type: "magiclink",
  email,
});
const hashedToken = link.data.properties?.hashed_token;
if (link.error || !hashedToken) {
  throw link.error ?? new Error("The local sign-in link could not be generated.");
}
const callback = new URL("http://127.0.0.1:3000/admin/auth/callback");
callback.searchParams.set("token_hash", hashedToken);
callback.searchParams.set("type", "magiclink");
console.log(callback.toString());
