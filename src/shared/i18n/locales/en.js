// Texts and prompts in English (en)

const en = {
  systemPrompt: `You are "DeixaDisso", an on-device personal moderation and mental health assistant on social media (X, BlueSky, Threads).
Your mission is to read the provided post or reply and analyze with your intelligence whether the user should or should NOT reply to it.

Evaluate based on context, intent, tone, and overall semantics:
- "leave" (Leave it alone): The post is hostile, bad-faith, trolling/ragebait, insults people, or is a futile argument where replying will only cause emotional drain.
- "caution" (Caution): Sensitive topic, sharp sarcasm, or a heated debate that requires caution.
- "safe" (Productive): Civilized, friendly, harmless humor, genuine inquiry, or productive discussion.

Output MUST be valid pure JSON (no markdown wrapper):
{
  "verdict": "leave" | "caution" | "safe",
  "reason": "1 to 2 concise sentences in English explaining why it is or is not worth replying based on what the person actually said."
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
    sourceFallback: 'Anti-Ragebait AI',
    analyzingInitial: 'Evaluating whether replying to this post is worth your time and peace of mind...',
    emptyPost: 'Post without text content.',
    nanoFailed: 'Gemini Nano did not respond. All analysis relies on the on-device AI model.'
  },

  popup: {
    tagline: 'Peace of Mind Filter with Gemini Nano',
    statusVerifying: 'Checking...',
    statusReady: 'Gemini Nano Active',
    statusDownloading: 'Downloading Nano...',
    statusDownloadAvailable: 'Download Ready',
    statusFlagsRequired: 'Enable Flags',

    setupTitle: 'Gemini Nano Required',
    setupSubtitle: 'This extension processes 100% of posts locally via Chrome\'s native <b>Prompt API</b>. Because the AI is not yet enabled, analysis is paused and no badges will be displayed on your feeds.',
    
    downloadActionTitle: '⬇️ Download Gemini Nano Locally',
    downloadActionDesc: 'Prompt API flags are active! Click below to start downloading the model through Chrome (~1.7 GB).',
    downloadActionBtn: '⬇️ Start Gemini Nano Download',
    downloadingBtn: 'Downloading model...',
    downloadStarting: 'Starting download...',
    downloadProgressLabel: 'Downloading model: {percent}%',
    downloadComplete: 'Download complete! Gemini Nano is ready.',

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

    sectionPlatforms: 'Monitored Networks',
    sectionSensitivity: 'Sensitivity Level',
    sensLenientTitle: 'Lenient',
    sensLenientDesc: 'Only alerts on severe hostility',
    sensBalancedTitle: 'Balanced',
    sensBalancedDesc: 'Ragebait and bad-faith arguments',
    sensZenTitle: 'Zen Mode',
    sensZenDesc: 'Maximum emotional protection',

    sectionTester: 'Test a Phrase Now',
    testerHint: 'Simulate with Gemini Nano',
    testerPlaceholder: 'Paste a reply or tweet for the AI to analyze...',
    testerBtn: 'Analyze Post',
    testerAnalyzing: 'Analyzing with Gemini Nano...',
    testerReasonPrefix: 'Diagnosis:',

    footer: '100% on-device & private • Zero data sent to the cloud'
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = en;
} else if (typeof globalThis !== 'undefined') {
  globalThis.DEIXADISSO_I18N_EN = en;
}
