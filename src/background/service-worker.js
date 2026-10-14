// Service Worker principal da extensão DeixaDisso
import '../shared/constants.js';

let creatingOffscreenPromise = null;
const analysisCache = new Map(); // Hash -> { verdict, badgeText, reason, source }
const MAX_CACHE_SIZE = 500;

// Garantir documento offscreen para execução com acesso ao DOM/Window AI
async function setupOffscreenDocument() {
  const offscreenUrl = 'src/offscreen/offscreen.html';
  
  if (creatingOffscreenPromise) {
    return creatingOffscreenPromise;
  }

  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL(offscreenUrl)]
  });

  if (existingContexts.length > 0) {
    return;
  }

  creatingOffscreenPromise = chrome.offscreen.createDocument({
    url: offscreenUrl,
    reasons: ['DOM_PARSER'],
    justification: 'Acesso à Prompt API (Gemini Nano) e processamento de texto'
  });

  await creatingOffscreenPromise;
  creatingOffscreenPromise = null;
}

// Cria hash simples de string para cache
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
}

async function getStats() {
  const keys = globalThis.DEIXADISSO_CONSTANTS?.STORAGE_KEYS || { STATS: 'deixadisso_stats' };
  const today = new Date().toISOString().split('T')[0];
  const defaultStats = {
    totalAnalyzed: 0,
    avoidedCount: 0,
    cautionCount: 0,
    safeCount: 0,
    dailyAvoided: { [today]: 0 }
  };

  try {
    const data = await chrome.storage.local.get(keys.STATS);
    const current = data[keys.STATS] || defaultStats;
    if (!current.dailyAvoided) current.dailyAvoided = {};
    if (typeof current.dailyAvoided[today] !== 'number') current.dailyAvoided[today] = 0;
    return current;
  } catch (e) {
    return defaultStats;
  }
}

async function recordStats(verdict) {
  const keys = globalThis.DEIXADISSO_CONSTANTS?.STORAGE_KEYS || { STATS: 'deixadisso_stats' };
  const today = new Date().toISOString().split('T')[0];

  try {
    const stats = await getStats();
    stats.totalAnalyzed = (stats.totalAnalyzed || 0) + 1;

    if (verdict === 'leave') {
      stats.avoidedCount = (stats.avoidedCount || 0) + 1;
      stats.dailyAvoided[today] = (stats.dailyAvoided[today] || 0) + 1;
    } else if (verdict === 'caution') {
      stats.cautionCount = (stats.cautionCount || 0) + 1;
    } else if (verdict === 'safe') {
      stats.safeCount = (stats.safeCount || 0) + 1;
    }

    await chrome.storage.local.set({ [keys.STATS]: stats });
  } catch (e) {
    console.warn('[ServiceWorker] Falha ao gravar stats:', e);
  }
}

// Ouvinte de mensagens de Content Scripts e Popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Ignorar mensagens destinadas diretamente ao offscreen
  if (message.target === 'offscreen') return;

  const msgType = message.type;
  const CONSTS = globalThis.DEIXADISSO_CONSTANTS || {};

  if (msgType === CONSTS.MESSAGE_TYPES?.ANALYZE_POST || msgType === 'ANALYZE_POST') {
    handlePostAnalysis(message.text, message.sensitivity).then(result => {
      sendResponse(result);
    });
    return true; // Resposta assíncrona
  }

  if (msgType === CONSTS.MESSAGE_TYPES?.GET_MODEL_STATUS || msgType === 'GET_MODEL_STATUS') {
    checkModelStatus().then(status => {
      updateActionBadge(status?.status);
      sendResponse(status);
    });
    return true;
  }

  if (msgType === CONSTS.MESSAGE_TYPES?.RECORD_AVOIDED || msgType === 'RECORD_AVOIDED') {
    recordStats('leave').then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msgType === 'START_DOWNLOAD') {
    updateActionBadge('downloading');
    startModelDownload().then(res => {
      if (res && res.status === 'ready') {
        updateActionBadge('ready');
      }
      sendResponse(res);
    });
    return true;
  }

  if (msgType === 'UPDATE_ACTION_BADGE') {
    updateActionBadge(message.status).then(() => sendResponse({ ok: true }));
    return true;
  }
});

async function startModelDownload() {
  try {
    await setupOffscreenDocument();
    return await chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'START_DOWNLOAD'
    });
  } catch (err) {
    return { status: 'error', error: err.message };
  }
}

async function handlePostAnalysis(text, sensitivity) {
  if (!text || text.trim().length === 0) {
    return {
      verdict: 'safe',
      badgeText: 'Vazio',
      reason: 'Post sem texto legível.'
    };
  }

  const textHash = hashString(text.trim() + '_' + (sensitivity || 'balanced'));
  if (analysisCache.has(textHash)) {
    return analysisCache.get(textHash);
  }

  try {
    await setupOffscreenDocument();
    const result = await chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'ANALYZE',
      text,
      sensitivity
    });

    if (result && result.verdict) {
      if (analysisCache.size >= MAX_CACHE_SIZE) {
        const firstKey = analysisCache.keys().next().value;
        analysisCache.delete(firstKey);
      }
      analysisCache.set(textHash, result);
      await recordStats(result.verdict);
      return result;
    }
  } catch (error) {
    console.error('[ServiceWorker] Erro no processamento offscreen:', error);
  }

  return {
    verdict: 'safe',
    badgeText: 'Normal',
    reason: 'Não foi possível completar a análise.'
  };
}

