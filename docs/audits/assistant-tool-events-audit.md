# Auditoria Estática — Tool Events, Thinking Shimmer, TwoPhaseStopButton

**Data:** 2026-05-28
**Escopo:** 4 arquivos novos/modificados no módulo `src/features/assistant/components/`
**Foco:** Performance, Acessibilidade, UX, Edge Cases
**Notebooks consultados:** MUI V9/V7 Docs, React Docs

---

## Escopo da revisão

| Arquivo | Status | Linhas |
|---------|--------|--------|
| `ToolEventCard.tsx` | NOVO | 436 |
| `ThinkingShimmer.tsx` | NOVO | 84 |
| `TwoPhaseStopButton.tsx` | NOVO | 111 |
| `AssistantMessages.tsx` | MODIFICADO | 449 |

**Focos cobertos:** memoização `React.memo`/`useMemo`, chaves i18n (3 locales), padrões MUI v9 (`Collapse`, `Tooltip`, `keyframes`, `alpha`), acessibilidade (keyboard, ARIA), animações CSS.

---

## Veredito: Ajustes recomendados

Há 2 problemas com impacto real (acessibilidade e performance), 2 de UX/consistência e 3 de polimento. Nenhum bloqueador crítico de merge, mas os 2 primeiros merecem correção antes do release.

---

## Achados priorizados

### [WARNING] Acessibilidade: ToolErrorCard clicável sem suporte a teclado

- **Arquivo:** `src/features/assistant/components/ToolEventCard.tsx:194-206`
- **Confidence:** 95/100
- **Categoria:** A11y
- **Problema:** O cabeçalho do error card é um `<Box onClick>` sem role, tabIndex, onKeyDown nem aria-expanded. Usuários de teclado e screen readers não conseguem expandir/colapsar o erro.
- **Evidência:**
  ```tsx
  <Box
    onClick={() => setExpanded((prev) => !prev)}
    sx={{
      cursor: 'pointer',
      // ...sem tabIndex, role, onKeyDown, aria-expanded
    }}
  >
  ```
- **Impacto:** Viola WCAG 2.1.1 (Keyboard) e 4.1.2 (Name, Role, Value). Usuários sem mouse ficam impossibilitados de ver detalhes do erro.
- **Sugestão:** Adicionar `role="button"`, `tabIndex={0}`, `aria-expanded={expanded}` e `onKeyDown` para Enter/Espaço. Alternativa: substituir por `IconButton` com `aria-label` + `Collapse`.

---

### [WARNING] Performance: array vazio `[]` quebra memoização de todos os MessageBubble

- **Arquivo:** `src/features/assistant/components/AssistantMessages.tsx:430`
- **Confidence:** 92/100
- **Categoria:** Performance
- **Problema:** Na linha 430, mensagens que NÃO são a última do modelo recebem `toolEvents={[]}` — um novo array criado a cada render. Como `arePropsEqual` compara por referência (`prev.toolEvents === next.toolEvents`), isso **invalida o memo** para todas as mensagens, não apenas a que mudou.
- **Evidência:**
  ```tsx
  // Linha 430 — dentro do .map()
  toolEvents={lastModelMessage?.id === message.id ? toolEvents : []}
  //                                                  ^^ novo array a cada render
  ```
  ```tsx
  // Linha 89 — arePropsEqual
  && prev.toolEvents === next.toolEvents  // referência, não deep equal
  ```
- **Impacto:** Durante streaming, TODAS as MessageBubble re-renderizam a cada chunk recebido, anulando o `React.memo`. Em chats com 20+ mensagens, isso gera re-renders inúteis.
- **Sugestão:** Extrair `const EMPTY_TOOL_EVENTS: AssistantToolEvent[] = []` como constante de módulo (fora do componente), ou usar `useMemo(() => [], [])` para estabilizar a referência.

---

### [WARNING] CSS `content` em keyframes não anima em Chromium/Firefox

- **Arquivo:** `src/features/assistant/components/ThinkingShimmer.tsx:11-16`
- **Confidence:** 88/100
- **Categoria:** UX
- **Problema:** A animação `dotsKeyframes` tenta mudar a propriedade CSS `content` via keyframes (`'.'` → `'..'` → `'...'` → `''`). Mudanças de `content` em keyframes **não geram repaint** na maioria dos navegadores (Chromium e Firefox ignoram). Apenas Safari suporta parcialmente.
- **Evidência:**
  ```tsx
  const dotsKeyframes = keyframes`
    0%, 20% { content: '.'; }
    40% { content: '..'; }
    60% { content: '...'; }
    80%, 100% { content: ''; }
  `;
  ```
- **Impacto:** Os pontos animados ("Pensando...") provavelmente aparecem estáticos como apenas "." ou ficam invisíveis. O efeito visual esperado não funciona na maioria dos browsers.
- **Sugestão:** Usar 3 `<span>` com `opacity` animada em stagger (como o padrão `typing-dot` já existente no AssistantMessages), ou uma abordagem JS com `useState` + `setInterval`.

---

### [SUGGESTION] Collapse sem `unmountOnExit` mantém DOM desnecessário

- **Arquivo:** `src/features/assistant/components/ToolEventCard.tsx:217`
- **Confidence:** 90/100
- **Categoria:** Performance
- **Problema:** O `<Collapse in={expanded}>` do error card não tem `unmountOnExit`. O conteúdo (potencialmente com mensagens de erro longas) fica montado no DOM mesmo quando colapsado. Outros 8 usos de `Collapse` no projeto usam `unmountOnExit` (VideoExportPanel, TranscriptionPanel, Configuracoes, Inspector, etc.).
- **Evidência:**
  ```tsx
  <Collapse in={expanded}>  {/* sem unmountOnExit */}
    <Box sx={{ px: 1, pb: 0.75 }}>
  ```
