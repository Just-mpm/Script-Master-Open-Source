import type { TranslationDictionary } from '../types';

/**
 * Dicionário EN — English translations for Script Master.
 */
export const en: TranslationDictionary = {
  common: {
    skipToContent: 'Skip to content',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    skip: 'Skip',
    tryAgain: 'Try again',
    learnMore: 'Learn more',
    getStarted: 'Get started',
    seeAll: 'See all',
    search: 'Search...',
    noResults: 'No results found',
  },

  nav: {
    home: 'Home',
    features: 'Features',
    pricing: 'Pricing',
    faq: 'FAQ',
    about: 'About',
    contact: 'Contact',
    login: 'Sign in',
    register: 'Create account',
    openApp: 'Open App',
    logout: 'Sign out',
    ariaNav: 'Public navigation',
    ariaMenu: 'Menu',
    ariaDrawerMenu: 'Navigation menu',
  },

  footer: {
    description:
      'Turn scripts into art with AI. Professional audio, video, and images powered by Gemini.',
    copyright: 'Script Master. All rights reserved.',
    madeWith: 'Built with AI and Gemini',
    productGroup: 'Product',
    companyGroup: 'Company',
    legalGroup: 'Legal',
    links: {
      features: 'Features',
      pricing: 'Pricing',
      faq: 'FAQ',
      status: 'Status',
      about: 'About',
      contact: 'Contact',
      email: 'Email',
      terms: 'Terms of Use',
      privacy: 'Privacy',
      cookies: 'Cookies',
    },
  },

  landing: {
    hero: {
      title: 'Turn scripts into art with AI',
      subtitle:
        'Complete platform to create professional audio, video, and images from scripts. All client-side with Gemini AI.',
      cta: 'Create free account',
      ctaSecondary: 'View Features',
      alt: 'Script Master illustration — turning scripts into art with AI',
    },
    socialProof: {
      label: 'Powered by Gemini AI',
      sublabel: 'TTS, image generation, and conversational assistant',
    },
    features: {
      title: 'Everything you need to create',
      subtitle:
        'Six integrated tools in a single platform to transform your ideas into professional content.',
    },
    featureCards: {
      voice: {
        title: 'AI Voice',
        description:
          'Transform scripts into professional audio with Gemini TTS. Voice control, pace, and multi-speaker.',
      },
      video: {
        title: 'Automatic Video',
        description:
          'Create client-side videos with subtitles, transitions, and waveform. No backend needed.',
      },
      images: {
        title: 'Image Generation',
        description:
          '8 aspect ratios, visual reference, and full gallery with cloud persistence.',
      },
      speedPaint: {
        title: 'Speed Paint',
        description:
          'Progressive painting animation with edge detection, batch processing, and export.',
      },
      assistant: {
        title: 'AI Assistant',
        description:
          'Chat with streaming, memories, attachments, and direct integration with the production studio.',
      },
      library: {
        title: 'Library',
        description:
          'Complete project management with audios, scenes, videos, and dual persistence.',
      },
    },
    ttsShowcase: {
      title: 'Professional Voice with Gemini TTS',
      description:
        'Transform any script into professional narration with natural voices and full control over pace, pitch, and audio profile.',
      benefits: {
        0: 'Multi-speaker with 2 independent narrators',
        1: 'Automatic scene detection via silence analysis (RMS)',
        2: 'Pace, pitch, and audio profile control (podcast, audiobook, narration)',
        3: 'Voice previews available for each voice',
        4: 'High-quality 24kHz mono 16-bit PCM audio',
      },
    },
    videoShowcase: {
      title: 'Client-Side Video with Remotion',
      description:
        'Render complete videos directly in your browser. No server, no rendering cost. WebCodecs + Whisper for automatic subtitles.',
      benefits: {
        0: 'Codec fallback: H.264+AAC+MP4 > H.264 no audio > VP8+Opus+WebM',
        1: 'Automatic subtitles with Whisper WASM (3 sync sources)',
        2: 'Crossfade between scenes with spring animation (400ms overlap)',
        3: '3 resolutions: 16:9, 9:16, 1:1',
        4: 'Waveform overlay synced with video',
      },
    },
    assistantShowcase: {
      title: 'Integrated AI Assistant',
      description:
        'Conversational chat with Gemini streaming, long-term memories, and direct studio integration. The assistant suggests changes you apply with one click.',
      benefits: {
        0: 'Real-time streaming with Gemini 3.1 Flash',
        1: 'Memory system: short texts + document upload (.md, .txt, .csv)',
        2: 'Attachments: 5 per message (images 10MB, documents 5MB)',
        3: 'JSON extraction from chat with "Apply in studio" button',
        4: 'Auto-save sessions with full history',
      },
    },
    useCases: {
      title: 'For every type of creator',
      subtitle:
        'Whether you are a YouTuber, podcaster, teacher, or marketer — Script Master adapts to your workflow.',
      learnMore: 'Learn more',
    },
    metrics: {
      title: 'Numbers that matter',
      subtitle:
        'Real results from the community of creators who use Script Master every day.',
    },
    demo: {
      title: 'See Script Master in action',
      subtitle:
        'A complete studio in your browser. Write, generate, and export — all in one place.',
      toolbar: {
        audio: 'Audio',
        video: 'Video',
        images: 'Images',
        assistant: 'Assistant',
      },
      scriptTitle: 'My Script — Episode 01',
      statsLine: '{lines} lines · ~{chars} characters',
      scriptLines: {
        0: 'In the digital age, content is king.',
        1: 'But not everyone has time to record.',
        2: 'With artificial intelligence, any text becomes voice.',
        3: 'And any voice becomes a story told.',
      },
      generateButton: 'Generate audio',
      tryFree: 'Try for free',
      noCreditCard: 'No credit card · Setup in 30 seconds',
    },
    testimonials: {
      title: 'What our creators say',
      subtitle:
        'Thousands of creators already use Script Master to turn ideas into professional content.',
    },
    howItWorks: {
      title: 'How It Works',
      subtitle:
        'Three steps to transform your script into professional content.',
    },
    steps: {
      1: {
        title: 'Write your script',
        description:
          'Use the built-in editor or paste your text. The AI assistant can help improve your script.',
      },
      2: {
        title: 'Generate with AI',
        description:
          'One click to transform your script into audio, images, and video with Gemini.',
      },
      3: {
        title: 'Export and share',
        description:
          'Download your WAV audio, MP4/WebM video, or high-resolution PNG images.',
      },
    },
    moreFeatures: {
      title: 'And Much More',
      cards: {
        multiSpeaker: {
          title: 'Multi-speaker',
          description:
            'Support for 2 narrators with independent voice and name configuration.',
        },
        chunking: {
          title: 'Smart Chunking',
          description:
            'Optimized splitting via LLM + programmatic fallback. 500 chars per chunk limit.',
        },
        dualStorage: {
          title: 'Dual Storage',
          description:
            'Firestore (authenticated) + IndexedDB (local) with automatic migration.',
        },
      },
    },
    cta: {
      title: 'Start creating now',
      subtitle: 'Create your first narration for free. No credit card required.',
      button: 'Get started',
    },
  },

  features: {
    hero: {
      title: 'Everything you need to create',
      subtitle:
        'Explore all the integrated tools of Script Master to transform your scripts into professional content.',
      cta: 'Get Started Free',
      ctaSecondary: 'View pricing',
    },
    sections: {
      tts: 'Voice Studio (TTS)',
      video: 'Video Rendering',
      images: 'Image Generation',
      speedPaint: 'Speed Paint & Animation',
      assistant: 'AI Assistant',
      platform: 'Platform',
    },
    ttsShowcase: {
      title: 'Professional Audio with Gemini TTS',
      description:
        'Our TTS engine uses the most advanced Gemini model to generate natural narrations with full control over all voice parameters.',
      benefits: {
        0: 'Support for 14+ studio parameters in the Inspector',
        1: 'Automatic scene detection via RMS analysis of generated audio',
        2: 'Automatic silence threshold calibration in up to 3 iterations',
        3: 'Smart retry: 3 attempts with jitter and exponential backoff',
        4: 'Static WAV voice previews for instant playback',
      },
    },
    videoShowcase: {
      title: 'Serverless Video',
      description:
        'All rendering happens in your browser. No video upload, no processing cost. Total privacy and control.',
      benefits: {
        0: 'Codec fallback: H.264+AAC+MP4 > H.264 > VP8+Opus+WebM',
        1: 'Built-in Whisper WASM transcription (no backend)',
        2: 'Inline subtitle style editor (fontSize, padding, borderRadius, opacity)',
        3: 'Waveform overlay that disables during export for performance',
        4: 'Canvas patch for Remotion font-stretch bug fix',
      },
    },
    imagesShowcase: {
      title: 'Images with Visual Reference',
      description:
        'Generate images with Gemini using text prompts and, optionally, a reference image to guide style and composition.',
      benefits: {
        0: '8 aspect ratios: 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 21:9',
        1: 'Visual frameworks: cinema/photography or whiteboard',
        2: 'Automatic scene generation from script',
        3: 'Dual persistence: Firestore + IndexedDB',
      },
    },
    cta: {
      title: 'Ready to create?',
      subtitle: 'Start using all these features for free.',
      button: 'Get Started Free',
    },
  },

  pricing: {
    hero: {
      title: 'Choose the right plan for you',
      subtitle: 'Start for free, no credit card. Cancel anytime.',
      cta: 'Get Started Free',
      ctaSecondary: 'Compare plans',
    },
    billing: {
      monthly: 'Monthly',
      annual: 'Annual',
      ariaLabel: 'Billing cycle',
    },
    plans: {
      free: {
        name: 'Free',
        priceSubtitle: 'forever',
        description: 'Perfect for experimenting and personal projects',
        cta: 'Get started free',
        features: {
          0: 'TTS audio generation',
          1: 'AI image generation',
          2: 'Video export (up to 720p)',
          3: 'Project library',
          4: 'AI assistant',
          5: '5 projects in total',
        },
      },
      pro: {
        name: 'Pro',
        priceSubtitle: '/mo',
        description: 'For creators who produce content regularly',
        cta: 'Subscribe to Pro',
        features: {
          0: 'Everything in Free plan',
          1: 'Multi-speaker (2 narrators)',
          2: 'Unlimited stock media',
          3: 'Video export up to 4K',
          4: 'Priority generation queue',
          5: '100 generations/month per resource',
          6: '50 projects in total',
        },
      },
      business: {
        name: 'Business',
        priceSubtitle: '/mo',
        description: 'For teams and professional production',
        cta: 'Coming soon',
        features: {
          0: 'Everything in Pro plan',
          1: 'Unlimited limits',
          2: 'Unlimited storage',
          3: 'Priority support',
          4: 'Scripts up to 50K characters',
        },
      },
    },
    tooltip: {
      comingSoon: 'Payments coming soon — stay tuned for news!',
    },
    disclaimer:
      'Plan limits are not yet automatically enforced. All resources are available for use during the development period.',
    comparison: {
      title: 'Compare plans in detail',
      subtitle:
        'See side by side everything each plan offers to choose the best for your needs.',
      ariaLabel: 'Plan comparison',
      feature: 'Feature',
    },
    unlimited: 'Unlimited',
    faq: {
      title: 'Frequently asked questions about pricing',
    },
    cta: {
      title: 'Start for free, no credit card',
      subtitle: 'Create your first narration for free. No commitment, no card.',
      button: 'Sign in with Google',
    },
  },

  faq: {
    hero: {
      title: 'Frequently Asked Questions',
      subtitle:
        'Find quick answers to the most common questions about Script Master.',
      cta: 'Create free account',
      ctaSecondary: 'View plans',
    },
    categories: {
      ariaLabel: 'FAQ categories',
      general: 'General',
      pricing: 'Pricing',
      technical: 'Technical',
      account: 'Account',
    },
    stillHaveQuestions: {
      title: 'Still have questions?',
      text: "Didn't find what you were looking for? Contact our team and we'll respond as quickly as possible.",
      button: 'Contact us',
    },
    cta: {
      title: 'Ready to get started?',
      subtitle:
        'Create your first narration for free. No commitment, no credit card.',
      button: 'Get started',
    },
  },

  contact: {
    hero: {
      title: 'Contact Us',
      subtitle:
        'We are here to help. Send your question, suggestion, or report an issue and we will respond within 24 business hours.',
      cta: 'Send message',
      ctaSecondary: 'View pricing',
    },
    info: {
      title: 'Contact information',
      email: { label: 'Email', value: 'contato@scriptmaster.app' },
      response: { label: 'Response', value: 'Within 24 business hours' },
      language: { label: 'Language', value: 'Portuguese (Brazil)' },
      socials: {
        title: 'Follow us on social media',
      },
    },
    form: {
      title: 'Send a message',
      alert: 'When submitting, your email client will open with the filled data. Alternatively, send directly to contato@scriptmaster.app.',
      name: 'Your name',
      namePlaceholder: 'John Smith',
      nameRequired: 'Name is required',
      email: 'Your email',
      emailPlaceholder: 'john@example.com',
      emailRequired: 'Email is required',
      emailInvalid: 'Invalid email format',
      subject: 'Subject',
      message: 'Your message',
      messagePlaceholder: 'Describe your question, suggestion, or issue...',
      messageRequired: 'Message is required',
      submit: 'Send message',
      snackbar:
        'Your email client should open automatically. Check if it opened correctly.',
    },
    subjects: {
      general: 'General question',
      support: 'Technical support',
      bugs: 'Report a bug',
      featureRequest: 'Feature suggestion',
      partnership: 'Commercial partnership',
      other: 'Other subject',
    },
    defaultSubject: 'Contact via Website',
    cta: {
      title: 'Ready to get started?',
      subtitle: 'Create your first narration for free. No commitment, no card.',
      button: 'Get started',
    },
  },

  about: {
    hero: {
      title: 'About Script Master',
      subtitle:
        'Discover the story, values, and roadmap of the platform transforming content production with artificial intelligence.',
      cta: 'Create free account',
      ctaSecondary: 'View Features',
      alt: 'Script Master illustration',
    },
    mission: {
      title: 'Our Mission',
      text: 'Democratize audio and video content production, enabling anyone to transform their ideas into professional productions with the power of artificial intelligence.',
    },
    vision: {
      title: 'Our Vision',
      text: 'To be the leading platform in AI-assisted content creation in Brazil, recognized for quality, simplicity, and innovation.',
    },
    values: {
      title: 'Our Values',
      subtitle:
        'Three pillars that guide every decision and feature of the platform.',
      creativity: {
        title: 'Creativity',
        description:
          'We believe technology should amplify human creativity, not replace it. That is why we build tools that empower creators.',
      },
      simplicity: {
        title: 'Simplicity',
        description:
          'Turning scripts into professional productions should not be complicated. Every feature is designed to be intuitive and accessible.',
      },
      innovation: {
        title: 'Innovation',
        description:
          'We are at the frontier of generative AI applied to content production. Our commitment is to bring the most advanced technology to your daily life.',
      },
    },
    team: {
      title: 'Who We Are',
      description:
        'We are a team passionate about technology and content creation, building the future of audiovisual production with artificial intelligence.',
    },
    roadmap: {
      title: 'Public Roadmap',
      description: 'Discover the milestones we have reached and what is yet to come.',
      status: {
        done: 'Completed',
        current: 'In progress',
        planned: 'Planned',
      },
      items: {
        0: {
          title: 'Authentication & Navigation',
          description: 'Google and email/password login, registration, protected routes, and SEO with public pages',
        },
        1: {
          title: 'Speed Paint & Advanced Video',
          description: 'Progressive painting animation, Web Worker for rendering, LRU cache, and WebM export',
        },
        2: {
          title: 'Production Studio',
          description: 'Complete studio refactoring with Zustand, preference persistence, and granular speed paint control',
        },
        3: {
          title: 'LGPD Account Deletion',
          description: 'Complete deletion pipeline (Firestore + Storage + IndexedDB), email verification, and centralized assistant UI',
        },
        4: {
          title: 'Video Quality & Export',
          description: 'Export quality (720p–4k), file size estimation, per-phase speed paint multipliers, and 1185 tests',
        },
        5: {
          title: 'Plans & Payments',
          description: 'Stripe integration for subscriptions, payments, and plan management',
        },
        6: {
          title: 'Official Launch',
          description: 'Stable version with all core features and complete documentation',
        },
      },
    },
    cta: {
      title: 'Be part of this story',
      subtitle:
        'Start creating professional content with AI. Free, no credit card required.',
      button: 'Get started',
    },
  },

  status: {
    hero: {
      title: 'Service Status',
      subtitle:
        'Informational status of Script Master services. Manually updated data.',
    },
    disclaimer:
      'The data displayed on this page is informational and does not represent real-time monitoring. Actual service status depends on third parties (Google Gemini, Firebase).',
    globalStatus: 'All systems operational',
    lastCheck: 'Last update: build {date} (informational data)',
    incidents: {
      title: 'Last 90 days',
      resolved: 'Resolved',
      degraded: 'Degraded',
      items: {
        0: {
          title: 'Audio generation instability',
          description: 'The Gemini API experienced high latency for approximately 2 hours, affecting TTS audio generation. The service was automatically normalized.',
        },
        1: {
          title: 'Firebase Storage degradation',
          description: 'Image uploads experienced slowness for 45 minutes. The impact was limited to the image studio.',
        },
      },
    },
    services: {
      api: {
        name: 'Gemini API (AI)',
        description: 'Audio generation, images, and conversational assistant',
      },
      auth: {
        name: 'Firebase Auth',
        description: 'Authentication and account management',
      },
      firestore: {
        name: 'Firebase Firestore',
        description: 'Database and project synchronization',
      },
      storage: {
        name: 'Firebase Storage',
        description: 'Audio, image, and video storage',
      },
      video: {
        name: 'Video Rendering',
        description: 'Client-side processing via WebCodecs',
      },
    },
    statusLabels: {
      operational: 'Operational',
      degraded: 'Degraded',
      outage: 'Unavailable',
      maintenance: 'Maintenance',
    },
  },

  localeSelector: {
    ariaLabel: 'Select language',
  },

  studio: {
    header: {
      nav: {
        studio: 'Studio',
        image: 'Image',
        video: 'Video',
        speedPaint: 'Speed Paint',
        ai: 'AI',
        library: 'Library',
        ariaNav: 'Main navigation',
        ariaDrawerMenu: 'Navigation menu',
        ariaOpenMenu: 'Open navigation menu',
      },
      user: {
        tooltip: 'User',
        alt: 'User',
        fallback: 'Account',
      },
      logout: {
        tooltip: 'Sign out',
        ariaLabel: 'Sign out',
        drawerLabel: 'Sign out',
      },
      deleteAccount: {
        drawerLabel: 'Delete account',
        dialogTitle: 'Permanently delete account',
        dialogTitleDeleting: 'Deleting account...',
        dialogDescription: 'This action cannot be undone. All your projects, audios, images, videos, memories, and settings will be permanently removed.',
        dialogConfirm: 'Type <strong>EXCLUIR</strong> to confirm:',
        dialogCancel: 'Cancel',
        dialogDelete: 'Delete account',
        dialogDeleting: 'Deleting...',
      },
      login: 'Login',
    },
    actionBar: {
      ariaLabel: 'Audio and generation controls',
      generatingScenes: 'Generating visual scenes...',
      sceneProgressLabel: 'Visual scene generation progress',
      cancelImages: 'Cancel image generation',
      synthesizingVoice: 'Synthesizing voice...',
      audioProgressLabel: 'Audio generation progress',
      pausePlayback: 'Pause playback',
      startPlayback: 'Start playback',
      videoProgress: 'Video progress',
      audioProgress: 'Audio progress',
      progressOf: '{current} of {duration}',
      exportVideoMp4: 'Export MP4 video',
      exportingVideo: 'Exporting video',
      exportingVideoProgress: 'Exporting video... {progress}%',
      savedToLibrary: 'Audio saved to library',
      saveToLibrary: 'Save audio to library',
      downloadOptions: 'Download options',
      downloadAudio: 'Download audio (.wav)',
      downloadAllImages: 'Download all images',
      downloadingScene: 'Downloading scene {current}/{total}...',
      scene: 'Scene {number}',
      cancel: 'Cancel',
    },
    inspector: {
      ariaLabel: 'Voice and direction settings',
      voiceSection: {
        title: 'Narrator voice',
        description: 'Choose the vocal signature and organize voices for narration or podcast.',
        optionsCount: '{count} options',
      },
      podcast: {
        title: 'Podcast Mode (2 voices)',
        description: 'Allows two narrators to interact in a single script.',
        ariaLabel: 'Enable podcast mode with two voices',
        voiceATab: 'Voice A',
        voiceBTab: 'Voice B',
        nameLabel: 'Name in script',
        namePlaceholder: 'Ex: Voice A',
        namePlaceholderB: 'Ex: Voice B',
        nameRequired: 'Narrator A name is required in podcast mode',
        nameHelper: 'Use exactly the name that appears before the speech in the script.',
        editorHint: 'In the editor, write "{name}" before this person\'s speech.',
      },
      voiceSelection: {
        ariaLabel: 'Voice selection',
        previewError: 'Error playing preview',
        previewVoice: 'Listen to {voice} voice sample',
      },
      directionSection: {
        title: 'Art direction',
        description: 'Define character, atmosphere, and visual rules to guide generation.',
      },
      directionFields: {
        characterLabel: 'Character',
        characterPlaceholder: 'Ex: "Jaz R., The Morning Hype"',
        characterHelper: 'Define the main character of the script',
        environmentLabel: 'Environment',
        environmentPlaceholder: 'Ex: "Radio studio, 10 PM. Chaotic."',
        environmentHelper: 'Describe the scene or environment setting',
        paceLabel: 'Pace',
        accentLabel: 'Accent',
        accentPlaceholder: 'Ex: "Paulista"',
        accentHelper: 'Ex: Paulista, Mineiro, Carrioca',
        accentLimitReached: 'Limit of {limit} characters reached',
        accentCounter: '{current}/{limit}',
      },
      paceOptions: {
        very_slow: 'Very Slow',
        slow: 'Slow',
        normal: 'Normal',
        fast: 'Fast',
        very_fast: 'Very Fast',
      },
      scenes: {
        title: 'Generate visual scenes',
        description: 'Transforms audio into a coherent visual sequence for video.',
        ariaLabel: 'Enable visual scene generation',
        voiceTabsAriaLabel: 'Voice selection tabs per narrator',
      },
      sceneFields: {
        visualIdentityLabel: 'Channel visual identity',
        formatLabel: 'Format',
        frequencyLabel: 'Frequency',
        imageSelected: 'Image selected (change)',
        attachImage: 'Attach character/scenery image',
        removeRefTooltip: 'Remove reference image',
        removeRefAriaLabel: 'Remove reference image',
        refHelper: 'This helps the AI maintain consistent characters or art between scenes.',
        imageTextLanguage: {
          label: 'Image text language',
          'pt-BR': 'Portuguese (Brazil)',
          en: 'English',
          es: 'Spanish',
        },
      },
      visualFramework: {
        general: 'Default scenario (script-guided art)',
        whiteboard: 'Whiteboard Master (drawing with subtitles)',
      },
      sceneRatio: {
        '16:9': 'YouTube (16:9 horizontal)',
        '9:16': 'Shorts/TikTok (9:16 vertical)',
        '1:1': 'Instagram (1:1 square)',
      },
      sceneDensity: {
        '15': 'Very fast (15s)',
        '30': 'Dynamic (30s)',
        '60': 'Slow (1 min)',
        '120': 'Very slow (2 min)',
      },
      referenceImage: {
        tooLarge: 'Image too large. Maximum size: 10MB.',
        readError: 'Failed to read the file. Try another image.',
      },
    },
    scriptEditor: {
      label: 'Script',
      syncedSceneChip: 'Visual scene synced with writing',
      copyTooltip: 'Copy script',
      copiedTooltip: 'Copied!',
      copyAriaLabel: 'Copy script',
      clearAriaLabel: 'Clear script',
      clearButton: 'Clear',
      charCountAriaLabel: '{current} of {max} characters used',
      placeholder: 'Start writing your story here...',
      editorAriaLabel: 'Script editor',
      generateButton: 'Generate audio',
      generateTooltip: 'Generate audio ({shortcut} + Enter)',
      clearConfirm: 'The script will be permanently deleted. Continue?',
    },
    studioPage: {
      settingsTab: 'Settings',
      scriptTab: 'Script',
    },
    templates: {
      title: 'Templates',
      description: 'Start with a ready preset and customize later.',
      selectHint: 'Select a template to fill the studio settings.\nYour current script will be kept.',
      allFilter: 'All',
      filterAriaLabel: 'Filter templates by category',
      emptyCategory: 'No template found in this category.',
      previewTitle: 'Script example',
      appliedSettings: 'Settings that will be applied',
      applyDisclaimer: 'The template fills the settings above. Your current script will be kept.',
      cancel: 'Cancel',
      apply: 'Apply template',
      patchLabels: {
        pace: 'Pace',
        audioProfile: 'Character',
        scene: 'Environment',
        styleNotes: 'Accent / Style',
        isMultiSpeaker: 'Podcast mode',
        speakerAName: 'Narrator A Name',
        speakerBName: 'Narrator B Name',
        speakerBVoice: 'Narrator B Voice',
        selectedVoice: 'Selected voice',
        generateScenes: 'Generate scenes',
        sceneRatio: 'Format',
        sceneDensity: 'Scene frequency',
        visualFramework: 'Visual identity',
        script: 'Script',
      },
      booleanYes: 'Yes',
      booleanNo: 'No',
      sceneDensityValue: '{value}s per scene',
    },
    emotion: {
      label: 'Voice emotion',
      ariaLabel: 'Emotion selection',
      intensity: 'Intensity',
      intensityAriaLabel: 'Emotion intensity',
    },
    stockMedia: {
      title: 'Stock Media',
      description: 'Search for ready-to-use images as scenery or reference.',
      searchPlaceholder: 'Search by theme, style, or keyword...',
      searchAriaLabel: 'Search stock images',
      noResults: 'No images found. Try another search term.',
      emptyState: 'Enter a term and search to find images.',
      selectImage: 'Select {alt}',
    },
  },

  video: {
    pageTitle: 'Visual composition',
    pageDescription: 'Review the current scene, check the video atmosphere, and load previous projects without leaving the flow.',
    preview: {
      title: 'Video preview waiting for scenes',
      description: 'Generate audio and scenes in the studio to visualize the composition here.',
      goToStudio: 'Go to Studio',
      renderError: 'Error rendering video',
      renderErrorDescription: 'A problem occurred during composition. Try reloading.',
      captionVisible: 'Caption visible',
      captionHidden: 'Caption hidden',
      showCaption: 'Show caption',
      hideCaption: 'Hide caption',
    },
  },

  assistant: {
    header: {
      title: 'Creative assistant',
      subtitle: 'A creative direction panel to polish script, voice, project memory, and scene adjustments.',
      newChat: 'New chat',
      openHistory: 'Open history',
      openHistoryAria: 'Open assistant history',
      openMemories: 'Memories and documents',
      openMemoriesAria: 'Open memories and documents',
      openSettings: 'Persona and guidelines',
      openSettingsAria: 'Open persona and guidelines',
      cleanReading: 'Clean reading',
    },
    messages: {
      assistant: 'Assistant',
      you: 'You',
      file: 'File',
      stopGeneration: 'Stop generation',
      stopGenerationAria: 'Stop response generation',
      copied: 'Copied!',
      copyText: 'Copy text',
      copyTextAria: 'Copy message text',
      malformedJson: 'The assistant suggested adjustments, but the format could not be interpreted.',
      applied: 'Applied',
      applyToStudio: 'Apply in studio',
      savedToMemory: 'Saved to memory',
      saveInsight: 'Save insight',
      emptyTitle: 'How can I help?',
      emptyDescription: 'Ask about script adjustments, voice suggestions, scene ideas, or send attachments for creative analysis.',
      suggestions: {
        adjustPace: 'Adjust pace',
        suggestScene: 'Suggest scene',
        reviewText: 'Review text',
        analyzeAudio: 'Analyze audio',
      },
      suggestionPrompts: {
        adjustPace: 'Suggest a more dynamic narration pace for my script, with speed variations to highlight important moments.',
        suggestScene: 'Create a detailed visual description of a cinematic scene that matches a documentary script.',
        reviewText: 'Review my script and suggest improvements in clarity, flow, and narrative impact.',
        analyzeAudio: 'Analyze the audio characteristics of my script and suggest the ideal voice profile for each part.',
      },
    },
    composer: {
      placeholder: 'Ask for script adjustments, voice ideas, pace, scene, or attachment analysis…',
      attachFile: 'Attach file',
      attachFileAria: 'Attach file',
      stopGeneration: 'Stop generation',
      send: 'Send',
    },
    history: {
      title: 'Chat history',
      subtitle: 'Resume previous conversations without losing creative context.',
      closeAria: 'Close history',
      searchPlaceholder: 'Search history…',
      clearSearchAria: 'Clear search',
      noChats: 'No chats saved yet',
      noChatsDescription: 'When you chat with the assistant, sessions appear here for quick reuse.',
      noResults: 'No chats found',
      noResultsDescription: 'No session matches "{query}".',
      deleteConversation: 'Delete conversation',
      deleteConversationAria: 'Delete conversation',
    },
    memories: {
      title: 'Memories and documents',
      subtitle: 'Teach preferences, brand context, and attachments that help the assistant respond better.',
      closeAria: 'Close memories',
      addMemoryLabel: 'Add short memory',
      addMemoryPlaceholder: 'Ex.: I prefer shorter openings and calm-tone narrators',
      saving: 'Saving...',
      save: 'Save',
      knowledgeBase: 'Knowledge base',
      knowledgeBaseDescription: 'Upload .md, .txt or .csv with guidelines, documentation, or repertoire the assistant should consider.',
      uploading: 'Uploading...',
      attachDocument: 'Attach document',
      noMemories: 'No memories saved yet',
      noMemoriesDescription: 'Save preferences and references to make responses more consistent with your operation.',
      deleteMemory: 'Delete memory',
      deleteMemoryAria: 'Delete memory',
    },
    settings: {
      title: 'AI Persona',
      subtitle: 'Define permanent principles of tone, brand, response format, and creative guardrails.',
      closeAria: 'Close AI persona',
      whatToWrite: 'What to write here',
      whatToWriteDescription: 'Ex.: brand tone, preferred pace, visual restrictions, CTA type, opening style, vocabulary, and suggestion format.',
      guidelinesAlert: 'Avoid conflicting rules. The clearer the direction, the more predictable the assistant behavior.',
      guidelinesLabel: 'Permanent guidelines',
      guidelinesPlaceholder: 'Ex.: respond with focus on YouTube retention, propose lean scripts, preserve clear language, and always offer a JSON block when suggesting applicable studio adjustments.',
      applyGuidelines: 'Apply guidelines',
    },
  },

  library: {
    title: 'Library',
    savedProjects: 'Saved projects',
    description: 'A cleaner panel to review project assets, rename versions, resume audio, and download scenes without visual noise.',
    projectCount: '{count} project{plural}',
    searchPlaceholder: 'Search project...',
    clearSearchAria: 'Clear search',
    offlineHint: 'Without login, the library uses local storage. Sign in to sync projects to the cloud.',
    loadError: 'Could not load your library. Check your connection and try again.',
    emptyTitle: 'Your library is still empty',
    emptyDescription: 'When you save audios and scenes from the studio, projects appear here with quick access to downloads and visual history.',
    noResultsTitle: 'No project found',
    noResultsDescription: 'No project matches "{query}". Try another search term.',
    audio: 'Audio',
    scenes: 'Scenes',
    hideDetails: 'Hide details',
    showDetails: 'View details',
    delete: 'Delete',
    renameProject: 'Rename project',
    renameProjectAria: 'Rename project',
    saveName: 'Save project name',
    cancelRename: 'Cancel name editing',
    audioVersions: 'Audio versions',
    noAudio: 'No audio found in this project.',
    generatedScenes: 'Generated scenes',
    noImages: 'No images found in this project.',
    scene: 'Scene {number}',
    downloadSceneAria: 'Download scene {number}',
    originalScript: 'Original script',
    playAudio: 'Play audio',
    pauseAudio: 'Pause audio',
    downloadAudio: 'Download audio',
    downloadAudioAria: 'Download audio',
    deleteAudio: 'Delete audio',
    deleteAudioAria: 'Delete audio',
    deleteProjectTitle: 'Delete project?',
    deleteProjectLoading: 'Deleting project...',
    deleteProjectConfirm: 'Delete project',
    deleteProjectDescription: 'This action permanently removes the project, its audios, and associated images.',
    deleteAudioTitle: 'Delete audio version?',
    deleteAudioLoading: 'Deleting audio...',
    deleteAudioConfirm: 'Delete',
    deleteAudioDescription: 'This action permanently removes this audio version and its associated scenes from Storage.',
    deleteSuccess: 'Project deleted successfully. The list was not automatically updated.',
    updateList: 'Update list',
    renameError: 'Could not rename the project. Try again.',
    deleteProjectError: 'Could not delete the project. Try again.',
    deleteAudioError: 'Could not delete the audio. Try again.',
    detailError: 'Could not load project details. Check your connection and try again.',
    version: 'Version {time}',
  },

  speedPaint: {
    pageTitle: 'Transform Images into',
    pageHighlight: 'Speed Paints',
    pageDescription: 'Upload any image and watch it being drawn stroke by stroke.\nOur engine analyzes the image and generates a progressive painting animation.',
  },

  imageStudio: {
    sidebarTitle: 'Image studio',
    sidebarDescription: 'Adjust format, visual reference, and context before generating.',
    ratioLabel: 'Aspect ratio',
    referenceTitle: 'Reference image',
    referenceDescription: 'Useful for maintaining characters, composition, or visual style across generations.',
    referenceAlt: 'Reference image',
    removeReference: 'Remove reference',
    removeReferenceAria: 'Remove reference',
    uploadReference: 'Upload reference image',
    promptTip: 'The more specific the prompt, the better the visual hierarchy, lighting, and result fidelity.',
    pageTitle: 'Visual creation with clarity',
    pageDescription: 'A cleaner surface to write prompts, review results, and save what\'s worth reusing.',
    tabAI: 'Generate with AI',
    tabStock: 'Stock Media',
    promptLabel: 'Image prompt',
    promptPlaceholder: 'Describe the composition, mood, lighting, framing, and desired visual style.',
    stopGeneration: 'Stop generation',
    generateImage: 'Generate image',
    stockReady: 'Stock image ready for download or saving to library.',
    resultReady: 'Result ready for download or reuse in the library.',
    downloadImage: 'Download image',
    savedToLibrary: 'Saved to library',
    saveToLibrary: 'Save to library',
    emptyTitle: 'Your preview appears here',
    emptyDescription: 'Write a clear prompt and, optionally, attach a reference to guide style, composition, and visual consistency.',
    savedImages: 'Saved images',
    savedImagesDescription: 'Your previously generated images. Download or delete as needed.',
    noSavedImages: 'No images saved yet. Generate and save your first image above.',
    savedCloud: 'Image saved to the cloud successfully.',
    savedLocal: 'Image saved to local library.',
    saveError: 'Error saving to library.',
    loadError: 'Could not load saved images. Check your connection and try again.',
    deleteTitle: 'Delete image?',
    deleteLoading: 'Deleting image...',
    deleteConfirm: 'Delete image',
    deleteDescription: 'This action permanently removes the image from the library. The operation cannot be undone.',
    deleteError: 'Error deleting the image. Try again.',
    stockAlt: 'Selected stock image',
    generatedAlt: 'Generated image',
    deleteImage: 'Delete image',
    downloadAria: 'Download {name}',
    deleteAria: 'Delete {name}',
  },

  onboarding: {
    welcome: {
      title: 'Welcome to Script Master!',
      description: 'Transform your scripts into professional audio, visual scenes, and videos\nwith artificial intelligence. We\'ll show you how in a few steps.',
      featureTTS: 'AI TTS',
      featureScenes: 'Visual scenes',
      featureVideo: 'Automatic video',
      tourHint: 'Quick 1-minute tour — you can skip anytime',
      skip: 'Skip',
      startTour: 'Start tour',
    },
    tooltip: {
      stepOf: 'Step {current} of {total}',
      closeTour: 'Close tour',
      previous: 'Previous',
      next: 'Next',
      finish: 'Finish',
    },
  },

  // ── SEO (meta tags por página) ─────────────────────────────────────
  seo: {
    landing: {
      title: 'Turn scripts into art with AI | Script Master',
      description: 'Complete platform to create professional audio, video, and images from scripts with Gemini AI. All client-side.',
    },
    about: {
      title: 'About Script Master',
      description: 'Discover the story, values, and roadmap of the platform transforming content production with artificial intelligence.',
    },
    contact: {
      title: 'Contact Us | Script Master',
      description: 'Send your question, suggestion, or report an issue. Response within 24 business hours.',
    },
    faq: {
      title: 'FAQ | Script Master',
      description: 'Find quick answers to the most common questions about Script Master.',
    },
    features: {
      title: 'Features | Script Master',
      description: 'Discover all Script Master features: audio generation, images, videos, AI assistant, and more.',
    },
    pricing: {
      title: 'Pricing | Script Master',
      description: 'Choose the right plan for you. Start for free, no credit card required.',
    },
    status: {
      title: 'Service Status | Script Master',
      description: 'Informational status of Script Master services. Manually updated data.',
    },
  },

  // ── FAQ Items (FaqPage) ─────────────────────────────────────────────
  faqItems: {
    general: {
      0: {
        question: 'What is Script Master?',
        answer: 'Script Master is a complete platform to transform scripts into professional audio with AI-generated voices. Additionally, you can generate images, render videos, and rely on an AI assistant to help with content creation.',
      },
      1: {
        question: 'Do I need an account to use it?',
        answer: 'You can explore Script Master without an account, but to save projects, generate audio, and access all features, you need to create a free account. We offer Google login or email and password.',
      },
      2: {
        question: 'Is my data safe?',
        answer: 'Yes. We use Google Firebase with encryption in transit and at rest. Your scripts and projects are stored securely and are never shared with third parties.',
      },
      3: {
        question: 'Does it work offline?',
        answer: 'Script Master is a web application (SPA) that runs in your browser. Some features like playing already generated audio work offline thanks to the Service Worker, but content generation requires an internet connection.',
      },
      4: {
        question: 'Which browsers are supported?',
        answer: 'We recommend Google Chrome, Microsoft Edge, or Firefox in their latest versions. Safari has partial support — some advanced features like video rendering may not work correctly.',
      },
      5: {
        question: 'Can I use it on mobile?',
        answer: 'Yes! Script Master is responsive and works on mobile devices. However, the script editing and video rendering experience is optimized for larger screens.',
      },
    },
    technical: {
      0: {
        question: 'Which voices are available?',
        answer: 'We offer several voices in Brazilian Portuguese with different tones and styles: narrative, conversational, journalistic, and more. You can listen to previews of each voice before generating your audio.',
      },
      1: {
        question: 'What is the script size limit?',
        answer: 'The maximum limit is 50,000 characters per script. Scripts larger than 500 characters are automatically split into segments to ensure voice consistency.',
      },
      2: {
        question: 'How do videos work?',
        answer: 'Videos are rendered directly in your browser using WebCodecs. You can combine generated audio, scene images, and automatic subtitles. Rendering is 100% client-side — your script never leaves your device.',
      },
      3: {
        question: 'What is the audio quality?',
        answer: 'Audio is generated in WAV 24kHz mono 16-bit PCM, with professional quality.',
      },
      4: {
        question: 'How do automatic subtitles work?',
        answer: 'We use the Whisper model for automatic audio transcription. Subtitles are generated with precise timestamps and can be manually edited in the subtitle editor.',
      },
    },
    account: {
      0: {
        question: 'How do I sign in?',
        answer: 'You can sign in two ways: with your Google account (one click) or with email and password. Click "Sign in" in the top right corner to access your account. We also offer password recovery if you forget it.',
      },
      1: {
        question: 'Can I use it on multiple devices?',
        answer: 'Yes! Your projects and settings are synced via Firebase. Just sign in on any device to access your content.',
      },
      2: {
        question: 'How do I delete my account?',
        answer: 'You can delete your account directly from the app: click your avatar in the top right corner and select "Delete account". All your data (projects, audios, chats, memories, and settings) are permanently removed in compliance with LGPD. You can also request deletion via the contact form.',
      },
    },
  },

  // ── Pricing (comparação de planos) ──────────────────────────────────
  pricingComparison: {
    features: {
      0: { name: 'TTS audio generation', free: 'Up to 10 scripts/month', pro: 'Unlimited', business: 'Unlimited' },
      1: { name: 'Image generation', free: 'Up to 20/month', pro: 'Unlimited', business: 'Unlimited' },
      2: { name: 'Video rendering', free: 'Up to 3/month', pro: 'Unlimited', business: 'Unlimited' },
      3: { name: 'AI assistant', free: 'Up to 50 messages/month', pro: 'Unlimited', business: 'Unlimited' },
      4: { name: 'Multi-speaker', free: '2 voices', pro: '2 voices', business: '2 voices' },
      5: { name: 'Speed Paint', free: 'Up to 5/month', pro: 'Unlimited', business: 'Unlimited' },
      6: { name: 'Library', free: 'Local (IndexedDB)', pro: 'Cloud + local', business: 'Cloud + local' },
      7: { name: 'Automatic subtitles', free: 'Whisper tiny', pro: 'Full Whisper', business: 'Full Whisper' },
      8: { name: 'Support', free: 'Community', pro: 'Priority', business: 'Dedicated' },
    },
  },

  // ── Features (FuncionalidadesPage — cards por seção) ────────────────
  featureItems: {
    audio: {
      0: { title: 'TTS Audio Generation', description: 'Transform scripts into professional audio with Gemini TTS (24kHz mono 16-bit PCM).' },
      1: { title: 'Smart Chunking', description: 'Optimized splitting via LLM + programmatic fallback. 500 chars per chunk limit.' },
      2: { title: 'Multi-speaker', description: 'Support for 2 narrators (Speaker A + B) with independent voice and name configuration.' },
      3: { title: 'Voice Control', description: 'Voice selection, pace, pitch, and audio profile (podcast, audiobook, conversation, narration).' },
    },
    video: {
      0: { title: 'Video Composition', description: 'Client-side videos with Remotion and WebCodecs. No backend, no rendering cost.' },
      1: { title: 'Automatic Subtitles', description: '3 sync sources: segment-timing > whisper-aligned > proportional.' },
      2: { title: '3 Resolutions', description: '16:9 (1920x1080), 9:16 (1080x1920), and 1:1 (1080x1080).' },
    },
    image: {
      0: { title: 'Image Studio', description: 'Generate images with Gemini from prompts + optional visual reference.' },
      1: { title: '8 Aspect Ratios', description: '1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 21:9.' },
      2: { title: 'Integrated Gallery', description: 'History of generated images with preview, deletion, and dual persistence.' },
    },
    assistant: {
      0: { title: 'Conversational Chat', description: 'Streaming with Gemini, memories, attachments (5 per msg: image 10MB, document 5MB).' },
      1: { title: 'Studio Integration', description: 'Model suggests changes in JSON block, "Apply in studio" button for partial patch.' },
      2: { title: 'Memory System', description: 'Short memories (text) + document upload (.md/.txt/.csv up to 500KB).' },
    },
    library: {
      0: { title: 'Project Management', description: 'Organize audios, scenes, videos, and images in projects with complete metadata.' },
      1: { title: 'Easy Download', description: 'Download WAV audio, MP4/WebM videos, and PNG images with one click.' },
      2: { title: 'Dual Persistence', description: 'Firestore (authenticated) + IndexedDB (local), automatic migration on login.' },
    },
    speedPaint: {
      0: { title: 'Painting Animation', description: 'Upload > edge detection > BFS clustering > vectorization > progressive rendering.' },
      1: { title: 'Batch Processing', description: 'Image queue with watch (auto-advance) and record (record + advance) modes.' },
      2: { title: 'Media Export', description: 'Export PNG (2x) and WebM (H.264 > VP9 > default, 12Mbps).' },
    },
  },

  // ── Landing showcases (alt texts) ───────────────────────────────────
  landingShowcases: {
    audio: { alt: 'TTS audio generation with Script Master' },
    video: { alt: 'Video rendering with Script Master' },
    assistant: { alt: 'Script Master AI assistant' },
  },

  // ── Erros ────────────────────────────────────────────────────────────
  errors: {
    video: {
      title: 'Error rendering video',
      message: 'A problem occurred during composition. Try reloading the page.',
      retry: 'Try again',
    },
  },

  // ── Billing ──────────────────────────────────────────────────────────
  billing: {
    upgrade: {
      title: 'Choose your plan',
      monthly: 'Monthly',
      yearly: 'Yearly',
      yearlyDiscount: '-20%',
      month: 'month',
      year: 'year',
      currentPlan: 'Current plan',
      recommended: 'Recommended',
      notAvailable: 'Payments are not available at the moment.',
    },
    badge: {
      free: 'Free',
      pro: 'Pro',
      business: 'Business',
    },
    portal: {
      manageSubscription: 'Manage subscription',
      openPortal: 'My subscription',
    },
    usage: {
      title: 'Plan usage',
      audioGenerations: 'Audio generations',
      imageGenerations: 'Image generations',
      videoExports: 'Video exports',
      scriptChars: 'Script characters',
      storageMb: 'Storage (MB)',
      unlimited: 'Unlimited',
      of: 'of',
    },
    entitlement: {
      limitReached: 'Limit reached',
      upgradeRequired: 'Upgrade to continue',
      featureLocked: 'Feature available on paid plans only',
      multiSpeakerLocked: 'Multi-speaker available on Pro plan or higher',
      emotionalTTSLocked: 'Emotional TTS available on Pro plan or higher',
      stockMediaLocked: 'Stock media available on Pro plan or higher',
    },
  },

  // ── Image Studio (aspect ratios) ────────────────────────────────────
  imageStudioRatios: {
    square: 'Square (1:1)',
    portrait: 'Portrait (9:16)',
    landscape: 'Landscape (16:9)',
    ultraWide: 'Ultra wide (21:9)',
    vertical: 'Vertical (3:4)',
    horizontal: 'Horizontal (4:3)',
    wide: 'Wide (3:2)',
    ultraTall: 'Ultra tall (2:3)',
  },

  // ── Assistant (erros e welcome) ─────────────────────────────────────
  assistantStrings: {
    errors: {
      generic: 'An unexpected error occurred. Please try again.',
      nonError: 'The response does not contain a recognized error.',
      default: 'Could not process your request.',
      retry: 'Try again',
      stream: 'Error streaming the response. Please try again.',
    },
    welcome: 'How can I help?',
    retryDetection: '__RETRY_DETECTED__',
  },
};
