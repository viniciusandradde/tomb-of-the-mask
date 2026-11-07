/*
 * maze.js — geração e validação de fases (roda no navegador e no Node).
 *
 * Mecânica: o jogador desliza na direção escolhida até bater em algo sólido.
 * O "solver" faz uma busca em largura sobre as posições de parada e garante
 * que a saída é alcançável sem passar por espinhos, e informa quais células
 * são atravessáveis (onde podemos colocar pontos/moedas com segurança).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Maze = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const T = {
    WALL: '#', EMPTY: ' ', DOT: '.', COIN: '*', SPIKE: 'x', SPAWN: 'S', EXIT: 'E',
    BAT_H: 'b', BAT_V: 'v', SHIELD: 'm', FREEZE: 'f', MAGNET: 'g',
    SHOOT_D: 'd', SHOOT_U: 'u', SHOOT_L: 'l', SHOOT_R: 'r',
  };
  const SHOOTERS = { d: [0, 1], u: [0, -1], l: [-1, 0], r: [1, 0] };
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function isSolid(c) { return c === undefined || c === T.WALL || c in SHOOTERS; }
  function isDeadly(c) { return c === T.SPIKE; }

  // Gerador de números pseudo-aleatórios determinístico (mulberry32)
  function rng(seed) {
    let a = seed >>> 0;
    const f = function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.int = (n) => Math.floor(f() * n);
    f.pick = (arr) => arr[Math.floor(f() * arr.length)];
    f.chance = (p) => f() < p;
    return f;
  }

  function toGrid(rows) { return rows.map((r) => r.split('')); }
  function toRows(grid) { return grid.map((r) => r.join('')); }
  function find(rows, ch) {
    for (let y = 0; y < rows.length; y++) {
      const x = rows[y].indexOf(ch);
      if (x >= 0) return [x, y];
    }
    return null;
  }
  function cellAt(rows, x, y) {
    const r = rows[y];
    if (!r) return undefined;
    return x < 0 || x >= r.length ? undefined : r[x];
  }

  // Desliza a partir de (x,y) na direção (dx,dy). Retorna onde para,
  // as células atravessadas, e se morreu/saiu.
  function slide(rows, x, y, dx, dy) {
    const path = [];
    let cx = x, cy = y;
    for (;;) {
      const nx = cx + dx, ny = cy + dy;
      const c = cellAt(rows, nx, ny);
      if (isSolid(c)) break;
      if (isDeadly(c)) return { x: nx, y: ny, path, dead: true, exit: false };
      cx = nx; cy = ny; path.push([cx, cy]);
      if (c === T.EXIT) return { x: cx, y: cy, path, dead: false, exit: true };
    }
    return { x: cx, y: cy, path, dead: false, exit: false };
  }

  function key(x, y) { return y * 1000 + x; }

  // Busca em largura sobre células de parada.
  function solve(rows, start) {
    const s = start || find(rows, T.SPAWN);
    if (!s) return { solvable: false, reason: 'sem spawn' };
    const startKey = key(s[0], s[1]);
    const dist = new Map([[startKey, 0]]);
    const parent = new Map();
    const passable = new Set([startKey]);
    const touched = new Set([startKey]); // inclui células de caminhos mortais
    const queue = [s];
    let exitKey = null, moves = Infinity;
    while (queue.length) {
      const [x, y] = queue.shift();
      const d = dist.get(key(x, y));
      for (const [dx, dy] of DIRS) {
        const r = slide(rows, x, y, dx, dy);
        for (const [px, py] of r.path) touched.add(key(px, py));
        if (r.dead) { touched.add(key(r.x, r.y)); continue; } // caminho mortal
        for (const [px, py] of r.path) passable.add(key(px, py));
        if (r.path.length === 0) continue;
        const k = key(r.x, r.y);
        if (!dist.has(k)) {
          dist.set(k, d + 1);
          parent.set(k, { from: key(x, y), path: r.path });
          if (r.exit) { if (d + 1 < moves) { moves = d + 1; exitKey = k; } }
          else queue.push([r.x, r.y]);
        }
      }
    }
    const solutionCells = new Set();
    if (exitKey !== null) {
      let k = exitKey;
      while (k !== startKey) {
        const p = parent.get(k);
        for (const [px, py] of p.path) solutionCells.add(key(px, py));
        k = p.from;
      }
    }
    return {
      solvable: exitKey !== null,
      moves: exitKey !== null ? moves : Infinity,
      stops: dist,          // células onde o jogador pode parar -> distância em movimentos
      passable,             // células que podem ser atravessadas com segurança
      touched,              // células que o jogador pode ocupar (inclusive morrendo)
      solutionCells,        // células do caminho mais curto
    };
  }

  // Verifica se todos os coletáveis são alcançáveis e a saída também.
  function validate(rows) {
    const res = solve(rows);
    if (!res.solvable) return { ok: false, reason: 'saída inalcançável', ...res };
    const unreachable = [];
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < rows[y].length; x++) {
        const c = rows[y][x];
        if ((c === T.DOT || c === T.COIN || c === T.SHIELD || c === T.FREEZE || c === T.MAGNET) && !res.passable.has(key(x, y))) {
          unreachable.push([x, y, c]);
        }
      }
    }
    if (unreachable.length) return { ok: false, reason: 'coletável inalcançável', unreachable, ...res };
    return { ok: true, ...res };
  }

  // ---------------------------------------------------------------------
  // Gerador
  // ---------------------------------------------------------------------
  const DEFAULTS = {
    w: 12, h: 16, wallDensity: 0.22, spikes: 0, coins: 3, bats: 0, vbats: 0,
    shooters: 0, shields: 0, freezes: 0, magnets: 0, minMoves: 6, maxMoves: 60,
    dotSkip: 0, exitX: null, spawnX: null, topOpen: true,
  };

  function generate(opts, random) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    const R = random || rng(o.seed || 1);
    for (let attempt = 0; attempt < 400; attempt++) {
      const g = blank(o.w, o.h);
      const sx = o.spawnX != null ? o.spawnX : 1 + R.int(o.w - 2);
      const sy = o.h - 2;
      const ex = o.exitX != null ? o.exitX : 1 + R.int(o.w - 2);
      g[sy][sx] = T.SPAWN;
      g[0][ex] = T.EXIT;
      // paredes internas em blocos
      const interior = (o.w - 2) * (o.h - 2);
      let toPlace = Math.round(interior * o.wallDensity);
      let guard = 0;
      while (toPlace > 0 && guard++ < 5000) {
        const bw = R.chance(0.3) ? 2 : 1, bh = R.chance(0.3) ? 2 : 1;
        const bx = 1 + R.int(o.w - 2 - bw + 1), by = 1 + R.int(o.h - 2 - bh + 1);
        let ok = true;
        for (let y = by; y < by + bh && ok; y++) for (let x = bx; x < bx + bw; x++) {
          if (g[y][x] !== T.EMPTY) { ok = false; break; }
          if (Math.abs(x - sx) + Math.abs(y - sy) <= 1) { ok = false; break; }
          if (y === 1 && x === ex) { ok = false; break; }
        }
        if (!ok) continue;
        for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) g[y][x] = T.WALL;
        toPlace -= bw * bh;
      }
      let rows = toRows(g);
      let res = solve(rows);
      if (!res.solvable || res.moves < o.minMoves || res.moves > o.maxMoves) continue;

      // espinhos: só em células atravessáveis fora do caminho mais curto, encostados em parede
      let placed = 0, tries = 0;
      while (placed < o.spikes && tries++ < 200) {
        const cands = [];
        for (let y = 1; y < o.h - 1; y++) for (let x = 1; x < o.w - 1; x++) {
          if (g[y][x] !== T.EMPTY) continue;
          const k = key(x, y);
          if (!res.passable.has(k) || res.solutionCells.has(k)) continue;
          if (Math.abs(x - sx) + Math.abs(y - sy) <= 2) continue;
          if (hasSolidNeighbor(g, x, y)) cands.push([x, y]);
        }
        if (!cands.length) break;
        const [x, y] = R.pick(cands);
        g[y][x] = T.SPIKE;
        const r2 = solve(toRows(g));
        if (!r2.solvable || r2.moves > o.maxMoves) { g[y][x] = T.EMPTY; continue; }
        res = r2; placed++;
      }

      // atiradores: substituem paredes que olham para um corredor
      placed = 0; tries = 0;
      while (placed < o.shooters && tries++ < 200) {
        const cands = [];
        for (let y = 1; y < o.h - 1; y++) for (let x = 1; x < o.w - 1; x++) {
          if (g[y][x] !== T.WALL) continue;
          for (const [ch, [dx, dy]] of Object.entries(SHOOTERS)) {
            let len = 0, cx = x + dx, cy = y + dy;
            while (g[cy] && g[cy][cx] !== undefined && !isSolid(g[cy][cx]) && g[cy][cx] !== T.SPIKE) { len++; cx += dx; cy += dy; }
            if (len >= 4) cands.push([x, y, ch]);
          }
        }
        if (!cands.length) break;
        const [x, y, ch] = R.pick(cands);
        if (Math.abs(x - sx) + Math.abs(y - sy) <= 3) { continue; }
        g[y][x] = ch; placed++;
      }

      rows = toRows(g);
      res = solve(rows);
      if (!res.solvable) continue;

      // pontos em todas as células atravessáveis
      const passableCells = [];
      for (let y = 1; y < o.h - 1; y++) for (let x = 1; x < o.w - 1; x++) {
        if (g[y][x] === T.EMPTY && res.passable.has(key(x, y))) {
          passableCells.push([x, y]);
          if (!R.chance(o.dotSkip)) g[y][x] = T.DOT;
        }
      }
      if (passableCells.length < 8) continue;

      // moedas: longe do caminho mais curto, espalhadas
      const coinCands = passableCells.filter(([x, y]) => !res.solutionCells.has(key(x, y)));
      shuffle(coinCands, R);
      const coins = [];
      for (const c of coinCands) {
        if (coins.length >= o.coins) break;
        if (coins.every(([cx, cy]) => Math.abs(cx - c[0]) + Math.abs(cy - c[1]) >= 4)) coins.push(c);
      }
      for (const c of coinCands) { if (coins.length >= o.coins) break; if (!coins.includes(c)) coins.push(c); }
      for (const [x, y] of coins) g[y][x] = T.COIN;

      // power-ups
      const puCands = passableCells.filter(([x, y]) => g[y][x] === T.DOT);
      shuffle(puCands, R);
      for (let i = 0; i < o.shields && puCands.length; i++) { const [x, y] = puCands.pop(); g[y][x] = T.SHIELD; }
      for (let i = 0; i < o.freezes && puCands.length; i++) { const [x, y] = puCands.pop(); g[y][x] = T.FREEZE; }
      for (let i = 0; i < o.magnets && puCands.length; i++) { const [x, y] = puCands.pop(); g[y][x] = T.MAGNET; }

      // morcegos horizontais: corredores livres com 4+ células
      placeBats(g, o.bats, 1, 0, T.BAT_H, R, sx, sy);
      placeBats(g, o.vbats, 0, 1, T.BAT_V, R, sx, sy);
      fillUnreachable(g, res);

      rows = toRows(g);
      const v = validate(rows);
      if (!v.ok) continue;
      return { rows, moves: v.moves, attempts: attempt + 1 };
    }
    return null;
  }

  function placeBats(g, n, dx, dy, ch, R, sx, sy) {
    let placed = 0, tries = 0;
    const h = g.length, w = g[0].length;
    while (placed < n && tries++ < 300) {
      const x = 1 + R.int(w - 2), y = 1 + R.int(h - 2);
      const c = g[y][x];
      if (c !== T.DOT && c !== T.EMPTY) continue;
      if (Math.abs(x - sx) + Math.abs(y - sy) <= 3) continue;
      let len = 1;
      for (let s = 1; s < 2; s++) {
        let cx = x + dx, cy = y + dy;
        while (!isSolid(g[cy] && g[cy][cx]) && g[cy][cx] !== T.SPIKE) { len++; cx += dx; cy += dy; }
        cx = x - dx; cy = y - dy;
        while (!isSolid(g[cy] && g[cy][cx]) && g[cy][cx] !== T.SPIKE) { len++; cx -= dx; cy -= dy; }
      }
      if (len < 4) continue;
      // evita dois morcegos na mesma faixa e faixas que passam pelo spawn
      let clash = false;
      for (let cx = x - dx * 40, cy = y - dy * 40, i = 0; i <= 80; i++, cx += dx, cy += dy) {
        if (g[cy] && (g[cy][cx] === T.BAT_H || g[cy][cx] === T.BAT_V)) clash = true;
        if (cx === sx && cy === sy) clash = true;
      }
      if (clash) continue;
      g[y][x] = ch; placed++;
    }
  }

  // Células vazias que o jogador nunca pode ocupar viram parede (não altera
  // nenhum deslize possível, só deixa o labirinto mais compacto).
  function fillUnreachable(g, res) {
    for (let y = 1; y < g.length - 1; y++) for (let x = 1; x < g[0].length - 1; x++) {
      if (g[y][x] === T.EMPTY && !res.touched.has(key(x, y))) g[y][x] = T.WALL;
    }
  }

  function hasSolidNeighbor(g, x, y) {
    return isSolid(g[y][x - 1]) || isSolid(g[y][x + 1]) || isSolid(g[y - 1] && g[y - 1][x]) || isSolid(g[y + 1] && g[y + 1][x]);
  }
  function blank(w, h) {
    const g = [];
    for (let y = 0; y < h; y++) {
      const r = [];
      for (let x = 0; x < w; x++) r.push(x === 0 || x === w - 1 || y === 0 || y === h - 1 ? T.WALL : T.EMPTY);
      g.push(r);
    }
    return g;
  }
  function shuffle(a, R) { for (let i = a.length - 1; i > 0; i--) { const j = R.int(i + 1); [a[i], a[j]] = [a[j], a[i]]; } }

  // Bloco para o modo Arcade (torre infinita). O bloco não tem a linha de
  // baixo: o teto do bloco anterior é o chão. O jogador entra pela
  // abertura em entryX vindo de baixo, deslizando para cima.
  function generateChunk(opts, R) {
    const o = Object.assign({ w: 12, h: 14, wallDensity: 0.22, spikes: 2, coins: 1, bats: 1, vbats: 0, shooters: 0, minMoves: 3, maxMoves: 40 }, opts);
    for (let attempt = 0; attempt < 300; attempt++) {
      // Gera um nível normal com spawn na coluna de entrada; depois remove a
      // última linha (chão) e verifica a partir do ponto onde a subida para.
      const r = generate(Object.assign({}, o, { spawnX: o.entryX, h: o.h + 1, spikes: 0, bats: 0, vbats: 0, shooters: 0, coins: 0 }), R);
      if (!r) continue;
      const g = toGrid(r.rows);
      g.pop(); // remove chão
      const sy = g.length - 1; // antiga linha do spawn
      g[sy][o.entryX] = T.EMPTY;
      // coluna de entrada precisa estar livre para a entrada deslizante
      let rows = toRows(g);
      const up = slide(rows, o.entryX, sy + 1, 0, -1);
      if (up.path.length === 0) continue;
      const start = [up.x, up.y];
      const protectedCells = new Set(up.path.map(([x, y]) => key(x, y)));
      let res = solve(rows, start);
      if (!res.solvable || res.moves < o.minMoves) continue;
      // espinhos
      let placed = 0, tries = 0;
      while (placed < o.spikes && tries++ < 150) {
        const cands = [];
        for (let y = 1; y < g.length; y++) for (let x = 1; x < o.w - 1; x++) {
          const k = key(x, y);
          if (g[y][x] !== T.EMPTY || !res.passable.has(k) || res.solutionCells.has(k) || protectedCells.has(k)) continue;
          if (hasSolidNeighbor(g, x, y)) cands.push([x, y]);
        }
        if (!cands.length) break;
        const [x, y] = R.pick(cands);
        g[y][x] = T.SPIKE;
        const r2 = solve(toRows(g), start);
        if (!r2.solvable) { g[y][x] = T.EMPTY; continue; }
        res = r2; placed++;
      }
      rows = toRows(g); res = solve(rows, start);
      const passableCells = [];
      for (let y = 1; y < g.length; y++) for (let x = 1; x < o.w - 1; x++) {
        if (g[y][x] === T.EMPTY && res.passable.has(key(x, y))) { passableCells.push([x, y]); g[y][x] = T.DOT; }
      }
      const coinCands = passableCells.filter(([x, y]) => !res.solutionCells.has(key(x, y)));
      shuffle(coinCands, R);
      for (let i = 0; i < o.coins && coinCands.length; i++) { const [x, y] = coinCands.pop(); g[y][x] = T.COIN; }
      if (o.shields && coinCands.length && R.chance(o.shields)) { const [x, y] = coinCands.pop(); g[y][x] = T.SHIELD; }
      placeBats(g, o.bats, 1, 0, T.BAT_H, R, start[0], start[1]);
      placeBats(g, o.vbats, 0, 1, T.BAT_V, R, start[0], start[1]);
      for (const k of protectedCells) res.touched.add(k);
      fillUnreachable(g, res);
      rows = toRows(g);
      const exit = find(rows, T.EXIT);
      return { rows, exitX: exit[0], start };
    }
    return null;
  }

  return { T, SHOOTERS, DIRS, isSolid, isDeadly, rng, slide, solve, validate, generate, generateChunk, find, key, toGrid, toRows };
});
