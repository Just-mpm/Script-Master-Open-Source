# UI Design System — Script Master

> Documentacao baseada exclusivamente no codigo-fonte do projeto (v0.12.0).

---

## Stack MUI

| Pacote | Versao | Nota |
|--------|--------|------|
| `@mui/material` | `^9.0.0` | Stack visual principal |
| `@mui/icons-material` | `^9.0.0` | Icones |
| `@mui/styled-engine` | `^9.0.0` | Bridge para Emotion |
| `@mui/system` | `^9.0.0` | Sistema de estilos (sx prop) |
| `@mui/utils` | `^9.0.0` | Utilitarios internos |
| `@emotion/react` | `^11.14.0` | Engine CSS-in-JS |
| `@emotion/styled` | `^11.14.1` | Styled components |

Plugins de lint relevantes: `eslint-plugin-mui-v9`.

---

## Arquitetura do Tema

```
src/theme/
  appTheme.ts          # Theme MUI principal
  tokens.ts            # Tokens visuais (cores, spacing, tamanhos)
  surfaces.ts          # Superficies glass (glassPanelSx, insetPanelSx, glassSurfaceSx)
  linkBehavior.tsx     # Integracao MUI Link + React Router
  AppThemeProvider.tsx  # Provider do tema na arvore React
```

---

## AppThemeProvider

**Arquivo:** `src/theme/AppThemeProvider.tsx`

Envolve o app com `ThemeProvider` do MUI e `CssBaseline`. Configuracao:

```tsx
<ThemeProvider theme={appTheme} defaultMode="dark" noSsr disableTransitionOnChange>
  <CssBaseline enableColorScheme />
  {children}
</ThemeProvider>
```

| Prop | Valor | Descricao |
|------|-------|-----------|
| `defaultMode` | `"dark"` | Modo inicial do tema |
| `noSsr` | `true` | Evita flash de tema incorreto no SSR |
| `disableTransitionOnChange` | `true` | Remove transicoes ao trocar tema |
| `enableColorScheme` | `true` (CssBaseline) | Ativa `color-scheme` no HTML |

### Ordem na arvore de componentes (`src/main.tsx`)

```
StrictMode
  StyledEngineProvider (enableCssLayer)
    GlobalStyles ("@layer theme, base, mui, components, utilities;")
    AppThemeProvider
      BrowserRouter
        RoutableErrorBoundary
          AuthProvider
            AudioProvider
              App
```

Notas:
- `StyledEngineProvider` com `enableCssLayer` ativa CSS Layers no MUI v9.
- `GlobalStyles` define a ordem das camadas CSS: `theme, base, mui, components, utilities`.
- `index.css` e importado antes de tudo no `main.tsx`.
- `RoutableErrorBoundary` combina `useLocation` + `ErrorBoundary` com `key={location.pathname}` para resetar automaticamente ao mudar de rota. O key dinamico forca o React a destruir e recriar o ErrorBoundary, limpando o estado de erro automaticamente.

---

## appTheme.ts

**Arquivo:** `src/theme/appTheme.ts`

O tema e criado com `createTheme` e depois refinado com `responsiveFontSizes` e um segundo `createTheme` (merge).

### CSS Variables

```ts
cssVariables: true,
```

Ativa variaveis CSS do MUI no formato `--mui-palette-*`, `--mui-shape-*`, etc.

### Color Schemes

```ts
colorSchemes: {
  light: { palette: sharedPalette },
  dark:  { palette: sharedPalette },
},
```

Ambos os esquemas (light e dark) compartilham a mesma paleta (`sharedPalette`). O app usa modo escuro por padrao.

### Palette (sharedPalette)

