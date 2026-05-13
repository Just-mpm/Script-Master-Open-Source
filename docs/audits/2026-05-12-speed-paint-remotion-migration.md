# Auditoria Técnica — Speed Paint: Migração Konva → Remotion + i18n + Fix Testes

**Data:** 2026-05-12  
**Diff:** 5 novos arquivos, 9 deletados, 23 modificados  
**Validação:** typecheck ✅ | lint ✅ | testes 1922/1922 ✅  

---

## Findings

### 1. [HIGH] Chaves i18n ausentes — `speedPaint.exportButton` e `speedPaint.exportDownload`

- **Arquivo:** `src/features/speed-paint/components/SpeedPaintExportPanel.tsx:323,423`
- **Confidence:** 98/100
- **Categoria:** Bug

**Problema:** O componente `SpeedPaintExportPanel` referencia duas chaves i18n inexistentes nos 3 locale files (pt-BR, en, es):

- Linha 323: `t('speedPaint.exportButton')` — botão principal de exportação
- Linha 423: `t('speedPaint.exportDownload')` — botão de download após conclusão

O mecanismo de i18n (`context.tsx:60-63`) faz fallback para a própria chave quando não encontra tradução, logando `Chave de tradução não encontrada: "speedPaint.exportButton"`. O resultado visível é texto cru como `"speedPaint.exportButton"` no lugar de `"Exportar vídeo"` / `"Export video"`.

**Evidência:**
```tsx
// SpeedPaintExportPanel.tsx:323
{t('speedPaint.exportButton')} {exporter.resolvedContainer.toUpperCase()}

// SpeedPaintExportPanel.tsx:423
{t('speedPaint.exportDownload')} {exporter.resolvedContainer.toUpperCase()}
```

Nenhum dos 3 locale files contém `exportButton` ou `exportDownload` na seção `speedPaint`.

**Impacto:** Botões de exportação exibem chaves cruas em vez de texto traduzido. Afeta todos os 3 idiomas.

**Recomendação:** Adicionar as chaves nos 3 locales:
- pt-BR: `exportButton: 'Exportar vídeo'`, `exportDownload: 'Baixar'`
- en: `exportButton: 'Export video'`, `exportDownload: 'Download'`
- es: `exportButton: 'Exportar vídeo'`, `exportDownload: 'Descargar'`

---

### 2. [HIGH] Duração e FPS divergentes entre preview e exportação

- **Arquivo:** `src/features/speed-paint/components/SpeedPaintExportPanel.tsx:144,181`
- **Confidence:** 100/100
- **Categoria:** Bug

**Problema:** O `SpeedPaintExportPanel` calcula `durationInFrames` e `fps` de forma diferente do `SpeedPaintPlayer`, resultando em vídeo exportado com duração e velocidade diferentes do preview.

| Parâmetro | Preview (Player) | Exportação (Panel) |
|---|---|---|
| `fps` | `DEFAULT_FPS = 30` (hardcoded) | `animation.fps = 60` (gerado pelo engine) |
| `durationInFrames` | `Math.round(animationDuration × 30) = 450` (15s) | `animation.totalFrames` (ex: 300 strokes) |
| Duração real | 15 segundos | `300 / 60 = 5` segundos |

O `StrokeAnimation` gerado por `imageProcessing.ts` sempre cria `fps: 60` e `totalFrames: strokes.length`. O preview usa `DEFAULT_FPS = 30` e duração configurável (default 15s = 450 frames). A exportação direta pelo panel ignora `animationDuration` e usa a duração/fps bruta da animação — produzindo um vídeo 3x mais curto e 2x mais rápido.

**Evidência:**
```tsx
// SpeedPaintPlayer.tsx:85
const durationInFrames = Math.max(1, Math.round(animationDuration * fps));
// fps = DEFAULT_FPS = 30

// SpeedPaintExportPanel.tsx:144
const resolvedFps = fpsProp ?? animation.fps; // = 60
// SpeedPaintExportPanel.tsx:181
durationInFrames: animation.totalFrames, // = strokes.length (ex: 300)
```

Nota: O fluxo de batch record em `SpeedPaintPage.tsx:154-163` está correto — passa `fps: FPS (30)` e `durationInFrames: Math.round(animationDuration × FPS)`. O bug é exclusivo do painel de exportação direta.

**Impacto:** Vídeo exportado pelo painel de UI terá duração incorreta (ex: 5s ao invés de 15s) e velocidade de reprodução diferente do preview visível ao usuário.

**Recomendação:** Trocar as linhas problemáticas para usar os mesmos valores do Player:
```tsx
// SpeedPaintExportPanel.tsx — trocar:
fps: resolvedFps,
durationInFrames: animation.totalFrames,

//por:
fps: DEFAULT_FPS,
durationInFrames: Math.round(animationDuration * DEFAULT_FPS),
```
E adicionar `DEFAULT_FPS` como constante compartilhada ou recebê-lo via prop.

---

### 3. [HIGH] Auto-play não faz seekTo(0) — quebra modo batch

- **Arquivo:** `src/features/speed-paint/components/SpeedPaintPlayer.tsx:100-117`
- **Confidence:** 92/100
- **Categoria:** Bug

**Problema:** O efeito de auto-play em `SpeedPaintPlayer` chama `player.play()` sem antes executar `player.seekTo(0)`. O Remotion Player **não** reinicia automaticamente para o frame 0 quando `play()` é chamado no último frame. O controle manual em `SpeedPaintPlayerControls` (linha 169) corretamente verifica `if (progress >= 1) { player.seekTo(0) }`, mas o auto-play não.

