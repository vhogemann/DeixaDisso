// Bridge para Gemini Nano (Prompt API do Chrome) no documento Offscreen

let nanoSession = null;
let isDownloading = false;
let downloadPercent = 0;
let downloadStatusText = '';

function getSystemPrompt() {
  if (globalThis.DeixaDissoI18n?.getSystemPrompt) {
    return globalThis.DeixaDissoI18n.getSystemPrompt();
  }
  return '';
}

// Utiliza o helper unificado da Prompt API
function getPromptAPI() {
  return globalThis.DeixaDissoPromptAPI;
}

async function checkModelStatus() {
  if (nanoSession) {
    return { status: 'ready' };
  }

  if (isDownloading) {
    return {
      status: 'downloading',
      progress: downloadPercent,
      text: downloadStatusText || `${downloadPercent}% baixado`
    };
  }

  const promptApi = getPromptAPI();
  if (!promptApi) {
    return {
      status: 'flags_required',
      error: 'Prompt API não carregada.'
    };
  }

  try {
    const result = await promptApi.checkAvailability();
    return result;
  } catch (err) {
    console.warn('[DeixaDisso Offscreen] Erro ao checar status do modelo:', err);
    return { status: 'flags_required', error: err.message };
  }
}

// Dispara o download oficial do modelo criando a sessão com monitor de downloadprogress
async function startModelDownload() {
  const promptApi = getPromptAPI();
  if (!promptApi) {
    throw new Error('Prompt API não encontrada no navegador.');
  }

  if (nanoSession) {
    return { status: 'ready' };
  }

  if (isDownloading) {
    return { status: 'downloading', progress: downloadPercent };
  }

  isDownloading = true;
  downloadPercent = 0;
  downloadStatusText = 'Iniciando download pelo Chrome...';
  console.log('[DeixaDisso] Disparando download do Gemini Nano via Prompt API...');

  try {
    nanoSession = await promptApi.createSession({
      systemPrompt: getSystemPrompt(),
      temperature: 0.3,
      topK: 3,
      onProgress: (percent, event) => {
        downloadPercent = percent;
        downloadStatusText = `Baixando modelo: ${downloadPercent}%`;
        console.log(`[DeixaDisso] Progresso do download: ${downloadPercent}%`);

        chrome.storage.local.set({
          deixadisso_download_status: {
            isDownloading: true,
            progress: downloadPercent,
            text: downloadStatusText
          }
        });
      }
    });

    isDownloading = false;
    downloadPercent = 100;
    downloadStatusText = 'Download concluído! Gemini Nano pronto.';
    console.log('[DeixaDisso] Sessão do Gemini Nano criada com sucesso!');

    chrome.storage.local.set({
      deixadisso_download_status: {
        isDownloading: false,
        progress: 100,
        text: 'Pronto!'
      }
    });

    return { status: 'ready' };
  } catch (err) {
    isDownloading = false;
    downloadStatusText = `Erro no download: ${err.message}`;
    console.error('[DeixaDisso] Erro ao baixar modelo:', err);
    chrome.storage.local.set({
      deixadisso_download_status: {
        isDownloading: false,
        progress: 0,
        error: err.message
      }
    });
    throw err;
  }
}

async function getOrCreateSession() {
  if (nanoSession) return nanoSession;
  
  // Tenta criar ou continuar o download
  await startModelDownload();
  if (nanoSession) return nanoSession;

  throw new Error('Não foi possível inicializar a sessão do Gemini Nano.');
}

async function analyzePostText(text) {
  const isEn = globalThis.DeixaDissoI18n?.getLocale?.() === 'en';
  const baseFailed = globalThis.DeixaDissoI18n?.t('ui.nanoFailed') || 'Gemini Nano did not respond.';

  try {
    const promptApi = getPromptAPI();
    if (!promptApi) {
      throw new Error('Prompt API helper não encontrado.');
    }

    return await promptApi.analyzePost(text, {
      systemPrompt: getSystemPrompt(),
      lang: isEn ? 'en' : 'pt',
      emptyReason: globalThis.DeixaDissoI18n?.t('ui.emptyPost')
    });
  } catch (err) {
    console.error('[DeixaDisso Offscreen] Erro durante inferência com Gemini Nano:', err);
    nanoSession = null;

    const errMsg = err?.message || 'verifique o status do modelo';
    return {
      verdict: 'caution',
      reason: `${baseFailed} (${errMsg})`,
      source: 'error'
    };
  }
}

// Ouvinte de mensagens do Service Worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') return;

  if (message.type === 'CHECK_MODEL') {
    checkModelStatus().then(status => sendResponse(status));
    return true;
  }

  if (message.type === 'START_DOWNLOAD') {
    startModelDownload()
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ status: 'error', error: err.message }));
    return true;
  }

  if (message.type === 'ANALYZE') {
    analyzePostText(message.text).then(result => sendResponse(result));
    return true;
  }
});
