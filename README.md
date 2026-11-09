# Tumba da Máscara — jogo PWA de labirinto neon

Jogo próprio inspirado na mecânica de *Tomb of the Mask*: deslize e voe até bater na parede,
colete pontos e moedas, desvie de espinhos, morcegos, flechas e da lava que sobe.
Funciona no celular e no computador, instala como aplicativo e roda **offline**.

<div align="center">
  <img src="assets/pwa-titulo.png" width="180"> <img src="assets/pwa-fase1.png" width="180"> <img src="assets/pwa-abismo.png" width="180">
  <br><img src="assets/pwa-desktop.png" width="560">
</div>

## Jogar

```bash
node server.js            # abre em http://localhost:8080 (e no IP da rede para o celular)
```

Sem instalar nada além do Node. Também há `Dockerfile` e um workflow de GitHub Pages
(`.github/workflows/pages.yml`) para publicar com HTTPS, necessário para instalar o PWA fora de localhost.

## Conteúdo

- 81 fases em 9 mundos (Catacumba, Cripta Azul, Selva Perdida, Vulcão, Abismo, Templo Dourado, Sombras, Núcleo), todas validadas por um solver: saída e coletáveis sempre alcançáveis e **nenhum beco sem saída** (de qualquer parada, a saída continua alcançável).
- Mapa de mundo estilo Super Mario World (terreno, caminho de pedra, portas, tochas, decorações por mundo, personagem caminhando) com prévia de cada fase; chefões únicos com entrada cinematográfica e ataques telegrafados em fases; Chefão Mestre final para zerar o jogo.
- Espinhos retráteis que saem dos blocos em ciclos, como no original.
- Modo Arcade: coluna infinita para cima com espaço aberto, obstáculos e uma barreira piscante na cor do trecho que sobe em velocidade média. Encostou, perdeu.
- 3 estrelas por fase. Power-ups: Escudo (ativação manual com toque duplo), Ímã, Congelar, Viciado em Moedas e Multiplicador, melhoráveis na loja. 13 máscaras com bônus percentuais e imunidades. Baús de recompensa e Pula-fase.
- Dificuldade crescente de verdade: mundos finais com labirintos altos e muitos perigos; chefes finais mais fortes.
- Música chiptune e efeitos sonoros gerados em tempo real (sem arquivos de áudio).
- **Modo Lúdico** (para crianças pequenas) e **Modo Clássico**, com a mesma dificuldade: o lúdico adiciona voz em português, elogios, confete e mensagens carinhosas; a seta de dica é opcional e vem desligada.
- Fonte pixel art própria, efeito CRT, tremor de tela, partículas.

Controles: deslizar na tela, ou setas / WASD no teclado. `P` pausa, `R` reinicia.

## Scripts

| Comando | O que faz |
|---|---|
| `npm start` | servidor estático na porta 8080 |
| `npm run build:levels` | regenera as 80 fases (`pwa/js/levels.js`) |
| `npm run validate` | verifica que todas as fases são solucionáveis |
| `node tools/process-assets.js` | converte as artes em `pwa/assets/src` em fundos e ícones |
| `npm run test:e2e` | teste de fumaça com Playwright (joga a fase 1 com o solver) |

## Documentação

- `docs/MANUAL.md`: manual para pais e crianças (instalar, jogar, modos, itens, Missão de Brincar, área dos pais, problemas comuns).
- `docs/ARQUITETURA.md`: arquitetura técnica, formato das fases, garantias do gerador, estados, salvamento, como estender, testes e publicação.
- `ANALISE.md`: análise do jogo original, decisões de design, metodologia da pausa saudável com fontes e questões legais.
- `CHANGELOG.md`: histórico de versões.

## Versão antiga (Java)

Os arquivos `*.java`, o `.jar` e o `.exe` na raiz são o clone original em Java (projeto de faculdade)
que serviu de ponto de partida. A versão atual é a pasta `pwa/`.
