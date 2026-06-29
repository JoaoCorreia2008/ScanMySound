// ES module version (frontend package.json has "type": "module")
import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BASE = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights'
const FILES = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_expression_model-weights_manifest.json',
  'face_expression_model-shard1',
]

const targetDir = path.join(__dirname, '..', 'public', 'models')

function download(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode && [301, 302, 307, 308].includes(res.statusCode)) {
          return download(res.headers.location).then(resolve, reject)
        }
        if (res.statusCode !== 200) {
          return reject(new Error('HTTP ' + res.statusCode + ' for ' + url))
        }
        const chunks = []
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => resolve(Buffer.concat(chunks)))
        res.on('error', reject)
      })
      .on('error', reject)
  })
}

async function main() {
  fs.mkdirSync(targetDir, { recursive: true })

  for (const file of FILES) {
    const url = BASE + '/' + file
    const out = path.join(targetDir, file)
    process.stdout.write('A descarregar ' + file + '... ')
    try {
      const data = await download(url)
      fs.writeFileSync(out, data)
      console.log('OK (' + data.length + ' bytes)')
    } catch (err) {
      console.log('FALHOU (' + err.message + ')')
      process.exitCode = 1
    }
  }

  if (process.exitCode) {
    console.log('\nAlguns modelos falharam. Tenta novamente ou descarrega manualmente de:')
    console.log('https://github.com/justadudewhohacks/face-api.js/tree/master/weights')
  } else {
    console.log('\nModelos disponiveis em frontend/public/models/')
  }
}

main()