No fluxo de batch (watch/record), após completar uma animação e avançar para a próxima:
1. O job muda de `processing` → `completed`
2. O efeito de auto-play disporta `player.play()`
3. Mas o player permanece no último frame da animação anterior
4. A nova animação aparece "congelada" no frame final

**Evidência:**
```tsx
// SpeedPaintPlayer.tsx:104-113 — auto-play sem seekTo(0)
const timer = setTimeout(() => {
  try {
    const playerRef = ref as React.RefObject<PlayerRef | null>;
    if (playerRef.current) {
      playerRef.current.play(); // ← sem seekTo(0)
      logger.info('Auto-play disparado após conclusão do job');
    }
  } catch (err) { ... }
}, 300);

// SpeedPaintPlayerControls.tsx:168-173 — controle manual com seekTo(0)
if (progress >= 1) {
  player.seekTo(0); // ← correto
}
player.play();
```

**Impacto:** Segundas e subsequentes animações em modo batch (watch/record) não reproduzem — ficam congeladas no último frame da animação anterior.

**Recomendação:** Adicionar `seekTo(0)` antes de `play()`:
```tsx
if (playerRef.current) {
  playerRef.current.seekTo(0);
  playerRef.current.play();
}
```

---

### 4. [LOW] Strings hardcoded em português no SpeedPaintPhaseBadge

- **Arquivo:** `src/features/video-render/components/SpeedPaintScene.tsx:368-369`
- **Confidence:** 95/100
- **Categoria:** Bug (i18n)

**Problema:** O componente `SpeedPaintPhaseBadge` dentro de `SpeedPaintScene` (contexto Remotion) usa strings hardcoded em português:
```tsx
const label = isSketchPhase ? 'Desenhando...' : 'Colorindo...';
```

O componente `SpeedPaintPlayerControls` já exibe o rótulo de fase com i18n (`t('speedPaint.phaseSketching')` / `t('speedPaint.phaseRevealing')`), tornando este badge parcialmente redundante. O badge renderiza dentro do `<Composition>` do Remotion, onde hooks de i18n não estão disponíveis — logo, exibirá sempre em português independentemente do locale do usuário.

**Impacto:** Usuários em inglês e espanhol verão "Desenhando..." e "Colorindo..." no badge sobreposto ao vídeo. Funcionalidade não é prejudicada (o label i18n nos controles funciona), mas a experiência visual é inconsistente.

**Recomendação:** Remover o badge do componente Remotion (já que os controles i18n são suficientes), OU receber o label traduzido via prop do componente pai (que tem acesso ao hook `useLocale`):
```tsx
// Opção A: receber label como prop
interface SpeedPaintSceneProps {
  // ...adicionar:
  phaseLabelSketch?: string;
  phaseLabelReveal?: string;
}
```

---

### 5. [LOW] Mock morto para AnimationPlayer (deletado)

- **Arquivo:** `tests/pages/pages.component.test.tsx:137-139`
- **Confidence:** 100/100
- **Categoria:** Dead Code

**Problema:** O arquivo `AnimationPlayer.tsx` foi deletado na migração (Konva → Remotion), mas o mock persiste em `pages.component.test.tsx`:
```tsx
vi.mock('../../src/features/speed-paint/components/canvas/AnimationPlayer', () => ({
  AnimationPlayer: () => <div data-testid="animation-player">AnimationPlayer</div>,
}));
```

Nenhum código importa mais desse path, logo o mock é código morto.

**Impacto:** Sem impacto funcional. O mock é inócuo mas adiciona ruído ao test file. Nenhum teste falha por isso.

**Recomendação:** Remover as linhas 137-139 de `tests/pages/pages.component.test.tsx`.

---

## Veredito

**APPROVED_WITH_NOTES**

A migração Konva → Remotion está funcional (typecheck, lint e testes passam), mas contém **3 bugs HIGH** que afetam a experiência do usuário de forma visível:

1. **Botões de exportação com chaves cruas** (i18n faltando) — visível imediatamente ao abrir o painel de exportação
2. **Vídeo exportado com duração/velocidade incorretas** — exportação pelo painel produz vídeo significativamente diferente do preview
3. **Auto-play sem seekTo(0) quebra modo batch** — segundas animações não reproduzem

Os 3 bugs HIGH devem ser corrigidos antes de deploy. Os 2 findings LOW são cosméticos e podem ser tratados em follow-up.

### Resumo

| # | Severidade | Arquivo | Descrição |
|---|---|---|---|
| 1 | HIGH | SpeedPaintExportPanel.tsx:323,423 | Chaves i18n `exportButton` / `exportDownload` ausentes nos 3 locales |
| 2 | HIGH | SpeedPaintExportPanel.tsx:144,181 | Duração/fps da exportação diverge do preview (5s vs 15s, 60fps vs 30fps) |
| 3 | HIGH | SpeedPaintPlayer.tsx:104-113 | Auto-play sem seekTo(0) congela animações subsequentes em batch mode |
| 4 | LOW | SpeedPaintScene.tsx:368-369 | Badge de fase hardcoded em pt-BR dentro de contexto Remotion |
| 5 | LOW | pages.component.test.tsx:137-139 | Mock morto para AnimationPlayer (arquivo deletado) |