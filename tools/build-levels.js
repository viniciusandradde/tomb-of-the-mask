#!/usr/bin/env node
// Gera pwa/js/levels.js: 8 mundos x 10 fases, todas validadas pelo solver.
const fs = require('fs');
const path = require('path');
const Maze = require('../pwa/js/maze.js');

const BOSSES = [
  { name: 'GUARDIAO DA CATACUMBA', hp: 3, speed: 2.2, shot: 2.6, bats: 7, size: 3 },
  { name: 'ESPECTRO DA CRIPTA', hp: 3, speed: 2.5, shot: 2.4, bats: 6.5, size: 3 },
  { name: 'TOTEM DA SELVA', hp: 4, speed: 2.6, shot: 2.3, bats: 6, size: 3 },
  { name: 'SENHOR DO MAGMA', hp: 4, speed: 2.8, shot: 2.1, bats: 6, size: 3 },
  { name: 'KRAKEN DO ABISMO', hp: 4, speed: 3.0, shot: 2.0, bats: 5.5, size: 3 },
  { name: 'FARAO DOURADO', hp: 5, speed: 3.1, shot: 1.9, bats: 5.5, size: 3 },
  { name: 'REI DAS SOMBRAS', hp: 5, speed: 3.3, shot: 1.8, bats: 5, size: 3 },
  { name: 'CORACAO DO NUCLEO', hp: 5, speed: 3.5, shot: 1.7, bats: 5, size: 3 },
];
const MASTER = { name: 'MASCARA MESTRE', hp: 8, speed: 3.8, shot: 1.5, bats: 4, size: 3, master: true };

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
function params(w, i) {
  const t = i / 9; // 0..1 dentro do mundo
  const base = {
    h: Math.round(16 + w * 2 + t * 10),
    wallDensity: 0.2 + w * 0.012 + t * 0.03,
    spikes: Math.round(w * 1.2 + t * 3 + (w > 0 ? 1 : 0)),
    coins: 3,
    bats: w >= 1 ? Math.min(4, Math.round(0.5 + w * 0.4 + t * 1.5)) : (i >= 6 ? 1 : 0),
    vbats: w >= 2 ? Math.round(w * 0.3 + t) : 0,
    shooters: w >= 2 ? Math.min(4, Math.round((w - 1) * 0.5 + t * 2)) : 0,
    shields: (i % 3 === 2 && w >= 1) ? 1 : 0,
    freezes: (w >= 3 && i % 4 === 1) ? 1 : 0,
    magnets: (w >= 2 && i % 5 === 3) ? 1 : 0,
    minMoves: 8 + w + Math.round(t * 6),
    maxMoves: 70,
    dotSkip: 0,
  };
  return base;
}

function fluidFor(w, i) {
  const world = WORLDS[w];
  if (!world.fluid) return null;
  if (w === 3 && i < 2) return null; // primeiras fases do vulcão sem lava
  // velocidade em células por segundo; atraso em segundos antes de começar a subir
  const speed = +(0.9 + w * 0.12 + (i / 9) * 0.6).toFixed(2);
  return { type: world.fluid, speed, delay: 2.5 };
}

const levels = [];
let seedBase = 20260101;
for (let w = 0; w < WORLDS.length; w++) {
  const count = WORLDS[w].master ? 1 : 10;
  for (let i = 0; i < count; i++) {
    const n = w * 10 + i + 1;
    let rows, moves;
    const isBoss = WORLDS[w].master || i === 9;
    if (isBoss) {
      const boss = WORLDS[w].master ? MASTER : BOSSES[w];
      const p = { h: 20 + Math.min(w, 8), wallDensity: 0.12 + w * 0.006, spikes: Math.min(4, 1 + Math.floor(w / 2)), coins: 3, bats: 0, vbats: 0, shooters: 0, minMoves: 5, maxMoves: 60 };
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
      for (let k = 0; k < 20 && !result; k++, seed += 13) result = Maze.generate(Object.assign({ seed }, p), Maze.rng(seed));
      if (!result) throw new Error('Não consegui gerar a fase ' + n);
      rows = result.rows; moves = result.moves;
    }
    levels.push({ n, world: w, rows, par: moves, fluid: fluidFor(w, i) });
    process.stdout.write(`fase ${String(n).padStart(2)} mundo ${w + 1} ${rows.length}x${rows[0].length} par=${moves}\n`);
  }
}

const out = `// ARQUIVO GERADO por tools/build-levels.js — não edite à mão.\n` +
  `// ${levels.length} fases em ${WORLDS.length} mundos. Todas validadas pelo solver (saída e coletáveis alcançáveis).\n` +
  `(function (root) {\n  root.WORLDS = ${JSON.stringify(WORLDS, null, 1)};\n  root.LEVELS = ${JSON.stringify(levels)};\n})(typeof self !== 'undefined' ? self : this);\n`;
fs.writeFileSync(path.join(__dirname, '..', 'pwa', 'js', 'levels.js'), out);
console.log('ok ->', levels.length, 'fases');
