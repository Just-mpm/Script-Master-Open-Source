# Auditoria — Fix EncodingError no Remotion Player

**Data:** 2026-05-30
**Escopo:** 4 arquivos modificados + 1 novo para corrigir `EncodingError: The source image cannot be decoded`
**Agent:** code-validator
**Notebooks consultados:** Remotion Docs, Motion Guide

---

## Escopo da revisão

| Arquivo | Mudança |
|---------|---------|
| `src/features/video-render/lib/speedPaintRenderer.ts` | `loadImageElement()` agora chama `img.decode()` após `onload` |
| `src/lib/validateImage.ts` | **NOVO** — helper `validateImageIsDecodable()` |
| `src/hooks/useAudioGenerator.ts` | Import + validação de imagem antes de adicionar às cenas |
| `src/components/VideoPreview.tsx` | Import de `preloadImage` do `@remotion/preload` + useEffect para pré-carregar |
| `src/pages/VideoPage.tsx` | `animateScenes` alterado de `true` para `false` |

**Focos cobertos:** tipagem, imports, race conditions, memory leaks, edge cases, SOLID/Clean Code, compatibilidade de versões, integração com cancelamento existente.

---

## Veredito

**Ajustes recomendados** — 2 warnings, 3 sugestões. Nenhum bloqueador de merge, mas 2 problemas que podem causar comportamento indesejado em produção.

---

## Achados priorizados

### [WARNING] `validateImageIsDecodable` sem timeout — Promise pode ficar pendente indefinidamente

- **Arquivo:** `src/lib/validateImage.ts:17-29`
- **Confidence:** 95/100
- **Categoria:** Bug
- **Problema:** Se a URL da imagem não responder (rede instável, URL morta, CORS bloqueado sem disparar `onerror`), a Promise nunca resolve nem rejeita. O loop de geração de cenas em `useAudioGenerator` fica preso indefinidamente.
- **Evidência:**
  ```typescript
  export function validateImageIsDecodable(src: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        img.decode().then(() => resolve(true)).catch(() => resolve(false));
      };
      img.onerror = () => resolve(false);
      img.src = src;
      // ← Sem timeout. Se nada disparar, Promise fica pendente para sempre.
    });
  }
  ```
- **Impacto:** Em produção, se uma imagem gerada pelo Gemini tiver URL que expira ou se a rede cair durante a validação, toda a pipeline de cenas trava. O usuário fica preso em "Pintando cena X de Y..." sem timeout e sem forma de cancelar (o `cancelRef` só é verificado após a validação).
- **Sugestão:** Adicionar um timeout (ex: 15s):
  ```typescript
  export function validateImageIsDecodable(src: string, timeoutMs = 15_000): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const timer = setTimeout(() => resolve(false), timeoutMs);
      img.onload = () => {
        img.decode()
          .then(() => { clearTimeout(timer); resolve(true); })
          .catch(() => { clearTimeout(timer); resolve(false); });
      };
      img.onerror = () => { clearTimeout(timer); resolve(false); };
      img.src = src;
    });
  }
  ```

---

### [WARNING] Versões desalinhadas do `@remotion/preload` vs pacotes Remotion

- **Arquivo:** `package.json:42`
- **Confidence:** 90/100
- **Categoria:** Architecture
- **Problema:** `@remotion/preload` está em `^4.0.469` enquanto todos os outros pacotes Remotion (`player`, `transitions`, `captions`, `media`, `media-utils`, `web-renderer`, `whisper-web`) estão fixos em `4.0.448`. A 21 versões de diferença pode causar incompatibilidades internas se `@remotion/preload` depender de APIs que mudaram entre 448 e 469.
- **Evidência:**
  ```json
  "@remotion/captions": "4.0.448",
  "@remotion/media": "4.0.448",
  "@remotion/media-utils": "4.0.448",
  "@remotion/player": "4.0.448",
  "@remotion/preload": "^4.0.469",   // ← desalinhado
  "@remotion/transitions": "4.0.448",
  "@remotion/web-renderer": "4.0.448",
  "@remotion/whisper-web": "4.0.448",
  ```
- **Impacto:** Pode funcionar hoje, mas futuras atualizações do bun/npm podem resolver versões incompatíveis. O `^` permite qualquer `4.x`, potencialmente indo muito além do 469.
- **Sugestão:** Fixar na mesma versão base ou usar `4.0.469` para todos:
  ```json
  "@remotion/preload": "4.0.469"
  ```
  Ou melhor: alinhar todos para `4.0.469` se quiser aproveitar a versão mais recente.

---

### [SUGGESTION] `animateScenes={false}` no VideoPage desabilita speed paint no preview

- **Arquivo:** `src/pages/VideoPage.tsx:293`
- **Confidence:** 92/100
- **Categoria:** UX
- **Problema:** A mudança de `animateScenes={true}` para `animateScenes={false}` desabilita completamente o efeito de speed paint no preview da página de vídeo. Isso funciona como workaround para o EncodingError, mas elimina uma feature inteira do preview. O correto seria confiar no fix de `img.decode()` no `loadImageElement`.
- **Evidência:**
  ```tsx
  // Antes:
  animateScenes={true}
  // Depois:
  animateScenes={false}
  ```
