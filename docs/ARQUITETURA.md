# Arquitetura técnica — Tumba da Máscara

Jogo 100% estático (HTML5 Canvas + JavaScript puro), sem dependências de execução. Instalável como PWA, funciona offline.

## Estrutura
```
pwa/
  index.html            casca: um <canvas> e o botão "instalar"
  style.css             tela cheia, sem scroll
  manifest.webmanifest  PWA (nome, ícones, fullscreen, retrato)
  sw.js                 service worker (cache offline; CACHE = 'tumba-vN', incremente ao publicar)
  icons/, assets/       ícones e fundos (gerados com IA no Canva; assets/src = originais 112x199 e 200x200)
  js/maze.js            gerador e solver de labirintos (UMD: navegador e Node)
  js/levels.js          81 fases geradas por tools/build-levels.js (NÃO editar à mão)
  js/font.js            fonte bitmap 5x7 (PixelFont.text/width/normalize)
  js/audio.js           AudioEngine: efeitos e músicas sintetizados (WebAudio), destravamento iOS
  js/game.js            classe Game: estados, física, inimigos, HUD, menus, opções, salvamento
  js/boss.js            chefões (estende Game.prototype): aparência, intro, ataques, derrota
  js/map.js             mapa de mundo estilo Mario (estende Game.prototype)
  js/items.js           power-ups, máscaras, loja, baús, Pula-fase (estende Game.prototype)
  js/wellbeing.js       Missão de Brincar: pausa saudável, portão parental (estende Game.prototype)
  js/app.js             inicialização, service worker, botão instalar
tools/
  build-levels.js       gera levels.js (parâmetros de dificuldade por mundo; chefes; fases 10/20/.../80 e 81)
  validate.js           valida todas as fases (usado no CI)
  e2e.js                teste de fumaça com Playwright (joga, luta com chefe, pausa saudável, itens...)
  make-icons.js         ícones PNG sem dependências (fallback)
  process-assets.js     amplia as artes do Canva com pixels nítidos e gera ícones
server.js               servidor estático Node sem dependências (npm start)
Dockerfile              imagem Node Alpine
.github/workflows/pages.yml  CI: sintaxe de todos os scripts + validate + deploy no GitHub Pages (push em master)
```

## Mapa de uma fase (strings de 12 colunas)
`#` parede · ` ` vazio · `.` ponto · `*` moeda · `x` espinho · `t` espinho retrátil · `S` início · `E` saída (linha 0) ·
`b`/`v` morcego horizontal/vertical · `d u l r` atirador (sólido, atira na direção) · `m` escudo · `f` congelar ·
`g` ímã · `c` viciado em moedas · `s` multiplicador.

## Garantias do gerador (maze.js)
- `slide(rows,x,y,dx,dy)`: simula o deslize até algo sólido; espinho no caminho = morte.
- `solve(rows,start)`: BFS sobre células de parada. Retorna `solvable`, `moves`, `stops`, `passable`, `touched`,
  `solutionCells`, e **`fair`/`traps`** (busca reversa a partir da saída: toda parada alcançável consegue chegar à saída).
- `generate(opts,rng)`: paredes em blocos → aceita só se solvable+fair → espinhos um a um fora do caminho mínimo
  (re-verifica fair a cada um) → atiradores (raio não cobre início nem paradas obrigatórias) → espinhos retráteis só em
  células de passagem → pontos nas células atravessáveis → moedas longe do caminho → power-ups → paredes nas células
  inalcançáveis → morcegos (faixa ≥4, não cobre início nem paradas obrigatórias) → `validate`.
- `generateChunk` (arcade): idem, com a abertura do chão modelada como perigo (nunca rota de volta).
- `generateArena` (chefes): abre o corredor das linhas 1–3 e valida.
- `mandatoryStops`: paradas por onde todo caminho passa (pontos de articulação), via `solve` com `forbidStop`.

## Estados do jogo (Game.state)
`title` · `worlds` · `levels` (mapa) · `shop` · `settings` · `play` · `pause` · `dead` · `win` · `arcadeover` ·
`bossintro` · `bossdeath` · `mission` · `break` · `hifive` · `goodnight` · `gate` · `parent`.
Botões são registrados a cada quadro em `this.buttons` (id, x, y, w, h, fn) e resolvidos em `tap()`.

## Salvamento (localStorage)
- `tumba-da-mascara-save-v1`: `{unlocked, stars{idx}, best{idx}, coins, masks[], mask, arcadeBest, sfx, music, crt, shake,
  kids, voice, hints, inv{shield,skip}, up{magnet,freeze,addict,boost}, chests{idx}, zerou, wbCfg{...}}`.
- `tumba-missao-v1`: estado da Missão de Brincar `{playSec, status idle|mission|break|done, missionStart, missionIdx,
  recent[], warned, insistN, lastInsistAt, lastActive, day, cycles}`.
- Migração: `Save.load` preenche campos novos com padrões.

## Como estender
- **Fases/dificuldade:** edite `params(w,i)` e `BOSSES/MASTER` em `tools/build-levels.js`; rode `npm run build:levels` e
  `npm run validate`. Fase feita à mão: adicione em `levels.js` seguindo a legenda e valide.
- **Máscaras:** array `MASKS` em `items.js` (`coin/magnet/freeze/addict/boost` em %, `immune`, `extraCoins`,
  `permaMagnet`, `slowBats`, `startShield`, `level`, `stickers`, `zerou`).
- **Power-ups:** `POWERS` em `items.js`; tile novo = letra em `maze.T` + `collect()` + `drawPowerup`.
- **Missões de brincar / falas:** `WB_CONTENT` em `wellbeing.js` (`missions` com `id,title,icon,text`; ícones em
  `drawWbIcon`).
- **Chefes:** `LOOKS`, `ATTACKS` e `drawBossSprite` em `boss.js`; vida/velocidade em `build-levels.js`.
- **Áudio:** `audio.js` (`tone`, `noise`, efeitos nomeados, `startMusic(track)` com sementes por mundo; 8 = chefe, 9 =
  mestre, 99 = menu).

## Testes e publicação
- `npm run validate` (81/81 fases), `node --check pwa/js/*.js`, `npm run test:e2e` (Playwright; precisa de Chromium).
- Publicar: push em `master` → workflow "Publicar no GitHub Pages". Incremente `CACHE` em `sw.js` para forçar atualização
  nos aparelhos instalados.
