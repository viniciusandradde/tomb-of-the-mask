/*
 * wellbeing.js — "Missão de Brincar": pausa saudável para crianças pequenas.
 * Após um tempo de jogo contínuo, o jogo convida (em voz) a uma missão fora da
 * tela; durante a pausa fica trancado com redirecionamentos gentis; no retorno,
 * celebra com um "toca aqui" (hi five). Configurável pelos pais com portão
 * parental. Roteiros propostos por especialistas (ver ANALISE.md).
 * Estende a classe Game (game.js).
 */
(function (root) {
  'use strict';
  const F = root.PixelFont, G = root.Game.prototype;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgba(h, a) { const [r, g, b] = hexToRgb(h); return `rgba(${r},${g},${b},${a})`; }
  const KEY = 'tumba-missao-v1';

  // ------------------------------------------------------------------ conteúdo
  // (textos finais incorporados das propostas dos especialistas)
  const C = root.WB_CONTENT = {
    // (a) UM aviso prévio, ~3 min antes, tocado no fim de uma fase (nunca no meio)
    warnings: [
      'Uau, [NOME]! Você está indo muito bem. Mais uma fase e vem uma missão especial.',
      'Olha só quantas estrelas você pegou! Daqui a pouquinho tem uma aventura fora da tela. Vai ser legal.',
      'Você está jogando com muita atenção. Em seguida a Máscara vai te dar uma missão. Prepare-se!',
      'Boa, aventureiro! Mais uma fase. Depois a gente vai brincar lá fora da tela.',
      'Que labirinto difícil, e você conseguiu! Já, já tem missão de verdade esperando por você.',
      'Você está quase lá. Mais uma fase e depois é hora da missão secreta. Shhh!',
    ],
    lastWarning: 'Mais uma fase e vem a última aventura de hoje. Vai ser especial!',
    // (b) missões fora da tela: elogio de processo -> convite -> missão -> "toque na mão e vá"
    missions: [
      { id: 'carrinhos', title: 'CORRIDA DE CARRINHOS', icon: 'car', text: 'Você foi muito bem! Agora, para continuar, vamos fazer uma missão, tudo bem? Pegue seus carrinhos e faça uma corrida bem grande pela casa. Toque na mão e vá!' },
      { id: 'ferro', title: 'HOMEM DE FERRO VOA', icon: 'hero', text: 'Parabéns por chegar até aqui! Missão: encontre o Homem de Ferro e voe com ele por três lugares da casa. Depois volte e me conte. Toque na mão e vá!' },
      { id: 'capitao', title: 'ESCUDO DO CAPITAO', icon: 'shield', text: 'Você jogou com muita força! Missão: pegue o Capitão América e proteja alguém da sua família com o escudo. Toque na mão e vá!' },
      { id: 'pulos', title: 'PULOS DE AVENTUREIRO', icon: 'jump', text: 'Suas mãos trabalharam muito. Agora é a vez das pernas! Missão: dê dez pulos bem altos e corra até a porta e volte. Toque na mão e vá!' },
      { id: 'agua', title: 'AGUA DE HEROI', icon: 'water', text: 'Que aventura! Todo herói precisa de água. Missão: peça para um adulto um copo de água e beba tudinho. Depois faça um lanche. Toque na mão e vá!' },
      { id: 'desenho', title: 'DESENHO DO LABIRINTO', icon: 'pencil', text: 'Você venceu labirintos difíceis! Missão: pegue papel e lápis e desenhe o seu próprio labirinto. Mostre para alguém. Toque na mão e vá!' },
      { id: 'abraco', title: 'ABRACO DE EQUIPE', icon: 'heart', text: 'Você é um ótimo explorador. Missão: encontre alguém da sua família, dê um abraço bem apertado e conte qual estrela foi mais difícil de pegar. Toque na mão e vá!' },
      { id: 'janela', title: 'CACA NA JANELA', icon: 'sun', text: 'Olhos de aventureiro! Missão: vá até a janela e procure três coisas: um passarinho, uma árvore e uma nuvem. Toque na mão e vá!' },
      { id: 'guardar', title: 'GUARDAR O TESOURO', icon: 'blocks', text: 'Você guardou muitas estrelas. Missão: agora guarde cinco brinquedos no lugar certo, bem rápido, como um herói. Toque na mão e vá!' },
      { id: 'livro', title: 'LIVRO OU DANCA', icon: 'book', text: 'Que jogo bonito você fez! Missão: escolha um livro e peça para alguém ler com você. Ou coloque uma música e dance bem maluco! Toque na mão e vá!' },
      { id: 'chefao', title: 'CHEFAO DE VERDADE', icon: 'bear', text: 'Você enfrentou chefões difíceis! Missão: finja que o seu quarto é a tumba. Pegue um brinquedo e vença um chefão de mentira. Depois volte. Toque na mão e vá!' },
      { id: 'pelucia', title: 'AMIGO DA SELVA', icon: 'bear', text: 'Você explorou a selva inteira! Missão: ache um bichinho de pelúcia e leve ele para um passeio pela casa. Mostre o seu lugar favorito. Toque na mão e vá!' },
    ],
    accept: [
      'Isso aí! Vai lá, eu fico aqui esperando. Boa missão!',
      'Que legal! A Máscara vai tirar um cochilo enquanto você brinca.',
      'Combinado! Divirta-se bastante. Depois a gente continua.',
    ],
    // (c) redirecionamento gentil: no máximo 4 falas por pausa, com 20 s de intervalo; depois silêncio
    insist: [
      ['Oi! A missão está te esperando. Vai lá, vai ser divertido!', 'Eu ainda estou aqui. Vá brincar e depois volte.'],
      ['Lembra da missão? Primeiro a aventura lá fora, depois o jogo. Pode ir!', 'A ampulheta ainda está passando. Enquanto isso, vai brincar. Eu espero.'],
      ['Eu não vou a lugar nenhum. Quando a mão aparecer, você volta. Combinado?', 'Está difícil sair, eu sei. Respira fundo comigo... Agora vai brincar.'],
      ['Vamos chamar um adulto para brincar junto? Vai lá chamar.', 'Chame a mamãe ou o papai para fazer a missão com você. Vai ser mais legal a dois.'],
    ],
    // (d) parabéns no retorno + hi five
    back: [
      'Parabéns, [NOME]! Você completou a missão! Toca aqui na minha mão. Hi five!',
      'Você conseguiu! A missão foi um sucesso. Bate aqui na mão grande para continuar!',
      'Uau, que aventureiro! Missão cumprida. Toca na mão e vamos voltar pro labirinto!',
      'Você brincou e voltou. Isso é coisa de herói! Hi five aqui na tela!',
      'Missão completa! Eu sabia que você conseguia. Toca a mão para continuar.',
      'Você cuidou do seu corpo e do seu brinquedo. Agora é hora de voltar. Bate aqui!',
      'A Máscara está orgulhosa de você. Encosta a sua mão na minha. Hi five!',
    ],
    backLast: 'Parabéns! Essa é a última aventura de hoje. Toca aqui e vamos aproveitar!',
    hifive: ['Isso! Vamos jogar mais um pouco!', 'Boa! Mãos ao alto, aventureiro! Vamos continuar!', 'Eba! Agora sim. Vamos para a Tumba!'],
    // (e) adulto liberou antes da hora: neutro, sem julgamento
    unlock: [
      'Tudo bem! Hoje o adulto decidiu assim. Vamos continuar a aventura.',
      'Combinado com o adulto. Bora voltar pro labirinto!',
      'Ok, de volta ao jogo. A missão fica para a próxima vez.',
      'Beleza! O papai ou a mamãe liberou. Vamos jogar mais um pouco.',
    ],
    goodnight: 'Que dia de aventuras! Agora a Máscara vai dormir até amanhã. Boa noite, [NOME]!',
    parentQuestions: [[6, 7], [8, 7], [9, 6], [7, 7], [8, 9], [6, 9]],
  };
  const LIMITS = [10, 15, 20, 30], BREAKS = [10, 15, 20, 30], CYCLES = [1, 2, 3];
  const today = () => new Date().toISOString().slice(0, 10);

  // ------------------------------------------------------------------ estado
  G.wbLoad = function () {
    let st = null;
    try { st = JSON.parse(localStorage.getItem(KEY)); } catch (e) { st = null; }
    this.wb = Object.assign({ playSec: 0, status: 'idle', missionStart: 0, missionIdx: -1, recent: [], warned: false, insistN: 0, lastInsistAt: 0, lastActive: Date.now(), day: today(), cycles: 0 }, st || {});
    this.save.wbCfg = Object.assign({ enabled: true, limitMin: 15, breakMin: 15, cyclesPerDay: 2, medals: 0, enabledClassic: false, childName: '' }, this.save.wbCfg || {});
    // novo dia: zera ciclos e contador
    if (this.wb.day !== today()) { this.wb.day = today(); this.wb.cycles = 0; this.wb.playSec = 0; if (this.wb.status === 'done') this.wb.status = 'idle'; }
    // se ficou muito tempo sem jogar (mais que a pausa), o contador zera
    if (Date.now() - this.wb.lastActive > this.save.wbCfg.breakMin * 60000 && this.wb.status === 'idle') this.wb.playSec = 0;
    this.wb.warned = this.wb.playSec >= this.wbLimit() - 180;
    if (this.wb.status === 'done') { this.state = 'goodnight'; this.buttons = []; }
    // pausa em andamento sobrevive ao fechar/abrir
    if (this.wb.status === 'mission' || this.wb.status === 'break') { this.state = 'break'; this.buttons = []; }
  };
  G.wbSave = function () { this.wb.lastActive = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(this.wb)); } catch (e) { /* ignorado */ } };
  G.wbEnabled = function () { const c = this.save.wbCfg; return !!c && c.enabled && (this.kids() || c.enabledClassic); };
  G.wbLimit = function () { return this.save.wbCfg.limitMin * 60; };
  G.wbName = function (t) { const n = (this.save.wbCfg.childName || '').trim(); return t.replace(/, \[NOME\]/g, n ? ', ' + n : '').replace(/\[NOME\]/g, n || 'aventureiro'); };
  G.wbLastCycle = function () { return this.wb.cycles + 1 >= this.save.wbCfg.cyclesPerDay; };

  // chamado a cada quadro em jogo
  G.wbTick = function (dt) {
    if (!this.wbEnabled() || this.state !== 'play') return;
    this.wb.playSec += dt;
    const lim = this.wbLimit();
    if (this.wbIcon > 0) this.wbIcon -= dt;
    // teto duro (+2 min): pausa suave mesmo no meio da fase (fases longas / arcade)
    if (this.wb.playSec >= lim + 120 && !(this.boss && !this.boss.dead)) this.wbStartMission();
    if (Math.floor(this.wb.playSec) % 10 === 0 && Math.floor(this.wb.playSec) !== this.wbLastSaveSec) { this.wbLastSaveSec = Math.floor(this.wb.playSec); this.wbSave(); }
  };
  G.wbDue = function () { return this.wbEnabled() && this.wb.playSec >= this.wbLimit(); };
  // aviso único, ~3 min antes, no fim de uma fase
  G.wbMaybeWarn = function () {
    if (!this.wbEnabled() || this.wb.warned || this.wb.playSec < this.wbLimit() - 180) return;
    this.wb.warned = true; this.wbIcon = 8; this.wbSave();
    this.wbSay(this.wbLastCycle() ? C.lastWarning : this.wbName(this.pick(C.warnings)));
  };
  // chamado ao terminar uma fase (vitória/morte): se deu a hora, abre a missão
  G.wbCheckpoint = function () {
    if (!this.wb) return false;
    // pausa em andamento: volta para a tela da pausa
    if (this.wb.status === 'mission' || this.wb.status === 'break') { this.state = this.wb.status; this.buttons = []; return true; }
    if (this.wb.status === 'done') { this.state = 'goodnight'; this.buttons = []; return true; }
    if (this.wbDue() && this.wb.status === 'idle') { this.wbStartMission(); return true; }
    // chefão perto do limite: a missão vem antes ("o chefão espera você")
    const nextIdx = this.levelIndex + 1;
    if (this.wbEnabled() && this.wb.status === 'idle' && this.wb.playSec >= this.wbLimit() - 120 && root.LEVELS[nextIdx] && root.LEVELS[nextIdx].boss && this.state === 'win') { this.wbStartMission(); return true; }
    this.wbMaybeWarn();
    return false;
  };

  G.wbSay = function (text) {
    const a = this.audio;
    if (a && a.ctx) { a.tone({ type: 'triangle', freq: 660, dur: 0.12, vol: 0.2 }); a.tone({ type: 'triangle', freq: 880, dur: 0.18, vol: 0.2, at: 0.13 }); }
    if (!this.save.voice || !root.speechSynthesis) return;
    try {
      root.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'pt-BR'; u.rate = 0.88; u.pitch = 1.1; u.volume = 1;
      const voices = root.speechSynthesis.getVoices();
      const v = voices.find((vv) => /pt[-_]BR/i.test(vv.lang)) || voices.find((vv) => /^pt/i.test(vv.lang));
      if (v) u.voice = v;
      setTimeout(() => root.speechSynthesis.speak(u), 350);
    } catch (e) { /* sem voz */ }
    this.wbLastText = text;
  };

  G.wbStartMission = function () {
    // escolhe missão sem repetir as últimas 3
    const pool = C.missions.map((_, i) => i).filter((i) => !this.wb.recent.includes(i));
    const idx = pool[Math.floor(Math.random() * pool.length)];
    this.wb.missionIdx = idx; this.wb.recent = [idx].concat(this.wb.recent).slice(0, 3);
    this.wb.status = 'mission'; this.wb.insistN = 0; this.wb.missionStart = 0;
    this.wbSave();
    this.audio.stopMusic();
    this.state = 'mission'; this.buttons = []; this.wbT = 0;
    const m = C.missions[idx];
    this.wbAdultChime();
    this.wbSay(this.wbName(m.text));
  };
  // chime distinto para o adulto ouvir de longe
  G.wbAdultChime = function () {
    const a = this.audio; if (!a || !a.ctx) return;
    [523, 659, 784, 1047].forEach((f, i) => a.tone({ type: 'sine', freq: f, dur: 0.35, vol: 0.35, at: i * 0.18 }));
  };
  G.wbAccept = function () {
    this.wb.status = 'break'; this.wb.missionStart = Date.now(); this.wbSave();
    this.state = 'break'; this.buttons = []; this.wbT = 0;
    this.wbSay(this.pick(C.accept));
    this.confetti = 0;
  };
  G.wbBreakElapsed = function () { return this.wb.missionStart ? (Date.now() - this.wb.missionStart) / 1000 : 0; };
  G.wbBreakDone = function () { return this.wbBreakElapsed() >= this.save.wbCfg.breakMin * 60; };
  G.wbInsist = function () {
    if (this.wbBreakDone()) return;
    this.wbPulse = 1; // a ampulheta/sol pulsa (sem som de erro, sem reiniciar o tempo)
    const nowMs = Date.now();
    if (nowMs - (this.wb.lastInsistAt || 0) < 20000) return; // intervalo mínimo entre falas
    if (this.wb.insistN >= 4) return; // depois da 4a fala: silêncio
    const level = C.insist[this.wb.insistN]; this.wb.insistN++; this.wb.lastInsistAt = nowMs; this.wbSave();
    this.wbSay(this.pick(level));
    if (this.wb.insistN === 4) this.wbAdultChime();
  };
  G.wbReturn = function () {
    this.state = 'hifive'; this.buttons = []; this.wbT = 0; this.wbHit = false;
    this.wbSay(this.wbLastCycle() ? C.backLast : this.wbName(this.pick(C.back)));
  };
  G.wbHiFive = function () {
    if (this.wbHit) return;
    this.wbHit = true; this.wbT = 0;
    this.save.wbCfg.medals = (this.save.wbCfg.medals || 0) + 1;
    this.wb.cycles++;
    const finished = this.wb.cycles >= this.save.wbCfg.cyclesPerDay;
    this.wb.status = finished ? 'done' : 'idle'; this.wb.playSec = 0; this.wb.warned = false; this.wb.missionStart = 0; this.wb.insistN = 0; this.wbSave();
    this.wbFinished = finished;
    try { localStorage.setItem('tumba-da-mascara-save-v1', JSON.stringify(this.save)); } catch (e) { /* ignorado */ }
    this.audio.unlock(); this.audio.win();
    for (let i = 0; i < 80; i++) this.particles.push({ x: Math.random() * 12, y: -1 - Math.random() * 6, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3, g: 2, life: 2.5 + Math.random(), color: this.pick(['#ffd23f', '#ff4fa3', '#8cf5ff', '#7fc33a', '#ffffff']), size: 0.2 });
    this.wbSay(this.wbFinished ? this.wbName(C.goodnight) : this.pick(C.hifive));
    if (navigator.vibrate) { try { navigator.vibrate([40, 30, 40]); } catch (e) { /* ignorado */ } }
    setTimeout(() => { if (this.state === 'hifive') { if (this.wbFinished) { this.state = 'goodnight'; this.buttons = []; } else this.goto(this.mode === 'arcade' ? 'title' : 'levels'); } }, 2600);
  };
  G.wbParentUnlock = function () {
    this.wb.status = 'idle'; this.wb.playSec = 0; this.wb.warned = false; this.wb.missionStart = 0; this.wb.insistN = 0; this.wbSave();
    this.wbSay(this.pick(C.unlock));
    this.goto('title');
  };

  // ------------------------------------------------------------------ portão parental
  G.wbOpenGate = function (after) {
    const [a, b] = this.pick(C.parentQuestions);
    this.gate = { a, b, answer: '', after, t: 0, wrong: false };
    this.state = 'gate'; this.buttons = [];
  };
  G.renderGate = function () {
    const ctx = this.ctx, u = this.ui, cx = this.W / 2, g = this.gate;
    this.renderBackdrop('#8cf5ff');
    F.text(ctx, 'AREA DOS PAIS', cx, 20, u * 1.5 | 0 || u, '#ffffff', 'center', { shadow: '#0f4d52' });
    F.text(ctx, 'RESPONDA PARA CONTINUAR', cx, 20 + u * 12, Math.max(1, u - 1), '#888899', 'center');
    F.text(ctx, 'QUANTO E ' + g.a + ' X ' + g.b + ' ?', cx, this.H * 0.22, u * 2, '#ffffff', 'center');
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(cx - u * 16, this.H * 0.22 + u * 20, u * 32, u * 7 + 16);
    F.text(ctx, g.answer || '_', cx, this.H * 0.22 + u * 20 + 8, u * 2, g.wrong ? '#ff3b3b' : '#ffd23f', 'center');
    // teclado numérico
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'APAGAR', '0', 'OK'];
    const kw = Math.min(this.W * 0.28, 110), kh = u * 7 + 18, top = this.H * 0.22 + u * 36;
    keys.forEach((k, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const x = cx + (col - 1) * (kw + 8), y = top + row * (kh + 8) + kh / 2;
      this.drawButton(k, x, y, kw, () => {
        if (k === 'APAGAR') g.answer = g.answer.slice(0, -1);
        else if (k === 'OK') {
          if (parseInt(g.answer, 10) === g.a * g.b) { const after = g.after; this.gate = null; after(); }
          else { g.wrong = true; g.answer = ''; this.audio.bump(); }
        } else if (g.answer.length < 3) { g.answer += k; g.wrong = false; }
        this.buttons = [];
      }, k === 'OK' ? '#7fc33a' : (k === 'APAGAR' ? '#ff3b3b' : '#8cf5ff'), 'k' + i);
    });
    this.drawButton('< VOLTAR', cx, this.H - u * 7 - 18, Math.min(this.W * 0.6, 220), () => { this.gate = null; this.state = this.wb.status === 'idle' ? 'settings' : 'break'; this.buttons = []; }, '#888899', 'back');
  };
  G.renderParentPanel = function () {
    const ctx = this.ctx, u = this.ui, cx = this.W / 2, cfg = this.save.wbCfg, small = Math.max(1, u - 1);
    this.renderBackdrop('#8cf5ff');
    F.text(ctx, 'PAUSA SAUDAVEL', cx, 16, u * 1.5 | 0 || u, '#ffffff', 'center', { shadow: '#0f4d52' });
    F.text(ctx, 'MISSAO DE BRINCAR: CONFIGURACAO DOS PAIS', cx, 16 + u * 12, small, '#888899', 'center');
    const w = Math.min(this.W * 0.9, 380), step = Math.min(u * 7 + 26, (this.H - 16 - u * 26 - u * 7 - 110) / 8); let y = 16 + u * 26;
    const saveCfg = () => { try { localStorage.setItem('tumba-da-mascara-save-v1', JSON.stringify(this.save)); } catch (e) { /* ignorado */ } this.buttons = []; };
    this.drawButton('MISSAO DE BRINCAR: ' + (cfg.enabled ? 'LIGADA' : 'DESLIGADA'), cx, y, w, () => { cfg.enabled = !cfg.enabled; saveCfg(); }, cfg.enabled ? '#7fc33a' : '#ff3b3b', 'pe'); y += step;
    this.drawButton('TEMPO DE JOGO: ' + cfg.limitMin + ' MIN', cx, y, w, () => { cfg.limitMin = LIMITS[(LIMITS.indexOf(cfg.limitMin) + 1) % LIMITS.length]; saveCfg(); }, '#8cf5ff', 'pl'); y += step;
    this.drawButton('TEMPO DA PAUSA: ' + cfg.breakMin + ' MIN', cx, y, w, () => { cfg.breakMin = BREAKS[(BREAKS.indexOf(cfg.breakMin) + 1) % BREAKS.length]; saveCfg(); }, '#8cf5ff', 'pb'); y += step;
    this.drawButton('AVENTURAS POR DIA: ' + cfg.cyclesPerDay, cx, y, w, () => { cfg.cyclesPerDay = CYCLES[(CYCLES.indexOf(cfg.cyclesPerDay) + 1) % CYCLES.length]; saveCfg(); }, '#8cf5ff', 'pcy'); y += step;
    this.drawButton('NOME: ' + (cfg.childName ? cfg.childName.toUpperCase() : 'TOQUE PARA ESCREVER'), cx, y, w, () => { const n = root.prompt ? root.prompt('Nome da criança (usado nas falas):', cfg.childName || '') : null; if (n !== null) { cfg.childName = String(n).slice(0, 16); saveCfg(); } }, '#8cf5ff', 'pn'); y += step;
    this.drawButton('TAMBEM NO MODO CLASSICO: ' + (cfg.enabledClassic ? 'SIM' : 'NAO'), cx, y, w, () => { cfg.enabledClassic = !cfg.enabledClassic; saveCfg(); }, '#8cf5ff', 'pc'); y += step;
    F.text(ctx, 'HOJE: ' + Math.floor(this.wb.playSec / 60) + ' MIN NESTA RODADA, ' + this.wb.cycles + ' DE ' + cfg.cyclesPerDay + ' AVENTURAS   MISSOES: ' + (cfg.medals || 0), cx, y - u * 2, small, '#ffd23f', 'center'); y += step * 0.8;
    if (this.wb.status !== 'idle') { this.drawButton('LIBERAR O JOGO AGORA', cx, y, w, () => this.wbParentUnlock(), '#ffd23f', 'pu'); y += step; }
    else { this.drawButton('ZERAR O CONTADOR DE HOJE', cx, y, w, () => { this.wb.playSec = 0; this.wb.warned5 = false; this.wb.warned2 = false; this.wbSave(); this.buttons = []; this.toastMsg('ZERADO'); }, '#888899', 'pz'); y += step; }
    F.text(ctx, 'SBP / OMS / AAP: ATE 1 HORA DE TELA POR DIA DE 2 A 5 ANOS,', cx, this.H - u * 38, small, '#888899', 'center');
    F.text(ctx, 'COM ADULTO POR PERTO; NADA NA HORA DE DORMIR.', cx, this.H - u * 30, small, '#888899', 'center');
    F.text(ctx, 'O JOGO AVISA; QUEM CONDUZ A TRANSICAO E VOCE.', cx, this.H - u * 22, small, '#888899', 'center');
    this.drawButton('< VOLTAR', cx, this.H - u * 7 - 18, Math.min(this.W * 0.6, 220), () => { this.state = this.wb.status === 'idle' ? 'settings' : 'break'; this.buttons = []; }, '#888899', 'back');
  };

  // ------------------------------------------------------------------ desenho
  // ícones grandes em pixel art para quem não lê
  G.drawWbIcon = function (type, cx, cy, s) {
    const ctx = this.ctx;
    ctx.save(); ctx.translate(cx, cy);
    switch (type) {
      case 'car': ctx.fillStyle = '#ff3b3b'; ctx.fillRect(-s * 0.5, -s * 0.1, s, s * 0.35); ctx.fillRect(-s * 0.3, -s * 0.35, s * 0.6, s * 0.3); ctx.fillStyle = '#8cf5ff'; ctx.fillRect(-s * 0.22, -s * 0.3, s * 0.2, s * 0.18); ctx.fillRect(s * 0.02, -s * 0.3, s * 0.2, s * 0.18); ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-s * 0.4, s * 0.2, s * 0.22, s * 0.22); ctx.fillRect(s * 0.18, s * 0.2, s * 0.22, s * 0.22); ctx.fillStyle = '#ffd23f'; ctx.fillRect(s * 0.42, 0, s * 0.08, s * 0.1); break;
      case 'hero': ctx.fillStyle = '#c0392b'; ctx.fillRect(-s * 0.35, -s * 0.45, s * 0.7, s * 0.7); ctx.fillStyle = '#ffd23f'; ctx.fillRect(-s * 0.35, -s * 0.1, s * 0.7, s * 0.12); ctx.fillRect(-s * 0.1, -s * 0.45, s * 0.2, s * 0.2); ctx.fillStyle = '#8cf5ff'; ctx.fillRect(-s * 0.25, -s * 0.3, s * 0.16, s * 0.1); ctx.fillRect(s * 0.09, -s * 0.3, s * 0.16, s * 0.1); ctx.fillStyle = '#c0392b'; ctx.fillRect(-s * 0.2, s * 0.25, s * 0.4, s * 0.25); break;
      case 'blocks': [['#ff3b3b', -0.5, 0.05], ['#7fc33a', -0.05, 0.05], ['#2a7dff', -0.28, -0.35], ['#ffd23f', 0.4, 0.05]].forEach(([c, x, y]) => { ctx.fillStyle = c; ctx.fillRect(x * s, y * s, s * 0.4, s * 0.4); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x * s + 4, y * s + 4, s * 0.12, s * 0.12); }); break;
      case 'water': ctx.fillStyle = '#dfe8ff'; ctx.fillRect(-s * 0.3, -s * 0.45, s * 0.6, s * 0.9); ctx.fillStyle = '#2a7dff'; ctx.fillRect(-s * 0.26, -s * 0.1, s * 0.52, s * 0.5); ctx.fillStyle = '#8cf5ff'; ctx.fillRect(-s * 0.2, -s * 0.05, s * 0.1, s * 0.35); break;
      case 'pencil': ctx.save(); ctx.rotate(-0.6); ctx.fillStyle = '#ffd23f'; ctx.fillRect(-s * 0.12, -s * 0.5, s * 0.24, s * 0.8); ctx.fillStyle = '#f0c0a0'; ctx.beginPath(); ctx.moveTo(-s * 0.12, s * 0.3); ctx.lineTo(s * 0.12, s * 0.3); ctx.lineTo(0, s * 0.55); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ff4fa3'; ctx.fillRect(-s * 0.12, -s * 0.6, s * 0.24, s * 0.12); ctx.restore(); break;
      case 'heart': ctx.fillStyle = '#ff4fa3'; ctx.fillRect(-s * 0.45, -s * 0.3, s * 0.35, s * 0.35); ctx.fillRect(s * 0.1, -s * 0.3, s * 0.35, s * 0.35); ctx.fillRect(-s * 0.45, -s * 0.05, s * 0.9, s * 0.25); ctx.fillRect(-s * 0.3, s * 0.2, s * 0.6, s * 0.15); ctx.fillRect(-s * 0.1, s * 0.35, s * 0.2, s * 0.12); break;
      case 'sun': ctx.fillStyle = '#ffd23f'; ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + this.t; ctx.fillRect(Math.cos(a) * s * 0.42 - 3, Math.sin(a) * s * 0.42 - 3, 6, 6); } break;
      case 'music': ctx.fillStyle = '#b04cff'; ctx.fillRect(-s * 0.05, -s * 0.45, s * 0.1, s * 0.7); ctx.fillRect(-s * 0.05, -s * 0.45, s * 0.4, s * 0.1); ctx.fillRect(s * 0.25, -s * 0.45, s * 0.1, s * 0.6); ctx.beginPath(); ctx.arc(-s * 0.15, s * 0.25, s * 0.15, 0, Math.PI * 2); ctx.arc(s * 0.2, s * 0.15, s * 0.15, 0, Math.PI * 2); ctx.fill(); break;
      case 'book': ctx.fillStyle = '#2a7dff'; ctx.fillRect(-s * 0.45, -s * 0.35, s * 0.9, s * 0.7); ctx.fillStyle = '#ffffff'; ctx.fillRect(-s * 0.38, -s * 0.28, s * 0.36, s * 0.56); ctx.fillRect(s * 0.02, -s * 0.28, s * 0.36, s * 0.56); ctx.fillStyle = '#aaaaaa'; for (let i = 0; i < 3; i++) { ctx.fillRect(-s * 0.32, -s * 0.18 + i * s * 0.14, s * 0.24, s * 0.04); ctx.fillRect(s * 0.08, -s * 0.18 + i * s * 0.14, s * 0.24, s * 0.04); } break;
      case 'bear': ctx.fillStyle = '#b5742a'; ctx.beginPath(); ctx.arc(0, -s * 0.05, s * 0.35, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(-s * 0.3, -s * 0.35, s * 0.14, 0, Math.PI * 2); ctx.arc(s * 0.3, -s * 0.35, s * 0.14, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-s * 0.15, -s * 0.12, s * 0.08, s * 0.08); ctx.fillRect(s * 0.07, -s * 0.12, s * 0.08, s * 0.08); ctx.fillRect(-s * 0.05, s * 0.05, s * 0.1, s * 0.08); break;
      case 'shield': ctx.fillStyle = '#2a5bff'; ctx.beginPath(); ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(0, 0, s * 0.33, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, s * 0.21, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#2a5bff'; ctx.beginPath(); ctx.arc(0, 0, s * 0.11, 0, Math.PI * 2); ctx.fill(); break;
      case 'jump': { const j = Math.abs(Math.sin(this.t * 4)) * s * 0.2; ctx.fillStyle = this.mask().color; ctx.fillRect(-s * 0.25, -s * 0.3 - j, s * 0.5, s * 0.5); ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-s * 0.15, -s * 0.2 - j, s * 0.1, s * 0.1); ctx.fillRect(s * 0.05, -s * 0.2 - j, s * 0.1, s * 0.1); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(-s * 0.35, s * 0.3, s * 0.7, s * 0.06); break; }
      case 'hand': {
        ctx.fillStyle = '#ffd9b3'; ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 24;
        ctx.fillRect(-s * 0.3, -s * 0.1, s * 0.6, s * 0.55); // palma
        const fingers = [[-0.26, -0.5, 0.42], [-0.09, -0.6, 0.52], [0.08, -0.62, 0.54], [0.24, -0.5, 0.42]];
        for (const [x, y, h] of fingers) ctx.fillRect(x * s - s * 0.07, y * s, s * 0.14, h * s);
        ctx.fillRect(-s * 0.5, -s * 0.1, s * 0.2, s * 0.35); // polegar
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(-s * 0.2, s * 0.05, s * 0.4, s * 0.06);
        break;
      }
      default: break;
    }
    ctx.restore();
  };
  G.drawSleepingMask = function (cx, cy, k) {
    const ctx = this.ctx, mask = this.mask();
    ctx.save(); ctx.translate(cx, cy + Math.sin(this.t * 1.5) * k * 0.04);
    ctx.shadowColor = mask.color; ctx.shadowBlur = 20; ctx.fillStyle = mask.color; ctx.fillRect(-k / 2, -k / 2, k, k); ctx.shadowBlur = 0;
    ctx.fillStyle = mask.eye; // olhos fechados
    ctx.fillRect(-k * 0.38, -k * 0.1, k * 0.2, k * 0.05); ctx.fillRect(k * 0.18, -k * 0.1, k * 0.2, k * 0.05);
    ctx.fillRect(-k * 0.1, k * 0.2, k * 0.2, k * 0.05); // boquinha
    ctx.restore();
    // zZz
    const ph = (this.t * 0.6) % 1;
    for (let i = 0; i < 3; i++) { const q = (ph + i / 3) % 1; F.text(ctx, 'Z', cx + k * 0.6 + q * k * 0.4, cy - k * 0.5 - q * k * 0.8, Math.max(1, Math.round(this.ui * (0.6 + q))), rgba('#ffffff', 1 - q), 'center'); }
  };
  G.wbFrame = function (title, sub) {
    const ctx = this.ctx, u = this.ui, cx = this.W / 2;
    this.renderBackdrop('#2a5bff', 'bg-abismo');
    ctx.fillStyle = 'rgba(3,2,8,0.55)'; ctx.fillRect(0, 0, this.W, this.H);
    F.text(ctx, title, cx, 18, Math.min(u * 1.5 | 0 || u, Math.floor((this.W - 20) / (title.length * 6))), '#ffd23f', 'center', { shadow: '#7a3a00' });
    if (sub) F.text(ctx, sub, cx, 18 + u * 12, Math.max(1, u - 1), '#ffffff', 'center');
    // engrenagem dos pais (toque longo = portão)
    const gx = this.W - 26, gy = 22;
    F.text(ctx, '⚙', gx, gy - u * 3.5, u, '#888899', 'center');
    // segurar 3 segundos abre o portão dos pais
    if (this.pointer && this.pointer.down && Math.abs(this.pointer.x - gx) < 28 && Math.abs(this.pointer.y - gy) < 28) {
      this.gearHold = (this.gearHold || 0) + 1 / 60;
      ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(gx, gy, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, this.gearHold / 3)); ctx.stroke();
      if (this.gearHold >= 3) { this.gearHold = 0; this.pointer.down = false; this.wbOpenGate(() => { this.state = 'parent'; this.buttons = []; }); }
    } else this.gearHold = 0;
    if (!this.buttons.find((b) => b.id === 'gear')) this.buttons.push({ id: 'gear', x: gx - 24, y: gy - 24, w: 48, h: 48, fn: () => { this.toastMsg('PAIS: SEGURE 3 SEGUNDOS'); } });
  };
  G.renderMission = function () {
    const ctx = this.ctx, u = this.ui, cx = this.W / 2, m = C.missions[this.wb.missionIdx] || C.missions[0];
    this.wbFrame('MISSAO DE BRINCAR', m.title);
    const k = Math.min(this.W, this.H) * 0.28;
    // cartão da missão
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(cx - k * 1.1, this.H * 0.16, k * 2.2, k * 1.7);
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.strokeRect(cx - k * 1.1, this.H * 0.16, k * 2.2, k * 1.7);
    this.drawWbIcon(m.icon, cx, this.H * 0.16 + k * 0.75 + Math.sin(this.t * 2) * 4, k);
    this.drawBigMask(cx + k * 0.85, this.H * 0.16 + k * 1.45, k * 0.35);
    // texto da missão em linhas curtas
    const words = F.normalize(m.text).split(' '); const lines = []; let line = '';
    const maxChars = Math.floor((this.W - 40) / (6 * Math.max(1, u - 1)));
    for (const w of words) { if ((line + ' ' + w).trim().length > maxChars) { lines.push(line.trim()); line = w; } else line += ' ' + w; } if (line.trim()) lines.push(line.trim());
    let y = this.H * 0.16 + k * 1.7 + 16;
    for (const l of lines.slice(0, 5)) { F.text(ctx, l, cx, y, Math.max(1, u - 1), '#ffffff', 'center'); y += (u - 1 || 1) * 8 + 4; }
    const w = Math.min(this.W * 0.85, 360);
    // "toque na mão e vá": a mão é o botão
    const hk = Math.min(this.W, this.H) * 0.16 * (1 + 0.05 * Math.sin(this.t * 5));
    const hy = this.H - u * 7 - 70 - hk * 0.4;
    this.drawWbIcon('hand', cx, hy, hk);
    F.text(ctx, 'TOQUE NA MAO E VA!', cx, hy + hk * 0.6 + 6, Math.max(1, u - 1), '#7fc33a', 'center', { shadow: '#000' });
    if (!this.buttons.find((b) => b.id === 'go')) this.buttons.push({ id: 'go', x: cx - hk, y: hy - hk * 0.8, w: hk * 2, h: hk * 1.6 + 20, fn: () => this.wbAccept() });
    this.drawButton('\u266A OUVIR DE NOVO', cx, this.H - u * 7 - 14, w * 0.6, () => this.wbSay(this.wbName(m.text)), '#8cf5ff', 'again');
  };
  G.renderBreak = function () {
    const ctx = this.ctx, u = this.ui, cx = this.W / 2;
    const done = this.wbBreakDone();
    this.wbFrame(done ? 'VOCE VOLTOU?' : 'A MASCARA ESTA DESCANSANDO', done ? 'TOQUE NO BOTAO!' : 'VA BRINCAR. EU TE ESPERO AQUI');
    if (this.wbPulse > 0) this.wbPulse -= 1 / 60;
    // céu: o sol atravessa conforme a pausa passa (sem números)
    const prog = clamp(this.wbBreakElapsed() / (this.save.wbCfg.breakMin * 60), 0, 1);
    const skyY = this.H * 0.22, skyH = this.H * 0.22;
    ctx.fillStyle = 'rgba(42,91,255,0.25)'; ctx.fillRect(20, skyY, this.W - 40, skyH);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.strokeRect(20, skyY, this.W - 40, skyH);
    const sx = lerp(40, this.W - 40, prog), sy = skyY + skyH * 0.75 - Math.sin(prog * Math.PI) * skyH * 0.55;
    // trilha do sol
    ctx.strokeStyle = 'rgba(255,210,63,0.35)'; ctx.setLineDash([4, 6]); ctx.beginPath(); for (let i = 0; i <= 20; i++) { const p = i / 20; ctx.lineTo(lerp(40, this.W - 40, p), skyY + skyH * 0.75 - Math.sin(p * Math.PI) * skyH * 0.55); } ctx.stroke(); ctx.setLineDash([]);
    this.drawWbIcon('sun', sx, sy, u * 6);
    // casinha no fim do caminho (a chegada)
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(this.W - 62, skyY + skyH * 0.75 - 2, 22, 16); ctx.beginPath(); ctx.moveTo(this.W - 66, skyY + skyH * 0.75 - 2); ctx.lineTo(this.W - 51, skyY + skyH * 0.75 - 16); ctx.lineTo(this.W - 36, skyY + skyH * 0.75 - 2); ctx.fill();
    // máscara dormindo
    this.drawSleepingMask(cx, this.H * 0.6, Math.min(this.W, this.H) * 0.2);
    if (this.wbPulse > 0) { ctx.strokeStyle = rgba('#ffd23f', this.wbPulse); ctx.lineWidth = 4; ctx.strokeRect(20 - 6 * (1 - this.wbPulse), skyY - 6 * (1 - this.wbPulse), this.W - 40 + 12 * (1 - this.wbPulse), skyH + 12 * (1 - this.wbPulse)); }
    const w = Math.min(this.W * 0.85, 360);
    if (done) {
      const pulse = 1 + 0.04 * Math.sin(this.t * 6);
      this.drawButton('▶ VOLTEI!', cx, this.H - u * 7 - 60, w * pulse, () => this.wbReturn(), '#7fc33a', 'back2');
    } else {
      const m = C.missions[this.wb.missionIdx];
      if (m) F.text(ctx, 'MISSAO: ' + m.title, cx, this.H - u * 7 - 100, Math.max(1, u - 1), '#ffd23f', 'center');
      this.drawButton('\u266A OUVIR A MISSAO', cx, this.H - u * 7 - 60, w * 0.75, () => this.wbSay(m ? this.wbName(m.text) : ''), '#8cf5ff', 'again');
      // toque em qualquer outro lugar = redirecionamento gentil
      if (!this.buttons.find((b) => b.id === 'bg')) this.buttons.unshift({ id: 'bg', x: 0, y: 70, w: this.W, h: this.H - 70 - (u * 7 + 110), fn: () => this.wbInsist() });
    }
  };
  G.renderHiFive = function () {
    const ctx = this.ctx, u = this.ui, cx = this.W / 2;
    this.wbT = (this.wbT || 0) + 1 / 60;
    this.wbFrame(this.wbHit ? 'MISSAO CUMPRIDA!' : 'PARABENS!', this.wbHit ? 'VAMOS JOGAR!' : 'TOCA AQUI!');
    const k = Math.min(this.W, this.H) * (this.wbHit ? 0.5 : 0.42) * (1 + 0.05 * Math.sin(this.t * 5));
    const hx = cx, hy = this.H * 0.5;
    this.drawWbIcon('hand', hx, hy, k);
    if (!this.wbHit) {
      const bob = Math.sin(this.t * 6) * u;
      F.text(ctx, '↑ TOCA AQUI ↑', cx, hy + k * 0.6 + 10 + bob, u, '#ffd23f', 'center', { shadow: '#000' });
      if (!this.buttons.find((b) => b.id === 'hand')) this.buttons.push({ id: 'hand', x: hx - k * 0.6, y: hy - k * 0.75, w: k * 1.2, h: k * 1.4, fn: () => this.wbHiFive() });
    } else {
      // medalha
      const m = this.save.wbCfg.medals || 0;
      ctx.fillStyle = '#ffd23f'; ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(cx, this.H * 0.82, u * 7, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      F.text(ctx, String(m), cx, this.H * 0.82 - u * 3.5, u, '#7a3a00', 'center');
      F.text(ctx, 'MEDALHA DE MISSAO!', cx, this.H * 0.82 + u * 9, Math.max(1, u - 1), '#ffd23f', 'center');
      // confete
      const s = this.tile || 32;
      for (const pt of this.particles) { ctx.fillStyle = pt.color; ctx.globalAlpha = clamp(pt.life, 0, 1); ctx.fillRect(pt.x * (this.W / 12), (pt.y + 8) * s * 0.5, pt.size * s, pt.size * s); }
      ctx.globalAlpha = 1;
    }
  };
  G.renderGoodnight = function () {
    const ctx = this.ctx, u = this.ui, cx = this.W / 2;
    this.wbFrame('ATE AMANHA!', 'A MASCARA FOI DORMIR');
    // lua e estrelas
    ctx.fillStyle = '#fff6c2'; ctx.shadowColor = '#fff6c2'; ctx.shadowBlur = 24; ctx.beginPath(); ctx.arc(cx + 40, this.H * 0.25, u * 9, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(3,2,8,0.95)'; ctx.beginPath(); ctx.arc(cx + 55, this.H * 0.25 - 10, u * 8, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 12; i++) { const sx = (i * 97) % this.W, sy = 70 + (i * 61) % (this.H * 0.3); ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.6 * Math.abs(Math.sin(this.t * 2 + i))})`; ctx.fillRect(sx, sy, 3, 3); }
    this.drawSleepingMask(cx, this.H * 0.58, Math.min(this.W, this.H) * 0.22);
    F.text(ctx, 'VOCE BRINCOU MUITO HOJE!', cx, this.H * 0.8, Math.max(1, u - 1), '#ffd23f', 'center');
    F.text(ctx, 'MISSOES CUMPRIDAS: ' + (this.save.wbCfg.medals || 0), cx, this.H * 0.8 + u * 9, Math.max(1, u - 1), '#ffffff', 'center');
  };
  // ícone discreto de aviso durante o jogo
  G.drawWbHud = function () {
    if (!this.wbEnabled() || !(this.wbIcon > 0)) return;
    const ctx = this.ctx, u = this.ui;
    ctx.globalAlpha = clamp(this.wbIcon, 0, 1);
    this.drawWbIcon('sun', this.W - 30, u * 7 + 44, u * 5);
    F.text(ctx, 'MISSAO CHEGANDO', this.W - 50, u * 7 + 40, Math.max(1, u - 1), '#ffd23f', 'right');
    ctx.globalAlpha = 1;
  };
})(typeof self !== 'undefined' ? self : this);
