// Constantes compartilhadas da extensão DeixaDisso
const DEIXADISSO_CONSTANTS = {
  VERDICTS: {
    LEAVE: 'leave',       // "Deixa disso" - ragebait, tóxico, perda de tempo
    CAUTION: 'caution',   // "Cuidado" - tema polarizado, sarcasmo agressivo, debate acalorado
    SAFE: 'safe'          // "Produtivo" - civilizado, informativo, construtivo, descontraído
  },

  get BADGE_CONFIG() {
    if (globalThis.DeixaDissoI18n && typeof globalThis.DeixaDissoI18n.getBadgeConfig === 'function') {
      return globalThis.DeixaDissoI18n.getBadgeConfig();
    }
    return {
      leave: {
        label: 'Deixa disso',
        shortLabel: 'Deixa disso',
        icon: '🚫',
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.15)',
        border: 'rgba(239, 68, 68, 0.35)',
        description: 'Alto risco de desgaste emocional ou discussão improdutiva.'
      },
      caution: {
        label: 'Cuidado',
        shortLabel: 'Cuidado',
        icon: '⚠️',
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.15)',
        border: 'rgba(245, 158, 11, 0.35)',
        description: 'Discussão sensível ou tom potencialmente inflamado.'
      },
      safe: {
        label: 'Produtivo',
        shortLabel: 'Produtivo',
        icon: '✅',
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.15)',
        border: 'rgba(16, 185, 129, 0.35)',
        description: 'Post construtivo, informativo ou seguro para interagir.'
      },
      loading: {
        label: 'Analisando...',
        shortLabel: '...',
        icon: '🧠',
        color: '#818cf8',
        bg: 'rgba(129, 140, 248, 0.15)',
        border: 'rgba(129, 140, 248, 0.3)',
        description: 'O Gemini Nano está analisando este post localmente.'
      }
    };
  },

  MESSAGE_TYPES: {
    ANALYZE_POST: 'DEIXADISSO_ANALYZE_POST',
    GET_MODEL_STATUS: 'DEIXADISSO_GET_MODEL_STATUS',
    MODEL_STATUS_RESULT: 'DEIXADISSO_MODEL_STATUS_RESULT',
    RECORD_AVOIDED: 'DEIXADISSO_RECORD_AVOIDED'
  },

  STORAGE_KEYS: {
    SETTINGS: 'deixadisso_settings',
    STATS: 'deixadisso_stats',
    CACHE: 'deixadisso_cache'
  },

  BACKENDS: {
    AUTO: 'auto',
    GEMINI_NANO: 'gemini_nano',
    WEB_LLM: 'webllm'
  },

  WEBLLM_MODELS: [
    {
      id: 'Qwen3-0.6B-q4f16_1-MLC',
      name: 'Qwen 3 0.6B (Rápido & Leve • 79% acc)',
      size: '~380 MB'
    },
    {
      id: 'gemma3-1b-it-q4f16_1-MLC',
      name: 'Gemma 3 1B (Ultra Baixa VRAM • 711 MB)',
      size: '~500 MB'
    },
    {
      id: 'gemma-2-2b-it-q4f16_1-MLC-1k',
      name: 'Gemma 2 2B (Máxima Precisão • 0 FN)',
      size: '~1.3 GB'
    }
  ],

  DEFAULT_WEBLLM_MODEL: 'Qwen3-0.6B-q4f16_1-MLC',

  DEFAULT_SETTINGS: {
    enabled: true,
    enabledSites: {
      twitter: true,
      bluesky: true,
      threads: true
    },
    sensitivity: 'balanced', // 'zen' (mais protetor), 'balanced', 'lenient' (tolerante)
    backend: 'auto',         // 'auto', 'webllm', 'gemini_nano'
    webllmModel: 'Qwen3-0.6B-q4f16_1-MLC',
    autoAnalyze: true,
    showSafeBadges: true
  }
};

// Exportar para ES Modules se estiver no contexto do background, ou window se content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DEIXADISSO_CONSTANTS;
} else if (typeof globalThis !== 'undefined') {
  globalThis.DEIXADISSO_CONSTANTS = DEIXADISSO_CONSTANTS;
}
