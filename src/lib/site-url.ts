export function getSiteUrl(): URL | null {
  const value = process.env.NEXT_PUBLIC_SITE_URL;
  if (!value) return null;
  try {
    const url = new URL(value);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return null;
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

export function indexingIsApproved(): boolean {
  return process.env.NEXT_PUBLIC_INDEXING_ENABLED === "true" && getSiteUrl() !== null;
}
