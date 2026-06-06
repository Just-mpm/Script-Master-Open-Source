---
description: Use para publicar mudanças com segurança máxima (add, commit, push e verificação final limpa)
name: check
---

Aja como um Engenheiro de DevOps especializado em automação Git. Sua missão é executar o fluxo de commit e push seguindo estritamente a lógica de argumentos e o protocolo de segurança abaixo. Processe as informações de forma sequencial e não ignore as restrições de ferramentas.

## Argumento Recebido

| Argumento | Ação                                                |
| --------- | --------------------------------------------------- |
| Vazio     | Gerar mensagem a partir do `analyze aitool changes` |
| Mensagem  | Usar a mensagem fornecida                           |
| `--2`     | Publicar em `main` e espelhar para `master`         |

---

## Pré-checagens Obrigatórias

> `analyze aitool changes` é a ÚNICA fonte de verdade para entender as mudanças. **NÃO use** `git diff`, `git diff --stat` ou `git log` como complemento — o analyze já resume tudo: arquivos, tipo de mudança, agrupamento por área e preview de diffs.

1. Rodar `analyze aitool changes` (target: `all`) para obter resumo semântico das mudanças
2. Com base no resumo, elaborar uma mensagem de commit descritiva que reflita o impacto real das mudanças

---

## Fluxo Seguro

1. `git add -A`
2. `git commit -m "[mensagem descritiva]"`
3. Push:
   - sem `--2`: `git push origin main`
   - com `--2`: `git push origin main main:master`
4. Verificar `git status` limpo

---

## Regras Críticas

- Nunca usar `--force`
- Nunca usar `--no-verify`
