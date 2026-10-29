/**
 * Single source of truth for the site base URL.
 * Defaults to https://xpowernutrition-eg.com without www.
 */
export function getSiteUrl(path: string = ''): string {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://xpowernutrition-eg.com').replace(/\/$/, '');
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  return `${baseUrl}${cleanPath}`;
}

/**
 * Converts objects containing Firestore Timestamps or Date methods
 * into plain serializable JS objects for Next.js Server->Client Component props.
 */
export function toPlainObject<T>(obj: T): T {
  if (obj === undefined || obj === null) return obj;
  return JSON.parse(JSON.stringify(obj));
}
