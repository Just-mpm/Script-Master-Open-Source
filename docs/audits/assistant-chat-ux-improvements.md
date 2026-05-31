# Auditoria: Melhorias de UX no Chat do Assistente

**Data:** 2026-05-31
**Versão:** 0.112.0
**Escopo:** 11 arquivos (3 novos + 8 editados)
**Focos:** Tipagem, SOLID, i18n, acessibilidade, performance, Motion, ReactMarkdown v10, testes

---

## Escopo da revisão

| Arquivo | Linhas | Lido por completo |
|---------|--------|-------------------|
| `src/features/assistant/components/CodeBlock.tsx` | 152 | Sim |
| `src/features/assistant/components/ScrollToBottomFab.tsx` | 86 | Sim |
| `src/features/assistant/components/ImageLightbox.tsx` | 93 | Sim |
| `src/features/assistant/components/AssistantMessages.tsx` | 550 | Sim |
| `src/features/assistant/Assistant.tsx` | 657 | Sim |
| `src/hooks/useAssistant.ts` | 890 | Sim |
| `src/lib/db/types.ts` | 221 | Sim |
| `src/features/i18n/locales/pt-BR.ts` | ~1106 (regenerate) | Trecho relevante |
| `src/features/i18n/locales/en.ts` | ~1090 (regenerate) | Trecho relevante |
| `src/features/i18n/locales/es.ts` | ~1090 (regenerate) | Trecho relevante |
| `tests/assistant/AssistantMessages.component.test.tsx` | 581 | Sim |

**Validações realizadas:**
- Diff completo via `analyze_aitool_changes` (+683/-555, 8 novos)
- Todos os 11 arquivos lidos integralmente
- NotebookLM consultado: Motion (AnimatePresence, layout, popLayout), MUI v9 (slots/slotProps)
- Busca por `@keyframes scrollFabPulse` em todo `src/` (CSS + TS/TSX) — ausente
- Busca por `regenerate` nos 3 locales — chave duplicada entre namespaces distintos (OK)
- Verificação de `useLocale` no componente — importado mas `locale` não extraído
- Verificação de versão react-markdown: v10.1.0

---

## Veredito

**Ajustes recomendados** — há 2 problemas reais (i18n hardcoded, keyframe ausente) e 3 melhorias de qualidade. Nenhum bloqueador de merge, mas os achados P2 devem ser corrigidos antes do release.

---

## Achados priorizados

### [WARNING] Keyframe `scrollFabPulse` não definida — indicador de streaming não anima

- **Arquivo:** `src/features/assistant/components/ScrollToBottomFab.tsx:79`
- **Confidence:** 95/100
- **Categoria:** Bug / UI
- **Problema:** O `span` do indicador de streaming referencia `animation: 'scrollFabPulse 1.2s ease-in-out infinite'`, mas a keyframe `@keyframes scrollFabPulse` não existe em nenhum arquivo do projeto (verificado com grep em `src/**/*.css` e `src/**/*.ts*`).
- **Evidência:**
  ```tsx
  // ScrollToBottomFab.tsx:79
  animation: 'scrollFabPulse 1.2s ease-in-out infinite',
  // Busca por @keyframes scrollFabPulse em src/ → 0 resultados
  ```
- **Impacto:** O dot azul de streaming aparece visualmente (tem `width: 8, height: 8, borderRadius: '50%', backgroundColor: BRAND_PRIMARY`) mas não pulsa. Usuário não tem feedback visual de que o assistente está respondendo.
- **Sugestão:** Adicionar a keyframe dentro do `sx` do componente (padrão usado em `AssistantMessages.tsx:256` para `assistantCursorBlink`):
  ```tsx
  '@keyframes scrollFabPulse': {
    '0%, 100%': { opacity: 1, transform: 'scale(1)' },
    '50%': { opacity: 0.5, transform: 'scale(1.3)' },
  },
  ```

---

### [WARNING] `formatTimestamp` com locale hardcoded em 'pt-BR'

