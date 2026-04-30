import type { TranslationDictionary } from '../types';

/**
 * Dicionário pt-BR — idioma default do Script Master.
 * Strings extraídas diretamente dos componentes públicos.
 */
export const ptBR: TranslationDictionary = {
  // ── Comum ──────────────────────────────────────────────────────────────
  common: {
    skipToContent: 'Pular para o conteúdo',
    loading: 'Carregando...',
    error: 'Erro',
    success: 'Sucesso',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    close: 'Fechar',
    back: 'Voltar',
    next: 'Próximo',
    skip: 'Pular',
    tryAgain: 'Tentar novamente',
    learnMore: 'Saiba mais',
    getStarted: 'Começar agora',
    seeAll: 'Ver tudo',
    search: 'Buscar...',
    noResults: 'Nenhum resultado encontrado',
  },

  // ── Navegação ──────────────────────────────────────────────────────────
  nav: {
    home: 'Home',
    features: 'Funcionalidades',
    pricing: 'Preços',
    faq: 'FAQ',
    about: 'Sobre',
    contact: 'Contato',
    login: 'Entrar',
    register: 'Criar conta',
    openApp: 'Abrir App',
    logout: 'Sair',
    ariaNav: 'Navegação pública',
    ariaMenu: 'Menu',
    ariaDrawerMenu: 'Menu de navegação',
  },

  // ── Footer ─────────────────────────────────────────────────────────────
  footer: {
    description:
      'Transforme roteiros em arte com IA. Áudio, vídeo e imagens profissionais gerados por Gemini.',
    copyright: 'Script Master. Todos os direitos reservados.',
    madeWith: 'Feito com IA e Gemini',
    productGroup: 'Produto',
    companyGroup: 'Empresa',
    legalGroup: 'Legal',
    links: {
      features: 'Funcionalidades',
      pricing: 'Preços',
      faq: 'Perguntas Frequentes',
      status: 'Status',
      about: 'Sobre',
      contact: 'Contato',
      email: 'E-mail',
      terms: 'Termos de Uso',
      privacy: 'Privacidade',
      cookies: 'Cookies',
    },
  },

  // ── Landing Page ───────────────────────────────────────────────────────
  landing: {
    hero: {
      title: 'Transforme roteiros em arte com IA',
      subtitle:
        'Plataforma completa para criar áudio, vídeo e imagens profissionais a partir de roteiros. Tudo client-side com Gemini AI.',
      cta: 'Criar conta gratuita',
      ctaSecondary: 'Ver Funcionalidades',
      alt: 'Ilustração do Script Master — transformação de roteiros em arte com IA',
    },
    socialProof: {
      label: 'Powered by Gemini AI',
      sublabel: 'TTS, geração de imagens e assistente conversacional',
    },
    features: {
      title: 'Tudo que você precisa para criar',
      subtitle:
        'Seis ferramentas integradas em uma única plataforma para transformar suas ideias em conteúdo profissional.',
    },
    featureCards: {
      voice: {
        title: 'Voz com IA',
        description:
          'Transforme roteiros em áudio profissional com Gemini TTS. Controle de voz, pace e multi-speaker.',
      },
      video: {
        title: 'Vídeo Automático',
        description:
          'Crie vídeos client-side com legendas, transições e waveform. Nenhum backend necessário.',
      },
      images: {
        title: 'Geração de Imagens',
        description:
          '8 aspect ratios, referência visual e galeria completa com persistência na nuvem.',
      },
      speedPaint: {
        title: 'Speed Paint',
        description:
          'Animação de pintura progressiva com edge detection, batch processing e exportação.',
      },
      assistant: {
        title: 'Assistente IA',
        description:
          'Chat com streaming, memórias, anexos e integração direta com o estúdio de produção.',
      },
      library: {
        title: 'Biblioteca',
        description:
          'Gestão completa de projetos com áudios, cenas, vídeos e persistência dual.',
      },
    },
    ttsShowcase: {
      title: 'Voz Profissional com Gemini TTS',
      description:
        'Transforme qualquer roteiro em narração profissional com vozes naturais e controle total sobre pace, pitch e perfil de áudio.',
      benefits: {
        0: 'Multi-speaker com 2 locutores independentes',
        1: 'Detecção automática de cenas via análise de silêncio (RMS)',
        2: 'Controle de pace, pitch e perfil de áudio (podcast, audiobook, narração)',
        3: 'Voice previews para cada voz disponível',
        4: 'Áudio 24kHz mono 16-bit PCM de alta qualidade',
      },
    },
    videoShowcase: {
      title: 'Vídeo Client-Side com Remotion',
      description:
        'Renderize vídeos completos diretamente no navegador. Nenhum servidor, nenhum custo de renderização. WebCodecs + Whisper para legendas automáticas.',
      benefits: {
        0: 'Codec fallback: H.264+AAC+MP4 > H.264 sem áudio > VP8+Opus+WebM',
        1: 'Legendas automáticas com Whisper WASM (3 fontes de sincronização)',
        2: 'Crossfade entre cenas com spring animation (400ms overlap)',
        3: '3 resoluções: 16:9, 9:16, 1:1',
        4: 'Waveform overlay sincronizado com o vídeo',
      },
    },
    assistantShowcase: {
      title: 'Assistente IA Integrado',
      description:
        'Chat conversacional com streaming Gemini, memórias de longo prazo e integração direta com o estúdio. O assistente sugere alterações que você aplica com um clique.',
      benefits: {
        0: 'Streaming em tempo real com Gemini 3.1 Flash',
        1: 'Sistema de memória: textos curtos + upload de documentos (.md, .txt, .csv)',
        2: 'Anexos: 5 por mensagem (imagens 10MB, documentos 5MB)',
        3: 'Extração de JSON do chat com botão "Aplicar no estúdio"',
        4: 'Auto-save de sessões com histórico completo',
      },
    },
    useCases: {
      title: 'Para cada tipo de criador',
      subtitle:
        'Seja você YouTuber, podcaster, professor ou marketer — o Script Master se adapta ao seu fluxo de trabalho.',
      learnMore: 'Saiba mais',
    },
    metrics: {
      title: 'Números que importam',
      subtitle:
        'Resultados reais da comunidade de criadores que usam o Script Master todos os dias.',
    },
    demo: {
      title: 'Veja o Script Master em ação',
      subtitle:
        'Um estúdio completo no seu navegador. Escreva, gere e exporte — tudo em um único lugar.',
      toolbar: {
        audio: 'Áudio',
        video: 'Vídeo',
        images: 'Imagens',
        assistant: 'Assistente',
      },
      scriptTitle: 'Meu Roteiro — Episódio 01',
      statsLine: '{lines} linhas · ~{chars} caracteres',
      scriptLines: {
        0: 'Na era digital, o conteúdo é rei.',
        1: 'Mas nem todos têm tempo para gravar.',
        2: 'Com inteligência artificial, qualquer texto vira voz.',
        3: 'E qualquer voz, vira uma história contada.',
      },
      generateButton: 'Gerar áudio',
      tryFree: 'Experimente grátis',
      noCreditCard: 'Sem cartão de crédito · Configuração em 30 segundos',
    },
    testimonials: {
      title: 'O que nossos criadores dizem',
      subtitle:
        'Milhares de criadores já usam o Script Master para transformar ideias em conteúdo profissional.',
    },
    howItWorks: {
      title: 'Como Funciona',
      subtitle:
        'Três passos para transformar seu roteiro em conteúdo profissional.',
    },
    steps: {
      1: {
        title: 'Escreva seu roteiro',
        description:
          'Use o editor integrado ou cole seu texto. O assistente IA pode ajudar a melhorar seu roteiro.',
      },
      2: {
        title: 'Gere com IA',
        description:
          'Um clique para transformar seu roteiro em áudio, imagens e vídeo com Gemini.',
      },
      3: {
        title: 'Exporte e compartilhe',
        description:
          'Baixe seu áudio WAV, vídeo MP4/WebM ou imagens PNG em alta resolução.',
      },
    },
    moreFeatures: {
      title: 'E Muito Mais',
      cards: {
        multiSpeaker: {
          title: 'Multi-speaker',
          description:
            'Suporte a 2 locutores com configuração independente de voz e nome.',
        },
        chunking: {
          title: 'Chunking Inteligente',
          description:
            'Divisão otimizada via LLM + fallback programático. Limite de 500 chars por chunk.',
        },
        dualStorage: {
          title: 'Dual Storage',
          description:
            'Firestore (autenticado) + IndexedDB (local) com migração automática.',
        },
      },
    },
    cta: {
      title: 'Comece a criar agora',
      subtitle: 'Crie sua primeira narração gratuitamente. Sem cartão de crédito.',
      button: 'Começar agora',
    },
  },

  // ── Funcionalidades ────────────────────────────────────────────────────
  features: {
    hero: {
      title: 'Tudo que você precisa para criar',
      subtitle:
        'Explore todas as ferramentas integradas do Script Master para transformar seus roteiros em conteúdo profissional.',
      cta: 'Começar Grátis',
      ctaSecondary: 'Ver preços',
    },
    sections: {
      tts: 'Estúdio de Voz (TTS)',
      video: 'Renderização de Vídeo',
      images: 'Geração de Imagens',
      speedPaint: 'Speed Paint & Animação',
      assistant: 'Assistente IA',
      platform: 'Plataforma',
    },
    ttsShowcase: {
      title: 'Áudio Profissional com Gemini TTS',
      description:
        'Nosso motor de TTS usa o modelo mais avançado do Gemini para gerar narrações naturais com controle total sobre todos os parâmetros de voz.',
      benefits: {
        0: 'Suporte a 14+ parâmetros de estúdio no Inspector',
        1: 'Detecção automática de cenas via análise RMS do áudio gerado',
        2: 'Calibra automática do threshold de silêncio em até 3 iterações',
        3: 'Retry inteligente: 3 tentativas com jitter e backoff exponencial',
        4: 'Voice previews estáticos WAV para playback instantâneo',
      },
    },
    videoShowcase: {
      title: 'Vídeo Sem Servidor',
      description:
        'Toda a renderização acontece no seu navegador. Nenhum upload de vídeo, nenhum custo de processamento. Total privacidade e controle.',
      benefits: {
        0: 'Codec fallback: H.264+AAC+MP4 > H.264 > VP8+Opus+WebM',
        1: 'Transcrição Whisper WASM embutida (sem backend)',
        2: 'Editor inline de estilo de legendas (fontSize, padding, borderRadius, opacity)',
        3: 'Waveform overlay que desabilita durante exportação para performance',
        4: 'Canvas patch para correção de bug font-stretch no Remotion',
      },
    },
    imagesShowcase: {
      title: 'Imagens com Referência Visual',
      description:
        'Gere imagens com Gemini usando prompts textuais e, opcionalmente, uma imagem de referência para guiar o estilo e composição.',
      benefits: {
        0: '8 aspect ratios: 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 21:9',
        1: 'Frameworks visuais: cinema/fotografia ou whiteboard',
        2: 'Geração de cenas automática a partir do roteiro',
        3: 'Persistência dual: Firestore + IndexedDB',
      },
    },
    cta: {
      title: 'Pronto para criar?',
      subtitle: 'Comece a usar todas essas features gratuitamente.',
      button: 'Começar Grátis',
    },
  },

  // ── Preços ─────────────────────────────────────────────────────────────
  pricing: {
    hero: {
      title: 'Escolha o plano ideal para você',
      subtitle: 'Comece grátis, sem cartão de crédito. Cancele quando quiser.',
      cta: 'Começar Grátis',
      ctaSecondary: 'Comparar planos',
    },
    billing: {
      monthly: 'Mensal',
      annual: 'Anual',
      ariaLabel: 'Ciclo de pagamento',
    },
    plans: {
      free: {
        name: 'Gratuito',
        priceSubtitle: 'para sempre',
        description: 'Perfeito para experimentar e projetos pessoais',
        cta: 'Começar grátis',
        features: {
          0: 'Geração de áudio com TTS',
          1: 'Geração de imagens com IA',
          2: 'Exportação de vídeo (até 720p)',
          3: 'Biblioteca de projetos',
          4: 'Assistente IA',
          5: '5 projetos no total',
        },
      },
      pro: {
        name: 'Pro',
        priceSubtitle: '/mês',
        description: 'Para criadores que produzem conteúdo regularmente',
        cta: 'Assinar Pro',
        features: {
          0: 'Tudo do plano Gratuito',
          1: 'Multi-speaker (2 locutores)',
          2: 'Mídia stock ilimitada',
          3: 'Exportação de vídeo até 4K',
          4: 'Fila prioritária de geração',
          5: '100 gerações/mês por recurso',
          6: '50 projetos no total',
        },
      },
      business: {
        name: 'Business',
        priceSubtitle: '/mês',
        description: 'Para equipes e produção profissional',
        cta: 'Em breve',
        features: {
          0: 'Tudo do plano Pro',
          1: 'Limites ilimitados',
          2: 'Armazenamento ilimitado',
          3: 'Suporte prioritário',
          4: 'Scripts de até 50K caracteres',
        },
      },
    },
    tooltip: {
      comingSoon: 'Pagamentos em breve — fique ligado nas novidades!',
    },
    disclaimer:
      'Os limites por plano ainda não são aplicados automaticamente. Todos os recursos estão disponíveis para uso durante o período de desenvolvimento.',
    comparison: {
      title: 'Compare os planos em detalhes',
      subtitle:
        'Veja lado a lado tudo que cada plano oferece para escolher o melhor para suas necessidades.',
      ariaLabel: 'Comparação de planos',
      feature: 'Funcionalidade',
    },
    unlimited: 'Ilimitado',
    faq: {
      title: 'Perguntas frequentes sobre preços',
    },
    cta: {
      title: 'Comece grátis, sem cartão de crédito',
      subtitle: 'Crie sua primeira narração gratuitamente. Sem compromisso, sem cartão.',
      button: 'Entrar com Google',
    },
  },

  // ── FAQ ────────────────────────────────────────────────────────────────
  faq: {
    hero: {
      title: 'Perguntas Frequentes',
      subtitle:
        'Encontre respostas rápidas para as dúvidas mais comuns sobre o Script Master.',
      cta: 'Criar conta gratuita',
      ctaSecondary: 'Ver planos',
    },
    categories: {
      ariaLabel: 'Categorias de perguntas frequentes',
      general: 'Geral',
      pricing: 'Preços',
      technical: 'Técnico',
      account: 'Conta',
    },
    stillHaveQuestions: {
      title: 'Ainda tem dúvidas?',
      text: 'Não encontrou o que procurava? Entre em contato com nossa equipe e responderemos o mais rápido possível.',
      button: 'Fale conosco',
    },
    cta: {
      title: 'Pronto para começar?',
      subtitle:
        'Crie sua primeira narração gratuitamente. Sem compromisso, sem cartão de crédito.',
      button: 'Começar agora',
    },
  },

  // ── Contato ────────────────────────────────────────────────────────────
  contact: {
    hero: {
      title: 'Fale Conosco',
      subtitle:
        'Estamos aqui para ajudar. Envie sua dúvida, sugestão ou reporte um problema e responderemos em até 24h úteis.',
      cta: 'Enviar mensagem',
      ctaSecondary: 'Ver preços',
    },
    info: {
      title: 'Informações de contato',
      email: { label: 'Email', value: 'contato@scriptmaster.app' },
      response: { label: 'Resposta', value: 'Em até 24h úteis' },
      language: { label: 'Idioma', value: 'Português (Brasil)' },
      socials: {
        title: 'Siga nas redes sociais',
      },
    },
    form: {
      title: 'Envie uma mensagem',
      alert: 'Ao enviar, seu cliente de email será aberto com os dados preenchidos. Se preferir, envie diretamente para contato@scriptmaster.app.',
      name: 'Seu nome',
      namePlaceholder: 'João da Silva',
      nameRequired: 'Nome é obrigatório',
      email: 'Seu email',
      emailPlaceholder: 'joao@exemplo.com',
      emailRequired: 'Email é obrigatório',
      emailInvalid: 'Formato de email inválido',
      subject: 'Assunto',
      message: 'Sua mensagem',
      messagePlaceholder: 'Descreva sua dúvida, sugestão ou problema...',
      messageRequired: 'Mensagem é obrigatória',
      submit: 'Enviar mensagem',
      snackbar:
        'Seu cliente de email deve abrir automaticamente. Verifique se abriu corretamente.',
    },
    subjects: {
      general: 'Dúvida geral',
      support: 'Suporte técnico',
      bugs: 'Reportar um bug',
      featureRequest: 'Sugestão de funcionalidade',
      partnership: 'Parceria comercial',
      other: 'Outro assunto',
    },
    defaultSubject: 'Contato via Site',
    cta: {
      title: 'Pronto para começar?',
      subtitle: 'Crie sua primeira narração gratuitamente. Sem compromisso, sem cartão.',
      button: 'Começar agora',
    },
  },

  // ── Sobre ──────────────────────────────────────────────────────────────
  about: {
    hero: {
      title: 'Sobre o Script Master',
      subtitle:
        'Conheça a história, os valores e o roadmap da plataforma que está transformando a produção de conteúdo com inteligência artificial.',
      cta: 'Criar conta gratuita',
      ctaSecondary: 'Ver Funcionalidades',
      alt: 'Ilustração do Script Master',
    },
    mission: {
      title: 'Nossa Missão',
      text: 'Democratizar a produção de conteúdo de áudio e vídeo, permitindo que qualquer pessoa transforme suas ideias em produções profissionais com o poder da inteligência artificial.',
    },
    vision: {
      title: 'Nossa Visão',
      text: 'Ser a plataforma líder em criação de conteúdo assistida por IA no Brasil, reconhecida pela qualidade, simplicidade e inovação.',
    },
    values: {
      title: 'Nossos Valores',
      subtitle:
        'Três pilares que guiam cada decisão e funcionalidade da plataforma.',
      creativity: {
        title: 'Criatividade',
        description:
          'Acreditamos que a tecnologia deve amplificar a criatividade humana, não substituí-la. Por isso, construímos ferramentas que dão poder ao criador.',
      },
      simplicity: {
        title: 'Simplicidade',
        description:
          'Transformar roteiros em produções profissionais não deveria ser complicado. Cada funcionalidade é pensada para ser intuitiva e acessível.',
      },
      innovation: {
        title: 'Inovação',
        description:
          'Estamos na fronteira da IA generativa aplicada à produção de conteúdo. Nosso compromisso é trazer o que há de mais avançado para seu dia a dia.',
      },
    },
    team: {
      title: 'Quem Somos',
      description:
        'Somos uma equipe apaixonada por tecnologia e criação de conteúdo, construindo o futuro da produção audiovisual com inteligência artificial.',
    },
    roadmap: {
      title: 'Roadmap Público',
      description: 'Conheça os marcos que já alcançamos e o que está por vir.',
      status: {
        done: 'Concluído',
        current: 'Em andamento',
        planned: 'Planejado',
      },
      items: {
        0: {
          title: 'Autenticação e Navegação',
          description: 'Login com Google e email/senha, cadastro, rotas protegidas e SEO com páginas públicas',
        },
        1: {
          title: 'Speed Paint e Vídeo Avançado',
          description: 'Animação de pintura progressiva, Web Worker para renderização, cache LRU e exportação WebM',
        },
        2: {
          title: 'Estúdio de Produção',
          description: 'Refatoração completa do estúdio com Zustand, persistência de preferências e controle granular de speed paint',
        },
        3: {
          title: 'Exclusão de Conta LGPD',
          description: 'Pipeline de exclusão completo (Firestore + Storage + IndexedDB), verificação de email e UI centralizada do assistente',
        },
        4: {
          title: 'Qualidade de Vídeo e Exportação',
          description: 'Export quality (720p–4k), estimativa de tamanho, multiplicadores de speed paint por fase e 1185 testes',
        },
        5: {
          title: 'Planos e Pagamentos',
          description: 'Integração com Stripe para assinaturas, pagamentos e gerenciamento de plano',
        },
        6: {
          title: 'Lançamento Oficial',
          description: 'Versão estável com todas as funcionalidades core e documentação completa',
        },
      },
    },
    cta: {
      title: 'Faça parte dessa história',
      subtitle:
        'Comece a criar conteúdo profissional com IA. Gratuito, sem cartão de crédito.',
      button: 'Começar agora',
    },
  },

  // ── Status ─────────────────────────────────────────────────────────────
  status: {
    hero: {
      title: 'Status dos Serviços',
      subtitle:
        'Status informativo dos serviços do Script Master. Dados atualizados manualmente.',
    },
    disclaimer:
      'Os dados exibidos nesta página são informativos e não representam monitoramento em tempo real. O status real dos serviços depende de terceiros (Google Gemini, Firebase).',
    globalStatus: 'Todos os sistemas operacionais',
    lastCheck: 'Última atualização: build {date} (dados informativos)',
    incidents: {
      title: 'Últimos 90 dias',
      resolved: 'Resolvido',
      degraded: 'Degradado',
      items: {
        0: {
          title: 'Instabilidade na geração de áudio',
          description: 'A API Gemini apresentou latência elevada por aproximadamente 2 horas, afetando a geração de áudio TTS. O serviço foi normalizado automaticamente.',
        },
        1: {
          title: 'Degradation no Firebase Storage',
          description: 'Uploads de imagens apresentaram lentidão por 45 minutos. O impacto foi limitado ao estúdio de imagens.',
        },
      },
    },
    services: {
      api: {
        name: 'API Gemini (IA)',
        description: 'Geração de áudio, imagens e assistente conversacional',
      },
      auth: {
        name: 'Firebase Auth',
        description: 'Autenticação e gerenciamento de contas',
      },
      firestore: {
        name: 'Firebase Firestore',
        description: 'Banco de dados e sincronização de projetos',
      },
      storage: {
        name: 'Firebase Storage',
        description: 'Armazenamento de áudios, imagens e vídeos',
      },
      video: {
        name: 'Renderização de Vídeo',
        description: 'Processamento client-side via WebCodecs',
      },
    },
    statusLabels: {
      operational: 'Operacional',
      degraded: 'Degradado',
      outage: 'Indisponível',
      maintenance: 'Manutenção',
    },
  },

  // ── Seletor de idioma ──────────────────────────────────────────────────
  localeSelector: {
    ariaLabel: 'Selecionar idioma',
  },

  // ── Estúdio ────────────────────────────────────────────────────────────
  studio: {
    header: {
      nav: {
        studio: 'Estúdio',
        image: 'Imagem',
        video: 'Vídeo',
        speedPaint: 'Speed Paint',
        ai: 'IA',
        library: 'Biblioteca',
        ariaNav: 'Navegação principal',
        ariaDrawerMenu: 'Menu de navegação',
        ariaOpenMenu: 'Abrir menu de navegação',
      },
      user: {
        tooltip: 'Usuário',
        alt: 'Usuário',
        fallback: 'Conta',
      },
      logout: {
        tooltip: 'Sair',
        ariaLabel: 'Sair',
        drawerLabel: 'Sair',
      },
      deleteAccount: {
        drawerLabel: 'Excluir conta',
        dialogTitle: 'Excluir conta permanentemente',
        dialogTitleDeleting: 'Excluindo conta...',
        dialogDescription: 'Esta ação não pode ser desfeita. Todos os seus projetos, áudios, imagens, vídeos, memórias e configurações serão permanentemente removidos.',
        dialogConfirm: 'Digite <strong>EXCLUIR</strong> para confirmar:',
        dialogCancel: 'Cancelar',
        dialogDelete: 'Excluir conta',
        dialogDeleting: 'Excluindo...',
      },
      login: 'Login',
    },
    actionBar: {
      ariaLabel: 'Controles de áudio e geração',
      generatingScenes: 'Gerando cenas visuais...',
      sceneProgressLabel: 'Progresso da geração de cenas visuais',
      cancelImages: 'Cancelar geração de imagens',
      synthesizingVoice: 'Sintetizando voz...',
      audioProgressLabel: 'Progresso da geração de áudio',
      pausePlayback: 'Pausar reprodução',
      startPlayback: 'Iniciar reprodução',
      videoProgress: 'Progresso do vídeo',
      audioProgress: 'Progresso do áudio',
      progressOf: '{current} de {duration}',
      exportVideoMp4: 'Exportar vídeo MP4',
      exportingVideo: 'Exportando vídeo',
      exportingVideoProgress: 'Exportando vídeo... {progress}%',
      savedToLibrary: 'Áudio salvo na biblioteca',
      saveToLibrary: 'Salvar áudio na biblioteca',
      downloadOptions: 'Opções de download',
      downloadAudio: 'Download áudio (.wav)',
      downloadAllImages: 'Download todas as imagens',
      downloadingScene: 'Baixando cena {current}/{total}...',
      scene: 'Cena {number}',
      cancel: 'Cancelar',
    },
    inspector: {
      ariaLabel: 'Configurações de voz e direção',
      voiceSection: {
        title: 'Voz do locutor',
        description: 'Escolha a assinatura vocal e organize vozes para narração ou podcast.',
        optionsCount: '{count} opções',
      },
      podcast: {
        title: 'Modo Podcast (2 vozes)',
        description: 'Permite que dois locutores interajam em um único roteiro.',
        ariaLabel: 'Ativar modo podcast com duas vozes',
        voiceATab: 'Voz A',
        voiceBTab: 'Voz B',
        nameLabel: 'Nome no roteiro',
        namePlaceholder: 'Ex: Voz A',
        namePlaceholderB: 'Ex: Voz B',
        nameRequired: 'O nome do Locutor A é obrigatório no modo podcast',
        nameHelper: 'Use exatamente o nome que aparece antes da fala no roteiro.',
        editorHint: 'No editor, escreva "{name}" antes da fala desta pessoa.',
      },
      voiceSelection: {
        ariaLabel: 'Seleção de voz',
        previewError: 'Erro ao reproduzir preview',
        previewVoice: 'Ouvir amostra da voz {voice}',
      },
      directionSection: {
        title: 'Direção de arte',
        description: 'Defina personagem, atmosfera e regras visuais para guiar a geração.',
      },
      directionFields: {
        characterLabel: 'Personagem',
        characterPlaceholder: 'Ex: "Jaz R., The Morning Hype"',
        characterHelper: 'Defina o personagem principal do roteiro',
        environmentLabel: 'Ambiente',
        environmentPlaceholder: 'Ex: "Estúdio de rádio, 10 PM. Caótico."',
        environmentHelper: 'Descreva o cenário ou ambiente da cena',
        paceLabel: 'Ritmo',
        accentLabel: 'Sotaque',
        accentPlaceholder: 'Ex: "Paulista"',
        accentHelper: 'Ex: Paulista, Mineiro, Carrioca',
        accentLimitReached: 'Limite de {limit} caracteres atingido',
        accentCounter: '{current}/{limit}',
      },
      paceOptions: {
        very_slow: 'Muito Lento',
        slow: 'Lento',
        normal: 'Normal',
        fast: 'Rápido',
        very_fast: 'Muito Rápido',
      },
      scenes: {
        title: 'Gerar cenas visuais',
        description: 'Transforma o áudio em uma sequência visual coerente para vídeo.',
        ariaLabel: 'Ativar geração de cenas visuais',
        voiceTabsAriaLabel: 'Abas de seleção de voz por locutor',
      },
      sceneFields: {
        visualIdentityLabel: 'Identidade visual do canal',
        formatLabel: 'Formato',
        frequencyLabel: 'Frequência',
        imageSelected: 'Imagem selecionada (trocar)',
        attachImage: 'Anexar imagem de personagem/cenário',
        removeRefTooltip: 'Remover imagem de referência',
        removeRefAriaLabel: 'Remover imagem de referência',
        refHelper: 'Isso ajuda a IA a manter personagens ou arte consistentes entre as cenas.',
        imageTextLanguage: {
          label: 'Idioma dos textos nas imagens',
          'pt-BR': 'Português (Brasil)',
          en: 'Inglês',
          es: 'Espanhol',
        },
      },
      visualFramework: {
        general: 'Cenário padrão (arte guiada pelo roteiro)',
        whiteboard: 'Whiteboard Master (desenho com legendas)',
      },
      sceneRatio: {
        '16:9': 'YouTube (16:9 horizontal)',
        '9:16': 'Shorts/TikTok (9:16 vertical)',
        '1:1': 'Instagram (1:1 quadrado)',
      },
      sceneDensity: {
        '15': 'Muito rápido (15s)',
        '30': 'Dinâmico (30s)',
        '60': 'Lento (1 min)',
        '120': 'Muito lento (2 min)',
      },
      referenceImage: {
        tooLarge: 'Imagem muito grande. Tamanho máximo: 10MB.',
        readError: 'Falha ao ler o arquivo. Tente outra imagem.',
      },
    },
    scriptEditor: {
      label: 'Script',
      syncedSceneChip: 'Cena visual sincronizada com a escrita',
      copyTooltip: 'Copiar roteiro',
      copiedTooltip: 'Copiado!',
      copyAriaLabel: 'Copiar roteiro',
      clearAriaLabel: 'Limpar roteiro',
      clearButton: 'Limpar',
      charCountAriaLabel: '{current} de {max} caracteres utilizados',
      placeholder: 'Comece a escrever sua história aqui...',
      editorAriaLabel: 'Editor de roteiro',
      generateButton: 'Gerar áudio',
      generateTooltip: 'Gerar áudio ({shortcut} + Enter)',
      clearConfirm: 'O roteiro será apagado permanentemente. Deseja continuar?',
    },
    studioPage: {
      settingsTab: 'Configurações',
      scriptTab: 'Roteiro',
    },
    templates: {
      title: 'Templates',
      description: 'Comece com um preset pronto e personalize depois.',
      selectHint: 'Selecione um template para preencher as configurações do estúdio.\nSeu roteiro atual será mantido.',
      allFilter: 'Todos',
      filterAriaLabel: 'Filtrar templates por categoria',
      emptyCategory: 'Nenhum template encontrado nesta categoria.',
      previewTitle: 'Exemplo de roteiro',
      appliedSettings: 'Configurações que serão aplicadas',
      applyDisclaimer: 'O template preenche as configurações acima. Seu roteiro atual será mantido.',
      cancel: 'Cancelar',
      apply: 'Aplicar template',
      patchLabels: {
        pace: 'Ritmo',
        audioProfile: 'Personagem',
        scene: 'Ambiente',
        styleNotes: 'Sotaque / Estilo',
        isMultiSpeaker: 'Modo podcast',
        speakerAName: 'Nome Locutor A',
        speakerBName: 'Nome Locutor B',
        speakerBVoice: 'Voz Locutor B',
        selectedVoice: 'Voz selecionada',
        generateScenes: 'Gerar cenas',
        sceneRatio: 'Formato',
        sceneDensity: 'Frequência de cenas',
        visualFramework: 'Identidade visual',
        script: 'Roteiro',
      },
      booleanYes: 'Sim',
      booleanNo: 'Não',
      sceneDensityValue: '{value}s por cena',
    },
    emotion: {
      label: 'Emoção da voz',
      ariaLabel: 'Seleção de emoção',
      intensity: 'Intensidade',
      intensityAriaLabel: 'Intensidade da emoção',
    },
    stockMedia: {
      title: 'Mídia Stock',
      description: 'Busque imagens prontas para usar como cenário ou referência.',
      searchPlaceholder: 'Buscar por tema, estilo ou palavra-chave...',
      searchAriaLabel: 'Buscar imagens stock',
      noResults: 'Nenhuma imagem encontrada. Tente outro termo de busca.',
      emptyState: 'Digite um termo e busque para encontrar imagens.',
      selectImage: 'Selecionar {alt}',
    },
  },

  // ── Vídeo ───────────────────────────────────────────────────────────
  video: {
    pageTitle: 'Montagem visual',
    pageDescription: 'Revise a cena atual, confira a atmosfera do vídeo e carregue projetos anteriores sem sair do fluxo.',
    preview: {
      title: 'Preview de vídeo aguardando cenas',
      description: 'Gere o áudio e as cenas no estúdio para visualizar a montagem aqui.',
      goToStudio: 'Ir para o Estúdio',
      renderError: 'Erro ao renderizar o vídeo',
      renderErrorDescription: 'Ocorreu um problema durante a composição. Tente recarregar.',
      captionVisible: 'Legenda visível',
      captionHidden: 'Legenda oculta',
      showCaption: 'Mostrar legenda',
      hideCaption: 'Ocultar legenda',
    },
  },

  // ── Assistente ──────────────────────────────────────────────────────
  assistant: {
    header: {
      title: 'Assistente criativo',
      subtitle: 'Um painel de direção criativa para lapidar roteiro, voz, memória de projeto e ajustes de cena.',
      newChat: 'Novo chat',
      openHistory: 'Abrir histórico',
      openHistoryAria: 'Abrir histórico do assistente',
      openMemories: 'Memórias e documentos',
      openMemoriesAria: 'Abrir memórias e documentos',
      openSettings: 'Persona e diretrizes',
      openSettingsAria: 'Abrir persona e diretrizes',
      cleanReading: 'Leitura limpa',
    },
    messages: {
      assistant: 'Assistente',
      you: 'Você',
      file: 'Arquivo',
      stopGeneration: 'Parar geração',
      stopGenerationAria: 'Parar geração de resposta',
      copied: 'Copiado!',
      copyText: 'Copiar texto',
      copyTextAria: 'Copiar texto da mensagem',
      malformedJson: 'O assistente sugeriu ajustes, mas o formato não pôde ser interpretado.',
      applied: 'Aplicado',
      applyToStudio: 'Aplicar no estúdio',
      savedToMemory: 'Salvo na memória',
      saveInsight: 'Salvar insight',
      emptyTitle: 'Como posso ajudar?',
      emptyDescription: 'Pergunte sobre ajustes de roteiro, sugestões de voz, ideias de cena, ou envie anexos para análise criativa.',
      suggestions: {
        adjustPace: 'Ajustar ritmo',
        suggestScene: 'Sugerir cena',
        reviewText: 'Revisar texto',
        analyzeAudio: 'Analisar áudio',
      },
      suggestionPrompts: {
        adjustPace: 'Sugira um ritmo de narração mais dinâmico para o meu roteiro, com variações de velocidade para destacar momentos importantes.',
        suggestScene: 'Crie uma descrição visual detalhada de uma cena cinematográfica que combine com um roteiro de documentário.',
        reviewText: 'Revise meu roteiro e sugira melhorias de clareza, fluidez e impacto narrativo.',
        analyzeAudio: 'Analise as características de áudio do meu roteiro e sugira o perfil de voz ideal para cada parte.',
      },
    },
    composer: {
      placeholder: 'Peça ajustes de roteiro, ideias de voz, ritmo, cena ou análise de anexos…',
      attachFile: 'Anexar arquivo',
      attachFileAria: 'Anexar arquivo',
      stopGeneration: 'Parar geração',
      send: 'Enviar',
    },
    history: {
      title: 'Histórico de chats',
      subtitle: 'Retome conversas anteriores sem perder o contexto criativo.',
      closeAria: 'Fechar histórico',
      searchPlaceholder: 'Buscar no histórico…',
      clearSearchAria: 'Limpar busca',
      noChats: 'Nenhum chat salvo ainda',
      noChatsDescription: 'Quando você conversar com o assistente, as sessões aparecem aqui para reuso rápido.',
      noResults: 'Nenhum chat encontrado',
      noResultsDescription: 'Nenhuma sessão corresponde a "{query}".',
      deleteConversation: 'Excluir conversa',
      deleteConversationAria: 'Excluir conversa',
    },
    memories: {
      title: 'Memórias e documentos',
      subtitle: 'Ensine preferências, contexto de marca e anexos que ajudam o assistente a responder melhor.',
      closeAria: 'Fechar memórias',
      addMemoryLabel: 'Adicionar memória curta',
      addMemoryPlaceholder: 'Ex.: prefiro aberturas mais curtas e narradores com tom calmo',
      saving: 'Salvando...',
      save: 'Salvar',
      knowledgeBase: 'Base de conhecimento',
      knowledgeBaseDescription: 'Envie .md, .txt ou .csv com diretrizes, documentação ou repertório que o assistente deve considerar.',
      uploading: 'Enviando...',
      attachDocument: 'Anexar documento',
      noMemories: 'Ainda não há memórias salvas',
      noMemoriesDescription: 'Salve preferências e referências para tornar as respostas mais consistentes com sua operação.',
      deleteMemory: 'Excluir memória',
      deleteMemoryAria: 'Excluir memória',
    },
    settings: {
      title: 'Persona da IA',
      subtitle: 'Defina princípios permanentes de tom, marca, formato de resposta e guardrails criativos.',
      closeAria: 'Fechar persona da IA',
      whatToWrite: 'O que vale escrever aqui',
      whatToWriteDescription: 'Ex.: tom da marca, ritmo preferido, restrições visuais, tipo de CTA, estilo de abertura, vocabulário e formato das sugestões.',
      guidelinesAlert: 'Evite regras conflitantes. Quanto mais claro o direcionamento, mais previsível fica o comportamento do assistente.',
      guidelinesLabel: 'Diretrizes permanentes',
      guidelinesPlaceholder: 'Ex.: responda com foco em retenção para YouTube, proponha roteiros enxutos, preserve linguagem clara e sempre ofereça um bloco JSON quando sugerir ajustes aplicáveis no estúdio.',
      applyGuidelines: 'Aplicar diretrizes',
    },
  },

  // ── Biblioteca ──────────────────────────────────────────────────────
  library: {
    title: 'Biblioteca',
    savedProjects: 'Projetos salvos',
    description: 'Um painel mais claro para revisar ativos do projeto, renomear versões, retomar áudio e baixar cenas sem excesso de ruído visual.',
    projectCount: '{count} projeto{plural}',
    searchPlaceholder: 'Buscar projeto...',
    clearSearchAria: 'Limpar busca',
    offlineHint: 'Sem login, a biblioteca usa armazenamento local deste navegador. Entre com sua conta para sincronizar projetos na nuvem.',
    loadError: 'Não foi possível carregar sua biblioteca. Verifique sua conexão e tente novamente.',
    emptyTitle: 'Sua biblioteca ainda está vazia',
    emptyDescription: 'Quando você salvar áudios e cenas do estúdio, os projetos aparecem aqui com acesso rápido a downloads e histórico visual.',
    noResultsTitle: 'Nenhum projeto encontrado',
    noResultsDescription: 'Nenhum projeto corresponde a "{query}". Tente outro termo de busca.',
    audio: 'Áudio',
    scenes: 'Cenas',
    hideDetails: 'Ocultar detalhes',
    showDetails: 'Ver detalhes',
    delete: 'Excluir',
    renameProject: 'Renomear projeto',
    renameProjectAria: 'Renomear projeto',
    saveName: 'Salvar nome do projeto',
    cancelRename: 'Cancelar edição do nome',
    audioVersions: 'Versões de áudio',
    noAudio: 'Nenhum áudio encontrado neste projeto.',
    generatedScenes: 'Cenas geradas',
    noImages: 'Nenhuma imagem encontrada neste projeto.',
    scene: 'Cena {number}',
    downloadSceneAria: 'Baixar cena {number}',
    originalScript: 'Roteiro original',
    playAudio: 'Reproduzir áudio',
    pauseAudio: 'Pausar áudio',
    downloadAudio: 'Baixar áudio',
    downloadAudioAria: 'Baixar áudio',
    deleteAudio: 'Excluir áudio',
    deleteAudioAria: 'Excluir áudio',
    deleteProjectTitle: 'Excluir projeto?',
    deleteProjectLoading: 'Excluindo projeto...',
    deleteProjectConfirm: 'Excluir projeto',
    deleteProjectDescription: 'Esta ação remove permanentemente o projeto, seus áudios e suas imagens associadas.',
    deleteAudioTitle: 'Excluir versão de áudio?',
    deleteAudioLoading: 'Excluindo áudio...',
    deleteAudioConfirm: 'Excluir',
    deleteAudioDescription: 'Esta ação remove permanentemente esta versão de áudio e suas cenas associadas do Storage.',
    deleteSuccess: 'Projeto excluído com sucesso. A lista não foi atualizada automaticamente.',
    updateList: 'Atualizar lista',
    renameError: 'Não foi possível renomear o projeto. Tente novamente.',
    deleteProjectError: 'Não foi possível excluir o projeto. Tente novamente.',
    deleteAudioError: 'Não foi possível excluir o áudio. Tente novamente.',
    detailError: 'Não foi possível carregar os detalhes do projeto. Verifique sua conexão e tente novamente.',
    version: 'Versão {time}',
  },

  // ── Speed Paint ─────────────────────────────────────────────────────
  speedPaint: {
    pageTitle: 'Transforme Imagens em',
    pageHighlight: 'Speed Paints',
    pageDescription: 'Envie qualquer imagem e assista a ela sendo desenhada traço por traço.\nNosso motor analisa a imagem e gera uma animação de pintura progressiva.',
  },

  // ── Estúdio de Imagem ──────────────────────────────────────────────
  imageStudio: {
    sidebarTitle: 'Estúdio de imagem',
    sidebarDescription: 'Ajuste formato, referência visual e contexto antes de gerar.',
    ratioLabel: 'Proporção',
    referenceTitle: 'Imagem de referência',
    referenceDescription: 'Útil para manter personagens, composição ou estilo visual entre gerações.',
    referenceAlt: 'Imagem de referência',
    removeReference: 'Remover referência',
    removeReferenceAria: 'Remover referência',
    uploadReference: 'Enviar imagem de referência',
    promptTip: 'Quanto mais específico o prompt, melhor a hierarquia visual, a iluminação e a fidelidade do resultado.',
    pageTitle: 'Criação visual com mais clareza',
    pageDescription: 'Uma superfície mais limpa para escrever prompts, revisar resultados e salvar o que vale reaproveitar.',
    tabAI: 'Gerar com IA',
    tabStock: 'Mídia Stock',
    promptLabel: 'Prompt da imagem',
    promptPlaceholder: 'Descreva a composição, o clima, a iluminação, o enquadramento e o estilo visual desejado.',
    stopGeneration: 'Parar geração',
    generateImage: 'Gerar imagem',
    stockReady: 'Imagem stock pronta para download ou salvamento na biblioteca.',
    resultReady: 'Resultado pronto para download ou reaproveitamento na biblioteca.',
    downloadImage: 'Baixar imagem',
    savedToLibrary: 'Salvo na biblioteca',
    saveToLibrary: 'Salvar na biblioteca',
    emptyTitle: 'Sua prévia aparece aqui',
    emptyDescription: 'Escreva um prompt claro e, se quiser, anexe uma referência para orientar estilo, composição e consistência visual.',
    savedImages: 'Imagens salvas',
    savedImagesDescription: 'Suas imagens geradas anteriormente. Baixe ou exclua conforme necessário.',
    noSavedImages: 'Nenhuma imagem salva ainda. Gere e salve sua primeira imagem acima.',
    savedCloud: 'Imagem salva na nuvem com sucesso.',
    savedLocal: 'Imagem salva na biblioteca local.',
    saveError: 'Erro ao salvar na biblioteca.',
    loadError: 'Não foi possível carregar as imagens salvas. Verifique sua conexão e tente novamente.',
    deleteTitle: 'Excluir imagem?',
    deleteLoading: 'Excluindo imagem...',
    deleteConfirm: 'Excluir imagem',
    deleteDescription: 'Esta ação remove permanentemente a imagem da biblioteca. A operação não pode ser desfeita.',
    deleteError: 'Erro ao excluir a imagem. Tente novamente.',
    stockAlt: 'Imagem stock selecionada',
    generatedAlt: 'Imagem gerada',
    deleteImage: 'Excluir imagem',
    downloadAria: 'Baixar {name}',
    deleteAria: 'Excluir {name}',
  },

  // ── Onboarding ──────────────────────────────────────────────────────────
  onboarding: {
    welcome: {
      title: 'Bem-vindo ao Script Master!',
      description: 'Transforme seus roteiros em áudio profissional, cenas visuais e vídeos\ncom inteligência artificial. Vamos te mostrar como em poucos passos.',
      featureTTS: 'TTS com IA',
      featureScenes: 'Cenas visuais',
      featureVideo: 'Vídeo automático',
      tourHint: 'Tour rápido de 1 minuto — você pode pular quando quiser',
      skip: 'Pular',
      startTour: 'Iniciar tour',
    },
    tooltip: {
      stepOf: 'Passo {current} de {total}',
      closeTour: 'Fechar tour',
      previous: 'Anterior',
      next: 'Próximo',
      finish: 'Concluir',
    },
  },

  // ── SEO (meta tags por página) ─────────────────────────────────────
  seo: {
    landing: {
      title: 'Transforme roteiros em arte com IA | Script Master',
      description: 'Plataforma completa para criar áudio, vídeo e imagens profissionais a partir de roteiros com Gemini AI. Tudo client-side.',
    },
    about: {
      title: 'Sobre o Script Master',
      description: 'Conheça a história, os valores e o roadmap da plataforma que está transformando a produção de conteúdo com inteligência artificial.',
    },
    contact: {
      title: 'Fale Conosco | Script Master',
      description: 'Envie sua dúvida, sugestão ou reporte um problema. Resposta em até 24h úteis.',
    },
    faq: {
      title: 'Perguntas Frequentes | Script Master',
      description: 'Encontre respostas rápidas para as dúvidas mais comuns sobre o Script Master.',
    },
    features: {
      title: 'Funcionalidades | Script Master',
      description: 'Conheça todas as funcionalidades do Script Master: geração de áudio, imagens, vídeos, assistente IA e mais.',
    },
    pricing: {
      title: 'Preços | Script Master',
      description: 'Escolha o plano ideal para você. Comece grátis, sem cartão de crédito.',
    },
    status: {
      title: 'Status dos Serviços | Script Master',
      description: 'Status informativo dos serviços do Script Master. Dados atualizados manualmente.',
    },
  },

  // ── FAQ Items (FaqPage) ─────────────────────────────────────────────
  faqItems: {
    general: {
      0: {
        question: 'O que é o Script Master?',
        answer: 'O Script Master é uma plataforma completa para transformar roteiros em áudio profissional com vozes geradas por IA. Além disso, você pode gerar imagens, renderizar vídeos e contar com um assistente IA para ajudar na criação de conteúdo.',
      },
      1: {
        question: 'Preciso de conta para usar?',
        answer: 'Você pode explorar o Script Master sem conta, mas para salvar projetos, gerar áudio e acessar todas as funcionalidades, é necessário criar uma conta gratuita. Oferecemos login com Google ou por email e senha.',
      },
      2: {
        question: 'Meus dados estão seguros?',
        answer: 'Sim. Utilizamos o Firebase do Google com criptografia em trânsito e em repouso. Seus roteiros e projetos são armazenados de forma segura e nunca são compartilhados com terceiros.',
      },
      3: {
        question: 'Funciona offline?',
        answer: 'O Script Master é uma aplicação web (SPA) que funciona no navegador. Alguns recursos como reprodução de áudios já gerados funcionam offline graças ao Service Worker, mas a geração de conteúdo requer conexão com a internet.',
      },
      4: {
        question: 'Quais navegadores são suportados?',
        answer: 'Recomendamos Google Chrome, Microsoft Edge ou Firefox nas versões mais recentes. O Safari tem suporte parcial — algumas funcionalidades avançadas como renderização de vídeo podem não funcionar corretamente.',
      },
      5: {
        question: 'Posso usar no celular?',
        answer: 'Sim! O Script Master é responsivo e funciona em dispositivos móveis. No entanto, a experiência de edição de roteiros e renderização de vídeo é otimizada para telas maiores.',
      },
    },
    technical: {
      0: {
        question: 'Quais vozes estão disponíveis?',
        answer: 'Oferecemos diversas vozes em português brasileiro com diferentes tons e estilos: narrativa, conversacional, jornalística e mais. Você pode ouvir previews de cada voz antes de gerar seu áudio.',
      },
      1: {
        question: 'Qual o limite de tamanho do roteiro?',
        answer: 'O limite máximo é de 50.000 caracteres por roteiro. Roteiros maiores que 500 caracteres são automaticamente divididos em segmentos para garantir a consistência da voz.',
      },
      2: {
        question: 'Como funcionam os vídeos?',
        answer: 'Os vídeos são renderizados diretamente no seu navegador usando WebCodecs. Você pode combinar áudio gerado, imagens de cena e legendas automáticas. A renderização é 100% client-side — seu roteiro nunca sai do seu dispositivo.',
      },
      3: {
        question: 'Qual a qualidade do áudio gerado?',
        answer: 'O áudio é gerado em WAV 24kHz mono 16-bit PCM, com qualidade profissional.',
      },
      4: {
        question: 'Como funcionam as legendas automáticas?',
        answer: 'Usamos o modelo Whisper para transcrição automática do áudio. As legendas são geradas com timestamps precisos e podem ser editadas manualmente no editor de legendas.',
      },
    },
    account: {
      0: {
        question: 'Como faço login?',
        answer: 'Você pode fazer login de duas formas: com sua conta Google (um clique) ou com email e senha. Clique em "Entrar" no canto superior direito para acessar sua conta. Também oferecemos recuperação de senha caso esqueça.',
      },
      1: {
        question: 'Posso usar em mais de um dispositivo?',
        answer: 'Sim! Seus projetos e configurações são sincronizados via Firebase. Basta fazer login em qualquer dispositivo para acessar seu conteúdo.',
      },
      2: {
        question: 'Como excluo minha conta?',
        answer: 'Você pode excluir sua conta diretamente pelo app: clique no seu avatar no canto superior direito e selecione "Excluir conta". Todos os seus dados (projetos, áudios, chats, memórias e configurações) são removidos permanentemente em conformidade com a LGPD. Também é possível solicitar a exclusão pelo formulário de contato.',
      },
    },
  },

  // ── Pricing (comparação de planos) ──────────────────────────────────
  pricingComparison: {
    features: {
      0: { name: 'Geração de áudio TTS', free: 'Até 10 roteiros/mês', pro: 'Ilimitado', business: 'Ilimitado' },
      1: { name: 'Geração de imagens', free: 'Até 20/mês', pro: 'Ilimitado', business: 'Ilimitado' },
      2: { name: 'Renderização de vídeo', free: 'Até 3/mês', pro: 'Ilimitado', business: 'Ilimitado' },
      3: { name: 'Assistente IA', free: 'Até 50 mensagens/mês', pro: 'Ilimitado', business: 'Ilimitado' },
      4: { name: 'Multi-speaker', free: '2 vozes', pro: '2 vozes', business: '2 vozes' },
      5: { name: 'Speed Paint', free: 'Até 5/mês', pro: 'Ilimitado', business: 'Ilimitado' },
      6: { name: 'Biblioteca', free: 'Local (IndexedDB)', pro: 'Nuvem + local', business: 'Nuvem + local' },
      7: { name: 'Legendas automáticas', free: 'Whisper tiny', pro: 'Whisper completo', business: 'Whisper completo' },
      8: { name: 'Suporte', free: 'Comunidade', pro: 'Prioritário', business: 'Dedicado' },
    },
  },

  // ── Features (FuncionalidadesPage — cards por seção) ────────────────
  featureItems: {
    audio: {
      0: { title: 'Geração de Áudio TTS', description: 'Transforme roteiros em áudio profissional com Gemini TTS (24kHz mono 16-bit PCM).' },
      1: { title: 'Chunking Inteligente', description: 'Divisão otimizada via LLM + fallback programático. Limite de 500 chars por chunk.' },
      2: { title: 'Multi-speaker', description: 'Suporte a 2 locutores (Speaker A + B) com configuração independente de voz e nome.' },
      3: { title: 'Controle de Voz', description: 'Seleção de voz, pace, pitch e audio profile (podcast, audiobook, conversa, narração).' },
    },
    video: {
      0: { title: 'Composição de Vídeo', description: 'Vídeos client-side com Remotion e WebCodecs. Sem backend, sem custo de renderização.' },
      1: { title: 'Legendas Automáticas', description: '3 fontes de sincronização: segment-timing > whisper-aligned > proportional.' },
      2: { title: '3 Resoluções', description: '16:9 (1920x1080), 9:16 (1080x1920) e 1:1 (1080x1080).' },
    },
    image: {
      0: { title: 'Estúdio de Imagem', description: 'Geração de imagens com Gemini a partir de prompts + referência visual opcional.' },
      1: { title: '8 Aspect Ratios', description: '1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 21:9.' },
      2: { title: 'Galeria Integrada', description: 'Histórico de imagens geradas com visualização, exclusão e persistência dual.' },
    },
    assistant: {
      0: { title: 'Chat Conversacional', description: 'Streaming com Gemini, memórias, anexos (5 por msg: imagem 10MB, documento 5MB).' },
      1: { title: 'Integração com Estúdio', description: 'Modelo sugere alterações em bloco JSON, botão "Aplicar no estúdio" para patch parcial.' },
      2: { title: 'Sistema de Memória', description: 'Memórias curtas (texto) + upload de documentos (.md/.txt/.csv até 500KB).' },
    },
    library: {
      0: { title: 'Gestão de Projetos', description: 'Organize áudios, cenas, vídeos e imagens em projetos com metadados completos.' },
      1: { title: 'Download Fácil', description: 'Baixe áudios WAV, vídeos MP4/WebM e imagens PNG com um clique.' },
      2: { title: 'Persistência Dual', description: 'Firestore (autenticado) + IndexedDB (local), migração automática ao logar.' },
    },
    speedPaint: {
      0: { title: 'Animação de Pintura', description: 'Upload > edge detection > clusterização BFS > vetorização > renderização progressiva.' },
      1: { title: 'Batch Processing', description: 'Fila de imagens com modos watch (auto-avança) e record (grava + avança).' },
      2: { title: 'Exportação Mídia', description: 'Export PNG (2x) e WebM (H.264 > VP9 > padrão, 12Mbps).' },
    },
  },

  // ── Landing showcases (alt texts) ───────────────────────────────────
  landingShowcases: {
    audio: { alt: 'Geração de áudio TTS com Script Master' },
    video: { alt: 'Renderização de vídeo com Script Master' },
    assistant: { alt: 'Assistente IA do Script Master' },
  },

  // ── Erros ────────────────────────────────────────────────────────────
  errors: {
    video: {
      title: 'Erro ao renderizar o vídeo',
      message: 'Ocorreu um problema durante a composição. Tente recarregar a página.',
      retry: 'Tentar novamente',
    },
  },

  // ── Billing ──────────────────────────────────────────────────────────
  billing: {
    upgrade: {
      title: 'Escolha seu plano',
      monthly: 'Mensal',
      yearly: 'Anual',
      yearlyDiscount: '-20%',
      month: 'mês',
      year: 'ano',
      currentPlan: 'Plano atual',
      recommended: 'Recomendado',
      notAvailable: 'Pagamentos não disponíveis no momento.',
    },
    badge: {
      free: 'Gratuito',
      pro: 'Pro',
      business: 'Business',
    },
    portal: {
      manageSubscription: 'Gerenciar assinatura',
      openPortal: 'Minha assinatura',
    },
    usage: {
      title: 'Uso do plano',
      audioGenerations: 'Gerações de áudio',
      imageGenerations: 'Gerações de imagem',
      videoExports: 'Exportações de vídeo',
      scriptChars: 'Caracteres de roteiro',
      storageMb: 'Armazenamento (MB)',
      unlimited: 'Ilimitado',
      of: 'de',
    },
    entitlement: {
      limitReached: 'Limite atingido',
      upgradeRequired: 'Faça upgrade para continuar',
      featureLocked: 'Funcionalidade disponível apenas nos planos pagos',
      multiSpeakerLocked: 'Multi-speaker disponível no plano Pro ou superior',
      emotionalTTSLocked: 'TTS emocional disponível no plano Pro ou superior',
      stockMediaLocked: 'Mídia stock disponível no plano Pro ou superior',
    },
  },

  // ── Image Studio (aspect ratios) ────────────────────────────────────
  imageStudioRatios: {
    square: 'Quadrado (1:1)',
    portrait: 'Retrato (9:16)',
    landscape: 'Paisagem (16:9)',
    ultraWide: 'Ultra wide (21:9)',
    vertical: 'Vertical (3:4)',
    horizontal: 'Horizontal (4:3)',
    wide: 'Wide (3:2)',
    ultraTall: 'Ultra alto (2:3)',
  },

  // ── Assistant (erros e welcome) ─────────────────────────────────────
  assistantStrings: {
    errors: {
      generic: 'Ocorreu um erro inesperado. Tente novamente.',
      nonError: 'A resposta não contém um erro reconhecível.',
      default: 'Não foi possível processar sua solicitação.',
      retry: 'Tentar novamente',
      stream: 'Erro na transmissão da resposta. Tente novamente.',
    },
    welcome: 'Como posso ajudar?',
    retryDetection: '__RETRY_DETECTED__',
  },
};
