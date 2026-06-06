---
description: Use para bump de versão semântico + atualização do CHANGELOG + sincronização dos 3 arquivos de prompt de agentes (AGENTS.md e CLAUDE.md ficam idênticos)
name: fast
---

Atue como Release Engineer & Documentation Specialist. Sua missão é garantir a precisão absoluta no versionamento e a sincronização total da documentação do projeto, operando sob o princípio de "Zero Ambiguidade". Siga estritamente estes protocolos de inicialização:

1. Análise Semântica de Mudanças: Processe o argumento utilizado pelo usuário. Utilize obrigatoriamente analyze_aitool_changes para extrair um resumo técnico (funções, tipos, componentes) e agrupar as alterações por área, substituindo qualquer análise superficial de diff.
2. Rigor de Versionamento (SemVer): Aplique a regra de patch, minor ou major com conservadorismo. Justifique a escolha da nova versão no CHANGELOG.md com base nas mudanças reais detectadas.
3. Protocolo de Sincronização Triple-File: Garanta que AGENTS.md e CLAUDE.md terminem o processo como arquivos byte-a-byte idênticos, sem exceções ou placeholders.
4. Gate de Consistência: A tarefa só será considerada concluída após validar que o bump no package.json e as entradas no changelog refletem exatamente as mudanças técnicas mapeadas, sem invenções ou omissões.

## Objetivo

Documentar com precisão para evitar retrabalho e inconsistência de versão.

---

## Interpretação

| Argumento | Ação |
| --------- | ---- |
| Vazio | Documentar tudo desde o último commit (diff) |
| Descrição | Documentar a mudança descrita |

---

## Arquivos Obrigatórios

1. `CHANGELOG.md` (o que mudou e por quê)
2. `package.json` (bump de versão)
3. `AGENTS.md` (resumo de versão)
4. `CLAUDE.md` (espelho de `AGENTS.md`)

---

## Regra de Versionamento (sem ambiguidade)

- `patch`: correções e ajustes sem nova capacidade
- `minor`: nova feature compatível
- `major`: breaking change

Se houver dúvida real entre dois níveis, usar o mais conservador e justificar no changelog.

---

## Processo

1. Rodar `analyze aitool changes` para levantar mudanças reais:
   - Resumo semântico (funções, tipos, components, imports adicionados/removidos)
   - Agrupamento por área afetada
   - Isso substitui `git diff` -- é mais preciso e já classifica as mudanças
2. Atualizar `CHANGELOG.md` com entradas objetivas baseadas no resumo semântico
3. Aplicar bump de versão em `package.json`
4. Revisar e atualizar `AGENTS.md` por completo:
   - Leia todo o conteúdo atual do `AGENTS.md`
   - Atualize a versão
   - Compare o conteúdo com as mudanças detectadas (step 1) e o estado real do projeto:
     - **Adicione** informações sobre novas features, componentes, serviços ou padrões introduzidos
     - **Atualize** descrições que ficaram desatualizadas (nomes, caminhos, APIs, dependências)
     - **Remova** referências a código, arquivos ou funcionalidades que não existem mais
   - O objetivo é que o `AGENTS.md` seja um retrato fiel do projeto na versão atual, não apenas um bump de número
5. **Sincronizar arquivos de agentes (obrigatório):**
   ```bash
   cp AGENTS.md CLAUDE.md
   ```
   Os três arquivos devem ficar **byte-a-byte idênticos**
6. Verificar que os três arquivos finais estão idênticos

---

## Gate de Qualidade (saída)

Só concluir quando:
- Changelog refletir exatamente as mudanças
- Versão nova for coerente com semver
- `AGENTS.md` e `CLAUDE.md` estiverem idênticos
- Não houver placeholders ou texto incompleto

---

## Regras Críticas

- Não fazer commit automaticamente
- Não inventar mudança que não existe no diff
- Não pular sincronização dos 3 arquivos de agentes
