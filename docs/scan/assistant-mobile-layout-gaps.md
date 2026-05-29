# Scan: Layout Mobile do Assistente IA

**Data:** 2026-05-29
**Escopo:** Mudanças de layout mobile no AssistantHeader, assistantUi e AssistantMessages
**Versão:** 0.107.1

---

## 1. Contexto Assumido

- Bottom nav mobile: 56px, `position: fixed`, `z-index: 1200`, com `pb: env(safe-area-inset-bottom)`
- Composer: `position: sticky`, `bottom: 0`, `z-index: 2` dentro do container do assistente
- Header do assistente: topo do container, sem safe-area-inset-top
- Container do assistente: `height: '100%'` herdado de AssistantPage (`height: '100%'`)
- Tokens: `AVATAR_SIZE_SM=32`, `AVATAR_SIZE_MD=36`, `ICON_SIZE_SM=14`, `ICON_SIZE_MD=16`

---

## 2. Mapa Rápido: Sólido vs Frágil

| Aspecto | Status | Nota |
|---------|--------|------|
| Tooltip nos 3 IconButtons | ✅ Sólido | Tooltip + aria-label em History, Memories, Settings |
| Button "Novo Chat" icon-only | ❌ Frágil | Texto hidden com `display:none`, sem `aria-label` |
| Composer vs Bottom Nav | ✅ Sólido | Container `overflow:hidden` + sticky bottom 0 mantém composer acima da nav |
| Paddings mobile | ✅ Sólido | `px: 1.5`, `py: 1` no header; `px: 2`, `py: 1` no composer |
| Empty state mobile | ✅ Sólido | Paddings reduzidos, avatar compacto, chips com flexWrap |
| Overflow em 360px | ✅ Sólido | Header com `minWidth: 0` e `noWrap` no título; layout row cabe |
| Touch targets | ❌ Frágil | SendButton/StopButton 40x40px; Button "Novo Chat" ~40x30px |
| Safe-area top | ❌ Frágil | Nenhum `env(safe-area-inset-top)` no projeto (exceto bottom nav) |
| Estados (loading/erro/streaming) | ✅ Sólido | Skeleton, Alert+retry, cursor+TwoPhaseStopButton, CreditBlockedMessage |

---

## 3. Gaps Priorizados

### GAP-001 | ALTO | Acessibilidade | Confidence 95

**Button "Novo Chat" sem `aria-label` no mobile**

O texto do botão é hidden com `display: { xs: 'none', sm: 'inline' }` (linha 121 de AssistantHeader.tsx). Em mobile, o botão renderiza apenas o ícone `<Forum />` sem texto visível e sem `aria-label`. O `<Tooltip>` mostra o title visualmente, mas **não garante acessibilidade para screen readers** (MUI Tooltip não adiciona `aria-label` ao child por padrão).

**Evidência:**
```tsx
// AssistantHeader.tsx:109-125
<Tooltip title={t('assistant.header.newChat')}>
  <Button
    onClick={onStartNewChat}
    variant="contained"
    size="small"
    startIcon={<Forum sx={{ fontSize: ICON_SIZE_MD }} />}
    // ❌ Sem aria-label
    sx={{ minWidth: { xs: 40, sm: 'auto' }, px: { xs: 0, sm: 1.5 } }}
  >
    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
      {t('assistant.header.newChat')}
    </Box>
  </Button>
</Tooltip>
```

**Mitigações verificadas:** Tooltip existe mas não resolve acessibilidade. Os outros 3 IconButtons têm `aria-label` correto.

**Pergunta/decisão:** Adicionar `aria-label={t('assistant.header.newChat')}` no Button.

---

### GAP-002 | MÉDIO | Touch Target | Confidence 92

**SendButton e StopButton com 40x40px (< 44px recomendado)**

WCAG 2.5.5 (AAA) recomenda 44x44px. Os botões de ação principal do composer usam 40x40px.

**Evidência:**
```ts
// assistantUi.ts:328-331 — SendButton
export const assistantSendButtonSx = {
  minWidth: { xs: 40, sm: 104 },
  height: 40,  // ❌ 40px < 44px
  ...
};

// assistantUi.ts:304-308 — ActionIconButton (Stop)
export const assistantActionIconButtonSx = {
  minWidth: 40,
  width: 40,   // ❌ 40px < 44px
  height: 40,
  ...
};
```

