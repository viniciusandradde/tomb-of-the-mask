# Especificação — Bloqueios por atividade (edição infantil)

## Objetivo
Permitir que um adulto configure várias atividades e associe a cada uma um período durante o qual o jogo fica indisponível. Exemplos: “Fazer cocô” por 60 minutos; “Brincar de carrinho” por 15 minutos.

## Modelo de dados
- `id`: identificador estável da regra.
- `title`: nome da atividade escrito pelo responsável.
- `durationMinutes`: duração configurada, inteiro positivo.
- `enabled`: se a regra pode ser usada.
- `startedAtEpochMs`: início da execução atual, nulo quando inativa.
- `unlockAtEpochMs`: instante previsto para liberação, nulo quando inativa.
- `createdAtEpochMs` / `updatedAtEpochMs`: auditoria local simples.

As regras são reutilizáveis: expirar uma execução não apaga a definição.

## Fluxo de uso
1. Na tela de responsáveis, passar pelo portão parental.
2. Tocar em “Adicionar atividade”.
3. Informar nome e duração (minutos).
4. Salvar a regra; ela aparece numa lista de atividades configuradas.
5. Tocar em “Bloquear agora” para ativá-la.
6. A tela infantil mostra o título, uma mensagem amigável e a contagem regressiva.
7. Ao chegar a zero, retornar à tela inicial e permitir jogar.
8. O responsável pode cancelar o bloqueio pela área protegida.

## Regras de negócio
- Aceitar várias atividades configuradas.
- Só um bloqueio ativo por vez para evitar ambiguidade; tentar ativar outro exige confirmação para substituir o bloqueio vigente.
- A duração deve ser maior que zero e ter limite configurável defensivo (sugestão inicial: 1 a 1.440 minutos).
- Ao ativar uma regra, calcular e persistir o instante de liberação.
- Na inicialização/resume, comparar a hora atual com o instante de liberação e atualizar o estado.
- O timer visual deve ser atualizado a cada segundo, sem salvar a cada frame.
- O bloqueio não deve depender de manter o processo aberto.
- A área de responsáveis exige portão parental/PIN; a tela de bloqueio infantil não oferece botão para ignorar.
- Se os dados persistidos estiverem inválidos, falhar de forma segura: não travar o app permanentemente e solicitar ação do responsável.
- O temporizador depende do relógio do dispositivo; mudança manual de hora pode afetar o resultado.

## Texto sugerido na tela
Título: “Pausa para esta atividade”
Subtítulo: “Agora é hora de: {atividade}”
Contador: “O jogo fica disponível em {tempo restante}”
Quando expirar: “Pronto! O jogo está disponível novamente.”

## Privacidade e limites
- Os dados ficam locais no dispositivo; sem conta ou envio para servidor.
- Não coletar nome completo, localização ou outros dados pessoais.
- Não alegar que o jogo bloqueia o aparelho inteiro.
- O adulto é responsável por escolher atividades e tempos apropriados à criança.
