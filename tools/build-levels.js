#!/usr/bin/env node
// Gera pwa/js/levels.js: 8 mundos x 12 fases (chefão a cada 3: três chefinhos e o chefão do mundo),
// mais a Tumba do Mestre. Todas validadas pelo solver.
const fs = require('fs');
const path = require('path');
const Maze = require('../pwa/js/maze.js');

// Chefão do mundo (o "comum", última fase do mundo). A partir do Abismo ficou mais brando.
const BOSSES = [
  { name: 'GUARDIAO DA CATACUMBA', short: 'GUARDIAO', hp: 3, speed: 2.2, shot: 2.6, bats: 7, size: 3 },
  { name: 'ESPECTRO DA CRIPTA', short: 'ESPECTRO', hp: 3, speed: 2.5, shot: 2.4, bats: 6.5, size: 3 },
  { name: 'TOTEM DA SELVA', short: 'TOTEM', hp: 4, speed: 2.6, shot: 2.3, bats: 6, size: 3 },
  { name: 'SENHOR DO MAGMA', short: 'MAGMA', hp: 4, speed: 2.8, shot: 2.1, bats: 6, size: 3 },
  { name: 'KRAKEN DO ABISMO', short: 'KRAKEN', hp: 4, speed: 2.6, shot: 2.4, bats: 6.5, size: 3 },
  { name: 'FARAO DOURADO', short: 'FARAO', hp: 4, speed: 2.7, shot: 2.3, bats: 6.5, size: 3 },
  { name: 'REI DAS SOMBRAS', short: 'SOMBRA', hp: 5, speed: 2.9, shot: 2.1, bats: 6, size: 3 },
  { name: 'CORACAO DO NUCLEO', short: 'NUCLEO', hp: 5, speed: 3.0, shot: 2.0, bats: 6, size: 3 },
];
// Tumba do Mestre: 5 níveis seguidos contra a Máscara Mestre, cada vez mais difícil, terminando no Nível Supremo.
const MASTER_LEVELS = [
  { name: 'MASCARA MESTRE 1', hp: 6, speed: 3.0, shot: 2.0, bats: 5.5 },
  { name: 'MASCARA MESTRE 2', hp: 7, speed: 3.3, shot: 1.8, bats: 5.0 },
  { name: 'MASCARA MESTRE 3', hp: 8, speed: 3.6, shot: 1.6, bats: 4.5 },
  { name: 'MASCARA MESTRE 4', hp: 9, speed: 3.9, shot: 1.4, bats: 4.0 },
  { name: 'MASCARA SUPREMA', hp: 11, speed: 4.4, shot: 1.1, bats: 3.2, supreme: true },
].map((m, i) => Object.assign({ size: 3, master: true, mlevel: i + 1 }, m));
// Antes da Suprema: o Labirinto do Guardião das Flores (personagem original, tema Dia dos Mortos).
// Labirinto grande e difícil; a porta só abre depois de juntar as 5 flores ("merecer passar").
const GUARDIAN = { name: 'GUARDIAO DAS FLORES', flowers: 5 };
const GUARDIAN_THEME = { name: 'LABIRINTO DAS FLORES', color: '#ff8c1a', dark: '#3a1250', accent: '#ffc76b' };
const GUARDIAN_PARAMS = { h: 44, wallDensity: 0.25, spikes: 12, traps: 6, bats: 3, vbats: 1, shooters: 4, coins: 5, shields: 1, freezes: 1, minMoves: 34, maxMoves: 140 };
const MASTER_SEQ = [0, 1, 2, 3, 'guardian', 4]; // posição na Tumba do Mestre
// Chefinhos: do básico (fase 3) ao mais forte (fase 9); a fase 12 é o chefão do mundo.
const TIERS = [
  { suffix: 'BEBE', hp: 2, speed: 0.65, slow: 1.7, attacks: 1 },
  { suffix: 'PEQUENO', hp: 2, speed: 0.75, slow: 1.45, attacks: 2 },
  { suffix: 'GRANDE', hp: 3, speed: 0.85, slow: 1.25, attacks: 3 },
];
function bossFor(w, i) {
  const base = BOSSES[w], tier = (i + 1) / 3; // 1..4
  if (tier === 4) return Object.assign({}, base, { tier: 4 });
  const T = TIERS[tier - 1];
  return { name: base.short + ' ' + T.suffix, hp: T.hp, speed: +(base.speed * T.speed).toFixed(2), shot: +(base.shot * T.slow).toFixed(2), bats: +(base.bats * T.slow).toFixed(2), size: 3, tier, attacks: T.attacks };
}
const PER_WORLD = 12;
// Dificuldade efetiva do mundo: cresce normal até o Vulcão e bem mais devagar a partir do Abismo.
const eff = (w) => (w <= 3 ? w : 3 + (w - 3) * 0.45);