**Mitigações verificadas:** Ambos têm `aria-label` correto. O gap é puramente de tamanho de toque.

**Pergunta/decisão:** Aumentar para 44x44px ou adicionar padding de 2px em cada lado?

---

### GAP-003 | MÉDIO | Touch Target | Confidence 90

**Button "Novo Chat" com touch target ~40x30px no mobile**

O Button tem `size="small"` (height ~30px no MUI) e `minWidth: 40` com `px: 0`. Resultado: touch target de ~40x30px, bem abaixo dos 44x44px recomendados.

**Evidência:**
```tsx
// AssistantHeader.tsx:110-119
<Button
  size="small"        // height ~30px
  startIcon={<Forum sx={{ fontSize: ICON_SIZE_MD }} />}
  sx={{
    minWidth: { xs: 40, sm: 'auto' },  // 40px largura
    px: { xs: 0, sm: 1.5 },            // 0 padding horizontal
    // ❌ Touch target ~40x30px
  }}
>
```

**Mitigações verificadas:** Tem Tooltip visual (mas sem aria-label, vide GAP-001).

**Pergunta/decisão:** Usar `size="medium"` no mobile ou aumentar height mínima para 44px?

---

### GAP-004 | MÉDIO | Touch Target | Confidence 85

**IconButton de attach com `size="small"` (~34px)**

O botão de anexo no composer usa `size="small"`, que no MUI resulta em ~34x34px (padding 4px + ícone).

**Evidência:**
```tsx
// AssistantComposer.tsx:264-276
<IconButton
  onClick={() => fileInputRef.current?.click()}
  size="small"  // ❌ ~34x34px < 44px
  aria-label={t('assistant.composer.attachFileAria')}
  ...
>
  <AttachFile sx={{ fontSize: ICON_SIZE_MD }} />
</IconButton>
```

**Mitigações verificadas:** Tem Tooltip e aria-label corretos.

**Pergunta/decisão:** Remover `size="small"` para usar o padrão medium (48px)?

---

### GAP-005 | BAIXO | Safe Area | Confidence 70

**Safe-area inset-top não aplicado em nenhum componente**

Busca com `supergrep_find` por `env(safe-area-inset` em `src/` retornou 0 resultados (exceto o `pb: env(safe-area-inset-bottom)` do MobileBottomNav que usa formato MUI sx). O AssistantHeader não tem padding-top para dispositivos com notch.

**Evidência:**
- AssistantHeader.tsx: `py: { xs: 1, md: 2 }` — sem safe-area-top
- AssistantPage.tsx: `py: { xs: 0, md: 2 }` — sem safe-area-top
- Nenhum componente em `src/` usa `env(safe-area-inset-top)`

**Mitigações verificadas:** O container pai pode ter safe-area via CSS global ou configuração do browser. A bottom nav já usa `env(safe-area-inset-bottom)`.

**Pergunta/decisão:** Em iPhones com notch, o header do assistente fica atrás da status bar? Verificar em dispositivo real.

---

## 4. Cenários de Borda Sem Resposta

1. **Teclado virtual + composer sticky:** Quando o teclado abre no mobile, o `position: sticky` pode não se comportar como esperado. O composer pode ficar parcialmente oculto. Não testado.

2. **iPhone SE (375px) vs iPhone 14 Pro (393px):** O layout cabe em 360px mas não foi testado em devices reais com notch + safe areas.

3. **Landscape mobile:** O header com 4 botões pode overflow em landscape com height reduzido.

4. **Texto longo em chips de sugestão:** Empty state com chips em idiomas com strings mais longas (ex: alemão, se suportado) pode quebrar layout.

---

## 5. Checklist de Sanidade

| Item | Status |
|------|--------|
| Todos os 3 arquivos alterados foram lidos completos | ✅ |
| Tokens numéricos verificados (AVATAR_SIZE_SM=32, ICON_SIZE_MD=16) | ✅ |
| Container pai (AssistantPage.tsx) verificado | ✅ |
| Bottom nav (MobileBottomNav.tsx) verificada | ✅ |
| Composer (AssistantComposer.tsx) verificado | ✅ |
| `supergrep_find` para aria-label no header | ✅ (0 matches confirmado) |
| `supergrep_find` para safe-area no projeto | ✅ (0 matches em src/) |
| `analyze_aitool_find` para tokens | ✅ |
| Estados loading/erro/streaming verificados | ✅ |
| Overflow 360px analisado com cálculo de largura | ✅ |
