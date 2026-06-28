// E2E smoke test: backend + frontend preview build a servir o bundle.
const http = require('http')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

const BACKEND_PORT = 3001
const FRONTEND_PORT = 4173

function fetchUrl(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, opts, (res) => {
      let body = ''
      res.on('data', (c) => (body += c))
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }))
    })
    req.on('error', reject)
    if (opts.body) req.write(opts.body)
    req.end()
  })
}

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  const root = path.join(__dirname, '..')
  const backend = spawn('node', ['src/server.js'], {
    cwd: path.join(root, 'backend'),
    env: { ...process.env, PORT: String(BACKEND_PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const frontend = spawn('cmd.exe', ['/c', 'npx vite preview --port ' + FRONTEND_PORT + ' --strictPort'], {
    cwd: path.join(root, 'frontend'),
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })

  let backendLog = ''
  let frontendLog = ''
  backend.stdout.on('data', (d) => (backendLog += d.toString()))
  backend.stderr.on('data', (d) => (backendLog += d.toString()))
  frontend.stdout.on('data', (d) => (frontendLog += d.toString()))
  frontend.stderr.on('data', (d) => (frontendLog += d.toString()))

  await wait(3000)

  try {
    const health = await fetchUrl(`http://localhost:${BACKEND_PORT}/api/health`)
    console.log('backend health:', health.status, JSON.parse(health.body).status)

    const demo = await fetchUrl(`http://localhost:${BACKEND_PORT}/api/auth/demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    const demoBody = JSON.parse(demo.body)
    console.log('demo token issued:', demo.status, 'len=' + (demoBody.token || '').length)

    const emotion = await fetchUrl(`http://localhost:${BACKEND_PORT}/api/emotions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + demoBody.token,
      },
      body: JSON.stringify({ emotion: 'sad', confidence: 0.78, source: 'e2e' }),
    })
    console.log('emotion recorded:', emotion.status)

    const frontendResp = await fetchUrl(`http://localhost:${FRONTEND_PORT}/`)
    console.log('frontend index:', frontendResp.status, 'bytes=' + frontendResp.body.length)
    console.log('contains #root:', frontendResp.body.includes('id="root"'))

    const assets = frontendResp.body.match(/src="(\/assets\/[^"]+\.js)"/)
    if (assets) {
      const assetUrl = `http://localhost:${FRONTEND_PORT}${assets[1]}`
      const asset = await fetchUrl(assetUrl)
      console.log('frontend bundle:', asset.status, 'bytes=' + asset.body.length)
    }

    const modelHint = frontendResp.body.includes('/models')
    console.log('frontend mentions /models:', modelHint)
  } finally {
    try {
      backend.kill('SIGTERM')
    } catch {}
    try {
      frontend.kill('SIGTERM')
    } catch {}
    await wait(500)
    console.log('\n--- backend log ---')
    console.log(backendLog.split('\n').slice(-8).join('\n'))
    console.log('--- frontend log ---')
    console.log(frontendLog.split('\n').slice(-8).join('\n'))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