const WORLDS = [
  { id: 'catacumba', name: 'CATACUMBA', color: '#c065d8', dark: '#4a1f58', accent: '#f0a8ff', music: 0 },
  { id: 'cripta', name: 'CRIPTA AZUL', color: '#3f7dff', dark: '#13306b', accent: '#9dc0ff', music: 1 },
  { id: 'selva', name: 'SELVA PERDIDA', color: '#7fc33a', dark: '#2a4a12', accent: '#c8f58a', music: 2 },
  { id: 'vulcao', name: 'VULCAO', color: '#ff7a2f', dark: '#5e2306', accent: '#ffc49a', music: 3, fluid: 'lava' },
  { id: 'abismo', name: 'ABISMO', color: '#42e0e0', dark: '#0f4d52', accent: '#b8fbfb', music: 4, fluid: 'water' },
  { id: 'templo', name: 'TEMPLO DOURADO', color: '#f5c542', dark: '#5c4408', accent: '#fff0b0', music: 5 },
  { id: 'sombras', name: 'SOMBRAS', color: '#ff4fa3', dark: '#5c1238', accent: '#ffb3dc', music: 6, fluid: 'lava' },
  { id: 'nucleo', name: 'NUCLEO', color: '#ff3b3b', dark: '#5e0c0c', accent: '#ffb0b0', music: 7, fluid: 'lava' },
  { id: 'mestre', name: 'TUMBA DO MESTRE', color: '#f0f0f0', dark: '#3a3a4a', accent: '#ffffff', music: 8, master: true },
];

// Parâmetros de dificuldade por mundo/fase.
function params(wr, i) {
  const w = eff(wr), t = i / (PER_WORLD - 1); // 0..1 dentro do mundo
  const base = {
    h: Math.round(16 + w * 2.5 + t * 10),
    wallDensity: 0.2 + w * 0.015 + t * 0.04,
    spikes: Math.round(w * 1.6 + t * 4 + (w > 0 ? 1 : 0)),
    coins: 3,
    bats: w >= 1 ? Math.min(w > 3 ? 3 : 5, Math.round(0.5 + w * 0.55 + t * 1.5)) : (i >= 6 ? 1 : 0), // do Abismo em diante, no máximo 3
    vbats: w >= 2 ? Math.min(w > 3 ? 1 : 2, Math.round(w * 0.3 + t)) : 0,
    shooters: w >= 2 ? Math.min(5, Math.round((w - 1) * 0.7 + t * 2)) : 0,
    traps: w >= 1 ? Math.min(7, Math.round(0.5 + w * 0.8 + t * 2.5)) : (i >= 5 ? 1 : 0),
    shields: (i % 3 === 2 && w >= 1) ? 1 : 0,
    freezes: (w >= 3 && i % 4 === 1) ? 1 : 0,
    magnets: (w >= 2 && i % 5 === 3) ? 1 : 0,
    addicts: (w >= 1 && i % 4 === 0) ? 1 : 0,
    boosts: (w >= 2 && i % 4 === 2) ? 1 : 0,
    minMoves: Math.round(8 + w * 1.5 + t * 8),
    maxMoves: 80,
    dotSkip: 0,
  };
  return base;
}

function fluidFor(w, i) {
  const world = WORLDS[w];
  if (!world.fluid) return null;
  if (w === 3 && i < 2) return null; // primeiras fases do vulcão sem lava
  // velocidade em células por segundo (bem lenta, para a criança pensar sem angústia); atraso antes de subir
  const speed = +(0.4 + eff(w) * 0.07 + (i / (PER_WORLD - 1)) * 0.25).toFixed(2);
  return { type: world.fluid, speed, delay: 5 };
}

