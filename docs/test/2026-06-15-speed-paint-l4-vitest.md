# Relatório de Testes — Speed Paint / L4 (RF-03 seletor de vetorialPreset)
**Data:** 2026-06-15
**Agent:** test
**Escopo:** validação do seletor de `vetorialPreset` (16 opções em 6 grupos) na
`SpeedPaintPage`, visível apenas no modo "Desenho" (vetorial).

## Pré-validação

Antes de escrever os testes, foi confirmada a implementação da L4:

| Verificação | Resultado |
|---|---|
| `src/features/speed-paint/constants/vetorialPresets.ts` existe | ✅ |
| `VETORIAL_PRESETS_GROUPED` é importado em `SpeedPaintPage.tsx` | ✅ |
| `vetorialPreset` é lido/escrito na `animationStore` | ✅ |
| `handlePresetChange` chama `setVetorialPreset` + analytics + `reprocessCurrentImage('vetorial')` | ✅ |
| Chaves i18n (`vetorialPresetLabel`, `presetGroups.*`, `presets.*`) presentes em pt-BR | ✅ |
| Seletor renderizado apenas quando `renderMode === 'vetorial'` | ✅ |

A L4 estava pronta e o trabalho pôde prosseguir.

## Resumo

| Métrica | Valor |
|---|---|
| Testes criados | 7 (L4) + 7 (L3 pré-existentes, intactos) |
| Testes executados | 14 |
| Passou | 14 |
| Falhou | 0 |
| Falsos positivos corrigidos | 4 (ajustes de seletor) |
| Testes removidos | 0 |
| Taxa de confiabilidade | 100% |

## Testes Criados

| Arquivo | Tipo | Status |
|---|---|---|
| `tests/speed-paint/SpeedPaintPage.component.test.tsx` (Bloco A) | component | ✅ passou |
| `tests/speed-paint/SpeedPaintPage.component.test.tsx` (Bloco B) | component | ✅ passou |
| `tests/speed-paint/SpeedPaintPage.component.test.tsx` (Bloco C) | component | ✅ passou |
| `tests/speed-paint/SpeedPaintPage.component.test.tsx` (Bloco D) | component | ✅ passou |

### Detalhamento dos 7 novos testes L4

| # | Cenário | Tipo |
|---|---|---|
| A.1 | Seletor visível (combobox + label) quando `renderMode === 'vetorial'` | Renderização condicional |
| A.2 | Seletor oculto quando `renderMode === 'mask'` | Renderização condicional |
| B.1 | 16 opções (`MenuItem`) renderizadas — distinguidas por `data-value` | Conteúdo |
| B.2 | 6 grupos (`ListSubheader`) renderizados como `<li>` sem `data-value` | Conteúdo |
| C.1 | Clicar em "Detalhado" dispara `generateStrokesFromImage` com novo `vetorialPreset` + analytics | Comportamento |
| C.2 | Mudar preset programaticamente no modo mask NÃO dispara `generateStrokesFromImage` (seletor inacessível) | Comportamento |
| D.1 | `aria-label` do Select é "Estilo do desenho" (= `t('speedPaint.vetorialPresetLabel')`); combobox tem `aria-labelledby` apontando para `InputLabel` | Acessibilidade |

## Validação obrigatória

| Comando | Resultado |
|---|---|
| `bun x vitest run tests/speed-paint/SpeedPaintPage.component.test.tsx` | ✅ 14/14 passando em ~2.3s |
| `bun x tsc -b` | ✅ exit 0, sem output |
| `bun x eslint tests/speed-paint/SpeedPaintPage.component.test.tsx src/pages/SpeedPaintPage.tsx` | ✅ exit 0, sem warnings/erros |

## Bugs Reais Confirmados

Nenhum bug real encontrado.

## Falsos Positivos Corrigidos

### FP-001: `getByLabelText('Estilo do desenho')` retornava múltiplos elementos
- **Teste:** `tests/speed-paint/SpeedPaintPage.component.test.tsx` (Bloco A, B, C, D)
- **Problema:** tanto o `<InputLabel>` (que serve como `<label htmlFor="vetorial-preset">`)
  quanto o `<Select>` (com `aria-label="Estilo do desenho"`) são resolved pela
  Testing Library como elementos com label "Estilo do desenho". O `getByLabelText`
  lançava `Found multiple elements with the text of: Estilo do desenho`.
- **Correção:** substituído por `getByRole('combobox', { name: 'Estilo do desenho' })`
  — o `name` da role é resolvido via `aria-labelledby` (que aponta para o
  `InputLabel`), permitindo acessar apenas o gatilho do Select.

