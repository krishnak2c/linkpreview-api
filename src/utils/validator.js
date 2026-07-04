/**
 * Validate and normalize a URL for fetching.
 * Returns null if the URL is invalid or uses a blocked scheme.
 */
export function validateUrl(raw) {
  if (!raw || typeof raw !== 'string') return null

  const trimmed = raw.trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed)

    // Only allow http/https
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null

    // Block localhost and private IPs
    const hostname = url.hostname.toLowerCase()
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.') // broad — 172.x.x.x likely private
    ) return null

    return url.href
  } catch {
    return null
  }
}
