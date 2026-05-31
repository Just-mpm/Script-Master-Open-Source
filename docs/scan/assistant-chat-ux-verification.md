# Scan: Verificação de Implementação — Melhorias de UX do Chat do Assistente

**Escopo:** 10 itens planejados em `docs/plan/assistant-chat-ux-improvements.md`  
**Data:** 2026-05-31  
**Status:** 9/10 implementados, 1 deferido (Editar mensagem)

---

## Contexto assumido

- Plano define 10 melhorias de UX no chat do assistente IA
- Todas são frontend-only (sem mudanças em Cloud Functions)
- 3 arquivos novos criados: `CodeBlock.tsx`, `ScrollToBottomFab.tsx`, `ImageLightbox.tsx`
- 5+ arquivos editados: `types.ts`, `useAssistant.ts`, `Assistant.tsx`, `AssistantMessages.tsx`, 3 locales, testes

---

## O que parece sólido

| # | Item | Status | Evidência |
|---|------|--------|-----------|
| 1.1 | `createdAt` no `ChatMessageRecord` | ✅ Completo | Campo em `types.ts:169`, setado em `useAssistant.ts:517,579` |
| 1.2 | Remover "Salvar Insight" | ✅ Completo | Zero referências a `savedToMemoryId`/`onSaveToMemory` no código |
| 1.3 | Copiar bloco de código | ✅ Completo | `CodeBlock.tsx` + `PreBlock` wrapper, integrado via `components={{ pre: PreBlock }}` |
| 1.4 | Botão copiar em msg do usuário | ✅ Completo | Condição `cleanText ?` (não `isModel && cleanText ?`) em `AssistantMessages.tsx:208` |
| 2.2 | Animação de entrada | ✅ Completo | `AnimatePresence mode="popLayout"` + `motion.div` com spring |
| 2.3 | Scroll-to-bottom FAB | ✅ Completo | `ScrollToBottomFab.tsx` integrado em `Assistant.tsx:608`, `aria-label` presente |
| 2.4 | Lightbox de imagens | ✅ Completo | `ImageLightbox.tsx` integrado em `AssistantMessages.tsx:168`, `aria-label` no close |
| 3.3 | Regenerar resposta | ✅ Completo | `regenerateLastResponse` no hook, prop chain hook→Assistant→Messages, botão na última msg do modelo |

---

## Lacunas priorizadas

| ID | Severidade | Tipo | Confidence | Descrição | Evidência | Mitigações verificadas | Pergunta/decisão |
|----|-----------|------|------------|-----------|-----------|----------------------|------------------|
| G1 | **MÉDIO** | i18n | 95 | **"Ver no estúdio →" hardcoded em pt-BR** — texto visível para todos os usuários não-pt-BR (en, es) | `AssistantMessages.tsx:296` — `label="Ver no estúdio →"` sem chave i18n | Nenhuma — não existe chave i18n para este label nos 3 locales | Criar chave `assistant.messages.verInStudio` nos 3 locales e substituir o hardcoded |
| G2 | **MÉDIO** | i18n | 95 | **`formatTimestamp` usa locale 'pt-BR' hardcoded** — afeta strings "agora", "min" e formatação de hora/data para usuários en/es | `AssistantMessages.tsx:69-79` — `toLocaleTimeString('pt-BR')`, `toLocaleDateString('pt-BR')`, string 'agora' sem i18n | `formatTimestamp` é função standalone fora do componente — não tem acesso ao `useLocale()` | Mover lógica para dentro do `MessageBubble` (que já tem `useLocale()`) ou passar locale como parâmetro + criar chaves i18n para 'agora' e 'min' |
| G3 | **MÉDIO** | Testes | 90 | **Testes não cobrem as 7 novas funcionalidades** — timestamp, copy em user msg, regenerate button, lightbox click, code block copy, scroll FAB, animação | `AssistantMessages.component.test.tsx` — testa apenas comportamento existente (apply, streaming, empty state, attachments). Nenhum teste para as features novas | Testes existentes não foram removidos — apenas não foram adicionados | Adicionar testes pelo menos para: (a) timestamp aparece quando `createdAt` existe, (b) botão copiar em msg do usuário, (c) botão regenerar na última msg do modelo |
| G4 | **BAIXO** | UX | 90 | **Link "Ver no estúdio" usa `<a>` href em vez de SPA navigation** — causa full page reload | `AssistantMessages.tsx:293` — `component="a" href="/app/estudio"` | Plano sugere react-router-dom `Link` como alternativa (item 3.1, linha 567) mas implementação usou `<a>` | Trocar para `component={RouterLink}` com `to="/app/estudio"` (importar de `react-router-dom`) |
| G5 | **BAIXO** | Documentação | 85 | **Plano desatualizado** — ainda diz "Status: Planejado" | `docs/plan/assistant-chat-ux-improvements.md:5` — `> **Status:** Planejado` | — | Atualizar para "Status: Implementado" e marcar os 9 itens ✅ + o deferido ❌ |
| G6 | **BAIXO** | Dependência | 80 | **`react-syntax-highlighter` não instalado** (opcional por design) | Plano linha 33: `❌ precisa instalar`. `package.json` não tem a dependência. `CodeBlock.tsx` usa `<pre><code>` puro | Plano documenta como opcional (linha 176: "Opcional (futuro)") | Decidir se quer syntax highlight agora ou deixar para depois. Se quiser: `bun add react-syntax-highlighter @types/react-syntax-highlighter` |

