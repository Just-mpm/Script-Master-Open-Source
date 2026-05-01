import type { TranslationDictionary } from '../types';

/**
 * Dicionário ES — Traducciones al español para Script Master.
 */
export const es: TranslationDictionary = {
  common: {
    skipToContent: 'Saltar al contenido',
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    close: 'Cerrar',
    back: 'Volver',
    next: 'Siguiente',
    skip: 'Omitir',
    tryAgain: 'Intentar de nuevo',
    learnMore: 'Más información',
    getStarted: 'Comenzar ahora',
    seeAll: 'Ver todo',
    search: 'Buscar...',
    noResults: 'No se encontraron resultados',
  },

  nav: {
    home: 'Inicio',
    features: 'Funcionalidades',
    pricing: 'Precios',
    faq: 'FAQ',
    about: 'Acerca de',
    contact: 'Contacto',
    login: 'Iniciar sesión',
    register: 'Crear cuenta',
    openApp: 'Abrir App',
    logout: 'Cerrar sesión',
    ariaNav: 'Navegación pública',
    ariaMenu: 'Menú',
    ariaDrawerMenu: 'Menú de navegación',
  },

  footer: {
    description:
      'Convierte guiones en arte con IA. Audio, video e imágenes profesionales generados por Gemini.',
    copyright: 'Script Master. Todos los derechos reservados.',
    madeWith: 'Hecho con IA y Gemini',
    productGroup: 'Producto',
    companyGroup: 'Empresa',
    legalGroup: 'Legal',
    links: {
      features: 'Funcionalidades',
      pricing: 'Precios',
      faq: 'Preguntas Frecuentes',
      status: 'Estado',
      about: 'Acerca de',
      contact: 'Contacto',
      email: 'Email',
      terms: 'Términos de Uso',
      privacy: 'Privacidad',
      cookies: 'Cookies',
    },
  },

  landing: {
    hero: {
      title: 'Convierte guiones en arte con IA',
      subtitle:
        'Plataforma completa para crear audio, video e imágenes profesionales a partir de guiones. Todo del lado del cliente con Gemini AI.',
      cta: 'Crear cuenta gratuita',
      ctaSecondary: 'Ver Funcionalidades',
      alt: 'Ilustración de Script Master — convirtiendo guiones en arte con IA',
    },
    socialProof: {
      label: 'Powered by Gemini AI',
      sublabel: 'TTS, generación de imágenes y asistente conversacional',
    },
    features: {
      title: 'Todo lo que necesitas para crear',
      subtitle:
        'Seis herramientas integradas en una sola plataforma para transformar tus ideas en contenido profesional.',
    },
    featureCards: {
      voice: {
        title: 'Voz con IA',
        description:
          'Transforma guiones en audio profesional con Gemini TTS. Control de voz, ritmo y multi-locutor.',
      },
      video: {
        title: 'Video Automático',
        description:
          'Crea videos del lado del cliente con subtítulos, transiciones y waveform. Sin backend.',
      },
      images: {
        title: 'Generación de Imágenes',
        description:
          '8 aspect ratios, referencia visual y galería completa con persistencia en la nube.',
      },
      speedPaint: {
        title: 'Speed Paint',
        description:
          'Animación de pintura progresiva con detección de bordes, procesamiento por lotes y exportación.',
      },
      assistant: {
        title: 'Asistente IA',
        description:
          'Chat con streaming, memorias, archivos adjuntos e integración directa con el estudio de producción.',
      },
      library: {
        title: 'Biblioteca',
        description:
          'Gestión completa de proyectos con audios, escenas, videos y persistencia dual.',
      },
    },
    ttsShowcase: {
      title: 'Voz Profesional con Gemini TTS',
      description:
        'Transforma cualquier guion en narración profesional con voces naturales y control total sobre ritmo, tono y perfil de audio.',
      benefits: {
        0: 'Multi-locutor con 2 narradores independientes',
        1: 'Detección automática de escenas mediante análisis de silencio (RMS)',
        2: 'Control de ritmo, tono y perfil de audio (podcast, audiolibro, narración)',
        3: 'Previews de voz disponibles para cada voz',
        4: 'Audio de alta calidad 24kHz mono 16-bit PCM',
      },
    },
    videoShowcase: {
      title: 'Video del Lado del Cliente con Remotion',
      description:
        'Renderiza videos completos directamente en tu navegador. Sin servidor, sin costo de renderización. WebCodecs + Whisper para subtítulos automáticos.',
      benefits: {
        0: 'Fallback de codec: H.264+AAC+MP4 > H.264 sin audio > VP8+Opus+WebM',
        1: 'Subtítulos automáticos con Whisper WASM (3 fuentes de sincronización)',
        2: 'Crossfade entre escenas con spring animation (400ms overlap)',
        3: '3 resoluciones: 16:9, 9:16, 1:1',
        4: 'Waveform overlay sincronizado con el video',
      },
    },
    assistantShowcase: {
      title: 'Asistente IA Integrado',
      description:
        'Chat conversacional con streaming de Gemini, memorias a largo plazo e integración directa con el estudio. El asistente sugiere cambios que aplicas con un clic.',
      benefits: {
        0: 'Streaming en tiempo real con Gemini 3.1 Flash',
        1: 'Sistema de memoria: textos cortos + carga de documentos (.md, .txt, .csv)',
        2: 'Adjuntos: 5 por mensaje (imágenes 10MB, documentos 5MB)',
        3: 'Extracción de JSON del chat con botón "Aplicar en el estudio"',
        4: 'Auto-guardado de sesiones con historial completo',
      },
    },
    useCases: {
      title: 'Para cada tipo de creador',
      subtitle:
        'Ya seas YouTuber, podcaster, profesor o marketer — Script Master se adapta a tu flujo de trabajo.',
      learnMore: 'Más información',
    },
    metrics: {
      title: 'Números que importan',
      subtitle:
        'Resultados reales de la comunidad de creadores que usan Script Master todos los días.',
    },
    demo: {
      title: 'Ve Script Master en acción',
      subtitle:
        'Un estudio completo en tu navegador. Escribe, genera y exporta — todo en un solo lugar.',
      toolbar: {
        audio: 'Audio',
        video: 'Video',
        images: 'Imágenes',
        assistant: 'Asistente',
      },
      scriptTitle: 'Mi Guion — Episodio 01',
      statsLine: '{lines} líneas · ~{chars} caracteres',
      scriptLines: {
        0: 'En la era digital, el contenido es rey.',
        1: 'Pero no todos tienen tiempo para grabar.',
        2: 'Con inteligencia artificial, cualquier texto se convierte en voz.',
        3: 'Y cualquier voz, se convierte en una historia contada.',
      },
      generateButton: 'Generar audio',
      tryFree: 'Probar gratis',
      noCreditCard: 'Sin tarjeta de crédito · Configuración en 30 segundos',
    },
    testimonials: {
      title: 'Lo que dicen nuestros creadores',
      subtitle:
        'Miles de creadores ya usan Script Master para transformar ideas en contenido profesional.',
    },
    howItWorks: {
      title: 'Cómo Funciona',
      subtitle:
        'Tres pasos para transformar tu guion en contenido profesional.',
    },
    steps: {
      1: {
        title: 'Escribe tu guion',
        description:
          'Usa el editor integrado o pega tu texto. El asistente IA puede ayudar a mejorar tu guion.',
      },
      2: {
        title: 'Genera con IA',
        description:
          'Un clic para transformar tu guion en audio, imágenes y video con Gemini.',
      },
      3: {
        title: 'Exporta y comparte',
        description:
          'Descarga tu audio WAV, video MP4/WebM o imágenes PNG en alta resolución.',
      },
    },
    moreFeatures: {
      title: 'Y Mucho Más',
      cards: {
        multiSpeaker: {
          title: 'Multi-locutor',
          description:
            'Soporte para 2 locutores con configuración independiente de voz y nombre.',
        },
        chunking: {
          title: 'Chunking Inteligente',
          description:
            'División optimizada vía LLM + fallback programático. Límite de 500 caracteres por chunk.',
        },
        dualStorage: {
          title: 'Dual Storage',
          description:
            'Firestore (autenticado) + IndexedDB (local) con migración automática.',
        },
      },
    },
    cta: {
      title: 'Empieza a crear ahora',
      subtitle: 'Crea tu primera narración gratuitamente. Sin tarjeta de crédito.',
      button: 'Comenzar ahora',
    },
  },

  features: {
    hero: {
      title: 'Todo lo que necesitas para crear',
      subtitle:
        'Explora todas las herramientas integradas de Script Master para transformar tus guiones en contenido profesional.',
      cta: 'Empezar Gratis',
      ctaSecondary: 'Ver precios',
    },
    sections: {
      tts: 'Estudio de Voz (TTS)',
      video: 'Renderización de Video',
      images: 'Generación de Imágenes',
      speedPaint: 'Speed Paint y Animación',
      assistant: 'Asistente IA',
      platform: 'Plataforma',
    },
    ttsShowcase: {
      title: 'Audio Profesional con Gemini TTS',
      description:
        'Nuestro motor de TTS usa el modelo más avanzado de Gemini para generar narraciones naturales con control total sobre todos los parámetros de voz.',
      benefits: {
        0: 'Soporte para 14+ parámetros de estudio en el Inspector',
        1: 'Detección automática de escenas mediante análisis RMS del audio generado',
        2: 'Calibración automática del umbral de silencio en hasta 3 iteraciones',
        3: 'Reintentos inteligentes: 3 intentos con jitter y backoff exponencial',
        4: 'Previews de voz estáticos WAV para reproducción instantánea',
      },
    },
    videoShowcase: {
      title: 'Video Sin Servidor',
      description:
        'Toda la renderización ocurre en tu navegador. Sin carga de video, sin costo de procesamiento. Total privacidad y control.',
      benefits: {
        0: 'Fallback de codec: H.264+AAC+MP4 > H.264 > VP8+Opus+WebM',
        1: 'Transcripción Whisper WASM integrada (sin backend)',
        2: 'Editor inline de estilo de subtítulos (fontSize, padding, borderRadius, opacity)',
        3: 'Waveform overlay que se deshabilita durante la exportación para rendimiento',
        4: 'Canvas patch para corrección de bug font-stretch en Remotion',
      },
    },
    imagesShowcase: {
      title: 'Imágenes con Referencia Visual',
      description:
        'Genera imágenes con Gemini usando prompts de texto y, opcionalmente, una imagen de referencia para guiar el estilo y composición.',
      benefits: {
        0: '8 aspect ratios: 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 21:9',
        1: 'Frameworks visuales: cine/fotografía o pizarra',
        2: 'Generación automática de escenas a partir del guion',
        3: 'Persistencia dual: Firestore + IndexedDB',
      },
    },
    cta: {
      title: '¿Listo para crear?',
      subtitle: 'Empieza a usar todas estas funciones gratuitamente.',
      button: 'Empezar Gratis',
    },
  },

  pricing: {
    hero: {
      title: 'Elige el plan ideal para ti',
      subtitle: 'Empieza gratis, sin tarjeta de crédito. Cancela cuando quieras.',
      cta: 'Empezar Gratis',
      ctaSecondary: 'Comparar planes',
    },
    billing: {
      monthly: 'Mensual',
      annual: 'Anual',
      ariaLabel: 'Ciclo de facturación',
    },
    plans: {
      free: {
        name: 'Gratuito',
        priceSubtitle: 'para siempre',
        description: 'Perfecto para experimentar y proyectos personales',
        cta: 'Empezar gratis',
        features: {
          0: 'Generación de audio TTS',
          1: 'Generación de imágenes con IA',
          2: 'Exportación de video (hasta 720p)',
          3: 'Biblioteca de proyectos',
          4: 'Asistente IA',
          5: '5 proyectos en total',
        },
      },
      pro: {
        name: 'Pro',
        priceSubtitle: '/mes',
        description: 'Para creadores que producen contenido regularmente',
        cta: 'Suscribirse a Pro',
        features: {
          0: 'Todo del plan Gratuito',
          1: 'Multi-locutor (2 narradores)',
          2: 'Medios stock ilimitados',
          3: 'Exportación de video hasta 4K',
          4: 'Fila prioritaria de generación',
          5: '100 generaciones/mes por recurso',
          6: '50 proyectos en total',
        },
      },
      business: {
        name: 'Business',
        priceSubtitle: '/mes',
        description: 'Para equipos y producción profesional',
        cta: 'Próximamente',
        features: {
          0: 'Todo del plan Pro',
          1: 'Límites ilimitados',
          2: 'Almacenamiento ilimitado',
          3: 'Soporte prioritario',
          4: 'Guiones de hasta 50K caracteres',
        },
      },
    },
    tooltip: {
      comingSoon: 'Pagamentos próximamente — ¡estate atento a las novedades!',
    },
    disclaimer:
      'Los límites por plan aún no se aplican automáticamente. Todos los recursos están disponibles durante el período de desarrollo.',
    comparison: {
      title: 'Compara los planes en detalle',
      subtitle:
        'Ve lado a lado todo lo que cada plan ofrece para elegir el mejor para tus necesidades.',
      ariaLabel: 'Comparación de planes',
      feature: 'Funcionalidad',
    },
    unlimited: 'Ilimitado',
    faq: {
      title: 'Preguntas frecuentes sobre precios',
    },
    cta: {
      title: 'Empieza gratis, sin tarjeta de crédito',
      subtitle: 'Crea tu primera narración gratuitamente. Sin compromiso, sin tarjeta.',
      button: 'Iniciar sesión con Google',
    },
  },

  faq: {
    hero: {
      title: 'Preguntas Frecuentes',
      subtitle:
        'Encuentra respuestas rápidas a las dudas más comunes sobre Script Master.',
      cta: 'Crear cuenta gratuita',
      ctaSecondary: 'Ver planes',
    },
    categories: {
      ariaLabel: 'Categorías de preguntas frecuentes',
      general: 'General',
      pricing: 'Precios',
      technical: 'Técnico',
      account: 'Cuenta',
    },
    stillHaveQuestions: {
      title: '¿Aún tienes dudas?',
      text: '¿No encontraste lo que buscabas? Contacta a nuestro equipo y responderemos lo más rápido posible.',
      button: 'Contáctanos',
    },
    cta: {
      title: '¿Listo para empezar?',
      subtitle:
        'Crea tu primera narración gratuitamente. Sin compromiso, sin tarjeta de crédito.',
      button: 'Comenzar ahora',
    },
  },

  contact: {
    hero: {
      title: 'Contáctanos',
      subtitle:
        'Estamos aquí para ayudar. Envía tu duda, sugerencia o reporta un problema y responderemos en 24 horas hábiles.',
      cta: 'Enviar mensaje',
      ctaSecondary: 'Ver precios',
    },
    info: {
      title: 'Información de contacto',
      email: { label: 'Email', value: 'contato@scriptmaster.app' },
      response: { label: 'Respuesta', value: 'En 24 horas hábiles' },
      language: { label: 'Idioma', value: 'Portugués (Brasil)' },
      socials: {
        title: 'Síguenos en redes sociales',
      },
    },
    form: {
      title: 'Enviar un mensaje',
      alert: 'Al enviar, tu cliente de email se abrirá con los datos completados. Si prefieres, envía directamente a contato@scriptmaster.app.',
      name: 'Tu nombre',
      namePlaceholder: 'Juan Pérez',
      nameRequired: 'El nombre es obligatorio',
      email: 'Tu email',
      emailPlaceholder: 'juan@ejemplo.com',
      emailRequired: 'El email es obligatorio',
      emailInvalid: 'Formato de email inválido',
      subject: 'Asunto',
      message: 'Tu mensaje',
      messagePlaceholder: 'Describe tu duda, sugerencia o problema...',
      messageRequired: 'El mensaje es obligatorio',
      submit: 'Enviar mensaje',
      snackbar:
        'Tu cliente de email debería abrirse automáticamente. Verifica si se abrió correctamente.',
    },
    subjects: {
      general: 'Duda general',
      support: 'Soporte técnico',
      bugs: 'Reportar un bug',
      featureRequest: 'Sugerencia de funcionalidad',
      partnership: 'Asociación comercial',
      other: 'Otro asunto',
    },
    defaultSubject: 'Contacto vía Sitio Web',
    cta: {
      title: '¿Listo para empezar?',
      subtitle: 'Crea tu primera narración gratuitamente. Sin compromiso, sin tarjeta.',
      button: 'Comenzar ahora',
    },
  },

  about: {
    hero: {
      title: 'Acerca de Script Master',
      subtitle:
        'Descubre la historia, los valores y el roadmap de la plataforma que está transformando la producción de contenido con inteligencia artificial.',
      cta: 'Crear cuenta gratuita',
      ctaSecondary: 'Ver Funcionalidades',
      alt: 'Ilustración de Script Master',
    },
    mission: {
      title: 'Nuestra Misión',
      text: 'Democratizar la producción de contenido de audio y video, permitiendo que cualquier persona transforme sus ideas en producciones profesionales con el poder de la inteligencia artificial.',
    },
    vision: {
      title: 'Nuestra Visión',
      text: 'Ser la plataforma líder en creación de contenido asistida por IA en Brasil, reconocida por la calidad, simplicidad e innovación.',
    },
    values: {
      title: 'Nuestros Valores',
      subtitle:
        'Tres pilares que guían cada decisión y funcionalidad de la plataforma.',
      creativity: {
        title: 'Creatividad',
        description:
          'Creemos que la tecnología debe amplificar la creatividad humana, no reemplazarla. Por eso, construimos herramientas que empoderan al creador.',
      },
      simplicity: {
        title: 'Simplicidad',
        description:
          'Transformar guiones en producciones profesionales no debería ser complicado. Cada funcionalidad está diseñada para ser intuitiva y accesible.',
      },
      innovation: {
        title: 'Innovación',
        description:
          'Estamos en la frontera de la IA generativa aplicada a la producción de contenido. Nuestro compromiso es traer lo más avanzado a tu día a día.',
      },
    },
    team: {
      title: 'Quiénes Somos',
      description:
        'Somos un equipo apasionado por la tecnología y la creación de contenido, construyendo el futuro de la producción audiovisual con inteligencia artificial.',
    },
    roadmap: {
      title: 'Roadmap Público',
      description: 'Descubre los hitos que ya hemos alcanzado y lo que está por venir.',
      status: {
        done: 'Completado',
        current: 'En progreso',
        planned: 'Planificado',
      },
      items: {
        0: {
          title: 'Autenticación y Navegación',
          description: 'Login con Google y email/contraseña, registro, rutas protegidas y SEO con páginas públicas',
        },
        1: {
          title: 'Speed Paint y Video Avanzado',
          description: 'Animación de pintura progresiva, Web Worker para renderización, caché LRU y exportación WebM',
        },
        2: {
          title: 'Estudio de Producción',
          description: 'Refactorización completa del estudio con Zustand, persistencia de preferencias y control granular de speed paint',
        },
        3: {
          title: 'Eliminación de Cuenta LGPD',
          description: 'Pipeline de eliminación completo (Firestore + Storage + IndexedDB), verificación de email y UI centralizada del asistente',
        },
        4: {
          title: 'Calidad de Video y Exportación',
          description: 'Export quality (720p–4k), estimación de tamaño, multiplicadores de speed paint por fase y 1185 tests',
        },
        5: {
          title: 'Planes y Pagos',
          description: 'Integración con Stripe para suscripciones, pagos y gestión de planes',
        },
        6: {
          title: 'Lanzamiento Oficial',
          description: 'Versión estable con todas las funcionalidades core y documentación completa',
        },
      },
    },
    cta: {
      title: 'Sé parte de esta historia',
      subtitle:
        'Empieza a crear contenido profesional con IA. Gratis, sin tarjeta de crédito.',
      button: 'Comenzar ahora',
    },
  },

  status: {
    hero: {
      title: 'Estado de los Servicios',
      subtitle:
        'Estado informativo de los servicios de Script Master. Datos actualizados manualmente.',
    },
    disclaimer:
      'Los datos mostrados en esta página son informativos y no representan monitoreo en tiempo real. El estado real de los servicios depende de terceros (Google Gemini, Firebase).',
    globalStatus: 'Todos los sistemas operativos',
    lastCheck: 'Última actualización: build {date} (datos informativos)',
    incidents: {
      title: 'Últimos 90 días',
      resolved: 'Resuelto',
      degraded: 'Degradado',
      items: {
        0: {
          title: 'Inestabilidad en la generación de audio',
          description: 'La API Gemini presentó latencia elevada por aproximadamente 2 horas, afectando la generación de audio TTS. El servicio se normalizó automáticamente.',
        },
        1: {
          title: 'Degradación en Firebase Storage',
          description: 'Las subidas de imágenes presentaron lentitud por 45 minutos. El impacto se limitó al estudio de imágenes.',
        },
      },
    },
    services: {
      api: {
        name: 'API Gemini (IA)',
        description: 'Generación de audio, imágenes y asistente conversacional',
      },
      auth: {
        name: 'Firebase Auth',
        description: 'Autenticación y gestión de cuentas',
      },
      firestore: {
        name: 'Firebase Firestore',
        description: 'Base de datos y sincronización de proyectos',
      },
      storage: {
        name: 'Firebase Storage',
        description: 'Almacenamiento de audios, imágenes y videos',
      },
      video: {
        name: 'Renderización de Video',
        description: 'Procesamiento del lado del cliente vía WebCodecs',
      },
    },
    statusLabels: {
      operational: 'Operativo',
      degraded: 'Degradado',
      outage: 'No disponible',
      maintenance: 'Mantenimiento',
    },
  },

  localeSelector: {
    ariaLabel: 'Seleccionar idioma',
  },

  studio: {
    header: {
      nav: {
        studio: 'Estudio',
        image: 'Imagen',
        video: 'Video',
        speedPaint: 'Speed Paint',
        ai: 'IA',
        library: 'Biblioteca',
        settings: 'Configuración',
        ariaNav: 'Navegación principal',
        ariaDrawerMenu: 'Menú de navegación',
        ariaOpenMenu: 'Abrir menú de navegación',
      },
      user: {
        tooltip: 'Usuario',
        alt: 'Usuario',
        fallback: 'Cuenta',
      },
      logout: {
        tooltip: 'Cerrar sesión',
        ariaLabel: 'Cerrar sesión',
        drawerLabel: 'Cerrar sesión',
      },
      deleteAccount: {
        drawerLabel: 'Eliminar cuenta',
        dialogTitle: 'Eliminar cuenta permanentemente',
        dialogTitleDeleting: 'Eliminando cuenta...',
        dialogDescription: 'Esta acción no se puede deshacer. Todos tus proyectos, audios, imágenes, videos, memorias y configuraciones serán eliminados permanentemente.',
        dialogConfirm: 'Escribe <strong>EXCLUIR</strong> para confirmar:',
        dialogCancel: 'Cancelar',
        dialogDelete: 'Eliminar cuenta',
        dialogDeleting: 'Eliminando...',
      },
      login: 'Iniciar sesión',
    },
    actionBar: {
      ariaLabel: 'Controles de audio y generación',
      generatingScenes: 'Generando escenas visuales...',
      sceneProgressLabel: 'Progreso de la generación de escenas visuales',
      cancelImages: 'Cancelar generación de imágenes',
      synthesizingVoice: 'Sintetizando voz...',
      audioProgressLabel: 'Progreso de la generación de audio',
      pausePlayback: 'Pausar reproducción',
      startPlayback: 'Iniciar reproducción',
      videoProgress: 'Progreso del video',
      audioProgress: 'Progreso del audio',
      progressOf: '{current} de {duration}',
      exportVideoMp4: 'Exportar video MP4',
      exportingVideo: 'Exportando video',
      exportingVideoProgress: 'Exportando video... {progress}%',
      savedToLibrary: 'Audio guardado en la biblioteca',
      saveToLibrary: 'Guardar audio en la biblioteca',
      downloadOptions: 'Opciones de descarga',
      downloadAudio: 'Descargar audio (.wav)',
      downloadAllImages: 'Descargar todas las imágenes',
      downloadingScene: 'Descargando escena {current}/{total}...',
      scene: 'Escena {number}',
      cancel: 'Cancelar',
    },
    inspector: {
      ariaLabel: 'Configuración de voz y dirección',
      voiceSection: {
        title: 'Voz del locutor',
        description: 'Elige la firma vocal y organiza voces para narración o podcast.',
        optionsCount: '{count} opciones',
      },
      podcast: {
        title: 'Modo Podcast (2 voces)',
        description: 'Permite que dos locutores interactúen en un solo guion.',
        ariaLabel: 'Activar modo podcast con dos voces',
        voiceATab: 'Voz A',
        voiceBTab: 'Voz B',
        nameLabel: 'Nombre en el guion',
        namePlaceholder: 'Ej: Voz A',
        namePlaceholderB: 'Ej: Voz B',
        nameRequired: 'El nombre del Locutor A es obligatorio en modo podcast',
        nameHelper: 'Usa exactamente el nombre que aparece antes de la habla en el guion.',
        editorHint: 'En el editor, escribe "{name}" antes de la habla de esta persona.',
      },
      voiceSelection: {
        ariaLabel: 'Selección de voz',
        previewError: 'Error al reproducir preview',
        previewVoice: 'Escuchar muestra de la voz {voice}',
      },
      directionSection: {
        title: 'Dirección de arte',
        description: 'Define personaje, atmósfera y reglas visuales para guiar la generación.',
      },
      directionFields: {
        characterLabel: 'Personaje',
        characterPlaceholder: 'Ej: "Jaz R., The Morning Hype"',
        characterHelper: 'Define el personaje principal del guion',
        environmentLabel: 'Ambiente',
        environmentPlaceholder: 'Ej: "Estudio de radio, 10 PM. Caótico."',
        environmentHelper: 'Describe el escenario o ambiente de la escena',
        paceLabel: 'Ritmo',
        accentLabel: 'Acento',
        accentPlaceholder: 'Ej: "Paulista"',
        accentHelper: 'Ej: Paulista, Mineiro, Carrioca',
        accentLimitReached: 'Límite de {limit} caracteres alcanzado',
        accentCounter: '{current}/{limit}',
      },
      paceOptions: {
        very_slow: 'Muy Lento',
        slow: 'Lento',
        normal: 'Normal',
        fast: 'Rápido',
        very_fast: 'Muy Rápido',
      },
      scenes: {
        title: 'Generar escenas visuales',
        description: 'Transforma el audio en una secuencia visual coherente para video.',
        ariaLabel: 'Activar generación de escenas visuales',
        voiceTabsAriaLabel: 'Pestañas de selección de voz por locutor',
      },
      sceneFields: {
        visualIdentityLabel: 'Identidad visual del canal',
        formatLabel: 'Formato',
        frequencyLabel: 'Frecuencia',
        imageSelected: 'Imagen seleccionada (cambiar)',
        attachImage: 'Adjuntar imagen de personaje/escenario',
        removeRefTooltip: 'Eliminar imagen de referencia',
        removeRefAriaLabel: 'Eliminar imagen de referencia',
        refHelper: 'Esto ayuda a la IA a mantener personajes o arte consistentes entre las escenas.',
        imageTextLanguage: {
          label: 'Idioma de los textos en las imágenes',
          'pt-BR': 'Portugués (Brasil)',
          en: 'Inglés',
          es: 'Español',
        },
      },
      visualFramework: {
        general: 'Escenario predeterminado (arte guiada por el guion)',
        whiteboard: 'Whiteboard Master (dibujo con subtítulos)',
      },
      sceneRatio: {
        '16:9': 'YouTube (16:9 horizontal)',
        '9:16': 'Shorts/TikTok (9:16 vertical)',
        '1:1': 'Instagram (1:1 cuadrado)',
      },
      sceneDensity: {
        '15': 'Muy rápido (15s)',
        '30': 'Dinámico (30s)',
        '60': 'Lento (1 min)',
        '120': 'Muy lento (2 min)',
      },
      referenceImage: {
        tooLarge: 'Imagen demasiado grande. Tamaño máximo: 10MB.',
        readError: 'Error al leer el archivo. Intenta con otra imagen.',
      },
    },
    scriptEditor: {
      label: 'Script',
      syncedSceneChip: 'Escena visual sincronizada con la escritura',
      copyTooltip: 'Copiar guion',
      copiedTooltip: '¡Copiado!',
      copyAriaLabel: 'Copiar guion',
      clearAriaLabel: 'Limpiar guion',
      clearButton: 'Limpiar',
      charCountAriaLabel: '{current} de {max} caracteres utilizados',
      placeholder: 'Empieza a escribir tu historia aquí...',
      editorAriaLabel: 'Editor de guion',
      generateButton: 'Generar audio',
      generateTooltip: 'Generar audio ({shortcut} + Enter)',
      clearConfirm: 'El guion será eliminado permanentemente. ¿Deseas continuar?',
    },
    studioPage: {
      settingsTab: 'Configuraciones',
      scriptTab: 'Guion',
    },
    templates: {
      title: 'Plantillas',
      description: 'Empieza con un preset listo y personaliza después.',
      selectHint: 'Selecciona una plantilla para llenar las configuraciones del estudio.\nTu guion actual se mantendrá.',
      allFilter: 'Todos',
      filterAriaLabel: 'Filtrar plantillas por categoría',
      emptyCategory: 'Ninguna plantilla encontrada en esta categoría.',
      previewTitle: 'Ejemplo de guion',
      appliedSettings: 'Configuraciones que serán aplicadas',
      applyDisclaimer: 'La plantilla llena las configuraciones anteriores. Tu guion actual se mantendrá.',
      cancel: 'Cancelar',
      apply: 'Aplicar plantilla',
      patchLabels: {
        pace: 'Ritmo',
        audioProfile: 'Personaje',
        scene: 'Ambiente',
        styleNotes: 'Acento / Estilo',
        isMultiSpeaker: 'Modo podcast',
        speakerAName: 'Nombre Locutor A',
        speakerBName: 'Nombre Locutor B',
        speakerBVoice: 'Voz Locutor B',
        selectedVoice: 'Voz seleccionada',
        generateScenes: 'Generar escenas',
        sceneRatio: 'Formato',
        sceneDensity: 'Frecuencia de escenas',
        visualFramework: 'Identidad visual',
        script: 'Guion',
      },
      booleanYes: 'Sí',
      booleanNo: 'No',
      sceneDensityValue: '{value}s por escena',
    },
    emotion: {
      label: 'Emoción de la voz',
      ariaLabel: 'Selección de emoción',
      intensity: 'Intensidad',
      intensityAriaLabel: 'Intensidad de la emoción',
    },
    stockMedia: {
      title: 'Mídia Stock',
      description: 'Busca imágenes listas para usar como escenario o referencia.',
      searchPlaceholder: 'Buscar por tema, estilo o palabra clave...',
      searchAriaLabel: 'Buscar imágenes stock',
      noResults: 'Ninguna imagen encontrada. Intenta con otro término de búsqueda.',
      emptyState: 'Ingresa un término y busca para encontrar imágenes.',
      selectImage: 'Seleccionar {alt}',
    },
  },

  video: {
    pageTitle: 'Composición visual',
    pageDescription: 'Revisa la escena actual, consulta la atmósfera del video y carga proyectos anteriores sin salir del flujo.',
    preview: {
      title: 'Vista previa del video esperando escenas',
      description: 'Genera el audio y las escenas en el estudio para visualizar la composición aquí.',
      goToStudio: 'Ir al Estudio',
      renderError: 'Error al renderizar el video',
      renderErrorDescription: 'Ocurrió un problema durante la composición. Intenta recargar.',
      captionVisible: 'Subtítulo visible',
      captionHidden: 'Subtítulo oculto',
      showCaption: 'Mostrar subtítulo',
      hideCaption: 'Ocultar subtítulo',
    },
  },

  assistant: {
    header: {
      title: 'Asistente creativo',
      subtitle: 'Un panel de dirección creativa para pulir guion, voz, memoria de proyecto y ajustes de escena.',
      newChat: 'Nuevo chat',
      openHistory: 'Abrir historial',
      openHistoryAria: 'Abrir historial del asistente',
      openMemories: 'Memorias y documentos',
      openMemoriesAria: 'Abrir memorias y documentos',
      openSettings: 'Persona y directrices',
      openSettingsAria: 'Abrir persona y directrices',
      cleanReading: 'Lectura limpia',
    },
    messages: {
      assistant: 'Asistente',
      you: 'Tú',
      file: 'Archivo',
      stopGeneration: 'Detener generación',
      stopGenerationAria: 'Detener generación de respuesta',
      copied: '¡Copiado!',
      copyText: 'Copiar texto',
      copyTextAria: 'Copiar texto del mensaje',
      malformedJson: 'El asistente sugirió ajustes, pero el formato no pudo ser interpretado.',
      applied: 'Aplicado',
      applyToStudio: 'Aplicar en el estudio',
      savedToMemory: 'Guardado en memoria',
      saveInsight: 'Guardar insight',
      emptyTitle: '¿Cómo puedo ayudar?',
      emptyDescription: 'Pregunta sobre ajustes de guion, sugerencias de voz, ideas de escena, o envía adjuntos para análisis creativo.',
      suggestions: {
        adjustPace: 'Ajustar ritmo',
        suggestScene: 'Sugerir escena',
        reviewText: 'Revisar texto',
        analyzeAudio: 'Analizar audio',
      },
      suggestionPrompts: {
        adjustPace: 'Sugiere un ritmo de narración más dinámico para mi guion, con variaciones de velocidad para destacar momentos importantes.',
        suggestScene: 'Crea una descripción visual detallada de una escena cinematográfica que combine con un guion de documental.',
        reviewText: 'Revisa mi guion y sugiere mejoras de claridad, fluidez e impacto narrativo.',
        analyzeAudio: 'Analiza las características de audio de mi guion y sugiere el perfil de voz ideal para cada parte.',
      },
    },
    composer: {
      placeholder: 'Pide ajustes de guion, ideas de voz, ritmo, escena o análisis de adjuntos…',
      attachFile: 'Adjuntar archivo',
      attachFileAria: 'Adjuntar archivo',
      stopGeneration: 'Detener generación',
      send: 'Enviar',
    },
    history: {
      title: 'Historial de chats',
      subtitle: 'Retoma conversaciones anteriores sin perder el contexto creativo.',
      closeAria: 'Cerrar historial',
      searchPlaceholder: 'Buscar en el historial…',
      clearSearchAria: 'Limpiar búsqueda',
      noChats: 'Ningún chat guardado aún',
      noChatsDescription: 'Cuando converse con el asistente, las sesiones aparecen aquí para reuso rápido.',
      noResults: 'Ningún chat encontrado',
      noResultsDescription: 'Ninguna sesión corresponde a "{query}".',
      deleteConversation: 'Eliminar conversación',
      deleteConversationAria: 'Eliminar conversación',
    },
    memories: {
      title: 'Memorias y documentos',
      subtitle: 'Enseña preferencias, contexto de marca y adjuntos que ayudan al asistente a responder mejor.',
      closeAria: 'Cerrar memorias',
      addMemoryLabel: 'Agregar memoria corta',
      addMemoryPlaceholder: 'Ej.: prefiero aperturas más cortas y narradores con tono calmado',
      saving: 'Guardando...',
      save: 'Guardar',
      knowledgeBase: 'Base de conocimiento',
      knowledgeBaseDescription: 'Envía .md, .txt o .csv con directrices, documentación o repertorio que el asistente debe considerar.',
      uploading: 'Enviando...',
      attachDocument: 'Adjuntar documento',
      noMemories: 'Aún no hay memorias guardadas',
      noMemoriesDescription: 'Guarda preferencias y referencias para hacer las respuestas más consistentes con tu operación.',
      deleteMemory: 'Eliminar memoria',
      deleteMemoryAria: 'Eliminar memoria',
    },
    settings: {
      title: 'Persona de la IA',
      subtitle: 'Define principios permanentes de tono, marca, formato de respuesta y guardrails creativos.',
      closeAria: 'Cerrar persona de la IA',
      whatToWrite: 'Qué vale escribir aquí',
      whatToWriteDescription: 'Ej.: tono de marca, ritmo preferido, restricciones visuales, tipo de CTA, estilo de apertura, vocabulario y formato de las sugerencias.',
      guidelinesAlert: 'Evita reglas conflictivas. Cuanto más claro el direccionamiento, más predecible será el comportamiento del asistente.',
      guidelinesLabel: 'Directrices permanentes',
      guidelinesPlaceholder: 'Ej.: responde con foco en retención para YouTube, propone guiones concisos, preserva lenguaje claro y siempre ofrece un bloque JSON cuando sugieras ajustes aplicables en el estudio.',
      applyGuidelines: 'Aplicar directrices',
    },
  },

  library: {
    title: 'Biblioteca',
    savedProjects: 'Proyectos guardados',
    description: 'Un panel más limpio para revisar activos del proyecto, renombrar versiones, retomar audio y descargar escenas sin exceso de ruido visual.',
    projectCount: '{count} proyecto{plural}',
    searchPlaceholder: 'Buscar proyecto...',
    clearSearchAria: 'Limpiar búsqueda',
    offlineHint: 'Sin inicio de sesión, la biblioteca usa almacenamiento local. Inicia sesión para sincronizar proyectos en la nube.',
    loadError: 'No se pudo cargar tu biblioteca. Verifica tu conexión e intenta de nuevo.',
    emptyTitle: 'Tu biblioteca aún está vacía',
    emptyDescription: 'Cuando guardes audios y escenas del estudio, los proyectos aparecerán aquí con acceso rápido a descargas e historial visual.',
    noResultsTitle: 'Ningún proyecto encontrado',
    noResultsDescription: 'Ningún proyecto corresponde a "{query}". Intenta con otro término de búsqueda.',
    audio: 'Audio',
    scenes: 'Escenas',
    hideDetails: 'Ocultar detalles',
    showDetails: 'Ver detalles',
    delete: 'Eliminar',
    renameProject: 'Renombrar proyecto',
    renameProjectAria: 'Renombrar proyecto',
    saveName: 'Guardar nombre del proyecto',
    cancelRename: 'Cancelar edición del nombre',
    audioVersions: 'Versiones de audio',
    noAudio: 'Ningún audio encontrado en este proyecto.',
    generatedScenes: 'Escenas generadas',
    noImages: 'Ninguna imagen encontrada en este proyecto.',
    scene: 'Escena {number}',
    downloadSceneAria: 'Descargar escena {number}',
    originalScript: 'Guion original',
    playAudio: 'Reproducir audio',
    pauseAudio: 'Pausar audio',
    downloadAudio: 'Descargar audio',
    downloadAudioAria: 'Descargar audio',
    deleteAudio: 'Eliminar audio',
    deleteAudioAria: 'Eliminar audio',
    deleteProjectTitle: '¿Eliminar proyecto?',
    deleteProjectLoading: 'Eliminando proyecto...',
    deleteProjectConfirm: 'Eliminar proyecto',
    deleteProjectDescription: 'Esta acción elimina permanentemente el proyecto, sus audios e imágenes asociadas.',
    deleteAudioTitle: '¿Eliminar versión de audio?',
    deleteAudioLoading: 'Eliminando audio...',
    deleteAudioConfirm: 'Eliminar',
    deleteAudioDescription: 'Esta acción elimina permanentemente esta versión de audio y sus escenas asociadas del Storage.',
    deleteSuccess: 'Proyecto eliminado con éxito. La lista no fue actualizada automáticamente.',
    updateList: 'Actualizar lista',
    renameError: 'No se pudo renombrar el proyecto. Intenta de nuevo.',
    deleteProjectError: 'No se pudo eliminar el proyecto. Intenta de nuevo.',
    deleteAudioError: 'No se pudo eliminar el audio. Intenta de nuevo.',
    detailError: 'No se pudo cargar los detalles del proyecto. Verifica tu conexión e intenta de nuevo.',
    version: 'Versión {time}',
  },

  speedPaint: {
    pageTitle: 'Transforma Imágenes en',
    pageHighlight: 'Speed Paints',
    pageDescription: 'Sube cualquier imagen y mira cómo es dibujada trazo por trazo.\nNuestro motor analiza la imagen y genera una animación de pintura progresiva.',
  },

  imageStudio: {
    sidebarTitle: 'Estudio de imagen',
    sidebarDescription: 'Ajusta formato, referencia visual y contexto antes de generar.',
    ratioLabel: 'Proporción',
    referenceTitle: 'Imagen de referencia',
    referenceDescription: 'Útil para mantener personajes, composición o estilo visual entre generaciones.',
    referenceAlt: 'Imagen de referencia',
    removeReference: 'Eliminar referencia',
    removeReferenceAria: 'Eliminar referencia',
    uploadReference: 'Subir imagen de referencia',
    promptTip: 'Cuanto más específico el prompt, mejor será la jerarquía visual, la iluminación y la fidelidad del resultado.',
    pageTitle: 'Creación visual con más claridad',
    pageDescription: 'Una superficie más limpia para escribir prompts, revisar resultados y guardar lo que vale reaprovechar.',
    tabAI: 'Generar con IA',
    tabStock: 'Mídia Stock',
    promptLabel: 'Prompt de la imagen',
    promptPlaceholder: 'Describe la composición, el clima, la iluminación, el encuadre y el estilo visual deseado.',
    stopGeneration: 'Detener generación',
    generateImage: 'Generar imagen',
    stockReady: 'Imagen stock lista para descarga o guardado en la biblioteca.',
    resultReady: 'Resultado listo para descarga o reaprovechamiento en la biblioteca.',
    downloadImage: 'Descargar imagen',
    savedToLibrary: 'Guardado en la biblioteca',
    saveToLibrary: 'Guardar en la biblioteca',
    emptyTitle: 'Tu vista previa aparece aquí',
    emptyDescription: 'Escribe un prompt claro y, si quieres, adjunta una referencia para guiar estilo, composición y consistencia visual.',
    savedImages: 'Imágenes guardadas',
    savedImagesDescription: 'Tus imágenes generadas anteriormente. Descarga o elimina según sea necesario.',
    noSavedImages: 'Ninguna imagen guardada aún. Genera y guarda tu primera imagen arriba.',
    savedCloud: 'Imagen guardada en la nube con éxito.',
    savedLocal: 'Imagen guardada en la biblioteca local.',
    saveError: 'Error al guardar en la biblioteca.',
    loadError: 'No se pudieron cargar las imágenes guardadas. Verifica tu conexión e intenta de nuevo.',
    deleteTitle: '¿Eliminar imagen?',
    deleteLoading: 'Eliminando imagen...',
    deleteConfirm: 'Eliminar imagen',
    deleteDescription: 'Esta acción elimina permanentemente la imagen de la biblioteca. La operación no puede deshacerse.',
    deleteError: 'Error al eliminar la imagen. Intenta de nuevo.',
    stockAlt: 'Imagen stock seleccionada',
    generatedAlt: 'Imagen generada',
    deleteImage: 'Eliminar imagen',
    downloadAria: 'Descargar {name}',
    deleteAria: 'Eliminar {name}',
  },

  onboarding: {
    welcome: {
      title: '¡Bienvenido a Script Master!',
      description: 'Transforma tus guiones en audio profesional, escenas visuales y videos\ncon inteligencia artificial. Te mostraremos cómo en pocos pasos.',
      featureTTS: 'TTS con IA',
      featureScenes: 'Escenas visuales',
      featureVideo: 'Video automático',
      tourHint: 'Tour rápido de 1 minuto — puedes saltar cuando quieras',
      skip: 'Omitir',
      startTour: 'Iniciar tour',
    },
    tooltip: {
      stepOf: 'Paso {current} de {total}',
      closeTour: 'Cerrar tour',
      previous: 'Anterior',
      next: 'Siguiente',
      finish: 'Concluir',
    },
    wizard: {
      welcomeTitle: 'Desbloquea tu potencial creativo.',
      welcomeDescription: 'Personaliza tu experiencia en 3 pasos simples. Una interfaz diseñada exclusivamente para tu flujo de trabajo.',
      welcomeButton: 'Comenzar',
      welcomeSecure: 'Conexión segura',
      profileStep: 'Paso 1',
      profileTitle: '¿Cómo podemos llamarte?',
      nameLabel: 'Nombre para mostrar',
      namePlaceholder: 'Ej: María García',
      roleLabel: 'Tu especialidad',
      roleContentCreator: 'Creador de contenido',
      rolePodcaster: 'Podcaster',
      roleMarketer: 'Marketer',
      roleEducator: 'Educador',
      roleOther: 'Otro',
      goalsStep: 'Paso 2',
      goalsTitle: 'Define tu enfoque.',
      goalsDescription: 'Selecciona tus prioridades para personalizar tu experiencia.',
      goalAudio: 'Generar audio profesional',
      goalAudioDescription: 'Transforma guiones en narraciones con voces naturales.',
      goalScenes: 'Crear escenas visuales',
      goalScenesDescription: 'Genera imágenes e ilustraciones automáticamente.',
      goalVideo: 'Producir videos',
      goalVideoDescription: 'Renderiza videos completos con subtítulos.',
      goalAssistant: 'Asistente IA',
      goalAssistantDescription: 'Recibe sugerencias y mejora tus guiones.',
      continue: 'Continuar',
      finish: 'Finalizar',
      back: 'Volver',
      progress: 'Paso {current} de {total}',
      selectAtLeastOneGoal: 'Selecciona al menos una meta para continuar',
      saveError: 'No se pudo guardar tu perfil. Intenta acceder a la plataforma.',
      completionTitle: 'Todo listo',
      completionMessage: 'Tu espacio de trabajo ha sido configurado y perfectamente adaptado para ti.',
      completionButton: 'Acceder a la Plataforma',
    },
  },

  // ── SEO (meta tags por página) ─────────────────────────────────────
  seo: {
    landing: {
      title: 'Convierte guiones en arte con IA | Script Master',
      description: 'Plataforma completa para crear audio, video e imágenes profesionales a partir de guiones con Gemini AI. Todo del lado del cliente.',
    },
    about: {
      title: 'Acerca de Script Master',
      description: 'Descubre la historia, los valores y el roadmap de la plataforma que está transformando la producción de contenido con inteligencia artificial.',
    },
    contact: {
      title: 'Contáctanos | Script Master',
      description: 'Envía tu duda, sugerencia o reporta un problema. Respuesta en 24 horas hábiles.',
    },
    faq: {
      title: 'Preguntas Frecuentes | Script Master',
      description: 'Encuentra respuestas rápidas a las dudas más comunes sobre Script Master.',
    },
    features: {
      title: 'Funcionalidades | Script Master',
      description: 'Conoce todas las funcionalidades de Script Master: generación de audio, imágenes, videos, asistente IA y más.',
    },
    pricing: {
      title: 'Precios | Script Master',
      description: 'Elige el plan ideal para ti. Empieza gratis, sin tarjeta de crédito.',
    },
    status: {
      title: 'Estado de los Servicios | Script Master',
      description: 'Estado informativo de los servicios de Script Master. Datos actualizados manualmente.',
    },
    onboarding: {
      title: 'Configuración Inicial | Script Master',
      description: 'Configura tu perfil y personaliza tu experiencia en Script Master.',
    },
  },

  // ── FAQ Items (FaqPage) ─────────────────────────────────────────────
  faqItems: {
    general: {
      0: {
        question: '¿Qué es Script Master?',
        answer: 'Script Master es una plataforma completa para transformar guiones en audio profesional con voces generadas por IA. Además, puedes generar imágenes, renderizar videos y contar con un asistente IA para ayudar en la creación de contenido.',
      },
      1: {
        question: '¿Necesito una cuenta para usarlo?',
        answer: 'Puedes explorar Script Master sin cuenta, pero para guardar proyectos, generar audio y acceder a todas las funcionalidades, es necesario crear una cuenta gratuita. Ofrecemos inicio de sesión con Google o por email y contraseña.',
      },
      2: {
        question: '¿Están seguros mis datos?',
        answer: 'Sí. Utilizamos Firebase de Google con cifrado en tránsito y en reposo. Tus guiones y proyectos se almacenan de forma segura y nunca se comparten con terceros.',
      },
      3: {
        question: '¿Funciona sin conexión?',
        answer: 'Script Master es una aplicación web (SPA) que funciona en tu navegador. Algunos recursos como la reproducción de audios ya generados funcionan offline gracias al Service Worker, pero la generación de contenido requiere conexión a internet.',
      },
      4: {
        question: '¿Qué navegadores son compatibles?',
        answer: 'Recomendamos Google Chrome, Microsoft Edge o Firefox en sus versiones más recientes. Safari tiene soporte parcial — algunas funcionalidades avanzadas como la renderización de video pueden no funcionar correctamente.',
      },
      5: {
        question: '¿Puedo usarlo en el celular?',
        answer: '¡Sí! Script Master es responsivo y funciona en dispositivos móviles. Sin embargo, la experiencia de edición de guiones y renderización de video está optimizada para pantallas más grandes.',
      },
    },
    technical: {
      0: {
        question: '¿Qué voces están disponibles?',
        answer: 'Ofrecemos diversas voces en portugués brasileño con diferentes tonos y estilos: narrativa, conversacional, periodística y más. Puedes escuchar previews de cada voz antes de generar tu audio.',
      },
      1: {
        question: '¿Cuál es el límite de tamaño del guion?',
        answer: 'El límite máximo es de 50.000 caracteres por guion. Guiones mayores a 500 caracteres se dividen automáticamente en segmentos para garantizar la consistencia de la voz.',
      },
      2: {
        question: '¿Cómo funcionan los videos?',
        answer: 'Los videos se renderizan directamente en tu navegador usando WebCodecs. Puedes combinar audio generado, imágenes de escena y subtítulos automáticos. La renderización es 100% del lado del cliente — tu guion nunca sale de tu dispositivo.',
      },
      3: {
        question: '¿Cuál es la calidad del audio generado?',
        answer: 'El audio se genera en WAV 24kHz mono 16-bit PCM, con calidad profesional.',
      },
      4: {
        question: '¿Cómo funcionan los subtítulos automáticos?',
        answer: 'Usamos el modelo Whisper para transcripción automática del audio. Los subtítulos se generan con timestamps precisos y pueden editarse manualmente en el editor de subtítulos.',
      },
    },
    account: {
      0: {
        question: '¿Cómo inicio sesión?',
        answer: 'Puedes iniciar sesión de dos formas: con tu cuenta de Google (un clic) o con email y contraseña. Haz clic en "Iniciar sesión" en la esquina superior derecha para acceder a tu cuenta. También ofrecemos recuperación de contraseña si la olvidas.',
      },
      1: {
        question: '¿Puedo usarlo en más de un dispositivo?',
        answer: '¡Sí! Tus proyectos y configuraciones se sincronizan vía Firebase. Solo inicia sesión en cualquier dispositivo para acceder a tu contenido.',
      },
      2: {
        question: '¿Cómo elimino mi cuenta?',
        answer: 'Puedes eliminar tu cuenta directamente desde la app: haz clic en tu avatar en la esquina superior derecha y selecciona "Eliminar cuenta". Todos tus datos (proyectos, audios, chats, memorias y configuraciones) se eliminan permanentemente en conformidad con la LGPD. También es posible solicitar la eliminación a través del formulario de contacto.',
      },
    },
  },

  // ── Pricing (comparação de planos) ──────────────────────────────────
  pricingComparison: {
    features: {
      0: { name: 'Generación de audio TTS', free: 'Hasta 10 guiones/mes', pro: 'Ilimitado', business: 'Ilimitado' },
      1: { name: 'Generación de imágenes', free: 'Hasta 20/mes', pro: 'Ilimitado', business: 'Ilimitado' },
      2: { name: 'Renderización de video', free: 'Hasta 3/mes', pro: 'Ilimitado', business: 'Ilimitado' },
      3: { name: 'Asistente IA', free: 'Hasta 50 mensajes/mes', pro: 'Ilimitado', business: 'Ilimitado' },
      4: { name: 'Multi-locutor', free: '2 voces', pro: '2 voces', business: '2 voces' },
      5: { name: 'Speed Paint', free: 'Hasta 5/mes', pro: 'Ilimitado', business: 'Ilimitado' },
      6: { name: 'Biblioteca', free: 'Local (IndexedDB)', pro: 'Nube + local', business: 'Nube + local' },
      7: { name: 'Subtítulos automáticos', free: 'Whisper tiny', pro: 'Whisper completo', business: 'Whisper completo' },
      8: { name: 'Soporte', free: 'Comunidad', pro: 'Prioritario', business: 'Dedicado' },
    },
  },

  // ── Features (FuncionalidadesPage — cards por seção) ────────────────
  featureItems: {
    audio: {
      0: { title: 'Generación de Audio TTS', description: 'Transforma guiones en audio profesional con Gemini TTS (24kHz mono 16-bit PCM).' },
      1: { title: 'Chunking Inteligente', description: 'División optimizada vía LLM + fallback programático. Límite de 500 caracteres por chunk.' },
      2: { title: 'Multi-locutor', description: 'Soporte para 2 locutores (Speaker A + B) con configuración independiente de voz y nombre.' },
      3: { title: 'Control de Voz', description: 'Selección de voz, ritmo, tono y perfil de audio (podcast, audiolibro, conversación, narración).' },
    },
    video: {
      0: { title: 'Composición de Video', description: 'Videos del lado del cliente con Remotion y WebCodecs. Sin backend, sin costo de renderización.' },
      1: { title: 'Subtítulos Automáticos', description: '3 fuentes de sincronización: segment-timing > whisper-aligned > proportional.' },
      2: { title: '3 Resoluciones', description: '16:9 (1920x1080), 9:16 (1080x1920) y 1:1 (1080x1080).' },
    },
    image: {
      0: { title: 'Estudio de Imagen', description: 'Generación de imágenes con Gemini a partir de prompts + referencia visual opcional.' },
      1: { title: '8 Aspect Ratios', description: '1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 21:9.' },
      2: { title: 'Galería Integrada', description: 'Historial de imágenes generadas con visualización, eliminación y persistencia dual.' },
    },
    assistant: {
      0: { title: 'Chat Conversacional', description: 'Streaming con Gemini, memorias, adjuntos (5 por msg: imagen 10MB, documento 5MB).' },
      1: { title: 'Integración con Estudio', description: 'Modelo sugiere alteraciones en bloque JSON, botón "Aplicar en el estudio" para patch parcial.' },
      2: { title: 'Sistema de Memoria', description: 'Memorias cortas (texto) + carga de documentos (.md/.txt/.csv hasta 500KB).' },
    },
    library: {
      0: { title: 'Gestión de Proyectos', description: 'Organiza audios, escenas, videos e imágenes en proyectos con metadatos completos.' },
      1: { title: 'Descarga Fácil', description: 'Descarga audio WAV, videos MP4/WebM e imágenes PNG con un clic.' },
      2: { title: 'Persistencia Dual', description: 'Firestore (autenticado) + IndexedDB (local), migración automática al iniciar sesión.' },
    },
    speedPaint: {
      0: { title: 'Animación de Pintura', description: 'Subida > detección de bordes > clusterización BFS > vectorización > renderización progresiva.' },
      1: { title: 'Procesamiento por Lotes', description: 'Cola de imágenes con modos watch (auto-avanza) y record (graba + avanza).' },
      2: { title: 'Exportación de Medios', description: 'Export PNG (2x) y WebM (H.264 > VP9 > predeterminado, 12Mbps).' },
    },
  },

  // ── Landing showcases (alt texts) ───────────────────────────────────
  landingShowcases: {
    audio: { alt: 'Generación de audio TTS con Script Master' },
    video: { alt: 'Renderización de video con Script Master' },
    assistant: { alt: 'Asistente IA de Script Master' },
  },

  // ── Erros ────────────────────────────────────────────────────────────
  errors: {
    video: {
      title: 'Error al renderizar el video',
      message: 'Ocurrió un problema durante la composición. Intenta recargar la página.',
      retry: 'Intentar de nuevo',
    },
  },

  // ── Billing ──────────────────────────────────────────────────────────
  billing: {
    upgrade: {
      title: 'Elige tu plan',
      monthly: 'Mensual',
      yearly: 'Anual',
      yearlyDiscount: '-20%',
      month: 'mes',
      year: 'año',
      currentPlan: 'Plan actual',
      recommended: 'Recomendado',
      notAvailable: 'Pagos no disponibles en este momento.',
    },
    badge: {
      free: 'Gratuito',
      pro: 'Pro',
      business: 'Business',
    },
    portal: {
      manageSubscription: 'Gestionar suscripción',
      openPortal: 'Mi suscripción',
    },
    usage: {
      title: 'Uso del plan',
      audioGenerations: 'Generaciones de audio',
      imageGenerations: 'Generaciones de imagen',
      videoExports: 'Exportaciones de video',
      scriptChars: 'Caracteres de guion',
      storageMb: 'Almacenamiento (MB)',
      unlimited: 'Ilimitado',
      of: 'de',
    },
    entitlement: {
      limitReached: 'Límite alcanzado',
      upgradeRequired: 'Actualiza para continuar',
      featureLocked: 'Función disponible solo en planes de pago',
      multiSpeakerLocked: 'Multi-locutor disponible en plan Pro o superior',
      emotionalTTSLocked: 'TTS emocional disponible en plan Pro o superior',
      stockMediaLocked: 'Mimedia stock disponible en plan Pro o superior',
    },
  },

  // ── Image Studio (aspect ratios) ────────────────────────────────────
  imageStudioRatios: {
    square: 'Cuadrado (1:1)',
    portrait: 'Retrato (9:16)',
    landscape: 'Paisaje (16:9)',
    ultraWide: 'Ultra wide (21:9)',
    vertical: 'Vertical (3:4)',
    horizontal: 'Horizontal (4:3)',
    wide: 'Wide (3:2)',
    ultraTall: 'Ultra alto (2:3)',
  },

  // ── Assistant (erros e welcome) ─────────────────────────────────────
  assistantStrings: {
    errors: {
      generic: 'Ocurrió un error inesperado. Intenta de nuevo.',
      nonError: 'La respuesta no contiene un error reconocido.',
      default: 'No se pudo procesar tu solicitud.',
      retry: 'Intentar de nuevo',
      stream: 'Error en la transmisión de la respuesta. Intenta de nuevo.',
    },
    welcome: '¿Cómo puedo ayudar?',
    retryDetection: '__RETRY_DETECTED__',
  },

  // ── Configuración ────────────────────────────────────────────────────────
  configuracoes: {
    title: 'Configuración Predeterminada',
    subtitle: 'Define los valores iniciales del estudio de producción.',
    save: 'Guardar predeterminados',
    saved: '¡Predeterminados guardados con éxito!',
    reset: 'Restaurar predeterminados',
    resetConfirm: 'Esto limpiará todas tus configuraciones guardadas y restaurará los valores originales. ¿Continuar?',
    sectionVoice: 'Voz',
    sectionPersona: 'Persona y Dirección',
    sectionScenes: 'Escenas e Imágenes',
    sectionMultiSpeaker: 'Multi-locutor',
    voiceLabel: 'Voz predeterminada',
    personaNameLabel: 'Nombre del locutor',
    profileLabel: 'Perfil de voz',
    sceneLabel: 'Escena',
    styleNotesLabel: 'Notas de estilo',
    paceLabel: 'Ritmo',
    generateScenesLabel: 'Generar escenas',
    sceneDensityLabel: 'Densidad de escenas',
    sceneRatioLabel: 'Proporción',
    visualFrameworkLabel: 'Framework visual',
    imageTextLanguageLabel: 'Idioma de los textos',
    emotionLabel: 'Emoción',
    multiSpeakerLabel: 'Multi-locutor',
    speakerBNameLabel: 'Nombre del locutor B',
    speakerBVoiceLabel: 'Voz del locutor B',
  },
};
