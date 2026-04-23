# Autenticação

> Baseado nos arquivos: `src/contexts/AuthContext.tsx`, `src/components/ProtectedRoute.tsx`, `src/pages/LoginPage.tsx`, `src/lib/firebase.ts`, `src/main.tsx`, `src/App.tsx`
>
> **Único provider:** Firebase Auth — login exclusivo via Google popup. Sem email/senha, sem links mágicos.

## 1. Arquitetura

A autenticação é gerenciada por um Context + Provider pattern com 3 camadas:

```
main.tsx
  └─ AuthProvider (envolve toda a app)
       └─ onAuthStateChanged (Firebase listener — sessão persistente)
            └─ useAuth() — hook consumido por 9 componentes
```

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/firebase.ts` | Inicializa `auth`, `GoogleAuthProvider`, re-exporta funções de auth |
| `src/contexts/AuthContext.tsx` | Provider, estado (`user`, `loading`, `authError`), `login()`, `logout()` |
| `src/components/ProtectedRoute.tsx` | Guarda de rotas — redireciona `/login` se sem sessão |
| `src/pages/LoginPage.tsx` | UI de login — botão Google + spinner de verificação |

### Hierarquia de Providers (main.tsx)

```tsx
<BrowserRouter>
  <ErrorBoundary>
    <AuthProvider>       {/* 1º — sessão disponível para toda a app */}
      <AudioProvider>    {/* 2º */}
        <App />
      </AudioProvider>
    </AuthProvider>
  </ErrorBoundary>
</BrowserRouter>
```

## 2. Tipos

### AuthContextType

Definido internamente em `AuthContext.tsx` — **não exportado**. Acessado via `useAuth()`:

```typescript
interface AuthContextType {
  user: User | null;          // Firebase User (null = deslogado)
  loading: boolean;           // true enquanto onAuthStateChanged verifica sessão
  authError: string | null;   // mensagem de erro traduzida (pt-BR)
  clearAuthError: () => void; // limpa authError manualmente
  login: () => Promise<void>; // dispara signInWithPopup
  logout: () => Promise<void>;// dispara signOut
}
```

### User (Firebase)

Tipo re-exportado de `firebase/auth` em `src/lib/firebase.ts`. Não é estendido — o projeto usa `user.uid`, `user.email`, `user.displayName`, `user.photoURL` diretamente.

## 3. Fluxo de Login

```
Usuário clica "Entrar com Google"
  → login() seta wasLoginRequested = true
  → signInWithPopup(auth, googleProvider)
  → onAuthStateChanged dispara com o User
  → Detecta login ativo (wasLoginRequested === true)
  → window.location.href = '/estudio'  (full reload para ativar COEP)
```

**Por que full reload?** Firebase Auth precisa de iframes cross-origin, que COEP bloqueia. Após o login (via popup), a página recarrega na rota `/estudio` para obter os headers COOP/COEP do servidor.

## 4. Fluxo de Logout

```
Usuário clica logout (Header)
  → logout() chama signOut(auth)
  → window.location.href = '/login'  (full reload para limpar COEP)
```

Mesma lógica do login: reload necessário para que `/login` seja servida **sem** COEP, permitindo o próximo popup de autenticação.

## 5. Verificação de Sessão

`onAuthStateChanged` roda automaticamente ao montar o `AuthProvider`:

1. **Estado inicial:** `loading = true`, `user = null`
2. Firebase verifica sessão persistente (cookie/IndexedDB)
3. Se sessão existe: `user = firebaseUser`, `loading = false`
4. Se não existe: `user = null`, `loading = false`

A flag `lastCheckedUserId` (ref) evita re-verificação de migração quando o callback dispara múltiplas vezes com o mesmo usuário.

## 6. ProtectedRoute

Componente de rota guard do `react-router-dom` usando `<Outlet />`:

```tsx
function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) return <CircularProgress />;     // aguardando Firebase
  if (!user) return <Navigate to="/login" />;   // redireciona
  return <Outlet />;                            // renderiza rota filha
}
```

### Rotas Protegidas (App.tsx)

| Rota | Componente |
|---|---|
| `/estudio` | StudioPage |
| `/video` | VideoPage |
| `/image` | ImageStudio |
| `/assistant` | AssistantPage |
| `/library` | LibraryPage |
| `/speed-paint` | SpeedPaintPage |

**Rotas públicas:** `/login` e `*` (404). A rota `/` redireciona para `/estudio`.

## 7. Tratamento de Erros

Mensagens traduzidas definidas em `AUTH_ERROR_MESSAGES` (AuthContext.tsx):

| Código Firebase | Mensagem |
|---|---|
| `auth/popup-closed-by-user` | Popup fechado pelo usuario. Tente novamente. |
| `auth/cancelled-popup-request` | Login cancelado. |
| `auth/popup-blocked` | Popup bloqueado pelo navegador. Permita popups para este site. |
| `auth/network-request-failed` | Erro de conexao. Verifique sua internet. |
| `auth/too-many-requests` | Muitas tentativas. Aguarde um momento. |
| *outros* | Erro ao fazer login. Tente novamente. |

Erros são exibidos via `Alert` na `LoginPage` e no `ErrorToast` global (App.tsx prioriza `authError` sobre erros de studio).

## 8. Migração de Dados

Quando um usuário faz login (transição `null → user`), o `AuthProvider` verifica se há migração pendente via `isMigrationAlreadyHandled(uid)`. Se necessário, exibe `DataMigrationDialog`.

## 9. COEP e Autenticação

Headers COOP/COEP (necessários para `SharedArrayBuffer` — Whisper WASM e Remotion) **bloqueiam iframes cross-origin**, que o Firebase Auth usa para popups.

| Rota | COEP | Motivo |
|---|---|---|
| `/login` | **NÃO** | Permite popup do Firebase Auth |
| Demais rotas | Sim | Habilita SharedArrayBuffer |

- **Dev:** `coepPlugin()` em `vite.config.ts` aplica via middleware (exceção `/login`)
- **Produção:** headers configurados em `firebase.json`

Login e logout fazem `window.location.href` (full reload) para alternar entre modo com e sem COEP.

## 10. Consumidores de useAuth()

9 componentes consomem o hook:

| Componente | Propriedades usadas |
|---|---|
| `Header.tsx` | `user`, `loading`, `logout` |
| `App.tsx` | `authError`, `clearAuthError` |
| `LoginPage.tsx` | `login`, `authError`, `loading` |
| `ImageStudio.tsx` | `user` |
| `Library.tsx` | `user` |
| `VideoLibrary.tsx` | `user` |
| `Assistant.tsx` | `user` |
| `useStudioState.ts` | `user` |
| `useAssistant.ts` | `user` |

## 11. Referência Rápida

| Símbolo | Arquivo | Tipo |
|---|---|---|
| `AuthProvider` | `src/contexts/AuthContext.tsx` | Component |
| `useAuth()` | `src/contexts/AuthContext.tsx` | Hook |
| `ProtectedRoute` | `src/components/ProtectedRoute.tsx` | Component |
| `LoginPage` | `src/pages/LoginPage.tsx` | Component |
| `auth` | `src/lib/firebase.ts` | Firebase Auth instance |
| `googleProvider` | `src/lib/firebase.ts` | GoogleAuthProvider |
| `saveUserSettings()` | `src/lib/db/user-settings.ts` | Função |
| `getUserSettings()` | `src/lib/db/user-settings.ts` | Função |
