/**
 * In-app daily quota guard for direct (non-RapidAPI) access.
 *
 * When accessed via the Belamo wildcard domain (not proxied by RapidAPI),
 * free-tier users get 100 requests/day per IP. This prevents abuse of the
 * direct endpoint while the RapidAPI marketplace handles its own billing.
 *
 * RapidAPI-proxied requests (detected via x-rapidapi-proxy-signature) are
 * passed through — RapidAPI gateway enforces plan limits at their edge.
 */

const FREE_DAILY_LIMIT = parseInt(process.env.FREE_DAILY_LIMIT) || 100

const ipCounts = new Map()

function resetDaily() {
  ipCounts.clear()
}

let lastReset = Date.now()
const DAY_MS = 86_400_000

export default function quotaGuard(req, res, next) {
  // Let RapidAPI-proxied requests through — they handle their own billing
  if (req.headers['x-rapidapi-proxy-signature'] && typeof req.headers['x-rapidapi-proxy-signature'] === 'string' && req.headers['x-rapidapi-proxy-signature'].trim().length > 0) return next()

  // Daily reset
  const now = Date.now()
  if (now - lastReset > DAY_MS) {
    resetDaily()
    lastReset = now
  }

  const ip = req.ip
  const count = (ipCounts.get(ip) || 0) + 1
  ipCounts.set(ip, count)

  res.set('X-RateLimit-Limit', String(FREE_DAILY_LIMIT))
  res.set('X-RateLimit-Remaining', String(Math.max(0, FREE_DAILY_LIMIT - count)))

  if (count > FREE_DAILY_LIMIT) {
    return res.status(429).json({
      error: 'daily_quota_exceeded',
      message: `Free tier: ${FREE_DAILY_LIMIT} requests/day. Upgrade via RapidAPI for higher limits.`
    })
  }

  next()
}
