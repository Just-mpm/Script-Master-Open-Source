---
name: melhores-praticas-tts
description: Melhores práticas para escrever roteiros otimizados para síntese de voz com Gemini TTS. Use quando o usuário quiser melhorar a qualidade do áudio, souber como formatar o roteiro, perguntar sobre pausas, ênfase, emoções, ritmo, multi-locutor ou qualquer técnica de escrita para TTS.
---

# Melhores Práticas para Roteiros TTS

O Gemini 3.1 Flash TTS funciona como um **ator virtual** — ele interpreta não só o texto, mas também as instruções de direção. Escrever bem para TTS é diferente de escrever para leitura. Este guia cobre tudo o que você precisa saber para extrair a melhor qualidade de áudio.

## 1. Pontuação e Ritmo

A pontuação é a principal ferramenta de controle de ritmo:

- **Ponto final (`.`)** → pausa natural, final de ideia
- **Vírgula (`,`)** → micro-pausa, separa elementos
- **Reticências (`...`)** → pausa longa, hesitação ou suspense
- **Travessão (`—`)** → pausa dramática, mudança de pensamento
- **Dois pontos (`:`)** → pausa de expectativa, introdução
- **Ponto e vírgula (`;`)** → pausa curta entre ideias relacionadas
- **Parênteses** → o modelo tende a ler com tom de aparte

**Exemplo:**
```
Bom... não sei como te dizer isso — mas aconteceu.
```
As reticências criam hesitação, o travessão cria uma pausa dramática antes da revelação.

## 2. Audio Tags (Controle Inline)

O Gemini TTS suporta **tags entre colchetes** que modificam a entrega de trechos específicos do texto. Não há lista fixa — o modelo entende linguagem natural.

### Tags de Emoção
```
[amazed] [crying] [curious] [excited] [sarcastic] [serious]
[shouting] [whispers] [panicked] [tired] [trembling]
[mischievously]
```

### Tags de Som Não-Verbal
```
[sighs] [gasp] [giggles] [laughs] [cough]
```

### Tags de Ritmo
```
[very fast] [very slow] [quickly] [slowly]
```

### Tags Criativas (o modelo aceita qualquer instrução natural)
```
[like a cartoon dog] Awoo! Eu sou um novo modelo de voz...
[like dracula] Boa noite... bem-vindo ao meu castelo.
[sarcastically, one painfully slow word at a time] Que. Surpresa.
```

### Como Usar no Roteiro
Coloque a tag **antes** do trecho que deseja modificar:
```
[whispers] Presta atenção nisso... [shouting] porque isso muda tudo!
```

**Importante:** mesmo que o roteiro seja em português, use tags em **inglês** — o modelo as interpreta com mais precisão.

## 3. Emoção e Tom

O Script Master oferece **10 emoções** com controle de intensidade (0–100%):

| Emoção | Tag Inline | Melhor uso |
|--------|-----------|------------|
| Neutra | _(nenhuma)_ | Narração padrão, noticiário |
| Feliz | `[excitedly]` | Anúncios, conteúdos positivos |
| Triste | `[softly]` | Narrativas melancólicas, reflexões |
| Irritada | `[firmly]` | Reclamações, alertas |
| Calma | `[calmly]` | Meditação, instruções |
| Energética | `[energetically]` | Teasers, aberturas |
| Dramática | `[dramatically]` | Suspense, clímax |
| Amigável | `[warmly]` | Boas-vindas, conversas |

### Intensidade da Emoção

- **0–30%** → sutil, quase imperceptível
- **40–70%** → equilibrada, natural (recomendado para a maioria)
- **80–100%** → intensa, exagerada (use para efeito dramático)

## 4. Ritmo (Pace)

O Script Master oferece 5 velocidades:

| Ritmo | Tag Inline | Quando usar |
|-------|-----------|-------------|
| Muito lento | `[very slow]` | Suspense, ênfase máxima, acessibilidade |
| Lento | `[slowly]` | Narrativas contemplativas, instruções |
| Normal | _(nenhuma)_ | Uso geral, maioria dos casos |
| Rápido | `[quickly]` | Conteúdo energético, teasers |
| Muito rápido | `[very fast]` | Urgência, humor, efeito específico |

## 5. Multi-locutor (Diálogos)

O sistema suporta **2 locutores simultâneos**. Para roteiros com diálogo:

### Formato do Roteiro
Use o nome dos locutores seguido de dois pontos:
```
Narrador: Era uma noite escura e tempestuosa.
Entrevistado: Eu estava lá quando tudo aconteceu.
Narrador: E o que você viu?
Entrevistado: [excitedly] Algo que mudou minha vida para sempre!
```

