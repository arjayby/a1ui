export function getSiteUrl(value = process.env.NEXT_PUBLIC_SITE_URL) {
  const url = new URL(value ?? "http://localhost:3000");
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error("NEXT_PUBLIC_SITE_URL must be an HTTP(S) origin without a path, query, or credentials.");
  }
  return url.origin;
}
