import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const currentRow = {
  id: "11111111-1111-4111-8111-111111111111",
  kind: "service",
  slug: "approved-service",
  title: "Approved service",
  summary: "Checked information.",
  body: { version: 1, format: "plain_text", text: "Approved plain-text details." },
  category: null,
  status: "published",
  featured: false,
  publish_at: "2026-01-01T00:00:00.000Z",
  expires_at: "2030-01-01T00:00:00.000Z",
  published_by: "22222222-2222-4222-8222-222222222222",
  published_at: "2026-01-01T00:00:00.000Z",
  deleted_at: null,
  updated_at: "2026-01-02T00:00:00.000Z",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("public content repository", () => {
  it("applies every approval and publication-window filter to the server-mediated query", async () => {
    let requestedUrl: URL | null = null;
    let requestedCache: RequestCache | undefined;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      requestedUrl = new URL(typeof input === "string" ? input : input.toString());
      requestedCache = init?.cache;
      return new Response(JSON.stringify([currentRow]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key-with-safe-length");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key-with-safe-length");
    vi.stubGlobal("fetch", fetchMock);

    const { getPublishedContent } = await import("@/server/repositories/public-content");
    const result = await getPublishedContent(["service"], { limit: 10 });

    expect(result.status).toBe("ready");
    expect(result.items).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(requestedCache).toBe("no-store");
    expect(requestedUrl).not.toBeNull();

    const query = requestedUrl!.searchParams;
    expect(query.get("kind")).toBe("in.(service)");
    expect(query.get("status")).toBe("in.(published,scheduled)");
    expect(query.get("deleted_at")).toBe("is.null");
    expect(query.get("published_by")).toBe("not.is.null");
    expect(query.getAll("published_at")).toHaveLength(2);
    expect(query.getAll("published_at")).toContain("not.is.null");
    expect(query.getAll("published_at").some((filter) => filter.startsWith("lte."))).toBe(true);
    expect(query.getAll("or")).toHaveLength(2);
    expect(query.getAll("or")[0]).toContain("publish_at.is.null");
    expect(query.getAll("or")[1]).toContain("expires_at.is.null");
  });

  it("fails closed without server Supabase configuration", async () => {
    const fetchMock = vi.fn();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubGlobal("fetch", fetchMock);

    const { getPublishedContent } = await import("@/server/repositories/public-content");

    await expect(getPublishedContent(["service"])).resolves.toEqual({
      status: "unavailable",
      items: [],
      omittedCount: 0,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