| Slot | Valor | Token de origem |
|------|-------|-----------------|
| `primary.main` | `#22d3ee` | `BRAND_PRIMARY` |
| `primary.light` | `#67e8f9` | `BRAND_PRIMARY_LIGHT` |
| `primary.dark` | `#0891b2` | `BRAND_PRIMARY_DARK` |
| `primary.contrastText` | `#03111d` | `BRAND_PRIMARY_CONTRAST_TEXT` |
| `secondary.main` | `#8b5cf6` | `BRAND_SECONDARY` |
| `secondary.light` | `#c4b5fd` | `BRAND_SECONDARY_LIGHT` |
| `secondary.dark` | `#6d28d9` | `BRAND_SECONDARY_DARK` |
| `secondary.contrastText` | `#f8fafc` | `BRAND_SECONDARY_CONTRAST_TEXT` |
| `success.main` | `#10b981` | `SUCCESS_MAIN` |
| `error.main` | `#ef4444` | `ERROR_MAIN` |
| `warning.main` | `#f59e0b` | `WARNING_MAIN` |
| `background.default` | `#050816` | `APP_BACKGROUND` |
| `background.paper` | `#10172a` | `APP_SURFACE` |
| `divider` | `rgba(255, 255, 255, 0.08)` | `APP_BORDER` |
| `text.primary` | `#f8fafc` | `TEXT_PRIMARY` |
| `text.secondary` | `rgba(248, 250, 252, 0.68)` | `TEXT_SECONDARY` |
| `text.disabled` | `rgba(248, 250, 252, 0.38)` | `TEXT_DISABLED` |
| `action.active` | `#f8fafc` | `TEXT_PRIMARY` |
| `action.hover` | `rgba(248, 250, 252, 0.05)` | `ACTION_HOVER` |
| `action.selected` | `rgba(34, 211, 238, 0.14)` | `ACTION_SELECTED` |
| `action.disabled` | `rgba(248, 250, 252, 0.3)` | `ACTION_DISABLED` |
| `action.disabledBackground` | `rgba(248, 250, 252, 0.08)` | `ACTION_DISABLED_BACKGROUND` |
| `action.focus` | `rgba(34, 211, 238, 0.22)` | `ACTION_FOCUS` |

### Shape

```ts
shape: { borderRadius: 6 },
```

### Spacing

```ts
spacing: 8,
```

Base de 8px (cada unidade = 8px).

### Typography

```ts
typography: {
  fontFamily: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'].join(','),
  h1:  { fontWeight: 700, letterSpacing: '-0.04em' },
  h2:  { fontWeight: 700, letterSpacing: '-0.04em' },
  h3:  { fontWeight: 700, letterSpacing: '-0.035em' },
  h4:  { fontWeight: 700, letterSpacing: '-0.03em' },
  h5:  { fontWeight: 700, letterSpacing: '-0.025em' },
  h6:  { fontWeight: 700, letterSpacing: '-0.02em' },
  subtitle1: { fontWeight: 600 },
  body1: { lineHeight: 1.6 },
  body2: { lineHeight: 1.55 },
  button: { fontWeight: 600 },
}
```

Todos os headings usam `fontWeight: 700` com `letter-spacing` negativo decrescente. O tema final e envolvido por `responsiveFontSizes()`.

### Component Overrides

#### MuiCssBaseline (`:root`)

Registra variaveis CSS customizadas derivadas dos tokens MUI:

| Variavel CSS | Valor |
|--------------|-------|
| `--bg-base` | `var(--mui-palette-background-default)` |
| `--bg-surface` | `var(--mui-palette-background-paper)` |
| `--bg-elevated` | `APP_SURFACE_ELEVATED` (`#141c33`) |
| `--border` / `--border-base` | `var(--mui-palette-divider)` |
| `--border-hover` | `APP_BORDER_STRONG` |
| `--text-primary` | `var(--mui-palette-text-primary)` |
| `--text-secondary` | `var(--mui-palette-text-secondary)` |
| `--text-tertiary` | `var(--mui-palette-text-disabled)` |
| `--accent` | `var(--mui-palette-primary-main)` |
| `--accent-hover` | `var(--mui-palette-primary-dark)` |
| `--accent-glow` | `color-mix(in srgb, primary-main, transparent 72%)` |
| `--glass-bg` | `color-mix(in srgb, paper, transparent 22%)` |
| `--glass-border` | `color-mix(in srgb, white, transparent 95%)` |

