#!/usr/bin/env node
// Garante que nenhum texto/fala do jogo use linguagem de bater, golpear ou violência.
const fs = require('fs'), path = require('path');
const FORBIDDEN = /bat[ae] nele|bater nele|golpe|acertou|esmag|derrotad|furios|atingid|\bmatar\b|\bmorreu\b|\bviol[eê]n/i;
let bad = 0;
for (const f of fs.readdirSync(path.join(__dirname, '..', 'pwa', 'js'))) {
  if (!f.endsWith('.js') || f === 'levels.js') continue;
  const src = fs.readFileSync(path.join(__dirname, '..', 'pwa', 'js', f), 'utf8');
  const strings = src.match(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g) || [];
  for (const s of strings) if (FORBIDDEN.test(s)) { bad++; console.log(`${f}: ${s}`); }
}
console.log(bad ? `${bad} texto(s) com linguagem proibida` : 'textos ok: nenhuma linguagem de bater/golpear');
process.exit(bad ? 1 : 0);
