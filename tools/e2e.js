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

  // mapa de mundo: prévia da fase selecionada e navegação por deslize
  await page.evaluate(() => { game.worldPage = 0; game.goto('levels'); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '3b-mapa.png') });
  const mapa = await page.evaluate(() => { const s0 = game.sel; game.save.unlocked = 12; game.mapMove(1); game.mapMove(1); return { antes: s0, depois: game.sel, thumbs: Object.keys(game.thumbs).length }; });
  console.log('mapa:', JSON.stringify(mapa));
  await page.evaluate(() => { game.sel = 9; });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(out, '3c-mapa-chefao.png') });

  // chefão: núcleo -> tonto -> bater; porta trancada até derrotar
  const chefe = await page.evaluate(async () => {
    game.startLevel(9);
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    await wait(300);
    const introState = game.state; game.skipBossIntro(); await wait(100);
    const ex = LEVELS[9].rows[0].indexOf('E');
    const lockedBefore = game.blocked(ex, 0);
    game.started = true;
    const log = [];
    for (let round = 0; round < 10 && game.boss.hp > 0; round++) {
      game.spawnCore();
      const c = game.core; const p = game.player;
      p.cx = c.x; p.cy = c.y; p.x = c.x + 0.5; p.y = c.y + 0.5; p.moving = false;
      await wait(80);
      const stun = game.boss.stun;
      // teleporta para dentro do chefe
      p.cx = Math.floor(game.boss.x); p.cy = 2; p.x = game.boss.x; p.y = 2.5; p.invul = 0;
      await wait(120);
      log.push({ round, stun: +stun.toFixed(1), hp: game.boss.hp, state: game.state });
      if (game.state !== 'play') break;
      await wait(1200);
    }
    const deathState = game.state;
    await wait(3600);
    return { introState, deathState, lockedBefore, lockedAfter: game.blocked(ex, 0), hp: game.boss.hp, dead: game.boss.dead, state: game.state, log };
  });
  console.log('chefão:', JSON.stringify(chefe));
  await page.screenshot({ path: path.join(out, '4b-chefao.png') });
  // chefe ativo (nova instância) para a captura com vida cheia
  await page.evaluate(() => { game.startLevel(80); });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(out, '4d-chefao-intro.png') });
  await page.evaluate(() => { game.skipBossIntro(); game.started = true; });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(out, '4c-chefao-mestre.png') });
  // encostar no chefe sem estar tonto mata
  const morte = await page.evaluate(async () => { const p = game.player; p.invul = 0; p.cx = Math.floor(game.boss.x); p.cy = 2; p.x = game.boss.x; p.y = 2.5; await new Promise((r) => setTimeout(r, 200)); return { state: game.state, cause: game.deathCause }; });
  console.log('encostar no chefe:', JSON.stringify(morte));

  // espinhos retráteis: matam só quando estendidos
  const trap = await page.evaluate(async () => {
    const idx = LEVELS.findIndex((L) => L.rows.join('').includes('t'));
    game.startLevel(idx); game.started = true;
    const tr = game.traps[0]; const p = game.player;
    p.cx = tr.x; p.cy = tr.y; p.x = tr.x + 0.5; p.y = tr.y + 0.5; p.moving = false;
    game.trapClock = 0.2 - tr.phase; // recolhido
    await new Promise((r) => setTimeout(r, 120));
    const safe = game.state;
    game.trapClock = 1.8 - tr.phase; // estendido
    await new Promise((r) => setTimeout(r, 120));
    return { idx, traps: game.traps.length, safe, after: game.state, cause: game.deathCause };
  });
  console.log('espinhos retráteis:', JSON.stringify(trap));

  // itens: escudo manual, viciado em moedas, multiplicador, máscara com imunidade
  const itens = await page.evaluate(async () => {
    game.save.inv.shield = 2; game.startLevel(0); game.started = true;
    const p = game.player; const before = game.save.inv.shield;
    game.useShield(); const afterUse = { inv: game.save.inv.shield, shield: p.shield };
    p.addict = 5; p.boost = 5; game.save.up.boost = 3;
    const coins0 = game.save.coins, score0 = game.score;
    // coleta um ponto artificialmente
    let dot = null; for (let y = game.grid.minY; y <= game.grid.maxY && !dot; y++) for (let x = 0; x < 12; x++) if (game.grid.get(x, y) === '.') { dot = [x, y]; break; }
    game.collect(dot[0], dot[1], '.');
    const gain = { coins: game.save.coins - coins0, score: game.score - score0, mult: game.boostMult() };
    game.save.mask = 'pirata'; game.save.masks.push('pirata');
    const imune = game.immune('bat'); game.save.mask = 'classica';
    const dur = { freeze0: game.duration('freeze'), coelho: (game.save.mask = 'coelho', game.duration('freeze')) }; game.save.mask = 'classica';
    const chest = game.rollChest(70, 3);
    return { before, afterUse, gain, imune, dur, chest: !!chest, shopTabs: typeof game.renderShopPowers === 'function' };
  });
  console.log('itens:', JSON.stringify(itens));
  await page.evaluate(() => { game.goto('shop'); }); await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(out, '8-loja.png') });
  await page.evaluate(() => { game.shopTab = 'powers'; game.buttons = []; }); await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(out, '8b-loja-poderes.png') });

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
  await page.evaluate(() => { game.save.kids = false; game.startArcade(); });
  await page.waitForTimeout(600);
  await page.evaluate(() => game.queueMove('up'));
  await page.waitForTimeout(400);
  await page.evaluate(() => game.queueMove('left'));
  await page.waitForTimeout(3600); // barreira começa a subir após 2,5 s
  await page.screenshot({ path: path.join(out, '7-arcade.png') });
  const arcade = await page.evaluate(() => ({ state: game.state, chunks: game.arcadeChunks, minY: game.grid.minY, barrier: game.fluid.type, barrierY: +game.fluid.y.toFixed(1), playerY: +game.player.y.toFixed(1), themes: game.themes.length, world: game.world.id }));
  // fica parado até a barreira encostar
  await page.waitForFunction(() => game.state === 'arcadeover', null, { timeout: 30000 });
  const over = await page.evaluate(() => ({ state: game.state, cause: game.deathCause, height: Math.floor(game.height) }));
  console.log('arcade fim:', JSON.stringify(over));
  await page.screenshot({ path: path.join(out, '7b-arcade-fim.png') });
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
  if (!chefe.lockedBefore || chefe.lockedAfter || chefe.hp !== 0 || chefe.state !== 'play' || chefe.introState !== 'bossintro' || chefe.deathState !== 'bossdeath') { console.log('FALHA: chefão'); process.exit(1); }
  if (trap.safe !== 'play' || trap.after !== 'dead') { console.log('FALHA: espinhos retráteis'); process.exit(1); }
  if (itens.afterUse.inv !== 1 || itens.afterUse.shield !== 1 || itens.gain.coins !== 1 || itens.gain.score !== 30 || !itens.imune || itens.dur.coelho <= itens.dur.freeze0) { console.log('FALHA: itens'); process.exit(1); }
  if (morte.state !== 'dead' || morte.cause !== 'chefao') { console.log('FALHA: contato com chefe deveria matar'); process.exit(1); }
  console.log('e2e ok; capturas em', out);
})().catch((e) => { console.error(e); process.exit(1); });
