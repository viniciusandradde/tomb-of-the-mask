#!/usr/bin/env node
// Converte as pré-visualizações geradas pelo Canva (pwa/assets/src) em
// arquivos finais: fundos ampliados 4x com pixels nítidos e ícones do PWA.
// Usa o Chromium do Playwright como "editor de imagem" sem dependências nativas.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const SRC = path.join(__dirname, '..', 'pwa', 'assets', 'src');
const OUT = path.join(__dirname, '..', 'pwa', 'assets');
const ICONS = path.join(__dirname, '..', 'pwa', 'icons');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<canvas id=c></canvas>');
  async function scale(file, w, h, opts) {
    const data = fs.readFileSync(file).toString('base64');
    const url = await page.evaluate(async ({ data, w, h, opts }) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + data; await img.decode();
      const c = document.getElementById('c'); c.width = w; c.height = h;
      const x = c.getContext('2d'); x.imageSmoothingEnabled = !!opts.smooth;
      if (opts.bg) { x.fillStyle = opts.bg; x.fillRect(0, 0, w, h); }
      const pad = opts.pad || 0;
      x.drawImage(img, pad, pad, w - 2 * pad, h - 2 * pad);
      return c.toDataURL('image/png');
    }, { data, w, h, opts: opts || {} });
    return Buffer.from(url.split(',')[1], 'base64');
  }
  for (const f of fs.readdirSync(SRC)) {
    if (!f.endsWith('.png')) continue;
    const src = path.join(SRC, f);
    if (f === 'icon.png') {
      fs.writeFileSync(path.join(ICONS, 'icon-192.png'), await scale(src, 192, 192, { smooth: true }));
      fs.writeFileSync(path.join(ICONS, 'icon-512.png'), await scale(src, 512, 512, { smooth: true }));
      fs.writeFileSync(path.join(ICONS, 'icon-maskable-512.png'), await scale(src, 512, 512, { smooth: true, pad: 52, bg: '#0b0612' }));
      console.log('ícones ok');
    } else {
      // fundos: 4x com pixels nítidos (visual pixel-art)
      const b = await scale(src, 112 * 4, 199 * 4, { smooth: false });
      fs.writeFileSync(path.join(OUT, f), b);
      console.log('fundo', f, b.length, 'bytes');
    }
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
