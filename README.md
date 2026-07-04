# Link Preview API

Extract Open Graph tags, meta data, and previews from any URL.

Returns title, description, image, favicon, site name, and resolved URL — ready for social link unfurls, chat previews, and embed cards.

## Quick Start

```bash
npm install
npm start
# → http://localhost:3000
# → Docs at http://localhost:3000/docs
```

## API

### `GET /preview?url=<url>`

**Parameters:**

| Param | Required | Description |
|-------|----------|-------------|
| `url` | yes | Public http/https URL to extract preview from |

**Response (200):**

```json
{
  "title": "GitHub · Build and ship software",
  "description": "GitHub is where over 100 million developers...",
  "image": "https://github.githubassets.com/assets/github-logo-55c5b9a1fe52.png",
  "favicon": "https://github.com/favicon.ico",
  "siteName": "GitHub",
  "url": "https://github.com",
  "resolvedUrl": "https://github.com"
}
```

**Errors:**

| Code | Status | Meaning |
|------|--------|---------|
| `invalid_url` | 400 | Missing, malformed, or non-http URL |
| `fetch_failed` | 502 | Could not fetch/parse the URL (timeout, non-HTML, blocked) |
| `rate_limit_exceeded` | 429 | Too many requests (free tier: 60/min) |

### `GET /health`

Returns `{"status": "ok", "version": "1.0.0"}`.

## Deploy

### Belamo (Free — Recommended)

[![Deploy on Belamo](https://belamo.app/button.svg)](https://belamo.app/new?repo=https://github.com/krishnak2c/linkpreview-api)

1. Create a free account at [belamo.app](https://belamo.app)
2. Click "New Service" → select this GitHub repo
3. Nixpacks auto-detects Node.js — no config needed
4. Set `NODE_ENV=production` as an env var (optional, default already set)
5. Your API is live at `https://<service>.belamo.app`

**Belamo Starter** (free forever):
- 1 service, 0.5 vCPU / 512 MB RAM
- Wildcard subdomain, always-on (no sleep)
- Auto-deploys on every `git push`

### Docker

```bash
docker build -t linkpreview-api .
docker run -p 3000:3000 linkpreview-api
```

## Monetization

### RapidAPI Marketplace

List on RapidAPI for automatic billing, rate limiting, and global distribution:

1. Go to [RapidAPI Provider Dashboard](https://rapidapi.com/providers)
2. Click "Add New API" → use OpenAPI spec at `/docs` or manual entry
3. Set base URL to your Belamo service URL (`https://<service>.belamo.app`)
4. Configure tier pricing from the table below

| Tier | Monthly Requests | Price | Rate Limit |
|------|-----------------|-------|------------|
| Free | 100 | $0 | 10/min |
| Basic | 5,000 | $15 | 60/min |
| Pro | 25,000 | $49 | 120/min |
| Ultra | 100,000 | $149 | 300/min |

RapidAPI handles all billing, tax, key management, and quota enforcement. The API auto-detects RapidAPI-proxied requests and defers to their gateway limits.

### Direct Access (without RapidAPI)

When accessed directly via Belamo wildcard domain, free quota is 100 requests/day per IP. Upgrade via RapidAPI for higher limits.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `PREVIEW_TIMEOUT_MS` | `8000` | Max fetch time (ms) |
| `PREVIEW_MAX_BYTES` | `512000` | Max response body (bytes) |
| `FREE_DAILY_LIMIT` | `100` | Daily requests per IP on free direct access |

## License

MIT
