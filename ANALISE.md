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

8. **Invariante de "nenhuma parada sem volta"**: de TODA posição em que o jogador pode parar com segurança, a saída
   continua alcançável. Calculado com uma busca reversa a partir da saída sobre o grafo de paradas (`fair`/`traps` em
   `solve`). Antes dessa regra, 46 das 80 fases tinham becos sem saída (218 paradas-armadilha, 36 delas sem nenhum
   movimento possível), e no Arcade 22% dos blocos travavam ou matavam sem erro do jogador. Agora: 0 em 80 fases e 0 em
   400 blocos de arcade auditados.
9. **Justiça dos perigos**: faixa de morcego e linha de tiro de atirador nunca cobrem o ponto inicial nem uma "parada
   obrigatória" (por onde todo caminho passa). No Arcade, o solver modela a abertura real no chão do bloco (descer por ela
   leva ao bloco anterior, de onde se volta subindo), em vez de supor chão fechado.

`node tools/validate.js` roda essas verificações nas 80 fases (também roda no CI antes de publicar).

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

### 3.2.1 Sensação de movimento (copiada do original)

- Parte em velocidade máxima (18 células/s) e **estica** 22% no eixo do movimento nos primeiros 50 ms.
- Deixa um rastro de **cópias do próprio sprite** (afterimages) a cada 0,14 célula, que somem em 160 ms com brilho aditivo.
- Ao bater: **achata** 38% contra a parede (ancorado na face da parede), poeira sai da parede, tremor curto de 70 ms no
  eixo do impacto, "hit-stop" de 2 quadros e som seco. A próxima direção na fila parte logo depois.
- Câmera com **avanço** (lead) de 1,4 célula na direção do movimento; fixa quando a fase cabe na tela.
- Pontos somem com um "pop" e o blip sobe em escala pentatônica; ao morrer o sprite **explode em seus próprios pixels**
  com flash branco curto.
- Entrada: deslize reconhecido com 10 px (antes 24), flick curto de 6 px conta ao soltar, e arrastar em "L" sem levantar o
  dedo enfileira a próxima direção.

### 3.2.1b Espinhos retráteis (armadilha clássica do original)

Blocos com uma ranhura de onde saem espinhos em ciclos de 2,4 s: recolhidos (1,3 s), aviso com pontinhas e luz vermelha
piscando (0,3 s), estendidos e mortais (0,7 s), recolhendo (0,1 s). As faixas são sincronizadas por linha, então o
jogador aprende o ritmo. O gerador só os coloca em células de passagem (nunca onde se pode parar), encostados em parede e
fora do caminho mais curto; como são atravessáveis quando recolhidos, não alteram o grafo de paradas nem a justiça. O
congelar pausa o ciclo. Legenda no mapa: `t`.

### 3.2.2 Mapa de mundo, chefões e o Chefão Mestre

- **Mapa estilo Super Mario World**: cenário em pixel art com piso de pedra, caminho de lajes (com correntes nos trechos
  bloqueados), decorações animadas por mundo (tochas com fogo, caveiras e ossos, cristais, plantas, poças de lava e água,
  estátuas douradas, olhos no escuro, rachaduras brilhantes), morcegos cruzando o céu e névoa. Cada fase é uma **porta**:
  trancada com correntes, aberta, ou iluminada quando concluída (com as estrelas embaixo). O chefão é um portal grande com
  o rosto do chefe e tochas. O personagem **caminha** pelo caminho até a porta escolhida, com poeira nos passos, e o mapa
  rola para acompanhá-lo.
- **Prévia** (painel inferior): miniatura, estrelas, recorde, ícones em pixel art dos perigos com contagem, altura, par e
  dicas (lava sobe; como vencer o chefe).
- Detalhe de implementação: o personagem anda pelo
  mapa até a fase escolhida (deslize ou toque). Um painel mostra a **prévia** antes de entrar: miniatura do labirinto,
  estrelas, melhor pontuação, perigos (espinhos, morcegos, flechas, lava/água), altura e número mínimo de movimentos.
