<div align="center">
  <img src="assets/vsa-crescer-digital.svg" width="112" alt="Ícone VSA Crescer+ Digital" />
  <h1>VSA Crescer+ Digital</h1>
  <p><strong>Tecnologia com limites. Infância com mais vida.</strong></p>
  <p>Metodologia de bem-estar digital infantil e apoio parental da VSA Tecnologia</p>
</div>

---

# Tomb Mask Kids — Android

O **Tomb Mask Kids** é o produto-piloto da metodologia **VSA Crescer+ Digital**. O objetivo é oferecer uma experiência de jogo infantil com controles parentais claros e pausas que apoiem uma rotina equilibrada.

Este repositório contém a migração do jogo Java desktop para Android usando **LibGDX**, com orientação vertical e foco inicial em crianças de até 5 anos.

## A metodologia VSA Crescer+ Digital

A VSA Crescer+ Digital é uma proposta de metodologia para orientar a criação de aplicativos para crianças e famílias. Ela busca equilibrar tecnologia, desenvolvimento infantil, segurança, privacidade, rotina e convivência. Não é uma certificação clínica ou jurídica; a proposta deve ser revisada por especialistas e famílias antes de ser apresentada como padrão validado.

### Modelo CRESCER

| Pilar | Princípio |
|---|---|
| **C — Criança no centro** | Respeitar idade, desenvolvimento, acessibilidade e dignidade. |
| **R — Rotina saudável** | Apoiar horários e transições previsíveis, sem transformar necessidades básicas em punição. |
| **E — Equilíbrio entre telas e vida real** | Abrir espaço para sono, movimento, leitura, brincadeiras e convivência. |
| **S — Segurança e privacidade** | Minimizar dados, proteger configurações e adotar privacidade por padrão. |
| **C — Conteúdo adequado** | Oferecer experiências apropriadas à idade e evitar publicidade intrusiva e padrões manipulativos. |
| **E — Envolvimento dos responsáveis** | Dar controles compreensíveis aos adultos e apoiar combinados familiares. |
| **R — Revisão contínua** | Testar, ouvir famílias, documentar limites e revisar o produto. |

### Princípios essenciais

- Melhor interesse, segurança e dignidade da criança.
- Controles parentais transparentes, proporcionais e adequados à idade.
- Sem vergonha, ameaça ou mensagens humilhantes.
- Não impedir nem atrasar banheiro, alimentação, água, sono, cuidados de saúde ou pedido de ajuda para condicionar o retorno ao jogo.
- Não usar vigilância ou coleta de dados desnecessárias.
- Não prometer que o aplicativo bloqueia todo o celular quando só controla o próprio jogo.

Leia a metodologia completa: [docs/METODOLOGIA_VSA_CRESCER_DIGITAL.md](docs/METODOLOGIA_VSA_CRESCER_DIGITAL.md).

## Implementado nesta etapa

- Projeto Gradle com módulos `core` e `android`, launcher Android em portrait e workflow de CI.
- Tela inicial com navegação para jogar e área dos responsáveis.
- Protótipo de labirinto com movimento por swipe e D-pad virtual.
- Moedas e portal de saída no labirinto de demonstração.
- Cadastro de múltiplas regras de pausa por atividade, com duração em minutos.
- Tela infantil com mensagem e contagem regressiva.
- Persistência local das regras e do horário de liberação.
- Portão parental básico; o PIN é armazenado como hash SHA-256, não como texto puro.
- Limite inicial de volume de mídia para no máximo metade da escala do aparelho e bloqueio dos botões físicos de aumentar volume enquanto o app está ativo; ainda precisa de validação em dispositivos reais.
- Testes unitários iniciais para regras de tempo e validação do PIN.

### Uso responsável das pausas

O responsável pode configurar diferentes pausas, como “Hora de brincar com os carrinhos” ou “Pausa para guardar os brinquedos”. O aplicativo não detecta se a tarefa foi concluída; o temporizador apenas mantém este jogo indisponível pelo período definido.

Necessidades fisiológicas, como ir ao banheiro, nunca devem ser atrasadas ou condicionadas a um temporizador, recompensa ou autorização do app. Use as pausas como apoio gentil à rotina, não como punição.

## Documentação

- [Metodologia VSA Crescer+ Digital](docs/METODOLOGIA_VSA_CRESCER_DIGITAL.md)
- [Arquitetura Android/LibGDX](docs/ANDROID_LIBGDX_ARCHITECTURE.md)
- [Especificação dos bloqueios por atividade](docs/CHILD_ACTIVITY_LOCKS.md)
- [Proteção de volume infantil](docs/CHILD_VOLUME_LIMIT.md)

## Relação com outros produtos VSA

A metodologia deve ser aplicada de forma transversal. O repositório privado [kiddo-wise-routines](https://github.com/viniciusandradde/kiddo-wise-routines) pode ser avaliado como complemento para rotinas familiares, depois de uma revisão funcional. O aplicativo chamado Data TV também deve passar por avaliação específica de conteúdo, perfis, controles, privacidade e pausas; a implementação deve ser adaptada à arquitetura real desse produto.

## Próximas etapas

- Validar a compilação em CI e executar os testes.
- Instalar e testar o APK em emulador e dispositivos Android reais.
- Validar o limite de volume em aparelhos e com fones.
- Adicionar edição e remoção de regras pela interface.
- Polir o labirinto e adicionar inimigos, água crescente, menus e efeitos.
- Melhorar o portão parental e revisar a segurança das configurações.
- Revisar a metodologia com profissionais qualificados e famílias antes de alegar benefícios clínicos ou educacionais.

## Limites conhecidos

O temporizador bloqueia **este jogo**, não o Android inteiro nem outros aplicativos. O portão parental é uma barreira básica dentro do app, não autenticação forte. O temporizador depende do relógio do aparelho; alterar manualmente a hora pode afetar a liberação. A limitação de volume pode variar conforme a versão do Android e o fabricante. Não armazenar chaves de assinatura no repositório.

## APK e status

O workflow `Android build` tenta executar os testes e gerar um APK debug como artefato do GitHub Actions. **Não considerar o APK pronto até que o workflow termine com sucesso e o artefato seja instalado e validado em dispositivo/emulador.** Um APK release deve ser assinado com chave gerenciada fora do Git.

## Referências públicas

- [American Academy of Pediatrics — Digital Ecosystems, Children, and Adolescents](https://publications.aap.org/pediatrics/article/157/2/e2025075320/)
- [American Academy of Pediatrics — The 5 Cs of Media Use](https://www.aap.org/5Cs)
- [HealthyChildren.org — Family Media Plan](https://www.healthychildren.org/English/family-life/Media/Pages/How-to-Make-a-Family-Media-Use-Plan.aspx)
- [UNICEF Brasil — Estatuto Digital da Criança e do Adolescente](https://www.unicef.org/brazil/innocenti/estatuto-digital-da-crianca-e-do-adolescente-eca-digital)
- [ANPD — Enunciado CD/ANPD nº 1/2023](https://bibliotecadigital.mj.gov.br/bitstream/1/10215/2/Enunciado_ANPD_2023_1.html)

Estas referências ajudam a fundamentar a proposta, mas não representam endosso formal à metodologia VSA. A conformidade deve ser avaliada por profissionais especializados antes do lançamento comercial.
