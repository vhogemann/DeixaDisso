// Helper unificado e híbrido de IA On-Device para DeixaDisso
// Suporta:
// 1. Chrome Built-in Prompt API (Gemini Nano - W3C LanguageModel / ai.languageModel)
// 2. MLC-AI WebLLM (@mlc-ai/web-llm via WebGPU - zero flags necessárias)

(function(root) {
  'use strict';

  const DEFAULT_WEBLLM_MODEL =
    root.DEIXADISSO_CONSTANTS?.DEFAULT_WEBLLM_MODEL ||
    'Qwen3-0.6B-q4f16_1-MLC';

  // Estado persistente de sessões em memória (no contexto atual, ex: Offscreen)
  let cachedNanoSession = null;
  let cachedWebLLMEngine = null;
  let cachedWebLLMModelId = null;
  let activeBackendType = null; // 'gemini_nano' | 'webllm'

  /**
   * Obtém a referência para o bundle do @mlc-ai/web-llm
   */
  function getWebLLMAPI() {
    return (typeof globalThis !== 'undefined' && globalThis.DeixaDissoWebLLM) ||
           (typeof window !== 'undefined' && window.DeixaDissoWebLLM) ||
           (typeof self !== 'undefined' && self.DeixaDissoWebLLM) ||
           null;
  }

  /**
   * Verifica suporte a WebGPU no navegador
   */
  async function checkWebGPUSupport() {
    const nav = (typeof navigator !== 'undefined' && navigator) || null;
    if (!nav || !nav.gpu || typeof nav.gpu.requestAdapter !== 'function') {
      return { supported: false, error: 'WebGPU não está disponível neste navegador.' };
    }
    try {
      const adapter = await nav.gpu.requestAdapter();
      if (!adapter) {
        return { supported: false, error: 'Nenhum adaptador WebGPU compatível encontrado.' };
      }
      return { supported: true };
    } catch (err) {
      return { supported: false, error: err.message || 'Erro ao acessar WebGPU.' };
    }
  }

  /**
   * Verifica disponibilidade e cache do WebLLM
   */
  async function checkWebLLMAvailability(modelId = DEFAULT_WEBLLM_MODEL) {
    const webllm = getWebLLMAPI();
    const gpuCheck = await checkWebGPUSupport();

    if (!gpuCheck.supported) {
      return {
        status: 'unavailable',
        backend: 'webllm',
        detected: false,
        error: gpuCheck.error
      };
    }

    if (cachedWebLLMEngine && cachedWebLLMModelId === modelId) {
      return {
        status: 'ready',
        backend: 'webllm',
        modelId,
        detected: true,
        raw: 'ready_in_memory'
      };
    }

    // Se o bundle do WebLLM estiver carregado neste contexto, checa se os pesos já estão em cache
    if (webllm && typeof webllm.hasModelInCache === 'function') {
      try {
        const inCache = await webllm.hasModelInCache(modelId);
        if (inCache) {
          return {
            status: 'ready',
            backend: 'webllm',
            modelId,
            detected: true,
            raw: 'cached'
          };
        }
      } catch (err) {
        console.warn('[DeixaDisso PromptAPI] Erro ao checar cache do WebLLM:', err);
      }
    }

    return {
      status: 'download_available',
      backend: 'webllm',
      modelId,
      detected: true,
      raw: 'webgpu_downloadable',
      message: `Modelo WebLLM (${modelId}) pronto para download local via WebGPU.`
    };
  }

  /**
   * Obtém a referência para a Prompt API nativa do Chrome (Gemini Nano)
   */
  function getLanguageModelAPI() {
    const GlobalLM = (typeof globalThis !== 'undefined' && globalThis.LanguageModel) ||
                     (typeof window !== 'undefined' && window.LanguageModel) ||
                     (typeof self !== 'undefined' && self.LanguageModel);

    if (GlobalLM) {
      return {
        type: 'standard_LanguageModel',
        availability: async (options) => {
          if (typeof GlobalLM.availability === 'function') {
            return await GlobalLM.availability(options);
          }
          return 'unavailable';
        },
        create: async (options) => {
          return await GlobalLM.create(options);
        },
        params: async () => {
          if (typeof GlobalLM.params === 'function') {
            return await GlobalLM.params();
          }
          return null;
        },
        raw: GlobalLM
      };
    }

    const aiObj = (typeof globalThis !== 'undefined' && globalThis.ai) ||
                  (typeof window !== 'undefined' && window.ai) ||
                  (typeof self !== 'undefined' && self.ai);

    if (aiObj?.languageModel) {
      const lm = aiObj.languageModel;
      return {
        type: 'ai.languageModel',
        availability: async (options) => {
          if (typeof lm.availability === 'function') {
            return await lm.availability(options);
          }
          if (typeof lm.capabilities === 'function') {
            const caps = await lm.capabilities();
            return caps.available;
          }
          return 'unavailable';
        },
        create: async (options) => {
          return await lm.create(options);
        },
        params: async () => {
          if (typeof lm.params === 'function') {
            return await lm.params();
          }
          return null;
        },
        raw: lm
      };
    }

    if (aiObj?.canCreateTextSession) {
      return {
        type: 'legacy_canCreateTextSession',
        availability: async () => {
          return await aiObj.canCreateTextSession();
        },
        create: async (options) => {
          return await aiObj.createTextSession(options);
        },
        params: async () => null,
        raw: aiObj
      };
    }

    return null;
  }

  /**
   * Verifica a disponibilidade exclusiva do Gemini Nano (Prompt API)
   */
  async function checkNanoAvailability() {
    const api = getLanguageModelAPI();
    if (!api) {
      return {
        status: 'flags_required',
        backend: 'gemini_nano',
        detected: false,
        error: 'Prompt API não encontrada no navegador. As flags do Chrome precisam ser ativadas.'
      };
    }

    try {
      let rawStatus;
      try {
        rawStatus = await api.availability();
      } catch (err) {
        try {
          rawStatus = await api.availability({
            expectedInputs: [{ type: 'text', languages: ['en'] }],
            expectedOutputs: [{ type: 'text', languages: ['en'] }]
          });
        } catch (innerErr) {
          rawStatus = 'unavailable';
        }
      }

      if (rawStatus === 'available' || rawStatus === 'readily') {
        return { status: 'ready', backend: 'gemini_nano', detected: true, raw: rawStatus, apiType: api.type };
      }

      if (rawStatus === 'downloadable' || rawStatus === 'after-download') {
        return {
          status: 'download_available',
          backend: 'gemini_nano',
          detected: true,
          raw: rawStatus,
          apiType: api.type,
          message: 'O modelo Gemini Nano está suportado e pronto para download local.'
        };
      }

      if (rawStatus === 'downloading') {
        return { status: 'downloading', backend: 'gemini_nano', detected: true, raw: rawStatus, apiType: api.type };
      }

      return {
        status: 'flags_required',
        backend: 'gemini_nano',
        detected: true,
        raw: rawStatus,
        apiType: api.type,
        error: `O Chrome retornou status "${rawStatus}". Verifique espaço em disco (>22 GB) ou hardware.`
      };
    } catch (e) {
      return {
        status: 'flags_required',
        backend: 'gemini_nano',
        detected: true,
        error: e.message
      };
    }
  }

  /**
   * Verifica a disponibilidade unificada (Híbrida: Auto, WebLLM ou Gemini Nano)
   * options: { backend: 'auto' | 'webllm' | 'gemini_nano', modelId: string }
   */
  async function checkAvailability(options = {}) {
    const preferredBackend = options.backend || 'auto';
    const modelId = options.modelId || DEFAULT_WEBLLM_MODEL;

    // 1. Modo explícito: Gemini Nano
    if (preferredBackend === 'gemini_nano') {
      return await checkNanoAvailability();
    }

    // 2. Modo explícito: WebLLM
    if (preferredBackend === 'webllm') {
      return await checkWebLLMAvailability(modelId);
    }

    // 3. Modo Automático (Híbrido):
    // Prioriza o motor que já está pronto para uso imediato ('ready').
    // Se nenhum estiver pronto, prioriza o Gemini Nano se já estiver com flags ativas ('download_available'),
    // ou cai automaticamente para o WebLLM via WebGPU (sem exigir flags do usuário!).
    const nanoStatus = await checkNanoAvailability();
    if (nanoStatus.status === 'ready') {
      return nanoStatus;
    }

    const webllmStatus = await checkWebLLMAvailability(modelId);
    if (webllmStatus.status === 'ready') {
      return webllmStatus;
    }

    if (nanoStatus.status === 'downloading') {
      return nanoStatus;
    }

    if (nanoStatus.status === 'download_available') {
      return nanoStatus;
    }

    if (webllmStatus.status === 'download_available') {
      return webllmStatus;
    }

    return nanoStatus;
  }

  /**
   * Cria uma sessão do Gemini Nano
   */
  async function createNanoSession(options = {}) {
    const api = getLanguageModelAPI();
    if (!api) {
      throw new Error('Prompt API não encontrada no navegador.');
    }

    const systemPrompt = options.systemPrompt || '';

    const buildMonitor = () => {
      if (typeof options.onProgress !== 'function') return null;
      return (monitorInstance) => {
        monitorInstance.addEventListener('downloadprogress', (e) => {
          let percent = 0;
          if (e.total && e.total > 0) {
            percent = Math.round((e.loaded / e.total) * 100);
          } else if (typeof e.loaded === 'number') {
            percent = e.loaded <= 1 ? Math.round(e.loaded * 100) : Math.round(e.loaded);
          }
          percent = Math.min(100, Math.max(0, percent));
          options.onProgress(percent, { text: `Baixando Gemini Nano: ${percent}%`, raw: e });
        });
      };
    };

    const monitor = buildMonitor();

    try {
      const modernParams = {};
      if (systemPrompt) {
        modernParams.initialPrompts = [{ role: 'system', content: systemPrompt }];
      }
      if (monitor) modernParams.monitor = monitor;
      if (options.signal) modernParams.signal = options.signal;

      const session = await api.create(modernParams);
      cachedNanoSession = session;
      activeBackendType = 'gemini_nano';
      return session;
    } catch (err1) {
      console.warn('[DeixaDisso PromptAPI] Formato W3C rejeitado pelo Chrome, tentando formato legado:', err1);
    }

    try {
      const legacyParams = {};
      if (systemPrompt) legacyParams.systemPrompt = systemPrompt;
      if (monitor) legacyParams.monitor = monitor;
      if (typeof options.temperature === 'number' && typeof options.topK === 'number') {
        legacyParams.temperature = options.temperature;
        legacyParams.topK = options.topK;
      }
      const session = await api.create(legacyParams);
      cachedNanoSession = session;
      activeBackendType = 'gemini_nano';
      return session;
    } catch (err2) {
      console.warn('[DeixaDisso PromptAPI] Formato legado rejeitado, tentando chamada mínima:', err2);
    }

    const minimalParams = {};
    if (monitor) minimalParams.monitor = monitor;
    const session = await api.create(minimalParams);
    cachedNanoSession = session;
    activeBackendType = 'gemini_nano';
    return session;
  }

  /**
   * Cria ou carrega o motor WebLLM (@mlc-ai/web-llm) via WebGPU
   */
  async function createWebLLMSession(options = {}) {
    const webllm = getWebLLMAPI();
    if (!webllm || typeof webllm.CreateMLCEngine !== 'function') {
      throw new Error('Bundle do WebLLM não está carregado neste contexto.');
    }

    const modelId = options.modelId || DEFAULT_WEBLLM_MODEL;

    if (cachedWebLLMEngine && cachedWebLLMModelId === modelId) {
      activeBackendType = 'webllm';
      return cachedWebLLMEngine;
    }

    console.log(`[DeixaDisso WebLLM] Inicializando modelo ${modelId} via WebGPU...`);

    const engine = await webllm.CreateMLCEngine(modelId, {
      initProgressCallback: (report) => {
        const rawProgress = typeof report.progress === 'number' ? report.progress : 0;
        const percent = Math.min(100, Math.max(0, Math.round(rawProgress * 100)));
        if (typeof options.onProgress === 'function') {
          options.onProgress(percent, {
            text: report.text || `Carregando ${modelId}: ${percent}%`,
            raw: report
          });
        }
      }
    });

    cachedWebLLMEngine = engine;
    cachedWebLLMModelId = modelId;
    activeBackendType = 'webllm';
    return engine;
  }

  /**
   * Cria uma sessão no backend selecionado (ou resolve automaticamente)
   */
  async function createSession(options = {}) {
    const preferredBackend = options.backend || 'auto';
    const modelId = options.modelId || DEFAULT_WEBLLM_MODEL;

    if (preferredBackend === 'gemini_nano') {
      return await createNanoSession(options);
    }

    if (preferredBackend === 'webllm') {
      return await createWebLLMSession({ ...options, modelId });
    }

    // Modo Auto: Verifica se Gemini Nano está pronto ou disponível para download
    const nanoStatus = await checkNanoAvailability();
    if (nanoStatus.status === 'ready') {
      return await createNanoSession(options);
    }

    // Verifica se WebLLM já está em cache
    const webllmStatus = await checkWebLLMAvailability(modelId);
    if (webllmStatus.status === 'ready') {
      return await createWebLLMSession({ ...options, modelId });
    }

    // Se Nano estiver disponível para download, tenta Nano; caso contrário usa WebLLM
    if (nanoStatus.status === 'download_available') {
      try {
        return await createNanoSession(options);
      } catch (err) {
        console.warn('[DeixaDisso PromptAPI] Falha ao iniciar Nano, alternando para WebLLM:', err);
      }
    }

    return await createWebLLMSession({ ...options, modelId });
  }

  /**
   * Extrai JSON estruturado da resposta bruta do LLM (Nano ou WebLLM)
   */
  function parseVerdictResponse(rawResponse, isEn, sourceName) {
    let parsed = null;
    try {
      const cleanJson = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch (_) {
      const jsonMatch = rawResponse.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (e) {}
      }
    }

    if (!parsed || !parsed.verdict) {
      const verdictMatch = rawResponse.match(/"verdict"\s*:\s*"(leave|caution|safe)"/i);
      const reasonMatch = rawResponse.match(/"reason"\s*:\s*"([^"]+)"/i);
      if (verdictMatch) {
        parsed = {
          verdict: verdictMatch[1].toLowerCase(),
          reason: reasonMatch ? reasonMatch[1] : rawResponse.replace(/[{}"]/g, '').trim()
        };
      }
    }

    const defaultReason = sourceName === 'webllm'
      ? (isEn ? 'Classified by WebLLM.' : 'Classificado pelo WebLLM.')
      : (isEn ? 'Classified by Gemini Nano.' : 'Classificado pelo Gemini Nano.');

    if (parsed && ['leave', 'caution', 'safe'].includes(parsed.verdict)) {
      return {
        verdict: parsed.verdict,
        reason: parsed.reason?.trim() || defaultReason,
        source: sourceName
      };
    }

    if (rawResponse && rawResponse.length > 5) {
      return {
        verdict: 'caution',
        reason: rawResponse.replace(/[{}"]/g, '').trim().slice(0, 300),
        source: sourceName
      };
    }

    throw new Error('Formato de resposta inesperado do modelo.');
  }

  /**
   * Executa a análise do texto de um post usando Gemini Nano ou WebLLM
   */
  async function analyzePost(text, options = {}) {
    if (!text || text.trim().length === 0) {
      return {
        verdict: 'safe',
        reason: options.emptyReason || 'Empty post content.',
        source: 'empty'
      };
    }

    const systemPrompt = options.systemPrompt || '';
    const isEn = options.lang === 'en';
    const preferredBackend = options.backend || 'auto';
    const modelId = options.modelId || DEFAULT_WEBLLM_MODEL;

    const userPrompt = isEn
      ? `Analyze this social media post and return a JSON object with "verdict" ("leave" | "caution" | "safe") and "reason" (1-2 sentences explaining why):\n\n"${text.slice(0, 1000)}"`
      : `Analise este post de rede social e retorne um objeto JSON com "verdict" ("leave" | "caution" | "safe") e "reason" (1-2 frases explicando o motivo):\n\n"${text.slice(0, 1000)}"`;

    // Determina qual backend usar
    let targetBackend = preferredBackend;
    if (targetBackend === 'auto') {
      if (cachedNanoSession) {
        targetBackend = 'gemini_nano';
      } else if (cachedWebLLMEngine) {
        targetBackend = 'webllm';
      } else {
        const status = await checkAvailability({ backend: 'auto', modelId });
        targetBackend = status.backend || 'webllm';
      }
    }

    // 1. Execução via WebLLM (@mlc-ai/web-llm)
    if (targetBackend === 'webllm') {
      try {
        const engine = await createWebLLMSession({
          modelId,
          onProgress: options.onProgress
        });

        console.log(`[DeixaDisso WebLLM] Enviando prompt para ${modelId}...`);
        const isQwen3 = /^Qwen3/i.test(modelId);
        const messages = [];
        if (systemPrompt) {
          messages.push({
            role: 'system',
            content: isQwen3 ? `/no_think\n${systemPrompt}` : systemPrompt
          });
        }
        messages.push({
          role: 'user',
          content: isQwen3 ? `/no_think\n${userPrompt}` : userPrompt
        });

        const createParams = {
          messages,
          temperature: 0.1,
          max_tokens: 180
        };
        if (isQwen3) {
          createParams.extra_body = { enable_thinking: false };
        }

        const reply = await engine.chat.completions.create(createParams);

        const rawResponse = (reply?.choices?.[0]?.message?.content || '')
          .replace(/<think>[\s\S]*?<\/think>/gi, '')
          .trim();
        console.log('[DeixaDisso WebLLM] Resposta bruta recebida:', rawResponse);

        const result = parseVerdictResponse(rawResponse, isEn, 'webllm');
        result.modelId = modelId;
        return result;
      } catch (err) {
        console.error('[DeixaDisso WebLLM] Erro durante inferência:', err);
        throw err;
      }
    }

    // 2. Execução via Chrome Built-in Prompt API (Gemini Nano)
    try {
      const session = cachedNanoSession || await createNanoSession({ systemPrompt });

      console.log('[DeixaDisso PromptAPI] Enviando prompt para Gemini Nano...');
      const rawResponse = await session.prompt(userPrompt);
      console.log('[DeixaDisso PromptAPI] Resposta bruta recebida:', rawResponse);

      return parseVerdictResponse(rawResponse, isEn, 'gemini_nano');
    } catch (err) {
      console.error('[DeixaDisso PromptAPI] Erro durante inferência no Gemini Nano:', err);
      cachedNanoSession = null;
      throw err;
    }
  }

  const PromptAPI = {
    getLanguageModelAPI,
    getWebLLMAPI,
    checkWebGPUSupport,
    checkNanoAvailability,
    checkWebLLMAvailability,
    checkAvailability,
    createSession,
    createNanoSession,
    createWebLLMSession,
    analyzePost
  };

  if (typeof globalThis !== 'undefined') {
    globalThis.DeixaDissoPromptAPI = PromptAPI;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PromptAPI;
  }

})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
