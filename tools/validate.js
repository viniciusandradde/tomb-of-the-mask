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
  if (!v.ok || !shapeOk) { bad++; console.log(`FASE ${L.n}: INVÁLIDA (${v.reason || 'formato'})`); }
}
console.log(`${self.LEVELS.length - bad}/${self.LEVELS.length} fases válidas`);
process.exit(bad ? 1 : 0);