async function checkModelStatus() {
  try {
    await setupOffscreenDocument();
    const status = await chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'CHECK_MODEL'
    });
    return status;
  } catch (err) {
    return { status: 'fallback', error: err.message };
  }
}

// ==========================================
// Toolbar Action Badge Management (Status Icon)
// ==========================================

function getBadgeTooltip(type, details = '') {
  const lang = (chrome.i18n?.getUILanguage && chrome.i18n.getUILanguage()) || 'en';
  const isPt = lang.toLowerCase().startsWith('pt');

  switch (type) {
    case 'disabled':
      return isPt ? 'DeixaDisso: Desativado nas configurações' : 'DeixaDisso: Disabled in settings';
    case 'downloading':
      return isPt ? `DeixaDisso: Baixando Gemini Nano (${details}%)` : `DeixaDisso: Downloading Gemini Nano (${details}%)`;
    case 'download_available':
      return isPt ? 'DeixaDisso: Gemini Nano pronto para download (Clique para baixar)' : 'DeixaDisso: Gemini Nano ready to download (Click to start)';
    case 'flags_required':
    case 'unavailable':
    case 'fallback':
      return isPt ? 'DeixaDisso: Prompt API indisponível (Clique para instruções)' : 'DeixaDisso: Prompt API unavailable (Click for instructions)';
    case 'ready':
      return isPt ? 'DeixaDisso: Gemini Nano ativo e protegendo seu feed' : 'DeixaDisso: Gemini Nano active and protecting your feed';
    default:
      return 'DeixaDisso';
  }
}

async function updateActionBadge(statusOverride = null) {
  try {
    if (!chrome.action) return;

    // 1. Interruptor geral desativado
    const settingsData = await chrome.storage.local.get('deixadisso_settings');
    const settings = settingsData.deixadisso_settings || {};
    if (settings.enabled === false) {
      await chrome.action.setBadgeText({ text: 'OFF' });
      await chrome.action.setBadgeBackgroundColor({ color: '#6B7280' }); // Cinza
      await chrome.action.setTitle({ title: getBadgeTooltip('disabled') });
      return;
    }

    // 2. Download em andamento
    const dlData = await chrome.storage.local.get('deixadisso_download_status');
    const dlStatus = dlData.deixadisso_download_status;
    if (dlStatus?.isDownloading) {
      const progress = dlStatus.progress || 0;
      const text = progress > 0 ? `${progress}%` : '...';
      await chrome.action.setBadgeText({ text });
      await chrome.action.setBadgeBackgroundColor({ color: '#3B82F6' }); // Azul
      await chrome.action.setTitle({ title: getBadgeTooltip('downloading', progress) });
      return;
    }

    // 3. Status da Prompt API
    let status = statusOverride;
    if (!status) {
      const modelStatus = await checkModelStatus();
      status = modelStatus?.status || 'flags_required';
    }

    if (status === 'flags_required' || status === 'fallback' || status === 'unavailable') {
      // Sinal de alerta: API indisponível ou flags não configuradas
      await chrome.action.setBadgeText({ text: '!' });
      await chrome.action.setBadgeBackgroundColor({ color: '#EF4444' }); // Vermelho vibrante de alerta
      await chrome.action.setTitle({ title: getBadgeTooltip('flags_required') });
    } else if (status === 'download_available') {
      // Modelo disponível para download local
      await chrome.action.setBadgeText({ text: 'DL' });
      await chrome.action.setBadgeBackgroundColor({ color: '#F59E0B' }); // Âmbar / Laranja
      await chrome.action.setTitle({ title: getBadgeTooltip('download_available') });
    } else if (status === 'downloading') {
      await chrome.action.setBadgeText({ text: '...' });
      await chrome.action.setBadgeBackgroundColor({ color: '#3B82F6' });
      await chrome.action.setTitle({ title: getBadgeTooltip('downloading', 0) });
    } else if (status === 'ready') {
      // 100% pronto e ativo: limpa o badge para manter a barra limpa e sem poluição visual
      await chrome.action.setBadgeText({ text: '' });
      await chrome.action.setTitle({ title: getBadgeTooltip('ready') });
    }
  } catch (err) {
    console.warn('[ServiceWorker] Falha ao atualizar action badge:', err);
  }
}

// Ouvir alterações de download e configurações para atualizar o badge em tempo real
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.deixadisso_download_status || changes.deixadisso_settings) {
      updateActionBadge();
    }
  }
});

chrome.runtime.onInstalled.addListener(() => {
  updateActionBadge();
});

chrome.runtime.onStartup.addListener(() => {
  updateActionBadge();
});

// Execução inicial ao subir o service worker
updateActionBadge();

