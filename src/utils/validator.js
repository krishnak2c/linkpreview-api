import * as dns from 'node:dns/promises'

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
  // fe80::/10 (link-local) — first hextet fe80-febf
  if (/^fe[89a-b]/i.test(ipv6)) return true
  // ::ffff:x.x.x.x (IPv4-mapped dotted) or ::ffff:XXXX:XXXX (IPv4-mapped hex, URL-normalized)
  const v4mapped = ipv6.match(/^::ffff:(.+)$/)
  if (v4mapped) {
    const embedded = v4mapped[1]
    if (/^\d+\.\d+\.\d+\.\d+$/.test(embedded)) {
      if (isPrivateIPv4(embedded)) return true
    } else {
      const hex = embedded.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i)
      if (hex) {
        const o1 = parseInt(hex[1], 16) >> 8
        const o2 = parseInt(hex[1], 16) & 0xff
        const o3 = parseInt(hex[2], 16) >> 8
        const o4 = parseInt(hex[2], 16) & 0xff
        if (isPrivateIPv4(`${o1}.${o2}.${o3}.${o4}`)) return true
      }
    }
  }

  return false
}

export async function validateUrl(raw) {
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

    // DNS resolution check: block hostnames that resolve to private IPs
    // Skip for raw IPs (already checked above)
    const isRawIP = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) || hostname.includes(':')
    if (!isRawIP) {
      // Check BOTH A (IPv4) and AAAA (IPv6) records — resolve4-only misses IPv6 SSRF
      const [a4, a6] = await Promise.all([
        dns.resolve4(hostname).catch(() => []),
        dns.resolve6(hostname).catch(() => [])
      ]);
      const allAddrs = [...a4, ...a6];
      if (allAddrs.some(addr => isPrivateIPv4(addr) || isPrivateIPv6(addr))) return null;
    }

    return url.href
  } catch {
    return null
  }
}

/**
 * Resolve a hostname to its first public IP (prefer IPv4).
 * Used by the scraper to pin resolved addresses and prevent DNS rebinding TOCTOU.
 * Returns null if resolution fails or only private IPs exist.
 */
export async function resolveAndPin(hostname) {
  const [a4, a6] = await Promise.all([
    dns.resolve4(hostname).catch(() => []),
    dns.resolve6(hostname).catch(() => [])
  ]);
  // Prefer IPv4 for compatibility unless only IPv6 available
  const publicIp = a4.find(addr => !isPrivateIPv4(addr)) || a6.find(addr => !isPrivateIPv6(addr));
  return publicIp || null;
}