- **Chefões com identidade**: cada um tem aparência própria desenhada em código (caveira com chifres, espectro translúcido
  ondulante, totem de três andares com folhas, magma com rachaduras de fogo, kraken com tentáculos, faraó dourado, rei das
  sombras com três pares de olhos, coração do núcleo pulsante, e a Máscara Mestre coroada com três olhos).
- **Entrada cinematográfica**: faixas de cinema, "ALERTA!", o chefe desce do teto, ruge (tremor, flash, vibração), nome e
  repertório de ataques na tela. Toque para pular.
- **Ataques telegrafados em fases** (regra de ouro de design de chefes: todo ataque avisa antes): tiro que cai (coluna
  amarela piscando), chuva de três tiros, raio vertical (coluna vermelha, o chefe para e treme, depois um feixe branco
  mortal por 0,6 s), espinhos temporários que brotam no labirinto (aviso de 0,9 s, ativos por 3 s), investida (o chefe
  mergulha pela coluna até a parede e volta), escuridão (5 s com luz só ao redor do jogador e do chefe) e invocação de
  morcegos. Cada mundo usa um repertório diferente; o Mestre usa todos. Com metade da vida o chefe fica **furioso**:
  mais rápido, ataques mais frequentes, cor pulsante.
- **Derrota**: sequência de 3 s com explosões em cadeia, tremor, flash, "DERROTADO!", e então a porta abre e a música do
  mundo volta.
- **Chefão no fim de cada mundo** (fase 10): arena aberta com um corredor largo no topo onde o chefe patrulha. A saída
  fica trancada (cadeado) até ele cair. O chefe solta tiros que caem e invoca morcegos. Para feri-lo, pegue o **núcleo
  azul** que aparece no labirinto: ele fica tonto por 6 s (olhos em X, piscando azul); deslize até ele para dar um golpe.
  Encostar nele acordado mata. Vida de 3 a 5 golpes conforme o mundo. Derrotá-lo dá 1000 pontos e abre a porta.
- **Chefão Mestre** (mundo 9, "Tumba do Mestre"): desbloqueia ao vencer o chefe do mundo 8. Vida 8, mais rápido, atira
  mais. Vencê-lo mostra "VOCÊ ZEROU!" com chuva de confete e marca o jogo como zerado no salvamento.
- Todas as arenas passam pelo mesmo validador (saída e coletáveis alcançáveis, nenhuma parada sem volta).

### 3.2.3 Itens: power-ups, máscaras, baús e Pula-fase (inspirados no original)

**Power-ups** (coletados no labirinto; nas fases avançadas e aleatórios no Arcade). Duração melhorável na loja em 3 níveis
(150/300/600 moedas) e ampliada pelos bônus da máscara:

| Power-up | Efeito | Duração base |
|---|---|---|
| Escudo | protege de um golpe; **ativação manual com toque duplo** (ou tecla E) gastando um escudo do inventário (60 moedas na loja; baús também dão) | até usar |
| Ímã | puxa pontos e moedas num raio de 2 células | 10 s (+3 s por nível) |
| Congelar | para morcegos, flechas, espinhos retráteis e o chefe | 6 s (+2 s) |
| Viciado em Moedas | cada ponto coletado vira 1 moeda de ouro (os pontos ficam dourados) | 8 s (+2,5 s) |
| Multiplicador | pontos x2 (x3 no nível máximo) | 10 s (+3 s) |

