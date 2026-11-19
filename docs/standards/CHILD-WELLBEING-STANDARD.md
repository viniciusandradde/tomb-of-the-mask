# Padrão VSA de Bem-Estar Digital Infantil — v0.1 (proposta)

> Padrão de desenvolvimento para todas as aplicações infantis da VSA Tecnologia (Math Quest, Tumba da Máscara e as próximas). Nasceu da "Missão de Brincar" deste projeto. A situação do Tumba da Máscara frente ao padrão está em [../ADOCAO-PADRAO-BEM-ESTAR.md](../ADOCAO-PADRAO-BEM-ESTAR.md). Cópia sincronizada com o repositório do Math Quest (`docs/standards/CHILD-WELLBEING-STANDARD.md`).
>
> Convenção: **DEVE** = obrigatório; **DEVERIA** = recomendado, e a exceção precisa de justificativa no PR; **PODE** = opcional.

## 1. Objetivo

Garantir que todo app infantil da VSA:
1. respeite limites de tela adequados à idade;
2. faça transições sem conflito, em pontos naturais de parada e com uma próxima atividade concreta fora da tela;
3. dê ao adulto controle simples e protegido;
4. trate a criança com linguagem gentil, sem culpa e sem coletar dados desnecessários.

## 2. Princípios

1. **O app avisa e convida; o adulto decide e conduz** (co-regulação).
2. **Ponto natural de parada:** nunca interromper no meio de uma tarefa, salvo pelo teto duro.
3. **Um aviso só**, sem contagem regressiva.
4. **Trocar, não só proibir:** toda pausa traz uma missão concreta fora da tela.
5. **Firme e gentil:** o tempo da pausa nunca reinicia; a insistência recebe resposta limitada e carinhosa.
6. **Celebrar a volta** com um ritual curto.
7. **Recompensa que não compra nada:** a pausa não vira moeda do jogo.
8. **Privacidade por padrão:** dados só no aparelho e sem identificação da criança.
9. **Conservador por padrão, ajustável pelo adulto.**
10. **Regras viram teste:** linguagem, estados e tempos são verificados no CI.

## 3. Faixas etárias e padrões

Referência: SBP, *#MenosTelas #MaisSaúde* (2019, atualização 2024). Revisar a cada nova versão do manual.

| Faixa | SBP | Uso por rodada (padrão / opções) | Pausa | Rodadas por dia | Janela de horários padrão |
|---|---|---|---|---|---|
| Menos de 2 anos | Sem telas | O app **não DEVE** oferecer perfil | — | — | — |
| 2 a 5 (3 a 6 nos apps) | Até 1 h/dia, com supervisão | 15 min / 10–30 | 15 min / 10–30 | 2 / 1–3 | 8h–19h |
| 6 a 10 | 1 a 2 h/dia, com supervisão | 20 min / 15–45 | 10 min / 10–20 | 3 / 1–4 | 7h–20h |
| 11 a 13 | 2 a 3 h/dia, com supervisão; nunca "virar a noite" | 30 min / 20–60 | 10 min / 5–20 | 3 / 1–4 | 7h–21h |

O app DEVE guardar **somente a faixa de idade**, nunca a data de nascimento.

## 4. Componentes

