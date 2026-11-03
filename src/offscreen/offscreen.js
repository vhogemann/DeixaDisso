// Bridge Híbrido para IA Local (Gemini Nano + @mlc-ai/web-llm) no documento Offscreen

let activeSession = null;
let isDownloading = false;
let downloadPercent = 0;
let downloadStatusText = '';

function getSystemPrompt() {
  if (globalThis.DeixaDissoI18n?.getSystemPrompt) {
    return globalThis.DeixaDissoI18n.getSystemPrompt();
  }
  return '';
}

function getPromptAPI() {
  return globalThis.DeixaDissoPromptAPI;
}

async function getBackendConfig(override = {}) {
  const defaults = {
    backend: globalThis.DEIXADISSO_CONSTANTS?.DEFAULT_SETTINGS?.backend || 'auto',
    webllmModel: globalThis.DEIXADISSO_CONSTANTS?.DEFAULT_WEBLLM_MODEL || 'Qwen3-0.6B-q4f16_1-MLC'
  };

  try {
    const data = await chrome.storage.local.get('deixadisso_settings');
    const saved = data.deixadisso_settings || {};
    return {
      backend: override.backend || saved.backend || defaults.backend,
      modelId: override.modelId || saved.webllmModel || defaults.webllmModel
    };
  } catch (_) {
    return {
      backend: override.backend || defaults.backend,
      modelId: override.modelId || defaults.webllmModel
    };
  }
}

async function checkModelStatus(options = {}) {
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
      error: 'Prompt API / WebLLM helper não carregado.'
    };
  }

  try {
    const config = await getBackendConfig(options);
    const result = await promptApi.checkAvailability(config);
    return result;
  } catch (err) {
    console.warn('[DeixaDisso Offscreen] Erro ao checar status do modelo:', err);
    return { status: 'flags_required', error: err.message };
  }
}

// Dispara o download/inicialização do modelo (Gemini Nano ou WebLLM via WebGPU)
async function startModelDownload(options = {}) {
  const promptApi = getPromptAPI();
  if (!promptApi) {
    throw new Error('Módulo de IA local não encontrado.');
  }

  if (isDownloading) {
    return { status: 'downloading', progress: downloadPercent };
  }

  const config = await getBackendConfig(options);

  isDownloading = true;
  downloadPercent = 0;
  downloadStatusText = 'Iniciando download do modelo local...';
  console.log(`[DeixaDisso] Disparando inicialização/download (${config.backend} / ${config.modelId})...`);

  try {
    activeSession = await promptApi.createSession({
      backend: config.backend,
      modelId: config.modelId,
      systemPrompt: getSystemPrompt(),
      temperature: 0.3,
      topK: 3,
      onProgress: (percent, info) => {
        downloadPercent = percent;
        downloadStatusText = info?.text || `Baixando modelo: ${downloadPercent}%`;
        console.log(`[DeixaDisso] Progresso: ${downloadPercent}% - ${downloadStatusText}`);

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
    downloadStatusText = 'Download concluído! IA local pronta.';
    console.log('[DeixaDisso] Sessão de IA local criada com sucesso!');

    chrome.storage.local.set({
      deixadisso_download_status: {
        isDownloading: false,
        progress: 100,
        text: 'Pronto!'
      }
    });

    const finalStatus = await promptApi.checkAvailability(config);
    return { status: 'ready', backend: finalStatus.backend, modelId: finalStatus.modelId };
  } catch (err) {
    isDownloading = false;
    downloadStatusText = `Erro no download: ${err.message}`;
    console.error('[DeixaDisso] Erro ao inicializar modelo:', err);
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

async function analyzePostText(text, options = {}) {
  const isEn = globalThis.DeixaDissoI18n?.getLocale?.() === 'en';
  const baseFailed = globalThis.DeixaDissoI18n?.t('ui.nanoFailed') || 'Local AI model did not respond.';

  try {
    const promptApi = getPromptAPI();
    if (!promptApi) {
      throw new Error('Prompt API helper não encontrado.');
    }

    const config = await getBackendConfig(options);

    return await promptApi.analyzePost(text, {
      backend: config.backend,
      modelId: config.modelId,
      systemPrompt: getSystemPrompt(),
      lang: isEn ? 'en' : 'pt',
      emptyReason: globalThis.DeixaDissoI18n?.t('ui.emptyPost')
    });
  } catch (err) {
    console.error('[DeixaDisso Offscreen] Erro durante inferência local:', err);
    activeSession = null;

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
    checkModelStatus({ backend: message.backend, modelId: message.modelId })
      .then(status => sendResponse(status));
    return true;
  }

  if (message.type === 'START_DOWNLOAD') {
    startModelDownload({ backend: message.backend, modelId: message.modelId })
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ status: 'error', error: err.message }));
    return true;
  }

  if (message.type === 'ANALYZE') {
    analyzePostText(message.text, {
      backend: message.backend,
      modelId: message.modelId
    }).then(result => sendResponse(result));
    return true;
  }
});
