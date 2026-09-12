import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-14T09:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("public notice repository boundary", () => {
  it("selects only current public notice fields and excludes private content metadata", async () => {
    let requestedUrl: URL | null = null;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      requestedUrl = new URL(typeof input === "string" ? input : input.toString());
      return new Response(
        JSON.stringify([
          {
            id: "11111111-1111-4111-8111-111111111111",
            kind: "announcement",
            title: "Approved notice",
            summary: "Checked public summary.",
            featured: false,
            expires_at: "2026-07-15T09:00:00.000Z",
            updated_at: "2026-07-14T08:00:00.000Z",
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key-with-safe-length");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key-with-safe-length");
    vi.stubGlobal("fetch", fetchMock);

    const { getPublishedNotices } = await import("@/server/repositories/notices");
    const result = await getPublishedNotices();

    expect(result).toEqual({
      status: "available",
      notices: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          kind: "announcement",
          title: "Approved notice",
          summary: "Checked public summary.",
          featured: false,
          expiresAt: "2026-07-15T09:00:00.000Z",
          updatedAt: "2026-07-14T08:00:00.000Z",
        },
      ],
    });
    expect(requestedUrl).not.toBeNull();

    const query = requestedUrl!.searchParams;
    expect(query.get("select")?.split(",")).toEqual([
      "id",
      "kind",
      "title",
      "summary",
      "featured",
      "expires_at",
      "updated_at",
    ]);
    expect(query.get("kind")).toBe("in.(announcement,emergency_notice)");
    expect(query.get("status")).toBe("in.(published,scheduled)");
    expect(query.get("demo_local_only")).toBe("eq.false");
    expect(query.get("deleted_at")).toBe("is.null");
    expect(query.get("published_by")).toBe("not.is.null");
    expect(query.getAll("published_at")).toEqual(["not.is.null", "lte.2026-07-14T09:00:00.000Z"]);
    expect(query.getAll("or")).toEqual([
      "(publish_at.is.null,publish_at.lte.2026-07-14T09:00:00.000Z)",
      "(expires_at.is.null,expires_at.gt.2026-07-14T09:00:00.000Z)",
    ]);
  });
});
