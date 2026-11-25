# Histórico de versões

## 1.9.1 — Moedas pela área dos pais
- Botão "+10000 MOEDAS" no painel dos pais (protegido pelo PIN) para comprar máscaras e itens na loja.

## 1.9 — Chefão a cada 3 fases e jogo mais calmo
- Cada mundo tem 12 fases: chefinhos nas fases 3, 6 e 9 (bebê, pequeno, grande) e o chefão do mundo na fase 12. 97 fases.
- Dificuldade menor do Abismo em diante; chefões desses mundos e o Mestre mais brandos.
- Morcegos e flechas mais lentos; lava e água sobem bem mais devagar (cerca de 2,5 vezes) e demoram mais para começar.
- Progresso salvo é convertido automaticamente para o novo mapa.

## 1.8.4 — Botão PAIS na tela inicial
- Botão "⚙ PAIS" no canto da tela inicial abre o PIN; ao voltar do painel, retorna à tela inicial.

## 1.8.3 — Área dos pais com PIN
- Botão "⚙ PAIS" visível nas telas da pausa (um toque) no lugar do toque longo de 3 s, que falhava no celular e impedia o
  adulto de desligar o descanso.
- PIN de 4 números criado na primeira vez, "esqueci o PIN" (soma de dois dígitos) e "trocar PIN" no painel.
- Desligar a Missão de Brincar durante a pausa libera o jogo na hora.

## 1.8.2 — Padrão VSA de Bem-Estar Digital
- "Aventuras por dia" passa a zerar à meia-noite do horário local (antes virava em UTC e, no Brasil, liberava novas aventuras às 21h).
- Portão dos pais com soma de dois dígitos no lugar da tabuada simples.
- Missões sem personagens licenciados ("herói voador", "escudo do herói") e falas com "um adulto" no lugar de "mamãe ou papai".
- Verificador de linguagem barra também culpa, família restrita e nomes de personagens licenciados.
- Documentos do padrão: `docs/standards/CHILD-WELLBEING-STANDARD.md` e `docs/ADOCAO-PADRAO-BEM-ESTAR.md`.

## 1.8 — Linguagem gentil, lava no tempo e volume
- Falas e textos sem bater/golpear: chefe é "encantado" ao encostar nele tonto; verificador de linguagem no CI.
- Lava/água calibrada por simulação de tempo com reação de criança (fase 34 estava impossível); perseguição mais branda.
- Volume inicial em 75%.

## 1.7.3 — Arenas sem bolsões
- Regra nova do validador: no labirinto da arena, todas as paradas se alcançam mutuamente SEM passar pelo corredor do chefe. Antes, 8 das 9 arenas tinham bolsões (ex.: a coluna da direita na fase 20) cuja única saída era a faixa do chefe; todas regeneradas.

## 1.7.2 — Flechas e elementos presos
- 120 dos 209 atiradores apontavam para uma parede (raio zero) e 40 tinham raio curto: o preenchimento das células inalcançáveis tapava a linha de tiro. Agora o preenchimento acontece antes, o raio é medido na geometria final e o validador exige raio mínimo de 3.
- Aviso visual de 0,5 s antes de cada tiro; a flecha anda em sub-passos e não "pula" o jogador nem a parede; some na porta trancada do chefe.
- Espinhos sem nenhuma célula de aproximação (presos no nada) viram parede; validador reprova a ocorrência.

## 1.7.1 — Correção dos chefões
- Após um golpe, o recuo levava o jogador para dentro da parede do chão do corredor; agora ele volta pela passagem mais próxima e desliza para o labirinto, longe do chefe.
- Arenas regeneradas com buracos garantidos nas duas pontas do corredor e novo validador: com a porta trancada, de toda parada dá para chegar ao chefe e voltar ao labirinto (as fases 10 e 50 estavam presas).
- `tools/ship.sh`: publica somente se sintaxe, validador e teste e2e passarem.

## 1.7 — Missão de Brincar (pausa saudável)
- Metodologia de dois especialistas (psicopedagogia e diversão digital): um aviso no fim da fase, missão fora da tela com
  voz, pausa persistente com redirecionamento gentil limitado, hi five, figurinhas, 2 aventuras/dia, área dos pais.
- Tela de derrota com botões grandes (JOGAR DE NOVO / VOLTAR AO MAPA); toques fora deles não reiniciam.
- CI verifica a sintaxe de todos os scripts antes de publicar.

## 1.6 — Itens e dificuldade
- Power-ups Escudo manual (toque duplo), Ímã, Congelar, Viciado em Moedas, Multiplicador; melhorias em 3 níveis.
- 13 máscaras com bônus percentuais e imunidades; loja com abas; baús; Pula-fase.
- Curva de dificuldade mais dura nos mundos avançados; chefes finais mais fortes.

## 1.5 — Mapa rico, chefões com identidade, espinhos retráteis
- Mapa estilo Super Mario World com terreno, portas, tochas, decorações por mundo e personagem caminhando.
- 9 chefes com aparência própria, entrada cinematográfica, ataques telegrafados em fases e derrota em sequência.
- Espinhos retráteis que saem dos blocos em ciclos (só em células de passagem).

## 1.4 — Mapa de mundo, chefões e Chefão Mestre
- Mapa com prévia das fases; fase 10 de cada mundo é arena de chefe; mundo 9 com o Chefão Mestre; 81 fases.

## 1.3 — Som
- Correção do método duplicado que impedia o áudio; destravamento robusto (iOS); indicador de som.

## 1.2 — Lógica de deslize e sensação de movimento
- Invariante "nenhuma parada sem volta" no gerador (antes 46/80 fases tinham becos); justiça de morcegos/atiradores.
- Afterimages, stretch/squash, hit-stop, poeira, câmera com lead, entrada mais sensível. Aprovado por um juiz independente.

## 1.1 — Arcade e Modo Lúdico
- Arcade com coluna aberta e barreira piscante na cor do trecho. Modo Lúdico (voz, elogios, confete) com a mesma dificuldade.

## 1.0 — Primeira versão PWA
- 80 fases geradas e validadas, 8 mundos, áudio sintetizado, fonte pixel, PWA offline, servidor, GitHub Pages.
