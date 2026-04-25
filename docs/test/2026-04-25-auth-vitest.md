# Relatório de Testes — Autenticação Email/Senha
**Data:** 2026-04-25
**Agent:** vitest-specialist
**Escopo:** Testes para a funcionalidade de autenticação email/senha (signup, loginWithEmail, resetPassword, RegisterPage, LoginPage atualizada)

## Resumo

| Métrica | Valor |
|---|---|
| Testes criados | 68 |
| Testes executados | 1040 |
| Passou | 1040 |
| Falhou | 0 |
| Falsos positivos corrigidos | 2 |
| Testes removidos | 0 |
| Taxa de confiabilidade | 100% |

## Testes Criados/Modificados

| Arquivo | Tipo | Status | Novos |
|---|---|---|---|
| `tests/contexts/AuthContext.unit.test.tsx` | unit | passou | 15 |
| `tests/pages/RegisterPage.component.test.tsx` | component | passou | 19 (novo arquivo) |
| `tests/pages/LoginPage.component.test.tsx` | component | passou | 22 (novo arquivo) |
| `tests/pages/pages.component.test.tsx` | integration | passou | 4 |
| `tests/components/Library.component.test.tsx` | component | passou | 0 (mock atualizado) |

## Detalhes por Arquivo

### AuthContext.unit.test.tsx (15 testes novos)
- `signup` chama `createUserWithEmailAndPassword` com email e senha corretos
- `signup` seta `wasLoginRequested` e dispara COEP reload em sucesso
- `signup` com erro `email-already-in-use` retorna "Este email ja esta cadastrado."
- `signup` com erro `weak-password` retorna "A senha deve ter pelo menos 6 caracteres."
- `signup` com erro `invalid-email` retorna "Email invalido."
- `loginWithEmail` chama `signInWithEmailAndPassword` com email e senha corretos
- `loginWithEmail` seta `wasLoginRequested` e dispara COEP reload em sucesso
- `loginWithEmail` com erro `user-not-found` retorna "Nenhuma conta encontrada com este email."
- `loginWithEmail` com erro `wrong-password` retorna "Senha incorreta."
- `loginWithEmail` com erro `invalid-credential` retorna "Email ou senha incorretos."
- `loginWithEmail` com erro `invalid-email` retorna "Email invalido."
- `resetPassword` chama `sendPasswordResetEmail` com email correto
- `resetPassword` com erro seta `authError` com mensagem pt-BR e re-lança o erro
- `resetPassword` NÃO causa COEP reload (não seta `wasLoginRequested`)
- `login` (Google) continua funcionando como regressão
- `clearAuthError` limpa o estado de erro

### RegisterPage.component.test.tsx (19 testes — novo arquivo)
- Renderiza sem crash com título "Criar conta" e botão "Cadastrar com Google"
- Renderiza PublicHeader e PublicFooter
- Renderiza os 3 campos: email, senha, confirmar senha
- Exibe botão "Cadastrar com Google"
- Exibe link "Faça login"
- Exibe os 4 benefícios
- Exibe helper text "Pelo menos 6 caracteres"
- Exibe loading quando auth está carregando
- Validação: email inválido mostra erro
- Validação: senha <6 chars mostra erro
- Validação: senhas diferentes mostra erro
- Validação: confirmar senha vazio mostra erro
- Submit chama `signup` com dados corretos
- Chama `clearAuthError` antes de submeter
- Chama `login` ao clicar "Cadastrar com Google"
- Exibe Alert de erro quando `authError` está definido
- Redireciona para `/app/estudio` quando usuário já autenticado
- Exibe link skip-to-content para acessibilidade

### LoginPage.component.test.tsx (22 testes — novo arquivo)
- Renderiza sem crash com "Script Master" e "Entrar com Google"
- Renderiza PublicHeader e PublicFooter
- Exibe os 4 benefícios com descrições
- Exibe título "Crie com IA, sem limites"
- Exibe "Entre com Google ou email" no card
- Exibe loading quando auth está carregando
- Exibe erro de autenticação quando houver
- Exibe link skip-to-content
- Renderiza campos email e senha
- Renderiza botão "Entrar"
- Exibe divider "ou"
- Exibe link "Não tem conta? Cadastre-se"
- Exibe link "Esqueceu a senha?"
- Validação: email obrigatório
- Validação: email inválido
- Validação: senha obrigatória
- Submit chama `loginWithEmail` com dados corretos
- Chama `clearAuthError` antes de submeter
- Chama `login` ao clicar "Entrar com Google"
- Dialog de reset: abre ao clicar "Esqueceu a senha?"
- Dialog de reset: pré-preenche email do formulário
- Dialog de reset: chama `resetPassword` ao submeter
- Dialog de reset: mostra feedback de sucesso
- Dialog de reset: mostra feedback de erro
- Dialog de reset: fecha ao clicar "Cancelar"
- Dialog de reset: fecha ao clicar "Entendi" após sucesso
- Dialog de reset: valida email inválido
- Dialog de reset: valida email vazio
- Redireciona para `/app/estudio` quando usuário autenticado

### pages.component.test.tsx (4 testes novos)
- RegisterPage renderiza sem crash
- RegisterPage renderiza PublicHeader e PublicFooter
- RegisterPage exibe link "Faça login"
- Redirect `/register` → `/cadastro`

## Falsos Positivos Corrigidos

### FP-001: Testes de validação com `userEvent.type` no MUI TextField
- **Testes:** LoginPage validação + RegisterPage validação
- **Problema:** `userEvent.type` no MUI TextField com label flutuante no jsdom não dispara `onChange` corretamente, impedindo a validação. O `fireEvent.change` + `fireEvent.submit` no form funciona.
- **Correção:** Substituído `userEvent.type` + `userEvent.click` por `fireEvent.change` nos inputs + `fireEvent.submit` no form.

### FP-002: Teste COEP reload com `vi.spyOn(window, 'location', 'set')`
- **Testes:** AuthContext signup/loginWithEmail COEP reload
- **Problema:** `vi.spyOn(window, 'location', 'set')` não intercepta `window.location.href = '/app/estudio'` no jsdom, porque o jsdom implementa `location` como propriedade especial.
- **Correção:** Substituído por `Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, set href(value) { spy(value) } } })`.

## Decisões e Adaptações

1. **MUI TextField label flutuante:** No jsdom, `getByLabelText(/^senha$/i)` falha porque o MUI TextField não conecta a label flutuante ao input via `htmlFor`. Usado `container.querySelector('input[type="password"]')` como alternativa.

2. **Mock de `window.location`:** Para capturar `window.location.href = '/app/estudio'` no jsdom, necessário usar `Object.defineProperty` com getter/setter customizados em vez de `vi.spyOn`.

3. **Submit de formulário MUI:** `userEvent.click` no botão submit dentro de form MUI pode não disparar o `onSubmit` do React. `fireEvent.submit(form)` é mais confiável no jsdom.

4. **Mock do `useAuth`:** Atualizado o mock padrão em `pages.component.test.tsx` e `Library.component.test.tsx` para incluir as novas funções (`signup`, `loginWithEmail`, `resetPassword`).

## Conclusão

68 testes novos criados cobrindo signup, loginWithEmail, resetPassword, RegisterPage (nova página), LoginPage atualizada (formulário + dialog reset) e routing. Todos os 1040 testes da suite passam sem regressão.
