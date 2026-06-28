const app = require('./app')
const { port } = require('./config')

if (require.main === module) {
  app.listen(port, () => {
    console.log(`ScanMyMusic API running on port ${port}`)
  })
}

module.exports = app
