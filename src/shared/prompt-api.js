// Helper unificado e compatível com as versões recentes da Prompt API (Chrome 128+)
// Suporta a especificação W3C atual (LanguageModel) e versões anteriores (ai.languageModel / ai.canCreateTextSession)

(function(root) {
  'use strict';

  /**
   * Obtém a referência para a Prompt API no ambiente atual
   * Prioridade:
   * 1. Global LanguageModel (padrão atual do W3C / Chrome 128+)
   * 2. globalThis.ai.languageModel / window.ai.languageModel (versões experimentais)
   * 3. globalThis.ai (canCreateTextSession - versões legadas)
   */
  function getLanguageModelAPI() {
    // 1. Especificação atual: global LanguageModel
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

    // 2. Namespace experimental ai.languageModel
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
            return caps.available; // 'readily' | 'after-download' | 'no'
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

    // 3. API legada canCreateTextSession
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
   * Verifica a disponibilidade do modelo de linguagem no Chrome
   * Retorna:
   * - { status: 'ready', raw: 'available' | 'readily' }
   * - { status: 'download_available', raw: 'downloadable' | 'after-download' }
   * - { status: 'downloading', raw: 'downloading' }
   * - { status: 'flags_required', raw: 'unavailable' | 'no' | ... }
   */
  async function checkAvailability() {
    const api = getLanguageModelAPI();
    if (!api) {
      return {
        status: 'flags_required',
        detected: false,
        error: 'Prompt API não encontrada no navegador. As flags do Chrome precisam ser ativadas.'
      };
    }

    try {
      let rawStatus;
      try {
        // Tenta chamada direta padrão
        rawStatus = await api.availability();
      } catch (err) {
        // Se a chamada sem parâmetros falhar, tenta com declaração de tipos/idiomas conforme doc oficial
        try {
          rawStatus = await api.availability({
            expectedInputs: [{ type: 'text', languages: ['en'] }],
            expectedOutputs: [{ type: 'text', languages: ['en'] }]
          });
        } catch (innerErr) {
          console.warn('[DeixaDisso PromptAPI] Falha ao checar availability com opções:', innerErr);
          rawStatus = 'unavailable';
        }
      }

      console.log(`[DeixaDisso PromptAPI] Status bruto retornado: "${rawStatus}" (tipo da API: ${api.type})`);

      // 1. Modelo pronto para uso imediato
      if (rawStatus === 'available' || rawStatus === 'readily') {
        return { status: 'ready', detected: true, raw: rawStatus, apiType: api.type };
      }

      // 2. Modelo suportado mas precisa ser baixado
      if (rawStatus === 'downloadable' || rawStatus === 'after-download') {
        return {
          status: 'download_available',
          detected: true,
          raw: rawStatus,
          apiType: api.type,
          message: 'O modelo Gemini Nano está suportado e pronto para download local.'
        };
      }

      // 3. Download já em andamento
      if (rawStatus === 'downloading') {
        return { status: 'downloading', detected: true, raw: rawStatus, apiType: api.type };
      }

      // 4. Indisponível (hardware inadequado, falta de espaço <22GB, ou flags desativadas)
      return {
        status: 'flags_required',
        detected: true,
        raw: rawStatus,
        apiType: api.type,
        error: `O Chrome retornou status "${rawStatus}". Verifique espaço em disco (>22 GB) ou hardware.`
      };
    } catch (e) {
      console.warn('[DeixaDisso PromptAPI] Erro ao invocar availability:', e);
      return {
        status: 'flags_required',
        detected: true,
        error: e.message
      };
    }
  }

  /**
   * Cria uma nova sessão do Gemini Nano com estratégias de fallback para máxima compatibilidade
   */
  async function createSession(options = {}) {
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
          options.onProgress(percent, e);
        });
      };
    };

    const monitor = buildMonitor();

    // Estratégia 1: Padrão W3C oficial atual (apenas initialPrompts, sem temperature/topK que causam TypeError)
    try {
      const modernParams = {};
      if (systemPrompt) {
        modernParams.initialPrompts = [{ role: 'system', content: systemPrompt }];
      }
      if (monitor) modernParams.monitor = monitor;
      if (options.signal) modernParams.signal = options.signal;

      console.log('[DeixaDisso PromptAPI] Tentando criar sessão no formato padrão W3C...');
      return await api.create(modernParams);
    } catch (err1) {
      console.warn('[DeixaDisso PromptAPI] Formato W3C rejeitado pelo Chrome, tentando formato legado:', err1);
    }

    // Estratégia 2: Formato legado com systemPrompt + sampling params
    try {
      const legacyParams = {};
      if (systemPrompt) legacyParams.systemPrompt = systemPrompt;
      if (monitor) legacyParams.monitor = monitor;
      if (typeof options.temperature === 'number' && typeof options.topK === 'number') {
        legacyParams.temperature = options.temperature;
        legacyParams.topK = options.topK;
      }
      return await api.create(legacyParams);
    } catch (err2) {
      console.warn('[DeixaDisso PromptAPI] Formato legado rejeitado, tentando chamada mínima:', err2);
    }

    // Estratégia 3: Chamada mínima sem opções
    try {
      const minimalParams = {};
      if (monitor) minimalParams.monitor = monitor;
      return await api.create(minimalParams);
    } catch (err3) {
      console.error('[DeixaDisso PromptAPI] Todas as tentativas de criar sessão falharam:', err3);
      throw err3;
    }
  }

  let cachedSession = null;

  async function getOrCreateSession(systemPrompt = '') {
    if (cachedSession) return cachedSession;
    cachedSession = await createSession({ systemPrompt });
    return cachedSession;
  }

  /**
   * Executa a análise do texto de um post com recuperação robusta de JSON
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

    try {
      const session = await getOrCreateSession(systemPrompt);

      const promptText = isEn
        ? `Analyze this social media post and return a JSON object with "verdict" ("leave" | "caution" | "safe") and "reason" (1-2 sentences explaining why):\n\n"${text.slice(0, 1000)}"`
        : `Analise este post de rede social e retorne um objeto JSON com "verdict" ("leave" | "caution" | "safe") e "reason" (1-2 frases explicando o motivo):\n\n"${text.slice(0, 1000)}"`;

      console.log('[DeixaDisso PromptAPI] Enviando prompt para Gemini Nano...');
      const rawResponse = await session.prompt(promptText);
      console.log('[DeixaDisso PromptAPI] Resposta bruta recebida:', rawResponse);

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

      if (parsed && ['leave', 'caution', 'safe'].includes(parsed.verdict)) {
        return {
          verdict: parsed.verdict,
          reason: parsed.reason?.trim() || (isEn ? 'Classified by Gemini Nano.' : 'Classificado pelo Gemini Nano.'),
          source: 'gemini_nano'
        };
      }

      // Se retornou texto livre sem JSON, extrai o texto útil
      if (rawResponse && rawResponse.length > 5) {
        return {
          verdict: 'caution',
          reason: rawResponse.replace(/[{}"]/g, '').trim().slice(0, 300),
          source: 'gemini_nano'
        };
      }

      throw new Error('Formato de resposta inesperado do modelo.');
    } catch (err) {
      console.error('[DeixaDisso PromptAPI] Erro durante inferência:', err);
      cachedSession = null;
      throw err;
    }
  }

  const PromptAPI = {
    getLanguageModelAPI,
    checkAvailability,
    createSession,
    analyzePost
  };

  if (typeof globalThis !== 'undefined') {
    globalThis.DeixaDissoPromptAPI = PromptAPI;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PromptAPI;
  }

})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
