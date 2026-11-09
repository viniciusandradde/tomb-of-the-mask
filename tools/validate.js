#!/usr/bin/env node
// Valida todas as fases: saída alcançável e todos os coletáveis alcançáveis.
global.self = global;
const Maze = require('../pwa/js/maze.js');
require('../pwa/js/levels.js');
let bad = 0;
for (const L of self.LEVELS) {
  const v = Maze.validate(L.rows);
  const w = L.rows[0].length;
  const shapeOk = L.rows.every((r) => r.length === w) && L.rows.join('').split('S').length === 2 && L.rows.join('').split('E').length === 2;
  if (L.boss && !Maze.arenaConnected(L.rows)) { bad++; console.log(`FASE ${L.n}: ARENA sem volta com a porta trancada`); }
  if (!v.ok || !shapeOk) { bad++; console.log(`FASE ${L.n}: INVÁLIDA (${v.reason || 'formato'})${v.traps && v.traps.size ? ' armadilhas=' + v.traps.size : ''}`); }
}
console.log(`${self.LEVELS.length - bad}/${self.LEVELS.length} fases válidas (saída alcançável, coletáveis alcançáveis, nenhuma parada sem volta)`);
process.exit(bad ? 1 : 0);
