# Guia de Geração — MiniMax (Vozes & Imagens)

> Guia de referência para geração de áudio (TTS) e imagens com MiniMax.
> Baseado em testes práticos — atualizado manualmente.

---

## ✅ Aprovadas

| # | Voz | ID | Descrição |
|---|-----|----|-----------|
| 1 | `pt_confident` | `Portuguese_ConfidentWoman` | Voz feminina firme e segura. Ótima para tutoriais, aulas e narrações profissionais — transmite autoridade sem ser monótona. |
| 2 | `pt_narrator` | `Portuguese_Narrator` | Voz neutra de narração, equilibrada e clara. Ideal para audiobooks, documentários e conteúdo longo — não cansa o ouvido. |
| 3 | `pt_storyteller` | `Portuguese_CaptivatingStoryteller` | Voz envolvente com tom de contador de histórias. Perfeita para narrativas, introduções de vídeo e conteúdo criativo. |
| 4 | `pt_serene` | `Portuguese_SereneWoman` | Voz feminina serena e calma. Boa para meditação, relaxamento ou conteúdo mais suave e tranquilo. |
| 5 | `pt_thoughtful` | `Portuguese_ThoughtfulMan` | Voz masculina ponderada, com tom de reflexão. Ótima para conteúdo que exige credibilidade e profundidade. |
| 6 | `pt_reliableman` | `Portuguese_ReliableMan` | Voz masculina confiável, transmite segurança. Ideal para narrações institucionais e conteúdo sério. |

### ⚖️ Aprovada Condicional

| Voz | ID | Descrição | Observação |
|-----|----|-----------|------------|
| `pt_sweetgirl` | `Portuguese_SweetGirl` | Voz feminina doce e suave. | Depende do objetivo — funciona bem para conteúdo infantil, personagens ou tons mais delicados, mas não serve para uso geral/profissional. |

## ❌ Reprovadas

| # | Voz | ID | Descrição | Motivo |
|---|-----|----|-----------|--------|
| 1 | `pt_gentleman` | `Portuguese_Deep-VoicedGentleman` | Voz masculina grave, estilo "voz grossa". | Tom muito pesado/artificial para narração contínua. |
| 2 | `pt_scholar` | `Portuguese_WiseScholar` | Voz estudada, séria, estilo acadêmico. | Soa forçada / pouco natural para uso geral. |
| 3 | `teste1_default` | `English_expressive_narrator` | Voz padrão inglesa — narrador expressivo. | Voz em inglês, não adequada para conteúdo em português. |
| 4 | `pt_steadymentor` | `Portuguese_Steadymentor` | Voz de mentor estável. | Muito robótica/monótona, sem naturalidade. |
| 5 | `pt_comedian` | `Portuguese_Comedian` | Voz cômica e descontraída. | Artificial e forçada, não funciona para narração. |
| 6 | `pt_anime` | `Portuguese_AnimeCharacter` | Voz estilizada de personagem. | Exagerada e caricata, uso muito limitado. |
| 7 | `pt_dramatist` | `Portuguese_Dramatist` | Voz dramática. | Melodramática demais, soa artificial. |

---

<br/><br/>
<hr/>

# 🎨 Testes de Imagens — MiniMax image-01

> Observações sobre geração de imagens com texto incluído e estilos visuais.

---

## 📋 Estilos Testados

| # | Estilo | Arquivo | Veredito |
|---|--------|---------|----------|
| 1 | 🌄 **Paisagem** (pôr do sol montanhas) | `img_paisagem_001.jpg` | ✅ Bom |
| 2 | ⚔️ **Fantasia** (guerreiro medieval) | `img_guerreiro_001.jpg` | ✅ Bom |
| 3 | 🎧 **Logo minimalista** (app áudio) | `img_logo_001.jpg` | ✅ Bom |
| 4 | 🏫 **Whiteboard** (quadro branco, diagrama) | `img_whiteboard_001.jpg` | ❌ Ruim |
| 5 | 📸 **Realista** (praia brasileira) | `img_realista_001.jpg` | ✅ Bom |
| 6 | 🎨 **3D / Pixar** (robô lendo) | `img_3d_001.jpg` | ⭐ Excelente |
| 7 | 🇯🇵 **Anime / Ghibli** (livraria) | `img_anime_001.jpg` | ✅ Bom |
| 8 | 🎬 **Cinematográfico** (pôster épico) | `img_cinema_001.jpg` | ✅ Bom |

---

## 📝 Testes com Texto — Observações

### Regra de Ouro

> O MiniMax image-01 consegue renderizar texto de forma legível em **superfícies e objetos específicos**, mas:
> 1. **Falha** quando o texto é escrito à mão ou faz parte de algo segurado por um personagem
> 2. **Tende a adicionar texto extra** (lixo) ao redor do texto principal — é preciso delimitar bem no prompt
> 3. **Letreiros luminosos/neon** distorcem o texto

### ✅ Funcionou Bem

