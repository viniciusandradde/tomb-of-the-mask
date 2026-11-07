# Análise completa — Tomb of the Mask e o nosso jogo "Tumba da Máscara"

> Documento de referência para o projeto. Explica como o jogo original funciona,
> o que podemos e não podemos copiar, e como a nossa versão PWA foi construída.

## 1. O jogo original (Tomb of the Mask, Playgendary / Happymagenta, 2016)

| Aspecto | Como funciona no original |
|---|---|
| Controle | Deslizar o dedo em 4 direções. O personagem **voa até bater em uma parede** (não para no meio). Isso cria um quebra-cabeça de "labirinto deslizante" em alta velocidade. |
| Objetivo das fases | Chegar à saída (abertura no topo), coletando pontos pelo caminho. Há **3 estrelas/moedas grandes** por fase que servem para pontuar e comprar itens. |
| Perigos | Espinhos fixos nas paredes, morcegos que patrulham corredores, armadilhas que atiram, blocos que se movem, **lava/água subindo** em algumas fases, baiacus em fases aquáticas. |
| Power-ups | Escudo (sobrevive a um golpe), ímã (puxa pontos), congelar (para inimigos). Há também máscaras com bônus passivos. |
| Modos | **Aventura/Stage** (centenas de fases curtas, divididas em mundos) e **Arcade** (torre infinita, lava subindo cada vez mais rápido, pontuação por altura). |
| Visual | Pixel art neon sobre fundo preto. Cada mundo tem uma cor de parede. Efeito CRT (scanlines), tremor de tela, partículas ao morrer. |
| Áudio | Chiptune 8-bit acelerado, blip ao coletar com tom subindo em sequência, explosão ao morrer, fanfarra ao vencer. |
| Interface | HUD mínimo no topo (fase, pontos, estrelas), pausa no canto, telas de "você morreu / fase completa" com reinício instantâneo. |
| Monetização | Anúncios e compras. **Não** replicamos nada disso: o nosso jogo é 100% gratuito e offline. |

