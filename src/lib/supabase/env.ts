import "server-only";

import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
});

const serviceSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
});

const siteUrlSchema = z.url().refine((value) => {
  const url = new URL(value);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  return url.protocol === "https:" || (local && url.protocol === "http:");
}, "Use HTTPS, except for an explicit localhost development origin.");

export class SupabaseConfigurationError extends Error {
  constructor() {
    super("The administration service is not configured. Please contact the site administrator.");
    this.name = "SupabaseConfigurationError";
  }
}

export function getPublicSupabaseEnvironment() {
  const parsed = publicSchema.safeParse(process.env);
  if (!parsed.success) throw new SupabaseConfigurationError();
  return parsed.data;
}

export function getServiceSupabaseEnvironment() {
  const parsed = serviceSchema.safeParse(process.env);
  if (!parsed.success) throw new SupabaseConfigurationError();
  return parsed.data;
}

export function getSiteUrl(): string {
  const parsed = siteUrlSchema.safeParse(process.env.NEXT_PUBLIC_SITE_URL);
  if (!parsed.success) throw new SupabaseConfigurationError();
  return parsed.data.replace(/\/$/, "");
}
