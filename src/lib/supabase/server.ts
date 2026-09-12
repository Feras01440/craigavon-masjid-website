import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";
import { getPublicSupabaseEnvironment, getServiceSupabaseEnvironment } from "./env";

export async function createSupabaseServerClient() {
  const env = getPublicSupabaseEnvironment();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(values) {
          try {
            values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Components cannot write cookies. proxy.ts refreshes them for those requests.
          }
        },
      },
    },
  );
}

export function createSupabaseServiceClient(options: { fetch?: typeof fetch } = {}) {
  const env = getServiceSupabaseEnvironment();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    ...(options.fetch ? { global: { fetch: options.fetch } } : {}),
  });
}
