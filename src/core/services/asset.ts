/**
 * Resolves a path under the app's public base URL. Using BASE_URL (rather than a
 * bare relative path) keeps fetches correct from deep routes like /lesson/:slug
 * and works when the app is deployed under a sub-path.
 */
export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL; // always ends with '/'
  return base + path.replace(/^\//, '');
}
