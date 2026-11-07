#!/usr/bin/env node
/*
 * Servidor estático sem dependências para o jogo (pasta pwa/).
 * Uso: node server.js [porta]   (padrão 8080)
 * Em casa: abra http://IP-DO-SERVIDOR:8080 no celular, na mesma rede Wi-Fi.
 * Para instalar como PWA fora de localhost é preciso HTTPS (veja README).
 */
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.join(__dirname, 'pwa');
const PORT = Number(process.argv[2] || process.env.PORT || 8080);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.md': 'text/markdown; charset=utf-8' };

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('404'); }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' || file.endsWith('sw.js') ? 'no-cache' : 'public, max-age=3600',
      'Service-Worker-Allowed': '/',
    });
    res.end(data);
  });
}).listen(PORT, '0.0.0.0', () => {
  console.log(`Tumba da Máscara servindo em:`);
  console.log(`  http://localhost:${PORT}`);
  for (const ifaces of Object.values(os.networkInterfaces())) for (const i of ifaces) if (i.family === 'IPv4' && !i.internal) console.log(`  http://${i.address}:${PORT}  (celular na mesma rede)`);
});
