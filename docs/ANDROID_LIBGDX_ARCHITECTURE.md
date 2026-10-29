# Tomb of the Mask Android — Arquitetura e plano de implementação

> Este produto-piloto segue a proposta da [Metodologia VSA Crescer+ Digital](METODOLOGIA_VSA_CRESCER_DIGITAL.md): **Tecnologia com limites. Infância com mais vida.**

## Decisões confirmadas

- Plataforma-alvo: Android.
- Entrega: código-fonte no GitHub e APK instalável.
- Motor: LibGDX (Java).
- Orientação: portrait (vertical).
- Controles: gestos de deslizar e D-pad virtual, ambos habilitados.
- Público da edição infantil: crianças de até 5 anos, com pausas configuráveis por um adulto.
- Direção visual: labirinto arcade com estética neon e arte original; não reutilizar assets proprietários sem autorização.
- Princípios de produto: adequação à idade, pausas não punitivas, privacidade mínima e mensagens acolhedoras.

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

## Pausas infantis por atividade

O adulto pode cadastrar quantas regras desejar. Cada regra possui:
- nome curto da atividade;
- duração em minutos;
- estado ativo/inativo e horário de início/fim da execução atual.

Fluxo:
1. Área de responsáveis protegida por confirmação adulta/PIN.
2. O responsável cria, edita ou remove regras, define texto e duração.
3. Ao iniciar uma regra, o jogo fica pausado e mostra mensagem simples e tempo restante.
4. O bloqueio continua mesmo se o app for fechado ou o aparelho reiniciar; o horário de término fica persistido.
5. Ao terminar o tempo, o jogo é liberado automaticamente.
6. O responsável pode encerrar uma pausa manualmente na área protegida.

Requisitos de UX e segurança:
- Interface adequada a crianças pequenas, texto curto e ícones grandes.
- Não usar linguagem humilhante, ameaçadora ou punitiva.
- Não impedir nem atrasar banheiro, alimentação, água, sono, cuidados de saúde ou pedido de ajuda.
- Não pedir ou exibir dados pessoais desnecessários.
- PIN/portão parental protege apenas configurações dentro do jogo; não bloqueia o Android nem outros aplicativos.
- O temporizador usa hora de término persistida; alterar o relógio pode afetar a contagem.
- Não detectar nem alegar que uma atividade externa foi concluída. O temporizador só mantém o jogo indisponível durante o período configurado.

## Controles e tela

### Swipe
- Exigir distância mínima de gesto.
- Escolher a direção dominante.
- Uma intenção por gesto; não duplicar o comando do D-pad.

### D-pad virtual
- Botões direcionais grandes na região inferior.
- Feedback visual e repetição controlada.
- Não cobrir objetivos ou indicadores.

## Direção visual

- Retrato e layout adaptável a diferentes proporções de tela.
- Fundo azul-marinho; paredes em violeta/ciano/magenta.
- Brilho limitado para manter fluidez em aparelhos modestos.
- Personagens, moedas, chave, portal e inimigos desenhados como arte original.
- HUD legível, botões grandes e contraste alto.
- Opção para reduzir efeitos visuais.

## Volume de mídia

Ao iniciar e ao retornar ao primeiro plano, o app tenta reduzir o volume de mídia para no máximo metade da escala reportada pelo aparelho. Enquanto a Activity estiver ativa, os comandos físicos de aumentar volume são ignorados; diminuir volume permanece permitido.

Esse controle precisa ser testado em aparelhos reais. Android, fabricantes, painéis do sistema, Bluetooth e controles externos podem se comportar de formas diferentes. Não apresentar como bloqueio inviolável do volume do dispositivo.

## Etapas de implementação

1. Estruturar projeto LibGDX com módulos `core` e `android`.
2. Garantir compilação inicial e orientação portrait.
3. Implementar grade e primeira fase jogável.
4. Implementar movimento, colisão, swipe e D-pad.
5. Implementar coleta, chave, portal, vidas e reinício.
6. Implementar persistência e pausas por atividade.
7. Adicionar inimigos e ameaça de água crescente.
8. Construir menus, pausa, configurações, vitória/derrota e HUD.
9. Polir efeitos, animações e áudio original/licenciado.
10. Adicionar testes de lógica e checklist em emulador/dispositivo.
11. Documentar APK debug e APK release assinado.
12. Revisar a aderência à metodologia VSA Crescer+ Digital.

## Critérios de aceite

- Projeto Android compila com Gradle Wrapper.
- Abre em portrait e adapta o jogo à área disponível.
- Swipe e D-pad funcionam sem conflito.
- Movimento e colisões não dependem da taxa de quadros.
- Pausas personalizadas podem ser cadastradas, ativadas e reutilizadas.
- O texto da atividade e o tempo restante são exibidos durante a pausa.
- A pausa persiste ao fechar/reabrir e libera após o término.
- A criança não consegue alterar regras sem passar pelo portão parental do app.
- O limite de volume é validado em dispositivos reais, com documentação das limitações.
- Recursos gráficos são liberados no ciclo de vida das telas.
- README e metodologia documentam limites, privacidade e uso responsável.

## Entrega e limites

Código enviado ao GitHub não equivale a APK compilado. Só declarar APK pronto após executar build e teste reais. A assinatura de release deve ficar fora do repositório. A proteção parental é interna ao app, não um mecanismo de bloqueio de todo o dispositivo.