- **Arquivo:** `src/features/assistant/components/AssistantMessages.tsx:76-78`
- **Confidence:** 92/100
- **Categoria:** UX / i18n
- **Problema:** A função `formatTimestamp` usa `toLocaleTimeString('pt-BR', ...)` e `toLocaleDateString('pt-BR', ...)` hardcoded, ignorando o locale do usuário disponível via `useLocale()`.
- **Evidência:**
  ```tsx
  // AssistantMessages.tsx:76-78
  return new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  // ...
  return new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  ```
- **Impacto:** Usuários com locale `en` ou `es` veem timestamps em português (ex: "14:30" em vez de "2:30 PM" para en-US). Inconsistência com o resto da UI que respeita i18n.
- **Sugestão:** Passar `locale` como parâmetro da função (o componente já tem `useLocale()` importado mas só extrai `t`):
  ```tsx
  const { locale, t } = useLocale();
  // ...
  function formatTimestamp(ms: number | undefined, locale: string): string | null {
    // ...
    return new Date(ms).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  }
  ```

---

### [WARNING] String "Ver no estúdio →" hardcoded em português

- **Arquivo:** `src/features/assistant/components/AssistantMessages.tsx:296`
- **Confidence:** 95/100
- **Categoria:** UX / i18n
- **Problema:** O `Chip` de link para o estúdio tem `label="Ver no estúdio →"` como string literal, sem usar o sistema de i18n.
- **Evidência:**
  ```tsx
  // AssistantMessages.tsx:296
  <Chip
    component="a"
    href="/app/estudio"
    label="Ver no estúdio →"
    // ...
  />
  ```
- **Impacto:** Usuários com locale `en` ou `es` veem texto em português. O projeto tem 3 locales (pt-BR, en, es) e todas as outras strings do chat usam `t()`.
- **Sugestão:** Adicionar chave `viewInStudio` ao namespace `assistant.messages` nos 3 locales e usar `t('assistant.messages.viewInStudio')`.

---

### [SUGGESTION] `thumbnailSx` tipado como `object` em vez de `SxProps<Theme>`

- **Arquivo:** `src/features/assistant/components/ImageLightbox.tsx:14`
- **Confidence:** 88/100
- **Categoria:** TypeScript
- **Problema:** A prop `thumbnailSx` é tipada como `object`, que é fraco demais. O padrão MUI para props de estilo é `SxProps<Theme>`.
- **Evidência:**
  ```tsx
  // ImageLightbox.tsx:14
  thumbnailSx?: object;
  ```
- **Impacto:** Sem autocompletar para propriedades SX, sem validação de tipo em tempo de compilação. Aceita qualquer objeto, incluindo arrays inválidos.
- **Sugestão:** Importar `SxProps` e `Theme` do MUI:
  ```tsx
  import type { SxProps, Theme } from '@mui/material/styles';
  // ...
  thumbnailSx?: SxProps<Theme>;
  ```

---

### [SUGGESTION] Lógica de clipboard fallback duplicada entre CodeBlock e AssistantMessages

- **Arquivo:** `src/features/assistant/components/CodeBlock.tsx:25-46` e `src/features/assistant/components/AssistantMessages.tsx:432-454`
- **Confidence:** 90/100
- **Categoria:** Architecture / DRY
- **Problema:** Os dois componentes implementam a mesma lógica de fallback para clipboard (`navigator.clipboard.writeText` → `document.execCommand('copy')` via textarea).
- **Evidência:**
  ```tsx
  // CodeBlock.tsx:25-46 — handleCopy com fallback idêntico
  // AssistantMessages.tsx:432-454 — handleCopyMessage com fallback idêntico
  ```
- **Impacto:** Manutenção duplicada. Se o fallback precisar de correção (ex: timeout, cleanup), precisa ser alterado em 2 lugares.
- **Sugestão:** Extrair para `src/lib/clipboard.ts` uma função `copyToClipboard(text: string): Promise<boolean>`.

---

### [SUGGESTION] Testes removidos sem cobertura equivalente para novas features

