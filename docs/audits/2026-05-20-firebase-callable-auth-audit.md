# Auditoria

## Escopo

Auditoria de enforcement de autenticação nas Cloud Functions callable/Genkit do repositório, usando `functions/src/genkit/utils/callable-auth.ts` como baseline.

Arquivos auditados:
- `functions/src/genkit/utils/callable-auth.ts`
- `functions/src/flows/*.ts`
- `functions/src/index.ts`

## Focos cobertos

- Presença de `authPolicy: isSignedIn()` nos flows `onCallGenkit`
- Presença de validação server-side com `getCallableUidOrThrow(flowContext)`
- Endpoints expostos em `functions/src/index.ts`
- Exceções públicas intencionais vs. endpoints permissivos por engano

## Achados

Nenhum achado de endpoint callable/Genkit atualmente permissivo.

| Prioridade | Foco | Local | Problema | Sugestão |
|------------|------|-------|----------|----------|
| — | — | — | Não encontrei flow `onCallGenkit` sem `authPolicy: isSignedIn()` nem sem `getCallableUidOrThrow(flowContext)`. | Manter o padrão como obrigatório para novos flows. |

## O que parece saudável

- O baseline novo está centralizado em `functions/src/genkit/utils/callable-auth.ts`.
- Todos os flows exportados em `functions/src/flows/` seguem a dupla proteção:
  - `authPolicy: isSignedIn()`
  - `getCallableUidOrThrow(flowContext)`
- Os flows auditados e já endurecidos são:
  - `assistant`
  - `audio`
  - `audioPreflight`
  - `cancelAiRequest`
  - `chunking`
  - `creditSnapshot`
  - `feedback`
  - `images`
  - `inlineAssistant`
  - `ping`
  - `scenePrompts`
- Todos esses flows também exigem `enforceAppCheck: true`, o que adiciona uma segunda barreira contra abuso fora do app oficial.
- Em `functions/src/index.ts`, as rotas `/checkout` e `/portal` não são callable, mas validam o ID token manualmente com `verifyIdToken(...)`.
- A rota `/webhook` é pública por design, mas compensa isso validando a assinatura do Stripe antes de processar o evento.

## Limites da auditoria

- Auditoria estática por leitura de código; não executei chamadas reais contra os endpoints.
- O `analyze` detectou apenas a function `onRequest` exportada em `index.ts`, então o inventário dos flows Genkit foi confirmado manualmente por leitura de `functions/src/flows/`.
- A análise foi focada em enforcement de autenticação, não em autorização fina por role/claim.

## Próximos passos

- Encerrar, se o objetivo era só diagnóstico.
- Como melhoria preventiva, considerar um checklist de PR exigindo:
  - `authPolicy: isSignedIn()`
  - `getCallableUidOrThrow(flowContext)`
  - `enforceAppCheck: true`
- Como risco residual, vale revisar no futuro se faz sentido separar `/webhook` de `/checkout` e `/portal` em functions distintas para reduzir chance de rota pública nova herdar o mesmo `onRequest` sem guard explícito.
