// Texts and prompts in English (en)

const en = {
  systemPrompt: `You are "DeixaDisso", an on-device personal discernment and mental health assistant for social media.
Your mission is to classify the ideal user stance towards a post.

CLASSIFICATION GUIDELINES:
- "leave" (Leave it alone): Direct or subtle personal attacks, peer belittling, passive-aggressive sarcasm ("2-year senior"), toxic hostility, or provocations designed purely to incite conflict (ragebait).
- "caution" (Caution): Sensitive debates on politics, economics, tax reforms, legislation, return-to-office (RTO), or empirical disagreements on controversial societal topics. Require calm and thoughtful consideration before replying.
- "safe" (Productive): Technical programming/systems jargon ("kill -9", "kill process", "git blame"), everyday work chronicles and metaphors (even figuratively mentioning historical figures, scythes, hammers, or 'fighting'), sincere questions, mutual support, and casual profanity used with enthusiasm or positive praise.

FALSE POSITIVES TO AVOID (ALWAYS SAFE):
- Technical commands or terminology ("kill", "zombie", "dead", "destroy") are NEVER personal threats.
- Profanity expressing admiration, excitement or relief ("fucking great", "holy shit") does not target anyone.
- Figurative work rants or metaphors about 'proletariat revolt', 'fighting with my PC' are harmless: classify as "safe".

CONTENTIOUS DEBATES (ALWAYS CAUTION):
- Any substantive disagreement regarding public policy, economics, or return-to-office mandates.

TRAINING EXAMPLES (FEW-SHOT):
Post: "Vou matar o processo com kill -9 e dar um git blame pra ver quem quebrou a build."
Output: {"verdict":"safe","reason":"Technical software development terminology."}

Post: "Let's kill the zombie processes and wipe the docker cache."
Output: {"verdict":"safe","reason":"Standard system administration terminology."}

Post: "Holy shit, this new album turned out fucking wonderful!"
Output: {"verdict":"safe","reason":"Colloquial expression of genuine excitement."}

Post: "The situation feels like a workers revolt, grab your tools and fight. I don't have tools, but I have my PC."
Output: {"verdict":"safe","reason":"Figurative, humorous commentary on work routine without real-world incitement."}

Post: "The return-to-office debate is complex: companies claim culture, but employees waste 3h commuting."
Output: {"verdict":"caution","reason":"Polarizing workplace topic that easily triggers heated debates."}

Post: "I disagree with this policy proposal. Here are three empirical studies showing unintended market distortions."
Output: {"verdict":"caution","reason":"Contentious debate on public policy requiring thoughtful engagement."}

Post: "Funny how certain 'seniors' on this timeline don't even understand basic architecture."
Output: {"verdict":"leave","reason":"Passive-aggressive provocation intended to humiliate and bait pointless arguments."}

Post: "Are you an idiot or just pretending? Shut up and stop embarrassing yourself."
Output: {"verdict":"leave","reason":"Direct, destructive personal attack."}

Output STRICTLY valid JSON:
{
  "verdict": "leave" | "caution" | "safe",
  "reason": "1 to 2 short sentences explaining the rationale."
}`,

  badges: {
    leave: {
      label: 'Leave it',
      shortLabel: 'Leave it',
      icon: '🚫',
      description: 'High risk of emotional drain or pointless argument.'
    },
    caution: {
      label: 'Caution',
      shortLabel: 'Caution',
      icon: '⚠️',
      description: 'Sensitive topic or potentially heated argument.'
    },
    safe: {
      label: 'Productive',
      shortLabel: 'Productive',
      icon: '✅',
      description: 'Constructive, informative, or safe to engage.'
    },
    loading: {
      label: 'Analyzing...',
      shortLabel: '...',
      icon: '🧠',
      description: 'Gemini Nano is analyzing this post on-device.'
    }
  },

  ui: {
    avoidAction: '🙏 Left it alone (+1 Peace)',
    avoidRecorded: '✓ Recorded!',
    sourceGeminiNano: 'Gemini Nano (On-device)',
    sourceWebLLM: 'WebLLM (WebGPU On-device)',
    sourceFallback: 'Anti-Ragebait AI',
    analyzingInitial: 'Evaluating whether replying to this post is worth your time and peace of mind...',
    emptyPost: 'Post without text content.',
    nanoFailed: 'The local AI model did not respond. All analysis relies on the on-device AI model.'
  },

  popup: {
    tagline: 'On-Device Peace of Mind Filter (Nano & WebLLM)',
    statusVerifying: 'Checking...',
    statusReady: 'Local AI Active',
    statusReadyNano: 'Gemini Nano Active',
    statusReadyWebLLM: 'WebLLM Active',
    statusDownloading: 'Downloading AI...',
    statusDownloadAvailable: 'Download Ready',
    statusFlagsRequired: 'Setup AI',

    setupTitle: 'On-Device AI Setup',
    setupSubtitle: 'This extension processes 100% of posts locally in your browser via <b>WebLLM (WebGPU)</b> or <b>Gemini Nano</b>. Download a model below to activate protection with zero browser flags required.',
    
    downloadActionTitle: '⬇️ Download Local AI Model',
    downloadActionDesc: 'Your browser supports local WebGPU execution! Click below to download the selected model weights (100% private in browser cache).',
    downloadActionBtn: '⬇️ Download & Activate Local Model',
    downloadingBtn: 'Downloading model...',
    downloadStarting: 'Starting download...',
    downloadProgressLabel: 'Downloading model: {percent}%',
    downloadComplete: 'Download complete! Local AI is ready.',

    step1: 'Copy and paste into your address bar:',
    step1Mark: 'Set to <b>Enabled</b>.',
    step2: 'Next, navigate to:',
    step2Mark: 'Set to <b>Enabled (BypassPerfRequirement)</b>.',
    step3: 'Click the <b>Relaunch</b> button at the bottom of Chrome to restart the browser.',
    copyBtn: 'Copy',
    copiedBtn: 'Copied!',
    recheckBtn: '🔄 Check Availability Again',

    masterTitle: 'Active Protection',
    masterSubtitle: 'Classify posts in real time',
    statsAvoided: 'Arguments avoided today 🙏',
    statsAnalyzed: 'Posts analyzed',

    sectionBackend: 'AI Engine (On-Device)',
    backendAuto: 'Automatic (Nano or WebLLM)',
    backendWebLLM: 'WebLLM (WebGPU • Zero Flags)',
    backendNano: 'Chrome Gemini Nano (Prompt API)',
    labelWebLLMModel: 'WebLLM Model:',

    sectionPlatforms: 'Monitored Networks',
    sectionSensitivity: 'Sensitivity Level',
    sensLenientTitle: 'Lenient',
    sensLenientDesc: 'Only alerts on severe hostility',
    sensBalancedTitle: 'Balanced',
    sensBalancedDesc: 'Ragebait and bad-faith arguments',
    sensZenTitle: 'Zen Mode',
    sensZenDesc: 'Maximum emotional protection',

    sectionTester: 'Test a Phrase Now',
    testerHint: 'Simulate with Local AI',
    testerPlaceholder: 'Paste a reply or tweet for the AI to analyze...',
    testerBtn: 'Analyze Post',
    testerAnalyzing: 'Analyzing locally...',
    testerReasonPrefix: 'Diagnosis:',

    footer: '100% on-device & private • Zero data sent to the cloud'
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = en;
} else if (typeof globalThis !== 'undefined') {
  globalThis.DEIXADISSO_I18N_EN = en;
}