Outros estilos do CssBaseline:
- `colorScheme: 'dark'` no `:root`
- `min-height: 100%` no `html`
- `min-height: 100vh` no `body` e `#root`
- `color: TEXT_PRIMARY` no `body`
- `background: APP_BACKGROUND_GLOW` no `body`
- `::selection` com `backgroundColor: alpha(BRAND_PRIMARY, 0.3)` e `color: 'var(--mui-palette-text-primary)'`

#### MuiLink

```ts
defaultProps: { component: LinkBehavior },
```

Todos os `MuiLink` usam `LinkBehavior` (Router) por padrao.

#### MuiButtonBase

```ts
defaultProps: { LinkComponent: LinkBehavior },
```

Componentes baseados em botao (ListItem, etc.) usam `LinkBehavior` para links.

#### MuiAppBar

```ts
defaultProps: { elevation: 0, color: 'transparent' }
styleOverrides.root: {
  backgroundColor: alpha(APP_BACKGROUND, 0.68),
  backgroundImage: 'none',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderBottom: '1px solid APP_BORDER',
}
```

Header com efeito glass/blur.

#### MuiToolbar

```ts
styleOverrides.root: {
  minHeight: APP_HEADER_HEIGHT,
  '@media (min-width: 0px)': {
    minHeight: APP_HEADER_HEIGHT,
  },
} // 60px
```

#### MuiPaper

```ts
styleOverrides.root: { backgroundImage: 'none' }
styleOverrides.outlined: { borderColor: APP_BORDER }
```

#### MuiCard

Primeiro override (no `createTheme` inicial):
```ts
styleOverrides.root: { backgroundImage: 'none' }
```

Segundo override (apos `responsiveFontSizes`):
```ts
styleOverrides.root: {
  backgroundColor: alpha(APP_SURFACE_ELEVATED, 0.9),
  border: '1px solid APP_BORDER_STRONG',
}
```

#### MuiButton

```ts
defaultProps: { disableElevation: true }
styleOverrides.root: {
  borderRadius: 14,
  minHeight: 44,
  textTransform: 'none',
  fontWeight: 600,
  letterSpacing: '-0.01em',
}
```

Variante `contained` + `primary` tem sombra customizada:
```ts
boxShadow: '0 18px 44px alpha(BRAND_PRIMARY, 0.28)'
```

#### MuiIconButton

```ts
styleOverrides.root: { minHeight: 44, minWidth: 44, borderRadius: 12 }
```

#### MuiAlert

```ts
styleOverrides.root: { borderRadius: 6 }
```

Variantes filled:
- `success`: `backgroundColor: alpha(SUCCESS_MAIN, 0.92)`, `color: TEXT_PRIMARY`
- `error`: `backgroundColor: alpha(ERROR_MAIN, 0.92)`, `color: TEXT_PRIMARY`

#### MuiSnackbar

```ts
styleOverrides.root: { zIndex: 1500 }
```

---

## Tokens Visuais

**Arquivo:** `src/theme/tokens.ts`

### Layout

| Token | Valor |
|-------|-------|
| `APP_MAX_WIDTH` | `1600` |
| `APP_HEADER_HEIGHT` | `60` |
| `APP_ACTION_BAR_BOTTOM` | `24` |

### Sizing

| Token | Valor |
|-------|-------|
| `AVATAR_SIZE_SM` | `32` |
| `AVATAR_SIZE_MD` | `36` |
| `ICON_SIZE_SM` | `14` |
| `ICON_SIZE_MD` | `16` |
| `ICON_SIZE_LG` | `18` |

### Border Radius

| Token | Valor |
|-------|-------|
| `RADIUS_XS` | `2` |
| `RADIUS_SM` | `3` |
| `RADIUS_CHIP` | `6` |

### Spacing (Gap)

