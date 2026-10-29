# Tomb of the Mask — Android

Migração de uma versão Java desktop para Android usando **LibGDX**, orientação **portrait**, controles previstos por **swipe + D-pad virtual** e foco em uma edição infantil.

## Recursos em desenvolvimento

- Base de projeto Android + LibGDX (módulos `android` e `core`).
- Modelo de regras reutilizáveis de bloqueio por atividade.
- Persistência local das regras e do instante de liberação.
- Tela infantil de bloqueio com atividade e contagem regressiva.
- Portão parental básico e controlador de cadastro/edição/ativação das atividades.
- Próximas etapas: interface visual para cadastro das regras, labirinto jogável, controles, testes de build e validação em dispositivo.

Exemplos de regras: “Fazer cocô” por 60 minutos e “Brincar de carrinho” por 15 minutos.

## Documentação

- [Arquitetura Android/LibGDX](docs/ANDROID_LIBGDX_ARCHITECTURE.md)
- [Especificação dos bloqueios por atividade](docs/CHILD_ACTIVITY_LOCKS.md)

## Estado da entrega

O trabalho está em andamento na branch `feat/android-libgdx`. Foi adicionada a configuração Gradle inicial e o launcher Android em portrait. **O build ainda não foi executado/validado e não há APK comprovadamente compilado nesta etapa.** A interface para o responsável e o jogo completo ainda não estão finalizados.

## Limites do bloqueio

O temporizador bloqueia **este jogo**, não o Android inteiro nem outros aplicativos. O portão parental é uma proteção básica dentro do app, não autenticação forte. A contagem usa o horário de término persistido no dispositivo, portanto mudanças manuais no relógio podem afetá-la. Não armazenar PINs ou chaves de assinatura em texto claro no repositório.

## APK

Após concluir o build e os testes, gerar APK debug. Um APK release deve ser assinado com uma chave gerenciada fora do Git.
