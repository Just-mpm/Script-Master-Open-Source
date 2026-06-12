# Auditoria: ImageUpload.tsx

**Data:** 2026-06-12
**Arquivo:** `src/features/speed-paint/components/upload/ImageUpload.tsx`
**Tipo:** Componente de upload (Speed Paint)
**Versão relacionada:** `0.130.2`

---

## Escopo da revisão

- Cobertura: O arquivo completo foi lido (142 linhas), incluindo imports, lógica, JSX e dependências diretas (store, types, tokens, i18n)
- Focos: Engenharia/lógica, react-dropzone, TypeScript, ESLint, segurança básica
- Dependências verificadas: `animationStore`, `types.ts` (QueuedImage), `theme/tokens.ts`, `features/i18n` (barrel + contexto), ESLint config, teste existente

---

## Veredito

**Ajustes recomendados** — Uma correção de gravidade média é necessária na lógica de processamento batch. A correção do bug de upload (alvo desta alteração) está correta.

---

## Achados priorizados

### [WARNING] Erro não tratado no FileReader cancela todo o lote silenciosamente

- **Arquivo:** `src/features/speed-paint/components/upload/ImageUpload.tsx:29-35`
- **Confidence:** 95/100
- **Categoria:** Bug
- **Problema:** O loop `for...of` com `await` lança exceção se QUALQUER arquivo falhar na leitura, abortando todo o batch sem adicionar nada à fila e sem feedback de erro para o usuário.

**Evidência:**

```tsx
const onDrop = useCallback(async (acceptedFiles: File[]) => {
  // ...
  for (const file of acceptedFiles) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;  // ← se rejeitar, o for lança
      reader.readAsDataURL(file);
    });
    newQueue.push({ ... });
  }
  // ↓ NUNCA executa se um FileReader rejeitar
  if (newQueue.length > 0) { setQueue(...); }
}, [setQueue, setCurrentIndex, setBatchMode]);
```

- **Impacto:** Em cenário de upload de múltiplas imagens:
  1. Arquivos já lidos com sucesso são descartados
  2. Arquivos restantes nunca são processados
  3. Nenhum erro/notificação aparece → usuário fica confuso sobre por que as imagens não apareceram
  4. Possíveis causas: corrupção de arquivo, exceção de segurança do navegador, limite de memória, interrupção do usuário

- **Sugestão:** Envolver o loop em try/catch, processar cada arquivo individualmente com fallback, ou usar `.catch()` por promise:

```tsx
for (const file of acceptedFiles) {
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') resolve(result);
        else reject(new Error('Tipo inesperado do FileReader'));
      };
      reader.onerror = () => reject(new Error(`Falha ao ler ${file.name}`));
      reader.readAsDataURL(file);
    });
    newQueue.push({ ... });
  } catch (err) {
    console.warn(`Imagem ignorada: ${file.name}`, err);
    // Opcional: notificar usuário com toast
  }
}
```

---

### [SUGGESTION] Type assertion insegura no resultado do FileReader

- **Arquivo:** `src/features/speed-paint/components/upload/ImageUpload.tsx:32`
- **Confidence:** 85/100
- **Categoria:** TypeScript
- **Problema:** `e.target?.result as string` é uma asserção de tipo que silencia o `string | ArrayBuffer | null` do tipo nativo. `readAsDataURL` sempre produz string, mas se houver um cenário inesperado (ex: fallback de browser antigo ou extensão que intercepte o FileReader), o valor `ArrayBuffer` seria tratado como string sem conversão.

**Evidência:**

```tsx
reader.onload = (e) => resolve(e.target?.result as string);
```

- **Impacto:** Baixo — cenário improvável com `readAsDataURL`. Se ocorresse, produziria uma data URL inválida (renderizando `[object ArrayBuffer]` como string).

- **Sugestão:** Substituir por type guard com runtime check:

