import app from './app.js'

const PORT = process.env.PORT || 3000

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Link Preview API running on port ${PORT}`)
  console.log(`Docs at http://localhost:${PORT}/docs`)
})