| Token | Valor (em rem) | Pixels (base 8px) |
|-------|----------------|--------------------|
| `GAP_COMPACT` | `0.75` | 6px |
| `GAP_DEFAULT` | `1` | 8px |
| `GAP_MEDIUM` | `1.5` | 12px |
| `GAP_RELAXED` | `2` | 16px |

### Brand

| Token | Valor |
|-------|-------|
| `BRAND_PRIMARY` | `#22d3ee` |
| `BRAND_PRIMARY_LIGHT` | `#67e8f9` |
| `BRAND_PRIMARY_DARK` | `#0891b2` |
| `BRAND_SECONDARY` | `#8b5cf6` |
| `BRAND_SECONDARY_LIGHT` | `#c4b5fd` |
| `BRAND_SECONDARY_DARK` | `#6d28d9` |
| `BRAND_PRIMARY_CONTRAST_TEXT` | `#03111d` |
| `BRAND_SECONDARY_CONTRAST_TEXT` | `#f8fafc` |

### Semantic

| Token | Valor |
|-------|-------|
| `SUCCESS_MAIN` | `#10b981` |
| `ERROR_MAIN` | `#ef4444` |
| `WARNING_MAIN` | `#f59e0b` |
| `ERROR_BG_SUBTLE` | `rgba(239, 68, 68, 0.08)` |
| `ERROR_BG_MEDIUM` | `rgba(239, 68, 68, 0.12)` |
| `WARNING_BG_SUBTLE` | `rgba(245, 158, 11, 0.08)` |

### Texto

| Token | Valor |
|-------|-------|
| `TEXT_PRIMARY` | `#f8fafc` |
| `TEXT_SECONDARY` | `rgba(248, 250, 252, 0.68)` |
| `TEXT_DISABLED` | `rgba(248, 250, 252, 0.38)` |

### Superficies

| Token | Valor |
|-------|-------|
| `APP_BACKGROUND` | `#050816` |
| `APP_BACKGROUND_DARKER` | `#070b18` |
| `APP_BACKGROUND_SOFT` | `#0b1020` |
| `APP_SURFACE` | `#10172a` |
| `APP_SURFACE_ELEVATED` | `#141c33` |
| `APP_BORDER` | `rgba(255, 255, 255, 0.08)` |
| `APP_BORDER_STRONG` | `rgba(255, 255, 255, 0.14)` |
| `SHADOW_DEEP` | `#020617` |
| `SHADOW_IMAGE` | `rgba(2, 6, 23, 0.46)` |

### Branco (opacidades)

`WHITE_01`, `WHITE_04`, `WHITE_05`, `WHITE_06`, `WHITE_08`, `WHITE_10`, `WHITE_12`, `WHITE_14`, `WHITE_16`, `WHITE_18`, `WHITE_22`, `WHITE_24`, `WHITE_30`, `WHITE_38`, `WHITE_42`, `WHITE_44`, `WHITE_45`, `WHITE_46`, `WHITE_50`, `WHITE_56`, `WHITE_66`, `WHITE_80`, `WHITE_82`, `WHITE_90`, `WHITE_92`, `WHITE_015`

### Preto (opacidades)

`BLACK_10`, `BLACK_12`, `BLACK_18`, `BLACK_22`, `BLACK_24`, `BLACK_32`, `BLACK_34`, `BLACK_38`, `BLACK_40`, `BLACK_42`, `BLACK_44`, `BLACK_46`, `BLACK_50`, `BLACK_55`, `BLACK_56`, `BLACK_64`, `BLACK_66`, `BLACK_74`, `BLACK_82`, `BLACK_92`

### Glow

| Token | Valor |
|-------|-------|
| `CYAN_GLOW` | `rgba(34, 211, 238, 0.28)` |
| `CYAN_GLOW_SOFT` | `rgba(34, 211, 238, 0.12)` |
| `PURPLE_GLOW_SOFT` | `rgba(139, 92, 246, 0.12)` |

### Outros

