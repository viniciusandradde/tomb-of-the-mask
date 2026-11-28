/*
 * guardian.js — Labirinto do Guardião das Flores (fase antes da Máscara Suprema).
 * Personagem ORIGINAL com tema de Dia dos Mortos: cavaleiro-caveira de elmo prateado,
 * coroa de flores laranja, capa verde-água e uma espada longa atravessada na porta.
 * Para "merecer passar", a criança junta as 5 flores do labirinto; então ele ergue a espada.
 * Estende a classe Game (game.js).
 */
(function (root) {
  'use strict';
  const T = root.Maze.T, F = root.PixelFont, G = root.Game.prototype;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const LINES = {
    intro: 'Eu sou o Guardião das Flores. Esta porta é muito especial. Para passar, você precisa merecer: encontre as cinco flores do labirinto e traga para mim!',
    flower: ['Uma flor! Que linda!', 'Mais uma flor!', 'Você está indo muito bem!', 'Só falta uma flor!'],
    ready: 'Você trouxe todas as flores. Você mereceu passar! Eu vou levantar a minha espada.',
    notYet: ['Ainda não, pequeno aventureiro. Faltam flores.', 'Volte quando tiver todas as flores.', 'Procure as flores laranjas pelo labirinto.'],
    win: 'Muito bem! Agora o último desafio te espera: a Máscara Suprema!',
  };

  G.isGuardianLevel = function () { return this.mode === 'stage' && !!(this.level && this.level.guardian); };
  G.guardianNeed = function () { return this.isGuardianLevel() ? this.level.guardian.flowers : 0; };
  G.guardianLocked = function () { return this.isGuardianLevel() && this.levelCoins < this.guardianNeed(); };

  G.guardianStart = function () {
    this.guard = { raise: 0, warnAt: -9, said: 0, speakAt: -9 };
    this.toastMsg('JUNTE AS 5 FLORES PARA PASSAR');
    if (this.kids()) this.speak(LINES.intro);
  };
  // chamada a cada flor coletada
  G.guardianFlower = function () {
    const n = this.levelCoins, need = this.guardianNeed();
    if (n >= need) {
      this.toastMsg('O GUARDIAO ERGUEU A ESPADA!');
      this.audio.powerup();
      if (this.kids()) this.speak(LINES.ready);
    } else {
      this.toastMsg('FLOR ' + n + ' DE ' + need);
      if (this.kids()) this.speak(LINES.flower[Math.min(n - 1, LINES.flower.length - 1)]);
    }
  };
  // jogador deslizou em direção à porta ainda trancada
  G.guardianWarn = function () {
    if (!this.guard || this.t - this.guard.warnAt < 1.2) return;
    this.guard.warnAt = this.t;
    const left = this.guardianNeed() - this.levelCoins;
    this.toastMsg('FALTAM ' + left + (left === 1 ? ' FLOR' : ' FLORES'));
    this.audio.bump();
    if (this.kids() && this.t - this.guard.speakAt > 4) { this.guard.speakAt = this.t; this.speak(this.pick(LINES.notYet)); }
  };
  G.guardianWinLine = function () { if (this.kids()) this.speak(LINES.win); };

  // flor de cempasúchil no lugar da moeda
  G.drawFlower = function (px, py, pulse) {
    const ctx = this.ctx, s = this.tile, cx = px + s / 2, cy = py + s / 2, r = s * (0.36 + pulse * 0.04);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(this.t * 0.6);
    ctx.shadowColor = '#ff8c1a'; ctx.shadowBlur = 10 + pulse * 6;
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.fillStyle = i % 2 ? '#ff8c1a' : '#ffb21a'; ctx.fillRect(Math.cos(a) * r * 0.55 - r * 0.28, Math.sin(a) * r * 0.55 - r * 0.28, r * 0.56, r * 0.56); }
    ctx.shadowBlur = 0; ctx.fillStyle = '#ffe066'; ctx.fillRect(-r * 0.3, -r * 0.3, r * 0.6, r * 0.6);
    ctx.fillStyle = '#c4500a'; ctx.fillRect(-r * 0.1, -r * 0.1, r * 0.2, r * 0.2);
    ctx.restore();
  };

  // guardião em pé logo acima da porta (no espaço extra que a câmera abre nesta fase)
  G.drawGuardian = function (ox, oy) {
    if (!this.isGuardianLevel() || !this.guard) return;
    const ex = this.level.rows[0].indexOf(T.EXIT); if (ex < 0) return;
    const ctx = this.ctx, s = this.tile, locked = this.guardianLocked();
    const g = this.guard; g.raise = clamp(g.raise + (locked ? -1 : 1) / 60 / 0.8, 0, 1);
    const doorX = ox + (ex + 0.5) * s, doorY = oy + 0.5 * s;
    const k = s * 1.35, gx = doorX, gy = oy - k * 0.62 + Math.sin(this.t * 2.5) * s * 0.04;
    ctx.save(); ctx.translate(gx, gy);
    // capa
    ctx.fillStyle = '#1e8f8a'; ctx.fillRect(-k * 0.42, -k * 0.05, k * 0.84, k * 0.58);
    ctx.fillStyle = '#156b67'; ctx.fillRect(-k * 0.42, k * 0.43, k * 0.84, k * 0.1);
    // armadura
    ctx.fillStyle = '#b9c3cf'; ctx.fillRect(-k * 0.28, -k * 0.02, k * 0.56, k * 0.42);
    ctx.fillStyle = '#7d8896'; ctx.fillRect(-k * 0.28, k * 0.18, k * 0.56, k * 0.06);
    ctx.fillStyle = '#ff8c1a'; ctx.fillRect(-k * 0.05, k * 0.03, k * 0.1, k * 0.1); // broche de flor
    // caveira
    ctx.fillStyle = '#f2ecdf'; ctx.fillRect(-k * 0.25, -k * 0.5, k * 0.5, k * 0.45);
    ctx.fillStyle = '#2a1030'; ctx.fillRect(-k * 0.17, -k * 0.38, k * 0.12, k * 0.12); ctx.fillRect(k * 0.05, -k * 0.38, k * 0.12, k * 0.12);
    ctx.fillStyle = locked ? '#ff8c1a' : '#7fc33a'; ctx.fillRect(-k * 0.13, -k * 0.35, k * 0.05, k * 0.05); ctx.fillRect(k * 0.09, -k * 0.35, k * 0.05, k * 0.05);
    ctx.fillStyle = '#2a1030'; for (let i = 0; i < 4; i++) ctx.fillRect(-k * 0.14 + i * k * 0.08, -k * 0.15, k * 0.04, k * 0.06);
    ctx.fillStyle = '#ff4fa3'; ctx.fillRect(-k * 0.04, -k * 0.47, k * 0.08, k * 0.06); // flor pintada na testa
    // elmo prateado + coroa de flores
    ctx.fillStyle = '#9aa6b4'; ctx.fillRect(-k * 0.3, -k * 0.6, k * 0.6, k * 0.12);
    for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#ffb21a' : '#ff8c1a'; ctx.beginPath(); ctx.arc(-k * 0.24 + i * k * 0.12, -k * 0.64, k * 0.07, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    // espada: atravessada na frente da porta enquanto faltam flores; erguida quando a criança merece passar
    const hx = gx + k * 0.38, hy = gy + k * 0.18;
    const dX = doorX - s * 0.75 - hx, dY = doorY - hy;
    const aLock = Math.atan2(dY, dX), aOpen = -Math.PI / 2;
    const ang = aLock + (aOpen - aLock) * g.raise, len = Math.hypot(dX, dY) * (1 - g.raise) + k * 1.0 * g.raise + s * 0.2;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang);
    ctx.shadowColor = locked ? '#ff8c1a' : '#ffffff'; ctx.shadowBlur = 12;
    ctx.fillStyle = '#e8eef5'; ctx.fillRect(k * 0.1, -k * 0.05, len, k * 0.1);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(k * 0.1, -k * 0.05, len, k * 0.03);
    ctx.shadowBlur = 0; ctx.fillStyle = '#c99a2e'; ctx.fillRect(k * 0.06, -k * 0.16, k * 0.07, k * 0.32);
    ctx.fillStyle = '#6a3a14'; ctx.fillRect(-k * 0.08, -k * 0.04, k * 0.14, k * 0.08);
    ctx.restore();
  };

  // contador de flores (espaço da tela)
  G.drawGuardianHud = function () {
    if (!this.isGuardianLevel()) return;
    const ctx = this.ctx, u = this.ui, need = this.guardianNeed(), got = Math.min(need, this.levelCoins);
    const y = this.H - (u * 7 + 18) - 14 - u * 8, w = Math.min(this.W * 0.7, 300), x = this.W / 2 - w / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 6, y - 4, w + 12, u * 7 + 18);
    F.text(ctx, got >= need ? 'O GUARDIAO DEIXOU VOCE PASSAR!' : 'FLORES PARA O GUARDIAO: ' + got + ' DE ' + need, this.W / 2, y, Math.max(1, u - 1), got >= need ? '#7fc33a' : '#ffc76b', 'center');
    const seg = w / need;
    for (let i = 0; i < need; i++) { ctx.fillStyle = i < got ? '#ff8c1a' : '#3a2a40'; ctx.fillRect(x + i * seg + 2, y + u * 7 + 2, seg - 4, 8); }
  };
})(typeof self !== 'undefined' ? self : this);
