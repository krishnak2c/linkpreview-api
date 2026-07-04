import express from 'express'
import cors from 'cors'
import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import previewRouter from './routes/preview.js'
import quotaGuard from './middleware/quotaGuard.js'
import errorHandler from './middleware/errorHandler.js'

const app = express()
const PORT = process.env.PORT || 3000

// trust proxy: only behind Railway (gateway overwrites X-Forwarded-For).
// Enable only when Railway env is set to prevent XFF spoofing elsewhere.
app.set('trust proxy', process.env.RAILWAY_ENVIRONMENT ? 1 : false)
app.use(cors())
app.use(express.json())

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Link Preview API',
      version: '1.0.0',
      description: 'Extract Open Graph tags, meta data, and previews from any URL. Returns title, description, image, favicon, site name, and more.',
    },
    servers: [
      { url: process.env.API_URL || `http://localhost:${PORT}` }
    ],
    // RapidAPI passes API key in headers
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-rapidapi-key',
          description: 'Your RapidAPI key. Included automatically when called via RapidAPI hub.'
        }
      }
    },
    security: [{ ApiKeyAuth: [] }]
  },
  apis: ['./src/routes/*.js']
})

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Link Preview API Docs'
}))

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0' })
})

app.get('/', (_req, res) => {
  res.json({
    name: 'Link Preview API',
    version: '1.0.0',
    docs: '/docs',
    health: '/health',
    endpoint: 'GET /preview?url=<url>',
    pricing: 'https://rapidapi.com/krishnak2c/api/link-preview-api/pricing',
    deploy: 'Belamo (belamo.app)'
  })
})

app.use(quotaGuard)

app.use('/preview', previewRouter)

app.use(errorHandler)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Link Preview API running on port ${PORT}`)
  console.log(`Docs at http://localhost:${PORT}/docs`)
})