```tsx
reader.onload = (e) => {
  const result = e.target?.result;
  if (typeof result === 'string') resolve(result);
  else reject(new Error('Resultado inesperado do FileReader'));
};
```

---

### [SUGGESTION] Mock do teste não expõe `open` — gap de cobertura

- **Arquivo:** `tests/speed-paint/ImageUpload.component.test.tsx:25-37`
- **Confidence:** 90/100
- **Categoria:** Architecture
- **Problema:** O mock do `react-dropzone` no teste não retorna a função `open`, que o componente usa tanto no `onClick` do root Box quanto no `onClick` do Button com `stopPropagation`. Embora os testes atuais não cliquem no botão (testam apenas o `onDrop` via captura), qualquer teste futuro de interação de click quebrará silenciosamente ou com `TypeError: open is not a function`.

**Evidência:**

```tsx
// Mock atual — sem `open`
vi.mock('react-dropzone', () => ({
  useDropzone: ({ onDrop }) => {
    capturedOnDrop = onDrop;
    return {
      getRootProps: () => ({ 'data-testid': 'dropzone-root', onClick: () => {} }),
      getInputProps: () => ({ 'data-testid': 'dropzone-input' }),
      isDragActive: false,
      // ❌ open não está aqui
    };
  },
}));
```

- **Impacto:** Este gap impede testes de click no botão "Escolher arquivos" e no clique da área de drop. A correção do bug (noClick + open) não tem cobertura de teste para o fluxo manual.

- **Sugestão:** Adicionar `open: vi.fn()` ao retorno do mock para viabilizar testes de clique.

---

## O que parece saudável

- ✅ **react-dropzone correto:** `noClick: true` + `noKeyboard: true` + `open()` manual no Box via `getRootProps({ onClick: open })` e no Button via `onClick={(e) => { e.stopPropagation(); open(); }}` é o padrão recomendado quando se usa um botão interno. O `<input>` oculto está fora de qualquer `<label>`, eliminando o conflito com `component="label"`.
- ✅ **Import paths válidos:** Todos os 4 imports relativos resolvem para arquivos existentes (`../../store/animationStore`, `../../types`, `../../../../theme/tokens`, `../../../../features/i18n`).
- ✅ **Chaves i18n existentes:** `speedPaint.uploadDragActive`, `speedPaint.uploadPrompt`, `speedPaint.uploadDescription`, `speedPaint.chooseFiles` existem nos 3 dicionários (pt-BR, en, es).
- ✅ **ESLint:** Nenhuma violação de regras ativas (`@typescript-eslint/no-explicit-any`, `no-restricted-imports`). Sem barrel imports do MUI.
- ✅ **TypeScript:** `bun run typecheck` passa sem erros.
- ✅ **Store selectors otimizados:** 3 seletores individuais com `useAnimationStore((s) => s.setXxx)` — sem re-renders desnecessários.

---

## Limites da revisão

- A auditoria é estática — não foi possível testar o comportamento real de click do react-dropzone + noClick + open em runtime. A correção foi validada por análise de código contra a API documentada do react-dropzone.
- Não foi verificado se o `open()` pode ser chamado antes do componente estar montado ou se há race condition entre `noClick: true` e o `onClick` manual.
- O impacto real da falta de try/catch no FileReader depende de quão comum é a falha de leitura de arquivos de imagem no público-alvo. O risco existe e é real, mas a frequência é incerta.

---

## Confirmação do Gate de Saída

- [x] Li o contexto mínimo real (arquivo completo + 9 dependências diretas verificadas)
- [x] Cada achado passou pela validação anti-falso-positivo
- [x] Cada achado passou pelo confidence gate numérico
- [x] Achados com confidence < 80 foram descartados (ex: ID generation with Math.random — colisão improvável, baixo impacto)
- [x] Relatório consolidado, priorizado e salvo em `docs/audits/`
- [x] Nenhum motivo para escalar
