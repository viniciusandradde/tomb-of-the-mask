/*
 * boss.js — chefões: visual único por mundo, entrada cinematográfica, ataques
 * telegrafados em fases (tiros, chuva, raio, espinhos, investida, escuridão)
 * e sequência de derrota. Estende a classe Game (game.js).
 */
(function (root) {
  'use strict';
  const M = root.Maze, T = root.Maze.T, F = root.PixelFont, G = root.Game.prototype;
  const COLS = 12;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgba(h, a) { const [r, g, b] = hexToRgb(h); return `rgba(${r},${g},${b},${a})`; }
  function shade(h, f) { const [r, g, b] = hexToRgb(h).map((c) => clamp(Math.round(c * f), 0, 255)); return `rgb(${r},${g},${b})`; }

  // Aparência e repertório de ataques por mundo
  const LOOKS = ['skull', 'ghost', 'totem', 'magma', 'kraken', 'pharaoh', 'shadow', 'core'];
  const ATTACKS = [
    ['shots', 'bats'],
    ['shots', 'beam'],
    ['spikes', 'bats', 'shots'],
    ['rain', 'shots'],
    ['beam', 'bats', 'slam'],
    ['spikes', 'rain'],
    ['dark', 'beam', 'bats'],
    ['rain', 'beam', 'slam', 'spikes'],
  ];
  const MASTER_ATTACKS = ['shots', 'beam', 'rain', 'spikes', 'slam', 'bats', 'dark'];
  const ATTACK_NAMES = { shots: 'TIRO', bats: 'MORCEGOS', beam: 'RAIO', rain: 'CHUVA', spikes: 'ESPINHOS', slam: 'INVESTIDA', dark: 'ESCURIDAO' };

  G.setupBoss = function (def) {
    const rows = this.level.rows;
    const res = M.solve(rows);
    const cands = [];
    for (let y = 5; y < rows.length - 1; y++) for (let x = 1; x < COLS - 1; x++) {
      const c = rows[y][x];
      if ((c === T.DOT || c === T.EMPTY || c === T.COIN) && res.passable.has(M.key(x, y))) cands.push([x, y]);
    }
    const w = this.level.world;
    this.boss = {
      name: def.name, hp: def.hp, maxHp: def.hp, speed: def.speed, period: def.shot, batEvery: def.bats, size: def.size || 3, master: !!def.master,
      look: def.master ? 'master' : LOOKS[w % LOOKS.length], attacks: def.master ? MASTER_ATTACKS : ATTACKS[w % ATTACKS.length], attackIdx: 0,
      x: COLS / 2, y: 2.5, homeY: 2.5, dir: 1, stun: 0, hitCd: 0, timer: 2.2, coreTimer: 0.8, dead: false, deathT: 0, phase: 0, flash: 0,
      pending: null, slam: null, dark: 0, enraged: false, shakeT: 0,
    };
    this.coreCands = cands;
    this.core = null;
    this.beams = []; this.tempSpikes = [];
  };

  // --- cinemática de entrada ------------------------------------------------
  G.startBossIntro = function () {
    this.state = 'bossintro'; this.buttons = [];
    this.cine = { t: 0, dur: 3.4, kind: 'intro', roared: false };
    this.audio.stopMusic();
    if (this.kids()) this.speak('Cuidado, é o chefão ' + this.boss.name.toLowerCase() + '! Pegue a bolinha azul para deixar ele tonto, depois bata nele!');
  };
  G.skipBossIntro = function () { if (this.state === 'bossintro') this.endBossIntro(); };
  G.endBossIntro = function () {
    this.state = 'play'; this.buttons = []; this.lastFrame = performance.now() / 1000; this.cine = null;
    this.boss.y = this.boss.homeY;
    this.audio.startMusic(this.boss.master ? 9 : 8);
    this.toastMsg('PEGUE O NUCLEO AZUL!');
  };
  G.bossRoar = function () {
    if (this.save.shake) this.shake = 0.5;
    this.flash = 0.4;
    const a = this.audio;
    a.tone({ type: 'sawtooth', freq: 90, to: 45, dur: 0.7, vol: 0.5 }); a.tone({ type: 'square', freq: 60, to: 30, dur: 0.8, vol: 0.3, at: 0.05 }); a.noise({ dur: 0.5, vol: 0.3, hp: 80, lp: 1200 });
    if (navigator.vibrate) { try { navigator.vibrate([60, 40, 120]); } catch (e) { /* ignorado */ } }
  };
  G.updateBossCine = function (dt) {
    this.updateFx(dt);
    const c = this.cine; if (!c) { this.state = 'play'; return; }
    c.t += dt;
    const b = this.boss; b.phase += dt;
    if (c.kind === 'intro') {
      // câmera sobe até o corredor do chefe
      const topPad = (this.ui * 7 + 22) / this.tile;
      this.camY = lerp(this.camY, this.grid.minY - topPad, 1 - Math.exp(-3 * dt));
      // o chefe desce do teto
      b.y = lerp(-1.5, b.homeY, clamp((c.t - 0.6) / 1.0, 0, 1));
      if (c.t > 1.7 && !c.roared) { c.roared = true; this.bossRoar(); }
      if (c.t >= c.dur) this.endBossIntro();
    } else if (c.kind === 'death') {
      b.deathT = c.t;
      if (Math.floor(c.t * 8) !== Math.floor((c.t - dt) * 8) && c.t < 1.6) {
        this.burst(b.x + (Math.random() - 0.5) * b.size, b.y + (Math.random() - 0.5) * 2, 18, Math.random() < 0.5 ? '#ffffff' : this.world.color, 4);
        this.audio.noise({ dur: 0.25, vol: 0.3, hp: 200, lp: 3000 });
        if (this.save.shake) this.shake = 0.25;
      }
      if (c.t > 1.6 && !c.boom) { c.boom = true; this.flash = 1; this.burst(b.x, b.y, 80, '#ffffff', 7); this.burst(b.x, b.y, 50, '#ffd23f', 5); this.audio.death(); setTimeout(() => this.audio.win(), 400); if (this.save.shake) this.shake = 0.8; }
      if (c.t >= c.dur) {
        this.state = 'play'; this.buttons = []; this.lastFrame = performance.now() / 1000; this.cine = null;
        this.audio.startMusic(this.world.music);
        this.toastMsg('A PORTA ABRIU! VA PARA A SAIDA!');
        if (this.kids()) this.speak('Você venceu o chefão! Agora corre para a saída!');
      }
    }
  };
  G.renderBossCine = function () {
    const ctx = this.ctx, u = this.ui, c = this.cine, b = this.boss; if (!c) return;
    const W = this.W, H = this.H;
    // faixas de cinema
    const band = Math.min(H * 0.12, 90) * clamp(c.t * 3, 0, 1);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, band); ctx.fillRect(0, H - band, W, band);
    if (c.kind === 'intro') {
      if (c.t < 1.6) {
        const k = clamp(c.t / 0.3, 0, 1);
        ctx.fillStyle = rgba('#ff3b3b', 0.25 + 0.15 * Math.sin(this.t * 20)); ctx.fillRect(0, H * 0.42, W, u * 14);
        F.text(ctx, '! ALERTA !', W / 2 + (1 - k) * W, H * 0.42 + u * 3, u * 2, '#ffffff', 'center', { shadow: '#800' });
      } else {
        const k = clamp((c.t - 1.6) / 0.3, 0, 1);
        ctx.fillStyle = rgba(this.world.color, 0.35); ctx.fillRect(0, H * 0.4, W, u * 24);
        F.text(ctx, b.master ? 'CHEFAO MESTRE' : 'CHEFAO DO MUNDO', W / 2, H * 0.4 + u * 3, Math.max(1, u - 1), '#ffd23f', 'center');
        F.text(ctx, b.name, W / 2 - (1 - k) * W, H * 0.4 + u * 11, Math.min(u * 2, Math.floor((W - 20) / (b.name.length * 6))), '#ffffff', 'center', { shadow: '#000' });
        const atk = b.attacks.map((a) => ATTACK_NAMES[a]).join(' ');
        F.text(ctx, 'VIDA ' + b.maxHp + '   ' + atk, W / 2, H * 0.4 + u * 20, Math.max(1, u - 1), '#ffb0b0', 'center');
      }
      F.text(ctx, 'TOQUE PARA PULAR', W / 2, H - band / 2 - u * 3.5, Math.max(1, u - 1), '#888899', 'center');
    } else {
      if (c.t > 1.7) {
        const k = clamp((c.t - 1.7) / 0.3, 0, 1);
        ctx.fillStyle = rgba('#ffd23f', 0.3); ctx.fillRect(0, H * 0.42, W, u * 16);
        F.text(ctx, b.master ? 'VOCE ZEROU!' : 'DERROTADO!', W / 2, H * 0.42 + u * 4 - (1 - k) * 40, u * 2, '#ffffff', 'center', { shadow: '#7a3a00' });
      }
    }
  };

  // --- luta -------------------------------------------------------------------
  G.spawnCore = function () {
    const p = this.player;
    const far = this.coreCands.filter(([x, y]) => Math.abs(x - p.cx) + Math.abs(y - p.cy) >= 4 && !this.tempSpikes.some((t) => t.x === x && t.y === y));
    const pool = far.length ? far : this.coreCands;
    if (!pool.length) return;
    const [x, y] = pool[Math.floor(Math.random() * pool.length)];
    this.core = { x, y, t: 0 };
  };
  G.columnReach = function (col) { // até onde um raio/investida desce a partir do corredor
    let y = 4; while (!M.isSolid(this.grid.get(col, y)) && y < this.grid.maxY) y++; return y - 1;
  };
  G.bossHazardAt = function (x, y) {
    if (!this.boss) return false;
    if (this.tempSpikes.some((t) => t.x === x && t.y === y && t.state === 'active')) return true;
    if (this.beams.some((bm) => bm.active && bm.x === x && y >= 1 && y <= bm.endY)) return true;
    return false;
  };
  G.updateBoss = function (dt) {
    const b = this.boss, p = this.player;
    b.phase += dt;
    if (b.dead) return;
    b.flash = Math.max(0, b.flash - dt); b.hitCd = Math.max(0, b.hitCd - dt); b.shakeT = Math.max(0, b.shakeT - dt);
    if (b.dark > 0) b.dark -= dt;
    const half = b.size / 2;
    const stunned = b.stun > 0;
    if (stunned) { b.stun -= dt; if (b.stun <= 0) { b.stun = 0; this.toastMsg('ELE ACORDOU!'); } }
    const frozen = p.freeze > 0;
    const hpFrac = b.hp / b.maxHp;
    if (!b.enraged && hpFrac <= 0.5) { b.enraged = true; this.toastMsg('ELE FICOU FURIOSO!'); this.bossRoar(); }
    // investida (slam): desce pela coluna e volta
    if (b.slam) {
      const sl = b.slam; sl.t += dt;
      if (sl.t < 0.35) b.y = lerp(b.homeY, sl.endY - 0.5, sl.t / 0.35);
      else if (sl.t < 0.85) b.y = sl.endY - 0.5;
      else if (sl.t < 1.4) b.y = lerp(sl.endY - 0.5, b.homeY, (sl.t - 0.85) / 0.55);
      else { b.y = b.homeY; b.slam = null; }
      if (sl.t >= 0.35 && !sl.hit) { sl.hit = true; if (this.save.shake) this.shake = 0.3; this.audio.bump(); this.burst(b.x, b.y + 1, 20, this.world.color, 4); }
    } else if (!stunned && !frozen) {
      const sp = b.speed * (b.enraged ? 1.3 : 1) * (b.pending && b.pending.type === 'beam' ? 0 : 1);
      b.x += b.dir * sp * dt;
      if (b.x - half < 1) { b.x = 1 + half; b.dir = 1; } else if (b.x + half > COLS - 1) { b.x = COLS - 1 - half; b.dir = -1; }
    }
    // ataques telegrafados
    if (this.started && !stunned && !frozen && !b.slam) {
      if (b.pending) {
        b.pending.t -= dt;
        if (b.pending.t <= 0) { this.bossFire(b.pending); b.pending = null; }
      } else {
        b.timer -= dt;
        if (b.timer <= 0) {
          const type = b.attacks[b.attackIdx % b.attacks.length]; b.attackIdx++;
          b.timer = b.period * (0.55 + 0.45 * hpFrac);
          const col = Math.floor(b.x);
          const tel = { shots: 0.45, bats: 0.3, beam: 0.9, rain: 0.6, spikes: 0.9, slam: 0.8, dark: 0.3 }[type];
          b.pending = { type, t: tel, dur: tel, col, cols: [clamp(col - 1, 1, COLS - 2), col, clamp(col + 1, 1, COLS - 2)] };
          if (type === 'spikes') {
            const pool = this.coreCands.filter(([x, y]) => !(x === p.cx && y === p.cy) && !(this.core && this.core.x === x && this.core.y === y));
            const n = Math.min(pool.length, 3 + (b.enraged ? 2 : 0));
            b.pending.cells = [];
            for (let i = 0; i < n; i++) { const k = Math.floor(Math.random() * pool.length); b.pending.cells.push(pool.splice(k, 1)[0]); }
            for (const [x, y] of b.pending.cells) this.tempSpikes.push({ x, y, state: 'warn', t: 0 });
          }
          if (type === 'beam' || type === 'slam') b.shakeT = tel;
          this.audio.tone({ type: 'square', freq: 220, to: 330, dur: 0.12, vol: 0.12 });
        }
      }
    }
    // raios e espinhos temporários
    for (const bm of this.beams) { bm.t += dt; bm.active = bm.t < 0.6; }
    this.beams = this.beams.filter((bm) => bm.t < 0.75);
    for (const ts of this.tempSpikes) {
      ts.t += dt;
      if (ts.state === 'warn' && ts.t > 0.9) { ts.state = 'active'; ts.t = 0; }
      else if (ts.state === 'active' && ts.t > 3) { ts.state = 'out'; ts.t = 0; }
    }
    this.tempSpikes = this.tempSpikes.filter((ts) => !(ts.state === 'out' && ts.t > 0.15));
    if (!p.dead && p.invul <= 0 && this.bossHazardAt(p.cx, p.cy)) { this.die('chefao'); return; }
    // núcleo
    if (this.core) {
      this.core.t += dt;
      if (p.cx === this.core.x && p.cy === this.core.y) {
        this.core = null; b.stun = 6; b.coreTimer = 1.2; b.pending = null;
        this.audio.powerup(); this.burst(p.x, p.y, 16, '#8cf5ff', 3);
        this.toastMsg('CHEFAO TONTO! BATA NELE!');
        if (this.kids()) this.speak('Agora bate nele!');
      }
    } else if (!stunned) { b.coreTimer -= dt; if (b.coreTimer <= 0) this.spawnCore(); }
    // contato
    if (!p.dead && this.started && Math.abs(p.x - b.x) < half + 0.35 && Math.abs(p.y - b.y) < 1.5 + 0.35) {
      if (stunned && b.hitCd <= 0) {
        b.hp--; b.hitCd = 1; b.flash = 0.5; b.stun = Math.min(b.stun, 0.9);
        p.invul = Math.max(p.invul, 1.2); p.moving = false; p.queued = null;
        // recuo seguro: vai para a coluna mais próxima que tem passagem no chão
        // do corredor e desliza para o labirinto (longe do chefe, nunca em parede)
        // entre as colunas com passagem, a mais longe do chefe (e que desça pelo menos 2 células)
        let col = clamp(p.cx, 1, COLS - 2), best = -1;
        for (let x = 1; x <= COLS - 2; x++) {
          if (this.blocked(x, 4)) continue;
          let depth = 0; while (!this.blocked(x, 4 + depth) && depth < 40) depth++;
          const score = Math.abs(x - b.x) + (depth >= 2 ? 10 : 0);
          if (score > best) { best = score; col = x; }
        }
        p.invul = Math.max(p.invul, 2.0);
        p.cx = col; p.cy = 3; p.x = col + 0.5; p.y = 3.5;
        if (!this.blocked(col, 4)) this.beginMove([0, 1]);
        this.audio.shieldHit(); this.burst(b.x, b.y, 30, this.world.color, 4); this.burst(b.x, b.y, 12, '#ffffff', 3);
        if (this.save.shake) this.shake = 0.3;
        this.score += 250;
        if (b.hp <= 0) this.bossDefeated();
        else { this.toastMsg(b.hp === 1 ? 'MAIS UM GOLPE!' : 'ACERTOU! FALTAM ' + b.hp); if (this.kids()) this.speak(b.hp === 1 ? 'Mais um!' : 'Acertou!'); }
      } else if (!stunned && p.invul <= 0) this.die('chefao');
    }
  };
  G.bossFire = function (pd) {
    const b = this.boss, p = this.player;
    switch (pd.type) {
      case 'shots': this.shots.push({ x: pd.col + 0.5, y: 4.2, dx: 0, dy: 1, life: 8 }); this.audio.shoot(); break;
      case 'rain': for (const c of pd.cols) this.shots.push({ x: c + 0.5, y: 4.2, dx: 0, dy: 1, life: 8 }); this.audio.shoot(); break;
      case 'beam': this.beams.push({ x: pd.col, endY: this.columnReach(pd.col), t: 0, active: true }); this.audio.tone({ type: 'sawtooth', freq: 1200, to: 300, dur: 0.6, vol: 0.25 }); if (this.save.shake) this.shake = 0.2; break;
      case 'bats': if (this.bats.length < 7) { const spots = this.coreCands.filter(([x, y]) => y >= 5 && y <= 9 && Math.abs(y - p.cy) >= 2); if (spots.length) { const [x, y] = spots[Math.floor(Math.random() * spots.length)]; this.bats.push({ x: x + 0.5, y: y + 0.5, dx: Math.random() < 0.5 ? 1 : -1, dy: 0, phase: 0 }); this.burst(x + 0.5, y + 0.5, 8, '#b04cff', 2); } } break;
      case 'spikes': break; // já avisados; ativam sozinhos
      case 'slam': b.slam = { t: 0, endY: this.columnReach(Math.floor(b.x)), hit: false }; this.audio.tone({ type: 'square', freq: 300, to: 80, dur: 0.35, vol: 0.3 }); break;
      case 'dark': b.dark = 5; this.toastMsg('ESCURIDAO!'); this.audio.tone({ type: 'sine', freq: 400, to: 60, dur: 0.8, vol: 0.3 }); break;
      default: break;
    }
  };
  G.bossDefeated = function () {
    const b = this.boss, p = this.player;
    b.dead = true; b.deathT = 0; b.stun = 0; b.pending = null; b.slam = null; b.dark = 0;
    // o jogador para onde está (sem recuo) para assistir à derrota
    p.moving = false; p.queued = null; p.x = p.cx + 0.5; p.y = p.cy + 0.5;
    this.shots = []; this.bats = []; this.core = null; this.beams = []; this.tempSpikes = [];
    this.score += 1000;
    this.state = 'bossdeath'; this.buttons = [];
    this.cine = { t: 0, dur: 3.0, kind: 'death', boom: false };
    this.audio.stopMusic();
    if (navigator.vibrate) { try { navigator.vibrate([80, 60, 80, 60, 200]); } catch (e) { /* ignorado */ } }
  };

  // --- desenho -------------------------------------------------------------------
  // Sprite do chefe por aparência. s = tamanho de uma célula; opts: {stunned, flash, enraged, dead, t, lookX}
  G.drawBossSprite = function (ctx, cx, cy, s, look, size, opts) {
    const o = opts || {}, t = o.t || 0;
    const w = size * s * 0.9, h = s * 2.6;
    const worldCol = o.color || '#c065d8';
    const palette = {
      skull: ['#d8d8e0', '#9a9aa8'], ghost: ['#bfe9ff', '#6aa9c9'], totem: ['#9c6a3c', '#5e3d1f'], magma: ['#3a1208', '#ff6a1a'],
      kraken: ['#2a6f8a', '#1a3e55'], pharaoh: ['#f5c542', '#2a5bff'], shadow: ['#1a0a24', '#b04cff'], core: ['#7a0d0d', '#ff3b3b'], master: ['#f7f0d0', '#ffd23f'],
    }[look] || [shade(worldCol, 0.8), shade(worldCol, 0.5)];
    let body = palette[0];
    if (o.flash) body = '#ffffff'; else if (o.stunned) body = Math.floor(t * 10) % 2 ? '#dfe8ff' : '#9ad8ff'; else if (o.enraged && Math.floor(t * 6) % 2) body = shade(palette[0], 1.25);
    ctx.save(); ctx.translate(cx, cy);
    if (o.dead) { const k = clamp(1 - o.dead / 1.6, 0, 1); ctx.globalAlpha = k; ctx.scale(1 + (1 - k) * 0.5, k); }
    if (look === 'ghost') ctx.globalAlpha *= 0.85;
    const bob = Math.sin(t * 3) * s * 0.08 + (o.shake ? (Math.random() - 0.5) * s * 0.2 : 0);
    ctx.translate(o.shake ? (Math.random() - 0.5) * s * 0.2 : 0, bob);
    ctx.shadowColor = o.stunned ? '#8cf5ff' : palette[1]; ctx.shadowBlur = 18;
    // tentáculos / cauda antes do corpo
    if (look === 'kraken') {
      ctx.fillStyle = palette[0];
      for (let i = 0; i < 4; i++) { const bx = -w / 2 + (i + 0.5) * (w / 4); for (let j = 0; j < 4; j++) { const yy = h / 2 + j * s * 0.3, xx = bx + Math.sin(t * 4 + i + j * 0.8) * s * 0.18; ctx.fillRect(xx - s * 0.12, yy, s * 0.24, s * 0.3); } }
    }
    if (look === 'ghost') { // barra ondulada embaixo
      ctx.fillStyle = body; ctx.fillRect(-w / 2, -h / 2, w, h * 0.75);
      for (let i = 0; i < 5; i++) { const bx = -w / 2 + i * (w / 5); ctx.beginPath(); ctx.moveTo(bx, h * 0.25); ctx.lineTo(bx + w / 10, h / 2 + Math.sin(t * 6 + i) * s * 0.15); ctx.lineTo(bx + w / 5, h * 0.25); ctx.closePath(); ctx.fill(); }
    } else if (look === 'totem') {
      for (let i = 0; i < 3; i++) { ctx.fillStyle = i % 2 ? palette[1] : body; ctx.fillRect(-w / 2 + (i === 1 ? -s * 0.15 : 0), -h / 2 + i * (h / 3), w + (i === 1 ? s * 0.3 : 0), h / 3); }
    } else { ctx.fillStyle = body; ctx.fillRect(-w / 2, -h / 2, w, h); }
    ctx.shadowBlur = 0;
    // adornos do topo
    ctx.fillStyle = palette[1];
    if (look === 'pharaoh' || look === 'master') { // coroa / nemes
      ctx.fillRect(-w / 2 - s * 0.15, -h / 2 - s * 0.2, w + s * 0.3, s * 0.3);
      for (let i = 0; i < 5; i++) ctx.fillRect(-w / 2 + i * (w / 5) + 3, -h / 2 - s * 0.55, w / 5 - 6, s * 0.4);
      if (look === 'master') { ctx.fillStyle = '#ff3b3b'; ctx.fillRect(-s * 0.15, -h / 2 - s * 0.5, s * 0.3, s * 0.3); }
    } else if (look === 'skull' || look === 'shadow') { // chifres
      ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(-w / 2 - s * 0.35, -h / 2 - s * 0.6); ctx.lineTo(-w / 2 + s * 0.4, -h / 2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(w / 2, -h / 2); ctx.lineTo(w / 2 + s * 0.35, -h / 2 - s * 0.6); ctx.lineTo(w / 2 - s * 0.4, -h / 2); ctx.closePath(); ctx.fill();
    } else if (look === 'magma' || look === 'core') { // picos
      for (let i = 0; i < size * 2; i++) { const bx = -w / 2 + i * (w / (size * 2)); ctx.beginPath(); ctx.moveTo(bx, -h / 2); ctx.lineTo(bx + w / (size * 4), -h / 2 - s * 0.45); ctx.lineTo(bx + w / (size * 2), -h / 2); ctx.closePath(); ctx.fill(); }
    } else if (look === 'totem') { // folhas
      ctx.fillStyle = '#7fc33a'; for (let i = -2; i <= 2; i++) ctx.fillRect(i * s * 0.4 - s * 0.1, -h / 2 - s * 0.35 - Math.abs(i) * s * 0.08, s * 0.2, s * 0.35);
    } else if (look === 'kraken') { // crista
      for (let i = 0; i < 3; i++) ctx.fillRect(-s * 0.45 + i * s * 0.4, -h / 2 - s * 0.3 - (i === 1 ? s * 0.15 : 0), s * 0.2, s * 0.3 + (i === 1 ? s * 0.15 : 0));
    }
    // detalhes do corpo
    if (look === 'magma') { ctx.fillStyle = Math.floor(t * 8) % 2 ? '#ff6a1a' : '#ffd23f'; for (let i = 0; i < 4; i++) { ctx.fillRect(-w / 2 + s * 0.3 + i * (w / 4), -h * 0.1 + Math.sin(i * 2.3) * s * 0.4, s * 0.1, s * 0.6); } }
    if (look === 'core') { const r = s * (0.45 + 0.08 * Math.sin(t * 6)); ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ff3b3b'; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(0, h * 0.1, r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
    if (look === 'pharaoh') { ctx.fillStyle = '#2a5bff'; for (let i = 0; i < 3; i++) ctx.fillRect(-w / 2, -h / 2 + s * 0.2 + i * s * 0.35, w, s * 0.1); ctx.fillStyle = '#2a5bff'; ctx.fillRect(-s * 0.15, h * 0.3, s * 0.3, s * 0.5); }
    if (look === 'skull') { ctx.fillStyle = palette[1]; ctx.fillRect(-w * 0.1, -h * 0.05, w * 0.2, s * 0.35); ctx.fillRect(-w / 2 + s * 0.2, -h / 2 + s * 0.3, s * 0.1, s * 0.5); }
    // olhos (sombra tem 3 pares)
    const eyeRows = look === 'shadow' ? [[-w * 0.3, -h * 0.25], [w * 0.3, -h * 0.25], [-w * 0.15, 0], [w * 0.15, 0], [-w * 0.35, h * 0.1], [w * 0.35, h * 0.1]] : look === 'master' ? [[-w * 0.3, -h * 0.15], [w * 0.3, -h * 0.15], [0, -h * 0.35]] : [[-w * 0.3, -h * 0.12], [w * 0.3, -h * 0.12]];
    const eye = s * (look === 'shadow' ? 0.3 : 0.45), look2 = clamp((o.lookX || 0) * 0.1, -0.15, 0.15) * s;
    for (const [ex, ey] of eyeRows) {
      ctx.fillStyle = '#1a0a1a'; if (look !== 'shadow') ctx.fillRect(ex - eye / 2, ey - eye / 2, eye, eye);
      const pu = eye * 0.45;
      if (o.stunned) { ctx.strokeStyle = '#8cf5ff'; ctx.lineWidth = Math.max(2, s * 0.08); ctx.beginPath(); ctx.moveTo(ex - pu, ey - pu); ctx.lineTo(ex + pu, ey + pu); ctx.moveTo(ex + pu, ey - pu); ctx.lineTo(ex - pu, ey + pu); ctx.stroke(); }
      else { ctx.fillStyle = o.enraged ? '#ffd23f' : (look === 'ghost' ? '#2a5bff' : '#ff3b3b'); ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10; ctx.fillRect(ex - pu / 2 + look2, ey - pu / 2, pu, pu); ctx.shadowBlur = 0; }
    }
    // boca
    if (look !== 'ghost' && look !== 'core') {
      ctx.fillStyle = '#1a0a1a'; ctx.fillRect(-w * 0.3, h * 0.22, w * 0.6, s * 0.3);
      ctx.fillStyle = '#ffffff'; const teeth = look === 'skull' ? 7 : 5; for (let i = 0; i < teeth; i++) ctx.fillRect(-w * 0.3 + i * (w * 0.6 / teeth) + 2, h * 0.22, w * 0.6 / teeth - 4, s * 0.12);
    }
    ctx.restore();
  };

  G.drawBoss = function (ox, oy) {
    const ctx = this.ctx, s = this.tile, b = this.boss;
    // telegrafias: coluna do raio/tiro, investida, espinhos
    if (b.pending && (b.pending.type === 'beam' || b.pending.type === 'shots' || b.pending.type === 'rain' || b.pending.type === 'slam')) {
      const cols = b.pending.type === 'rain' ? b.pending.cols : [b.pending.col];
      const k = 1 - b.pending.t / b.pending.dur;
      for (const c of cols) {
        const endY = this.columnReach(c);
        ctx.fillStyle = rgba(b.pending.type === 'beam' || b.pending.type === 'slam' ? '#ff3b3b' : '#ffd23f', 0.12 + 0.18 * k * (Math.floor(this.t * 12) % 2));
        ctx.fillRect(ox + c * s, oy + 4 * s, s, (endY - 3) * s);
      }
    }
    for (const bm of this.beams) {
      const a = bm.active ? 0.9 : (0.75 - bm.t) / 0.15 * 0.9;
      ctx.fillStyle = rgba('#ffffff', a); ctx.shadowColor = '#ff3b3b'; ctx.shadowBlur = 24;
      const wdt = s * (bm.active ? 0.5 + 0.2 * Math.sin(this.t * 40) : 0.2);
      ctx.fillRect(ox + (bm.x + 0.5) * s - wdt / 2, oy + 1 * s, wdt, (bm.endY) * s);
      ctx.shadowBlur = 0;
      ctx.fillStyle = rgba('#ff3b3b', a * 0.5); ctx.fillRect(ox + bm.x * s, oy + 1 * s, s, bm.endY * s);
    }
    for (const ts of this.tempSpikes) {
      const ext = ts.state === 'warn' ? 0.18 : ts.state === 'active' ? 1 : 1 - ts.t / 0.15;
      this.drawSpike(ox + ts.x * s, oy + ts.y * s, ts.x, ts.y, ext, ts.state === 'warn', true);
    }
    if (b.dead && b.deathT > 1.6) return;
    this.drawBossSprite(ctx, ox + b.x * s, oy + b.y * s, s, b.look, b.size, {
      t: b.phase, stunned: b.stun > 0, flash: b.flash > 0 && Math.floor(this.t * 30) % 2 === 0, enraged: b.enraged, dead: b.dead ? b.deathT : 0,
      shake: b.shakeT > 0, lookX: this.player.x - b.x, color: this.world.color,
    });
    // núcleo de energia
    if (this.core) {
      const k = s * (0.3 + 0.08 * Math.sin(this.core.t * 8));
      const px = ox + (this.core.x + 0.5) * s, py = oy + (this.core.y + 0.5) * s;
      ctx.shadowColor = '#8cf5ff'; ctx.shadowBlur = 16; ctx.fillStyle = '#8cf5ff';
      ctx.beginPath(); ctx.arc(px, py, k, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(px - k * 0.3, py - k * 0.3, k * 0.35, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = rgba('#8cf5ff', 0.5 - 0.4 * ((this.core.t * 1.5) % 1)); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, py, k + s * 0.6 * ((this.core.t * 1.5) % 1), 0, Math.PI * 2); ctx.stroke();
      // seta apontando para o núcleo quando está fora da tela
      const sy = py - 0;
      if (sy < 0 || sy > this.H) { F.text(ctx, '↓', px, sy < 0 ? this.ui * 20 : this.H - this.ui * 30, this.ui, '#8cf5ff', 'center'); }
    }
  };
  G.drawBossHud = function () {
    const ctx = this.ctx, u = this.ui, b = this.boss;
    // escuridão
    if (b.dark > 0) {
      const p = this.player, s = this.tile, ox = this.ox, oy = -this.camY * s;
      const a = clamp(b.dark, 0, 1) * 0.92;
      ctx.save();
      const g = ctx.createRadialGradient(ox + p.x * s, oy + p.y * s, s * 1.2, ox + p.x * s, oy + p.y * s, s * 4.5);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, this.W, this.H);
      // o chefe brilha no escuro
      const g2 = ctx.createRadialGradient(ox + b.x * s, oy + b.y * s, s, ox + b.x * s, oy + b.y * s, s * 3);
      g2.addColorStop(0, rgba(this.world.color, 0.35)); g2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g2; ctx.fillRect(0, 0, this.W, this.H);
      ctx.restore();
    }
    const y = this.H - (u * 7 + 18) - 14 - u * 8;
    const w = Math.min(this.W * 0.7, 300), x = this.W / 2 - w / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(x - 6, y - 4, w + 12, u * 7 + 18);
    F.text(ctx, b.name + (b.enraged ? '  FURIOSO' : ''), this.W / 2, y, Math.max(1, u - 1), b.enraged ? '#ffd23f' : (b.master ? '#ffffff' : this.world.accent), 'center');
    const by = y + u * 7 + 2, bh = 8;
    ctx.fillStyle = '#331111'; ctx.fillRect(x, by, w, bh);
    const seg = w / b.maxHp;
    for (let i = 0; i < b.hp; i++) { ctx.fillStyle = b.stun > 0 ? '#8cf5ff' : (b.enraged ? '#ffd23f' : '#ff3b3b'); ctx.fillRect(x + i * seg + 1, by + 1, seg - 2, bh - 2); }
    if (b.stun > 0) F.text(ctx, 'TONTO ' + Math.ceil(b.stun) + '  BATA NELE!', this.W / 2, by + bh + 4, Math.max(1, u - 1), '#8cf5ff', 'center');
    else if (b.pending) F.text(ctx, '! ' + ATTACK_NAMES[b.pending.type] + ' !', this.W / 2, by + bh + 4, Math.max(1, u - 1), '#ff3b3b', 'center');
  };

  root.BossLooks = LOOKS;
})(typeof self !== 'undefined' ? self : this);
