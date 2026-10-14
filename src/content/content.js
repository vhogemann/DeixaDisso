// Content script orquestrador da extensão DeixaDisso

(function() {
  'use strict';

  let currentAdapter = null;
  let settings = null;
  let intersectionObserver = null;
  let mutationObserver = null;
  let isScanning = false;
  let scanDebounceTimer = null;

  // Seleciona o adapter correto para a página atual
  function initAdapter() {
    const adapters = [
      globalThis.TwitterAdapter,
      globalThis.BlueSkyAdapter,
      globalThis.ThreadsAdapter
    ].filter(Boolean);

    for (const adapter of adapters) {
      if (adapter.canHandle()) {
        currentAdapter = adapter;
        console.log(`[DeixaDisso] Ativado adapter: ${adapter.name}`);
        break;
      }
    }
  }

  // Carrega configurações da extensão
  async function loadSettings() {
    const defaultSettings = {
      enabled: true,
      enabledSites: { twitter: true, bluesky: true, threads: true },
      sensitivity: 'balanced',
      autoAnalyze: true,
      showSafeBadges: true
    };

    try {
      const data = await chrome.storage.local.get('deixadisso_settings');
      settings = { ...defaultSettings, ...(data.deixadisso_settings || {}) };
    } catch (e) {
      settings = defaultSettings;
    }
  }

  // Verifica se a extensão deve operar nesta página
  function isSiteEnabled() {
    if (!settings || !settings.enabled || !currentAdapter) return false;
    return !!settings.enabledSites?.[currentAdapter.name];
  }

  // Processa um post específico quando ele entra no campo de visão
  async function processPost(postElement) {
    if (postElement.hasAttribute('data-deixadisso-analyzing')) return;
    postElement.setAttribute('data-deixadisso-analyzing', 'true');

    const text = currentAdapter.extractText(postElement);
    if (!text || text.trim().length < 3) {
      postElement.setAttribute('data-deixadisso-processed', 'true');
      return;
    }

    // Cria e injeta o badge em estado de carregamento
    const badgeContainer = globalThis.DeixaDissoUI.createBadge();
    const injected = currentAdapter.injectBadge(postElement, badgeContainer);

    if (!injected) {
      return;
    }

    try {
      // Envia para o background/offscreen analisar com Gemini Nano
      const result = await chrome.runtime.sendMessage({
        type: 'ANALYZE_POST',
        text: text.trim(),
        sensitivity: settings.sensitivity
      });

      if (result && result.source === 'gemini_nano') {
        // Se o usuário optou por não exibir badges em posts seguros, esconde
        if (result.verdict === 'safe' && settings.showSafeBadges === false) {
          badgeContainer.remove();
        } else {
          globalThis.DeixaDissoUI.updateBadge(badgeContainer, result);
        }
      } else {
        // Prompt API não disponível: não exibe badge
        badgeContainer.remove();
      }
    } catch (err) {
      console.warn('[DeixaDisso] Erro ao analisar post:', err);
      badgeContainer.remove();
    }
  }

  // Configura o IntersectionObserver para poupar recursos
  function setupIntersectionObserver() {
    if (intersectionObserver) intersectionObserver.disconnect();

    intersectionObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const postEl = entry.target;
          observer.unobserve(postEl);
          processPost(postEl);
        }
      });
    }, {
      root: null,
      rootMargin: '200px 0px', // Inicia a análise pouco antes de aparecer na tela
      threshold: 0.1
    });
  }

  function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
      rect.top < (window.innerHeight || document.documentElement.clientHeight) + 300 &&
      rect.bottom > -300 &&
      rect.height > 0
    );
  }

  // Varredura de novos posts
  function scanPosts() {
    if (!isSiteEnabled() || !currentAdapter) return;

    const unprocessedPosts = currentAdapter.findPosts();
    if (unprocessedPosts.length > 0) {
      console.log(`[DeixaDisso] ${unprocessedPosts.length} novo(s) post(s) detectado(s) em ${currentAdapter.name}`);
    }

    for (const post of unprocessedPosts) {
      // Marca como observado para não duplicar
      post.setAttribute('data-deixadisso-observed', 'true');

      // Se já está visível ou perto da tela, processa diretamente
      if (isElementInViewport(post)) {
        processPost(post);
      } else if (intersectionObserver) {
        intersectionObserver.observe(post);
      } else {
        processPost(post);
      }
    }
  }

  // Observa mudanças no DOM com debounce para feeds infinitos
  function setupMutationObserver() {
    if (mutationObserver) mutationObserver.disconnect();

    mutationObserver = new MutationObserver(() => {
      clearTimeout(scanDebounceTimer);
      scanDebounceTimer = setTimeout(scanPosts, 200);
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Detectar navegação interna em Single Page Applications (SPA)
    window.addEventListener('popstate', () => setTimeout(scanPosts, 500));
    window.addEventListener('scroll', () => {
      clearTimeout(scanDebounceTimer);
      scanDebounceTimer = setTimeout(scanPosts, 250);
    }, { passive: true });
  }

  // Ouvinte de alterações nas configurações
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.deixadisso_settings) {
      settings = { ...settings, ...(changes.deixadisso_settings.newValue || {}) };
      if (!isSiteEnabled()) {
        // Remove badges se desativado
        document.querySelectorAll('.deixadisso-badge-container').forEach(el => el.remove());
        document.querySelectorAll('[data-deixadisso-processed]').forEach(el => {
          el.removeAttribute('data-deixadisso-processed');
          el.removeAttribute('data-deixadisso-observed');
          el.removeAttribute('data-deixadisso-analyzing');
        });
      } else {
        scanPosts();
      }
    }
  });

  // Inicialização principal
  async function init() {
    initAdapter();
    if (!currentAdapter) return;

    await loadSettings();
    if (!isSiteEnabled()) return;

    // Se a Prompt API não estiver pronta/disponível, NÃO analisa nem mostra badges
    try {
      const statusResp = await chrome.runtime.sendMessage({ type: 'GET_MODEL_STATUS' });
      if (statusResp?.status !== 'ready') {
        console.log(`[DeixaDisso] Prompt API do Gemini Nano não está pronta (status: ${statusResp?.status || 'desconhecido'}). Nenhuma análise será realizada nem badges exibidos.`);
        document.querySelectorAll('.deixadisso-badge-container').forEach(el => el.remove());
        return;
      }
    } catch (e) {
      console.log('[DeixaDisso] Não foi possível verificar a Prompt API. Badges desativados.');
      return;
    }

    setupIntersectionObserver();
    setupMutationObserver();
    scanPosts();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
