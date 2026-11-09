// NEXT_PUBLIC_SITE_URL is the public origin. On Vercel, the project's production domain is the
// fallback, so canonical URLs, the sitemap, and share cards never point at localhost when the
// variable is left unset. Both are NEXT_PUBLIC_ so server and client render the same URLs.
function defaultSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const vercelHost = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;
  return vercelHost ? `https://${vercelHost}` : undefined;
}

export function getSiteUrl(value = defaultSiteUrl()) {
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
