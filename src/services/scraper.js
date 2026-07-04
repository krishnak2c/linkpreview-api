import * as cheerio from 'cheerio'
import { validateUrl, resolveAndPin } from '../utils/validator.js'

const REQUEST_TIMEOUT_MS = parseInt(process.env.PREVIEW_TIMEOUT_MS) || 8_000
const MAX_RESPONSE_BYTES = parseInt(process.env.PREVIEW_MAX_BYTES) || 512_000
const MAX_REDIRECTS = 5

function isRawIP(hostname) {
  return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) || hostname.includes(':')
}

/**
 * Scrape meta/OG data from a URL.
 *
 * Returns:
 *   { title, description, image, favicon, siteName, url, resolvedUrl }
 * or null on fetch/parse failure.
 */
export async function scrapePreview(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  const validated = await validateUrl(url)
  if (!validated) { clearTimeout(timer); return null }

  const parsed = new URL(validated)
  const hostname = parsed.hostname.toLowerCase()
  let pinnedHost = null
  let fetchTarget = validated
  let finalUrl = validated
  if (!isRawIP(hostname)) {
    const ip = await resolveAndPin(hostname)
    if (ip) {
      pinnedHost = hostname
      const ipPart = ip.includes(':') ? `[${ip}]` : ip
      fetchTarget = `${parsed.protocol}//${ipPart}${parsed.port ? ':' + parsed.port : ''}${parsed.pathname}${parsed.search}${parsed.hash}`
    }
  }

  let response
  for (let hop = 0; ; hop++) {
    try {
      const headers = {
        'User-Agent': 'LinkPreviewAPI/1.0 (compatible; preview bot)',
        Accept: 'text/html,application/xhtml+xml'
      }
      if (pinnedHost) headers['Host'] = pinnedHost

      response = await fetch(fetchTarget, {
        signal: controller.signal,
        redirect: 'manual',
        headers
      })
    } catch {
      clearTimeout(timer)
      return null
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (hop >= MAX_REDIRECTS) return null
      const location = response.headers.get('location')
      if (!location) return null
      const validatedRedirect = await validateUrl(location)
      if (!validatedRedirect) return null
      fetchTarget = validatedRedirect
      finalUrl = validatedRedirect
      pinnedHost = null
      continue
    }
    break
  }

  clearTimeout(timer)

  if (!response.ok) return null

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
    return null
  }

  // Stream-limited read to avoid huge pages
  const reader = response.body.getReader()
  let html = ''
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > MAX_RESPONSE_BYTES) {
      reader.cancel()
      break
    }
    html += new TextDecoder().decode(value, { stream: true })
  }

  const $ = cheerio.load(html)

  const ogTitle = $('meta[property="og:title"]').attr('content')
  const twitterTitle = $('meta[name="twitter:title"]').attr('content')
  const title = ogTitle || twitterTitle || $('title').text() || null

  const ogDesc = $('meta[property="og:description"]').attr('content')
  const twitterDesc = $('meta[name="twitter:description"]').attr('content')
  const metaDesc = $('meta[name="description"]').attr('content')
  const description = ogDesc || twitterDesc || metaDesc || null

  const ogImage = $('meta[property="og:image"]').attr('content')
  const twitterImage = $('meta[name="twitter:image"]').attr('content')
  const image = ogImage || twitterImage || null

  const ogSiteName = $('meta[property="og:site_name"]').attr('content')
  const siteName = ogSiteName || null

  // Favicon: prefer apple-touch-icon, then shortcut icon, then /favicon.ico
  const appleTouch = $('link[rel="apple-touch-icon"]').attr('href')
  const faviconLink = $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href')
  const favicon = resolveUrl(appleTouch || faviconLink || '/favicon.ico', finalUrl)

  // Resolve relative OG/twitter image URLs
  const resolvedImage = image ? resolveUrl(image, finalUrl) : null

  return {
    title: sanitize(title),
    description: sanitize(description),
    image: resolvedImage,
    favicon,
    siteName: sanitize(siteName),
    url,
    resolvedUrl: finalUrl
  }
}

function resolveUrl(href, base) {
  if (!href) return null
  try {
    return new URL(href, base).href
  } catch {
    return null
  }
}

function sanitize(str) {
  if (!str) return null
  const trimmed = str.trim()
  return trimmed.length > 500 ? trimmed.slice(0, 500) + '…' : trimmed
}