**Máscaras** (13): cada uma muda a aparência e dá bônus percentuais cumulativos ou imunidades; desbloqueiam por fase alcançada
e custam moedas: Clássica; Gatinho (fase 8: +10% moedas, +25% ímã); Pirata (fase 10: +15% moedas, imune a morcegos);
Coelho (fase 12: +15% moedas, +30% congelar); Cachorro (loja: +10% moedas, imune a flechas); Palhaço (fase 14: +20%
congelar e ímã); Caveira (fase 17: +25% moedas, +25% congelar, +30% viciado); Vodu (fase 20: +35%/+35%/+40%); Cavaleiro
(loja: +2 moedas extras em cada fase); Fantasma (fase 30: ímã permanente); Rei (fase 40: moedas em dobro, +30%
multiplicador); Sombra (fase 50: morcegos lentos, imune a espinhos retráteis); Mestre (ao zerar: +50% em tudo e escudo
inicial).

**Baús**: ao completar uma fase pela primeira vez (sempre com 2+ estrelas; 35% com menos) abre um baú com moedas, um
escudo ou, raramente, um Pula-fase. **Pula-fase** (250 moedas ou baú): no mapa, na prévia de uma fase ainda não concluída,
pula a fase sem estrelas e libera a próxima. Chefes não podem ser pulados.

### 3.2.4 Curva de dificuldade

A partir do mundo 3 a progressão aperta: altura até 44 linhas, mais paredes, espinhos (até 15 por fase), espinhos
retráteis (até 7), morcegos (até 6), flechas (até 6), lava/água mais rápida e com menos atraso, caminhos mínimos mais
longos. Chefes finais com mais vida (Rei das Sombras 6, Coração do Núcleo 7, Mestre 10) e ataques mais frequentes. Se um
conjunto de parâmetros não gera fase justa, o gerador reduz os perigos em passos de 12% até conseguir.

### 3.2.5 Missão de Brincar (pausa saudável) — metodologia proposta por dois especialistas

Dois especialistas (psicopedagogia da primeira infância e design de diversão digital) analisaram o pedido e propuseram a
metodologia implementada. Fundamentos: SBP, AAP e OMS recomendam no máximo 1 hora de tela por dia dos 2 aos 5 anos, com
adulto por perto; o estudo "Screen Time Tantrums" (Hiniker et al., CHI 2016) mostrou que transições mediadas pelo próprio
aparelho, em pontos naturais de parada e com a próxima atividade já anunciada, geram menos conflito do que avisos do adulto
e contagens regressivas; elogio de processo (Gunderson et al., 2013) sustenta a persistência; aos 4 anos a criança
co-regula com o adulto, então o jogo avisa e convida, mas quem conduz a transição é o adulto.

Fluxo (padrão 15 min de jogo, 15 min de pausa, 2 aventuras por dia; tudo ajustável pelos pais, inclusive tempo de jogo de
10 min a 2 horas):

1. **Um único aviso prévio**, ~3 minutos antes, falado só no fim de uma fase (vitória ou derrota), nunca no meio:
   "Mais uma fase e vem uma missão especial". Um sol discreto aparece no canto.
2. **Ao bater o tempo**, a missão abre no fim da fase atual. Teto duro de +2 minutos para fases longas e Arcade; se a
   próxima fase é um chefão e o tempo está acabando, a missão vem antes ("o chefão espera você").
3. **Tela da missão**: ilustração grande em pixel art (carrinho, herói, escudo, blocos, água, lápis, coração, sol, livro,
   urso), a Máscara companheira, texto falado em voz pt-BR com um sininho antes, botão "ouvir de novo", e a **mão** como botão
   ("toque na mão e vá"). Um chime distinto avisa o adulto. 12 missões (corrida de carrinhos, Homem de Ferro voa, escudo do
   Capitão, pulos, água de herói, desenho do labirinto, abraço de equipe, caça na janela, guardar o tesouro, livro ou dança,
   chefão de verdade, amigo da selva), sorteadas sem repetir as 3 últimas, com peso maior para o tema do mundo atual e para
   os brinquedos favoritos, e missões calmas (janela, livro, água) à noite.