- **Impacto:** Usuários não veem o efeito de speed paint no preview da página `/app/video`. A funcionalidade de preview do speed paint fica inacessível.
- **Sugestão:** Reverter para `animateScenes={true}` e confiar no fix de `img.decode()` + `preloadImage` que já foram implementados. Se o EncodingError persistir em casos extremos, o `VideoPlayerErrorBoundary` já captura o erro e exibe fallback amigável.

---

### [SUGGESTION] `crossOrigin = 'anonymous'` desnecessário para data URLs

- **Arquivo:** `src/lib/validateImage.ts:20`, `src/features/video-render/lib/speedPaintRenderer.ts:224`
- **Confidence:** 85/100
- **Categoria:** Code Quality
- **Problema:** Ambas as funções setam `crossOrigin = 'anonymous'` em todas as imagens, incluindo data URLs. Data URLs não têm origem cross-origin — o atributo é ignorado pelo navegador. Não causa erro, mas é código morto que pode confundir.
- **Evidência:**
  ```typescript
  // validateImage.ts
  const img = new Image();
  img.crossOrigin = 'anonymous';  // ← desnecessário para data:image/...

  // speedPaintRenderer.ts
  const img = new Image();
  img.crossOrigin = 'anonymous';  // ← idem
  ```
- **Impacto:** Zero impacto funcional. É uma questão de clareza — um leitor pode se perguntar "por que crossOrigin em data URL?".
- **Sugestão:** Documentar com comentário inline ou condicionar:
  ```typescript
  if (!src.startsWith('data:')) {
    img.crossOrigin = 'anonymous';
  }
  ```

---

### [SUGGESTION] Testes do `loadImageElement` não cobrem falha de `decode()`

- **Arquivo:** `tests/video-render/speedPaintRenderer.unit.test.ts:728-772`
- **Confidence:** 88/100
- **Categoria:** Test Coverage
- **Problema:** O mock de `Image` no teste tem `async decode() {}` que nunca falha. Não existe teste para o cenário onde `onload` dispara mas `decode()` rejeita (a causa original do EncodingError).
- **Evidência:**
  ```typescript
  vi.stubGlobal('Image', class MockImage {
    // ...
    async decode() {
      // Mock necessário pois loadImageElement chama img.decode() após onload
      // ← Sem cenário de falha
    }
  });
  ```
- **Impacto:** Se alguém remover o `img.decode()` por engano, nenteste vai capturar a regressão.
- **Sugestão:** Adicionar teste para falha de `decode()`:
  ```typescript
  it('rejeita quando decode() falha', async () => {
    vi.stubGlobal('Image', class MockImage {
      src = '';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      async decode() { throw new Error('EncodingError'); }
    });
    const promise = loadImageElement('data:image/png;base64,test');
    imageInstances[0].onload?.();
    await expect(promise).rejects.toThrow('Falha ao decodificar imagem:');
  });
  ```

---

## O que parece saudável

- **`img.decode()` no `loadImageElement`** — padrão correto confirmado pelo NotebookLM: async onload com try/catch + reject no outer Promise.
- **`preloadImage` no useEffect** — uso correto da API `@remotion/preload`. Cancel functions são retornadas e usadas no cleanup do effect. `enhancedScenes` é referencialmente estável (vem de `useState` no `useSpeedPaintEnhancer`), então não causa re-preloads excessivos.
- **`validateImageIsDecodable` como módulo separado** — boa separação de responsabilidades. Helper reutilizável.
- **Validação em `useAudioGenerator` antes de adicionar cenas** — previne imagens corrompidas de entrarem no pipeline. O `.catch(() => false)` garante que falhas de validação não quebrem a geração.
- **Testes existentes atualizados** — o mock de `Image` no teste de `loadImageElement` já inclui `async decode() {}`, alinhado com a mudança.
- **`VideoPlayerErrorBoundary`** — já existente, captura erros de renderização do Player e exibe fallback amigável.

---

## Limites da revisão

- Não foi possível testar runtime — a análise é puramente estática.
- O comportamento de `img.decode()` com data URLs específicas do Gemini não foi validado em navegador real.
- A compatibilidade entre `@remotion/preload@4.0.469` e `@remotion/player@4.0.448` não foi testada — assume-se compatibilidade semântica.
- Não foram lidos todos os 829 linhas do `useAudioGenerator.ts` no contexto de cancelamento — apenas a seção relevante (linhas 580-625).

---

## Próximos passos

1. **Adicionar timeout em `validateImageIsDecodable`** (recomendado: 15s) — previne travamento da pipeline.
2. **Alinhar versão de `@remotion/preload`** — fixar em `4.0.469` ou alinhar todos para a mesma versão.
3. **Reverter `animateScenes={false}`** em `VideoPage.tsx` — confiar no fix de `decode()`.
4. **Adicionar teste de falha de `decode()`** no teste existente de `loadImageElement`.
