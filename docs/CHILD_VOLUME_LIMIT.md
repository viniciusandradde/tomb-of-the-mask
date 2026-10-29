# Proteção de volume infantil

Ao iniciar e ao voltar para o primeiro plano, o app limita o volume de mídia/áudio do Android a no máximo metade da escala reportada pelo aparelho. Enquanto a tela do jogo está ativa, os botões físicos de aumentar volume são ignorados; o botão de diminuir volume continua funcionando.

## Limites importantes

- A limitação vale para o volume de mídia, não para toque, alarmes ou chamadas.
- O Android e fabricantes podem tratar teclas, painéis rápidos, fones Bluetooth e controles externos de formas diferentes. O app não deve ser descrito como um bloqueio inviolável do volume do aparelho.
- O volume é reduzido quando o app inicia ou retorna ao primeiro plano. Se alguém alterar o volume por fora enquanto o app estiver em segundo plano, ele será limitado novamente quando o app retornar.
- A implementação precisa ser validada em aparelhos Android reais, com alto-falantes e fones de ouvido.