| Token | Valor |
|-------|-------|
| `WHITE` | `#ffffff` |
| `BLACK` | `#000000` |
| `TRANSPARENT` | `transparent` |
| `GLASS_BG` | `rgba(16, 23, 42, 0.78)` |

### Empty States

| Token | Valor |
|-------|-------|
| `EMPTY_ICON_SIZE` | `36` |
| `EMPTY_WRAPPER_MAX_WIDTH` | `340` |
| `EMPTY_WRAPPER_PADDING_XS` | `3` |
| `EMPTY_WRAPPER_PADDING_MD` | `4` |

### Gradientes e Sombras Compostas

| Token | Valor |
|-------|-------|
| `BRAND_GRADIENT` | `linear-gradient(135deg, #22d3ee 0%, #8b5cf6 100%)` |
| `BRAND_GRADIENT_HOVER` | `linear-gradient(135deg, #67e8f9 0%, #8b5cf6 100%)` |
| `BRAND_GLOW` | `0 14px 36px rgba(34, 211, 238, 0.26)` |
| `BRAND_GLOW_FOCUS` | `0 0 0 3px rgba(34, 211, 238, 0.45)` |
| `APP_BACKGROUND_GLOW` | 2 radials (`rgba(34, 211, 238, 0.12)` circle at 15%/15% stop 34%, `rgba(139, 92, 246, 0.12)` circle at 85%/20% stop 30%) + linear-gradient `#050816` → `#070b18` |

---

## Surfaces (Glass Panels)

**Arquivo:** `src/theme/surfaces.ts`

Funcoes que retornam `SystemStyleObject<Theme>` para uso via `sx` prop. Todas recebem `theme` como parametro.

### glassPanelSx

Superficie glass principal com blur, gradiente sutil e sombra profunda.

```ts
{
  position: 'relative',
  overflow: 'hidden',
  borderRadius: { xs: 3, md: 4 },
  border: '1px solid alpha(white, 0.08)',
  backgroundColor: 'alpha(paper, 0.78)',
  backgroundImage: 'linear-gradient(180deg, WHITE_05, WHITE_015)',
  boxShadow: '0 24px 80px alpha(SHADOW_DEEP, 0.55)',
  backdropFilter: { xs: 'blur(14px)', md: 'blur(22px)' },
}
```

### insetPanelSx

Painel interno recolhido, sem blur e sem sombra.

```ts
{
  borderRadius: 2,
  border: '1px solid alpha(white, 0.08)',
  backgroundColor: 'alpha(default, 0.28)',
  backgroundImage: 'none',
  boxShadow: 'none',
}
```

Dark override: `backgroundColor: alpha(black, 0.16)`.

### glassSurfaceSx

Superficie glass sem gradient, com blur fixo.

```ts
{
  backgroundColor: 'alpha(APP_SURFACE, 0.78)',
  backgroundImage: 'linear-gradient(180deg, WHITE_05, WHITE_015)',
  backdropFilter: 'blur(22px)',
  WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid APP_BORDER',
  boxShadow: '0 24px 80px alpha(SHADOW_DEEP, 0.55)',
}
```

---

## Link Behavior

**Arquivo:** `src/theme/linkBehavior.tsx`

Ponte entre MUI `Link` e `react-router-dom` `Link`. Mapeia a prop `href` do MUI para `to` do Router.

```tsx
type LinkBehaviorProps = Omit<RouterLinkProps, 'to'> & {
  href: RouterLinkProps['to'];
};

export const LinkBehavior = forwardRef<HTMLAnchorElement, LinkBehaviorProps>(
  function LinkBehavior(props, ref) {
    const { href, ...other } = props;
    return <RouterLink ref={ref} to={href} {...other} />;
  }
);
```

Aplicado automaticamente via `defaultProps` em `MuiLink` e `MuiButtonBase`.

---

## CSS Global

**Arquivo:** `src/index.css`

### Fontes CSS

```css
--font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
--font-serif: "Playfair Display", ui-serif, Georgia, serif;
```

