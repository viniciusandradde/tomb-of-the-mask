# Tomb of the Mask Kids — Android

Migração do jogo Java desktop para Android com **LibGDX**, orientação **portrait** e foco em crianças de até 5 anos.

## Implementado nesta etapa

- Projeto Gradle com módulos `core` e `android`, launcher Android em portrait e workflow de CI.
- Tela inicial com navegação para jogar e área dos responsáveis.
- Protótipo jogável de labirinto, com movimento por swipe e D-pad virtual.
- Moedas e portal de saída no labirinto de demonstração.
- Cadastro de múltiplas regras de bloqueio por atividade, com duração em minutos.
- Tela infantil com atividade e contagem regressiva.
- Persistência local das regras e do horário de liberação.
- Portão parental básico; o PIN é armazenado como hash SHA-256, não como texto puro.
- Testes unitários iniciais para regras de tempo e validação do PIN.

Exemplos de regras: “Fazer cocô” por 60 minutos e “Brincar de carrinho” por 15 minutos.

## Documentação

- [Arquitetura Android/LibGDX](docs/ANDROID_LIBGDX_ARCHITECTURE.md)
- [Especificação dos bloqueios por atividade](docs/CHILD_ACTIVITY_LOCKS.md)

## Próximas etapas

A interface atual é um protótipo funcional inicial, ainda sem polimento visual final. Faltam validar a compilação em CI, executar os testes e instalar o APK em emulador/dispositivo. Também faltam editar/remover regras pela interface, polir o labirinto, adicionar inimigos e água crescente, melhorar o portão parental e finalizar os menus.

## Limites do bloqueio

O temporizador bloqueia **este jogo**, não o Android inteiro nem outros aplicativos. O portão parental é uma barreira básica dentro do app, não autenticação forte. O temporizador depende do relógio do aparelho; alterar manualmente a hora pode afetar a liberação. Não armazenar chaves de assinatura no repositório.

## APK

O workflow `Android build` tenta executar os testes e gerar um APK debug como artefato do GitHub Actions. **Não considerar o APK pronto até que o workflow termine com sucesso e o artefato seja instalado e validado em dispositivo/emulador.** Um APK release deve ser assinado com chave gerenciada fora do Git.
