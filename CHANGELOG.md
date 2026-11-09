# Histórico de versões

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
