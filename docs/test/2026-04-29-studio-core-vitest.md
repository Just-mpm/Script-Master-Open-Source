# Relatorio de Testes — studio-core (imageTextLanguage)
**Data:** 2026-04-29
**Agent:** vitest-specialist
**Escopo:** Feature `imageTextLanguage` — novas funcoes `isValidLocale`, `getStoredImageTextLanguage`, campo `imageTextLanguage` no store Zustand, STORAGE_KEYS nova chave, `buildGenerateOptions` passando locale, `generateScenePrompts` propagando locale, locale files (pt-BR, en, es).

## Resumo

| Metrica | Valor |
|---|---|
| Testes criados | 42 |
| Testes executados | 42 |
| Passou | 42 |
| Falhou | 0 |
| Falsos positivos corrigidos | 9 |
| Testes removidos | 0 |
| Taxa de confiabilidade | 100% |

## Testes Criados

| Arquivo | Tipo | Status |
|---|---|---|
| `tests/studio/imageTextLanguage.unit.test.ts` | unit + integration | passou (42 testes) |

### Detalhamento por Secao

#### Secao 1: generateScenePrompts propaga locale (7 testes)
- `usa "portugues brasileiro" quando locale e pt-BR` — passou
- `usa "ingles" quando locale e en` — passou
- `usa "espanhol" quando locale e es` — passou
- `default e pt-BR quando locale nao informado` — passou
- `o prompt contem instrucao CRITICA sobre idioma dos textos nas imagens` — passou
- `o prompt com locale es instrui a manter texto em espanhol` — passou
- `retorna fallback com isFallback=true quando API falha` — passou

#### Secao 2: buildGenerateOptions propaga locale (5 testes)
- `mapeia imageTextLanguage para locale no resultado` — passou
- `locale padrao e pt-BR quando imageTextLanguage e pt-BR` — passou
- `locale e es quando imageTextLanguage e es` — passou
- `userId e propagado corretamente no resultado` — passou
- `state completo e espalhado no resultado junto com locale` — passou

#### Secao 3: localStorage helpers (16 testes)
- `STORAGE_KEYS.imageTextLanguage existe com valor "s2a_image_text_lang"` — passou
- `getStoredImageTextLanguage retorna pt-BR por padrao` — passou
- `retorna valor armazenado quando valido (en)` — passou
- `retorna valor armazenado quando valido (es)` — passou
- `retorna pt-BR para valor invalido no storage` — passou
- `retorna pt-BR quando localStorage lanca erro` — passou
- `retorna pt-BR para string vazia no storage` — passou
- `retorna pt-BR para string com espacos` — passou
- `retorna pt-BR para valor case-diferenciado "EN"` — passou
- `retorna pt-BR para variante "PT-BR" (maiusculas)` — passou
- `aceita exatamente os 3 locales validos` — passou
- `rejeita variante com underscore "pt_BR"` — passou
- `retorna pt-BR para valor numerico "123"` — passou
- `getInitialStudioConfig inclui imageTextLanguage com valor padrao pt-BR` — passou
- `getInitialStudioConfig le imageTextLanguage do localStorage quando valido` — passou
- `getInitialStudioConfig usa fallback pt-BR quando localStorage tem valor invalido` — passou

#### Secao 4: studioStore (11 testes)
- `imageTextLanguage padrao e pt-BR` — passou
- `setImageTextLanguage atualiza para en` — passou
- `setImageTextLanguage atualiza para es` — passou
- `setImageTextLanguage volta para pt-BR` — passou
- `imageTextLanguage e incluido no toDraftState` — passou
- `applySettings aceita imageTextLanguage no patch` — passou
- `persiste imageTextLanguage no localStorage ao chamar setImageTextLanguage` — passou
- `persiste imageTextLanguage "es" no localStorage` — passou
- `reset restaura imageTextLanguage para pt-BR` — passou
- `applySettings com imageTextLanguage undefined nao altera o campo` — passou
- `nao persiste quando imageTextLanguage nao muda (otimizacao do subscribe)` — passou

#### Secao 5: locale files (3 testes)
- `pt-BR tem a chave imageTextLanguage com label e 3 opcoes` — passou
- `en tem a chave imageTextLanguage com label e 3 opcoes` — passou
- `es tem a chave imageTextLanguage com label e 3 opcoes` — passou

## Bugs Reais Confirmados

Nenhum bug real detectado. Todos os testes passaram corretamente.

## Falsos Positivos Corrigidos

### FP-001: Mock de GoogleGenAI usava arrow function em vez de classe
- **Teste:** Secoes 1-2 (LOCALE_LANGUAGE_MAP e generateScenePrompts) — 6 testes
- **Problema:** O mock `vi.doMock('@google/genai', () => ({ GoogleGenAI: vi.fn(() => ({})) }))` usava arrow function para o construtor. O codigo de producao faz `new GoogleGenAI({...})` no module-scope (linha 10 de `gemini.ts`). Arrow functions nao sao construtores em JavaScript, gerando `TypeError: () => ({}) is not a constructor`.
- **Correcao:** Substituido por `class { models = { generateContent: mockGenerateContent } }` — classes anonimas sao construtiveis com `new`.

### FP-002: Acesso a locale files via dict.default (export inexistente)
- **Teste:** Secao 5 (locale files) — 3 testes
- **Problema:** Os testes acessavam `dict.default.studio` para ler os locale files, porem os arquivos usam named exports (`export const ptBR`, `export const en`, `export const es`) sem `export default`. O acesso retornava `undefined`, causando `TypeError: Cannot read properties of undefined (reading 'studio')`.
- **Correcao:** Alterado para desestruturar o named export correto: `const { ptBR } = await import(...)` / `const { en } = await import(...)` / `const { es } = await import(...)`.

## Testes Removidos

Nenhum teste removido.

## Suite Completa (pos-correcoes)

```
Test Files  12 passed (12)
     Tests  219 passed (219)
  Duration  27.51s
```

Baseline anterior: 177 testes. Novos testes adicionados: 42. Total: 219 (177 + 42).

## Conclusao

A feature `imageTextLanguage` esta implementada corretamente em todas as camadas: tipos (Locale em StudioDraftState e StudioSettingsPatch), helpers de localStorage (getStoredImageTextLanguage com validacao e fallback), store Zustand (setter, persistencia via subscribe, reset, applySettings), buildGenerateOptions (mapeamento imageTextLanguage -> locale), generateScenePrompts (propagacao no prompt do Gemini), e locale files (3 idiomas com labels corretos). Os 9 falsos positivos do arquivo de teste existente foram corrigidos — o mock de GoogleGenAI e o acesso aos locale files estavam incorretos. A suite agora tem 100% de confiabilidade com 42 testes permanentes.
