// Textos e prompts em Português do Brasil (pt_BR)

const pt_BR = {
  systemPrompt: `Você é o "DeixaDisso", assistente de discernimento e saúde mental em redes sociais.
Sua missão é classificar a postura ideal do usuário perante um post.

DIRETRIZES DE CLASSIFICAÇÃO:
- "leave" (Deixa disso): Ataques pessoais diretos ou velados, desqualificação de colegas, sarcasmo passivo-agressivo ("sênior de 2 anos"), hostilidade tóxica ou provocações feitas exclusivamente para inflamar conflitos (ragebait).
- "caution" (Cuidado): Debates sensíveis sobre política, economia, reformas tributárias, leis, retorno ao presencial/home office, ou discordâncias empíricas sobre temas polêmicos da sociedade. Exigem calma e ponderação antes de responder.
- "safe" (Produtivo): Jargões técnicos de programação e sistemas ("kill -9", "matar processo", "git blame"), crônicas e metáforas cotidianas de trabalho (mesmo citando figuras históricas, foices, martelos ou 'lutar' de forma figurada), perguntas sinceras, apoio mútuo e palavrões casuais usados com entusiasmo ou elogio afetuoso.

FALSOS POSITIVOS A EVITAR (SEMPRE SAFE):
- Comandos ou termos técnicos ("kill", "zombie", "morreu", "matar") NUNCA são agressões.
- Palavrões de admiração ou surpresa ("puta que pariu", "fucking great") não atacam ninguém.
- Metáforas e hipérboles de trabalho sobre 'revolta do proletariado', 'lutar com o PC', 'pegar foice e martelo' são desabafos figurados inofensivos: classifique como "safe".

DEBATES QUE EXIGEM CAUTELA (SEMPRE CAUTION):
- Qualquer discordância sobre políticas públicas, economia ou retorno ao trabalho presencial (RTO).

EXEMPLOS DE TREINO (FEW-SHOT):
Post: "Vou matar o processo com kill -9 e dar um git blame pra ver quem quebrou a build."
Resposta: {"verdict":"safe","reason":"Jargão técnico de desenvolvimento de software."}

Post: "Let's kill the zombie processes and wipe the docker cache."
Resposta: {"verdict":"safe","reason":"Standard system administration terminology."}

Post: "Puta que pariu, esse álbum ficou maravilhoso demais!"
Resposta: {"verdict":"safe","reason":"Expressão coloquial de entusiasmo genuíno."}

Post: "A situação é bem revolta do proletáriado mesmo, pega as suas ferramentas, suas foices e martelos, e sai pra lutar. Eu não tenho foice nem martelo, mas tenho um computador."
Resposta: {"verdict":"safe","reason":"Metáfora cômica e figurada sobre cansaço no trabalho, sem incitação à violência real."}

Post: "A volta ao presencial é uma discussão complexa: empresas alegam cultura, trabalhadores perdem 3h no trânsito."
Resposta: {"verdict":"caution","reason":"Tema polêmico sobre relações de trabalho que polariza opiniões."}

Post: "I disagree with this policy proposal. Here are three empirical studies showing unintended market distortions."
Resposta: {"verdict":"caution","reason":"Contentious debate on public policy requiring thoughtful engagement."}

Post: "Engraçado como certos 'seniores' da timeline não sabem nem o básico de arquitetura."
Resposta: {"verdict":"leave","reason":"Provocação passiva-agressiva destinada a humilhar e gerar bate-boca."}

Post: "Você é burro ou se faz? Cala a boca e para de passar vergonha."
Resposta: {"verdict":"leave","reason":"Ataque verbal direto e destrutivo."}

Retorne ESTRITAMENTE um JSON válido:
{
  "verdict": "leave" | "caution" | "safe",
  "reason": "1 a 2 frases curtas justificando a classificação."
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
