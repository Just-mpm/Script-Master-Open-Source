# Relatório de Testes — Speed Paint no Vídeo
**Data:** 2026-04-25
**Agent:** vitest-specialist
**Escopo:** Novas funcionalidades de SpeedPaintMultipliers, renderer com speed separado, propagação de props, SpeedPaintControls no VideoExportPanel, e repasse de speedPaintMultipliers no useVideoExporter.

## Resumo

| Métrica | Valor |
|---|---|
| Testes criados | 30 |
| Testes executados | 1185 (total da suite) |
| Passou | 1185 |
| Falhou | 0 |
| Falsos positivos corrigidos | 1 |
| Testes removidos | 0 |
| Taxa de confiabilidade | 100% |

## Testes Criados

| Arquivo | Tipo | Novos | Status |
|---|---|---|---|
| `tests/video-render/types.unit.test.ts` | unit | 11 | passou |
| `tests/video-render/speedPaintRenderer.unit.test.ts` | unit | 8 | passou |
| `tests/video-render/videoComposition.component.test.tsx` | component | 3 | passou |
| `tests/video-render/useVideoExporter-speedpaint.unit.test.tsx` | unit | 3 | passou |
| `tests/video-render/VideoExportPanel.unit.test.tsx` | component | 5 | passou |

## Detalhes por Arquivo

### `tests/video-render/types.unit.test.ts` (+11 testes)

- **SpeedPaintMultipliers** (4 testes): valores customizados, limite mínimo (0.25), limite máximo (4.0), multiplicadores assimétricos
- **DEFAULT_SPEED_PAINT_MULTIPLIERS** (3 testes): sketch/reveal = 1.0, Readonly no tipo, satisfaz SpeedPaintMultipliers
- **VideoCompositionProps** (3 testes): speedPaintMultipliers opcional, fornecido, e combinação com isExporting/speedPaintSpeed

### `tests/video-render/speedPaintRenderer.unit.test.ts` (+8 testes)

- **Sketch rápido** `{ sketch: 2.0, reveal: 1.0 }`: sketchProgress = (0.25 / 0.5) * 2.0 = 1.0 → todos os sketch visíveis mais cedo
- **Reveal rápido** `{ sketch: 1.0, reveal: 2.0 }`: revealProgress = ((0.75-0.5)/0.5) * 2.0 = 1.0 → todos os reveal visíveis
- **Backward compat**: `number` como speedMultiplier usa branch original
- **undefined**: branch else (progresso normal)
- **Edge cases**: progress 0 → 0 strokes, progress 1 → todos os strokes
- **Fallback**: quando sketchCount === 0, usa média dos multiplicadores

### `tests/video-render/videoComposition.component.test.tsx` (+3 testes)

- **isExporting=true**: SpeedPaintScene recebe isExporting, drawSpeed=2.0, paintSpeed=0.5
- **isExporting=false**: SpeedPaintScene recebe isExporting=false, drawSpeed=1.5, paintSpeed=1.0
- **speedPaintSpeed sem multipliers**: drawSpeed/paintSpeed vazios (usando speedMultiplier global)

### `tests/video-render/useVideoExporter-speedpaint.unit.test.tsx` (+3 testes)

- **speedPaintMultipliers repassado**: inputProps.speedPaintMultipliers === { sketch: 2.0, reveal: 0.5 }
- **speedPaintMultipliers omitido**: inputProps.speedPaintMultipliers === undefined
- **speedPaintSpeed repassado**: inputProps.speedPaintSpeed === 'fast'

### `tests/video-render/VideoExportPanel.unit.test.tsx` (+5 testes)

- **SpeedPaintControls não renderizado** quando toggle desligado
- **SpeedPaintControls renderizado** quando toggle ativado
- **DEFAULT_SPEED_PAINT_MULTIPLIERS** iniciais (sketch=1, reveal=1)
- **Slider sketch** atualiza multiplier para { sketch: 2.0, reveal: 1.0 }
- **Slider reveal** atualiza multiplier para { sketch: 1.0, reveal: 3.0 }
- **handleStartExport** passa speedPaintMultipliers atualizados
- **Esconde SpeedPaintControls** durante renderização

## Falsos Positivos Corrigidos

### FP-001: Object.isFrozen(DEFAULT_SPEED_PAINT_MULTIPLIERS)
- **Teste:** `tests/video-render/types.unit.test.ts`
- **Problema:** `as const` cria tipo `Readonly<T>` no TypeScript, mas NÃO congela o objeto em runtime. `Object.isFrozen()` retorna false para objetos não congelados.
- **Correção:** Teste alterado para verificar `Readonly<SpeedPaintMultipliers>` como tipo (garantia de compilação, não de runtime).

## Bugs Reais Confirmados

Nenhum bug encontrado.

## Testes Removidos

Nenhum teste removido.

## Conclusão

Todas as 30 novas funcionalidades do Speed Paint no vídeo estão cobertas por testes. A propagação de `speedPaintMultipliers` funciona corretamente em toda a cadeia: VideoExportPanel → useVideoExporter → renderMediaOnWeb → VideoComposition → SpeedPaintScene → renderSpeedPaintFrame. O renderer suporta `number` (backward compat) e `SpeedPaintMultipliers` (speed separado) sem regressão. Suite total: 1185 testes passando (100%).