- **Impacto:** Menor — o conteúdo é leve (um `<pre>`), mas quebra o padrão do projeto.
- **Sugestão:** Adicionar `unmountOnExit` para consistência e economia de DOM.

---

### [SUGGESTION] Cor de erro hardcoded em vez de usar token

- **Arquivo:** `src/features/assistant/components/ToolEventCard.tsx:189,207-208,301,313` e `TwoPhaseStopButton.tsx:74-75,104`
- **Confidence:** 92/100
- **Categoria:** UI
- **Problema:** A cor `#ef5350` aparece 8+ vezes como string literal nos dois arquivos, enquanto `tokens.ts` exporta `ERROR_MAIN = '#ef4444'`. Há inconsistência entre o valor hardcoded e o token do design system.
- **Evidência:**
  ```tsx
  // ToolEventCard.tsx — hardcoded
  border: `1px solid ${alpha('#ef5350', 0.3)}`,

  // tokens.ts — token oficial
  export const ERROR_MAIN = '#ef4444';
  ```
- **Impacto:** Se o design system mudar a cor de erro, essas instâncias não atualizam. Além disso, `#ef5350` (Material Red 400) difere de `#ef4444` (Tailwind Red 500).
- **Sugestão:** Importar `ERROR_MAIN` de `tokens.ts` e usar `alpha(ERROR_MAIN, ...)` em todas as ocorrências.

---

### [SUGGESTION] Tooltip sem `describeChild` em TwoPhaseStopButton

- **Arquivo:** `src/features/assistant/components/TwoPhaseStopButton.tsx:97`
- **Confidence:** 85/100
- **Categoria:** A11y
- **Problema:** O `Tooltip` envolve um `IconButton` que já tem `aria-label`. Segundo a doc MUI v9, quando o trigger já tem nome acessível, `describeChild` deve ser passado para o tooltip atuar como descrição (não label duplicado). O projeto já usa `describeChild` em 7 outros Tooltips (ToolbarActions, FontSizeControls, GalleryCard).
- **Evidência:**
  ```tsx
  <Tooltip title={t('assistant.stop.tooltip')}>
    <IconButton aria-label={t('assistant.stop.aria')} ...>
  ```
- **Impacto:** Screen readers podem anunciar o tooltip como label duplicado em vez de descrição complementar.
- **Sugestão:** Adicionar `describeChild` ao Tooltip.

---

### [SUGGESTION] Prop `isLast` passada mas nunca utilizada

- **Arquivo:** `src/features/assistant/components/ToolEventCard.tsx:246-247,430`
- **Confidence:** 95/100
- **Categoria:** Dead Code
- **Problema:** `ToolEventItemProps` declara `isLast: boolean` e `ToolEventList` passa `isLast={index === visibleEvents.length - 1}`, mas o componente nunca usa essa prop.
- **Evidência:**
  ```tsx
  interface ToolEventItemProps {
    event: AssistantToolEvent;
    isPending: boolean;
    isLast: boolean;  // ← nunca desestruturado/uso no corpo
  }
  ```
- **Impacto:** Código morto que confunde manutenção.
- **Sugestão:** Remover `isLast` de `ToolEventItemProps` e da chamada em `ToolEventList`.

---

## O que parece saudável

- **i18n completo:** Todas as chaves `assistant.toolEvents.*` e `assistant.stop.*` estão presentes nos 3 locales (pt-BR, en, es) — 48 traduções verificadas.
- **Memoização do MessageBubble:** O `arePropsEqual` é bem construído — compara campos específicos em vez de shallow equal genérico. O problema é apenas o `[]` inline.
- **Cleanup do timeout:** `TwoPhaseStopButton` faz cleanup correto do `setTimeout` via `useEffect` return + `useRef`.
- **ShimmerText:** A animação de gradiente no texto funciona (background-position é animável). A técnica de `background-clip: text` é bem suportada.
- **Separação de responsabilidades:** `ToolEventCard` (renderização), `ThinkingShimmer` (feedback visual), `TwoPhaseStopButton` (interação) — cada um com responsabilidade clara.
- **Tokens do projeto:** Imports de `tokens.ts` são usados consistentemente (exceto pela cor de erro hardcoded).
- **keyframes do MUI:** Uso correto de `keyframes` de `@mui/material/styles` para scoping de animação, como recomendado pela doc v9.
- **`alpha()` utility:** Usado corretamente para semi-transparências em vez de rgba manual.

---

## Limites da revisão

- **Não foi possível verificar** se o React Compiler está ativo no projeto (afetaria necessidade de `useMemo`/`useCallback` manuais).
- **Animação `dotsKeyframes`**: A limitação de `content` em keyframes é bem documentada mas comportamento exato pode variar por versão do browser. Teste manual recomendado.
- **Não verificado runtime**: Os efeitos de performance do `[]` inline dependem de quantas mensagens existem no chat real.
- **NotebookLM consultado**: Ambos os notebooks (MUI V9/V7 e React Docs) foram consultados e informaram os achados sobre `Collapse.unmountOnExit`, `Tooltip.describeChild`, `keyframes` scoping e padrões de memoização em React 19.
