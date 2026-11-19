# Adoção do Padrão VSA de Bem-Estar Digital — Tumba da Máscara

> A "Missão de Brincar" deste jogo (veja [ANALISE.md](../ANALISE.md) §3.2.5 e `pwa/js/wellbeing.js`) virou a base do [Padrão VSA de Bem-Estar Digital Infantil](standards/CHILD-WELLBEING-STANDARD.md), que será seguido por todas as aplicações infantis da VSA, começando pelo Math Quest.
>
> Este documento compara a implementação atual (`master`, commit `3265a71`) com o padrão e lista o que falta para o Tumba ficar em conformidade. Nada foi alterado no código do jogo nesta etapa.

## 1. Situação por componente

| Componente do padrão | Situação | Onde |
|---|---|---|
| C1 Contador de uso (só tempo ativo; zera depois de uma pausa longa) | Atende | `wbTick`, `wbLoad` |
| C2 Ponto de parada (fim de fase) | Atende | `wbCheckpoint` |
| C3 Aviso único, cerca de 3 min antes, no fim da fase | Atende | `wbMaybeWarn` |
| C4 Teto duro (limite + 2 min, exceto durante o chefão) | Atende | `wbTick` |
| C5 Missão fora da tela (sem repetir as 3 últimas, calmas à noite) | Atende, com ajustes de conteúdo (seção 2, itens 3 e 4) | `WB_CONTENT.missions`, `wbStartMission` |
| C6 Pausa persistente, tempo sem números, nunca reinicia | Atende | `renderBreak`, `wbBreakElapsed` |
| C7 Insistência limitada (4 falas, 20 s de intervalo) | Atende | `wbInsist` |
| C8 Ritual de volta ("Voltei!" e "toca aqui") | Atende | `wbReturn`, `wbHiFive` |
| C9 Limite diário ("Até amanhã") | **Parcial**: o dia vira em UTC (item 1) | `today()` |
| C10 Horário de uso (janela permitida) | **Falta** (item 6) | — |
| C11 Área dos pais | **Parcial**: portão de tabuada (item 2); falta resumo da semana | `renderGate`, `renderParentPanel` |
| C12 Recompensa que não compra nada | **Parcial**: a máscara "Sonequinha" dá +20% de congelar (item 7) | `items.js:28` |
| C13 Voz calma com "ouvir de novo" | Atende (pt-BR, velocidade 0,88) | `wbSay` |
| C14 Acessibilidade | **Parcial**: não respeita "reduzir movimento" do sistema; o canvas é uma imagem única para leitores de tela (item 8) | `index.html`, `game.js` |
| Privacidade (sem dados pessoais) | **Parcial**: guarda o nome da criança (item 5) | `wbCfg.childName` |
| Verificador de linguagem no CI | Atende; ampliar a lista (item 9) | `tools/lint-text.js` |

## 2. Correções recomendadas

| # | Ponto | Evidência | Correção sugerida |
|---|---|---|---|
| 1 | **O dia vira em UTC.** No Brasil (UTC−3), "aventuras por dia" zera às 21h, liberando o jogo na hora de dormir | `wellbeing.js:82` usa `new Date().toISOString().slice(0, 10)` | Data local do aparelho (código abaixo) |
| 2 | **Portão parental com tabuada de um dígito** (6×7, 8×9). Crianças a partir de cerca de 8 anos resolvem, inclusive no Modo Clássico | `wellbeing.js:78` | Segurar 3 s e resolver uma conta de dois dígitos (por exemplo, 23 + 48); PIN opcional criado pelo adulto |
| 3 | **Personagens licenciados** nas missões ("Homem de Ferro", "Capitão América"): risco de marca | `wellbeing.js:34–35` | "Seu super-herói favorito", "seu boneco com escudo" |
| 4 | **"Mamãe ou papai"** nas falas | `wellbeing.js:56` e `:75` | "um adulto", "alguém da família" |
| 5 | **Nome da criança** guardado e falado | `wbCfg.childName` (`wellbeing.js:89`, `:102`) | Remover o campo ou trocar por um apelido opcional que não identifique a criança; o padrão é "aventureiro(a)" |
| 6 | **Sem horário de uso.** O painel recomenda "nada na hora de dormir", mas não aplica | `wellbeing.js:277–279` | Janela configurável (padrão das 8h às 19h para o Modo Lúdico) e tela "Hora de descansar" com missão calma |
| 7 | **Sonequinha com vantagem no jogo** (+20% de congelar), ganha com missões de brincar | `items.js:28` | Deixar a Sonequinha só visual (sem bônus) |
| 8 | **Reduzir movimento** do sistema ignorado (CRT, tremor e confete continuam) | sem `prefers-reduced-motion` em `pwa/` | Ler `matchMedia('(prefers-reduced-motion: reduce)')` e desligar tremor, CRT e partículas por padrão |
| 9 | Lista do verificador de linguagem sem os termos de culpa e de família restrita | `tools/lint-text.js` | Acrescentar `castigo`, `desobedec`, `que feio`, `mam[ãa]e ou (o )?papai`, `papai ou a mam[ãa]e` e nomes de personagens licenciados |

### Correção do item 1 (data local)

```js
// wellbeing.js: data do dia no fuso do aparelho, e não em UTC
const today = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};
```

Teste sugerido no `tools/e2e.js`: com o fuso `America/Sao_Paulo`, terminar as aventuras do dia às 20h59, avançar o relógio para 21h01 (Playwright `page.clock`) e conferir que "Até amanhã" continua na tela.

## 3. Padrões por idade (referência)

| Modo | Uso por rodada | Pausa | Rodadas/dia | Horário |
|---|---|---|---|---|
| Lúdico (cerca de 3 a 6 anos) | 15 min (atual) | 15 min (atual) | 2 (atual) | 8h às 19h (novo) |
| Clássico (crianças maiores) | 20 a 30 min | 10 min | 3 | 7h às 20h ou 21h (novo) |

Os valores seguem a SBP: até 1 h/dia para 2 a 5 anos, de 1 a 2 h para 6 a 10 e de 2 a 3 h para 11 a 18, com supervisão.

## 4. Próximos passos

1. Aplicar os itens 1 a 4 e 9: mudanças pequenas, sem alterar a jogabilidade.
2. Decidir os itens 5 (nome) e 7 (Sonequinha).
3. Implementar o horário de uso (item 6) e o resumo semanal na área dos pais.
4. Migrar para o núcleo compartilhado `@vsa/wellbeing-core` quando ele for extraído do Math Quest.