| # | Componente | Nível | Regra |
|---|---|---|---|
| C1 | Contador de uso | DEVE | Conta só o tempo de atividade ativa. Zera ao fim de cada rodada e quando o app fica fechado por mais tempo que a pausa |
| C2 | Ponto de parada | DEVE | Cada app declara seus pontos de parada (fim de fase, rodada ou missão). A transição só acontece neles |
| C3 | Aviso único | DEVE | Um aviso cerca de 3 min antes, num ponto de parada, falado (até 6 anos) ou discreto na tela (7 anos ou mais). Sem contagem regressiva |
| C4 | Teto duro | DEVE | Limite + 2 min: transição suave mesmo fora do ponto de parada, exceto em momentos críticos (por exemplo, chefão) |
| C5 | Missão fora da tela | DEVE | Ilustração grande, texto curto falado e uma ação concreta. Sorteio sem repetir as últimas 3, missões calmas depois das 18h e sem agitadas depois das 19h. Chime distinto para o adulto |
| C6 | Pausa persistente | DEVE | Tempo mostrado sem números (até 6 anos). Relógio de parede salvo: fechar e reabrir mantém a pausa. O tempo **nunca** reinicia |
| C7 | Insistência limitada | DEVE | No máximo 4 falas por pausa, com 20 s de intervalo, escalando com carinho até "chame um adulto"; depois, só feedback visual |
| C8 | Ritual de volta | DEVE | "Voltei!" seguido de uma celebração curta ("toca aqui" até 6 anos; "missão cumprida" para os maiores) |
| C9 | Limite diário | DEVE | Depois da última rodada, tela "Até amanhã" (ou "Bom trabalho hoje"); só o adulto libera |
| C10 | Janela de horários | DEVE | Fora da janela, tela "Hora de descansar" com missão calma e sem jogo. Data e hora no **fuso local** |
| C11 | Área dos pais | DEVE | Portão adequado à idade (seção 7); configurações da seção 3; "pausar agora", "liberar agora" (frase neutra), "zerar hoje"; resumo de hoje e da semana |
| C12 | Recompensa | DEVE | Figurinha ou medalha decorativa, separada da economia do jogo e das recompensas de aprendizagem |
| C13 | Voz | DEVERIA | Fala pt-BR calma (velocidade 0,78–0,9), frases curtas, legenda na tela, botão "ouvir de novo" |
| C14 | Acessibilidade | DEVE | Alvos de toque grandes, legenda das falas, respeito a "reduzir movimento", sem depender só de cor |

## 5. Máquina de estados padrão

```text
                 ┌───────────── fora da janela de horários ─────────────┐
                 ▼                                                      │
  [outside-hours] ──(entra na janela)──► [idle] ──(limite − 3 min, no ponto de parada)──► [warned]
                                           ▲                                                │
                                           │                         (limite, no ponto de parada
                                           │                          ou limite + 2 min)
                                           │                                                ▼
   [done] ◄──(última rodada do dia)── [return] ◄──(pausa concluída + "Voltei!")── [break] ◄──(aceitou)── [mission]
     │                                     │
     └──(novo dia local ou adulto libera)──┴──(rodadas restantes)──► [idle]
```

- Transições **só** pelos eventos: `tick(dt)`, `checkpoint()`, `accept()`, `returnTap()`, `insist()`, `parentPause()`, `parentUnlock()`, `parentReset()`, `clockChanged(now)`.
- O núcleo DEVE ser **puro e determinístico**, com relógio injetável, para ser testado sem interface.

## 6. Modelo de dados (local)

```ts
type WellbeingConfig = {
  enabled: boolean;
  sessionMin: number;         // uso por rodada
  breakMin: number;           // duração da pausa
  roundsPerDay: number;
  window: { start: string; end: string };   // "08:00" e "19:00", fuso local
  pinHash?: string;           // só quando o portão por PIN estiver ativo (hash com sal)
};

type WellbeingState = {
  status: 'idle' | 'warned' | 'mission' | 'break' | 'return' | 'done' | 'outside-hours';
  activeSec: number;          // uso na rodada atual
  breakStartedAt?: number;    // relógio de parede (ms)
  missionId?: string;
  recentMissions: string[];   // últimas 3
  insistCount: number;
  lastInsistAt?: number;
  roundsToday: number;
  localDay: string;           // AAAA-MM-DD no fuso do aparelho (nunca toISOString)
  lastActiveAt: number;
};

type WellbeingLog = { localDay: string; minutes: number; rounds: number; missionsDone: string[] };
```

Proibido guardar: nome, foto, voz, localização ou qualquer identificador da criança.

## 7. Portão parental

| Faixa | Portão mínimo |
|---|---|
| 3 a 6 | Segurar 3 s + conta de dois dígitos (por exemplo, 23 + 48) |
| 7 a 10 | Segurar 3 s + conta com três dígitos **ou** PIN |
| 11 ou mais | **PIN de 4 dígitos** criado pelo adulto (hash com sal, salvo no aparelho), com 3 tentativas e espera de 30 s |

Apps de **matemática** NÃO DEVEM usar como portão uma conta da faixa que o próprio app ensina.

## 8. Conteúdo das missões

Estrutura:

```ts
type Mission = {
  id: string;
  ages: ('3-6' | '6-10' | '11-13')[];
  category: 'movimento' | 'brinquedo' | 'familia' | 'hidratacao' | 'criatividade' | 'mundo-real' | 'descanso';
  energy: 'calma' | 'ativa';
  title: string;
  text: string;               // elogio de processo → convite → missão → ação
  icon: string;
  skill?: string;             // por exemplo, código da BNCC quando a missão é do tipo "mundo-real"
};
```

Regras de conteúdo:
- **Banco mínimo:** 12 missões por faixa, com pelo menos 3 calmas e pelo menos 3 do tipo "mundo-real" ligadas à habilidade do app.
- **Formato:** frase curta (até 25 palavras para 3 a 6 anos), uma ação por missão, segura para fazer em casa.
- Nada que exija comprar algo, sair de casa sozinho ou usar outra tela.
- **Personagens:** sem marcas ou personagens licenciados ("seu super-herói favorito").
- **Inclusão:** "um adulto" ou "alguém da família", e não "mamãe ou papai".
- **Liberar antes da hora:** só frases neutras ("Combinado com o adulto, vamos continuar").

### Linguagem proibida (verificada no CI)

- **Violência:** golpe, bater nele, esmagar, matar, morreu, derrotado, furioso.
- **Culpa e castigo:** castigo, desobedeceu, de novo não, que feio.
- **Pressão:** rápido senão…, contagem regressiva falada.
- **Termos que excluem** e **marcas licenciadas**.

Cada app DEVE ter um script `lint:text` no CI, como o `tools/lint-text.js` do Tumba da Máscara.

## 9. Critérios de aceite (checklist de PR)

- [ ] Aviso único aparece só num ponto de parada, cerca de 3 min antes.
- [ ] A missão abre no ponto de parada depois do limite; o teto duro funciona com limite + 2 min.
- [ ] A pausa sobrevive a fechar e reabrir; o tempo da pausa nunca reinicia.
- [ ] Insistir gera no máximo 4 falas, com 20 s de intervalo.
- [ ] Depois da última rodada, a tela "Até amanhã" aparece; o novo dia **local** libera.
- [ ] Fora da janela de horários, o app abre em "Hora de descansar".
- [ ] O portão adequado à faixa protege a área dos pais; "liberar agora" usa frase neutra.
- [ ] Testes unitários do núcleo com relógio falso (virada do dia em UTC−3, mudança da janela).
- [ ] Teste de ponta a ponta com relógio controlado (Playwright `page.clock`).
- [ ] `lint:text` passa; nenhum dado pessoal salvo.

## 10. Implementação de referência

- **Núcleo `@vsa/wellbeing-core`** (TypeScript puro, sem DOM): máquina de estados, sorteio de missões, cálculo de janela e de dia local, validação de PIN. Publicado como ESM, consumível por React (Math Quest) e por JavaScript puro (Tumba da Máscara).
- **Conteúdo** por app: missões, falas e ícones em arquivos de dados, revisados por educador.
- **Adaptadores de interface** por app: telas de missão, pausa, volta, fim do dia, "hora de descansar" e área dos pais.
- **Ordem sugerida:** implementar primeiro no Math Quest (já tem testes, perfis e Dexie); extrair o núcleo para pacote compartilhado; migrar o Tumba da Máscara, corrigindo a virada do dia em UTC.

## Fontes

SBP [#MenosTelas #MaisSaúde](https://www.sbp.com.br/fileadmin/user_upload/_22246c-ManOrient_-__MenosTelas__MaisSaude.pdf) e [atualização 2024](https://portaldeboaspraticas.iff.fiocruz.br/biblioteca/menos-telas-mais-saude-atualizacao-2024/) · OMS [2019](https://www.who.int/news/item/24-04-2019-to-grow-up-healthy-children-need-to-sit-less-and-play-more) · Hiniker et al., [CHI 2016](https://www.washington.edu/news/2016/05/05/two-minute-warnings-make-kids-screen-time-tantrums-worse/) · Gunderson et al., [2013](https://pmc.ncbi.nlm.nih.gov/articles/PMC3655123) · [Co-regulação (OPRE)](https://acf.gov/opre/report/co-regulation-birth-through-young-adulthood-practice-brief) · [ANALISE.md](../../ANALISE.md) §3.2.5.
