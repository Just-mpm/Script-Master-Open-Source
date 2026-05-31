# Plano: Melhorias de UX no Chat do Assistente

> **Versão alvo:** 0.113.0  
> **Data:** 2026-05-31  
> **Status:** Planejado  
> **Escopo:** 10 itens (9 melhorias + 1 remoção)

---

## Resumo Executivo

Este plano agrupa 10 mudanças de UX no chat do assistente IA do Script Master. As mudanças vão desde melhorias visuais simples (timestamps, animações) até funcionalidades novas (editar mensagem, regenerar resposta, lightbox de imagens). Todas as mudanças são **frontend-only** e não alteram o backend (Cloud Functions).

### Arquivos-alvo principais

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/features/assistant/components/AssistantMessages.tsx` | Renderização de mensagens, copiar, timestamp, animações |
| `src/features/assistant/components/AssistantComposer.tsx` | Input, envio, edição |
| `src/features/assistant/components/assistantUi.ts` | Estilos SX do chat |
| `src/features/assistant/Assistant.tsx` | Container principal, handlers |
| `src/hooks/useAssistant.ts` | Estado, lógica de retry/regenerate |
| `src/lib/db/types.ts` | Tipo `ChatMessageRecord` (timestamp) |
| `src/features/assistant/types.ts` | Tipos re-exportados |

### Dependências externas

| Pacote | Uso | Já instalado? |
|--------|-----|---------------|
| `motion` (ex framer-motion) | Animações de entrada/saída/layout | ✅ |
| `@mui/material` | Dialog, Fab, Zoom, Tooltip | ✅ |
| `react-markdown` | Renderização de markdown | ✅ |
| `react-syntax-highlighter` | Syntax highlight em blocos de código | ❌ **precisa instalar** |

---

## Lote 1 — Fundação (sem dependências entre si)

### 1.1 — Adicionar `createdAt` ao `ChatMessageRecord`

**Por que:** Todos os timestamps dependem desse campo. É a pré-condição para o item #4.

**O que fazer:**

1. Em `src/lib/db/types.ts`, adicionar campo opcional ao `ChatMessageRecord`:
   ```typescript
   export interface ChatMessageRecord {
     id: string;
     role: 'user' | 'model';
     text: string;
     attachments?: AttachmentRecord[];
     createdAt?: number; // ← novo: epoch ms
   }
   ```

2. Em `src/hooks/useAssistant.ts`, ao criar mensagens (tanto user quanto model), adicionar `createdAt: Date.now()`.

3. **Migração de dados:** Mensagens antigas não terão `createdAt`. O componente deve tratar `undefined` como "sem timestamp" e não renderizar nada nesse caso. Não precisa de migration script — o campo é opcional.

**Arquivos:**
- `src/lib/db/types.ts` — adicionar campo
- `src/hooks/useAssistant.ts` — setar `Date.now()` ao criar mensagens
- `src/features/assistant/types.ts` — re-export já pega automaticamente

**Critério de pronto:**
- [ ] Campo existe no tipo
- [ ] Mensagens novas recebem timestamp
- [ ] Mensagens antigas (sem timestamp) não quebram

---

### 1.2 — Remover "Salvar Insight"

**Por que:** Matheus solicitou remoção. É um fluxo que polui a UI sem uso significativo.

**O que fazer:**

1. Em `src/features/assistant/components/AssistantMessages.tsx`:
   - Remover o botão "Salvar Insight" (linhas ~254-268) da `MessageBubble`
   - Remover props `isSavedToMemory`, `onSaveToMemory` da interface `MessageBubbleProps`
   - Remover a prop `savedToMemoryId` de `AssistantMessagesProps`
   - Remover o `Divider` que separa os botões (linha ~238) — sem o botão de memória, o divider é desnecessário se não houver settings

2. Em `src/features/assistant/Assistant.tsx`:
   - Remover `savedToMemoryId` state e `handleSaveMessageToMemory` callback
   - Remover a prop `onSaveToMemory` passada para `AssistantMessages`
   - Manter a função `saveMemory` importada (pode ser usada em outro lugar)

3. Em `tests/assistant/AssistantMessages.component.test.tsx`:
   - Atualizar testes que referenciam `savedToMemoryId` ou `onSaveToMemory`

**Arquivos:**
- `src/features/assistant/components/AssistantMessages.tsx` — remover botão + props
- `src/features/assistant/Assistant.tsx` — remover handler + state
- `tests/assistant/AssistantMessages.component.test.tsx` — atualizar testes

**Critério de pronto:**
- [ ] Botão "Salvar Insight" não aparece mais na UI
- [ ] Props removidas sem erros de TypeScript
- [ ] Testes atualizados e passando

---

### 1.3 — Copiar bloco de código individualmente

**Por que:** O botão de copiar atual copia a mensagem inteira. Em respostas com código, o usuário quer copiar só o bloco.

**O que fazer:**

1. Criar componente `CodeBlock` em novo arquivo `src/features/assistant/components/CodeBlock.tsx`:
   ```tsx
   import { useState, useCallback } from 'react';
   import Box from '@mui/material/Box';
   import IconButton from '@mui/material/IconButton';
   import Tooltip from '@mui/material/Tooltip';
   import ContentCopy from '@mui/icons-material/ContentCopy';
   import Check from '@mui/icons-material/Check';
   // import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
   // import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
   
   interface CodeBlockProps {
     className?: string;
     children: React.ReactNode;
   }
   
   export function CodeBlock({ className, children }: CodeBlockProps) {
     const [copied, setCopied] = useState(false);
     const codeText = String(children).replace(/\n$/, '');
     const language = className?.replace('language-', '') ?? '';
     
     const handleCopy = useCallback(async () => {
       try {
         await navigator.clipboard.writeText(codeText);
         setCopied(true);
         setTimeout(() => setCopied(false), 2000);
       } catch { /* fallback */ }
     }, [codeText]);
   
     return (
       <Box sx={{ position: 'relative' }}>
         <Tooltip title={copied ? 'Copiado!' : 'Copiar código'}>
           <IconButton
             onClick={handleCopy}
             size="small"
             sx={{
               position: 'absolute',
               right: 8,
               top: 8,
               zIndex: 1,
               color: copied ? 'success.main' : 'text.disabled',
               bgcolor: 'rgba(0,0,0,0.3)',
               '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' },
             }}
           >
             {copied ? <Check sx={{ fontSize: 14 }} /> : <ContentCopy sx={{ fontSize: 14 }} />}
           </IconButton>
         </Tooltip>
         <pre style={{ margin: 0, overflowX: 'auto' }}>
           <code className={className}>{children}</code>
         </pre>
       </Box>
     );
   }
   ```

2. Em `src/features/assistant/components/AssistantMessages.tsx`, passar o componente customizado para o `ReactMarkdown`:
   ```tsx
   import { CodeBlock } from './CodeBlock';
   
   // Dentro do MessageBubble:
   <ReactMarkdown components={{ code: CodeBlock }}>
     {cleanText}
   </ReactMarkdown>
   ```

3. **Opcional (futuro):** Instalar `react-syntax-highlighter` para colorir a sintaxe. Por agora, o `<pre><code>` já funciona.

**Nota sobre `react-syntax-highlighter`:** Se Matheus quiser syntax highlight, precisa instalar:
```bash
bun add react-syntax-highlighter
bun add -d @types/react-syntax-highlighter
```
Mas isso é opcional — o copy button funciona sem ele.

**Arquivos:**
- `src/features/assistant/components/CodeBlock.tsx` — **novo arquivo**
- `src/features/assistant/components/AssistantMessages.tsx` — passar `components` para ReactMarkdown

**Critério de pronto:**
- [ ] Blocos de código `<pre><code>` mostram botão "Copiar" no hover
- [ ] Botão copia apenas o conteúdo do bloco (não a mensagem toda)
- [ ] Feedback visual "Copiado!" com ícone de check
- [ ] Código inline (`` `código` ``) não mostra botão

---

### 1.4 — Botão "Copiar" também nas mensagens do usuário

**Por que:** Atualmente só mensagens do modelo têm botão de copiar. O usuário não consegue copiar facilmente o próprio texto.

**O que fazer:**

Em `src/features/assistant/components/AssistantMessages.tsx`, dentro da `MessageBubble`:

- Atualmente o botão de copiar está dentro de `{isModel && cleanText ? (...) : null}`
- Mudar para `{cleanText ? (...) : null}` — mostra para ambos os roles
- Ajustar ícone/cor para mensagens do usuário (pode ser mais sutil, ex: ícone branco com opacidade)
- Para mensagens do usuário, usar `message.text` em vez de `cleanText` (não precisa de `stripJsonSettingsBlock`)

**Arquivos:**
- `src/features/assistant/components/AssistantMessages.tsx` — expandir condição do botão

**Critério de pronto:**
- [ ] Mensagens do usuário mostram botão de copiar
- [ ] Botão aparece no hover (Tooltip com "Copiar")
- [ ] Feedback de "Copiado!" funciona igual

---

## Lote 2 — Experiência Visual (depende do Lote 1 apenas para timestamps)

### 2.1 — Timestamp nas mensagens

**Por que:** Conversas longas ficam sem contexto temporal. O usuário não sabe quando cada mensagem foi enviada.

**O que fazer:**

Em `src/features/assistant/components/AssistantMessages.tsx`, dentro da `MessageBubble`:

1. Adicionar formatação de timestamp:
   ```tsx
   const formatTimestamp = (ms?: number) => {
     if (!ms) return null;
     const now = Date.now();
     const diff = now - ms;
     if (diff < 60_000) return 'agora';
     if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min`;
     if (diff < 86_400_000) {
       return new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
     }
     return new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
   };
   ```

2. Renderizar o timestamp abaixo do nome do autor:
   ```tsx
   <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
     {isModel ? <AutoAwesome ... /> : <Person ... />}
     <Typography variant="caption" sx={{ fontWeight: 700, ... }}>
       {isModel ? t('assistant.messages.assistant') : t('assistant.messages.you')}
     </Typography>
     {message.createdAt ? (
       <Typography variant="caption" sx={{ color: TEXT_DISABLED, fontSize: '0.65rem' }}>
         {formatTimestamp(message.createdAt)}
       </Typography>
     ) : null}
   </Stack>
   ```

3. Usar `suppressHydrationWarning={true}` no elemento se houver SSR (não aplicável neste projeto — SPA pura, mas boa prática).

**Arquivos:**
- `src/features/assistant/components/AssistantMessages.tsx` — adicionar timestamp
- `src/features/assistant/components/assistantUi.ts` — possivelmente adicionar SX para timestamp

**Critério de pronto:**
- [ ] Mensagens novas mostram timestamp relativo ("agora", "5 min", "14:32")
- [ ] Mensagens antigas sem `createdAt` não mostram nada (sem erro)
- [ ] Timestamp é visualmente sutil (cor TEXT_DISABLED, fonte menor)

---

### 2.2 — Animação de entrada nas mensagens

**Por que:** Mensagens aparecem instantaneamente, sem feedback visual. Animação suave dá sensação de fluidez.

**O que fazer:**

Em `src/features/assistant/components/AssistantMessages.tsx`:

1. Envolver cada `MessageBubble` com `motion.div`:
   ```tsx
   import { motion, AnimatePresence } from 'motion/react';
   
   // Dentro do map de messages:
   <AnimatePresence mode="popLayout">
     {messages.map((message) => (
       <motion.div
         key={message.id}
         layout
         initial={{ opacity: 0, y: 16 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
       >
         {/* bubble */}
       </motion.div>
     ))}
   </AnimatePresence>
   ```

2. Para o stagger inicial (quando carrega histórico), usar variants no pai:
   ```tsx
   const listVariants = {
     visible: {
       opacity: 1,
       transition: {
         delayChildren: stagger(0.05),
       },
     },
     hidden: { opacity: 0 },
   };
   
   const messageVariants = {
     initial: { opacity: 0, y: 16 },
     visible: { 
       opacity: 1, 
       y: 0,
       transition: { type: 'spring', bounce: 0.2 }
     },
   };
   ```

3. **Cuidado com streaming:** A mensagem em streaming não deve ter animação de entrada (já aparece gradualmente pelo texto). Usar `isCurrentlyStreaming` para pular a animação nesse caso.

**Arquivos:**
- `src/features/assistant/components/AssistantMessages.tsx` — envolver com motion.div

**Critério de pronto:**
- [ ] Mensagens novas fazem fade-in + slide-up sutil
- [ ] Mensagens em streaming NÃO têm animação duplicada
- [ ] Stagger funciona no carregamento inicial do histórico
- [ ] Performance OK (sem jank em mobile)

---

### 2.3 — Scroll-to-bottom flutuante

**Por que:** Durante streaming, se o usuário scrolla para cima, a resposta continua rolando mas ele perde o contexto. Precisa de um botão para voltar ao final.

**O que fazer:**

1. Criar componente `ScrollToBottomFab` em `src/features/assistant/components/ScrollToBottomFab.tsx`:
   ```tsx
   import { useState, useEffect, useCallback, type RefObject } from 'react';
   import Fab from '@mui/material/Fab';
   import Zoom from '@mui/material/Zoom';
   import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
   import { BRAND_PRIMARY } from '../../../theme/tokens';
   
   interface ScrollToBottomFabProps {
     containerRef: RefObject<HTMLDivElement | null>;
     isStreaming?: boolean;
   }
   
   export function ScrollToBottomFab({ containerRef, isStreaming }: ScrollToBottomFabProps) {
     const [isAtBottom, setIsAtBottom] = useState(true);
   
     useEffect(() => {
       const container = containerRef.current;
       if (!container) return;
   
       const handleScroll = () => {
         const { scrollTop, scrollHeight, clientHeight } = container;
         setIsAtBottom(scrollHeight - scrollTop - clientHeight < 80);
       };
   
       container.addEventListener('scroll', handleScroll, { passive: true });
       return () => container.removeEventListener('scroll', handleScroll);
     }, [containerRef]);
   
     // Auto-scroll durante streaming se estava no final
     // (essa lógica já existe no useAssistant via messagesEndRef)
   
     const handleClick = useCallback(() => {
       containerRef.current?.scrollTo({
         top: containerRef.current.scrollHeight,
         behavior: 'smooth',
       });
     }, [containerRef]);
   
     return (
       <Zoom in={!isAtBottom}>
         <Fab
           size="small"
           onClick={handleClick}
           aria-label="Ir para o final"
           sx={{
             position: 'absolute',
             bottom: 80,
             right: 16,
             bgcolor: 'background.paper',
             border: '1px solid',
             borderColor: 'divider',
             boxShadow: 2,
             '&:hover': { bgcolor: 'background.paper' },
           }}
         >
           <KeyboardArrowDown />
         </Fab>
       </Zoom>
     );
   }
   ```

2. Em `src/features/assistant/Assistant.tsx`, adicionar o componente dentro do container scrollável:
   ```tsx
   import { ScrollToBottomFab } from './components/ScrollToBottomFab';
   
   // Dentro do Box scrollável (linha ~506):
   <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0, scrollBehavior: 'smooth', position: 'relative' }}>
     <AssistantMessages ... />
     <PlanWidget ... />
     {/* ... outros widgets ... */}
     <ScrollToBottomFab containerRef={scrollContainerRef} isStreaming={isStreaming} />
   </Box>
   ```

3. Criar uma `ref` para o container scrollável (ou usar a ref existente se houver).

**Arquivos:**
- `src/features/assistant/components/ScrollToBottomFab.tsx` — **novo arquivo**
- `src/features/assistant/Assistant.tsx` — adicionar componente + ref

**Critério de pronto:**
- [ ] FAB aparece com animação Zoom quando o usuário scrolla para cima
- [ ] FAB desaparece quando já está no final
- [ ] Clique no FAB faz scroll suave até o final
- [ ] Funciona durante streaming

---

### 2.4 — Lightbox de imagens

**Por que:** Imagens anexadas pelo usuário aparecem como miniatura 44x44. Não há como ver em tamanho real.

**O que fazer:**

1. Criar componente `ImageLightbox` em `src/features/assistant/components/ImageLightbox.tsx`:
   ```tsx
   import { useState, useCallback } from 'react';
   import Dialog from '@mui/material/Dialog';
   import Zoom from '@mui/material/Zoom';
   import IconButton from '@mui/material/IconButton';
   import Box from '@mui/material/Box';
   import Close from '@mui/icons-material/Close';
   
   interface ImageLightboxProps {
     src: string;
     alt: string;
     thumbnailSx?: object;
   }
   
   export function ImageLightbox({ src, alt, thumbnailSx }: ImageLightboxProps) {
     const [open, setOpen] = useState(false);
     const handleOpen = useCallback(() => setOpen(true), []);
     const handleClose = useCallback(() => setOpen(false), []);
   
     return (
       <>
         <Box
           component="img"
           src={src}
           alt={alt}
           onClick={handleOpen}
           sx={{ cursor: 'zoom-in', ...thumbnailSx }}
         />
         <Dialog
           open={open}
           onClose={handleClose}
           maxWidth="lg"
           slots={{ transition: Zoom }}
           slotProps={{
             paper: {
               sx: {
                 bgcolor: 'transparent',
                 boxShadow: 'none',
                 overflow: 'hidden',
               },
             },
           }}
         >
           <Box sx={{ position: 'relative' }}>
             <IconButton
               onClick={handleClose}
               aria-label="Fechar preview"
               sx={{
                 position: 'absolute',
                 right: 8,
                 top: 8,
                 color: '#fff',
                 bgcolor: 'rgba(0,0,0,0.5)',
                 '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
               }}
             >
               <Close />
             </IconButton>
             <Box
               component="img"
               src={src}
               alt={alt}
               sx={{
                 width: '100%',
                 height: 'auto',
                 maxHeight: '90vh',
                 objectFit: 'contain',
               }}
             />
           </Box>
         </Dialog>
       </>
     );
   }
   ```

2. Em `src/features/assistant/components/AssistantMessages.tsx`, substituir o `<Box component="img">` do attachment por `<ImageLightbox>`:
   ```tsx
   import { ImageLightbox } from './ImageLightbox';
   
   // Dentro do map de attachments:
   {isImage && 'data' in attachment ? (
     <ImageLightbox
       src={`data:${attachment.mimeType};base64,${attachment.data}`}
       alt={attachment.name}
       thumbnailSx={{ width: 44, height: 44, objectFit: 'cover', borderRadius: RADIUS_XS }}
     />
   ) : (
     // ... fallback existente
   )}
   ```

**Arquivos:**
- `src/features/assistant/components/ImageLightbox.tsx` — **novo arquivo**
- `src/features/assistant/components/AssistantMessages.tsx` — usar componente

**Critério de pronto:**
- [ ] Clique na miniatura abre Dialog com imagem em tamanho real
- [ ] Botão X fecha o lightbox
- [ ] Click fora da imagem fecha (comportamento padrão do Dialog)
- [ ] Zoom transition para entrada/saída

---

## Lote 3 — Interação Avançada (depende do Lote 1)

### 3.1 — Link "Ver no estúdio" após aplicar ajustes

**Por que:** Após clicar "Aplicar ao estúdio", o usuário vê "Aplicado!" por 3s mas não tem como navegar facilmente.

**O que fazer:**

Em `src/features/assistant/components/AssistantMessages.tsx`, dentro da `MessageBubble`:

1. Quando `isApplied` for true, mostrar um link abaixo do botão:
   ```tsx
   {isApplied ? (
     <Chip
       component="a"
       href="/app/estudio"
       label="Ver no estúdio →"
       size="small"
       clickable
       sx={{ fontSize: '0.75rem' }}
     />
   ) : null}
   ```

2. Ou usar `react-router-dom` `Link` se preferir SPA navigation (melhor UX, sem reload).

**Arquivos:**
- `src/features/assistant/components/AssistantMessages.tsx` — adicionar link

**Critério de pronto:**
- [ ] Após "Aplicado!", aparece link "Ver no estúdio →"
- [ ] Link navega para `/app/estudio` sem reload da página

---

### 3.2 — Editar mensagem enviada (do usuário)

**Por que:** Se o usuário digitou errado, não tem como corrigir — precisa enviar outra mensagem.

**O que fazer:**

1. Em `src/features/assistant/components/AssistantMessages.tsx`:
   - Adicionar botão de editar (ícone `Edit`) nas mensagens do usuário (visível no hover)
   - Ao clicar, trocar o `<Typography>` por um `<textarea>` pré-preenchido com o texto
   - Confirmar com Enter (sem Shift) ou botão de check
   - Cancelar com Escape

2. Em `src/hooks/useAssistant.ts`:
   - Adicionar função `editMessage(messageId: string, newText: string)`:
     ```typescript
     const editMessage = useCallback((messageId: string, newText: string) => {
       setMessages(prev => prev.map(msg => 
         msg.id === messageId ? { ...msg, text: newText } : msg
       ));
       // Remove todas as mensagens após a editada (modelo + user)
       // e re-envia o contexto até esse ponto
     }, []);
     ```
   - A função deve truncar o histórico a partir da mensagem editada e re-enviar

3. **UX:** O textarea inline deve ter:
   - Mesmo estilo do composer (borda, fonte)
   - Botão de confirmar (check) e cancelar (X)
   - Auto-focus ao entrar em modo de edição

**Arquivos:**
- `src/features/assistant/components/AssistantMessages.tsx` — botão editar + textarea inline
- `src/hooks/useAssistant.ts` — função `editMessage`

**Critério de pronto:**
- [ ] Hover na mensagem do usuário mostra ícone de editar
- [ ] Clique troca para modo de edição (textarea)
- [ ] Enter confirma, Escape cancela
- [ ] Mensagens posteriores são removidas e contexto re-enviado

---

### 3.3 — Regenerar resposta da IA

**Por que:** Se a resposta não ficou boa, o usuário precisa reescrever o prompt. Deveria poder regenerar com um clique.

**O que fazer:**

1. Em `src/features/assistant/components/AssistantMessages.tsx`:
   - Adicionar botão "Regenerar" (ícone `Refresh`) nas mensagens do modelo (visível no hover, ao lado do botão de copiar)
   - Só mostrar na **última** mensagem do modelo (não em todas)

2. Em `src/hooks/useAssistant.ts`:
   - A função `retryLastMessage` já existe e faz quase isso — mas só para erros
   - Criar `regenerateLastResponse()`:
     ```typescript
     const regenerateLastResponse = useCallback(() => {
       // Remove a última mensagem do modelo
       const lastModelIdx = messages.findLastIndex(m => m.role === 'model');
       if (lastModelIdx === -1) return;
       
       const sanitizedMessages = messages.filter((_, idx) => idx !== lastModelIdx);
       setMessages(sanitizedMessages);
       
       // Encontra a última mensagem do usuário antes dela
       const lastUserMsg = sanitizedMessages.findLast(m => m.role === 'user');
       if (!lastUserMsg) return;
       
       void sendMessage(lastUserMsg.text, lastUserMsg.attachments, sanitizedMessages);
     }, [messages, sendMessage]);
     ```

3. Expor `regenerateLastResponse` no return do hook.

**Arquivos:**
- `src/features/assistant/components/AssistantMessages.tsx` — botão regenerar
- `src/hooks/useAssistant.ts` — função `regenerateLastResponse`
- `src/features/assistant/Assistant.tsx` — passar prop

**Critério de pronto:**
- [ ] Botão "Regenerar" aparece na última mensagem do modelo (hover)
- [ ] Clique remove a resposta e gera uma nova
- [ ] Loading state funciona normalmente durante regeneração
- [ ] Mensagens antigas (não-últimas) não mostram o botão

---

## Ordem de Execução Recomendada

```
Lote 1 (fundação — sem dependências entre si):
  1.1 — createdAt no ChatMessageRecord
  1.2 — Remover "Salvar Insight"
  1.3 — Copiar bloco de código
  1.4 — Copiar mensagem do usuário

Lote 2 (visual — depende de 1.1 para timestamps):
  2.1 — Timestamp nas mensagens
  2.2 — Animação de entrada
  2.3 — Scroll-to-bottom FAB
  2.4 — Lightbox de imagens

Lote 3 (interação — depende de 1.2 para limpeza):
  3.1 — Link "Ver no estúdio"
  3.2 — Editar mensagem
  3.3 — Regenerar resposta
```

### Lotes podem ser paralelizados?

- **Lote 1:** Os 4 itens são independentes — podem ser feitos em paralelo por agents separados
- **Lote 2:** Os 4 itens são independentes entre si, mas todos dependem de 1.1 (timestamp)
- **Lote 3:** Os 3 itens são independentes entre si, mas dependem de 1.2 (remoção do Save Insight)

### Estimativa de esforço

| Item | Arquivos novos | Arquivos editados | Complexidade |
|------|---------------|-------------------|-------------|
| 1.1 createdAt | 0 | 2 | 🟢 Baixa |
| 1.2 Remover Save Insight | 0 | 3 | 🟢 Baixa |
| 1.3 Copiar código | 1 | 1 | 🟢 Baixa |
| 1.4 Copiar user msg | 0 | 1 | 🟢 Baixa |
| 2.1 Timestamp | 0 | 1-2 | 🟢 Baixa |
| 2.2 Animação | 0 | 1 | 🟡 Média |
| 2.3 Scroll FAB | 1 | 1 | 🟡 Média |
| 2.4 Lightbox | 1 | 1 | 🟢 Baixa |
| 3.1 Link estúdio | 0 | 1 | 🟢 Baixa |
| 3.2 Editar msg | 0 | 2 | 🔴 Alta |
| 3.3 Regenerar | 0 | 2-3 | 🟡 Média |

**Total:** 3 arquivos novos, ~5 arquivos editados

---

## Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Streaming + animação conflitam | Médio | Desabilitar animação em mensagens em streaming |
| `react-syntax-highlighter` aumenta bundle | Baixo | Usar import dinâmico (`lazy`) ou pular syntax highlight por agora |
| Editar mensagem quebra o `fullHistory` do Genkit | Alto | Truncar `fullHistory` junto com as mensagens visuais |
| Migração de `createdAt` em mensagens antigas | Baixo | Campo opcional — mensagens sem timestamp não mostram nada |
| Motion `layout` causa distorção em bolhas | Médio | Usar `layout="position"` se houver distorção de border-radius |

---

## Referências

- **React Docs** — `components` prop do ReactMarkdown, `useRef` para scroll, `useActionState`, imutabilidade
- **Motion Docs** — `AnimatePresence`, `mode="popLayout"`, `layout`, `stagger`
- **MUI v9 Docs** — `Dialog` com `slots.transition`, `Fab` com `Zoom`, `Tooltip` controlado
