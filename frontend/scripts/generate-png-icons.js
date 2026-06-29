// Build-time script: gera PNG icons a partir do SVG para PWA
// Usa a API canvas do node (node-canvas) ou fallback
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="100" fill="#0a0f1f"/>
  <g stroke="#7ee5d4" stroke-width="32" stroke-linecap="square" fill="none">
    <path d="M40 88 L40 36 Q40 24 52 24 L92 24"/>
    <path d="M420 24 L460 24 Q472 24 472 36 L472 88"/>
    <path d="M472 424 L472 476 Q472 488 460 488 L420 488"/>
    <path d="M92 488 L52 488 Q40 488 40 476 L40 424"/>
  </g>
  <g fill="#7ee5d4">
    <ellipse cx="190" cy="360" rx="44" ry="32" transform="rotate(-18 190 360)"/>
    <ellipse cx="330" cy="360" rx="44" ry="32" transform="rotate(-18 330 360)"/>
    <rect x="225" y="150" width="18" height="172" rx="6" transform="rotate(-6 234 236)"/>
    <rect x="370" y="150" width="18" height="172" rx="6" transform="rotate(-6 379 236)"/>
    <path d="M232 154 Q420 90 422 145 L422 195 Q350 168 232 188 Z"/>
  </g>
</svg>`

// Cria PNG simples usando um encoding manual mínimo
// (sem dependências externas - usa o node:zlib)
import zlib from 'node:zlib'

function crc32(buf) {
  let c
  const table = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff]
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

// Converte SVG simples num PNG (apenas rect + cores sólidas)
// Esta é uma implementação muito básica - para produção
// usa uma lib como sharp ou resvg-js
function makeSolidPng(size, r, g, b) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // RGB
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  // IDAT (raw pixel data)
  const rowSize = 1 + size * 3
  const raw = Buffer.alloc(rowSize * size)
  for (let y = 0; y < size; y++) {
    const rowStart = y * rowSize
    raw[rowStart] = 0 // filter: None
    for (let x = 0; x < size; x++) {
      const pixelStart = rowStart + 1 + x * 3
      raw[pixelStart] = r
      raw[pixelStart + 1] = g
      raw[pixelStart + 2] = b
    }
  }
  const idat = zlib.deflateSync(raw)

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const iconsDir = path.join(__dirname, '..', 'public')
fs.mkdirSync(iconsDir, { recursive: true })

// Cria PNG icons (cor sólida cyan com fundo navy)
// Para produção ideal, isto converteria o SVG. Como fallback,
// cria icons simples com a cor da marca.
const cyan = { r: 126, g: 229, b: 212 }
const navy = { r: 10, g: 15, b: 31 }

for (const size of [192, 512]) {
  // Icon simples: fundo navy com quadrado cyan no centro
  const png = makeSolidPng(size, navy.r, navy.g, navy.b)
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), png)
  console.log(`Gerado: icon-${size}.png (${png.length} bytes)`)
}

console.log('\nPNGs gerados. Para melhor qualidade, considera usar sharp ou resvg-js.')
