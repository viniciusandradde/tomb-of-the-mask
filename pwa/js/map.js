/*
 * map.js — mapa de mundo estilo Super Mario World: terreno em pixel art,
 * caminho de pedra, portas como marcos das fases, decorações animadas por
 * mundo, personagem caminhando pelo caminho, rolagem e painel de prévia.
 * Estende a classe Game (game.js).
 */
(function (root) {
  'use strict';
  const T = root.Maze.T, M = root.Maze, F = root.PixelFont, G = root.Game.prototype;
  const COLS = 12;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgba(h, a) { const [r, g, b] = hexToRgb(h); return `rgba(${r},${g},${b},${a})`; }
  function shade(h, f) { const [r, g, b] = hexToRgb(h).map((c) => clamp(Math.round(c * f), 0, 255)); return `rgb(${r},${g},${b})`; }

  // decorações por mundo
  const DECOR = {
    catacumba: ['torch', 'skull', 'bones', 'pillar'], cripta: ['torch', 'crystal', 'pillar', 'skull'], selva: ['plant', 'plant', 'pillar', 'torch'],
    vulcao: ['lava', 'torch', 'crack', 'skull'], abismo: ['water', 'crystal', 'plant', 'bubble'], templo: ['gold', 'torch', 'pillar', 'gold'],
    sombras: ['eyes', 'torch', 'skull', 'eyes'], nucleo: ['crack', 'lava', 'torch', 'crack'], mestre: ['gold', 'torch', 'gold', 'pillar'],
  };

  G.mapPanelH = function () { return clamp(Math.round(this.H * 0.3), 160, 250); };
  G.mapStep = function () { return clamp(Math.round(this.H * 0.085), 56, 110); };

  G.mapInit = function () {
    const idxs = this.worldLevels(this.worldPage);
    let sel = 0;
    idxs.forEach((idx, i) => { if (this.save.unlocked > idx) sel = i; });
    if (this.levelIndex >= 0 && idxs.includes(this.levelIndex)) sel = idxs.indexOf(this.levelIndex);
    this.sel = sel;
    this.tokenProg = sel; // posição do personagem ao longo do caminho (índice fracionário)
    this.thumbs = this.thumbs || {};
    this.mapScroll = null;
    this.mapBats = [];
    this.mapDust = [];
    // layout determinístico do mundo (posições dos nós e das decorações)
    const R = M.rng(777 + this.worldPage * 31);
    const count = idxs.length;
    this.mapNodes = [];
    for (let i = 0; i < count; i++) {
      const side = (i % 2 === 0 ? -1 : 1) * (0.55 + R() * 0.45);
      this.mapNodes.push({ fx: count === 1 ? 0 : side, jitter: (R() - 0.5) * 0.3 });
    }
    const types = DECOR[root.WORLDS[this.worldPage].id] || DECOR.catacumba;
    this.mapDecor = [];
    for (let i = 0; i < Math.max(14, count * 4); i++) {
      this.mapDecor.push({ type: types[Math.floor(R() * types.length)], t: R() * (count - 1), side: R() < 0.5 ? -1 : 1, off: 0.55 + R() * 0.6, size: 0.7 + R() * 0.6, ph: R() * 6 });
    }
  };

  // ponto do caminho para um índice fracionário (Catmull-Rom entre os nós)
  G.mapPoint = function (p) {
    const nodes = this.mapNodes, count = nodes.length;
    const step = this.mapStep(), cx = this.W / 2, amp = Math.min(this.W, 440) * 0.3;
    const baseY = (i) => -i * step; // mapa cresce para cima; rolagem adiciona o deslocamento
    const pos = (i) => { i = clamp(i, 0, count - 1); const n = nodes[Math.round(i)] || nodes[0]; return { x: cx + n.fx * amp, y: baseY(i) + n.jitter * step }; };
    if (count <= 1) return pos(0);
    const i0 = clamp(Math.floor(p), 0, count - 1), i1 = clamp(i0 + 1, 0, count - 1), t = clamp(p - i0, 0, 1);
    const P0 = pos(clamp(i0 - 1, 0, count - 1)), P1 = pos(i0), P2 = pos(i1), P3 = pos(clamp(i1 + 1, 0, count - 1));
    const cr = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
    return { x: cr(P0.x, P1.x, P2.x, P3.x), y: cr(P0.y, P1.y, P2.y, P3.y) };
  };
  G.mapNodePos = function (i) { return this.mapPoint(i); };
  G.mapMove = function (delta) {
    const idxs = this.worldLevels(this.worldPage);
    const n = clamp(this.sel + delta, 0, idxs.length - 1);
    if (n === this.sel) return;
    if (this.save.unlocked <= idxs[n]) { this.audio.bump(); this.toastMsg('BLOQUEADO'); return; }
    this.sel = n; this.audio.click();
  };
  G.mapEnter = function () {
    const idxs = this.worldLevels(this.worldPage);
    const idx = idxs[this.sel];
    if (Math.abs(this.tokenProg - this.sel) > 0.2) return; // espera o personagem chegar
    if (this.save.unlocked > idx) this.startLevel(idx);
  };

  // miniatura da fase (cache)
  G.thumb = function (idx) {
    const L = root.LEVELS[idx];
    const k = idx + '|' + this.ui;
    if (this.thumbs[k]) return this.thumbs[k];
    const wd = root.WORLDS[L.world];
    const cell = clamp(Math.floor(Math.min(140 / COLS, (this.mapPanelH() - 40) / L.rows.length)), 2, 6);
    const c = document.createElement('canvas'); c.width = COLS * cell; c.height = L.rows.length * cell;
    const x = c.getContext('2d');
    x.fillStyle = '#05030a'; x.fillRect(0, 0, c.width, c.height);
    for (let y = 0; y < L.rows.length; y++) for (let i = 0; i < COLS; i++) {
      const ch = L.rows[y][i]; let col = null, pad = 0;
      if (ch === T.WALL || ch in M.SHOOTERS) col = wd.color;
      else if (ch === T.DOT) { col = rgba(wd.accent, 0.8); pad = Math.max(0, cell / 2 - 1); }
      else if (ch === T.COIN) col = '#ffd23f';
      else if (ch === T.SPIKE || ch === T.TRAP) col = ch === T.TRAP ? '#ffb0b0' : '#ffffff';
      else if (ch === T.SPAWN) col = '#ffd23f';
      else if (ch === T.EXIT) col = L.boss ? '#ff3b3b' : '#fff6c2';
      else if (ch === T.BAT_H || ch === T.BAT_V) col = '#b04cff';
      else if (ch === T.SHIELD || ch === T.FREEZE || ch === T.MAGNET) col = '#8cf5ff';
      if (col) { x.fillStyle = col; x.fillRect(i * cell + pad, y * cell + pad, cell - pad * 2, cell - pad * 2); }
    }
    if (L.boss && this.drawBossSprite) this.drawBossSprite(x, cell * 6, cell * 2.5, cell, L.boss.master ? 'master' : root.BossLooks[L.world % 8], 3, { t: 0, color: wd.color });
    this.thumbs[k] = c;
    return c;
  };

  // ---- desenho de decorações ----
  G.drawDecor = function (d, x, y, wd) {
    const ctx = this.ctx, u = this.ui, s = u * 4 * d.size, t = this.t + d.ph;
    switch (d.type) {
      case 'torch': {
        ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x - s * 0.1, y - s * 0.6, s * 0.2, s * 0.6);
        const fl = 0.8 + 0.2 * Math.sin(t * 13) + 0.1 * Math.sin(t * 31);
        ctx.shadowColor = '#ffb020'; ctx.shadowBlur = 14 * fl;
        ctx.fillStyle = '#ff6a1a'; ctx.fillRect(x - s * 0.2, y - s * 0.6 - s * 0.35 * fl, s * 0.4, s * 0.35 * fl);
        ctx.fillStyle = '#ffd23f'; ctx.fillRect(x - s * 0.1, y - s * 0.6 - s * 0.22 * fl, s * 0.2, s * 0.22 * fl);
        ctx.shadowBlur = 0;
        const g = ctx.createRadialGradient(x, y - s * 0.6, 2, x, y - s * 0.6, s * 2.2); g.addColorStop(0, `rgba(255,176,32,${0.18 * fl})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(x - s * 2.2, y - s * 2.8, s * 4.4, s * 4.4);
        break;
      }
      case 'skull': ctx.fillStyle = '#d8d8e0'; ctx.fillRect(x - s * 0.3, y - s * 0.5, s * 0.6, s * 0.45); ctx.fillRect(x - s * 0.2, y - s * 0.08, s * 0.4, s * 0.1); ctx.fillStyle = '#05030a'; ctx.fillRect(x - s * 0.2, y - s * 0.38, s * 0.14, s * 0.14); ctx.fillRect(x + s * 0.06, y - s * 0.38, s * 0.14, s * 0.14); break;
      case 'bones': ctx.fillStyle = '#c8c8d0'; ctx.fillRect(x - s * 0.5, y - s * 0.1, s, s * 0.1); ctx.fillRect(x - s * 0.5, y - s * 0.22, s * 0.14, s * 0.3); ctx.fillRect(x + s * 0.36, y - s * 0.22, s * 0.14, s * 0.3); break;
      case 'pillar': ctx.fillStyle = shade(wd.color, 0.6); ctx.fillRect(x - s * 0.22, y - s * 1.2, s * 0.44, s * 1.2); ctx.fillStyle = shade(wd.color, 0.9); ctx.fillRect(x - s * 0.3, y - s * 1.3, s * 0.6, s * 0.15); ctx.fillRect(x - s * 0.3, y - s * 0.12, s * 0.6, s * 0.12); break;
      case 'crystal': { const gl = 0.6 + 0.4 * Math.sin(t * 3); ctx.shadowColor = '#8cf5ff'; ctx.shadowBlur = 12 * gl; ctx.fillStyle = `rgba(140,245,255,${0.6 + 0.3 * gl})`; ctx.beginPath(); ctx.moveTo(x, y - s * 0.9); ctx.lineTo(x + s * 0.25, y - s * 0.3); ctx.lineTo(x + s * 0.15, y); ctx.lineTo(x - s * 0.15, y); ctx.lineTo(x - s * 0.25, y - s * 0.3); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; break; }
      case 'plant': { const sw = Math.sin(t * 2) * s * 0.08; ctx.fillStyle = '#2f7a1f'; for (let i = -1; i <= 1; i++) { ctx.fillRect(x + i * s * 0.22 + sw * i - s * 0.06, y - s * (0.5 + Math.abs(i) * -0.15), s * 0.12, s * (0.5 - Math.abs(i) * 0.15)); } ctx.fillStyle = '#7fc33a'; ctx.fillRect(x - s * 0.1 + sw, y - s * 0.75, s * 0.2, s * 0.25); break; }
      case 'lava': { ctx.fillStyle = '#ff6a1a'; ctx.shadowColor = '#ff6a1a'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.ellipse(x, y, s * 0.6, s * 0.22, 0, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#ffd23f'; const b = (t * 0.7) % 1; ctx.fillRect(x - s * 0.3 + b * s * 0.5, y - s * 0.05 - b * s * 0.1, s * 0.1, s * 0.1); break; }
      case 'water': { ctx.fillStyle = 'rgba(42,125,255,0.6)'; ctx.beginPath(); ctx.ellipse(x, y, s * 0.7, s * 0.25, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(140,245,255,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = -3; i <= 3; i++) ctx.lineTo(x + i * s * 0.18, y + Math.sin(t * 4 + i) * s * 0.05); ctx.stroke(); break; }
      case 'bubble': { const b = (t * 0.5) % 1; ctx.strokeStyle = `rgba(140,245,255,${1 - b})`; ctx.beginPath(); ctx.arc(x, y - b * s * 1.2, s * 0.15 * (0.5 + b), 0, Math.PI * 2); ctx.stroke(); break; }
      case 'gold': ctx.fillStyle = '#f5c542'; ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 8; ctx.fillRect(x - s * 0.25, y - s * 0.9, s * 0.5, s * 0.9); ctx.fillStyle = '#fff0b0'; ctx.fillRect(x - s * 0.12, y - s * 0.8, s * 0.1, s * 0.5); ctx.shadowBlur = 0; ctx.fillStyle = '#1a1a1a'; ctx.fillRect(x - s * 0.15, y - s * 0.7, s * 0.1, s * 0.1); ctx.fillRect(x + s * 0.05, y - s * 0.7, s * 0.1, s * 0.1); break;
      case 'eyes': { const blink = Math.sin(t * 1.7) > 0.95 ? 0.2 : 1; ctx.fillStyle = '#ff4fa3'; ctx.shadowColor = '#ff4fa3'; ctx.shadowBlur = 8; ctx.fillRect(x - s * 0.22, y - s * 0.4, s * 0.14, s * 0.14 * blink); ctx.fillRect(x + s * 0.08, y - s * 0.4, s * 0.14, s * 0.14 * blink); ctx.shadowBlur = 0; break; }
      case 'crack': { const gl = 0.5 + 0.5 * Math.sin(t * 2.5); ctx.strokeStyle = `rgba(255,106,26,${0.4 + 0.5 * gl})`; ctx.lineWidth = 2; ctx.shadowColor = '#ff6a1a'; ctx.shadowBlur = 8 * gl; ctx.beginPath(); ctx.moveTo(x - s * 0.5, y); ctx.lineTo(x - s * 0.2, y - s * 0.15); ctx.lineTo(x, y + s * 0.05); ctx.lineTo(x + s * 0.3, y - s * 0.1); ctx.lineTo(x + s * 0.5, y + s * 0.05); ctx.stroke(); ctx.shadowBlur = 0; break; }
      default: break;
    }
  };

  // porta/marco de uma fase
  G.drawDoor = function (x, y, r, wd, state, label, boss, master, selected) {
    const ctx = this.ctx, u = this.ui;
    const w = boss ? r * 2.4 : r * 1.6, h = boss ? r * 2.6 : r * 1.9;
    const col = state === 'locked' ? '#2a2a38' : wd.color;
    // degraus
    ctx.fillStyle = state === 'locked' ? '#1c1c26' : shade(wd.color, 0.45); ctx.fillRect(x - w * 0.75, y + h * 0.5 - 2, w * 1.5, 6);
    // arco
    ctx.shadowColor = state === 'locked' ? '#000' : wd.color; ctx.shadowBlur = state === 'locked' ? 0 : (selected ? 24 : 12);
    ctx.fillStyle = col; ctx.fillRect(x - w / 2, y - h * 0.15, w, h * 0.65);
    ctx.beginPath(); ctx.arc(x, y - h * 0.15, w / 2, Math.PI, 0); ctx.fill();
    ctx.shadowBlur = 0;
    // vão escuro
    const iw = w * 0.6, ih = h * 0.55;
    ctx.fillStyle = state === 'done' ? rgba('#ffd23f', 0.75) : '#05030a';
    ctx.fillRect(x - iw / 2, y - h * 0.15 + (h * 0.65 - ih) + 2, iw, ih - 2);
    ctx.beginPath(); ctx.arc(x, y - h * 0.15 + (h * 0.65 - ih) + 2, iw / 2, Math.PI, 0); ctx.fill();
    if (state === 'done') { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(x - iw / 2 + 2, y - h * 0.15 + (h * 0.65 - ih) + 6, iw * 0.25, ih * 0.6); }
    // placa / emblema
    if (boss) {
      if (this.drawBossSprite) this.drawBossSprite(ctx, x, y - h * 0.05, r * 0.42, master ? 'master' : root.BossLooks[this.worldPage % 8], 3, { t: this.t, color: wd.color, stunned: state === 'done' });
      // tochas laterais
      this.drawDecor({ type: 'torch', size: 0.8, ph: 0 }, x - w * 0.62, y + h * 0.5, wd); this.drawDecor({ type: 'torch', size: 0.8, ph: 1.3 }, x + w * 0.62, y + h * 0.5, wd);
    } else {
      ctx.fillStyle = state === 'locked' ? '#3a3a4a' : shade(wd.color, 1.4); ctx.fillRect(x - r * 0.55, y - h * 0.15 - r * 0.2, r * 1.1, r * 0.6);
      F.text(ctx, label, x, y - h * 0.15 - r * 0.2 + r * 0.08, Math.max(1, Math.round(r / 6)), state === 'locked' ? '#777788' : '#1a1020', 'center');
    }
    // correntes quando trancada
    if (state === 'locked') {
      ctx.strokeStyle = '#8a8a9a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - w / 2, y - h * 0.05); ctx.lineTo(x + w / 2, y + h * 0.35); ctx.moveTo(x + w / 2, y - h * 0.05); ctx.lineTo(x - w / 2, y + h * 0.35); ctx.stroke();
      ctx.fillStyle = '#ff3b3b'; ctx.fillRect(x - r * 0.2, y + h * 0.1, r * 0.4, r * 0.3);
    }
  };

  G.renderLevels = function () {
    const ctx = this.ctx, u = this.ui, cx = this.W / 2;
    const wd = root.WORLDS[this.worldPage];
    const idxs = this.worldLevels(this.worldPage);
    const count = idxs.length;
    this.renderBackdrop(wd.color, 'bg-' + wd.id);
    const panelH = this.mapPanelH(), areaTop = 16 + u * 14, areaBot = this.H - panelH - 12;
    // personagem anda pelo caminho (velocidade constante em nós/s)
    const dir = Math.sign(this.sel - this.tokenProg);
    if (dir !== 0) {
      const next = this.tokenProg + dir * 1.6 / 60;
      this.tokenProg = (dir > 0 && next > this.sel) || (dir < 0 && next < this.sel) ? this.sel : next;
      if (Math.floor(this.t * 8) !== Math.floor((this.t - 1 / 60) * 8)) { const pt = this.mapPoint(this.tokenProg); this.mapDust.push({ x: pt.x, y: pt.y + u * 2, life: 0.4 }); }
    }
    // rolagem: mantém o personagem no terço inferior da área
    const tok = this.mapPoint(this.tokenProg);
    const want = areaBot - (areaBot - areaTop) * 0.35 - tok.y;
    const minScroll = areaTop + u * 12 - this.mapPoint(count - 1).y, maxScroll = areaBot - u * 10 - this.mapPoint(0).y;
    const target = clamp(want, Math.min(minScroll, maxScroll), Math.max(minScroll, maxScroll));
    this.mapScroll = this.mapScroll == null ? target : lerp(this.mapScroll, target, 0.12);
    const sy = this.mapScroll;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, areaTop - u * 2, this.W, areaBot - areaTop + u * 2); ctx.clip();
    // terreno: piso de pedra escura em ladrilhos
    const tile = u * 6;
    ctx.fillStyle = rgba(wd.color, 0.06);
    for (let yy = ((sy % tile) + tile) % tile - tile; yy < this.H; yy += tile) for (let xx = (Math.floor(yy / tile) % 2) * tile / 2 - tile; xx < this.W; xx += tile) ctx.fillRect(xx + 1, yy + 1, tile - 2, tile - 2);
    // decorações atrás do caminho
    for (const d of this.mapDecor) { const pt = this.mapPoint(d.t); const px = pt.x + d.side * d.off * u * 16, py = pt.y + sy; if (py > areaTop - 40 && py < areaBot + 40) this.drawDecor(d, clamp(px, 14, this.W - 14), py, wd); }
    // caminho de lajes de pedra
    const steps = Math.max(8, Math.round(count * 14));
    for (let k = 0; k <= steps; k++) {
      const p = (k / steps) * (count - 1);
      const pt = this.mapPoint(p), nx = this.mapPoint(Math.min(count - 1, p + 0.02));
      const ang = Math.atan2(nx.y - pt.y, nx.x - pt.x);
      const open = this.save.unlocked > idxs[Math.min(count - 1, Math.ceil(p - 0.001))];
      ctx.save(); ctx.translate(pt.x, pt.y + sy); ctx.rotate(ang);
      ctx.fillStyle = open ? shade(wd.color, 0.5) : '#1f1f2a'; ctx.fillRect(-u * 2, -u * 2.4, u * 3.4, u * 4.8);
      ctx.fillStyle = open ? shade(wd.color, 0.75) : '#2c2c3a'; ctx.fillRect(-u * 1.6, -u * 2, u * 2.6, u * 4);
      if (!open && k % 3 === 0) { ctx.fillStyle = '#8a8a9a'; ctx.fillRect(-u, -u * 0.5, u * 2, u); }
      ctx.restore();
    }
    // poeira dos passos
    for (const d of this.mapDust) { d.life -= 1 / 60; ctx.fillStyle = `rgba(200,200,220,${d.life})`; ctx.fillRect(d.x - 2 + (0.4 - d.life) * 10, d.y + sy, 3, 3); ctx.fillRect(d.x - 2 - (0.4 - d.life) * 10, d.y + sy, 3, 3); }
    this.mapDust = this.mapDust.filter((d) => d.life > 0);
    // portas das fases
    idxs.forEach((idx, i) => {
      const L = root.LEVELS[idx], pt = this.mapPoint(i), x = pt.x, y = pt.y + sy;
      if (y < areaTop - 80 || y > areaBot + 80) return;
      const unlocked = this.save.unlocked > idx, done = this.save.unlocked > idx + 1 || (this.save.best[idx] || 0) > 0;
      const boss = !!L.boss, r = boss ? u * 7 : u * 4.6, selected = i === this.sel;
      this.drawDoor(x, y, r, wd, unlocked ? (done ? 'done' : 'open') : 'locked', String(i + 1), boss, !!(L.boss && L.boss.master), selected);
      const st = this.save.stars[idx] || 0;
      if (unlocked && done) { ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 8; F.text(ctx, '*'.repeat(st) + '.'.repeat(3 - st), x, y + r * 1.2 + 4, Math.max(1, u - 1), '#ffd23f', 'center'); ctx.shadowBlur = 0; }
      if (selected) { const bob = Math.sin(this.t * 6) * u; F.text(ctx, '↓', x, y - r * 1.5 - u * 9 - bob, u, '#ffffff', 'center', { shadow: wd.color }); }
      if (!this.buttons.find((b) => b.id === 'n' + i)) this.buttons.push({ id: 'n' + i, x: x - r * 1.3, y: y - r * 1.6, w: r * 2.6, h: r * 3, fn: () => {
        if (!unlocked) { this.audio.bump(); this.toastMsg('COMPLETE A FASE ANTERIOR'); return; }
        if (this.sel === i) this.mapEnter(); else { this.sel = i; this.audio.click(); }
      } });
    });
    // personagem
    const hop = Math.abs(Math.sin(this.t * 10)) * (dir !== 0 ? u * 2.5 : u * 0.4);
    this.drawBigMask(tok.x, tok.y + sy - u * 2 - hop, u * 4.5);
    // morcegos cruzando o céu
    if (Math.random() < 0.004 && this.mapBats.length < 3) this.mapBats.push({ x: Math.random() < 0.5 ? -20 : this.W + 20, y: areaTop + Math.random() * (areaBot - areaTop) * 0.6, dir: 0, ph: Math.random() * 6 });
    for (const b of this.mapBats) { if (!b.dir) b.dir = b.x < 0 ? 1 : -1; b.x += b.dir * 90 / 60; b.y += Math.sin(this.t * 5 + b.ph) * 0.6; this.drawBat(b.x, b.y, { phase: this.t * 10 + b.ph }, false); }
    this.mapBats = this.mapBats.filter((b) => b.x > -40 && b.x < this.W + 40);
    // névoa
    ctx.fillStyle = rgba(wd.color, 0.06); for (let i = 0; i < 3; i++) { const yy = areaTop + ((this.t * 12 + i * 160) % (areaBot - areaTop)); ctx.fillRect(0, yy, this.W, u * 6); }
    ctx.restore();
    // título do mundo
    ctx.fillStyle = 'rgba(3,2,8,0.6)'; ctx.fillRect(0, 0, this.W, areaTop - 4);
    F.text(ctx, wd.name, cx, 14, u * 1.5 | 0 || u, '#ffffff', 'center', { shadow: wd.color });
    let totalStars = 0; for (const idx of idxs) totalStars += this.save.stars[idx] || 0;
    F.text(ctx, '* ' + totalStars + '/' + idxs.length * 3 + '   DESLIZE PARA ANDAR  TOQUE PARA ENTRAR', cx, 14 + u * 12, Math.max(1, u - 1), '#ffd23f', 'center');
    this.drawButton('<', 20 + u * 4, 14 + u * 5, u * 8 + 16, () => this.goto('worlds'), '#888899', 'back');
    // prévia
    this.renderPreview(idxs[this.sel], wd);
    if (this.toast) { ctx.globalAlpha = clamp(this.toast.t * 2, 0, 1); F.text(ctx, this.toast.msg, cx, this.H * 0.4, u, '#ffd23f', 'center', { shadow: '#000' }); ctx.globalAlpha = 1; this.toast.t -= 1 / 60; if (this.toast.t <= 0) this.toast = null; }
  };

  // ícones de perigo em pixel art
  G.drawHazardIcon = function (type, x, y, s) {
    const ctx = this.ctx;
    switch (type) {
      case 'spike': ctx.fillStyle = '#e8e8f0'; ctx.beginPath(); ctx.moveTo(x, y + s); ctx.lineTo(x + s / 2, y); ctx.lineTo(x + s, y + s); ctx.closePath(); ctx.fill(); break;
      case 'trap': ctx.fillStyle = '#9a9aa8'; ctx.fillRect(x, y + s * 0.6, s, s * 0.4); ctx.fillStyle = '#ffb0b0'; ctx.beginPath(); ctx.moveTo(x + s * 0.1, y + s * 0.6); ctx.lineTo(x + s * 0.3, y + s * 0.1); ctx.lineTo(x + s * 0.5, y + s * 0.6); ctx.lineTo(x + s * 0.7, y + s * 0.1); ctx.lineTo(x + s * 0.9, y + s * 0.6); ctx.closePath(); ctx.fill(); break;
      case 'bat': ctx.fillStyle = '#b04cff'; ctx.fillRect(x + s * 0.38, y + s * 0.3, s * 0.24, s * 0.4); ctx.fillRect(x, y + s * 0.35, s * 0.38, s * 0.18); ctx.fillRect(x + s * 0.62, y + s * 0.35, s * 0.38, s * 0.18); ctx.fillStyle = '#ff4040'; ctx.fillRect(x + s * 0.42, y + s * 0.38, s * 0.06, s * 0.06); ctx.fillRect(x + s * 0.52, y + s * 0.38, s * 0.06, s * 0.06); break;
      case 'arrow': ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y + s * 0.45, s * 0.7, s * 0.1); ctx.beginPath(); ctx.moveTo(x + s * 0.65, y + s * 0.25); ctx.lineTo(x + s, y + s * 0.5); ctx.lineTo(x + s * 0.65, y + s * 0.75); ctx.closePath(); ctx.fill(); break;
      case 'lava': case 'water': ctx.fillStyle = type === 'lava' ? '#ff6a1a' : '#2a7dff'; ctx.fillRect(x, y + s * 0.5, s, s * 0.5); ctx.fillStyle = type === 'lava' ? '#ffd23f' : '#8cf5ff'; for (let i = 0; i < 3; i++) ctx.fillRect(x + i * s * 0.34, y + s * 0.4 + (i % 2) * s * 0.1, s * 0.3, s * 0.1); break;
      case 'boss': ctx.fillStyle = '#5a1a2a'; ctx.fillRect(x + s * 0.1, y + s * 0.1, s * 0.8, s * 0.8); ctx.fillStyle = '#ff3b3b'; ctx.fillRect(x + s * 0.25, y + s * 0.3, s * 0.15, s * 0.15); ctx.fillRect(x + s * 0.6, y + s * 0.3, s * 0.15, s * 0.15); ctx.fillStyle = '#fff'; ctx.fillRect(x + s * 0.3, y + s * 0.65, s * 0.4, s * 0.1); break;
      default: break;
    }
  };

  G.renderPreview = function (idx, wd) {
    const ctx = this.ctx, u = this.ui, L = root.LEVELS[idx];
    const ph = this.mapPanelH(), pw = Math.min(this.W - 12, 440), px = this.W / 2 - pw / 2, py = this.H - ph - 6;
    // painel com faixa de título
    ctx.fillStyle = 'rgba(3,2,8,0.88)'; ctx.fillRect(px, py, pw, ph);
    ctx.fillStyle = rgba(wd.color, 0.35); ctx.fillRect(px, py, pw, u * 7 + 10);
    ctx.strokeStyle = wd.color; ctx.lineWidth = 2; ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
    const unlocked = this.save.unlocked > idx;
    const small = Math.max(1, u - 1);
    const title = L.boss ? (L.boss.master ? 'CHEFAO MESTRE: ' + L.boss.name : 'CHEFAO: ' + L.boss.name) : 'FASE ' + L.n + '  ' + wd.name;
    F.text(ctx, title, px + 10, py + 5, Math.min(u, Math.floor((pw - 20) / (title.length * 6))), L.boss ? '#ff3b3b' : '#ffffff', 'left');
    // miniatura
    const th = this.thumb(idx);
    const boxTop = py + u * 7 + 16, boxH = ph - (u * 7 + 16) - 8;
    const scale = Math.min((pw * 0.34) / th.width, boxH / th.height);
    const tw = th.width * scale, tht = th.height * scale;
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = unlocked ? 1 : 0.35;
    ctx.drawImage(th, px + 10, boxTop + (boxH - tht) / 2, tw, tht);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = rgba(wd.accent, 0.6); ctx.strokeRect(px + 10, boxTop + (boxH - tht) / 2, tw, tht);
    // textos à direita
    const tx = px + 24 + pw * 0.34, lineH = u * 7 + 6;
    let y = boxTop;
    if (!unlocked) { F.text(ctx, 'BLOQUEADA', tx, y, u, '#ff3b3b', 'left'); y += lineH; F.text(ctx, 'COMPLETE A FASE ANTERIOR', tx, y, small, '#888899', 'left'); return; }
    const st = this.save.stars[idx] || 0;
    ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 6;
    F.text(ctx, '*'.repeat(st), tx, y, u, '#ffd23f', 'left'); ctx.shadowBlur = 0;
    F.text(ctx, '*'.repeat(3 - st), tx + st * 6 * u, y, u, '#333344', 'left');
    F.text(ctx, this.save.best[idx] ? 'MELHOR ' + this.save.best[idx] : 'NAO JOGADA', tx + 20 * u, y + 1, small, '#aaaaaa', 'left'); y += lineH;
    // perigos com ícones
    const txt = L.rows.join('');
    const hz = [];
    const cnt = (re) => (txt.match(re) || []).length;
    if (cnt(/x/g)) hz.push(['spike', cnt(/x/g)]); if (cnt(/t/g)) hz.push(['trap', cnt(/t/g)]); if (cnt(/[bv]/g)) hz.push(['bat', cnt(/[bv]/g)]); if (cnt(/[dulr]/g)) hz.push(['arrow', cnt(/[dulr]/g)]);
    if (L.fluid) hz.push([L.fluid.type, 0]); if (L.boss) hz.push(['boss', L.boss.hp]);
    const is = u * 5;
    if (!hz.length) F.text(ctx, 'SEM PERIGOS', tx, y, small, '#7fc33a', 'left');
    hz.slice(0, 4).forEach(([type, n], i) => { const ix = tx + i * (is + 6 * small * 2.5); this.drawHazardIcon(type, ix, y, is); if (n) F.text(ctx, String(n), ix + is + 2, y + is / 2 - 3.5 * small, small, '#ffb0b0', 'left'); });
    y += is + 8;
    F.text(ctx, 'ALTURA ' + (L.rows.length - 2) + '   PAR ' + L.par + ' MOV', tx, y, small, '#888899', 'left'); y += lineH * 0.85;
    if (L.boss) { F.text(ctx, 'NUCLEO AZUL = CHEFE TONTO', tx, y, small, '#8cf5ff', 'left'); y += lineH * 0.7; F.text(ctx, 'ENTAO BATA NELE!', tx, y, small, '#8cf5ff', 'left'); }
    else if (L.fluid) F.text(ctx, L.fluid.type === 'lava' ? 'A LAVA SOBE: NAO PARE!' : 'A AGUA SOBE: NAO PARE!', tx, y, small, '#ff6a1a', 'left');
    const ready = Math.abs(this.tokenProg - this.sel) <= 0.2;
    // Pula-fase: só em fases ainda não concluídas (nunca chefes)
    const skips = (this.save.inv && this.save.inv.skip) || 0;
    if (!L.boss && this.save.unlocked <= idx + 1) this.drawButton('PULAR X' + skips, tx + u * 10 + 12, py + ph - (u * 7 + 20) / 2 - 8, u * 20 + 24, () => this.skipLevel(idx), skips > 0 ? '#7fc33a' : '#555566', 'skip');
    const bw = u * 22 + 24;
    this.drawButton(L.boss ? 'ENFRENTAR ▶' : 'JOGAR ▶', px + pw - bw / 2 - 10, py + ph - (u * 7 + 20) / 2 - 8, bw, () => this.mapEnter(), ready ? wd.color : '#555566', 'play');
  };
})(typeof self !== 'undefined' ? self : this);
