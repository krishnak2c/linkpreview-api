/**
 * Validate and normalize a URL for fetching.
 * Returns null if the URL is invalid or uses a blocked scheme/host.
 */

function isPrivateIPv4(hostname) {
  // Parse dotted-decimal
  const parts = hostname.split('.').map(Number)
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return false

  const [o1, o2] = parts

  // 10.0.0.0/8
  if (o1 === 10) return true
  // 127.0.0.0/8 (loopback)
  if (o1 === 127) return true
  // 169.254.0.0/16 (link-local)
  if (o1 === 169 && o2 === 254) return true
  // 172.16.0.0/12
  if (o1 === 172 && o2 >= 16 && o2 <= 31) return true
  // 192.168.0.0/16
  if (o1 === 192 && o2 === 168) return true
  // 0.0.0.0/8
  if (o1 === 0) return true

  return false
}

function isPrivateIPv6(hostname) {
  // Normalize: strip brackets and lowercase
  const ipv6 = hostname.replace(/^\[|\]$/g, '').toLowerCase()

  // ::1 (loopback)
  if (ipv6 === '::1') return true
  // fc00::/7 (unique local) — first nibble f, second nibble c or d
  if (/^f[c-d]/i.test(ipv6)) return true
  // fe80::/10 (link-local) — first hextet fe8x
  if (/^fe8/i.test(ipv6)) return true
  // ::ffff:127.0.0.1 style IPv4-mapped loopback
  if (/^::ffff:127\./.test(ipv6)) return true

  return false
}

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
    if (hostname === 'localhost') return null
    if (isPrivateIPv4(hostname)) return null
    if (isPrivateIPv6(hostname)) return null

    return url.href
  } catch {
    return null
  }
}
