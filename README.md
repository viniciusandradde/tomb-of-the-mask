# Tomb of the Mask — Android

Projeto em migração de uma versão Java desktop para Android usando **LibGDX**, com orientação **portrait**, controles por **swipe + D-pad virtual** e foco em uma edição infantil.

## Recursos previstos

- Labirinto arcade 2D com arte neon original.
- Controles por gesto e botões na tela.
- Regras reutilizáveis de bloqueio por atividade, configuradas por um adulto.
- Exemplos: “Fazer cocô” por 60 minutos e “Brincar de carrinho” por 15 minutos.
- Tela infantil com mensagem amigável e contagem regressiva.
- Persistência local para manter o bloqueio após fechar e reabrir o app.

## Documentação

- [Arquitetura Android/LibGDX](docs/ANDROID_LIBGDX_ARCHITECTURE.md)
- [Especificação dos bloqueios por atividade](docs/CHILD_ACTIVITY_LOCKS.md)

## Estado da migração

O trabalho está em andamento na branch `feat/android-libgdx`. Já foram adicionados o modelo de regra, gerenciador de bloqueios, persistência local via LibGDX Preferences, portão parental básico e testes unitários iniciais. A estrutura de build Android/Gradle, integração das telas, compilação e testes em emulador/dispositivo ainda precisam ser concluídos.

## Limites do bloqueio

O temporizador bloqueia **este jogo**, não o Android inteiro nem outros aplicativos. O portão parental é uma proteção básica dentro do app, não autenticação forte. A contagem usa o horário de término persistido no dispositivo, portanto mudanças manuais no relógio podem afetá-la. Não armazenar PINs ou chaves de assinatura em texto claro no repositório.

## APK

Ainda não há APK compilado e validado nesta etapa. Quando o build Android estiver configurado, gerar e testar o APK debug com o Gradle Wrapper. Um APK release deve ser assinado com uma chave gerenciada fora do Git.
