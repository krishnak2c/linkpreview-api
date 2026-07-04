import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import previewRouter from './routes/preview.js'
import quotaGuard from './middleware/quotaGuard.js'
import errorHandler from './middleware/errorHandler.js'

const app = express()
const PORT = process.env.PORT || 3000

app.set('trust proxy', parseInt(process.env.TRUST_PROXY) || (process.env.RAILWAY_ENVIRONMENT ? 1 : 0))
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "validator.swagger.io"],
    }
  }
}))
app.use(cors())
app.use(express.json())

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Link Preview API',
      version: '1.0.0',
      description: 'Extract Open Graph tags, meta data, and previews from any public URL.',
      'x-category': 'web-tools',
      'x-long-description': 'Extract Open Graph (OG) tags, Twitter Cards, meta descriptions, favicons, and embed previews from any public URL. Returns structured JSON with title, description, image, favicon, site name, and resolved URL — ready for social link unfurls, chat previews, and embed cards in any application.',
      'x-website': 'https://github.com/krishnak2c/linkpreview-api',
      'x-public': true,
      'x-version-lifecycle': 'active',
      'x-badges': [],
      termsOfService: ''
    },
    servers: [
      { url: process.env.API_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:${PORT}`) }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-rapidapi-key',
        }
      }
    },
    security: [{ ApiKeyAuth: [] }],
    'x-plans': [
      {
        name: 'Free',
        price: 0,
        requestsPerMonth: 100,
        rateLimitPerMinute: 10
      },
      {
        name: 'Basic',
        price: 15,
        requestsPerMonth: 5000,
        rateLimitPerMinute: 60
      },
      {
        name: 'Pro',
        price: 49,
        requestsPerMonth: 25000,
        rateLimitPerMinute: 120
      },
      {
        name: 'Ultra',
        price: 149,
        requestsPerMonth: 100000,
        rateLimitPerMinute: 300
      }
    ],
    tags: [
      { name: 'preview', description: 'Link preview extraction' }
    ]
  },
  apis: ['./src/routes/*.js']
})

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Link Preview API Docs'
}))

app.get('/api-docs', (_req, res) => {
  res.json(swaggerSpec)
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0' })
})

app.get('/', (_req, res) => {
  res.json({
    name: 'Link Preview API',
    version: '1.0.0',
    docs: '/docs',
    spec: '/api-docs',
    health: '/health',
    endpoint: 'GET /preview?target=<url>',
    pricing: 'https://rapidapi.com/krishnak2c/api/link-preview-api/pricing',
  })
})

app.use(quotaGuard)
app.use('/preview', previewRouter)
app.use(errorHandler)

export default app
