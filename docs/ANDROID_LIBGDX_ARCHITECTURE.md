# Tomb of the Mask Android — Arquitetura e plano de implementação

## Decisões confirmadas

- Plataforma-alvo: Android.
- Entrega: código-fonte no GitHub e APK instalável.
- Motor: LibGDX (Java).
- Orientação: portrait (vertical).
- Controles: gestos de deslizar e D-pad virtual, ambos habilitados.
- Público da edição infantil: crianças de até 5 anos, com bloqueios configuráveis por um adulto.
- Direção visual: labirinto arcade com estética neon e arte original; não reutilizar assets proprietários sem autorização.

## Migração do jogo desktop

O projeto original usa Java desktop/AWT/Graphics2D. Esse motor de desenho não é portável diretamente para Android. A migração preservará as regras do jogo como referência, mas implementará o ciclo de renderização com LibGDX. Não incluir classes AWT/Swing no módulo Android.

## Arquitetura proposta

```text
android/                         # inicialização e ciclo de vida Android
core/src/main/java/com/vsa/tombmask/
  TombMaskGame.java
  screens/
    MenuScreen.java
    GameScreen.java
    SettingsScreen.java
    PauseScreen.java
    GameOverScreen.java
    ChildLockScreen.java
    ParentSettingsScreen.java
  game/
    GameWorld.java
    LevelMap.java
    Player.java
    Enemy.java
    Collectible.java
    GameState.java
  input/
    TouchController.java
    VirtualDpad.java
  render/
    MazeRenderer.java
    EntityRenderer.java
    HudRenderer.java
    NeonEffects.java
  parental/
    BlockRule.java
    BlockLockManager.java
    BlockRuleRepository.java
    ParentGate.java
```

Os pacotes são a estrutura-alvo; preservar a compatibilidade com o build criado.

## Bloqueios infantis por atividade

O adulto pode cadastrar quantas regras desejar. Cada regra possui:
- nome curto da atividade (ex.: “Fazer cocô”, “Brincar de carrinho”, “Guardar os brinquedos”);
- duração em minutos (ex.: 15, 30, 60);
- estado ativo/inativo e horário de início/fim da execução atual.

Fluxo:
1. Área de responsáveis protegida por confirmação adulta/PIN.
2. O responsável cria, edita ou remove regras, define texto e duração.
3. Ao iniciar uma regra, o jogo fica bloqueado imediatamente e mostra uma mensagem simples: “Hora de [atividade]” e o tempo restante.
4. O bloqueio continua mesmo se o app for fechado ou o aparelho reiniciar; a data/hora de término fica persistida.
5. Ao terminar o tempo, o jogo é liberado automaticamente. A regra continua salva para ser usada novamente.
6. O responsável pode encerrar um bloqueio manualmente na área protegida; a criança não pode fazê-lo na tela infantil.

Requisitos de UX e segurança:
- Interface adequada a crianças pequenas, texto curto e ícones grandes.
- Não usar linguagem humilhante, ameaçadora ou punitiva.
- Não pedir nem exibir dados pessoais da criança.
- PIN/portão parental protege apenas as configurações dentro do jogo; não é um bloqueio do Android nem impede abrir outros aplicativos.
- O temporizador usa hora de término persistida. Alterar o relógio do aparelho pode afetar a contagem; não anunciar isso como controle parental inviolável.
- Não há liberação automática baseada em “detectar” se a atividade foi concluída: a criança/responsável realiza a atividade fora do app e o adulto inicia ou encerra o bloqueio.

## Controles e tela

### Swipe
- Exigir distância mínima de gesto.
- Escolher a direção dominante.
- Uma intenção por gesto; não duplicar o comando do D-pad.

### D-pad virtual
- Botões direcionais grandes na região inferior, fora da área do labirinto.
- Feedback visual e suporte a repetição controlada.
- Não cobrir objetivos ou indicadores.

## Direção visual

- Retrato e layout adaptável a diferentes proporções de tela.
- Fundo azul-marinho quase preto; paredes em violeta/ciano/magenta.
- Brilho limitado para manter fluidez em aparelhos modestos.
- Personagens, moedas, chave, portal e inimigos desenhados como arte original.
- HUD legível, botões grandes e contraste alto.
- Opção para reduzir efeitos visuais.

## Etapas de implementação

1. Estruturar o projeto LibGDX com módulos `core` e `android` e build Gradle.
2. Garantir compilação inicial e orientação portrait.
3. Implementar grade e primeira fase jogável.
4. Implementar movimento, colisão, swipe e D-pad.
5. Implementar coleta, chave, portal, vidas e reinício.
6. Implementar persistência e regras de bloqueio por atividade, com tela de bloqueio e portão parental.
7. Adicionar inimigos e ameaça de água crescente.
8. Construir menus, pausa, configurações, vitória/derrota e HUD.
9. Polir efeitos, animações e áudio original/licenciado.
10. Adicionar testes de lógica e checklist em emulador/dispositivo.
11. Documentar APK debug e APK release assinado.

## Critérios de aceite

- Projeto Android compila com Gradle Wrapper.
- Abre em portrait e adapta o jogo à área disponível.
- Swipe e D-pad funcionam sem conflito.
- Movimento e colisões não dependem da taxa de quadros.
- Bloqueios personalizados podem ser cadastrados, ativados e reutilizados.
- O texto da atividade e o tempo restante são exibidos durante o bloqueio.
- O bloqueio persiste ao fechar/reabrir o app e libera após o término.
- A criança não consegue alterar regras sem passar pelo portão parental do app.
- Recursos gráficos são liberados no ciclo de vida das telas.
- README documenta build e instalação.

## Entrega e limites

O código enviado ao GitHub não equivale a APK compilado. Só declarar APK pronto após executar build e teste reais. A assinatura de release deve ficar fora do repositório. A proteção parental é interna ao app, não um mecanismo de bloqueio do dispositivo.
