import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { validateUrl } from '../utils/validator.js'
import { scrapePreview } from '../services/scraper.js'

const router = Router()

// Rate limit: 60 requests/min per IP on free tier
const limiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limit_exceeded', message: 'Too many requests. Free tier: 60/min.' }
})

// Log per-plan limits from RapidAPI key header if present
function getPlanLimit(req) {
  // RapidAPI sends the plan name in the response already; we use soft limits in-app
  return null
}

/**
 * @openapi
 * /preview:
 *   get:
 *     summary: Get link preview for a URL
 *     description: Extracts Open Graph tags, meta data, and preview info from any public URL.
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *           format: uri
 *         description: The URL to extract preview data from (must be http/https, public)
 *         example: https://github.com
 *     responses:
 *       200:
 *         description: Preview data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 title:
 *                   type: string
 *                   nullable: true
 *                   description: Page title (og:title, twitter:title, or <title>)
 *                   example: GitHub · Build and ship software
 *                 description:
 *                   type: string
 *                   nullable: true
 *                   description: Page description (og:description, twitter:description, or meta description)
 *                 image:
 *                   type: string
 *                   format: uri
 *                   nullable: true
 *                   description: Preview image URL (og:image or twitter:image)
 *                 favicon:
 *                   type: string
 *                   format: uri
 *                   nullable: true
 *                   description: Favicon URL
 *                 siteName:
 *                   type: string
 *                   nullable: true
 *                   description: Site name from og:site_name
 *                 url:
 *                   type: string
 *                   format: uri
 *                   description: The requested URL
 *                 resolvedUrl:
 *                   type: string
 *                   format: uri
 *                   description: Final URL after any redirects
 *       400:
 *         description: Invalid or missing URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string }
 *                 message: { type: string }
 *       502:
 *         description: Failed to fetch or parse the URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string }
 *                 message: { type: string }
 *       429:
 *         description: Rate limit exceeded
 */
router.get('/', limiter, async (req, res, next) => {
  try {
    const rawUrl = req.query.url
    const url = validateUrl(rawUrl)

    if (!url) {
      return res.status(400).json({
        error: 'invalid_url',
        message: 'Provide a valid http/https URL as the url query parameter.'
      })
    }

    const preview = await scrapePreview(url)
    if (!preview) {
      return res.status(502).json({
        error: 'fetch_failed',
        message: 'Could not fetch or parse the URL. Make sure it is a publicly accessible HTML page.'
      })
    }

    res.json(preview)
  } catch (err) {
    next(err)
  }
})

export default router
