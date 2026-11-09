/* app.js — inicialização, PWA (service worker, instalação). */
(function () {
  'use strict';
  const canvas = document.getElementById('game');
  const game = new window.Game(canvas);
  if (game.wbLoad) game.wbLoad();
  window.game = game; // útil para depuração e testes

  // Service worker para funcionar offline
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW falhou', e));
    });
  }

  // Botão "instalar" (Android/desktop). No iOS usa-se "Adicionar à Tela de Início".
  let deferred = null;
  const box = document.getElementById('install');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferred = e;
    if (!localStorage.getItem('tumba-install-dismissed')) box.hidden = false;
  });
  document.getElementById('install-btn').addEventListener('click', async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice; deferred = null; box.hidden = true;
  });
  document.getElementById('install-close').addEventListener('click', () => { box.hidden = true; localStorage.setItem('tumba-install-dismissed', '1'); });
  window.addEventListener('appinstalled', () => { box.hidden = true; });
})();
