require('dotenv').config()

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const morgan = require('morgan')
const path = require('path')

const { connectDb } = require('./config/db')
const { configureCloudinary } = require('./config/cloudinary')

const authRoutes = require('./routes/authRoutes')
const productRoutes = require('./routes/productRoutes')
const orderRoutes = require('./routes/orderRoutes')
const userRoutes = require('./routes/userRoutes')

const app = express()

const PORT = Number(process.env.PORT || 8080)
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

configureCloudinary()

app.use(helmet())
// CORS:
// - In production when serving frontend from same origin, CORS isn't needed.
// - In development (Vite on :5173), allow CLIENT_ORIGIN.
if (process.env.NODE_ENV !== 'production') {
  app.use(
    cors({
      origin: [CLIENT_ORIGIN],
      credentials: false,
    }),
  )
}
app.use(express.json({ limit: '5mb' }))
app.use(morgan('dev'))
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  }),
)

app.get('/health', (_req, res) => res.json({ ok: true }))

// Both styles supported:
// - /api/... (recommended)
// - /...     (matches assignment-style routes)
app.use('/api', authRoutes)
app.use('/api', productRoutes)
app.use('/api', orderRoutes)
app.use('/api', userRoutes)

app.use(authRoutes)
app.use(productRoutes)
app.use(orderRoutes)
app.use(userRoutes)

// Serve React build in production (single public URL)
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'frontend', 'dist')
  app.use(express.static(distPath))
  // Express v5 doesn't support `app.get('*')` the same way as v4.
  // Use a final handler that serves the SPA for non-API routes.
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next()
    return res.sendFile(path.join(distPath, 'index.html'))
  })
}

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err)
  res.status(500).json({ message: 'Server error' })
})

connectDb()
  .then(() => {
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`🚀 API running on http://localhost:${PORT}`)
    })
  })
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error('❌ Failed to start server', e)
    process.exit(1)
  })

