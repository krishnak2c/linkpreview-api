import * as cheerio from 'cheerio'

const REQUEST_TIMEOUT_MS = 8_000
const MAX_RESPONSE_BYTES = 512_000  // abort if HTML is larger than 500KB

/**
 * Scrape meta/OG data from a URL.
 *
 * Returns:
 *   { title, description, image, favicon, siteName, url, resolvedUrl }
 * On fetch failure or parse failure returns null for the whole result
 * (the caller handles the 4xx/5xx error mapping).
 */
export async function scrapePreview(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let response
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'LinkPreviewAPI/1.0 (compatible; preview bot)',
        Accept: 'text/html,application/xhtml+xml'
      }
    })
  } catch {
    clearTimeout(timer)
    return null
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
  const favicon = resolveUrl(appleTouch || faviconLink || '/favicon.ico', url)

  // Resolve relative OG/twitter image URLs
  const resolvedImage = image ? resolveUrl(image, url) : null

  return {
    title: sanitize(title),
    description: sanitize(description),
    image: resolvedImage,
    favicon,
    siteName: sanitize(siteName),
    url,
    resolvedUrl: response.url  // final URL after redirects
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
