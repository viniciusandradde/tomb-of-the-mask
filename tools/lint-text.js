#!/usr/bin/env node
// Garante que nenhum texto/fala do jogo use linguagem de bater, golpear, violência, culpa, família restrita ou marcas licenciadas
// (Padrão VSA de Bem-Estar Digital Infantil, docs/standards/CHILD-WELLBEING-STANDARD.md).
const fs = require('fs'), path = require('path');
const FORBIDDEN = /bat[ae] nele|bater nele|golpe|acertou|esmag|derrotad|furios|atingid|encost[ea] nele|enfrent|venc[ae]r? o chef|encante o chef|\bmatar\b|\bmorreu\b|\bviol[eê]n|castigo|desobedec|que feio|mam[ãa]e ou (o )?papai|papai ou (a )?mam[ãa]e|homem de ferro|capit[ãa]o am[ée]rica|homem-aranha|batman|superman/i;
let bad = 0;
for (const f of fs.readdirSync(path.join(__dirname, '..', 'pwa', 'js'))) {
  if (!f.endsWith('.js') || f === 'levels.js') continue;
  const src = fs.readFileSync(path.join(__dirname, '..', 'pwa', 'js', f), 'utf8');
  const strings = src.match(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g) || [];
  for (const s of strings) if (FORBIDDEN.test(s)) { bad++; console.log(`${f}: ${s}`); }
}
console.log(bad ? `${bad} texto(s) com linguagem proibida` : 'textos ok: nenhuma linguagem de bater/golpear');
process.exit(bad ? 1 : 0);
