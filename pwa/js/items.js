/*
 * items.js — sistema de itens inspirado no original: power-ups (Escudo manual,
 * Ímã, Congelar, Viciado em Moedas, Multiplicador), máscaras com bônus
 * percentuais e imunidades, melhorias na loja, baús e Pula-fase.
 * Estende a classe Game (game.js).
 */
(function (root) {
  'use strict';
  const F = root.PixelFont, G = root.Game.prototype;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgba(h, a) { const [r, g, b] = hexToRgb(h); return `rgba(${r},${g},${b},${a})`; }

  // Máscaras: bônus em % (coin = moedas ganhas; magnet/freeze/addict/boost = duração)
  const MASKS = [
    { id: 'classica', name: 'CLASSICA', color: '#ffd23f', eye: '#1a1a1a', cost: 0, level: 1, desc: 'A MASCARA ORIGINAL' },
    { id: 'gatinho', name: 'GATINHO', color: '#ffb3dc', eye: '#3a1030', cost: 300, level: 8, coin: 10, magnet: 25, desc: '+10% MOEDAS  +25% IMA' },
    { id: 'pirata', name: 'PIRATA', color: '#c0392b', eye: '#1a1a1a', cost: 450, level: 10, coin: 15, immune: 'bat', desc: '+15% MOEDAS  IMUNE A MORCEGOS' },
    { id: 'coelho', name: 'COELHO', color: '#f0f0f0', eye: '#ff4fa3', cost: 500, level: 12, coin: 15, freeze: 30, desc: '+15% MOEDAS  +30% CONGELAR' },
    { id: 'cachorro', name: 'CACHORRO', color: '#b5742a', eye: '#1a1a1a', cost: 600, level: 1, coin: 10, immune: 'arrow', desc: '+10% MOEDAS  IMUNE A FLECHAS' },
    { id: 'palhaco', name: 'PALHACO', color: '#7fc33a', eye: '#1a1a1a', cost: 700, level: 14, freeze: 20, magnet: 20, desc: '+20% CONGELAR  +20% IMA' },
    { id: 'caveira', name: 'CAVEIRA', color: '#d8d8e0', eye: '#05030a', cost: 900, level: 17, coin: 25, freeze: 25, addict: 30, desc: '+25% MOEDAS +25% CONG. +30% VIC.' },
    { id: 'vodu', name: 'VODU', color: '#5e2a8a', eye: '#8cf5ff', cost: 1200, level: 20, coin: 35, freeze: 35, addict: 40, desc: '+35% MOEDAS +35% CONG. +40% VIC.' },
    { id: 'cavaleiro', name: 'CAVALEIRO', color: '#8fa3b8', eye: '#1a1a1a', cost: 1500, level: 1, extraCoins: 2, desc: '+2 MOEDAS EXTRAS EM CADA FASE' },
    { id: 'fantasma', name: 'FANTASMA', color: '#8cf5ff', eye: '#0a2a33', cost: 1600, level: 30, permaMagnet: true, desc: 'IMA DE PONTOS PERMANENTE' },
    { id: 'rei', name: 'REI', color: '#f5c542', eye: '#4a3a00', cost: 2000, level: 40, coin: 100, boost: 30, desc: 'MOEDAS X2  +30% MULTIPLICADOR' },
    { id: 'sombra', name: 'SOMBRA', color: '#b04cff', eye: '#eaffff', cost: 2500, level: 50, slowBats: true, immune: 'trap', desc: 'MORCEGOS LENTOS  IMUNE A ESP. MOVEIS' },
    { id: 'mestre', name: 'MESTRE', color: '#ffffff', eye: '#ff3b3b', cost: 0, level: 81, zerou: true, coin: 50, magnet: 50, freeze: 50, addict: 50, boost: 50, startShield: true, desc: 'ZEROU: +50% EM TUDO E ESCUDO INICIAL' },
  ];
  root.MASKS = MASKS;

  // Power-ups melhoráveis: duração base e por nível (3 níveis), custo por nível
  const POWERS = [
    { id: 'magnet', name: 'IMA', color: '#ff4fa3', base: 10, perLevel: 3, desc: 'PUXA PONTOS E MOEDAS PROXIMOS' },
    { id: 'freeze', name: 'CONGELAR', color: '#9ad8ff', base: 6, perLevel: 2, desc: 'PARA INIMIGOS E ARMADILHAS' },
    { id: 'addict', name: 'VICIADO EM MOEDAS', color: '#ffd23f', base: 8, perLevel: 2.5, desc: 'PONTOS VIRAM MOEDAS DE OURO' },
    { id: 'boost', name: 'MULTIPLICADOR', color: '#ff7a3d', base: 10, perLevel: 3, desc: 'PONTOS X2 (X3 NO NIVEL 3)' },
  ];
  const UP_COST = [150, 300, 600];
  const SHIELD_COST = 60, SKIP_COST = 250;

  G.mask = function () { return MASKS.find((m) => m.id === this.save.mask) || MASKS[0]; };
  G.bonus = function (kind) { const m = this.mask(); return 1 + ((m[kind] || 0) / 100); };
  G.duration = function (id) {
    const pw = POWERS.find((q) => q.id === id); const lvl = (this.save.up && this.save.up[id]) || 0;
    return (pw.base + pw.perLevel * lvl) * this.bonus(id);
  };
  G.boostMult = function () { return ((this.save.up && this.save.up.boost) || 0) >= 3 ? 3 : 2; };
  G.immune = function (kind) { return this.mask().immune === kind; };
  G.maskUnlocked = function (m) {
    if (m.zerou) return !!this.save.zerou;
    return this.save.unlocked >= m.level;
  };

  // Escudo manual: toque duplo (ou tecla E) consome um escudo do inventário
  G.useShield = function () {
    const p = this.player; if (!p || this.state !== 'play') return;
    if (p.shield > 0) { this.toastMsg('ESCUDO JA ATIVO'); return; }
    if (!this.save.inv || this.save.inv.shield <= 0) { this.audio.bump(); this.toastMsg('SEM ESCUDOS. COMPRE NA LOJA'); return; }
    this.save.inv.shield--; p.shield = 1; this.audio.powerup(); this.burst(p.x, p.y, 14, '#8cf5ff', 2.5); this.toastMsg('ESCUDO ATIVADO!');
    try { localStorage.setItem('tumba-da-mascara-save-v1', JSON.stringify(this.save)); } catch (e) { /* ignorado */ }
    if (this.kids()) this.speak('Escudo ligado!');
  };

  // moedas extras (Cavaleiro): transforma pontos em moedas no início da fase
  const origSetupGrid = G.setupGrid;
  G.setupGrid = function (rows, fluid) {
    origSetupGrid.call(this, rows, fluid);
    const extra = this.mask().extraCoins || 0;
    if (extra && this.mode === 'stage') {
      const cands = [];
      for (let y = this.grid.minY; y <= this.grid.maxY; y++) for (let x = 0; x < 12; x++) if (this.grid.get(x, y) === '.') cands.push([x, y]);
      for (let i = 0; i < extra && cands.length; i++) { const k = Math.floor(Math.random() * cands.length); const [x, y] = cands.splice(k, 1)[0]; this.grid.set(x, y, '*'); this.dotsLeft--; }
    }
  };

  // HUD de itens: poderes ativos (barras) e inventário de escudos
  G.drawItemsHud = function () {
    const ctx = this.ctx, u = this.ui, p = this.player, pad = 8;
    const small = Math.max(1, u - 1);
    let y = this.H - u * 7 - pad - 10 - (u * 7 + 18) - (this.boss && !this.boss.dead ? u * 7 + 34 : 0);
    const active = [];
    if (p.freeze > 0) active.push(['CONGELADO', p.freeze, this.duration('freeze'), '#9ad8ff']);
    if (p.magnet > 0 && p.magnet !== Infinity) active.push(['IMA', p.magnet, this.duration('magnet'), '#ff4fa3']);
    if (p.addict > 0) active.push(['VICIADO EM MOEDAS', p.addict, this.duration('addict'), '#ffd23f']);
    if (p.boost > 0) active.push(['PONTOS X' + this.boostMult(), p.boost, this.duration('boost'), '#ff7a3d']);
    for (const [label, left, total, col] of active) {
      const w = Math.min(this.W * 0.6, 240), x = this.W / 2 - w / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - 4, y - 4, w + 8, small * 7 + 12);
      F.text(ctx, label + ' ' + Math.ceil(left), this.W / 2, y, small, col, 'center');
      ctx.fillStyle = rgba(col, 0.3); ctx.fillRect(x, y + small * 7 + 2, w, 4);
      ctx.fillStyle = col; ctx.fillRect(x, y + small * 7 + 2, w * clamp(left / total, 0, 1), 4);
      y -= small * 7 + 16;
    }
    // escudos no inventário (canto inferior esquerdo)
    const n = (this.save.inv && this.save.inv.shield) || 0;
    const bx = pad, by = this.H - u * 7 - pad - 10;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(bx - 4, by - 6, u * 26, u * 7 + 14);
    ctx.strokeStyle = n > 0 ? '#8cf5ff' : '#555566'; ctx.lineWidth = 2; ctx.strokeRect(bx, by - 2, u * 6, u * 6);
    F.text(ctx, String(n), bx + u * 3, by + u * 0.5, u, n > 0 ? '#8cf5ff' : '#555566', 'center');
    F.text(ctx, p.shield > 0 ? 'ESCUDO ATIVO' : '2X TOQUE = ESCUDO', bx + u * 7, by + 1, small, n > 0 || p.shield > 0 ? '#ffffff' : '#555566', 'left');
    if (!this.buttons.find((b) => b.id === 'shieldbtn')) this.buttons.push({ id: 'shieldbtn', x: bx - 4, y: by - 6, w: u * 26, h: u * 7 + 14, fn: () => this.useShield() });
  };

  // Baú: recompensa ao completar uma fase (melhor com 3 estrelas; uma vez por fase)
  G.rollChest = function (idx, stars) {
    this.save.chests = this.save.chests || {};
    if (this.save.chests[idx]) return null;
    if (stars < 2 && Math.random() > 0.35) return null;
    this.save.chests[idx] = 1;
    const r = Math.random();
    let reward;
    if (stars === 3 && r < 0.3) reward = { type: 'shield', n: 1, label: '+1 ESCUDO' };
    else if (stars === 3 && r < 0.4 && idx % 5 === 4) reward = { type: 'skip', n: 1, label: '+1 PULA-FASE' };
    else { const n = 15 + Math.floor(Math.random() * 25) + stars * 10; reward = { type: 'coins', n, label: '+' + n + ' $' }; }
    if (reward.type === 'coins') this.save.coins += reward.n;
    else this.save.inv[reward.type] = (this.save.inv[reward.type] || 0) + reward.n;
    this.audio.coin();
    return reward;
  };
  G.drawChest = function (cx, y) {
    const ctx = this.ctx, u = this.ui, k = clamp((this.t - this.winAt - 1.2) * 2, 0, 1);
    if (k <= 0) return;
    const w = u * 10, h = u * 7;
    ctx.save(); ctx.translate(cx, y + h / 2); ctx.scale(1, k);
    ctx.fillStyle = '#7a4a1a'; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = '#f5c542'; ctx.fillRect(-w / 2, -h / 2, w, h * 0.2); ctx.fillRect(-u, -h * 0.1, u * 2, h * 0.3);
    ctx.restore();
    if (k >= 1) { ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 10; F.text(ctx, 'BAU: ' + this.chest.label, cx, y + h + 4, Math.max(1, u - 1), '#ffd23f', 'center'); ctx.shadowBlur = 0; }
  };

  // Pula-fase: marca a fase como concluída (sem estrelas) e libera a próxima
  G.skipLevel = function (idx) {
    if (!this.save.inv || this.save.inv.skip <= 0) { this.audio.bump(); this.toastMsg('SEM PULA-FASE. COMPRE NA LOJA'); return; }
    if (this.save.unlocked > idx + 1) { this.toastMsg('ESSA FASE JA FOI CONCLUIDA'); return; }
    this.save.inv.skip--; this.save.unlocked = Math.max(this.save.unlocked, idx + 2); this.save.best[idx] = this.save.best[idx] || 1;
    try { localStorage.setItem('tumba-da-mascara-save-v1', JSON.stringify(this.save)); } catch (e) { /* ignorado */ }
    this.audio.powerup(); this.toastMsg('FASE PULADA!'); this.buttons = [];
    if (this.kids()) this.speak('Fase pulada! Vamos para a próxima.');
    this.mapInit && this.mapInit();
  };

  // ------------------------------------------------------------------ loja
  G.renderShop = function () {
    const ctx = this.ctx, u = this.ui, cx = this.W / 2, small = Math.max(1, u - 1);
    this.shopTab = this.shopTab || 'masks'; this.shopPage = this.shopPage || 0;
    this.renderBackdrop('#ffd23f', 'bg-templo');
    F.text(ctx, 'LOJA', cx, 12, u * 1.5 | 0 || u, '#ffffff', 'center', { shadow: '#7a3a00' });
    F.text(ctx, 'VOCE TEM $' + this.save.coins, cx, 12 + u * 12, u, '#ffd23f', 'center');
    // abas
    const tabs = [['masks', 'MASCARAS'], ['powers', 'PODERES'], ['items', 'ITENS']];
    const tw = Math.min(this.W - 20, 400) / 3, tx0 = cx - tw * 1.5, ty = 12 + u * 22;
    tabs.forEach(([id, label], i) => {
      const on = this.shopTab === id;
      ctx.fillStyle = on ? rgba('#ffd23f', 0.35) : 'rgba(0,0,0,0.5)'; ctx.fillRect(tx0 + i * tw, ty, tw - 4, u * 7 + 12);
      ctx.strokeStyle = on ? '#ffd23f' : '#555566'; ctx.lineWidth = 2; ctx.strokeRect(tx0 + i * tw + 1, ty + 1, tw - 6, u * 7 + 10);
      F.text(ctx, label, tx0 + i * tw + (tw - 4) / 2, ty + 6, small, on ? '#ffffff' : '#888899', 'center');
      if (!this.buttons.find((b) => b.id === 'tab' + id)) this.buttons.push({ id: 'tab' + id, x: tx0 + i * tw, y: ty, w: tw - 4, h: u * 7 + 12, fn: () => { this.shopTab = id; this.shopPage = 0; this.buttons = []; } });
    });
    const top = ty + u * 7 + 24, bottom = this.H - u * 7 - 40;
    if (this.shopTab === 'masks') this.renderShopMasks(top, bottom);
    else if (this.shopTab === 'powers') this.renderShopPowers(top, bottom);
    else this.renderShopItems(top, bottom);
    this.drawButton('< VOLTAR', cx, this.H - u * 7 - 14, Math.min(this.W * 0.6, 220), () => this.goto('title'), '#888899', 'back');
    if (this.toast) { ctx.globalAlpha = clamp(this.toast.t * 2, 0, 1); F.text(ctx, this.toast.msg, cx, this.H * 0.5, u, '#ffd23f', 'center', { shadow: '#000' }); ctx.globalAlpha = 1; this.toast.t -= 1 / 60; if (this.toast.t <= 0) this.toast = null; }
  };
  G.saveNow = function () { try { localStorage.setItem('tumba-da-mascara-save-v1', JSON.stringify(this.save)); } catch (e) { /* ignorado */ } };
  G.renderShopMasks = function (top, bottom) {
    const ctx = this.ctx, u = this.ui, cx = this.W / 2, small = Math.max(1, u - 1);
    const w = Math.min(this.W * 0.92, 420), h = u * 7 + 34;
    const perPage = Math.max(3, Math.floor((bottom - top - 30) / (h + 6)));
    const pages = Math.ceil(MASKS.length / perPage);
    this.shopPage = clamp(this.shopPage, 0, pages - 1);
    const list = MASKS.slice(this.shopPage * perPage, this.shopPage * perPage + perPage);
    list.forEach((m, i) => {
      const owned = this.save.masks.includes(m.id), equipped = this.save.mask === m.id, unlocked = this.maskUnlocked(m);
      const y = top + i * (h + 6), x = cx - w / 2;
      ctx.fillStyle = rgba(m.color, equipped ? 0.3 : 0.1); ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = equipped ? '#ffffff' : (unlocked ? m.color : '#333344'); ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      const saveMask = this.save.mask; this.save.mask = m.id; ctx.globalAlpha = unlocked ? 1 : 0.4; this.drawBigMask(x + 10 + h * 0.3, y + h / 2, h * 0.5); ctx.globalAlpha = 1; this.save.mask = saveMask;
      F.text(ctx, m.name, x + h * 0.6 + 20, y + 7, u, unlocked ? '#ffffff' : '#777788', 'left');
      F.text(ctx, m.desc, x + h * 0.6 + 20, y + 7 + u * 8, small, unlocked ? '#aaaaaa' : '#666677', 'left');
      let tag, col;
      if (equipped) { tag = 'EM USO'; col = '#8cf5ff'; }
      else if (owned) { tag = 'USAR'; col = '#ffffff'; }
      else if (!unlocked) { tag = m.zerou ? 'ZERE O JOGO' : 'NIVEL ' + m.level; col = '#ff3b3b'; }
      else { tag = m.cost ? '$' + m.cost : 'GRATIS'; col = this.save.coins >= m.cost ? '#ffd23f' : '#ff3b3b'; }
      F.text(ctx, tag, x + w - 10, y + h / 2 - u * 3.5, u, col, 'right');
      if (!this.buttons.find((b) => b.id === 'm' + m.id)) this.buttons.push({ id: 'm' + m.id, x, y, w, h, fn: () => {
        if (owned) { this.save.mask = m.id; this.saveNow(); this.buttons = []; this.sprites = {}; return; }
        if (!unlocked) { this.audio.bump(); this.toastMsg(m.zerou ? 'VENCA O CHEFAO MESTRE' : 'CHEGUE A FASE ' + m.level); return; }
        if (this.save.coins >= m.cost) { this.save.coins -= m.cost; this.save.masks.push(m.id); this.save.mask = m.id; this.saveNow(); this.audio.buy(); this.buttons = []; this.sprites = {}; this.toastMsg('NOVA MASCARA!'); if (this.kids()) this.speak('Máscara nova!'); }
        else { this.audio.bump(); this.toastMsg('FALTAM $' + (m.cost - this.save.coins)); }
      } });
    });
    if (pages > 1) {
      F.text(ctx, (this.shopPage + 1) + '/' + pages, cx, bottom - u * 7, small, '#888899', 'center');
      this.drawButton('<', cx - u * 12, bottom - u * 3.5, u * 8 + 10, () => { this.shopPage = (this.shopPage + pages - 1) % pages; this.buttons = []; }, '#888899', 'pgl');
      this.drawButton('>', cx + u * 12, bottom - u * 3.5, u * 8 + 10, () => { this.shopPage = (this.shopPage + 1) % pages; this.buttons = []; }, '#888899', 'pgr');
    }
  };
  G.renderShopPowers = function (top, bottom) {
    const ctx = this.ctx, u = this.ui, cx = this.W / 2, small = Math.max(1, u - 1);
    const w = Math.min(this.W * 0.92, 420), h = Math.min(u * 7 + 44, (bottom - top) / POWERS.length - 6);
    F.text(ctx, 'MELHORE A DURACAO DOS PODERES', cx, top - 2, small, '#aaaaaa', 'center');
    POWERS.forEach((pw, i) => {
      const lvl = this.save.up[pw.id] || 0, y = top + 10 + i * (h + 6), x = cx - w / 2;
      ctx.fillStyle = rgba(pw.color, 0.12); ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = pw.color; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      const saveTile = this.tile; this.tile = u * 7; this.drawPowerup(x + 10, y + h / 2 - u * 3.5, pw.color, { magnet: 'U', freeze: '*', addict: '$', boost: 'X' }[pw.id], 0.5); this.tile = saveTile;
      F.text(ctx, pw.name, x + u * 10 + 12, y + 7, u, '#ffffff', 'left');
      F.text(ctx, pw.desc, x + u * 10 + 12, y + 7 + u * 8, small, '#aaaaaa', 'left');
      F.text(ctx, 'DURACAO ' + this.duration(pw.id).toFixed(0) + 'S', x + u * 10 + 12, y + 7 + u * 8 + small * 8, small, pw.color, 'left');
      // níveis
      for (let k = 0; k < 3; k++) { ctx.fillStyle = k < lvl ? pw.color : '#333344'; ctx.fillRect(x + w - 10 - (3 - k) * (u * 3 + 3), y + 8, u * 3, u * 2); }
      const tag = lvl >= 3 ? 'MAXIMO' : '$' + UP_COST[lvl];
      F.text(ctx, tag, x + w - 10, y + h - u * 7 - 6, u, lvl >= 3 ? '#7fc33a' : (this.save.coins >= UP_COST[lvl] ? '#ffd23f' : '#ff3b3b'), 'right');
      if (!this.buttons.find((b) => b.id === 'p' + pw.id)) this.buttons.push({ id: 'p' + pw.id, x, y, w, h, fn: () => {
        if (lvl >= 3) { this.toastMsg('JA ESTA NO MAXIMO'); return; }
        if (this.save.coins >= UP_COST[lvl]) { this.save.coins -= UP_COST[lvl]; this.save.up[pw.id] = lvl + 1; this.saveNow(); this.audio.buy(); this.buttons = []; this.toastMsg(pw.name + ' NIVEL ' + (lvl + 1) + '!'); }
        else { this.audio.bump(); this.toastMsg('FALTAM $' + (UP_COST[lvl] - this.save.coins)); }
      } });
    });
  };
  G.renderShopItems = function (top, bottom) {
    const ctx = this.ctx, u = this.ui, cx = this.W / 2, small = Math.max(1, u - 1);
    const w = Math.min(this.W * 0.92, 420), h = u * 7 + 50;
    const items = [
      { id: 'shield', name: 'ESCUDO', color: '#8cf5ff', cost: SHIELD_COST, desc: ['PROTEGE DE UM GOLPE.', 'ATIVE COM 2 TOQUES NA TELA (OU TECLA E).'] },
      { id: 'skip', name: 'PULA-FASE', color: '#7fc33a', cost: SKIP_COST, desc: ['PULA UMA FASE DIFICIL (SEM ESTRELAS).', 'USE NO MAPA, NA PREVIA DA FASE.'] },
    ];
    items.forEach((it, i) => {
      const n = this.save.inv[it.id] || 0, y = top + i * (h + 8), x = cx - w / 2;
      ctx.fillStyle = rgba(it.color, 0.12); ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = it.color; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      F.text(ctx, it.name + '  X' + n, x + 10, y + 8, u, '#ffffff', 'left');
      F.text(ctx, it.desc[0], x + 10, y + 8 + u * 8, small, '#aaaaaa', 'left');
      F.text(ctx, it.desc[1], x + 10, y + 8 + u * 8 + small * 8, small, '#aaaaaa', 'left');
      F.text(ctx, 'COMPRAR $' + it.cost, x + w - 10, y + h - u * 7 - 8, u, this.save.coins >= it.cost ? '#ffd23f' : '#ff3b3b', 'right');
      if (!this.buttons.find((b) => b.id === 'i' + it.id)) this.buttons.push({ id: 'i' + it.id, x, y, w, h, fn: () => {
        if (this.save.coins >= it.cost) { this.save.coins -= it.cost; this.save.inv[it.id] = n + 1; this.saveNow(); this.audio.buy(); this.buttons = []; this.toastMsg(it.name + ' +1'); }
        else { this.audio.bump(); this.toastMsg('FALTAM $' + (it.cost - this.save.coins)); }
      } });
    });
    F.text(ctx, 'BAUS: COMPLETE FASES (3 ESTRELAS DAO MAIS)', cx, top + items.length * (h + 8) + 10, small, '#ffd23f', 'center');
    F.text(ctx, 'ELES DAO MOEDAS, ESCUDOS E PULA-FASES', cx, top + items.length * (h + 8) + 10 + small * 9, small, '#aaaaaa', 'center');
  };
})(typeof self !== 'undefined' ? self : this);