### Dicas para Diálogos
- **Nomes claros e distintos** — "Narrador" e "Entrevistado" é melhor que "A" e "B"
- **Tags inline por locutor** — cada fala pode ter sua própria emoção
- **Contraste de vozes** — combine vozes de estilos diferentes (ver skill "guia-de-vozes")
- **Naturalidade** — interrompa falas com `—` para simular conversa real:
  ```
  LocutorA: Eu acho que a melhor opção seria —
  LocutorB: Espera, deixa eu terminar de falar!
  ```

## 6. Formatação do Roteiro

### O que FUNCIONA bem:
- **Frases curtas e diretas** → prosódia mais natural
- **Parágrafos separados** → pausas automáticas entre eles
- **Diálogos com nome:** → o modelo entende a troca de locutor
- **Pontuação padrão** → vírgulas, pontos, pontos de interrogação
- **Tags inline esporádicas** → `[sighs]`, `[laughs]` adicionam naturalidade
- **Números por extenso** → "dois mil" em vez de "2000" (opcional, o modelo lê bem ambos)
- **Siglas separadas por pontos** → "I.A." em vez de "IA" para clareza

### O que EVITAR:
- **Textos muito longos sem pausas** (>500 chars) → qualidade degrada. O sistema já divide em chunks automaticamente, mas parágrafos curtos ajudam
- **Instruções de direção no roteiro** → o modelo pode lê-las em voz alta. Ex: `[narrador fala com voz grave]` — prefira Audio Tags padrão
- **Emojis** → o modelo ignora ou lê o nome do emoji ("sorriso")
- **Marcadores de markdown** → `**`, `##`, `-` podem ser lidos literalmente
- **HTML/XML** → lidos como texto
- **Mudanças bruscas de idioma** → possível, mas qualidade varia. Use tags para sinalizar: `[in Portuguese]` ou `[in English]`

## 7. Audio Profile e Scene (Configurações Avançadas)

O Script Master permite configurar **Audio Profile** e **Scene** no estúdio:

- **Audio Profile**: Descreve a persona da voz. Ex: "Jornalista brasileiro, 35 anos, tom profissional mas acessível"
- **Scene**: Descreve o ambiente e clima. Ex: "Estúdio de rádio, manhã, ambiente profissional"
- **Notas de Estilo**: Instruções adicionais. Ex: "Ritmo variado, pausas enfáticas entre frases importantes"

Essas configurações complementam a voz escolhida e guiam a interpretação do modelo como um **diretor guia um ator**.

## 8. Números, Siglas e Palavras Estrangeiras

| Tipo | Recomendação | Exemplo |
|------|-------------|---------|
| Números | Por extenso para clareza máxima | "três mil" → mais claro que "3000" |
| Decimais | Ponto ou vírgula funcionam | "3,14" ou "3.14" |
| Siglas | Soletre com pontos para clareza | "I.A." → mais claro que "IA" |
| Moeda | Por extenso para naturalidade | "cem reais" → mais natural que "R$ 100" |
| URLs/emails | Por extenso ou evite | "ponto com" em vez de ".com" |
| Palavras estrangeiras | Mantenha original, o modelo adapta | "marketing", "startup", "feedback" |
| Nomes próprios estrangeiros | Mantenha a grafia original | "Gemini", "Google", "WhatsApp" |

## 9. Checklist de Qualidade do Roteiro

Antes de gerar áudio, verifique:

- [ ] Parágrafos curtos (<500 caracteres cada)
- [ ] Pontuação adequada para ritmo desejado
- [ ] Tags inline apenas onde necessário (não exagere)
- [ ] Nomes de locutores consistentes (se multi-locutor)
- [ ] Emoção adequada ao conteúdo
- [ ] Voz compatível com o tom do roteiro
- [ ] Sem markdown, HTML ou emojis no texto
- [ ] Números e siglas claros

## 10. Limitações Conhecidas

- **Janela de contexto**: 8.192 tokens de entrada por sessão TTS
- **Qualidade em áudios longos**: pode degradar após alguns minutos — o sistema divide automaticamente em chunks
- **Retry automático**: o Gemini TTS ocasionalmente retorna erro 500 — o sistema tenta até 2 vezes automaticamente
- **Não suporta streaming TTS**: todo o áudio é gerado de uma vez por chunk
- **Voz inconsistente com instruções conflitantes**: não peça para uma voz grave soar aguda — o resultado será inconsistente