4. **Pausa em andamento**: a Máscara dorme (zZz), um sol atravessa o céu até uma casinha (tempo sem números). Sem sons
   espontâneos. Se a criança insistir tocando, no máximo **4 falas de redirecionamento** por pausa, com 20 s de intervalo,
   escalando com carinho (convite, lembrete, "eu fico esperando", "chame um adulto" + chime); depois, só um pulso visual.
   O tempo da pausa nunca reinicia. Fechar e reabrir o app mantém a pausa (relógio de parede persistido).
5. **Retorno**: quando a pausa termina, aparece o botão "VOLTEI!"; a seguir a tela do **hi five** com uma mão gigante
   pulsando; tocar na mão (ou em toda a metade inferior) dispara confete, som, vibração e um parabéns falado; o jogo volta ao
   mapa onde parou e o contador zera.
6. **Recompensa sem moedas**: uma figurinha da missão no **Quadro de Aventuras** da tela inicial (decorativa) e, com 5
   figurinhas, a máscara "Sonequinha" grátis. Nada compra fases nem itens.
7. **Segunda aventura do dia** avisa que é a última; depois do hi five aparece "Até amanhã" (lua, Máscara dormindo) e só o
   adulto libera. No dia seguinte tudo zera.
8. **Área dos pais**: em Opções, ou segurando 3 s a engrenagem nas telas da pausa, mais uma conta de multiplicação.
   Ligar/desligar (ligada por padrão no Modo Lúdico, opcional no Clássico), tempo de jogo (10, 15, 20, 30, 45 min, 1 h,
   1h30 ou 2 h; o adulto decide), tempo da pausa (10/15/20/30), aventuras por dia (1/2/3), nome da criança (entra nas
   falas), "pausar agora" (missão no fim da fase), "liberar agora" (frase neutra, sem julgamento) e zerar o contador.

Erros evitados por recomendação dos especialistas: bloqueio no meio da fase, muitos avisos ou contagem regressiva, mensagens
longas com "porquês", tom de culpa, aparelho que fala a cada toque, reiniciar a pausa como punição, recompensa em moedas do
jogo, vermelho e "X" nas telas da pausa.

Fontes: [SBP #MenosTelas #MaisSaúde](https://www.sbp.com.br/fileadmin/user_upload/_22246c-ManOrient_-__MenosTelas__MaisSaude.pdf),
[AAP](https://www.healio.com/news/pediatrics/20161020/aap-recommends-1-hour-limit-on-digital-media-use-for-preschoolers),
[OMS 2019](https://www.who.int/news/item/24-04-2019-to-grow-up-healthy-children-need-to-sit-less-and-play-more),
[Hiniker et al. 2016](https://www.washington.edu/news/2016/05/05/two-minute-warnings-make-kids-screen-time-tantrums-worse/),
[Gunderson et al. 2013](https://pmc.ncbi.nlm.nih.gov/articles/PMC3655123),
[Co-regulação (OPRE)](https://acf.gov/opre/report/co-regulation-birth-through-young-adulthood-practice-brief),
[Nintendo Switch limites de tempo](https://www.nintendo.com/sg/parents/switch/time/settings.html),
[YouTube Kids timer](https://support.google.com/youtubekids/answer/6130558?hl=en),
[Pokémon Smile](https://nintendowire.com/news/2020/06/18/pokemon-smile-offers-a-cute-approach-to-dental-hygiene-for-youngsters/).

### 3.2.6 Tela de derrota pensada para a criança

Como no original, ao perder aparecem **dois botões grandes** ocupando a largura da tela: **JOGAR DE NOVO** (verde, ícone
↻) e **VOLTAR AO MAPA** (azul, ícone ⌂), com sombra e resposta visual ao toque. Toques e deslizes fora dos botões não fazem
nada, evitando reinícios acidentais. No Modo Lúdico a tela diz "OPA!" com a causa em linguagem simples e uma frase de
incentivo; se houver escudos no inventário, lembra que dois toques ligam o escudo.

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
