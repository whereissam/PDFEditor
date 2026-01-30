import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import uploadRoutes from './routes/upload'
import documentRoutes from './routes/documents'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use(
  '*',
  cors({
    origin: ['http://localhost:3110', 'http://localhost:3000'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
)

// Health check
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    message: 'PDF Editor API',
    version: '1.0.0',
  })
})

app.get('/health', (c) => {
  return c.json({ status: 'healthy' })
})

// Routes
app.route('/api/upload', uploadRoutes)
app.route('/api/documents', documentRoutes)

// Start server
const port = process.env.PORT || 3120

console.log(`Server starting on port ${port}...`)

export default {
  port,
  fetch: app.fetch,
}