### FP-002: `getAllByRole('option')` retornava 22 em vez de 16
- **Teste:** `tests/speed-paint/SpeedPaintPage.component.test.tsx` (Bloco B.1)
- **Problema:** no jsdom, o MUI `<ListSubheader>` é renderizado como `<li>` com
  `role="option"` (e não `role="presentation"`, como esperado pela convenção).
  Isso faz com que `findAllByRole('option')` retorne 16 `MenuItem` + 6
  `ListSubheader` = 22 elementos, não 16.
- **Correção:** contar `listbox.querySelectorAll('li[data-value]')` — o atributo
  `data-value` é exclusivo dos `MenuItem` (não é aplicado nos `ListSubheader`),
  tornando essa a forma confiável de contar apenas as opções selecionáveis.

### FP-003: `getByRole('option', { name: 'Detalhado' })` retornava múltiplos elementos
- **Teste:** `tests/speed-paint/SpeedPaintPage.component.test.tsx` (Bloco C.1)
- **Problema:** o subheader do grupo "Detalhado" e o `MenuItem` do preset
  `detailed` compartilham o texto "Detalhado" (e ambos são `<li role="option">`).
  `getByRole('option', { name: 'Detalhado' })` lançava
  `Found multiple elements with the role "option" and name "Detalhado"`.
- **Correção:** usar `listbox.querySelector('li[data-value="detailed"]')` para
  desambiguar — o `data-value` é exclusivo do `MenuItem`.

### FP-004: assertion `getAttribute('aria-label')` no combobox retornava `null`
- **Teste:** `tests/speed-paint/SpeedPaintPage.component.test.tsx` (Bloco D.1)
- **Problema:** o MUI aplica `aria-label="Estilo do desenho"` no `MuiInputBase-root`
  (parent do combobox), não no combobox em si. O combobox tem
  `aria-labelledby="vetorial-preset-label vetorial-preset"` (que aponta para o
  `InputLabel` com o mesmo texto). A assertion direta `getAttribute('aria-label')`
  no combobox retornava `null`.
- **Correção:** a assertion foi substituída pela verificação do **nome acessível**
  da role (`getByRole('combobox', { name: 'Estilo do desenho' })` resolve via
  `aria-labelledby`) + a confirmação explícita de que o parent tem o
  `aria-label` correto + a presença de `aria-labelledby` no combobox apontando
  para o `InputLabel` `vetorial-preset-label`.

## Testes Removidos

Nenhum.

## Decisões de implementação

### C.2 — "mudar preset no modo mask NÃO dispara `generateStrokesFromImage`"
A interpretação literal do cenário (clicar no seletor de preset no modo mask)
é impossível porque o seletor **não está renderizado** nesse modo. O teste
foi reformulado para validar o invariante útil: a mudança programática do
preset na store (via `useAnimationStore.getState().setVetorialPreset(...)`)
**não dispara** `reprocessCurrentImage`, porque o reprocessamento só é
iniciado pelo `onChange` do `<Select>`. Isso confirma que o setter da store
é puro e não tem side-effects colaterais (apenas armazena o valor).

### B.1 / B.2 — uso de `data-value` em vez de `role`
No jsdom, o `<ListSubheader>` do MUI Select vira `<li role="option">` (e não
`role="presentation"`, como na convenção de `MenuList` standalone). Isso faz
com que o teste ingênuo por `role="option"` confunda MenuItem com ListSubheader.
A estratégia adotada — contar `li[data-value]` para MenuItem e `li` sem
`data-value` para ListSubheader — é **resiliente** à implementação interna do
MUI e reflete exatamente o que o usuário consegue interagir (clicar).

## Conclusão

Os 7 novos testes L4 cobrem todos os 4 blocos exigidos (A: renderização
condicional; B: conteúdo; C: comportamento; D: acessibilidade), com 100% de
passagem e zero falsos positivos na suíte final. A integração com a suíte
L3 pré-existente permanece intacta — 14/14 testes passando no arquivo.
Lint e typecheck sem warnings ou erros.

Próximo passo: aplicar a mesma estratégia de `data-value` para o seletor de
preset no teste `tests/speed-paint/SpeedPaintPlayer.component.test.tsx` (se
houver sobreposição de testes) e considerar adicionar testes de
**interação via teclado** (Tab → Enter → seta → Enter) como refinamento
futuro da acessibilidade (CT-T10 parcial).
