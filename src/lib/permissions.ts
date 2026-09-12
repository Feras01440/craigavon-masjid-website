import type { AdminRole } from "@/types/database";

export const PERMISSIONS = [
  "admin:access",
  "content:read",
  "content:write",
  "content:publish",
  "media:read",
  "media:write",
  "prayer:read",
  "prayer:write",
  "prayer:publish",
  "enquiries:read",
  "enquiries:write",
  "audit:read",
  "users:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<AdminRole, ReadonlySet<Permission>> = {
  super_admin: new Set(PERMISSIONS),
  website_editor: new Set([
    "admin:access",
    "content:read",
    "content:write",
    "content:publish",
    "media:read",
    "media:write",
    "prayer:read",
    "audit:read",
  ]),
  prayer_editor: new Set([
    "admin:access",
    "content:read",
    "prayer:read",
    "prayer:write",
    "prayer:publish",
    "audit:read",
  ]),
  enquiries_manager: new Set(["admin:access", "content:read", "enquiries:read", "enquiries:write"]),
  reviewer: new Set(["admin:access", "content:read", "media:read", "prayer:read", "audit:read"]),
};

export function roleHasPermission(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super administrator",
  website_editor: "Website editor",
  prayer_editor: "Prayer-times editor",
  enquiries_manager: "Enquiries manager",
  reviewer: "Reviewer",
};
