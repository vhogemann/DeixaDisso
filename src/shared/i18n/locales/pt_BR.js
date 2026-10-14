// Textos e prompts em Português do Brasil (pt_BR)

const pt_BR = {
  systemPrompt: `Você é o "DeixaDisso", assistente de moderação e saúde mental pessoal em redes sociais (X, BlueSky, Threads).
Sua missão é ler o post ou resposta fornecido e analisar com sua inteligência se o usuário deve ou NÃO responder a ele.

Avalie com base no contexto, intenção, tom e semântica geral:
- "leave" (Deixa disso): O post é hostil, desonesto, busca briga gratuita (ragebait), ofende pessoas ou é uma discussão estéril onde responder causará desgaste mental.
- "caution" (Cuidado): Tema polêmico, sarcasmo afiado ou debate acalorado que exige cautela.
- "safe" (Produtivo): Conteúdo civilizado, amigável, humor inofensivo, dúvida sincera ou debate produtivo.

Responda OBRIGATORIAMENTE em formato JSON puro (sem markdown):
{
  "verdict": "leave" | "caution" | "safe",
  "reason": "1 a 2 frases concisas em português explicando o motivo pelo qual vale ou não responder com base no que a pessoa realmente disse."
}`,

  badges: {
    leave: {
      label: 'Deixa disso',
      shortLabel: 'Deixa disso',
      icon: '🚫',
      description: 'Alto risco de desgaste emocional ou discussão improdutiva.'
    },
    caution: {
      label: 'Cuidado',
      shortLabel: 'Cuidado',
      icon: '⚠️',
      description: 'Discussão sensível ou tom potencialmente inflamado.'
    },
    safe: {
      label: 'Produtivo',
      shortLabel: 'Produtivo',
      icon: '✅',
      description: 'Post construtivo, informativo ou seguro para interagir.'
    },
    loading: {
      label: 'Analisando...',
      shortLabel: '...',
      icon: '🧠',
      description: 'O Gemini Nano está analisando este post localmente.'
    }
  },

  ui: {
    avoidAction: '🙏 Deixei disso (+1 Paz)',
    avoidRecorded: '✓ Registrado!',
    sourceGeminiNano: 'Gemini Nano (On-device)',
    sourceFallback: 'IA Anti-Ragebait',
    analyzingInitial: 'Avaliando se responder a este post vale o seu tempo e paz de espírito...',
    emptyPost: 'Post sem conteúdo textual.',
    nanoFailed: 'O Gemini Nano não respondeu. Toda a análise depende do modelo de IA.'
  },

  popup: {
    tagline: 'Filtro de Paz Mental com Gemini Nano',
    statusVerifying: 'Verificando...',
    statusReady: 'Gemini Nano Ativo',
    statusDownloading: 'Baixando Nano...',
    statusDownloadAvailable: 'Download Pronto',
    statusFlagsRequired: 'Ativar Flags',

    setupTitle: 'Gemini Nano Necessário',
    setupSubtitle: 'Esta extensão processa 100% dos posts localmente através da <b>Prompt API</b> nativa do Chrome. Como a IA ainda não está habilitada, a análise está desativada e nenhum badge será exibido nos seus feeds.',
    
    downloadActionTitle: '⬇️ Baixar Gemini Nano Localmente',
    downloadActionDesc: 'As flags da Prompt API estão ativas! Clique abaixo para iniciar o download do modelo pelo Chrome (~1.7 GB).',
    downloadActionBtn: '⬇️ Iniciar Download do Gemini Nano',
    downloadingBtn: 'Baixando modelo...',
    downloadStarting: 'Iniciando download...',
    downloadProgressLabel: 'Baixando modelo: {percent}%',
    downloadComplete: 'Download concluído! Gemini Nano pronto.',

    step1: 'Copie e cole na barra de endereços:',
    step1Mark: 'Marque como <b>Enabled</b>.',
    step2: 'Em seguida, acesse:',
    step2Mark: 'Marque como <b>Enabled (BypassPerfRequirement)</b>.',
    step3: 'Clique no botão <b>Relaunch</b> no rodapé do Chrome para reiniciar o navegador.',
    copyBtn: 'Copiar',
    copiedBtn: 'Copiado!',
    recheckBtn: '🔄 Verificar Disponibilidade Novamente',

    masterTitle: 'Proteção Ativa',
    masterSubtitle: 'Classificar posts em tempo real',
    statsAvoided: 'Discussões evitadas hoje 🙏',
    statsAnalyzed: 'Posts analisados',

    sectionPlatforms: 'Redes Monitoradas',
    sectionSensitivity: 'Nível de Sensibilidade',
    sensLenientTitle: 'Tolerante',
    sensLenientDesc: 'Alerta só hostilidades graves',
    sensBalancedTitle: 'Equilibrado',
    sensBalancedDesc: 'Ragebait e discussões de má-fé',
    sensZenTitle: 'Modo Zen',
    sensZenDesc: 'Máxima proteção emocional',

    sectionTester: 'Testar Frase Agora',
    testerHint: 'Simule com o Gemini Nano',
    testerPlaceholder: 'Cole uma resposta ou tweet para a IA analisar...',
    testerBtn: 'Analisar Post',
    testerAnalyzing: 'Analisando com Gemini Nano...',
    testerReasonPrefix: 'Diagnóstico:',

    footer: '100% on-device & privado • Zero dados enviados para a nuvem'
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = pt_BR;
} else if (typeof globalThis !== 'undefined') {
  globalThis.DEIXADISSO_I18N_PT_BR = pt_BR;
}
