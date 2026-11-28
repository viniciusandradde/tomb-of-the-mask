/* Epílogo da campanha. O relógio da cena também posiciona a faixa ao voltar à aba. */
(function (root) {
  'use strict';
  const G = root.Game.prototype, F = root.PixelFont;
  const duration = 18.5;
  const scenes = [
    { at: 0, title: 'O último selo', lines: ['Atrás da Máscara Suprema,', 'uma luz pisca dentro do cristal.'] },
    { at: 4.5, title: 'O chamado', lines: ['É a princesa! Ela ergue a mão.', 'O herói encosta o escudo no selo.'] },
    { at: 9, title: 'A ponte de luz', lines: ['O cristal se abre em mil estrelas.', 'O herói guia a princesa pela ponte.'] },
    { at: 14, title: 'A primeira aurora', lines: ['A salvo, a princesa planta uma flor.', 'O reino inteiro volta a florescer.'] },
  ];
  const clamp = n => Math.max(0, Math.min(1, n));
  const princess = [
    '.g..g..g.', '.ggggggg.', '..hhhhh..', '.hsssssh.', '.hessesh.', '..sssss..',
    '...ppp...', '..pplpp..', '.sppppps.', '..pplpp..', '.pplllpp.', 'ppplllppp',
  ];
  const palette = { g: '#ffdc73', h: '#743859', s: '#ffcfaa', e: '#301e46', p: '#bc73dd', l: '#edbbff' };

  function drawPrincess(ctx, x, ground) {
    princess.forEach((row, y) => {
      for (let col = 0; col < row.length; col++) {
        if (row[col] === '.') continue;
        ctx.fillStyle = palette[row[col]];
        ctx.fillRect(x + 2 * col - 9, ground - 24 + 2 * y, 2, 2);
      }
    });
  }

  function landscape(ctx, t) {
    const dawn = clamp((t - 10) / 6);
    const sky = ctx.createLinearGradient(0, 0, 0, 165);
    sky.addColorStop(0, '#121027'); sky.addColorStop(0.65, '#553e75'); sky.addColorStop(1, '#c186aa');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, 320, 165);
    ctx.fillStyle = '#ffe1a0';
    for (let i = 0; i < 42; i++) {
      ctx.globalAlpha = 0.45 + 0.45 * Math.sin(t + i * 2.2);
      ctx.fillRect((i * 89 + 14) % 320, (i * 31 + 8) % 85, i % 5 === 0 ? 2 : 1, 1);
    }
    ctx.globalAlpha = dawn;
    ctx.fillStyle = '#ffa879'; ctx.fillRect(0, 0, 320, 165);
    ctx.fillStyle = '#ffe4aa'; ctx.beginPath(); ctx.arc(224, 108 - dawn * 65, 19, 0, 2 * Math.PI); ctx.fill();
    ctx.globalAlpha = 1;
    for (let i = 0; i < 16; i++) {
      const x = i * 24 - 14, y = 64 + (i * 19) % 34;
      ctx.fillStyle = '#63496e'; ctx.beginPath(); ctx.moveTo(x - 38, 124); ctx.lineTo(x, y);
      ctx.lineTo(x + 40, 124); ctx.fill();
    }
    // Torres distantes e a janela que se ilumina quando o selo se desfaz.
    for (const [x, y, w] of [[237, 78, 38], [229, 68, 12], [252, 59, 10], [273, 71, 12]]) {
      ctx.fillStyle = '#443453'; ctx.fillRect(x, y, w, 132 - y);
      for (let k = 0; k < w; k += 6) ctx.fillRect(x + k, y - 3, 3, 4);
      ctx.fillStyle = dawn > 0.1 ? '#ffdb87' : '#291e42'; ctx.fillRect(x + w / 2 - 1, y + 8, 3, 7);
    }
    ctx.fillStyle = '#2f2546'; ctx.fillRect(0, 126, 320, 39);
    for (let i = 0; i < 16; i++) {
      const x = i * 22 - 4;
      ctx.fillStyle = '#8f7290'; ctx.fillRect(x, 125, 20, 4);
      ctx.fillStyle = '#493653'; ctx.fillRect(x + 3, 133, 15, 4);
    }
    // Um arco de pedra em primeiro plano enquadra a câmara da tumba.
    ctx.fillStyle = '#211a33';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(i * 9, 0, 10, 51 - i * 9); ctx.fillRect(310 - i * 9, 0, 10, 51 - i * 9);
    }
    for (const x of [0, 308]) {
      ctx.fillRect(x, 0, 12, 126);
      for (let y = 12; y < 125; y += 16) { ctx.fillStyle = '#423052'; ctx.fillRect(x, y, 12, 2); }
      ctx.fillStyle = '#211a33';
    }
  }

  G.startEnding = function () {
    this.state = 'ending'; this.buttons = [];
    this.endingTime = 0;
    this.endingSince = document.hidden ? null : performance.now();
    this.audio.stopMusic();
    this.syncEndingAudio();
  };
  G.endingPosition = function () {
    return this.endingTime + (this.endingSince === null ? 0 : (performance.now() - this.endingSince) / 1000);
  };
  G.syncEndingAudio = function () {
    if (!document.hidden) this.audio.startEndingMusic(() => this.endingPosition());
  };
  G.updateEndingVisibility = function () {
    this.endingTime = this.endingPosition();
    this.endingSince = document.hidden ? null : performance.now();
    if (document.hidden) this.audio.stopMusic();
    else this.syncEndingAudio();
  };
  G.finishEnding = function () {
    this.goto('win');
    this.winAt = this.t;
    if (this.wbMaybeWarn) this.wbMaybeWarn();
  };

  G.renderEnding = function () {
    const t = this.endingPosition();
    if (t >= duration) { this.finishEnding(); return; }
    const ctx = this.ctx, W = this.W, H = this.H, cx = W / 2;
    const scene = scenes.slice().reverse().find(s => t >= s.at) || scenes[0];
    const portrait = H > W;
    const scale = Math.min(W / (portrait ? 210 : 320), H * 0.5 / 165);
    const focus = portrait ? 125 + 85 * clamp((t - 2) / 12) : 160;
    const y = H * 0.43 - 82.5 * scale;
    ctx.fillStyle = '#100d1c'; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(cx - focus * scale, y); ctx.scale(scale, scale);
    landscape(ctx, t);
    const approach = clamp((t - 0.6) / 6), cross = clamp((t - 9.5) / 4.5);
    const heroX = 50 + approach * 104 + cross * 72;
    const royalX = 188 + cross * 61;
    this.drawBigMask(heroX, 116 - Math.abs(Math.sin(t * 5)) * (cross === 1 ? 0 : 2), 18);
    drawPrincess(ctx, royalX, 125);
    const theme = this.shieldTheme();
    if (t > 3 && t < 11) this.drawShieldAura(heroX, 115, 17, theme);
    if (t < 10.2) {
      const split = clamp((t - 8.5) / 1.7);
      ctx.save(); ctx.globalAlpha = 1 - split;
      for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(188 + side * split * 26, 80 - split * 10);
        ctx.lineTo(188 + side * (20 + split * 28), 99 - split * 9);
        ctx.lineTo(188 + side * (15 + split * 24), 123);
        ctx.lineTo(188 + side * split * 26, 129); ctx.closePath();
        ctx.fillStyle = 'rgba(120,220,255,.28)'; ctx.fill();
        ctx.strokeStyle = '#a6ecff'; ctx.stroke();
      }
      ctx.restore();
    }
    if (t > 7) {
      const release = clamp((t - 7) / 2.5);
      ctx.fillStyle = theme.light;
      ctx.fillRect(166, 114, 22 * release, 2);
      for (let i = 0; i < 26; i++) {
        const angle = i * 2.4, r = ((t - 7) * 14 + i * 3) % 53;
        ctx.fillRect(188 + Math.cos(angle) * r, 104 + Math.sin(angle) * r, 2, 2);
      }
      ctx.fillStyle = '#ffdc8a'; ctx.fillRect(178, 125, 116 * release, 2);
    }
    if (t >= 14) {
      for (let i = 0; i < 18; i++) {
        const x = (245 + i * 53) % 300 + 10, h = clamp((t - 14) * 1.4 - i * 0.13) * (4 + i % 5);
        if (!h) continue;
        ctx.fillStyle = '#8eb37e'; ctx.fillRect(x, 138 - h, 1, h);
        ctx.fillStyle = i % 2 ? '#ff96bd' : '#ffd478'; ctx.fillRect(x - 2, 136 - h, 5, 3);
      }
    }
    ctx.restore();
    const titleScale = Math.max(1, Math.min(this.ui + 1, Math.floor((W - 20) / F.width(scene.title, 1))));
    F.text(ctx, scene.title, cx, Math.max(8, y - titleScale * 10 - 12), titleScale, '#ffdc8a', 'center');
    const size = Math.max(1, Math.min(this.ui, Math.floor(W / 145)));
    const lineWidth = W - 24;
    const lines = [];
    for (const sentence of scene.lines) {
      let line = '';
      for (const word of sentence.split(' ')) {
        const next = line ? line + ' ' + word : word;
        if (line && F.width(next, size) > lineWidth) { lines.push(line); line = word; }
        else line = next;
      }
      lines.push(line);
    }
    lines.forEach((line, i) => F.text(ctx, line, cx, y + 165 * scale + 16 + i * (size * 8 + 5), size, '#f5e9ff', 'center'));
    this.drawButton('PULAR CENA', cx, H - this.ui * 5 - 16, Math.min(225, W * 0.65), () => this.finishEnding(), '#b198c8', 'ending-skip');
  };
})(window);
