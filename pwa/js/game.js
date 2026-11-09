/*
 * game.js — motor do jogo: física de deslize, inimigos, armadilhas, lava,
 * renderização em canvas, HUD, menus, modo arcade, salvamento.
 */
(function (root) {
  'use strict';
  const M = root.Maze, T = root.Maze.T, F = root.PixelFont;

  // ------------------------------------------------------------ utilidades
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgba(h, a) { const [r, g, b] = hexToRgb(h); return `rgba(${r},${g},${b},${a})`; }
  function shade(h, f) { const [r, g, b] = hexToRgb(h).map((c) => clamp(Math.round(c * f), 0, 255)); return `rgb(${r},${g},${b})`; }
  const now = () => performance.now() / 1000;

  const SPEED = 18;         // células por segundo (jogador) — parte já em velocidade máxima
  // "Game feel" do deslize (valores em células e segundos)
  const FX = {
    trailStep: 0.14,   // a cada quantas células nasce uma cópia (afterimage) do sprite
    trailLife: 0.16,   // s de vida de cada cópia
    trailMax: 12,      // máximo de cópias vivas
    trailAlpha: 0.55,  // alfa inicial da cópia (somado com 'lighter' = brilho)
    stretch: 0.22,     // alongamento no eixo do movimento (22%)
    stretchIn: 0.05,   // s para o alongamento chegar ao máximo
    squash: 0.38,      // achatamento máximo contra a parede (38%)
    squashDur: 0.13,   // s de duração do achatamento
    shakeDur: 0.07,    // s de tremor ao bater
    shakeAmp: 5,       // px de amplitude do tremor ao bater
    hitStop: 0.03,     // s de "hit-stop" ao bater (~2 quadros a 60 fps)
    camLead: 1.4,      // células de avanço da câmera na direção do movimento
    camRate: 9,        // rapidez da câmera (1/s); maior = mais colada
    dust: 7,           // partículas de poeira por batida
    dustSpeed: 3.5,    // células/s da poeira
  };
  const BAT_SPEED = 3.2;    // células por segundo
  const SHOT_SPEED = 9;
  const SHOT_PERIOD = 2.2;
  const COLS = 12;
  // Modo lúdico (para crianças): só muda a forma de comunicar, nunca a dificuldade.
  const ELOGIOS = ['Muito bem!', 'Você conseguiu!', 'Incrível!', 'Que demais!', 'Parabéns, campeão!', 'Uau, mandou bem!'];
  const ANIMOS = ['Opa! Tente de novo.', 'Quase! Vamos de novo.', 'Tudo bem, tenta mais uma vez!', 'Cuidado com isso! Vamos lá.', 'Você está quase lá!'];
  const COMBOS = ['LEGAL!', 'UAU!', 'SHOW!', 'ISSO!', 'DEMAIS!'];

  const MASKS = [
    { id: 'classica', name: 'CLASSICA', color: '#ffd23f', eye: '#1a1a1a', cost: 0, perk: 'A MASCARA ORIGINAL', perkId: null },
    { id: 'fantasma', name: 'FANTASMA', color: '#8cf5ff', eye: '#0a2a33', cost: 300, perk: 'IMA DE PONTOS PERMANENTE', perkId: 'magnet' },
    { id: 'tiki', name: 'TIKI', color: '#ff7a3d', eye: '#3a1200', cost: 600, perk: 'COMECA COM ESCUDO', perkId: 'shield' },
    { id: 'rei', name: 'REI', color: '#f0f0f0', eye: '#4a3a00', cost: 1000, perk: 'MOEDAS VALEM DOBRO', perkId: 'coins2x' },
    { id: 'sombra', name: 'SOMBRA', color: '#b04cff', eye: '#eaffff', cost: 1500, perk: 'MORCEGOS MAIS LENTOS', perkId: 'slowbats' },
  ];

  // ------------------------------------------------------------ salvamento
  const SAVE_KEY = 'tumba-da-mascara-save-v1';
  const Save = {
    data: null,
    load() {
      try { this.data = JSON.parse(localStorage.getItem(SAVE_KEY)) || null; } catch (e) { this.data = null; }
      this.data = Object.assign({ unlocked: 1, stars: {}, best: {}, coins: 0, masks: ['classica'], mask: 'classica', arcadeBest: 0, sfx: true, music: true, crt: true, shake: true, kids: true, voice: true, hints: false, inv: { shield: 1, skip: 0 }, up: { magnet: 0, freeze: 0, addict: 0, boost: 0 }, chests: {} }, this.data || {});
      // migração: campos novos em saves antigos
      this.data.inv = Object.assign({ shield: 1, skip: 0 }, this.data.inv || {});
      this.data.up = Object.assign({ magnet: 0, freeze: 0, addict: 0, boost: 0 }, this.data.up || {});
      this.data.chests = this.data.chests || {};
      return this.data;
    },
    write() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch (e) { /* armazenamento indisponível */ } },
  };

  // ------------------------------------------------------------ grade
  // Grade mutável. No arcade as linhas crescem para cima (índices negativos).
  class Grid {
    constructor(rows) {
      this.rows = new Map();
      this.minY = 0; this.maxY = rows.length - 1;
      rows.forEach((r, y) => this.rows.set(y, r.split('')));
    }
    get(x, y) {
      if (x < 0 || x >= COLS) return T.WALL;
      const r = this.rows.get(y);
      if (!r) return T.WALL;
      return r[x];
    }
    set(x, y, c) { const r = this.rows.get(y); if (r) r[x] = c; }
    prepend(rows) { // adiciona linhas acima (arcade)
      for (let i = rows.length - 1; i >= 0; i--) { this.minY--; this.rows.set(this.minY, rows[i].split('')); }
    }
    dropBelow(y) { for (let k = this.maxY; k > y; k--) this.rows.delete(k); this.maxY = y; }
  }

  // ------------------------------------------------------------ jogo
  class Game {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.audio = new root.AudioEngine();
      this.save = Save.load();
      this.audio.sfxOn = this.save.sfx; this.audio.musicOn = this.save.music;
      this.state = 'title';
      this.buttons = [];
      this.particles = [];
      this.shake = 0;
      this.flash = 0;
      this.t = 0;
      this.scale = 1;
      this.worldPage = 0;
      this.scanlines = null;
      this.lastFrame = now();
      this.hintTimer = 0;
      this.toast = null;
      this.resize();
      root.addEventListener('resize', () => this.resize());
      this.bindInput();
      requestAnimationFrame(() => this.frame());
    }

    // ------------------------------------------------------------ layout
    resize() {
      const dpr = Math.min(root.devicePixelRatio || 1, 2);
      const w = root.innerWidth, h = root.innerHeight;
      this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
      this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
      this.W = w; this.H = h; this.dpr = dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ctx.imageSmoothingEnabled = false;
      // tamanho da célula: largura inteira no celular; limitado pela altura no desktop
      this.tile = Math.floor(Math.min(w / COLS, h / 15));
      this.ox = Math.floor((w - this.tile * COLS) / 2);
      this.ui = clamp(Math.floor(Math.min(w, h) / 160), 2, 5); // escala da fonte
      this.scanlines = null;
    }

    // ------------------------------------------------------------ entrada
    bindInput() {
      const c = this.canvas;
      const SWIPE = 10;   // px até reconhecer o deslize (era 24)
      const FLICK = 6;    // px: ao soltar, um gesto maior que isto já conta como deslize (flick curto)
      const REARM = 28;   // px: arrastando sem soltar, uma nova direção dispara de novo
      let sx = 0, sy = 0, st = 0, moved = false, lastDir = null;
      const swipe = (dx, dy) => {
        const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        if (dir !== lastDir) { lastDir = dir; this.input(dir); }
      };
      c.addEventListener('pointerdown', (e) => {
        e.preventDefault(); this.audio.unlock();
        try { c.setPointerCapture(e.pointerId); } catch (err) { /* opcional */ }
        sx = e.clientX; sy = e.clientY; st = now(); moved = false; lastDir = null;
        this.pointer = { x: e.clientX, y: e.clientY, down: true };
      });
      c.addEventListener('pointermove', (e) => {
        if (!this.pointer || !this.pointer.down) return;
        const dx = e.clientX - sx, dy = e.clientY - sy, dist = Math.hypot(dx, dy);
        const inGame = this.state === 'play' || this.state === 'dead';
        if (!inGame) return; // nos menus não há gesto de deslize: o toque conta ao soltar
        if (!moved) { if (dist >= SWIPE) { moved = true; swipe(dx, dy); sx = e.clientX; sy = e.clientY; } }
        else if (dist >= REARM) { swipe(dx, dy); sx = e.clientX; sy = e.clientY; }
      });
      const up = (e) => {
        this.audio.unlock();
        if (!this.pointer) return;
        this.pointer.down = false;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        const inGame = this.state === 'play' || this.state === 'dead';
        if (!moved && inGame && Math.hypot(dx, dy) >= FLICK && now() - st < 0.3) { moved = true; swipe(dx, dy); }
        if (!moved) {
          const nowT = now();
          if (this.state === 'play' && this.lastTapAt && nowT - this.lastTapAt < 0.32) { this.lastTapAt = 0; this.useShield(); }
          else { this.lastTapAt = nowT; this.tap(e.clientX, e.clientY); }
        }
        lastDir = null;
      };
      c.addEventListener('pointerup', up);
      c.addEventListener('pointercancel', up);
      root.addEventListener('keydown', (e) => {
        this.audio.unlock();
        const k = e.key;
        const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
        if (map[k]) { e.preventDefault(); this.input(map[k]); }
        else if (k === 'Escape' || k === 'p' || k === 'P') this.togglePause();
        else if (k === 'Enter' || k === ' ') { e.preventDefault(); this.confirm(); }
        else if (k === 'r' || k === 'R') { if (this.state === 'play' || this.state === 'dead') this.restart(); }
        else if (k === 'e' || k === 'E' || k === 'Shift') { if (this.state === 'play') this.useShield(); }
      });
      // iOS: 'touchend' e 'click' são os gestos que liberam o áudio
      c.addEventListener('touchend', () => this.audio.unlock(), { passive: true });
      c.addEventListener('click', () => this.audio.unlock());
      // quando o contexto de áudio finalmente ficar ativo, começa a música da tela atual
      this.audio.onReady = () => {
        if (this.audio.music) return;
        const menus = ['title', 'worlds', 'levels', 'shop', 'settings'];
        if (menus.includes(this.state)) this.audio.startMusic(99);
        else if (this.world) this.audio.startMusic(this.world.music);
      };
      root.addEventListener('blur', () => { if (this.state === 'play') this.togglePause(true); });
      document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'play') this.togglePause(true); });
    }

    input(dir) {
      if (this.state === 'dead') { this.restart(); return; }
      if (this.state === 'play') this.queueMove(dir);
      if (this.state === 'title') this.goto('worlds');
      if (this.state === 'levels') this.mapMove(dir === 'up' || dir === 'right' ? 1 : -1);
      if (this.state === 'break' && this.wbInsist) this.wbInsist();
    }
    confirm() {
      if (this.state === 'title') this.goto('worlds');
      else if (this.state === 'dead') this.restart();
      else if (this.state === 'win') this.nextLevel();
      else if (this.state === 'arcadeover') this.goto('title');
      else if (this.state === 'pause') this.togglePause();
      else if (this.state === 'levels') this.mapEnter();
    }
    tap(x, y) {
      for (const b of this.buttons) {
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { this.audio.click(); b.fn(); return; }
      }
      if (this.state === 'title') this.goto('worlds');
      else if (this.state === 'dead') this.restart();
      else if (this.state === 'win') this.nextLevel();
      else if (this.state === 'bossintro' && this.skipBossIntro) this.skipBossIntro();
    }
    button(label, x, y, w, h, fn, opts) { this.buttons.push({ label, x, y, w, h, fn, opts: opts || {} }); }

    // ------------------------------------------------------------ estados
    goto(state) {
      this.state = state; this.buttons = [];
      if (state === 'levels') this.mapInit();
      if (state === 'title' || state === 'worlds' || state === 'levels' || state === 'shop' || state === 'settings') {
        this.audio.startMusic(99); // tema do menu
      }
    }
    togglePause(force) {
      if (this.state === 'play') { this.state = 'pause'; this.buttons = []; }
      else if (this.state === 'pause' && !force) { this.state = 'play'; this.buttons = []; this.lastFrame = now(); }
    }

    // ------------------------------------------------------------ fase
    startLevel(index) {
      const L = root.LEVELS[index];
      if (!L) return;
      if (this.wbCheckpoint && this.wbCheckpoint()) return;
      this.mode = 'stage';
      this.levelIndex = index;
      this.level = L;
      this.world = root.WORLDS[L.world];
      this.setupGrid(L.rows, L.fluid);
      if (L.boss) this.setupBoss(L.boss);
      this.audio.startMusic(L.boss ? (L.boss.master ? 9 : 8) : this.world.music);
      this.state = 'play'; this.buttons = [];
      this.hintTimer = index === 0 ? 6 : 0;
      this.lastFrame = now();
      this.idleSince = null; this.hint = null; this.combo = 0;
      if (this.kids() && index === 0 && !this.spokeIntro) { this.spokeIntro = true; this.speak('Deslize o dedo para a máscara voar até a parede!'); }
      if (L.boss && this.startBossIntro) this.startBossIntro();
    }

    startArcade() {
      if (this.wbCheckpoint && this.wbCheckpoint()) return;
      this.mode = 'arcade';
      this.levelIndex = -1;
      this.world = root.WORLDS[0];
      this.arcadeRng = M.rng(Date.now() & 0xffffff);
      this.arcadeChunks = 0;
      this.themes = []; // trechos da torre: cada um com a cor de um mundo
      // bloco inicial: curto e aberto, com saída no teto
      const first = M.generate({ h: 14, wallDensity: 0.12, spikes: 0, coins: 1, bats: 0, minMoves: 3, maxMoves: 30 }, this.arcadeRng);
      const rows = first.rows;
      // a barreira: sobe em velocidade média e constante; piscando na cor do trecho
      this.setupGrid(rows, { type: 'barrier', speed: 1.5, delay: 2.5 });
      this.themes.push({ minY: 0, maxY: rows.length - 1, world: 0 });
      this.arcadeExitX = M.find(rows, T.EXIT)[0];
      this.level = { n: 0, world: 0, rows, par: 0 };
      this.extendArcade();
      this.audio.startMusic(0);
      this.state = 'play'; this.buttons = [];
      this.hintTimer = 0;
      this.height = 0;
      this.lastFrame = now();
    }

    extendArcade() {
      // garante blocos suficientes acima do jogador
      while (this.grid.minY > this.player.cy - 40) {
        const diff = Math.min(1, this.arcadeChunks / 30);
        // espaço aberto: poucas paredes, obstáculos no meio do caminho
        const chunk = M.generateChunk({
          entryX: this.arcadeExitX, h: 12 + Math.round(diff * 4),
          wallDensity: 0.11 + diff * 0.05, spikes: 1 + Math.round(diff * 3), coins: 1, bats: Math.round(0.6 + diff * 1.6), vbats: Math.round(diff * 1.2),
          shields: 0.12, minMoves: 2, maxMoves: 40,
        }, this.arcadeRng);
        if (!chunk) break;
        const worldIdx = Math.floor((this.arcadeChunks + 1) / 2) % root.WORLDS.length;
        // a antiga linha de saída vira abertura; a nova saída fica no topo do bloco
        const exitRow = this.grid.rows.get(this.grid.minY);
        exitRow[this.arcadeExitX] = T.EMPTY;
        const rows = chunk.rows.slice();
        this.grid.prepend(rows);
        this.themes.push({ minY: this.grid.minY, maxY: this.grid.minY + rows.length - 1, world: worldIdx });
        this.spawnEntities(this.grid.minY, this.grid.minY + rows.length - 1);
        this.arcadeExitX = chunk.exitX;
        this.arcadeChunks++;
      }
      // cor predominante do trecho em que o jogador está
      const th = this.themeAt(this.player.cy);
      if (th && this.world !== root.WORLDS[th.world]) {
        this.world = root.WORLDS[th.world];
        this.audio.startMusic(this.world.music);
      }
      // descarta o que está muito abaixo (já coberto pela lava)
      const cut = Math.floor(this.player.cy + 30);
      if (this.grid.maxY > cut) {
        this.grid.dropBelow(cut);
        this.bats = this.bats.filter((b) => b.y < cut);
      }
    }

    themeAt(y) {
      if (!this.themes) return null;
      for (const t of this.themes) if (y >= t.minY && y <= t.maxY) return t;
      return this.themes[this.themes.length - 1] || null;
    }
    worldAtRow(y) {
      if (this.mode !== 'arcade') return this.world;
      const t = this.themeAt(y);
      return t ? root.WORLDS[t.world] : this.world;
    }

    setupGrid(rows, fluid) {
      this.grid = new Grid(rows);
      const s = M.find(rows, T.SPAWN);
      this.grid.set(s[0], s[1], T.EMPTY);
      this.player = {
        cx: s[0], cy: s[1], x: s[0] + 0.5, y: s[1] + 0.5, dir: null, moving: false, queued: null,
        shield: 0, magnet: 0, freeze: 0, invul: 0, dead: false, face: [0, -1], squash: 0, stretch: 0, trail: [], trailDist: 0, bumpDir: null,
      };
      this.pops = []; this.hitStop = 0; this.camLead = 0;
      const mask = this.mask();
      if (mask.startShield) this.player.shield = 1;
      if (mask.permaMagnet) this.player.magnet = Infinity;
      this.player.addict = 0; this.player.boost = 0;
      this.score = 0; this.levelCoins = 0; this.dotsLeft = 0; this.timeStart = now(); this.elapsed = 0; this.moves = 0;
      this.bats = []; this.shots = []; this.shooters = []; this.particles = []; this.traps = []; this.trapClock = 0;
      this.spawnEntities(this.grid.minY, this.grid.maxY);
      this.fluid = fluid ? { type: fluid.type, speed: fluid.speed, delay: fluid.delay, y: this.grid.maxY + 2, started: false, warned: false } : null;
      this.boss = null; this.core = null;
      this.camY = this.player.y - this.viewRows() / 2;
      this.started = false;
    }

    spawnEntities(y0, y1) {
      for (let y = y0; y <= y1; y++) for (let x = 0; x < COLS; x++) {
        const c = this.grid.get(x, y);
        if (c === T.BAT_H || c === T.BAT_V) {
          this.bats.push({ x: x + 0.5, y: y + 0.5, dx: c === T.BAT_H ? 1 : 0, dy: c === T.BAT_V ? 1 : 0, phase: Math.random() * 6 });
          this.grid.set(x, y, T.EMPTY);
        } else if (c === T.TRAP) {
          this.traps.push({ x, y, phase: (y % 3) * 0.8 }); // faixas sincronizadas por linha
        } else if (c in M.SHOOTERS) {
          this.shooters.push({ x, y, dx: M.SHOOTERS[c][0], dy: M.SHOOTERS[c][1], timer: 0.8 + Math.random() * SHOT_PERIOD });
        } else if (c === T.DOT) this.dotsLeft++;
      }
    }

    mask() { return MASKS.find((m) => m.id === this.save.mask) || MASKS[0]; }
    kids() { return !!this.save.kids; }
    pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    // Voz em português (Web Speech API, usa as vozes do próprio aparelho)
    speak(text) {
      if (!this.kids() || !this.save.voice || !root.speechSynthesis) return;
      try {
        root.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'pt-BR'; u.rate = 0.95; u.pitch = 1.15;
        const voices = root.speechSynthesis.getVoices();
        const v = voices.find((vv) => /pt[-_]BR/i.test(vv.lang)) || voices.find((vv) => /^pt/i.test(vv.lang));
        if (v) u.voice = v;
        root.speechSynthesis.speak(u);
      } catch (e) { /* sem voz disponível */ }
    }
    viewRows() { return this.H / this.tile; }

    queueMove(dir) {
      const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
      if (!d) return;
      const p = this.player;
      if (p.moving) { p.queued = d; return; }
      this.beginMove(d);
    }
    beginMove(d) {
      const p = this.player;
      // alvo: desliza até o próximo sólido (ignorando espinhos, que matam ao passar)
      let tx = p.cx, ty = p.cy;
      while (!this.blocked(tx + d[0], ty + d[1])) { tx += d[0]; ty += d[1]; if (Math.abs(tx - p.cx) + Math.abs(ty - p.cy) > 200) break; }
      if (tx === p.cx && ty === p.cy) { this.bumpFx(d); return; }
      p.dir = d; p.face = d; p.moving = true; p.tx = tx; p.ty = ty; p.queued = null;
      p.stretch = 0; p.trailDist = FX.trailStep; // primeira cópia nasce já no primeiro passo
      this.moves++; this.idleSince = this.t; this.hint = null;
      if (!this.started) { this.started = true; this.timeStart = now(); }
      this.audio.move();
    }
    // estado de um espinho retrátil no instante atual
    trapState(tr) {
      const PERIOD = 2.4, ph = (this.trapClock + tr.phase) % PERIOD;
      if (ph < 1.3) return { ext: 0, warn: false, deadly: false };
      if (ph < 1.6) return { ext: 0.18, warn: true, deadly: false };
      if (ph < 2.3) return { ext: 1, warn: false, deadly: true };
      return { ext: 1 - (ph - 2.3) / 0.1, warn: false, deadly: false };
    }
    // sólido para o deslize: paredes/atiradores e a porta da saída trancada pelo chefe
    blocked(x, y) {
      const c = this.grid.get(x, y);
      return M.isSolid(c) || (c === T.EXIT && this.boss && this.boss.hp > 0);
    }
    bossAlive() { return !!(this.boss && this.boss.hp > 0); }

    // ------------------------------------------------------------ chefão
    setupBoss(def) {
      const rows = this.level.rows; // linhas originais (com o 'S'), para o solver
      const res = M.solve(rows);
      // células onde o núcleo de energia pode aparecer (fora do corredor do chefe)
      const cands = [];
      for (let y = 5; y < rows.length - 1; y++) for (let x = 1; x < COLS - 1; x++) {
        const c = rows[y][x];
        if ((c === T.DOT || c === T.EMPTY || c === T.COIN) && res.passable.has(M.key(x, y))) cands.push([x, y]);
      }
      this.boss = {
        name: def.name, hp: def.hp, maxHp: def.hp, speed: def.speed, shot: def.shot, batEvery: def.bats, size: def.size || 3, master: !!def.master,
        x: COLS / 2, y: 2.5, dir: 1, stun: 0, hitCd: 0, shotTimer: 1.5, batTimer: 3, coreTimer: 0.8, dead: false, deathT: 0, phase: 0, flash: 0,
      };
      this.coreCands = cands;
      this.core = null;
      this.toastMsg('PEGUE O NUCLEO AZUL!');
      if (this.kids()) this.speak('Cuidado, é o chefão! Pegue a bolinha azul para deixar ele tonto, depois bata nele!');
    }
    spawnCore() {
      const p = this.player;
      const far = this.coreCands.filter(([x, y]) => Math.abs(x - p.cx) + Math.abs(y - p.cy) >= 4);
      const pool = far.length ? far : this.coreCands;
      if (!pool.length) return;
      const [x, y] = pool[Math.floor(Math.random() * pool.length)];
      this.core = { x, y, t: 0 };
    }
    updateBoss(dt) {
      const b = this.boss, p = this.player;
      b.phase += dt;
      if (b.dead) { b.deathT += dt; return; }
      b.flash = Math.max(0, b.flash - dt);
      b.hitCd = Math.max(0, b.hitCd - dt);
      const half = b.size / 2;
      const stunned = b.stun > 0;
      if (stunned) { b.stun -= dt; if (b.stun <= 0) { b.stun = 0; this.toastMsg('ELE ACORDOU!'); } }
      // movimento no corredor do topo
      const sp = b.speed * (stunned ? 0.35 : 1) * (p.freeze > 0 ? 0 : 1);
      b.x += b.dir * sp * dt;
      if (b.x - half < 1) { b.x = 1 + half; b.dir = 1; } else if (b.x + half > COLS - 1) { b.x = COLS - 1 - half; b.dir = -1; }
      if (this.started && !stunned && p.freeze <= 0) {
        // tiro que cai da boca do chefe
        b.shotTimer -= dt;
        if (b.shotTimer <= 0) {
          b.shotTimer = b.shot;
          const col = Math.floor(b.x) + 0.5;
          this.shots.push({ x: col, y: 4.2, dx: 0, dy: 1, life: 8 });
          this.audio.shoot();
        }
        // invoca morcegos
        b.batTimer -= dt;
        if (b.batTimer <= 0 && this.bats.length < 6) {
          b.batTimer = b.batEvery;
          const spots = this.coreCands.filter(([x, y]) => y >= 5 && y <= 9 && Math.abs(y - p.cy) >= 2);
          if (spots.length) { const [x, y] = spots[Math.floor(Math.random() * spots.length)]; this.bats.push({ x: x + 0.5, y: y + 0.5, dx: Math.random() < 0.5 ? 1 : -1, dy: 0, phase: 0 }); this.burst(x + 0.5, y + 0.5, 8, '#b04cff', 2); }
        }
      }
      // núcleo de energia
      if (this.core) {
        this.core.t += dt;
        if (p.cx === this.core.x && p.cy === this.core.y) {
          this.core = null; b.stun = 6; b.coreTimer = 1.2;
          this.audio.powerup(); this.burst(p.x, p.y, 16, '#8cf5ff', 3);
          this.toastMsg('CHEFAO TONTO! BATA NELE!');
          if (this.kids()) this.speak('Agora bate nele!');
        }
      } else if (!stunned) {
        b.coreTimer -= dt;
        if (b.coreTimer <= 0) this.spawnCore();
      }
      // contato com o jogador
      if (!p.dead && this.started && Math.abs(p.x - b.x) < half + 0.35 && Math.abs(p.y - b.y) < 1.5 + 0.35) {
        if (stunned && b.hitCd <= 0) {
          b.hp--; b.hitCd = 1; b.flash = 0.5; b.stun = Math.min(b.stun, 0.9);
          p.invul = Math.max(p.invul, 1.2); p.moving = false; p.queued = null;
          // recuo do jogador para fora do corredor
          p.cy = 4; p.y = 4.5; p.cx = clamp(p.cx, 1, COLS - 2); p.x = p.cx + 0.5;
          this.audio.shieldHit(); this.burst(b.x, b.y, 30, this.world.color, 4); this.burst(b.x, b.y, 12, '#ffffff', 3);
          if (this.save.shake) this.shake = 0.3;
          if (b.hp <= 0) this.bossDefeated();
          else { this.toastMsg(b.hp === 1 ? 'MAIS UM GOLPE!' : 'ACERTOU! FALTAM ' + b.hp); if (this.kids()) this.speak(b.hp === 1 ? 'Mais um!' : 'Acertou!'); }
        } else if (!stunned && p.invul <= 0) this.die('chefao');
      }
    }
    bossDefeated() {
      const b = this.boss;
      b.dead = true; b.deathT = 0; b.stun = 0;
      this.shots = []; this.bats = []; this.core = null;
      for (let i = 0; i < 6; i++) setTimeout(() => { if (this.boss) { this.burst(b.x + (Math.random() - 0.5) * 2, b.y + (Math.random() - 0.5) * 2, 20, i % 2 ? '#ffffff' : this.world.color, 4); } }, i * 120);
      this.audio.death(); setTimeout(() => this.audio.win(), 500);
      if (this.save.shake) this.shake = 0.6;
      this.flash = 0.6;
      this.score += 1000;
      this.toastMsg('CHEFAO DERROTADO! VA PARA A SAIDA!');
      if (this.kids()) this.speak('Você venceu o chefão! Agora corre para a saída!');
    }
    drawBoss(ox, oy) {
      const ctx = this.ctx, s = this.tile, b = this.boss;
      if (b.dead && b.deathT > 1.2) return;
      const cx = ox + b.x * s, cy = oy + b.y * s;
      const w = b.size * s * 0.9, h = s * 2.6;
      ctx.save(); ctx.translate(cx, cy);
      if (b.dead) { const k = 1 - b.deathT / 1.2; ctx.globalAlpha = k; ctx.scale(1 + (1 - k) * 0.6, k); }
      const stunned = b.stun > 0;
      const base = b.master ? '#f0f0f0' : shade(this.world.color, 0.8);
      const col = b.flash > 0 && Math.floor(this.t * 30) % 2 === 0 ? '#ffffff' : stunned ? (Math.floor(this.t * 10) % 2 ? '#dfe8ff' : '#9ad8ff') : base;
      const bob = Math.sin(b.phase * 3) * s * 0.08;
      ctx.translate(0, bob);
      ctx.shadowColor = stunned ? '#8cf5ff' : (b.master ? '#ffffff' : this.world.color); ctx.shadowBlur = 18;
      ctx.fillStyle = col; ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.shadowBlur = 0;
      // cocar / espinhos no topo
      ctx.fillStyle = shade(col, 0.7);
      for (let i = 0; i < b.size * 2; i++) ctx.fillRect(-w / 2 + i * (w / (b.size * 2)) + 2, -h / 2 - s * 0.35, w / (b.size * 2) - 4, s * 0.35);
      ctx.fillRect(-w / 2, h * 0.2, w, h * 0.3);
      // olhos
      const eye = s * 0.45, ey = -h * 0.12;
      const look = clamp((this.player.x - b.x) * 0.1, -0.15, 0.15) * s;
      ctx.fillStyle = '#1a0a1a';
      ctx.fillRect(-w * 0.3 - eye / 2, ey - eye / 2, eye, eye); ctx.fillRect(w * 0.3 - eye / 2, ey - eye / 2, eye, eye);
      ctx.fillStyle = stunned ? '#8cf5ff' : '#ff3b3b'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10;
      const pu = eye * 0.45;
      if (stunned) { // olhos em X
        ctx.shadowBlur = 0; ctx.strokeStyle = '#8cf5ff'; ctx.lineWidth = Math.max(2, s * 0.08);
        for (const ex of [-w * 0.3, w * 0.3]) { ctx.beginPath(); ctx.moveTo(ex - pu, ey - pu); ctx.lineTo(ex + pu, ey + pu); ctx.moveTo(ex + pu, ey - pu); ctx.lineTo(ex - pu, ey + pu); ctx.stroke(); }
      } else {
        ctx.fillRect(-w * 0.3 - pu / 2 + look, ey - pu / 2, pu, pu); ctx.fillRect(w * 0.3 - pu / 2 + look, ey - pu / 2, pu, pu);
      }
      ctx.shadowBlur = 0;
      // boca com dentes
      ctx.fillStyle = '#1a0a1a'; ctx.fillRect(-w * 0.3, h * 0.22, w * 0.6, s * 0.3);
      ctx.fillStyle = '#ffffff'; for (let i = 0; i < 5; i++) ctx.fillRect(-w * 0.3 + i * (w * 0.6 / 5) + 2, h * 0.22, w * 0.6 / 5 - 4, s * 0.12);
      ctx.restore();
      // núcleo de energia
      if (this.core) {
        const k = s * (0.3 + 0.08 * Math.sin(this.core.t * 8));
        const px = ox + (this.core.x + 0.5) * s, py = oy + (this.core.y + 0.5) * s;
        ctx.shadowColor = '#8cf5ff'; ctx.shadowBlur = 16; ctx.fillStyle = '#8cf5ff';
        ctx.beginPath(); ctx.arc(px, py, k, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(px - k * 0.3, py - k * 0.3, k * 0.35, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        // anel pulsante
        ctx.strokeStyle = rgba('#8cf5ff', 0.5 - 0.4 * ((this.core.t * 1.5) % 1)); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(px, py, k + s * 0.6 * ((this.core.t * 1.5) % 1), 0, Math.PI * 2); ctx.stroke();
      }
    }
    drawBossHud() {
      const ctx = this.ctx, u = this.ui, b = this.boss;
      const y = this.H - (u * 7 + 18) - 14 - u * 8;
      const w = Math.min(this.W * 0.7, 300), x = this.W / 2 - w / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 6, y - 4, w + 12, u * 7 + 18);
      F.text(ctx, b.name, this.W / 2, y, Math.max(1, u - 1), b.master ? '#ffffff' : this.world.accent, 'center');
      const by = y + u * 7 + 2, bh = 8;
      ctx.fillStyle = '#331111'; ctx.fillRect(x, by, w, bh);
      const seg = w / b.maxHp;
      for (let i = 0; i < b.hp; i++) { ctx.fillStyle = b.stun > 0 ? '#8cf5ff' : '#ff3b3b'; ctx.fillRect(x + i * seg + 1, by + 1, seg - 2, bh - 2); }
      if (b.stun > 0) F.text(ctx, 'TONTO ' + Math.ceil(b.stun), this.W / 2, by + bh + 4, Math.max(1, u - 1), '#8cf5ff', 'center');
    }

    bumpFx(d) {
      const p = this.player;
      this.audio.bump();
      if (this.save.shake) this.shake = Math.max(this.shake, FX.shakeDur);
      this.hitStop = Math.max(this.hitStop, FX.hitStop);
      p.squash = 1; p.bumpDir = d; p.stretch = 0;
      // poeira: nasce na face da parede e se espalha ao longo dela, com leve rebote
      const wx = p.x + d[0] * 0.5, wy = p.y + d[1] * 0.5;
      const col = shade(this.worldAtRow(p.cy + d[1]).color, 1.6);
      for (let i = 0; i < FX.dust; i++) {
        const along = (Math.random() - 0.5) * 0.8;
        const back = (0.3 + Math.random() * 0.7) * FX.dustSpeed;
        const side = (Math.random() - 0.5) * 2 * FX.dustSpeed;
        this.particles.push({
          x: wx + d[1] * along, y: wy + d[0] * along,
          vx: -d[0] * back + d[1] * side, vy: -d[1] * back + d[0] * side,
          g: 1.5, life: 0.16 + Math.random() * 0.2, color: i % 3 ? col : '#ffffff', size: 0.06 + Math.random() * 0.08,
        });
      }
    }

    // ------------------------------------------------------------ atualização
    frame() {
      const t = now();
      let dt = Math.min(0.05, t - this.lastFrame);
      this.lastFrame = t;
      this.t += dt;
      if (this.state === 'play') { this.update(dt); if (this.wbTick) this.wbTick(dt); }
      else if (this.state === 'hifive' || this.state === 'break' || this.state === 'mission' || this.state === 'goodnight') this.updateFx(dt);
      else if ((this.state === 'bossintro' || this.state === 'bossdeath') && this.updateBossCine) this.updateBossCine(dt);
      else this.updateFx(dt);
      this.render();
      requestAnimationFrame(() => this.frame());
    }

    updateFx(dt) {
      this.shake = Math.max(0, this.shake - dt);
      this.flash = Math.max(0, this.flash - dt * 7);
      for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.life -= dt; }
      this.particles = this.particles.filter((p) => p.life > 0);
      if (this.toast) { this.toast.t -= dt; if (this.toast.t <= 0) this.toast = null; }
      if (this.player) {
        for (const tr of this.player.trail) tr.life -= dt;
        this.player.trail = this.player.trail.filter((tr) => tr.life > 0);
      }
      if (this.pops) { for (const pp of this.pops) pp.life -= dt; this.pops = this.pops.filter((pp) => pp.life > 0); }
      if (this.confetti > 0 && this.state === 'win') {
        this.confetti -= dt / 3;
        for (let i = 0; i < 2; i++) this.particles.push({ x: Math.random() * COLS, y: this.camY - 0.5, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3, g: 2, life: 2.5, color: this.pick(['#ffd23f', '#ff4fa3', '#8cf5ff', '#7fc33a', '#ffffff']), size: 0.18 + Math.random() * 0.12 });
      }
    }

    update(dt) {
      this.updateFx(dt);
      const p = this.player;
      if (this.started) this.elapsed = now() - this.timeStart;
      if (this.hintTimer > 0) this.hintTimer -= dt;
      // Seta de dica (opcional, desligada por padrão): aparece se a criança ficar parada
      if (this.save.hints && !p.moving && !p.dead && this.mode === 'stage') {
        if (this.idleSince == null) this.idleSince = this.t;
        if (this.t - this.idleSince > 5 && !this.hint) this.hint = this.computeHint() || { none: true };
      }
      // hit-stop: congela o mundo por ~2 quadros ao bater (os efeitos continuam)
      if (this.hitStop > 0) { this.hitStop -= dt; if (this.hitStop > 0) return; dt = Math.min(dt, -this.hitStop); this.hitStop = 0; }
      p.squash = Math.max(0, p.squash - dt / FX.squashDur);
      p.stretch = p.moving ? Math.min(1, p.stretch + dt / FX.stretchIn) : Math.max(0, p.stretch - dt / 0.06);
      if (!p.moving && p.queued && !p.dead) { const q = p.queued; p.queued = null; this.beginMove(q); }
      p.invul = Math.max(0, p.invul - dt);
      if (p.freeze > 0) p.freeze -= dt;
      if (p.magnet > 0 && p.magnet !== Infinity) p.magnet -= dt;
      if (p.addict > 0) p.addict -= dt;
      if (p.boost > 0) p.boost -= dt;

      // movimento do jogador em sub-passos para não pular células
      if (p.moving) {
        let remaining = SPEED * dt;
        while (remaining > 0 && p.moving) {
          const step = Math.min(remaining, 0.25);
          remaining -= step;
          const ax = p.tx + 0.5, ay = p.ty + 0.5;
          p.x += p.dir[0] * step; p.y += p.dir[1] * step;
          if ((p.dir[0] > 0 && p.x >= ax) || (p.dir[0] < 0 && p.x <= ax) || (p.dir[1] > 0 && p.y >= ay) || (p.dir[1] < 0 && p.y <= ay)) {
            p.x = ax; p.y = ay; p.moving = false;
          }
          const ncx = Math.floor(p.x), ncy = Math.floor(p.y);
          if (ncx !== p.cx || ncy !== p.cy) { p.cx = ncx; p.cy = ncy; this.enterCell(ncx, ncy); if (this.state !== 'play') return; }
          // cópias do sprite por distância percorrida (independe do fps)
          p.trailDist += step;
          if (p.trailDist >= FX.trailStep) {
            p.trailDist -= FX.trailStep;
            p.trail.push({ x: p.x, y: p.y, dir: p.dir, life: FX.trailLife });
            if (p.trail.length > FX.trailMax) p.trail.shift();
          }
        }
        if (!p.moving) this.bumpFx(p.dir); // a direção na fila só parte depois do hit-stop
      }

      // ímã
      if (p.magnet > 0) {
        const r = 2.2;
        for (let y = p.cy - 2; y <= p.cy + 2; y++) for (let x = p.cx - 2; x <= p.cx + 2; x++) {
          const c = this.grid.get(x, y);
          if ((c === T.DOT || c === T.COIN) && Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y) <= r) this.collect(x, y, c);
        }
      }

      // morcegos
      const frozen = p.freeze > 0;
      const batSpeed = BAT_SPEED * (this.mask().slowBats ? 0.65 : 1);
      for (const b of this.bats) {
        b.phase += dt * 10;
        if (frozen) continue;
        const nx = b.x + b.dx * batSpeed * dt, ny = b.y + b.dy * batSpeed * dt;
        const ahead = this.grid.get(Math.floor(nx + b.dx * 0.45), Math.floor(ny + b.dy * 0.45));
        if (M.isSolid(ahead) || ahead === T.SPIKE) { b.dx = -b.dx; b.dy = -b.dy; }
        else { b.x = nx; b.y = ny; }
        if (!p.dead && this.started && !this.immune('bat') && Math.abs(b.x - p.x) < 0.7 && Math.abs(b.y - p.y) < 0.7) this.hit('morcego', b);
      }
      // atiradores
      for (const s of this.shooters) {
        if (frozen) continue;
        if (Math.abs(s.y - p.y) > this.viewRows() + 4) continue; // só atira perto da tela
        s.timer -= dt;
        if (s.timer <= 0) {
          s.timer = SHOT_PERIOD;
          this.shots.push({ x: s.x + 0.5 + s.dx * 0.6, y: s.y + 0.5 + s.dy * 0.6, dx: s.dx, dy: s.dy, life: 6 });
          if (Math.abs(s.y - p.y) < this.viewRows()) this.audio.shoot();
        }
      }
      for (const sh of this.shots) {
        if (frozen) continue;
        sh.x += sh.dx * SHOT_SPEED * dt; sh.y += sh.dy * SHOT_SPEED * dt; sh.life -= dt;
        const c = this.grid.get(Math.floor(sh.x), Math.floor(sh.y));
        if (M.isSolid(c)) { sh.life = 0; this.burst(sh.x, sh.y, 4, '#ffffff', 1); }
        if (!p.dead && this.started && Math.abs(sh.x - p.x) < 0.55 && Math.abs(sh.y - p.y) < 0.55) { sh.life = 0; if (!this.immune('arrow')) this.hit('flecha'); }
      }
      this.shots = this.shots.filter((s) => s.life > 0);

      // espinhos retráteis: ciclo recolhido -> aviso -> estendido (mortal) -> recolhe
      if (p.freeze <= 0) this.trapClock += dt;
      for (const tr of this.traps) {
        if (!p.dead && p.invul <= 0 && !this.immune('trap') && p.cx === tr.x && p.cy === tr.y && this.trapState(tr).deadly) { this.die('espinho'); return; }
      }

      if (this.boss) this.updateBoss(dt);

      // lava / água
      if (this.fluid) {
        if (this.started && !this.fluid.started && this.elapsed > this.fluid.delay) this.fluid.started = true;
        if (this.fluid.started) {
          const barrier = this.fluid.type === 'barrier';
          // barreira do arcade: velocidade média e constante, com leve aumento a cada 10 trechos
          const accel = barrier ? 1 + Math.floor(this.arcadeChunks / 10) * 0.1 : 1;
          // se ficar fora da tela, acelera para voltar a ser visível
          const gap = this.fluid.y - p.y;
          const chase = gap > this.viewRows() * 1.1 ? 2.5 : 1;
          this.fluid.y -= this.fluid.speed * accel * chase * dt;
          if (gap < 4 && !this.fluid.warned) { this.fluid.warned = true; this.audio.lavaWarn(); }
          if (gap > 6) this.fluid.warned = false;
          const touch = barrier ? p.y + 0.4 > this.fluid.y : p.y + 0.3 > this.fluid.y;
          if (touch && !p.dead) this.die(barrier ? 'barreira' : this.fluid.type === 'lava' ? 'lava' : 'agua', true);
        }
      }

      if (this.mode === 'arcade') {
        this.height = Math.max(this.height, (this.level.rows.length - 2) - p.cy);
        this.extendArcade();
      }

      // câmera: segue com suavidade e avança (lead) na direção vertical do movimento
      const wantLead = p.moving ? p.dir[1] * FX.camLead : 0;
      this.camLead = lerp(this.camLead, wantLead, 1 - Math.exp(-(p.moving ? 12 : 5) * dt));
      const target = p.y + this.camLead - this.viewRows() * 0.55;
      const topPad = this.boss ? (this.ui * 7 + 22) / this.tile : 0;
      const minCam = this.grid.minY - topPad, maxCam = this.grid.maxY + 1 - this.viewRows();
      if (this.mode === 'stage' && this.grid.maxY - this.grid.minY + 1 + topPad <= this.viewRows()) {
        // fase cabe inteira na tela: câmera fixa e centralizada
        this.camY = lerp(this.camY, (this.grid.minY - topPad + this.grid.maxY + 1) / 2 - this.viewRows() / 2, 1 - Math.exp(-FX.camRate * dt));
      } else {
        this.camY = lerp(this.camY, this.mode === 'arcade' ? target : clamp(target, Math.min(minCam, maxCam), Math.max(minCam, maxCam)), 1 - Math.exp(-FX.camRate * dt));
      }
    }

    // Próximo movimento do caminho mais curto a partir da posição atual
    computeHint() {
      if (this.bossAlive()) return null;
      const rows = [];
      for (let y = this.grid.minY; y <= this.grid.maxY; y++) rows.push(this.grid.rows.get(y).join(''));
      const p = this.player;
      const start = [p.cx, p.cy - this.grid.minY];
      const key = (x, y) => y * 1000 + x;
      const q = [start], par = new Map([[key(...start), null]]);
      let exitK = null;
      while (q.length && exitK === null) {
        const [x, y] = q.shift();
        for (const d of M.DIRS) {
          const sl = M.slide(rows, x, y, d[0], d[1]);
          if (sl.dead || !sl.path.length) continue;
          const k = key(sl.x, sl.y);
          if (!par.has(k)) { par.set(k, { from: key(x, y), d }); if (sl.exit) { exitK = k; break; } q.push([sl.x, sl.y]); }
        }
      }
      if (exitK === null) return null; // sem caminho: não aponta para lugar nenhum
      let k = exitK, first = null;
      while (par.get(k)) { first = par.get(k).d; k = par.get(k).from; }
      return { d: first || [0, -1] };
    }

    enterCell(x, y) {
      const c = this.grid.get(x, y);
      if (c === T.SPIKE) { this.die('espinho'); return; }
      if (c === T.TRAP) { const tr = this.traps.find((q) => q.x === x && q.y === y); if (tr && this.trapState(tr).deadly && this.player.invul <= 0 && !this.immune('trap')) { this.die('espinho'); return; } }
      if (this.bossHazardAt && this.bossHazardAt(x, y)) { this.die('chefao'); return; }
      if (c === T.EXIT) { if (this.mode === 'stage') this.winLevel(); return; }
      if (c === T.DOT || c === T.COIN || c === T.SHIELD || c === T.FREEZE || c === T.MAGNET || c === T.ADDICT || c === T.BOOST) this.collect(x, y, c);
    }
    collect(x, y, c) {
      const p = this.player;
      this.grid.set(x, y, T.EMPTY);
      const mult = p.boost > 0 ? this.boostMult() : 1;
      if (c === T.DOT) {
        this.score += 10 * mult; this.dotsLeft--; this.audio.dot();
        if (p.addict > 0) { this.save.coins += 1; this.sessionCoins = (this.sessionCoins || 0) + 1; }
        this.pops.push({ x: x + 0.5, y: y + 0.5, life: 0.16, color: this.worldAtRow(y).accent });
        this.burst(x + 0.5, y + 0.5, 3, this.worldAtRow(y).accent, 1.2);
        this.combo = (this.t - (this.lastDotAt || -9) < 0.35) ? (this.combo || 0) + 1 : 1; this.lastDotAt = this.t;
        if (this.kids() && this.combo > 0 && this.combo % 8 === 0) this.toastMsg(this.pick(COMBOS));
      }
      else if (c === T.COIN) {
        const v = Math.round(5 * this.bonus('coin'));
        this.levelCoins++; this.score += 100 * mult; this.save.coins += v; this.audio.coin();
        this.burst(x + 0.5, y + 0.5, 12, '#ffd23f', 2.5);
        this.toastMsg('+' + v + ' $');
      } else if (c === T.SHIELD) { p.shield = 1; this.audio.powerup(); this.toastMsg('ESCUDO!'); this.burst(x + 0.5, y + 0.5, 10, '#8cf5ff', 2); }
      else if (c === T.FREEZE) { p.freeze = this.duration('freeze'); this.audio.powerup(); this.toastMsg('CONGELAR!'); this.burst(x + 0.5, y + 0.5, 10, '#ffffff', 2); }
      else if (c === T.ADDICT) { p.addict = this.duration('addict'); this.audio.powerup(); this.toastMsg('VICIADO EM MOEDAS!'); this.burst(x + 0.5, y + 0.5, 12, '#ffd23f', 2); }
      else if (c === T.BOOST) { p.boost = this.duration('boost'); this.audio.powerup(); this.toastMsg('PONTOS X' + this.boostMult() + '!'); this.burst(x + 0.5, y + 0.5, 12, '#ff4fa3', 2); }
      else if (c === T.MAGNET) { p.magnet = this.duration('magnet'); this.audio.powerup(); this.toastMsg('IMA!'); this.burst(x + 0.5, y + 0.5, 10, '#ff4fa3', 2); }
    }
    hit(cause, bat) {
      const p = this.player;
      if (p.invul > 0) return;
      if (p.shield > 0) {
        p.shield = 0; p.invul = 1.2; this.audio.shieldHit();
        this.burst(p.x, p.y, 16, '#8cf5ff', 3);
        if (bat) { this.bats.splice(this.bats.indexOf(bat), 1); this.burst(bat.x, bat.y, 10, '#b04cff', 2.5); }
        if (this.save.shake) this.shake = 0.25;
        this.toastMsg('ESCUDO QUEBROU!');
        return;
      }
      this.die(cause);
    }
    die(cause, ignoreShield) {
      const p = this.player;
      if (p.dead) return;
      if (!ignoreShield && p.shield > 0) { this.hit(cause); return; }
      p.dead = true; p.moving = false; p.queued = null;
      this.deathCause = cause;
      this.audio.death();
      this.explodeSprite();
      this.burst(p.x, p.y, 12, '#ffffff', 4);
      if (this.save.shake) this.shake = 0.35;
      this.flash = 0.8;
      if (navigator.vibrate) { try { navigator.vibrate(80); } catch (e) { /* ignorado */ } }
      this.state = this.mode === 'arcade' ? 'arcadeover' : 'dead';
      this.buttons = [];
      if (this.kids()) { this.deathMsg = this.pick(ANIMOS); this.speak(this.deathMsg); }
      if (this.wbMaybeWarn && this.mode === 'stage') setTimeout(() => this.wbMaybeWarn(), 1800);
      if (this.mode === 'arcade') {
        const sc = this.arcadeScore();
        if (sc > this.save.arcadeBest) { this.save.arcadeBest = sc; this.newBest = true; } else this.newBest = false;
        Save.write();
      }
      this.deadAt = this.t;
    }
    arcadeScore() { return Math.floor(this.height) * 10 + this.score; }
    winLevel() {
      const p = this.player; p.moving = false;
      this.audio.win();
      this.burst(p.x, p.y, 30, '#ffd23f', 4);
      const idx = this.levelIndex;
      const stars = this.levelCoins;
      this.save.stars[idx] = Math.max(this.save.stars[idx] || 0, stars);
      const timeBonus = Math.max(0, Math.round(300 - this.elapsed * 10));
      this.finalScore = this.score + timeBonus;
      this.save.best[idx] = Math.max(this.save.best[idx] || 0, this.finalScore);
      const wasUnlocked = this.save.unlocked;
      this.save.unlocked = Math.max(this.save.unlocked, idx + 2);
      this.chest = this.rollChest ? this.rollChest(idx, stars) : null;
      this.newWorld = wasUnlocked !== this.save.unlocked && (idx + 1) % 10 === 0 && idx + 1 < root.LEVELS.length;
      Save.write();
      this.state = 'win'; this.buttons = []; this.winAt = this.t;
      if (this.wbMaybeWarn) setTimeout(() => this.wbMaybeWarn(), 900);
      this.winTitle = this.kids() ? this.pick(['MUITO BEM!', 'INCRIVEL!', 'VOCE CONSEGUIU!', 'UAU!']) : 'COMPLETA!';
      this.confetti = (this.kids() || this.level.boss) ? (this.level.boss && this.level.boss.master ? 3 : 1) : 0;
      if (this.level.boss && this.level.boss.master) { this.save.zerou = true; if (this.kids()) this.speak('Você zerou o jogo! Parabéns, campeão!'); }
      if (this.kids()) this.speak(this.pick(ELOGIOS) + (stars === 3 ? ' Três estrelas!' : stars === 0 ? ' Tente pegar as estrelas douradas!' : ''));
    }
    restart() { if (this.wbCheckpoint && this.wbCheckpoint()) return; if (this.mode === 'arcade') this.startArcade(); else this.startLevel(this.levelIndex); }
    nextLevel() {
      if (this.wbCheckpoint && this.wbCheckpoint()) return;
      if (this.levelIndex + 1 < root.LEVELS.length) this.startLevel(this.levelIndex + 1);
      else this.goto('title');
    }

    // Explode o sprite do jogador em blocos 8x8 com as cores reais de cada pixel
    explodeSprite() {
      const p = this.player, spr = this.playerSprite();
      const N = 8, c = document.createElement('canvas'); c.width = N; c.height = N;
      const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
      x.drawImage(spr.canvas, spr.pad, spr.pad, spr.size, spr.size, 0, 0, N, N);
      const d = x.getImageData(0, 0, N, N).data;
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const o = (j * N + i) * 4; if (d[o + 3] < 60) continue;
        const ox = (i + 0.5) / N - 0.5, oy = (j + 0.5) / N - 0.5;    // posição relativa no sprite (−0.5..0.5)
        const ang = Math.atan2(oy, ox) + (Math.random() - 0.5) * 0.8, sp = 2 + Math.random() * 5;
        this.particles.push({ x: p.x + ox * 0.8, y: p.y + oy * 0.8, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 1.5, g: 9, life: 0.45 + Math.random() * 0.5, color: `rgb(${d[o]},${d[o + 1]},${d[o + 2]})`, size: 0.8 / N });
      }
    }
    burst(x, y, n, color, power) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = (0.5 + Math.random()) * power;
        this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 3, life: 0.3 + Math.random() * 0.5, color, size: 0.08 + Math.random() * 0.14 });
      }
    }
    toastMsg(msg) { this.toast = { msg, t: 1.2 }; }

    // ------------------------------------------------------------ renderização
    render() {
      const ctx = this.ctx, W = this.W, H = this.H;
      ctx.save();
      ctx.fillStyle = '#05030a';
      ctx.fillRect(0, 0, W, H);
      if (this.state === 'play' || this.state === 'pause' || this.state === 'dead' || this.state === 'win' || this.state === 'arcadeover' || this.state === 'bossintro' || this.state === 'bossdeath') {
        this.renderWorld();
        this.renderHud();
        if (this.state === 'pause') this.renderPause();
        if (this.state === 'dead') this.renderDead();
        if (this.state === 'win') this.renderWin();
        if (this.state === 'arcadeover') this.renderArcadeOver();
        if ((this.state === 'bossintro' || this.state === 'bossdeath') && this.renderBossCine) this.renderBossCine();
      } else if (this.state === 'title') this.renderTitle();
      else if (this.state === 'mission') this.renderMission();
      else if (this.state === 'break') this.renderBreak();
      else if (this.state === 'hifive') this.renderHiFive();
      else if (this.state === 'gate') this.renderGate();
      else if (this.state === 'parent') this.renderParentPanel();
      else if (this.state === 'goodnight') this.renderGoodnight();
      else if (this.state === 'worlds') this.renderWorlds();
      else if (this.state === 'levels') this.renderLevels();
      else if (this.state === 'shop') this.renderShop();
      else if (this.state === 'settings') this.renderSettings();
      ctx.restore();
      if (this.save.crt) this.renderCrt();
    }

    renderCrt() {
      const ctx = this.ctx;
      if (!this.scanlines) {
        const c = document.createElement('canvas'); c.width = 4; c.height = 4;
        const x = c.getContext('2d'); x.fillStyle = 'rgba(0,0,0,0.22)'; x.fillRect(0, 0, 4, 2);
        this.scanlines = ctx.createPattern(c, 'repeat');
      }
      ctx.fillStyle = this.scanlines; ctx.fillRect(0, 0, this.W, this.H);
      const g = ctx.createRadialGradient(this.W / 2, this.H / 2, Math.min(this.W, this.H) * 0.4, this.W / 2, this.H / 2, Math.max(this.W, this.H) * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, this.W, this.H);
    }

    // imagem de fundo do mundo (gerada com IA), carregada sob demanda
    bgImage(name) {
      const alias = { 'bg-sombras': 'bg-catacumba', 'bg-nucleo': 'bg-vulcao', 'bg-mestre': 'bg-templo' };
      name = alias[name] || name;
      this.images = this.images || {};
      if (!(name in this.images)) {
        const img = new Image(); img.onload = () => { img.ready = true; }; img.onerror = () => { img.failed = true; };
        img.src = 'assets/' + name + '.png'; this.images[name] = img;
      }
      const im = this.images[name];
      return im.ready ? im : null;
    }
    // fundo: imagem do mundo com parallax + grade sutil + brilho da cor do mundo
    renderBackdrop(color, bgName) {
      const ctx = this.ctx, W = this.W, H = this.H;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, shade(color, 0.12)); g.addColorStop(0.5, '#06040c'); g.addColorStop(1, shade(color, 0.1));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const img = bgName ? this.bgImage(bgName) : null;
      if (img) {
        // cobre a tela mantendo proporção; rola devagar com a câmera (parallax)
        const sc = Math.max(W / img.width, (H * 1.3) / img.height);
        const iw = img.width * sc, ih = img.height * sc;
        const par = ((this.camY || 0) * this.tile * 0.15) % (ih);
        ctx.globalAlpha = 0.55; ctx.imageSmoothingEnabled = false;
        for (let y = -par - ih; y < H + ih; y += ih) ctx.drawImage(img, (W - iw) / 2, y, iw, ih);
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(5,3,10,0.35)'; ctx.fillRect(0, 0, W, H);
      }
      ctx.strokeStyle = rgba(color, 0.06); ctx.lineWidth = 1;
      const s = this.tile;
      const off = ((this.camY || 0) * s) % s;
      ctx.beginPath();
      for (let x = this.ox % s; x < W; x += s) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
      for (let y = -off; y < H; y += s) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
      ctx.stroke();
    }

    renderWorld() {
      const ctx = this.ctx, s = this.tile, w = this.world;
      this.renderBackdrop(w.color, 'bg-' + w.id);
      ctx.save();
      if (this.shake > 0) {
        // batida: tremor curto e seco, mais forte no eixo do impacto; morte: tremor longo
        const d = this.player.bumpDir || [0, 1], big = this.shake > FX.shakeDur + 0.01;
        const k = big ? this.shake * 12 : FX.shakeAmp * (this.shake / FX.shakeDur);
        const r = (Math.random() - 0.5) * 2;
        ctx.translate(big ? (Math.random() - 0.5) * k : d[0] * k * r + (Math.random() - 0.5) * k * 0.4, big ? (Math.random() - 0.5) * k : d[1] * k * r + (Math.random() - 0.5) * k * 0.4);
      }
      const ox = this.ox, oy = -this.camY * s;
      const y0 = Math.floor(this.camY) - 1, y1 = Math.ceil(this.camY + this.viewRows()) + 1;
      // paredes
      for (let y = y0; y <= y1; y++) for (let x = 0; x < COLS; x++) {
        const c = this.grid.get(x, y);
        const px = ox + x * s, py = oy + y * s;
        if (c === T.WALL || c in M.SHOOTERS) {
          if (!this.grid.rows.has(y)) continue;
          const wr = this.worldAtRow(y);
          this.drawWall(px, py, x, y, wr);
          if (c in M.SHOOTERS) this.drawShooter(px, py, M.SHOOTERS[c], wr);
        }
      }
      // itens
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 6);
      for (let y = y0; y <= y1; y++) for (let x = 0; x < COLS; x++) {
        const c = this.grid.get(x, y);
        const px = ox + x * s, py = oy + y * s;
        if (c === T.DOT) { const addict = this.player.addict > 0; const d = Math.max(2, Math.round(s * (addict ? 0.22 : 0.14))); ctx.fillStyle = addict ? '#ffd23f' : this.worldAtRow(y).accent; ctx.fillRect(px + (s - d) / 2, py + (s - d) / 2, d, d); }
        else if (c === T.COIN) this.drawCoin(px, py, pulse);
        else if (c === T.SPIKE) this.drawSpike(px, py, x, y, 1, false);
        else if (c === T.TRAP) { const tr = this.traps.find((q) => q.x === x && q.y === y); const st = tr ? this.trapState(tr) : { ext: 0 }; this.drawSpike(px, py, x, y, st.ext, st.warn, true); }
        else if (c === T.EXIT) this.drawExit(px, py, pulse, this.bossAlive());
        else if (c === T.SHIELD) this.drawPowerup(px, py, '#8cf5ff', 'S', pulse);
        else if (c === T.FREEZE) this.drawPowerup(px, py, '#ffffff', '*', pulse);
        else if (c === T.MAGNET) this.drawPowerup(px, py, '#ff4fa3', 'U', pulse);
        else if (c === T.ADDICT) this.drawPowerup(px, py, '#ffd23f', '$', pulse);
        else if (c === T.BOOST) this.drawPowerup(px, py, '#ff7a3d', 'X', pulse);
      }
      // tiros
      for (const sh of this.shots) {
        ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 8;
        const l = s * 0.5, t = s * 0.14;
        if (sh.dx) ctx.fillRect(ox + sh.x * s - l / 2, oy + sh.y * s - t / 2, l, t); else ctx.fillRect(ox + sh.x * s - t / 2, oy + sh.y * s - l / 2, t, l);
        ctx.shadowBlur = 0;
      }
      // morcegos
      for (const b of this.bats) this.drawBat(ox + b.x * s, oy + b.y * s, b, this.player.freeze > 0);
      if (this.boss) this.drawBoss(ox, oy);
      // rastro + jogador
      const p = this.player;
      if (p.trail.length) {
        const spr = this.playerSprite();
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; // soma de luz = brilho sem shadowBlur
        for (const tr of p.trail) {
          const a = tr.life / FX.trailLife;                    // 1 → 0
          ctx.globalAlpha = a * a * FX.trailAlpha;
          const k = 1 + FX.stretch * a, q = 1 - 0.35 * (1 - a); // mantém o alongamento e encolhe ao sumir
          const sw = (tr.dir[0] ? k : q) * spr.canvas.width, sh = (tr.dir[1] ? k : q) * spr.canvas.height;
          ctx.drawImage(spr.canvas, ox + tr.x * s - sw / 2, oy + tr.y * s - sh / 2, sw, sh);
        }
        ctx.restore();
      }
      if (!p.dead) this.drawPlayer(ox + p.x * s, oy + p.y * s);
      // "pop" dos pontos coletados: quadrado que se expande e some
      for (const pp of this.pops) {
        const a = pp.life / 0.16, k = s * (0.25 + (1 - a) * 0.7);
        ctx.strokeStyle = rgba(pp.color, a); ctx.lineWidth = Math.max(1, s * 0.06);
        ctx.strokeRect(ox + pp.x * s - k / 2, oy + pp.y * s - k / 2, k, k);
      }
      if (this.hint && this.hint.d && !p.moving && this.state === 'play') this.drawHint(ox + p.x * s, oy + p.y * s, this.hint.d);
      // partículas
      for (const pt of this.particles) {
        ctx.fillStyle = pt.color; ctx.globalAlpha = clamp(pt.life * 2, 0, 1);
        const k = pt.size * s; ctx.fillRect(ox + pt.x * s - k / 2, oy + pt.y * s - k / 2, k, k);
      }
      ctx.globalAlpha = 1;
      // lava / água
      if (this.fluid) this.drawFluid(ox, oy);
      ctx.restore();
      if (this.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(1, this.flash * 1.2) * 0.85})`; ctx.fillRect(0, 0, this.W, this.H); }
      // laterais fora do labirinto (desktop)
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      if (ox > 0) { ctx.fillRect(0, 0, ox, this.H); ctx.fillRect(ox + COLS * s, 0, this.W - ox - COLS * s, this.H); }
    }

    drawWall(px, py, x, y, w) {
      const ctx = this.ctx, s = this.tile;
      ctx.fillStyle = w.color; ctx.fillRect(px, py, s, s);
      // relevo: borda clara em cima/esquerda, escura embaixo/direita
      const b = Math.max(1, Math.round(s * 0.09));
      ctx.fillStyle = shade(w.color, 1.35); ctx.fillRect(px, py, s, b); ctx.fillRect(px, py, b, s);
      ctx.fillStyle = shade(w.color, 0.55); ctx.fillRect(px, py + s - b, s, b); ctx.fillRect(px + s - b, py, b, s);
      // padrão de tijolo
      ctx.fillStyle = rgba('#000000', 0.18);
      const m = Math.round(s * 0.5);
      if ((x + y) % 2 === 0) ctx.fillRect(px + b * 2, py + m, s - b * 4, b);
      else ctx.fillRect(px + m, py + b * 2, b, s - b * 4);
    }
    drawShooter(px, py, d, w) {
      const ctx = this.ctx, s = this.tile;
      const r = s * 0.22;
      ctx.fillStyle = '#0a0810';
      ctx.beginPath(); ctx.arc(px + s / 2 + d[0] * s * 0.2, py + s / 2 + d[1] * s * 0.2, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = w.accent; ctx.fillRect(px + s / 2 - r * 0.3, py + s / 2 - r * 0.3, r * 0.6, r * 0.6);
    }
    drawCoin(px, py, pulse) {
      const ctx = this.ctx, s = this.tile;
      const k = s * (0.36 + pulse * 0.06);
      ctx.save(); ctx.translate(px + s / 2, py + s / 2); ctx.rotate(Math.PI / 4);
      ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 10 + pulse * 6;
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(-k / 2, -k / 2, k, k);
      ctx.fillStyle = '#fff6c2'; ctx.fillRect(-k / 2 + k * 0.2, -k / 2 + k * 0.2, k * 0.3, k * 0.3);
      ctx.restore();
    }
    drawSpike(px, py, x, y, ext, warn, trap) {
      const ctx = this.ctx, s = this.tile;
      if (ext === undefined) ext = 1;
      // espinhos apontam para fora da parede onde estão presos
      const g = this.grid;
      let base = [0, 1];
      if (M.isSolid(g.get(x, y + 1))) base = [0, 1]; else if (M.isSolid(g.get(x, y - 1))) base = [0, -1];
      else if (M.isSolid(g.get(x - 1, y))) base = [-1, 0]; else if (M.isSolid(g.get(x + 1, y))) base = [1, 0];
      ctx.save(); ctx.translate(px + s / 2, py + s / 2);
      ctx.rotate(Math.atan2(base[1], base[0]) - Math.PI / 2);
      if (trap) {
        // boca do bloco: ranhura escura de onde os espinhos saem
        ctx.fillStyle = '#0a0810'; ctx.fillRect(-s / 2 + 2, s / 2 - s * 0.22, s - 4, s * 0.22);
        if (warn && Math.floor(this.t * 16) % 2 === 0) { ctx.fillStyle = '#ff3b3b'; ctx.fillRect(-s / 2 + 2, s / 2 - s * 0.22, s - 4, 2); }
      }
      if (ext > 0) {
        ctx.fillStyle = warn ? '#ffb0b0' : '#e8e8f0';
        const n = 3, wdt = s / n, tip = s / 2 - (s * 0.8) * ext;
        for (let i = 0; i < n; i++) {
          const bx = -s / 2 + i * wdt;
          ctx.beginPath(); ctx.moveTo(bx, s / 2); ctx.lineTo(bx + wdt / 2, tip); ctx.lineTo(bx + wdt, s / 2); ctx.closePath(); ctx.fill();
        }
      }
      if (!trap) { ctx.fillStyle = '#9a9aa8'; ctx.fillRect(-s / 2, s / 2 - s * 0.14, s, s * 0.14); }
      ctx.restore();
    }
    drawExit(px, py, pulse, locked) {
      const ctx = this.ctx, s = this.tile;
      if (locked) {
        ctx.fillStyle = '#1a1020'; ctx.fillRect(px, py, s, s);
        ctx.strokeStyle = '#664466'; ctx.lineWidth = 2; ctx.strokeRect(px + 2, py + 2, s - 4, s - 4);
        // cadeado
        ctx.fillStyle = '#ff3b3b'; ctx.fillRect(px + s * 0.32, py + s * 0.45, s * 0.36, s * 0.3);
        ctx.strokeStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(px + s / 2, py + s * 0.42, s * 0.14, Math.PI, 0); ctx.stroke();
        return;
      }
      ctx.fillStyle = '#05030a'; ctx.fillRect(px, py, s, s);
      ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 14 + pulse * 10;
      ctx.fillStyle = rgba('#ffd23f', 0.9);
      const m = s * 0.15;
      ctx.fillRect(px + m, py + m, s - 2 * m, s - 2 * m);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#05030a';
      ctx.fillRect(px + m * 2, py + m * 2, s - 4 * m, s - 4 * m);
      ctx.fillStyle = rgba('#fff6c2', 0.5 + pulse * 0.5);
      ctx.fillRect(px + s * 0.42, py + s * 0.42, s * 0.16, s * 0.16);
    }
    drawPowerup(px, py, color, letter, pulse) {
      const ctx = this.ctx, s = this.tile;
      ctx.shadowColor = color; ctx.shadowBlur = 8 + pulse * 6;
      ctx.fillStyle = color;
      const k = s * 0.6;
      ctx.beginPath(); ctx.arc(px + s / 2, py + s / 2, k / 2, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      F.text(ctx, letter, px + s / 2, py + s / 2 - 3.5 * Math.max(1, Math.round(s / 24)), Math.max(1, Math.round(s / 24)), '#05030a', 'center');
    }
    drawBat(cx, cy, b, frozen) {
      const ctx = this.ctx, s = this.tile;
      const flap = frozen ? 0.3 : Math.sin(b.phase) * 0.5 + 0.5;
      const col = frozen ? '#9ad8ff' : '#b04cff';
      ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 6;
      const bw = s * 0.26, bh = s * 0.3;
      ctx.fillRect(cx - bw / 2, cy - bh / 2, bw, bh); // corpo
      const wy = cy - bh / 2 + flap * bh * 0.6;
      ctx.fillRect(cx - bw / 2 - s * 0.3, wy, s * 0.3, s * 0.14); // asas
      ctx.fillRect(cx + bw / 2, wy, s * 0.3, s * 0.14);
      ctx.fillRect(cx - bw / 2 - s * 0.18, wy - s * 0.1, s * 0.12, s * 0.1);
      ctx.fillRect(cx + bw / 2 + s * 0.06, wy - s * 0.1, s * 0.12, s * 0.1);
      ctx.shadowBlur = 0;
      if (this.kids()) { // olhos grandes e fofos
        const e = Math.max(2, s * 0.11);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - bw / 4 - e / 2, cy - bh / 4, e, e); ctx.fillRect(cx + bw / 4 - e / 2, cy - bh / 4, e, e);
        ctx.fillStyle = '#1a1a1a'; const pz = Math.max(1, e * 0.5); ctx.fillRect(cx - bw / 4, cy - bh / 4 + e * 0.3, pz, pz); ctx.fillRect(cx + bw / 4, cy - bh / 4 + e * 0.3, pz, pz);
      } else {
        ctx.fillStyle = '#ff4040'; const e = Math.max(1, s * 0.06);
        ctx.fillRect(cx - bw / 4 - e / 2, cy - bh / 4, e, e); ctx.fillRect(cx + bw / 4 - e / 2, cy - bh / 4, e, e);
      }
    }
    // Sprite da máscara desenhado uma vez (por máscara, tamanho, modo e direção do olhar) em um canvas
    // auxiliar, com o brilho já "assado". Serve para o jogador, para as cópias do rastro e para a explosão.
    playerSprite() {
      const s = this.tile, mask = this.mask(), p = this.player, kids = this.kids();
      const key = [mask.id, s, kids ? 'k' : 'c', p.face[0], p.face[1]].join('|');
      this.sprites = this.sprites || {};
      if (this.sprites[key]) return this.sprites[key];
      const k = s * 0.8, pad = Math.ceil(s * 0.35), size = Math.ceil(k);
      const c = document.createElement('canvas'); c.width = c.height = size + pad * 2;
      const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
      ctx.translate(pad + size / 2, pad + size / 2);
      ctx.shadowColor = mask.color; ctx.shadowBlur = s * 0.35;
      ctx.fillStyle = mask.color; ctx.fillRect(-k / 2, -k / 2, k, k);
      ctx.shadowBlur = 0;
      ctx.fillStyle = shade(mask.color, 0.75);
      ctx.fillRect(-k / 2, k * 0.3, k, k * 0.2);
      ctx.fillRect(-k * 0.08, -k / 2, k * 0.16, k * 0.25);
      const ex = p.face[0] * k * 0.08, ey = p.face[1] * k * 0.08, eye = k * 0.2;
      ctx.fillStyle = mask.eye;
      ctx.fillRect(-k * 0.3 + ex - eye / 2, -k * 0.12 + ey - eye / 2, eye, eye);
      ctx.fillRect(k * 0.3 + ex - eye / 2, -k * 0.12 + ey - eye / 2, eye, eye);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-k * 0.3 + ex - eye / 2 + eye * 0.55, -k * 0.12 + ey - eye / 2 + eye * 0.1, eye * 0.3, eye * 0.3);
      ctx.fillRect(k * 0.3 + ex - eye / 2 + eye * 0.55, -k * 0.12 + ey - eye / 2 + eye * 0.1, eye * 0.3, eye * 0.3);
      ctx.fillStyle = mask.eye;
      if (kids) {
        ctx.fillRect(-k * 0.3, k * 0.14, k * 0.08, k * 0.08); ctx.fillRect(k * 0.22, k * 0.14, k * 0.08, k * 0.08);
        ctx.fillRect(-k * 0.22, k * 0.22, k * 0.44, k * 0.08);
      } else for (let i = -2; i <= 2; i++) if (i % 2 === 0) ctx.fillRect(i * k * 0.12 - k * 0.05, k * 0.22, k * 0.1, k * 0.1);
      const spr = { canvas: c, pad, size };
      if (Object.keys(this.sprites).length > 40) this.sprites = {}; // nunca cresce sem limite
      this.sprites[key] = spr;
      return spr;
    }
    drawPlayer(cx, cy) {
      const ctx = this.ctx, s = this.tile, p = this.player, mask = this.mask();
      let sx = 1, sy = 1, dx = 0, dy = 0;
      if (p.moving) {
        // estica no eixo do movimento (sobe rápido nos primeiros 50 ms)
        const k = FX.stretch * p.stretch;
        if (p.dir[0]) { sx = 1 + k; sy = 1 - k * 0.6; } else { sy = 1 + k; sx = 1 - k * 0.6; }
      } else if (p.squash > 0 && p.bumpDir) {
        // achata contra a parede, ancorado na face da parede; libera com leve "rebote"
        const e = p.squash * p.squash, k = FX.squash * e;
        const d = p.bumpDir;
        if (d[0]) { sx = 1 - k; sy = 1 + k * 0.8; } else { sy = 1 - k; sx = 1 + k * 0.8; }
        dx = d[0] * k * s * 0.4; dy = d[1] * k * s * 0.4;
      }
      const k = s * 0.8;
      ctx.save(); ctx.translate(cx + dx, cy + dy); ctx.scale(sx, sy);
      if (p.invul > 0 && Math.floor(this.t * 20) % 2 === 0) ctx.globalAlpha = 0.4;
      ctx.shadowColor = mask.color; ctx.shadowBlur = 12;
      ctx.fillStyle = mask.color; ctx.fillRect(-k / 2, -k / 2, k, k);
      ctx.shadowBlur = 0;
      // detalhes da máscara
      ctx.fillStyle = shade(mask.color, 0.75);
      ctx.fillRect(-k / 2, k * 0.3, k, k * 0.2); // queixo
      ctx.fillRect(-k * 0.08, -k / 2, k * 0.16, k * 0.25); // testa
      // olhos seguem a direção
      const ex = p.face[0] * k * 0.08, ey = p.face[1] * k * 0.08;
      const eye = k * 0.2;
      ctx.fillStyle = mask.eye;
      ctx.fillRect(-k * 0.3 + ex - eye / 2, -k * 0.12 + ey - eye / 2, eye, eye);
      ctx.fillRect(k * 0.3 + ex - eye / 2, -k * 0.12 + ey - eye / 2, eye, eye);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-k * 0.3 + ex - eye / 2 + eye * 0.55, -k * 0.12 + ey - eye / 2 + eye * 0.1, eye * 0.3, eye * 0.3);
      ctx.fillRect(k * 0.3 + ex - eye / 2 + eye * 0.55, -k * 0.12 + ey - eye / 2 + eye * 0.1, eye * 0.3, eye * 0.3);
      // boca: sorriso no modo lúdico, dentes no modo clássico
      ctx.fillStyle = mask.eye;
      if (this.kids()) {
        ctx.fillRect(-k * 0.3, k * 0.14, k * 0.08, k * 0.08); ctx.fillRect(k * 0.22, k * 0.14, k * 0.08, k * 0.08);
        ctx.fillRect(-k * 0.22, k * 0.22, k * 0.44, k * 0.08);
      } else for (let i = -2; i <= 2; i++) if (i % 2 === 0) ctx.fillRect(i * k * 0.12 - k * 0.05, k * 0.22, k * 0.1, k * 0.1);
      ctx.restore();
      if (p.shield > 0) {
        ctx.strokeStyle = rgba('#8cf5ff', 0.7 + 0.3 * Math.sin(this.t * 8)); ctx.lineWidth = 2;
        ctx.shadowColor = '#8cf5ff'; ctx.shadowBlur = 10;
        ctx.strokeRect(cx - k * 0.68, cy - k * 0.68, k * 1.36, k * 1.36); ctx.shadowBlur = 0;
      }
      if (p.magnet > 0) {
        ctx.strokeStyle = rgba('#ff4fa3', 0.35); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, 2.2 * s + Math.sin(this.t * 5) * 3, 0, Math.PI * 2); ctx.stroke();
      }
    }
    drawHint(cx, cy, d) {
      const ctx = this.ctx, s = this.tile;
      const bob = Math.sin(this.t * 6) * s * 0.15;
      const dist = s * 1.1 + bob;
      ctx.save(); ctx.translate(cx + d[0] * dist, cy + d[1] * dist); ctx.rotate(Math.atan2(d[1], d[0]));
      ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 12; ctx.fillStyle = '#ffffff';
      const a = s * 0.42;
      ctx.beginPath(); ctx.moveTo(a * 0.6, 0); ctx.lineTo(-a * 0.3, -a * 0.55); ctx.lineTo(-a * 0.05, 0); ctx.lineTo(-a * 0.3, a * 0.55); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    drawBarrier(ox, oy) {
      const ctx = this.ctx, s = this.tile, f = this.fluid;
      const top = oy + f.y * s;
      if (top > this.H + s * 2) return;
      // pisca entre a cor predominante do trecho e branco
      const col = this.world.color;
      const blink = Math.floor(this.t * 7) % 2 === 0;
      const c1 = blink ? '#ffffff' : col;
      // área abaixo: véu escuro na cor
      ctx.fillStyle = rgba(col, 0.78); ctx.fillRect(0, top, this.W, this.H - top);
      ctx.fillStyle = rgba('#000000', 0.45); ctx.fillRect(0, top + s * 0.6, this.W, this.H - top);
      // listras de energia descendo
      ctx.fillStyle = rgba('#ffffff', 0.12);
      for (let yy = top + s * 0.6 + ((this.t * 60) % (s * 1.2)); yy < this.H; yy += s * 1.2) ctx.fillRect(0, yy, this.W, 3);
      // a barra em si, com brilho forte
      ctx.shadowColor = c1; ctx.shadowBlur = 26;
      ctx.fillStyle = c1; ctx.fillRect(0, top - s * 0.25, this.W, s * 0.5);
      ctx.shadowBlur = 0;
      // dentes/serrilha na borda superior
      ctx.fillStyle = c1;
      const n = Math.ceil(this.W / (s * 0.5));
      for (let i = 0; i < n; i++) { if ((i + (blink ? 1 : 0)) % 2) ctx.fillRect(i * s * 0.5, top - s * 0.45, s * 0.5, s * 0.2); }
      // aviso quando está perto
      const gap = f.y - this.player.y;
      if (gap < 5 && this.state === 'play') {
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(this.t * 12);
        F.text(ctx, 'SOBE!', this.W / 2, top - s * 1.4, this.ui, '#ffffff', 'center', { shadow: '#000' });
        ctx.globalAlpha = 1;
      }
    }
    drawFluid(ox, oy) {
      if (this.fluid.type === 'barrier') return this.drawBarrier(ox, oy);
      const ctx = this.ctx, s = this.tile, f = this.fluid;
      const top = oy + f.y * s;
      if (top > this.H + s) return;
      const lava = f.type === 'lava';
      const c1 = lava ? '#ff6a1a' : '#2a7dff', c2 = lava ? '#ffd23f' : '#8cf5ff';
      ctx.fillStyle = rgba(c1, 0.92);
      ctx.beginPath(); ctx.moveTo(0, this.H);
      for (let x = 0; x <= this.W; x += 4) {
        const yy = top + Math.sin(x / s * 1.5 + this.t * 4) * s * 0.12 + Math.sin(x / s * 0.7 - this.t * 2.5) * s * 0.08;
        ctx.lineTo(x, yy);
      }
      ctx.lineTo(this.W, this.H); ctx.closePath(); ctx.fill();
      ctx.shadowColor = c2; ctx.shadowBlur = 20;
      ctx.fillStyle = c2; ctx.fillRect(0, top - 2, this.W, 3); ctx.shadowBlur = 0;
      // bolhas
      ctx.fillStyle = rgba(c2, 0.6);
      for (let i = 0; i < 8; i++) {
        const bx = ((i * 97 + this.t * 20 * (1 + i % 3)) % (this.W + 40)) - 20;
        const by = top + 10 + ((i * 53 + this.t * 30) % 60);
        if (by < this.H) ctx.fillRect(bx, by, 4, 4);
      }
      // brilho na borda
      const g = ctx.createLinearGradient(0, top - s * 2, 0, top);
      g.addColorStop(0, rgba(c1, 0)); g.addColorStop(1, rgba(c1, 0.35));
      ctx.fillStyle = g; ctx.fillRect(0, top - s * 2, this.W, s * 2);
    }

    // ------------------------------------------------------------ HUD
    renderHud() {
      const ctx = this.ctx, u = this.ui, pad = 8;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, this.W, u * 7 + pad * 2 + 4);
      const label = this.mode === 'arcade' ? 'ARCADE ' + this.world.name.split(' ')[0] : this.level.boss ? (this.level.boss.master ? 'MESTRE' : 'CHEFAO') : 'FASE ' + this.level.n;
      F.text(ctx, label, pad, pad, u, this.world.accent, 'left');
      const sc = this.mode === 'arcade' ? this.arcadeScore() : this.score;
      F.text(ctx, String(sc).padStart(6, '0'), this.W / 2, pad, u, '#ffffff', 'center');
      // moedas da fase (estrelas)
      if (this.mode === 'stage') {
        const stars = '*'.repeat(this.levelCoins) + '.'.repeat(Math.max(0, 3 - this.levelCoins));
        F.text(ctx, stars, this.W / 2, pad + u * 8 + 2, Math.max(1, u - 1), '#ffd23f', 'center');
      } else {
        F.text(ctx, Math.floor(this.height) + 'M', this.W / 2, pad + u * 8 + 2, Math.max(1, u - 1), '#ffd23f', 'center');
      }
      if (this.boss && !this.boss.dead) this.drawBossHud();
      // pausa
      this.buttons = this.buttons.filter((b) => b.id !== 'pause');
      const bw = u * 7 + pad;
      this.buttons.push({ id: 'pause', x: this.W - bw - pad, y: 0, w: bw + pad, h: u * 7 + pad * 2, fn: () => this.togglePause() });
      F.text(ctx, '‖', this.W - pad, pad, u, '#ffffff', 'right');
      // tempo
      if (this.mode === 'stage') {
        const t = this.elapsed; const txt = Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
        F.text(ctx, txt, pad, pad + u * 8 + 2, Math.max(1, u - 1), '#aaaaaa', 'left');
      }
      // dica inicial
      if (this.hintTimer > 0 && !this.started) {
        const a = clamp(this.hintTimer, 0, 1);
        ctx.globalAlpha = a * (0.6 + 0.4 * Math.sin(this.t * 5));
        F.text(ctx, 'DESLIZE PARA MOVER', this.W / 2, this.H * 0.72, u, '#ffffff', 'center', { shadow: '#000' });
        const arrows = '← ↑ ↓ →';
        F.text(ctx, arrows, this.W / 2, this.H * 0.72 + u * 10, u, this.world.accent, 'center');
        ctx.globalAlpha = 1;
      }
      if (this.toast) {
        ctx.globalAlpha = clamp(this.toast.t * 2, 0, 1);
        F.text(ctx, this.toast.msg, this.W / 2, this.H * 0.3 - (1.2 - this.toast.t) * 30, u, '#ffd23f', 'center', { shadow: '#000' });
        ctx.globalAlpha = 1;
      }
      if (this.drawItemsHud) this.drawItemsHud();
      if (this.drawWbHud) this.drawWbHud();
    }

    // ------------------------------------------------------------ overlays
    overlay(alpha) { this.ctx.fillStyle = `rgba(3,2,8,${alpha})`; this.ctx.fillRect(0, 0, this.W, this.H); }
    drawButton(label, cx, cy, w, fn, color, id) {
      const ctx = this.ctx, u = this.ui, h = u * 7 + 20;
      const x = cx - w / 2, y = cy - h / 2;
      ctx.fillStyle = rgba(color || this.world ? (color || this.world.color) : '#c065d8', 0.18);
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = color || (this.world ? this.world.color : '#c065d8'); ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      F.text(ctx, label, cx, cy - u * 3.5, u, '#ffffff', 'center');
      if (!this.buttons.find((b) => b.id === id)) this.buttons.push({ id, x, y, w, h, fn });
    }
    renderPause() {
      this.overlay(0.75);
      const u = this.ui, cx = this.W / 2, cy = this.H / 2;
      F.text(this.ctx, 'PAUSA', cx, cy - u * 40, u * 2, '#ffffff', 'center', { shadow: this.world.color });
      const w = Math.min(this.W * 0.8, 320);
      this.drawButton('CONTINUAR', cx, cy - u * 12, w, () => this.togglePause(), null, 'p1');
      this.drawButton('REINICIAR', cx, cy + u * 4, w, () => { this.restart(); }, null, 'p2');
      this.drawButton((this.save.music ? '♪ MUSICA: SIM' : '♪ MUSICA: NAO'), cx, cy + u * 20, w, () => { this.save.music = !this.save.music; this.audio.setMusic(this.save.music); Save.write(); this.buttons = []; }, null, 'p3');
      this.drawButton((this.save.sfx ? 'SONS: SIM' : 'SONS: NAO'), cx, cy + u * 36, w, () => { this.save.sfx = !this.save.sfx; this.audio.setSfx(this.save.sfx); Save.write(); this.buttons = []; }, null, 'p4');
      this.drawButton('⌂ MENU', cx, cy + u * 52, w, () => { this.audio.stopMusic(); this.goto('worlds'); }, null, 'p5');
    }
    renderDead() {
      const a = clamp((this.t - this.deadAt) * 2, 0, 0.7);
      this.overlay(a);
      if (this.t - this.deadAt < 0.4) return;
      const u = this.ui, cx = this.W / 2, cy = this.H / 2;
      const kids = this.kids();
      F.text(this.ctx, kids ? 'OPA!' : 'VOCE MORREU', cx, cy - u * 20, u * 2, kids ? '#ffd23f' : '#ff3b3b', 'center', { shadow: kids ? '#7a3a00' : '#400' });
      const causes = kids
        ? { espinho: 'CUIDADO COM OS ESPINHOS', morcego: 'O MORCEGO TE PEGOU', flecha: 'A FLECHA TE ACERTOU', lava: 'A LAVA CHEGOU PERTO', agua: 'A AGUA SUBIU', barreira: 'A BARREIRA TE ALCANCOU', chefao: 'O CHEFAO TE PEGOU! PEGUE O NUCLEO AZUL PRIMEIRO' }
        : { espinho: 'ESPINHOS!', morcego: 'UM MORCEGO TE PEGOU', flecha: 'ATINGIDO POR UMA FLECHA', lava: 'A LAVA TE ALCANCOU', agua: 'VOCE SE AFOGOU', barreira: 'A BARREIRA TE PEGOU', chefao: 'O CHEFAO TE ESMAGOU' };
      F.text(this.ctx, causes[this.deathCause] || '', cx, cy - u * 2, u, '#ffffff', 'center');
      if (kids) F.text(this.ctx, (this.deathMsg || '').toUpperCase().replace(/[.!]/g, ''), cx, cy + u * 6, Math.max(1, u - 1), '#8cf5ff', 'center');
      if (Math.floor(this.t * 2) % 2 === 0) F.text(this.ctx, 'TOQUE PARA TENTAR DE NOVO', cx, cy + u * 16, u, '#ffd23f', 'center');
      const w = Math.min(this.W * 0.8, 320);
      this.drawButton('⌂ MENU', cx, cy + u * 36, w, () => { this.audio.stopMusic(); this.goto('levels'); }, null, 'd1');
    }
    renderWin() {
      const k = clamp((this.t - this.winAt) * 1.5, 0, 1);
      this.overlay(0.75 * k);
      if (k < 0.3) return;
      const u = this.ui, cx = this.W / 2, cy = this.H / 2;
      const bossWin = !!this.level.boss;
      F.text(this.ctx, bossWin ? (this.level.boss.master ? 'CHEFAO MESTRE' : 'CHEFAO ' + this.level.boss.name) : 'FASE ' + this.level.n, cx, cy - u * 44, Math.max(1, bossWin ? u - 1 : u), this.world.accent, 'center');
      const title = bossWin ? (this.level.boss.master ? 'VOCE ZEROU!' : 'DERROTADO!') : (this.winTitle || 'COMPLETA!');
      F.text(this.ctx, title, cx, cy - u * 32, u * 2, bossWin ? '#ffd23f' : '#ffffff', 'center', { shadow: this.world.color });
      // estrelas animadas
      for (let i = 0; i < 3; i++) {
        const shown = this.t - this.winAt > 0.6 + i * 0.35;
        const got = i < this.levelCoins && shown;
        if (shown && got && !this['starSfx' + i]) { this['starSfx' + i] = true; this.audio.star(i); }
        F.text(this.ctx, '*', cx + (i - 1) * u * 14, cy - u * 14, u * 2, got ? '#ffd23f' : '#333344', 'center');
      }
      F.text(this.ctx, 'PONTOS ' + this.finalScore, cx, cy + u * 4, u, '#ffffff', 'center');
      const t = this.elapsed; const txt = Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
      F.text(this.ctx, 'TEMPO ' + txt + '  MOV ' + this.moves + '/' + this.level.par, cx, cy + u * 14, Math.max(1, u - 1), '#aaaaaa', 'center');
      if (this.newWorld) F.text(this.ctx, 'NOVO MUNDO DESBLOQUEADO!', cx, cy + u * 24, Math.max(1, u - 1), '#8cf5ff', 'center');
      if (this.chest && this.drawChest) this.drawChest(cx, cy + u * 24 + (this.newWorld ? u * 8 : 0));
      const w = Math.min(this.W * 0.8, 320);
      const last = this.levelIndex + 1 >= root.LEVELS.length;
      this.drawButton(last ? 'FIM! VOLTAR' : 'PROXIMA ▶', cx, cy + u * 38, w, () => this.nextLevel(), null, 'w1');
      this.drawButton('↻ REPETIR', cx - w / 4 - 4, cy + u * 54, w / 2 - 8, () => this.restart(), null, 'w2');
      this.drawButton('⌂ MENU', cx + w / 4 + 4, cy + u * 54, w / 2 - 8, () => { this.audio.stopMusic(); this.goto('levels'); }, null, 'w3');
    }
    renderArcadeOver() {
      const a = clamp((this.t - this.deadAt) * 2, 0, 0.75);
      this.overlay(a);
      if (this.t - this.deadAt < 0.4) return;
      const u = this.ui, cx = this.W / 2, cy = this.H / 2;
      F.text(this.ctx, 'FIM DE JOGO', cx, cy - u * 36, u * 2, '#ff3b3b', 'center', { shadow: '#400' });
      const causa = { espinho: 'ESPINHOS', morcego: 'MORCEGO', flecha: 'FLECHA', barreira: 'A BARREIRA TE PEGOU' }[this.deathCause] || '';
      F.text(this.ctx, causa, cx, cy - u * 24, Math.max(1, u - 1), this.world.accent, 'center');
      F.text(this.ctx, 'ALTURA ' + Math.floor(this.height) + 'M', cx, cy - u * 14, u, '#ffffff', 'center');
      F.text(this.ctx, 'PONTOS ' + this.arcadeScore(), cx, cy - u * 4, u, '#ffffff', 'center');
      F.text(this.ctx, (this.newBest ? 'NOVO RECORDE! ' : 'RECORDE ') + this.save.arcadeBest, cx, cy + u * 8, u, '#ffd23f', 'center');
      const w = Math.min(this.W * 0.8, 320);
      this.drawButton('↻ JOGAR DE NOVO', cx, cy + u * 28, w, () => this.startArcade(), null, 'a1');
      this.drawButton('⌂ MENU', cx, cy + u * 44, w, () => { this.audio.stopMusic(); this.goto('title'); }, null, 'a2');
    }

    // ------------------------------------------------------------ menus
    renderTitle() {
      const ctx = this.ctx, u = this.ui, cx = this.W / 2;
      this.world = root.WORLDS[0];
      this.camY = this.t * 0.8;
      this.renderBackdrop('#c065d8', 'keyart');
      // labirinto decorativo rolando ao fundo
      this.renderTitleMaze();
      const ty = this.H * 0.2;
      const bob = Math.sin(this.t * 2) * 4;
      // máscara grande
      this.drawBigMask(cx, ty + bob, u * 16);
      F.text(ctx, 'TUMBA DA', cx, ty + u * 24, u * 2, '#ffffff', 'center', { shadow: '#c065d8' });
      F.text(ctx, 'MASCARA', cx, ty + u * 24 + u * 18, u * 3, '#ffd23f', 'center', { shadow: '#7a3a00' });
      const w = Math.min(this.W * 0.8, 320);
      const by = this.H * 0.56;
      this.drawButton('▶ AVENTURA', cx, by, w, () => this.goto('worlds'), '#c065d8', 't1');
      this.drawButton('ARCADE', cx, by + u * 16, w, () => { this.startArcade(); }, '#ff3b3b', 't2');
      this.drawButton('LOJA  $' + this.save.coins, cx, by + u * 32, w, () => this.goto('shop'), '#ffd23f', 't3');
      this.drawButton('⚙ OPCOES', cx, by + u * 48, w, () => this.goto('settings'), '#8cf5ff', 't4');
      this.drawButton(this.kids() ? '\u2665 MODO: LUDICO' : 'MODO: CLASSICO', cx, by + u * 64, w, () => { this.save.kids = !this.save.kids; Save.write(); this.buttons = []; if (this.save.kids) this.speak('Modo lúdico ligado!'); }, this.kids() ? '#ff4fa3' : '#888899', 't5');
      if (!this.audio.ready() && Math.floor(this.t * 2) % 2 === 0) F.text(ctx, '\u266A TOQUE PARA ATIVAR O SOM', cx, this.H - u * 27 - 12, Math.max(1, u - 1), '#ffd23f', 'center');
      if (this.drawStickerBoard && this.save.wbCfg && this.save.wbCfg.stickers && this.save.wbCfg.stickers.length) this.drawStickerBoard(cx, by + u * 76);
      F.text(ctx, 'RECORDE ARCADE ' + this.save.arcadeBest + '   FASES ' + Math.min(this.save.unlocked - 1, root.LEVELS.length) + '/' + root.LEVELS.length, cx, this.H - u * 9 - 8, Math.max(1, u - 1), '#888899', 'center');
      this.buttons = this.buttons.filter((b) => b.id !== 'pause');
    }
    renderTitleMaze() {
      const ctx = this.ctx, s = this.tile;
      if (!this.titleGrid) { const r = M.generate({ h: 60, wallDensity: 0.25, spikes: 0, coins: 6, bats: 4, minMoves: 3 }, M.rng(7)); this.titleGrid = new Grid(r.rows); }
      const oy = -((this.camY * s) % (60 * s));
      ctx.globalAlpha = this.bgImage('keyart') ? 0.08 : 0.18;
      for (let rep = 0; rep < 2; rep++) for (let y = 0; y < 60; y++) for (let x = 0; x < COLS; x++) {
        const py = oy + (y + rep * 60) * s; if (py < -s || py > this.H) continue;
        const c = this.titleGrid.get(x, y);
        if (c === T.WALL) this.drawWall(this.ox + x * s, py, x, y, root.WORLDS[0]);
        else if (c === T.DOT) { ctx.fillStyle = root.WORLDS[0].accent; ctx.fillRect(this.ox + x * s + s * 0.43, py + s * 0.43, s * 0.14, s * 0.14); }
      }
      ctx.globalAlpha = 1;
    }
    drawBigMask(cx, cy, k) {
      const ctx = this.ctx, mask = this.mask();
      ctx.save(); ctx.translate(cx, cy);
      ctx.shadowColor = mask.color; ctx.shadowBlur = 30;
      ctx.fillStyle = mask.color; ctx.fillRect(-k / 2, -k / 2, k, k); ctx.shadowBlur = 0;
      ctx.fillStyle = shade(mask.color, 0.75); ctx.fillRect(-k / 2, k * 0.3, k, k * 0.2); ctx.fillRect(-k * 0.08, -k / 2, k * 0.16, k * 0.25);
      const eye = k * 0.2, blink = Math.sin(this.t * 1.3) > 0.97 ? 0.15 : 1;
      ctx.fillStyle = mask.eye;
      ctx.fillRect(-k * 0.3 - eye / 2, -k * 0.12 - eye / 2, eye, eye * blink); ctx.fillRect(k * 0.3 - eye / 2, -k * 0.12 - eye / 2, eye, eye * blink);
      ctx.fillStyle = '#fff'; if (blink === 1) { ctx.fillRect(-k * 0.3 + eye * 0.05, -k * 0.12 - eye * 0.4, eye * 0.3, eye * 0.3); ctx.fillRect(k * 0.3 + eye * 0.05, -k * 0.12 - eye * 0.4, eye * 0.3, eye * 0.3); }
      ctx.fillStyle = mask.eye;
      if (this.kids()) { ctx.fillRect(-k * 0.3, k * 0.14, k * 0.08, k * 0.08); ctx.fillRect(k * 0.22, k * 0.14, k * 0.08, k * 0.08); ctx.fillRect(-k * 0.22, k * 0.22, k * 0.44, k * 0.08); }
      else for (let i = -2; i <= 2; i += 2) ctx.fillRect(i * k * 0.12 - k * 0.05, k * 0.22, k * 0.1, k * 0.1);
      ctx.restore();
    }
    renderWorlds() {
      const ctx = this.ctx, u = this.ui, cx = this.W / 2;
      this.renderBackdrop('#3f7dff');
      F.text(ctx, 'ESCOLHA O MUNDO', cx, 16, u * 1.5 | 0 || u, '#ffffff', 'center', { shadow: '#3f7dff' });
      const w = Math.min(this.W * 0.9, 380), h = u * 7 + 26;
      const top = 16 + u * 14, gap = 10;
      root.WORLDS.forEach((wd, i) => {
        const unlocked = this.save.unlocked > i * 10;
        const y = top + i * (h + gap);
        const x = cx - w / 2;
        ctx.fillStyle = rgba(wd.color, unlocked ? 0.22 : 0.06); ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = unlocked ? wd.color : '#333344'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        // mini parede decorativa
        const s = this.tile; const save = this.tile; this.tile = Math.min(h - 10, 28);
        this.drawWall(x + 8, y + (h - this.tile) / 2, 0, 0, unlocked ? wd : { color: '#333344' }); this.tile = save; void s;
        F.text(ctx, (i + 1) + '. ' + wd.name, x + 48, y + 9, u, unlocked ? '#ffffff' : '#555566', 'left');
        const lv = this.worldLevels(i); let stars = 0; for (const idx of lv) stars += this.save.stars[idx] || 0;
        F.text(ctx, unlocked ? '* ' + stars + '/' + lv.length * 3 + (wd.master ? '  CHEFAO FINAL' : '  9 FASES + CHEFAO') : 'BLOQUEADO', x + 48, y + 9 + u * 8, Math.max(1, u - 1), unlocked ? '#ffd23f' : '#555566', 'left');
        if (wd.fluid) F.text(ctx, wd.fluid === 'lava' ? 'LAVA' : 'AGUA', x + w - 10, y + 9, Math.max(1, u - 1), wd.fluid === 'lava' ? '#ff6a1a' : '#8cf5ff', 'right');
        if (unlocked && !this.buttons.find((b) => b.id === 'w' + i)) this.buttons.push({ id: 'w' + i, x, y, w, h, fn: () => { this.worldPage = i; this.goto('levels'); } });
      });
      this.drawButton('< VOLTAR', cx, this.H - u * 7 - 18, Math.min(this.W * 0.6, 220), () => this.goto('title'), '#888899', 'back');
    }
    // ---- mapa de mundo (estilo Mario): caminho, nós das fases, personagem e prévia ----
    worldLevels(w) { return root.LEVELS.map((L, i) => [L, i]).filter(([L]) => L.world === w).map(([, i]) => i); }
    mapInit() {
      const idxs = this.worldLevels(this.worldPage);
      // seleciona a última fase desbloqueada do mundo (ou a última jogada)
      let sel = 0;
      idxs.forEach((idx, i) => { if (this.save.unlocked > idx) sel = i; });
      if (this.levelIndex >= 0 && idxs.includes(this.levelIndex)) sel = idxs.indexOf(this.levelIndex);
      this.sel = sel;
      const pos = this.mapNodePos(sel, idxs.length);
      this.token = { x: pos.x, y: pos.y };
      this.thumbs = this.thumbs || {};
    }
    mapPanelH() { return clamp(Math.round(this.H * 0.3), 150, 240); }
    mapNodePos(i, count) {
      const u = this.ui, top = 16 + u * 24, bottom = this.H - this.mapPanelH() - 14 - u * 6;
      if (count <= 1) return { x: this.W / 2, y: (top + bottom) / 2 };
      const t = i / (count - 1);
      const y = bottom - t * (bottom - top);
      const x = this.W / 2 + Math.sin(i * 1.9 + 0.6) * Math.min(this.W, 420) * 0.3;
      return { x, y };
    }
    mapMove(delta) {
      const idxs = this.worldLevels(this.worldPage);
      const n = clamp(this.sel + delta, 0, idxs.length - 1);
      if (n === this.sel) return;
      if (this.save.unlocked <= idxs[n]) { this.audio.bump(); this.toastMsg('BLOQUEADO'); return; }
      this.sel = n; this.audio.click();
    }
    mapEnter() {
      const idxs = this.worldLevels(this.worldPage);
      const idx = idxs[this.sel];
      if (this.save.unlocked > idx) this.startLevel(idx);
    }
    // miniatura da fase (cache)
    thumb(idx) {
      const L = root.LEVELS[idx];
      const k = idx + '|' + this.ui;
      if (this.thumbs[k]) return this.thumbs[k];
      const wd = root.WORLDS[L.world];
      const cell = clamp(Math.floor(Math.min(120 / COLS, (this.mapPanelH() - 36) / L.rows.length)), 2, 6);
      const c = document.createElement('canvas'); c.width = COLS * cell; c.height = L.rows.length * cell;
      const x = c.getContext('2d');
      x.fillStyle = '#05030a'; x.fillRect(0, 0, c.width, c.height);
      for (let y = 0; y < L.rows.length; y++) for (let i = 0; i < COLS; i++) {
        const ch = L.rows[y][i]; let col = null, pad = 0;
        if (ch === T.WALL || ch in M.SHOOTERS) col = wd.color;
        else if (ch === T.DOT) { col = rgba(wd.accent, 0.8); pad = Math.max(0, cell / 2 - 1); }
        else if (ch === T.COIN) col = '#ffd23f';
        else if (ch === T.SPIKE) col = '#ffffff';
        else if (ch === T.SPAWN) col = '#ffd23f';
        else if (ch === T.EXIT) col = L.boss ? '#ff3b3b' : '#fff6c2';
        else if (ch === T.BAT_H || ch === T.BAT_V) col = '#b04cff';
        else if (ch === T.SHIELD || ch === T.FREEZE || ch === T.MAGNET) col = '#8cf5ff';
        if (col) { x.fillStyle = col; x.fillRect(i * cell + pad, y * cell + pad, cell - pad * 2, cell - pad * 2); }
      }
      if (L.boss) { // o chefe no corredor
        x.fillStyle = L.boss.master ? '#f0f0f0' : shade(wd.color, 0.8); x.fillRect(cell * 4.5, cell * 1.2, cell * 3, cell * 2.6);
        x.fillStyle = '#ff3b3b'; x.fillRect(cell * 5.2, cell * 2, cell * 0.6, cell * 0.6); x.fillRect(cell * 6.2, cell * 2, cell * 0.6, cell * 0.6);
      }
      this.thumbs[k] = c;
      return c;
    }
    renderLevels() {
      const ctx = this.ctx, u = this.ui, cx = this.W / 2;
      const wd = root.WORLDS[this.worldPage];
      const idxs = this.worldLevels(this.worldPage);
      const count = idxs.length;
      this.renderBackdrop(wd.color, 'bg-' + wd.id);
      F.text(ctx, wd.name, cx, 16, u * 1.5 | 0 || u, '#ffffff', 'center', { shadow: wd.color });
      F.text(ctx, 'DESLIZE PARA ESCOLHER  TOQUE PARA ENTRAR', cx, 16 + u * 12, Math.max(1, u - 1), '#888899', 'center');
      // caminho
      const pts = idxs.map((_, i) => this.mapNodePos(i, count));
      for (let i = 0; i + 1 < pts.length; i++) {
        const a = pts[i], b = pts[i + 1];
        const open = this.save.unlocked > idxs[i + 1];
        const n = Math.max(4, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / (u * 4)));
        for (let k = 1; k < n; k++) {
          const t = k / n, bx = lerp(a.x, b.x, t), by = lerp(a.y, b.y, t) + Math.sin(t * Math.PI) * -u * 3;
          ctx.fillStyle = open ? rgba(wd.accent, 0.9) : 'rgba(80,80,100,0.6)';
          const d = Math.max(2, u); ctx.fillRect(bx - d / 2, by - d / 2, d, d);
        }
      }
      // nós
      idxs.forEach((idx, i) => {
        const L = root.LEVELS[idx], pos = pts[i];
        const unlocked = this.save.unlocked > idx, done = this.save.unlocked > idx + 1 || (this.save.best[idx] || 0) > 0;
        const boss = !!L.boss;
        const r = boss ? u * 7 : u * 4.6;
        const selected = i === this.sel;
        if (selected) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pos.x, pos.y, r + 4 + Math.sin(this.t * 6) * 2, 0, Math.PI * 2); ctx.stroke(); }
        ctx.shadowColor = unlocked ? wd.color : '#000'; ctx.shadowBlur = unlocked ? 12 : 0;
        ctx.fillStyle = unlocked ? (done ? wd.color : shade(wd.color, 0.75)) : '#2a2a38';
        ctx.beginPath(); ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        ctx.strokeStyle = unlocked ? '#ffffff' : '#555566'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2); ctx.stroke();
        if (boss) {
          // carinha do chefe
          const k = r * 0.9; ctx.fillStyle = unlocked ? (L.boss.master ? '#f0f0f0' : shade(wd.color, 0.55)) : '#444455';
          ctx.fillRect(pos.x - k / 2, pos.y - k / 2, k, k);
          ctx.fillStyle = unlocked ? '#ff3b3b' : '#666677'; const e = k * 0.22;
          ctx.fillRect(pos.x - k * 0.28 - e / 2, pos.y - k * 0.1, e, e); ctx.fillRect(pos.x + k * 0.28 - e / 2, pos.y - k * 0.1, e, e);
          ctx.fillStyle = '#ffffff'; for (let q = -1; q <= 1; q++) ctx.fillRect(pos.x + q * k * 0.22 - k * 0.07, pos.y + k * 0.22, k * 0.14, k * 0.12);
        } else {
          F.text(ctx, String(i + 1), pos.x, pos.y - 3.5 * u, u, unlocked ? '#ffffff' : '#666677', 'center');
        }
        if (!unlocked) F.text(ctx, 'X', pos.x + r * 0.7, pos.y - r, Math.max(1, u - 1), '#ff3b3b', 'center');
        const st = this.save.stars[idx] || 0;
        if (unlocked && done) F.text(ctx, '*'.repeat(st) + '.'.repeat(3 - st), pos.x, pos.y + r + 3, Math.max(1, u - 1), '#ffd23f', 'center');
        if (!this.buttons.find((b) => b.id === 'n' + i)) this.buttons.push({ id: 'n' + i, x: pos.x - r - 8, y: pos.y - r - 8, w: r * 2 + 16, h: r * 2 + 16, fn: () => {
          if (!unlocked) { this.audio.bump(); this.toastMsg('COMPLETE A FASE ANTERIOR'); return; }
          if (this.sel === i) this.mapEnter(); else this.sel = i;
        } });
      });
      // personagem andando pelo mapa
      const target = pts[this.sel];
      this.token.x = lerp(this.token.x, target.x, 0.15); this.token.y = lerp(this.token.y, target.y, 0.15);
      const hop = Math.abs(Math.sin(this.t * 8)) * (Math.hypot(target.x - this.token.x, target.y - this.token.y) > 3 ? u * 3 : u * 0.6);
      this.drawBigMask(this.token.x, this.token.y - (root.LEVELS[idxs[this.sel]].boss ? u * 9 : u * 7) - hop, u * 5);
      // painel de prévia
      this.renderPreview(idxs[this.sel], wd);
      this.drawButton('<', 20 + u * 4, 16 + u * 3.5, u * 8 + 16, () => this.goto('worlds'), '#888899', 'back');
      if (this.toast) { ctx.globalAlpha = clamp(this.toast.t * 2, 0, 1); F.text(ctx, this.toast.msg, cx, this.H * 0.4, u, '#ffd23f', 'center', { shadow: '#000' }); ctx.globalAlpha = 1; this.toast.t -= 1 / 60; if (this.toast.t <= 0) this.toast = null; }
    }
    renderPreview(idx, wd) {
      const ctx = this.ctx, u = this.ui, L = root.LEVELS[idx];
      const ph = this.mapPanelH(), pw = Math.min(this.W - 16, 420), px = this.W / 2 - pw / 2, py = this.H - ph - 8;
      ctx.fillStyle = 'rgba(3,2,8,0.85)'; ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = wd.color; ctx.lineWidth = 2; ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
      const unlocked = this.save.unlocked > idx;
      // miniatura
      const th = this.thumb(idx);
      const scale = Math.min((pw * 0.36) / th.width, (ph - 20) / th.height);
      const tw = th.width * scale, tht = th.height * scale;
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = unlocked ? 1 : 0.35;
      ctx.drawImage(th, px + 10, py + 10 + ((ph - 20) - tht) / 2, tw, tht);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = rgba(wd.accent, 0.5); ctx.strokeRect(px + 10, py + 10 + ((ph - 20) - tht) / 2, tw, tht);
      // textos
      const tx = px + 24 + pw * 0.36, lineH = u * 7 + 4;
      let y = py + 12;
      const small = Math.max(1, u - 1);
      if (L.boss) { F.text(ctx, L.boss.master ? 'CHEFAO MESTRE' : 'CHEFAO DO MUNDO', tx, y, small, '#ff3b3b', 'left'); y += lineH * 0.8; F.text(ctx, L.boss.name, tx, y, small, '#ffffff', 'left'); }
      else F.text(ctx, 'FASE ' + L.n, tx, y, u, '#ffffff', 'left');
      y += lineH;
      if (!unlocked) { F.text(ctx, 'BLOQUEADA', tx, y, small, '#ff3b3b', 'left'); y += lineH; F.text(ctx, 'COMPLETE A ANTERIOR', tx, y, small, '#888899', 'left'); return; }
      const st = this.save.stars[idx] || 0;
      F.text(ctx, '*'.repeat(st) + '.'.repeat(3 - st) + '  ' + (this.save.best[idx] ? 'MELHOR ' + this.save.best[idx] : 'NOVA'), tx, y, small, '#ffd23f', 'left'); y += lineH;
      const txt = L.rows.join('');
      const spikes = (txt.match(/x/g) || []).length, bats = (txt.match(/[bv]/g) || []).length, shots = (txt.match(/[dulr]/g) || []).length, traps = (txt.match(/t/g) || []).length;
      const hz = [];
      if (spikes) hz.push(spikes + ' ESPINHOS'); if (traps) hz.push(traps + ' ESPINHOS MOVEIS'); if (bats) hz.push(bats + ' MORCEGOS'); if (shots) hz.push(shots + ' FLECHAS');
      if (L.fluid) hz.push(L.fluid.type === 'lava' ? 'LAVA SOBE' : 'AGUA SOBE');
      if (L.boss) hz.push('VIDA ' + L.boss.hp);
      F.text(ctx, hz.length ? hz.slice(0, 2).join('  ') : 'SEM PERIGOS', tx, y, small, '#ffb0b0', 'left'); y += lineH * 0.8;
      if (hz.length > 2) { F.text(ctx, hz.slice(2).join('  '), tx, y, small, '#ffb0b0', 'left'); y += lineH * 0.8; }
      F.text(ctx, 'ALTURA ' + (L.rows.length - 2) + '  PAR ' + L.par + ' MOV', tx, y, small, '#888899', 'left'); y += lineH;
      if (L.boss) F.text(ctx, 'PEGUE O NUCLEO AZUL E BATA NELE', tx, y, small, '#8cf5ff', 'left');
      this.drawButton(L.boss ? 'ENFRENTAR ▶' : 'JOGAR ▶', px + pw - u * 12 - 24, py + ph - (u * 7 + 20) / 2 - 8, u * 24 + 24, () => this.mapEnter(), wd.color, 'play');
    }
    renderSettings() {
      const ctx = this.ctx, u = this.ui, cx = this.W / 2;
      this.renderBackdrop('#8cf5ff');
      F.text(ctx, 'OPCOES', cx, 16, u * 1.5 | 0 || u, '#ffffff', 'center', { shadow: '#0f4d52' });
      const w = Math.min(this.W * 0.85, 340);
      const top = 16 + u * 18, step = Math.min(u * 7 + 26, (this.H - 16 - u * 18 - u * 7 - 100) / 9);
      const opts = [
        ['MODO LUDICO', 'kids', null],
        ['VOZ (PT-BR)', 'voice', () => { if (this.save.voice) this.speak('Oi! Vamos jogar?'); }],
        ['SETA DE DICA', 'hints', null],
        ['♪ MUSICA', 'music', () => this.audio.setMusic(this.save.music)],
        ['SONS', 'sfx', () => this.audio.setSfx(this.save.sfx)],
        ['EFEITO CRT', 'crt', null],
        ['TREMER TELA', 'shake', null],
      ];
      opts.forEach(([label, key, after], i) => {
        this.drawButton(label + ': ' + (this.save[key] ? 'SIM' : 'NAO'), cx, top + i * step, w, () => { this.save[key] = !this.save[key]; if (after) after(); Save.write(); this.buttons = []; }, '#8cf5ff', 's' + i);
      });
      this.drawButton('\u2600 PAUSA SAUDAVEL (PAIS)', cx, top + opts.length * step + 10, w, () => this.wbOpenGate(() => { this.state = 'parent'; this.buttons = []; }), '#ffd23f', 'wb');
      this.drawButton('APAGAR PROGRESSO', cx, top + (opts.length + 1) * step + 10, w, () => {
        if (this.confirmReset) { localStorage.removeItem(SAVE_KEY); this.save = Save.load(); this.confirmReset = false; this.buttons = []; this.toastMsg('APAGADO'); }
        else { this.confirmReset = true; this.buttons = []; }
      }, this.confirmReset ? '#ff3b3b' : '#888899', 'reset');
      if (this.confirmReset) F.text(ctx, 'TOQUE DE NOVO PARA CONFIRMAR', cx, top + (opts.length + 1) * step + 10 + u * 8, Math.max(1, u - 1), '#ff3b3b', 'center');
      F.text(ctx, this.audio.ready() ? 'AUDIO: ATIVO' : 'AUDIO: BLOQUEADO PELO NAVEGADOR. TOQUE DE NOVO.', cx, this.H - u * 46, Math.max(1, u - 1), this.audio.ready() ? '#7fc33a' : '#ff3b3b', 'center');
      F.text(ctx, 'MODO LUDICO: VOZ, FESTA E CARINHO.', cx, this.H - u * 38, Math.max(1, u - 1), '#ff4fa3', 'center');
      F.text(ctx, 'A DIFICULDADE E SEMPRE A MESMA.', cx, this.H - u * 30, Math.max(1, u - 1), '#ff4fa3', 'center');
      F.text(ctx, 'TECLADO: SETAS/WASD  P=PAUSA  R=REINICIAR', cx, this.H - u * 22, Math.max(1, u - 1), '#888899', 'center');
      this.drawButton('< VOLTAR', cx, this.H - u * 7 - 18, Math.min(this.W * 0.6, 220), () => { this.confirmReset = false; this.goto('title'); }, '#888899', 'back');
    }
  }

  root.Game = Game;
  root.MASKS = MASKS;
})(typeof self !== 'undefined' ? self : this);
