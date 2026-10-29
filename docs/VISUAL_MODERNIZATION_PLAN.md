# Plano de modernização visual — Tomb of the Mask

## Objetivo

Evoluir o clone Java atual para uma experiência arcade de labirinto mais próxima da linguagem visual de jogos mobile modernos: fundo escuro, paredes neon, brilho controlado, animações suaves, sprites vetoriais e HUD legível, preservando e melhorando as mecânicas já implementadas.

> A referência é o estilo e a sensação de jogo. Logos, sprites, telas, sons e outros assets proprietários do jogo comercial original não devem ser copiados sem autorização. Criar assets próprios com identidade visual semelhante em alto nível.

## Diagnóstico inicial

- Aplicação Java desktop baseada em AWT/Swing e `Graphics2D`.
- Renderização principal em `Game_Main.drawPerFrame`.
- Lógica de desenho concentrada em `Game_Methods.java`.
- Layouts de fases declarados como strings em `Game_World.java`.
- Entidades e estados em `Game_Classes.java`.
- Existe um loop de renderização e lógica temporal que merece revisão para separar atualização de jogo e desenho.

## Direção de arte

- Paleta escura: fundo azul-marinho/preto com paredes roxas, ciano e magenta.
- Contraste de alto nível entre piso e paredes, com contornos luminosos e bloom simulado em múltiplas passagens.
- Personagem e inimigos desenhados com primitivas próprias e silhuetas claras; animação por estados.
- Moedas, chave e portal com brilho, pulso e feedback de coleta.
- HUD consistente: pontuação, vida, fase, tempo e progresso, sem sobrepor elementos do labirinto.
- Menus com hierarquia clara, seleção animada e tipografia legível.
- Layout escalável para janela redimensionável e diferentes resoluções.

## Plano de execução

### Fase 1 — Fundação visual
1. Centralizar cores, dimensões, espaçamentos e fontes em uma classe de tema.
2. Usar antialiasing, interpolação e composição apropriadas no contexto gráfico.
3. Criar helpers reutilizáveis para glow, painéis e texto.
4. Garantir que o estado original do `Graphics2D` seja restaurado após efeitos.

### Fase 2 — Mundo
1. Separar desenho de piso, paredes, bordas e decoração.
2. Adicionar variação de brilho e detalhes de piso de forma determinística, sem distrair da jogabilidade.
3. Melhorar animação de moedas, chave, portal e água crescente.
4. Validar alinhamento dos tiles e limites de colisão após cada mudança visual.

### Fase 3 — Personagem e inimigos
1. Criar desenhos vetoriais customizados para o jogador e inimigos.
2. Adicionar orientação pela direção do movimento, animação simples e feedback de dano.
3. Tornar hitboxes visíveis somente no modo de desenvolvimento.

### Fase 4 — HUD e menus
1. Reorganizar HUD usando margens e tipografia consistentes.
2. Implementar tela inicial, pausa, configurações, derrota e conclusão com identidade consistente.
3. Exibir instruções de teclado e controles sem obscurecer a área de jogo.

### Fase 5 — Qualidade
1. Separar atualização da simulação de renderização, com delta time fixo/limitado.
2. Remover tarefas temporizadas conflitantes e desligar executores ao sair.
3. Validar colisões, transições de fase, reinício e dificuldade.
4. Documentar comandos de compilação e execução; adicionar testes onde for viável.

## Critérios de aceite

- A lógica de movimentação, coleta, chave/portal, inimigos, vidas e água continua funcional.
- O desenho funciona em escala de janela diferente sem desalinhamento de tiles.
- Efeitos gráficos não alteram hitboxes nem criam flicker.
- Menus e HUD permanecem legíveis e consistentes.
- Nenhum asset proprietário novo é incorporado sem licença/autorizações adequadas.
- A aplicação continua compilando pelo fluxo de build documentado.

## Próxima alteração recomendada

Começar pela fundação visual e depois modernizar o desenho de paredes/tiles, pois essa área dá o maior ganho visual sem reescrever o motor de jogo inteiro.
