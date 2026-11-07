#!/usr/bin/env node
// Gera os ícones PNG do PWA (máscara pixel-art) sem dependências externas.
const fs = require('fs'), path = require('path'), zlib = require('zlib');

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, pixels) { // pixels: Uint8Array RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; pixels.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// Desenho em uma grade lógica 16x16, escalado para o tamanho final.
// . fundo  # máscara  d sombra da máscara  e olho  w brilho do olho  m boca  g brilho de fundo
const ART = [
  '................',
  '................',
  '...##########...',
  '..############..',
  '..############..',
  '..##ee####ee##..',
  '..##ew####ew##..',
  '..############..',
  '..############..',
  '..#m##m##m##m#..',
  '..############..',
  '..dddddddddddd..',
  '..dddddddddddd..',
  '...dddddddddd...',
  '................',
  '................',
];
const COLORS = { '#': [255, 210, 63], d: [191, 150, 40], e: [26, 26, 26], w: [255, 255, 255], m: [26, 26, 26] };

function render(size, maskable) {
  const px = Buffer.alloc(size * size * 4);
  const cell = size / 16;
  const pad = maskable ? 0.1 : 0; // zona segura do ícone mascarável
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    // fundo: roxo escuro com brilho radial
    const dx = x / size - 0.5, dy = y / size - 0.5, d = Math.sqrt(dx * dx + dy * dy);
    const glow = Math.max(0, 1 - d * 2.2);
    let r = 5 + 60 * glow * glow, g = 3 + 20 * glow * glow, b = 10 + 90 * glow * glow;
    // grade sutil
    if (x % Math.round(cell) === 0 || y % Math.round(cell) === 0) { r += 12; g += 6; b += 18; }
    const lx = (x / size - pad) / (1 - 2 * pad), ly = (y / size - pad) / (1 - 2 * pad);
    const gx = Math.floor(lx * 16), gy = Math.floor(ly * 16);
    const ch = gx >= 0 && gx < 16 && gy >= 0 && gy < 16 ? ART[gy][gx] : '.';
    if (COLORS[ch]) [r, g, b] = COLORS[ch];
    else if (ch === '.') {
      // brilho amarelo ao redor da máscara
      const nearMask = [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([ox, oy]) => ART[gy + oy] && COLORS[ART[gy + oy][gx + ox]]);
      if (nearMask) { r += 60; g += 50; b += 10; }
    }
    px[i] = Math.min(255, r); px[i + 1] = Math.min(255, g); px[i + 2] = Math.min(255, b); px[i + 3] = 255;
  }
  return png(size, size, px);
}
const out = path.join(__dirname, '..', 'pwa', 'icons');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'icon-192.png'), render(192, false));
fs.writeFileSync(path.join(out, 'icon-512.png'), render(512, false));
fs.writeFileSync(path.join(out, 'icon-maskable-512.png'), render(512, true));
console.log('ícones gerados em', out);