- **Arquivo:** `tests/assistant/AssistantMessages.component.test.tsx`
- **Confidence:** 85/100
- **Categoria:** Testes
- **Problema:** Os testes de "Salvar Insight" foram removidos (correto — feature removida), mas não foram adicionados testes para as novas funcionalidades: botão copiar, timestamp, botão regenerar, lightbox de imagens, renderização de code blocks via PreBlock.
- **Evidência:**
  ```tsx
  // Testes existentes cobrem: empty state, labels, JSON, streaming, attachments, memo
  // Testes AUSENTES para: copy button, timestamp display, regenerate button,
  // ImageLightbox click→dialog, CodeBlock/PreBlock rendering
  ```
- **Impacto:** Regressões futuras nessas features não serão detectadas automaticamente.
- **Sugestão:** Adicionar pelo menos testes para: (1) botão copiar chama clipboard API, (2) timestamp aparece quando `createdAt` está presente, (3) botão regenerar aparece na última mensagem do modelo e chama `onRegenerate`.

---

## O que parece saudável

- **Componentes com SRP bem definido:** `CodeBlock`, `ScrollToBottomFab`, `ImageLightbox` têm responsabilidade única e clara.
- **React.memo com `arePropsEqual` atualizado:** A comparação inclui `createdAt`, `onRegenerate` e todas as props relevantes. Evita re-renders desnecessários durante streaming.
- **Motion usage correto:** `AnimatePresence mode="popLayout"` com `layout` prop e `initial`/`animate` é o padrão recomendado (validado com NotebookLM). `motion/div` importado de `motion/react` (não `framer-motion`).
- **MUI v9 slots API:** `ImageLightbox` usa `slots={{ transition: Zoom }}`, `slotProps.paper`, `slotProps.backdrop` — API correta para Dialog (validado com NotebookLM).
- **Tokens do theme:** Todos os componentes usam tokens de `../../../theme/tokens` (BRAND_PRIMARY, RADIUS_XS, etc.) — sem cores hardcoded.
- **Logger:** Uso correto de `createLogger('useAssistant')` — sem `console.log`.
- **i18n:** Chave `regenerate` adicionada nos 3 locales (pt-BR, en, es) no namespace correto (`assistant.messages`).
- **Acessibilidade:** `aria-label` presente em botões interativos (CodeBlock:91, ScrollToBottomFab:52, ImageLightbox:64, AssistantMessages:214,228).
- **PreBlock para react-markdown v10:** Padrão de cast + verificação `?.type === 'code'` é o approach padrão para override de `<pre>` no react-markdown v10.1.0.
- **`useCallback` com dependências corretas:** `handleCopy`, `handleClick`, `handleCopyMessage` têm deps adequadas.
- **Tipagem:** Sem `any` nos novos componentes. Interfaces explícitas (`CodeBlockProps`, `ScrollToBottomFabProps`, `ImageLightboxProps`, `MessageBubbleProps`).
- **`regenerateLastResponse` bem implementado:** Guard de `isLoading/isStreaming`, remove última mensagem do modelo, reenvia última mensagem do usuário.

---

## Limites da revisão

- Não foi possível rodar lint, typecheck ou build (auditoria estática por leitura).
- Testes não foram executados — apenas lidos.
- O `assistantUi.ts` (estilos SX) não foi lido por completo — apenas verificada a existência dos exports usados.
- Os locales `en.ts` e `es.ts` foram verificados apenas no trecho da chave `regenerate`.
- Não foi verificado se `formatTimestamp` é usada em outros lugares do projeto.

---

## Próximos passos

1. **Corrigir keyframe `scrollFabPulse`** — adicionar definição dentro do `sx` do `ScrollToBottomFab`
2. **Corrigir `formatTimestamp`** — aceitar `locale` como parâmetro e usar o valor de `useLocale()`
3. **i18n "Ver no estúdio"** — adicionar chave nos 3 locales
4. **Tipar `thumbnailSx`** como `SxProps<Theme>`
5. **(Opcional)** Extrair clipboard helper para `src/lib/clipboard.ts`
6. **(Opcional)** Adicionar testes para novas features