---

## Cenários de borda sem resposta

| Cenário | Impacto | Status |
|---------|---------|--------|
| Mensagens antigas sem `createdAt` | ✅ Tratado — `formatTimestamp` retorna `null`, renderização condicional | Sem gap |
| Mensagens sem attachments | ✅ Tratado — renderização condicional `attachments?.length > 0` | Sem gap |
| Streaming ativo + animação | ✅ Tratado — `isCurrentlyStreaming` não duplica animação (mesmo `motion.div`) | OK mas sem teste |
| Clipboard API restrita (iframe, HTTP) | ✅ Tratado — fallback `document.execCommand('copy')` em ambos CodeBlock e MessageBubble | Sem gap |
| Lightbox com data URL muito grande (>10MB) | ⚠️ Potencial — `data:` URLs em base64 podem consumir memória. Mas attachments já têm limite de 10MB no upload | Risco baixo |

---

## Checklist de sanidade

- [x] `createdAt` existe no tipo e é setado em ambas mensagens (user + model)
- [x] Mensagens antigas sem `createdAt` não quebram (campo opcional + renderização condicional)
- [x] `AssistantMessagesProps` tem `onRegenerate` como opcional — sincronizado com `MessageBubbleProps`
- [x] `arePropsEqual` inclui `onRegenerate` na comparação
- [x] `regenerateLastResponse` tem guarda `isLoading || isStreaming` para evitar duplo envio
- [x] Botão regenerar só aparece na última mensagem do modelo (`isLastModelMessage`)
- [x] `aria-label` presente em: CodeBlock copy, ScrollToBottomFab, ImageLightbox close, message copy, regenerate
- [ ] ⚠️ "Ver no estúdio →" sem `aria-label` explícito (usa label do Chip como texto)
- [x] `AnimatePresence mode="popLayout"` para entrada/saída de mensagens
- [x] `motion.div` com `layout` para reflow suave
- [x] ScrollToBottomFab usa `passive: true` no listener de scroll
- [x] `Zoom in={!isAtBottom}` para show/hide do FAB

---

## Veredito

**INCOMPLETO com 3 lacunas MÉDIO e 3 BAIXO**

A implementação cobre **9/10 itens do plano** com qualidade técnica sólida — o deferido (Editar mensagem) está corretamente fora do escopo. Os componentes novos (`CodeBlock`, `ScrollToBottomFab`, `ImageLightbox`) estão bem construídos com acessibilidade adequada e fallbacks.

**As 3 lacunas MÉDIO são:**
1. **i18n hardcoded** em "Ver no estúdio →" (afeta usuários en/es)
2. **i18n hardcoded** no `formatTimestamp` (strings 'agora', 'min' e locale 'pt-BR')
3. **Testes ausentes** para as 7 novas funcionalidades

**Recomendação:** Corrigir G1 e G2 (i18n) antes do release para não quebrar a experiência multilíngue. G3 (testes) pode ser feito em paralelo. G4-G6 são melhorias incrementais.

---

## Próximos passos

1. **Corrigir G1 + G2** (~15 min) — criar chaves i18n e usar locale do hook
2. **Corrigir G4** (~2 min) — trocar `<a>` por `RouterLink`
3. **Adicionar testes G3** (~30 min) — testes para timestamp, copy user, regenerate
4. **Atualizar plano G5** (~2 min) — mudar status para "Implementado"
5. **Decidir G6** — syntax highlight agora ou backlog?
