#!/usr/bin/env node
// Teste de fumaça com Playwright: abre o jogo, joga a fase 1 pelo solver, tira capturas.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const { spawn } = require('child_process');

(async () => {
  const srv = spawn('node', [path.join(__dirname, '..', 'server.js'), '8123'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 600));
  const out = process.env.SHOTS || path.join(__dirname, '..', 'shots');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://localhost:8123/');
  await page.waitForFunction(() => window.game && window.LEVELS);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, '1-titulo.png') });
  await page.evaluate(() => game.goto('worlds'));
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(out, '2-mundos.png') });
  await page.evaluate(() => { game.worldPage = 0; game.goto('levels'); });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(out, '3-fases.png') });

  // joga a fase 1 seguindo o caminho do solver
  await page.evaluate(() => game.startLevel(0));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '4-jogo.png') });
  const result = await page.evaluate(async () => {
    const rows = LEVELS[0].rows;
    const r = Maze.solve(rows);
    // reconstrói a sequência de direções do caminho mais curto
    const start = Maze.find(rows, 'S');
    const key = (x, y) => y * 1000 + x;
    // BFS novamente guardando direção
    const q = [start], par = new Map([[key(...start), null]]);
    let exitK = null;
    while (q.length && exitK === null) {
      const [x, y] = q.shift();
      for (const d of Maze.DIRS) {
        const s = Maze.slide(rows, x, y, d[0], d[1]);
        if (s.dead || !s.path.length) continue;
        const k = key(s.x, s.y);
        if (!par.has(k)) { par.set(k, { from: key(x, y), d }); if (s.exit) { exitK = k; break; } q.push([s.x, s.y]); }
      }
    }
    const dirs = [];
    for (let k = exitK; par.get(k); k = par.get(k).from) dirs.unshift(par.get(k).d);
    const names = { '0,-1': 'up', '0,1': 'down', '-1,0': 'left', '1,0': 'right' };
    for (const d of dirs) {
      game.queueMove(names[d.join(',')]);
      await new Promise((res) => { const t = setInterval(() => { if (!game.player.moving || game.state !== 'play') { clearInterval(t); res(); } }, 20); });
      if (game.state !== 'play') break;
    }
    await new Promise((res) => setTimeout(res, 1500));
    return { state: game.state, moves: game.moves, par: r.moves, score: game.score, unlocked: game.save.unlocked };
  });
  await page.screenshot({ path: path.join(out, '5-vitoria.png') });
  console.log('fase 1:', JSON.stringify(result));

  // modo lúdico: morrer em um espinho mostra "OPA!" e a fase reinicia igual
  const ludico = await page.evaluate(async () => {
    game.save.kids = true; game.startLevel(12);
    const p = game.player;
    // encontra um espinho e teleporta para a célula ao lado, depois entra nele
    let sp = null;
    for (let y = 0; y < LEVELS[12].rows.length && !sp; y++) { const x = LEVELS[12].rows[y].indexOf('x'); if (x >= 0) sp = [x, y]; }
    if (!sp) return { skipped: true };
    game.started = true; p.cx = sp[0]; p.cy = sp[1]; game.enterCell(sp[0], sp[1]);
    await new Promise((r) => setTimeout(r, 700));
    return { state: game.state, msg: game.deathMsg };
  });
  await page.screenshot({ path: path.join(out, '5b-opa.png') });
  console.log('modo lúdico (opa):', JSON.stringify(ludico));

  // uma fase com lava e inimigos
  await page.evaluate(() => game.startLevel(45));
  await page.waitForTimeout(3500);
  await page.screenshot({ path: path.join(out, '6-lava.png') });
  // arcade
  await page.evaluate(() => game.startArcade());
  await page.waitForTimeout(600);
  await page.evaluate(() => game.queueMove('up'));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, '7-arcade.png') });
  const arcade = await page.evaluate(() => ({ state: game.state, chunks: game.arcadeChunks, minY: game.grid.minY }));
  console.log('arcade:', JSON.stringify(arcade));
  await page.evaluate(() => game.goto('shop'));
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(out, '8-loja.png') });
  // desktop
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.evaluate(() => game.startLevel(12));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, '9-desktop.png') });
  // PWA: manifest e service worker
  const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!r; });
  const manifest = await page.evaluate(async () => (await fetch('manifest.webmanifest')).ok);
  console.log('service worker registrado:', sw, '| manifest ok:', manifest);
  await browser.close();
  srv.kill();
  if (errors.length) { console.log('ERROS DE CONSOLE:'); errors.forEach((e) => console.log(' -', e)); process.exit(1); }
  if (result.state !== 'win') { console.log('FALHA: fase 1 não foi vencida'); process.exit(1); }
  console.log('e2e ok; capturas em', out);
})().catch((e) => { console.error(e); process.exit(1); });