Fontes consultadas: [Wikipedia](https://en.wikipedia.org/wiki/Tomb_of_the_Mask), [Pocket Gamer](https://www.pocketgamer.com/articles/069016/survive-death-traps-and-endless-labyrinths-in-happymagentas-tomb-of-the-mask/), [Nintendo](https://www.nintendo.com/games/detail/tomb-of-the-mask-switch), [MobileSyrup](https://mobilesyrup.com/2018/08/25/tomb-of-the-mask-game-of-the-week/), [Netflix Help](https://help.netflix.com/en/games/tomb-of-the-mask).

## 2. O que pode e o que não pode ser copiado

- **Mecânicas de jogo não têm proteção autoral.** Deslizar até a parede, labirintos, espinhos, morcegos, lava subindo, três estrelas por fase: tudo isso pode ser recriado livremente.
- **Arte, música, nome, logotipo e o desenho exato das fases são protegidos.** Por isso o nosso jogo tem nome próprio (Tumba da Máscara), arte própria (desenhada em código e gerada por IA), músicas e sons próprios (sintetizados) e fases próprias (geradas e validadas por algoritmo).
- Resultado: um jogo **com a mesma jogabilidade e a mesma sensação**, mas legalmente seu, que pode ser publicado sem risco.

## 3. Arquitetura da nossa versão (pasta `pwa/`)

```
pwa/
  index.html            casca mínima; tudo é desenhado em um único <canvas>
  style.css             tela cheia, sem scroll, botão "instalar"
  manifest.webmanifest  nome, ícones, tela cheia, orientação retrato
  sw.js                 service worker: cache offline (rede primeiro, cache depois)
  icons/                ícones 192/512 e "maskable" (gerados a partir da arte do Canva)
  assets/               fundos de cada mundo e arte de capa (Canva, plano gratuito)
  js/maze.js            GERADOR + VALIDADOR de fases (roda no navegador e no Node)
  js/levels.js          80 fases pré-geradas (8 mundos x 10), todas validadas
  js/font.js            fonte bitmap 5x7 desenhada pixel a pixel
  js/audio.js           efeitos sonoros e músicas 100% sintetizados (WebAudio)
  js/game.js            motor: física de deslize, inimigos, lava, HUD, menus, loja, arcade
  js/app.js             inicialização, registro do service worker, botão instalar
```

### 3.1 Como garantimos que TODA fase é jogável

`maze.js` contém um **solver**: uma busca em largura que simula exatamente a regra do
jogo (deslizar até bater). A partir do ponto inicial ele descobre todas as posições em que
o jogador pode parar, quais células ele atravessa com segurança e qual é o caminho mais curto
até a saída. O gerador:

1. Cria um labirinto aleatório (sementes fixas, então as fases são sempre as mesmas).
2. Só aceita o labirinto se a saída é alcançável e o caminho mínimo tem a dificuldade desejada.
3. Coloca espinhos um a um, **fora do caminho mínimo**, e re-verifica a cada espinho.
4. Coloca pontos só em células atravessáveis e moedas longe do caminho direto.
5. Coloca morcegos em corredores de 4+ células, nunca na faixa do ponto inicial.
6. Tampa com parede as células que o jogador nunca poderia alcançar.
7. Valida de novo: saída, pontos, moedas e power-ups alcançáveis.

`node tools/validate.js` roda essa verificação nas 80 fases (também roda no CI antes de publicar).

### 3.2 Jogabilidade implementada

- Deslize (toque) e teclado (setas/WASD); a próxima direção fica na fila enquanto desliza.
- Velocidade 17 células/s; "esmagamento" ao bater; rastro; tremor de tela; partículas.
- Pontos (10), moedas (100 pontos + $5 para a loja), 3 moedas = 3 estrelas na fase.
- Espinhos (apontam para fora da parede em que estão), morcegos horizontais/verticais,
  armadilhas que atiram flechas, lava e água subindo (mundos 4, 5, 7 e 8), com perseguição.
- Power-ups: escudo, congelar (6 s), ímã (10 s). Invulnerável até o primeiro movimento.
- Loja de máscaras com bônus passivos (ímã permanente, escudo inicial, moedas em dobro, morcegos lentos).
- Modo Arcade: coluna infinita para cima, gerada em tempo real com espaço aberto (poucas paredes) e obstáculos no
  meio do caminho (espinhos, morcegos). Cada dois trechos a torre troca de cor/mundo e a música acompanha. Uma **barreira**
  que pisca na cor predominante do trecho sobe em velocidade média e constante (1,5 células/s, +10% a cada 10 trechos);
  encostou, perdeu. Pontuação = altura x 10 + pontos; recorde salvo. Cada trecho é validado pelo solver.
- Progresso, moedas, estrelas, recorde e opções salvos em `localStorage`.
- Bônus de tempo na pontuação, contagem de movimentos vs. "par" (caminho mínimo).

### 3.3 Interface, visual e áudio

- Tudo em canvas com fonte bitmap própria (visual autêntico de pixel art, sem baixar fontes).
- Paredes com relevo e padrão de tijolo na cor do mundo; grade sutil; scanlines e vinheta (desligáveis).
- Fundos por mundo gerados no **Canva** (plano gratuito) e ampliados com pixels nítidos; arte de capa no título.
- Ícone do app gerado no Canva. O Higgsfield tinha apenas 0,33 crédito, então não foi usado.
- Músicas: sequenciador chiptune (bateria, baixo, arpejo, melodia pentatônica) com um tema por mundo
  e um tema de menu, gerados por semente. Sons: blip com combo de tom, moeda, power-up, morte, vitória.

### 3.4 Modo Lúdico x Modo Clássico (os dois sempre disponíveis)

O jogo tem um botão na tela inicial e nas opções para alternar entre os modos.
**A dificuldade, a velocidade, os perigos e as regras são idênticos nos dois.** O que muda é só a
forma de se comunicar com a criança (metodologia lúdica, pensada para 5 anos):

| | Modo Lúdico (padrão) | Modo Clássico |
|---|---|---|
| Ao errar | "OPA!" + frase de incentivo falada ("Quase! Vamos de novo.") | "VOCÊ MORREU" + causa |
| Ao vencer | "MUITO BEM! / INCRÍVEL! / UAU!", chuva de confete, elogio falado, dica para pegar as estrelas | "COMPLETA!" |
| Durante o jogo | Palavras de incentivo em combos de pontos ("LEGAL!", "SHOW!") | sem mensagens extras |
| Visual | Máscara sorrindo, morcegos com olhos grandes e fofos | Máscara com dentes, morcegos de olhos vermelhos |
| Voz | Narração em português pelo próprio aparelho (Web Speech, sem internet), ligável/desligável | sem voz |
| Seta de dica | Opcional e **desligada por padrão**: se ligada, após 5 s parado mostra para onde ir | não disponível |

A voz usa as vozes instaladas no celular/computador (pt-BR quando houver), então não gasta dados nem créditos.

## 4. Como rodar o servidor em casa

```bash
node server.js          # http://localhost:8080  e  http://IP-DA-MAQUINA:8080
# ou
docker build -t tumba . && docker run -p 8080:8080 tumba
```

- Na mesma rede Wi-Fi, abra o endereço IP no celular. Funciona direto no navegador.
- **Para o botão "Instalar" e o modo offline funcionarem fora de `localhost` é preciso HTTPS.**
  Opções gratuitas: GitHub Pages (workflow já incluído em `.github/workflows/pages.yml`),
  Cloudflare Pages, Netlify, ou um proxy local com certificado (Caddy, Tailscale Serve).
- No iPhone: Safari > Compartilhar > "Adicionar à Tela de Início".

## 5. Ferramentas usadas e alternativas pesquisadas

| Ferramenta | Uso | Situação |
|---|---|---|
| Canva (IA de imagem) | Ícone, arte de capa, 6 fundos | Usado; a cota gratuita acabou no 7º fundo (Sombras e Núcleo reutilizam Catacumba e Vulcão). |
| Higgsfield | Imagens/vídeo | Saldo de 0,33 crédito, sem plano gratuito ativo: não usado. |
| ElevenLabs | Música/efeitos reais | Custa 900 créditos por música e 50 por efeito; como o áudio sintetizado já cobre tudo offline e sem arquivos, não gastamos créditos. |
| SpriteCook, CellCog (plugins) | Sprites e tilesets por IA | Existem no diretório de plugins, mas não estão habilitados nesta conta. Podem substituir os desenhos em código por sprites se quiser. |

## 6. Como estender

- Novas fases: ajuste `tools/build-levels.js` (mundos, dificuldade) e rode `npm run build:levels`.
- Fase feita à mão: adicione as linhas no formato do `levels.js` e rode `npm run validate`.
- Novos fundos: coloque PNGs em `pwa/assets/src/` e rode `node tools/process-assets.js`.
- Legenda do mapa: `#` parede, `.` ponto, `*` moeda, `x` espinho, `S` início, `E` saída,
  `b`/`v` morcego horizontal/vertical, `d u l r` armadilha que atira, `m` escudo, `f` congelar, `g` ímã.
