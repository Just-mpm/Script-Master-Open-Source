---
description: Use para analisar nuances de linguagem em prompts de agents (comandos, agents, AGENTS.md) e sugerir melhorias para garantir que o LLM interprete as instruções corretamente.
name: refine
---

Analise os arquivos de prompt informados e encontre trechos onde a linguagem pode levar o LLM a interpretar algo diferente do que o autor pretendia. O foco é comportamento do agente, não estilo.

**Não altere nenhum arquivo.** Apresente os findings e espere aprovação antes de qualquer mudança.

## Método de Análise

Siga estes passos em ordem. Não pule nenhum.

### 1. Ler integralmente

Leia o(s) arquivo(s) alvo(s) antes de começar. Sem leitura completa, você perde contexto e faz achismo.

### 2. Teste da interpretação única

Para cada instrução, pergunte: "Um LLM lendo isso friamente chegaria a uma única interpretação?" Se houver mais de uma leitura possível, marque como finding.

### 3. Classificar a força da instrução

Toda frase em prompt tem uma força implícita. Identifique qual:

| Força | Sinais típicos | Risco |
| --- | --- | --- |
| Permissão | "pode", "é permitido" | LLM pode tratar como opcional |
| Sugestão | "considere", "tente", "veja se" | LLM pode ignorar |
| Comando | "faça", "use", "execute" | Intenção clara |
| Proibição | "não faça", "evite" | "Evite" é ambíguo (ver tabela) |

Se a intenção do autor for **Comando** mas o texto for **Sugestão/Permissão**, é finding crítico.

### 4. Cruzar com vocabulário problemático

Use a tabela em "Vocabulário de Referência" abaixo. Toda construção listada é suspeita até você confirmar que o contexto a torna inequívoca.

### 5. Validar referências

Para cada nome de comando, agent, ferramenta, diretório ou arquivo mencionado no prompt:

- Verifique se existe (use `glob` ou `read` no diretório correspondente).
- Verifique se está escrito corretamente.
- Verifique se o caminho é relativo à raiz do projeto.

**Exemplo:** se o prompt diz "Use o comando `foo`", liste `command/` e confirme se `foo.md` existe. Se não existir, é finding crítico.

### 6. Detectar contradições

Releia o prompt procurando frases que se contradizem ou anulam comandos anteriores. Atenção especial à primeira metade vs. segunda metade do arquivo.

### 7. Listar findings priorizados

Aplique o critério de severidade e ordene do mais grave ao mais cosmético.

## Vocabulário de Referência

Lista de suspeitos habituais. Toda construção listada é finding até você confirmar que o contexto a torna inequívoca.

### Verbos e construções ambíguas

| Construção | Risco | Substitua por |
| --- | --- | --- |
| "Evite X" | Sugestão, não proibição. LLM pode "evitar" fazendo parcialmente. | "Não faça X" |
| "Tente fazer X" | "Tentar" admite falha. LLM pode não fazer. | "Faça X" |
| "Veja X" | Vago: ler? analisar? decidir? | "Analise X e retorne Y" |
| "Considere X" | Opcional. LLM pode ignorar. | "Use X" ou remova |
| "Pode usar X" | Permissão, não instrução. | "Use X" |
| "Se necessário" | Critério delegado ao LLM. | Defina o critério explícito |
| "Conforme necessário" | Idem. | Liste os casos |
| "Apresente" | Sugere aprovação obrigatória. | "Registre no chat e prossiga" (se informativo) ou "Apresente para aprovação" (se for isso) |
| "Registre no chat" | Ambíguo: informativo ou pedir aprovação? | "Registre para referência" ou "apresente para aprovação" |
| "Execute conforme necessário" | O que define necessário? | Liste os critérios |
| "Passe como contexto" | Inclui dados reais ou só menciona? | "Inclua os dados: ..." ou "Mencione que X existe" |
| "Siga os padrões do projeto" | Quais padrões? onde estão? | "Siga os padrões descritos em `path/arquivo.md`" |
| "Verifique a consistência" | Consistência com quê? | "Verifique consistência com `path/referência`" |
| "Faça o que for melhor" | Delegação total, abre brecha para qualquer coisa. | Defina o critério de "melhor" |
| "Dê uma olhada" | Vago e informal. LLM não sabe o escopo. | "Analise X" |

### Frases de borda

| Frase | Risco |
| --- | --- |
| "Em modo de análise..." | LLM pode tratar o resto como opcional |
| "Se for o caso..." | Quando? Quem decide? |
| "Quando aplicável..." | Idem |
| "Idealmente..." | Sugestão, não comando |
| "De preferência..." | Idem |
| "Se possível..." | Dá ao LLM uma saída para não fazer |

## Critério de Severidade

- **Crítica** — muda o que o agente faz. Ex: confusão entre "faça" e "não faça", referência a comando inexistente, instrução contraditória, omissão de passo obrigatório.
- **Média** — pode causar interpretação diferente em casos de borda. Ex: verbo ambíguo em instrução secundária, omissão de caminho de arquivo, critério delegado.
- **Cosmética** — não muda comportamento. Ex: typo, acentuação, formatação, redundância estilística.

Priorize o que muda o comportamento. Cosméticos vão no fim, em seção separada.

## Formato de Saída

Use este template para cada finding:

```markdown
### Finding #N — [Severidade]

- **Arquivo:** `caminho/arquivo.md` linha X
- **Trecho original:** "..."
- **Problema:** o que o LLM pode interpretar diferente da intenção
- **Por que é um problema:** a mecânica da confusão (1-2 frases)
- **Sugestão de correção:** "..."
```

Após todos os findings, adicione o resumo e o próximo passo:

```markdown
---

## Resumo

- **Findings críticos:** N
- **Findings médios:** N
- **Findings cosméticos:** N

## Próximo passo

Aguardando aprovação. Posso aplicar quais correções? Todas, nenhuma, ou apenas as críticas/médias?
```

## Regra de Parada Positiva

Se, após aplicar o método completo, não houver findings críticos ou médios, diga explicitamente:

> Analisei `arquivo.md` aplicando o método completo. Não encontrei findings críticos ou médios. O prompt está claro para o LLM. Encontrados N findings cosméticos (listados abaixo, se houver).

**Não invente problemas para preencher a saída.** "Está tudo OK" é uma resposta válida e útil — findings inflados perdem credibilidade.

## Princípios (sempre verdade)

- **Foco em comportamento, não estilo** — não sugira trocar "use o Git" por "utilize o Git" se o comportamento é o mesmo.
- **Contexto é rei** — uma construção ambígua pode ficar clara se o parágrafo anterior define o critério. Releia integralmente antes de marcar.
- **Não invente problemas** — se o trecho é claro, deixe quieto.
- **Não altere arquivos** — proponha, espere aprovação, só então aplique.
- **Severidade é obrigatória** — todo finding precisa ser classificado. Sem severidade, é só opinião.
