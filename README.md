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

### Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/linkpreview-api)

Set `PORT` env var if needed (defaults to 3000).

### Docker

```bash
docker build -t linkpreview-api .
docker run -p 3000:3000 linkpreview-api
```

## Pricing (via RapidAPI)

| Tier | Monthly Requests | Price |
|------|-----------------|-------|
| Free | 100 | $0 |
| Basic | 5,000 | $15 |
| Pro | 25,000 | $49 |
| Ultra | 100,000 | $149 |

## License

MIT
