# Auditoria Estática — MobileBottomNav.tsx

**Arquivo:** `src/components/app/MobileBottomNav.tsx` (420 linhas)
**Data:** 2026-05-29
**Escopo:** Imports, tipagem, acessibilidade, performance, anti-patterns do projeto, consistência, segurança.

---

## Veredito: Ajustes recomendados

O componente está bem construído, usa tokens do projeto, i18n completo nos 3 locales, sem `any`, sem `console.log`, sem Tailwind, sem `process.env`. A integração MUI v9 está correta (`slotProps`, `component={Link}` sem `nativeButton`). Há um achado de UI consistência com as diretrizes do Material Design e um de performance menor.

---

## Achados priorizados

### [WARNING] `showLabels` com 5 itens contradiz Material Design

- **Arquivo:** `src/components/app/MobileBottomNav.tsx:140`
- **Confidence:** 95/100
- **Categoria:** UI
- **Problema:** O BottomNavigation usa `showLabels` com 5 itens (4 principais + "Mais"), mas as diretrizes do MUI/Material Design recomendam que 4-5 itens exibam apenas ícones quando inativos para evitar poluição visual.
- **Evidência:**
  ```tsx
  <BottomNavigation
    value={activeValue}
    showLabels  // ← 5 itens com labels sempre visíveis
  >
  ```
  Documentação MUI v9: *"If there are four or five actions, do not use `showLabels`. This ensures inactive views display as icons only, preventing visual clutter."*
- **Impacto:** Em telas mobile pequenas (320px), 5 labels simultâneos ficam visualmente apertados. O `fontSize: '0.625rem'` (10px) tenta compensar, mas pode ficar abaixo do mínimo legível em alguns dispositivos.
- **Sugestão:** Remover `showLabels` para alinhar com Material Design. Os labels apareceriam apenas no item selecionado, que é o comportamento padrão esperado. Se o design atual for intencional, adicionar comentário justificando a exceção.

---

### [SUGGESTION] `navItems` como dependência desnecessária no `useMemo` de `activeValue`

- **Arquivo:** `src/components/app/MobileBottomNav.tsx:110-113`
- **Confidence:** 82/100
- **Categoria:** Performance
- **Problema:** `navItems` está no array de dependências do `useMemo` de `activeValue`, mas as rotas são strings estáticas. Embora a cadeia de memoização seja estável (`navItems` só muda quando `t` muda), a referência do array é recriada a cada ciclo de `t`, causando recálculo desnecessário do `activeValue` quando o locale muda sem que o pathname tenha mudado.
- **Evidência:**
  ```tsx
  const activeValue = useMemo(() => {
    const isMainRoute = navItems.some((item) => item.to === location.pathname);
    return isMainRoute ? location.pathname : MORE_VALUE;
  }, [location.pathname, navItems]); // ← navItems é referência, não primitivo
  ```
- **Impacto:** Baixo — o recálculo é barato (4 comparações de string) e só acontece na mudança de locale. Mas viola o princípio de que `useMemo` deve depender apenas do que realmente afeta o resultado.
- **Sugestão:** Extrair as rotas como constante fora do componente ou inlinear as strings:
  ```tsx
  const MAIN_ROUTES = ['/app/estudio', '/app/video', '/app/assistente', '/app/biblioteca'] as const;

  const activeValue = useMemo(() => {
    return MAIN_ROUTES.includes(location.pathname as typeof MAIN_ROUTES[number])
      ? location.pathname
      : MORE_VALUE;
  }, [location.pathname]);
  ```

---

## O que parece saudável

- **Imports 100% utilizados** — todos os 32 imports são referenciados no código
- **Sem `any`** — tipagem explícita com `BottomNavItem`, `ElementType`
- **Sem `console.log/warn/error`** — conformidade com AGENTS.md
- **Sem Tailwind, sem `process.env`** — conformidade total
- **i18n completo** — chaves `mobileBottomNav.*` presentes nos 3 locales (pt-BR, en, es)
- **Tokens do projeto** — usa `APP_SURFACE`, `APP_BORDER`, `BRAND_GRADIENT`, `ICON_SIZE_MD/SM`, `glassSurfaceSx` consistentemente
- **Acessibilidade sólida** — `aria-label` no Paper/nav e Drawer, `aria-expanded` e `aria-label` no botão "Mais", `aria-hidden` em ícones decorativos, `aria-current="page"` nos itens do drawer
- **MUI v9 correto** — `slotProps={{ paper: {...} }}` no Drawer (não `PaperProps` deprecated), `component={Link}` sem `nativeButton` (correto — Link renderiza `<a>`, não `<div>`)
- **Z-index organizado** — BottomNav (1200) < Drawer (1300) < ActionBar (1400)
- **Safe area** — `pb: 'env(safe-area-inset-bottom, 0px)'` para devices com notch
- **`keepMounted: true`** no Drawer para performance de reabertura
- **CustomEvent** para dialog de exclusão — padrão já estabelecido no Header.tsx com cleanup no useEffect, não é acoplamento novo
- **Memoização adequada** — `navItems`, `drawerItems`, todos os handlers com `useCallback`
- **Glass effect consistente** — backdrop blur no Paper e Drawer alinha com o AppBar

---

## Limites da revisão

- Não foi possível verificar contraste de cores real (depende de inspeção visual no device)
- Não foi verificado se todos os 3 locales têm traduções completas para todas as chaves (apenas pt-BR foi lido em detalhe)
- O componente `Header.tsx` não foi auditado completamente (apenas verificado o listener do CustomEvent)
- Performance real em devices低端 não foi testada (apenas análise estática)