const levels = [];
let seedBase = 20260101;
for (let w = 0; w < WORLDS.length; w++) {
  const count = WORLDS[w].master ? MASTER_SEQ.length : PER_WORLD;
  for (let i = 0; i < count; i++) {
    const n = w * PER_WORLD + i + 1;
    let rows, moves, calibratedFluid = null;
    if (WORLDS[w].master && MASTER_SEQ[i] === 'guardian') {
      let result = null, seed = seedBase + n * 7919 + 900, tries = 0;
      for (; tries < 400 && !result; tries++, seed += 29) {
        const cand = Maze.generate(Object.assign({ seed }, GUARDIAN_PARAMS), Maze.rng(seed));
        if (cand && Maze.guardianFair(cand.rows).ok) result = cand;
      }
      if (!result) throw new Error('Não consegui gerar o Labirinto do Guardião');
      levels.push({ n, world: w, rows: result.rows, par: result.moves, fluid: null, guardian: GUARDIAN, theme: GUARDIAN_THEME });
      process.stdout.write(`fase ${String(n).padStart(2)} mundo ${w + 1} GUARDIAO ${result.rows.length}x12 par=${result.moves} (tentativas ${tries})\n`);
      continue;
    }
    const isBoss = WORLDS[w].master || i % 3 === 2;
    if (isBoss) {
      const boss = WORLDS[w].master ? MASTER_LEVELS[MASTER_SEQ[i]] : bossFor(w, i);
      const ew = Math.round(eff(w)), small = boss.tier && boss.tier < 4;
      const mx = boss.master ? Math.floor((boss.mlevel - 1) / 2) : 0; // arenas do Mestre ganham perigos a cada nível
      const p = { h: 16 + Math.min(ew, 4), wallDensity: 0.12 + ew * 0.006, spikes: small ? Math.min(2, Math.floor(ew / 2)) : Math.min(4, 1 + Math.floor(ew / 2)) + mx, traps: small ? Math.floor(ew / 3) : 1 + Math.floor(ew / 3) + mx, coins: 3, bats: 0, vbats: 0, shooters: 0, minMoves: 5, maxMoves: 60 };
      let result = null, seed = seedBase + n * 7919 + 500;
      for (let k = 0; k < 30 && !result; k++, seed += 17) result = Maze.generateArena(Object.assign({ seed }, p), Maze.rng(seed));
      if (!result) throw new Error('Não consegui gerar a arena ' + n);
      levels.push({ n, world: w, rows: result.rows, par: result.moves, fluid: null, boss });
      process.stdout.write(`fase ${String(n).padStart(2)} mundo ${w + 1} CHEFAO ${boss.name} ${result.rows.length}x12 par=${result.moves}\n`);
      continue;
    }
    {
      // Fase 1 é um tutorial: sem perigos, poucas paredes.
      const p = n === 1 ? { h: 14, wallDensity: 0.2, spikes: 0, bats: 0, coins: 3, minMoves: 5, maxMoves: 14 } : params(w, i);
      let result = null, seed = seedBase + n * 7919;
      const want = fluidFor(w, i);
      const calibrate = (rws) => { // velocidade máxima de lava que uma criança consegue vencer neste layout
        if (!want) return null; let f = { ...want }, g2 = 0;
        while (!Maze.lavaFeasible(rws, f, { react: 0.5, margin: 2.5 }).ok && g2++ < 40) f = { ...f, speed: +(f.speed * 0.92).toFixed(2) };
        return g2 >= 40 ? null : f;
      };
      for (let round = 0; round < 6 && !result; round++) {
        const q = Object.assign({}, p);
        if (round > 0) for (const k of ['spikes', 'traps', 'bats', 'vbats', 'shooters']) q[k] = Math.round(p[k] * (1 - round * 0.12));
        let best = null;
        for (let k = 0; k < 20 && !result; k++, seed += 13) {
          const cand = Maze.generate(Object.assign({ seed }, q), Maze.rng(seed));
          if (!cand) continue;
          if (!want) { result = cand; break; }
          const f = calibrate(cand.rows);
          if (!f) continue;
          cand.fluid = f;
          // aceita se a lava fica em pelo menos 60% da velocidade prevista; senão guarda o melhor e tenta outra semente
          if (f.speed >= want.speed * 0.6) { result = cand; break; }
          if (!best || f.speed > best.fluid.speed) best = cand;
        }
        if (!result && best) result = best;
      }
      if (!result) throw new Error('Não consegui gerar a fase ' + n);
      rows = result.rows; moves = result.moves;
      if (result.fluid) calibratedFluid = result.fluid;
    }
    const fluid = calibratedFluid || null;
    levels.push({ n, world: w, rows, par: moves, fluid });
    process.stdout.write(`fase ${String(n).padStart(2)} mundo ${w + 1} ${rows.length}x${rows[0].length} par=${moves}\n`);
  }
}

const out = `// ARQUIVO GERADO por tools/build-levels.js — não edite à mão.\n` +
  `// ${levels.length} fases em ${WORLDS.length} mundos. Todas validadas pelo solver (saída e coletáveis alcançáveis).\n` +
  `(function (root) {\n  root.WORLDS = ${JSON.stringify(WORLDS, null, 1)};\n  root.LEVELS = ${JSON.stringify(levels)};\n})(typeof self !== 'undefined' ? self : this);\n`;
fs.writeFileSync(path.join(__dirname, '..', 'pwa', 'js', 'levels.js'), out);
console.log('ok ->', levels.length, 'fases');