| # | Teste | Arquivo | Tipo de Texto | Observação |
|---|-------|---------|---------------|:-----------:|
| 1 | Capa de livro | `img_pixar_leitura_001.jpg` | "ROTEIROS" na capa | ✅ Perfeito |
| 2 | Quadro negro (giz) | `img_chalkboard_001.jpg` | "BEM-VINDOS" de giz | ✅ Ficou bom |
| 3 | Quadro negro (giz) | `img_chalkboard_cafe_001.jpg` | "CAFÉ" no cavalete | ✅ **Perfeito** (melhor resultado até agora) |
| 4 | Etiqueta de caderno | `img_caderno_ideias_001.jpg` | "IDEIAS" em etiqueta | ✅ Ficou bom — design de objeto |
| 5 | Monitor | `img_monitor_play_001.jpg` | "PLAY" + onda sonora | ✅ Deu certo, mas layout diferente do esperado |

### ⚖️ Funcionou com Ressalvas

| # | Teste | Arquivo | Tipo de Texto | Observação |
|---|-------|---------|---------------|:-----------:|
| 1 | Placa no cenário | `img_pixar_studio_001.jpg` | "SCRIPT MASTER" em placa | ✅ Texto principal ok |
| 2 | Monitor | `img_monitor_001.jpg` | "SCRIPT MASTER" na tela | ✅ Texto principal ok, mas **inseriu textos extras** ao redor |
| 3 | Camiseta estampada | `img_camisa_001.jpg` | "CRIADOR" na camisa | ✅ "CRIADOR" ok, mas **texto extra ilegível** acima |
| 4 | Quadro emoldurado | `img_quadro_criador_001.jpg` | "CRIADOR" na parede | ✅ "CRIADOR" certo, mas **inseriu outros textos errados** |

### ❌ Não Funcionou

| # | Teste | Arquivo | Tipo de Texto | Observação |
|---|-------|---------|---------------|:-----------:|
| 1 | Prancheta segurada | `img_pixar_raposa_001.jpg` | "AÇÃO" na prancheta | ❌ Texto ilegível |
| 2 | Quadro branco | `img_whiteboard_*.jpg` | Textos variados | ❌ Texto distorcido |
| 3 | Outdoor/billboard | `img_outdoor_001.jpg` | "LANÇAMENTO" | ❌ Texto errado |
| 4 | Letreiro neon | `img_neon_001.jpg` | "ESTÚDIO" neon | ❌ Texto distorcido (neon atrapalha) |
| 5 | Placa de madeira | `img_placa_madeira_001.jpg` | "ESTÚDIO" entalhado | ❌ Texto escrito errado |
| 6 | Capa de livro (lombada) | `img_livro_roteiros_001.jpg` | "ROTEIROS" na lombada | ❌ Escreveu "Roteíro" (errou o S e inventou acento) |

### ⚖️ Indefinido

| Teste | Arquivo | Tipo de Texto | Observação |
|-------|---------|---------------|:-----------:|
| Caderno aberto | `img_caderno_001.jpg` | "MINHAS IDEIAS" | Menino escrevendo mas **não mostra o texto**

### 💡 Conclusões Finais

| ✅ Funciona Bem | ❌ Funciona Mal |
|:----------------|:----------------|
| Quadro negro com giz com **1 palavra** (⭐ melhor resultado) | Escrita à mão / prancheta segurada |
| Etiqueta / adesivo em objeto | Quadro branco / diagramas |
| Capa de livro com 1 palavra (desde que não seja lombada fina) | Letreiro neon / luzes |
| Monitor com 1 palavra | Outdoor / billboard |
| Estampa de camiseta (1 palavra no texto principal) | Placa de madeira entalhada |
| | Lombada de livro |
| | **Múltiplas palavras** (o modelo sempre erra quando tem + de 1) |

### 🔑 Regra de Ouro Definitiva

> **O modelo acerta texto com 1 palavra, e erra com 2+.**  
> Seja qual for o suporte (giz, placa, livro, monitor), quando você pede mais de uma palavra o modelo:
> - Distorce as letras
> - Escreve parcialmente errado
> - Troca caracteres (ex: "Roteíro" em vez de "ROTEIROS")
> - Adiciona texto lixo extra

**Única exceção:** quando o texto extra é parte natural do design do cenário (ex: capa de livro que tinha só "ROTEIROS" — 1 palavra — funcionou).

### ⚠️ Problema Comum: Texto Lixo

O modelo **adora adicionar texto por conta própria**. Mesmo quando o texto principal acerta, ele frequentemente insere letras/palavras aleatórias ao redor. Para mitigar:

> No prompt, seja **bem específico**: *"com **APENAS** o texto 'XXX' escrito, **sem nenhum outro texto, letras ou palavras** em lugar algum da cena"*

### 🏆 Melhor Resultado do Teste

🥇 **Chalkboard "CAFÉ"** — giz, 1 palavra, perfeito  
🥈 **Chalkboard "BEM-VINDOS"** — giz, 1 palavra, funcionou  
🥉 **Etiqueta de caderno "IDEIAS"** — design de objeto, funcionou

### 🎨 Estilo Preferido

O estilo **Pixar/3D** foi o favorito absoluto entre todos os testes de imagem.

---

> **Legenda:** ⭐ Excelente · ✅ Aprovada · ⚖️ Aprovada condicional · ❌ Reprovada