> Nota: as fontes `Inter`, `JetBrains Mono` e `Playfair Display` precisam estar carregadas externamente (Google Fonts, self-hosted, etc.). O CSS so define as variaveis.

### Variaveis CSS (fallback, sobrescritas pelo MUI CssBaseline)

As variaveis em `:root` no `index.css` sao fallbacks com valores hardcoded. O MUI CssBaseline sobrescreve varias delas com valores derivados da palette MUI (ver secao "MuiCssBaseline" acima).

Variavel com diferenca notavel:
- `--accent-glow`: `rgba(34, 211, 238, 0.28)` (hardcoded) vs `color-mix(...)` (CssBaseline)
- `--glass-bg`: `rgba(16, 23, 42, 0.78)` (hardcoded) vs `color-mix(...)` (CssBaseline)
- `--glass-border`: `rgba(255, 255, 255, 0.05)` (hardcoded) vs `color-mix(...)` (CssBaseline)

### Base

```css
html, body { min-height: 100%; }
body { color: var(--text-primary); font-family: var(--font-sans); -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
#root { min-height: 100vh; }
```

### Scrollbar Customizada

```css
::-webkit-scrollbar       { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-tertiary); }
```

### Utility Classes

#### `.no-scrollbar`

Esconde scrollbar completamente (cross-browser):

```css
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
```

#### `.glass-panel`

```css
.glass-panel {
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
}
```

#### `.text-gradient`

```css
.text-gradient {
  background: linear-gradient(135deg, var(--text-primary) 0%, var(--text-tertiary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

#### `.accent-gradient`

```css
.accent-gradient {
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
}
```

### Mobile (max-width: 640px)

```css
button, a    { min-height: 40px; }
input, select, textarea { font-size: 16px; }
```

Previne zoom no iOS em inputs (font-size >= 16px) e garante area de toque minima.

---

## Convencoes do Projeto

1. **MUI v9 e a unica stack de UI.** Nao use Tailwind, CSS modules paralelas ou utilitarios visuais externos.

2. **`index.css` deve permanecer minimo.** So estilos globais que nao sao possiveis/faceis via MUI (scrollbar, font-face, utility classes pontuais).

3. **Novos tokens visuais globais** devem ir em `src/theme/tokens.ts`.

4. **Novas superficies glass** devem ir em `src/theme/surfaces.ts` seguindo o padrao de funcoes que retornam `SystemStyleObject<Theme>`.

5. **Use `sx` prop** para estilizacao de componentes. Prefira tokens importados de `tokens.ts` em vez de valores hardcoded.

6. **Componentes MUI com override global** devem ser configurados em `src/theme/appTheme.ts` (objeto `components`).

7. **Links navegaveis** devem usar `LinkBehavior` automaticamente (ja configurado via `defaultProps` em `MuiLink` e `MuiButtonBase`).

 8. **Layout do App** (`src/App.tsx`):
    - Container central com `maxWidth: APP_MAX_WIDTH` (1600px)
    - Padding responsivo: `px: { xs: 2, sm: 3, lg: 4 }`
    - Padding vertical: `py: { xs: 3, md: 4 }`, `pb: { xs: 16, md: 18 }` (espaco para ActionBar)
    - Rota `/assistant` tem layout full-height (sem Container)
    - Rota `/login` e publica: renderiza SEM Header e SEM Container (layout full-screen). O Header usa `{!isLoginRoute && <Header />}`.
    - Rotas autenticadas sao envolvidas por `<ProtectedRoute />` (`src/components/ProtectedRoute.tsx`), que redireciona nao-autenticados para `/login`.
    - Rota `/` faz redirect para `/estudio` via `<Navigate to="/estudio" replace />`.
    - O Header destruturou `useAuth()` como `{ user, loading, logout }` (sem `login`). O botao "Login" navega para `/login` via `href="/login"` (nao chama `login()` diretamente).

9. **Idioma:** UI em pt-BR, prompts de imagem em ingles, comentarios em portugues.
