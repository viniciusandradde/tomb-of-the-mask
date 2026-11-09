/* sw.js — cache offline. Atualize CACHE ao publicar uma nova versão. */
const CACHE = 'tumba-v6';
const ASSETS = [
  './', './index.html', './style.css', './manifest.webmanifest',
  './js/maze.js', './js/levels.js', './js/font.js', './js/audio.js', './js/game.js', './js/boss.js', './js/map.js', './js/items.js', './js/app.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './assets/keyart.png', './assets/bg-catacumba.png', './assets/bg-cripta.png', './assets/bg-selva.png',
  './assets/bg-vulcao.png', './assets/bg-abismo.png', './assets/bg-templo.png',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Estratégia: rede primeiro com fallback ao cache (pega atualizações quando online, funciona offline).
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});
