// Lógica do Popup da extensão DeixaDisso com i18n (pt_BR e en)

document.addEventListener('DOMContentLoaded', async () => {
  // Elementos do DOM
  const modelStatusBadge = document.getElementById('model-status-badge');
  const modelStatusText = document.getElementById('model-status-text');

  const viewSetup = document.getElementById('view-setup');
  const viewControls = document.getElementById('view-controls');
  const btnRecheck = document.getElementById('btn-recheck');

  const cardDownloadAction = document.getElementById('card-download-action');
  const cardFlagsInstructions = document.getElementById('card-flags-instructions');
  const downloadProgressContainer = document.getElementById('download-progress-container');
  const downloadProgressFill = document.getElementById('download-progress-fill');
  const downloadProgressLabel = document.getElementById('download-progress-label');
  const btnStartDownload = document.getElementById('btn-start-download');

  const toggleMaster = document.getElementById('toggle-master');
  const toggleTwitter = document.getElementById('toggle-twitter');
  const toggleBluesky = document.getElementById('toggle-bluesky');
  const toggleThreads = document.getElementById('toggle-threads');

  const setupBackendSelect = document.getElementById('setup-backend-select');
  const setupModelSelect = document.getElementById('setup-model-select');
  const setupModelGroup = document.getElementById('setup-model-group');
  const controlsBackendSelect = document.getElementById('controls-backend-select');
  const controlsModelSelect = document.getElementById('controls-model-select');
  const controlsModelGroup = document.getElementById('controls-model-group');
  const controlsDownloadBox = document.getElementById('controls-download-box');
  const controlsProgressContainer = document.getElementById('controls-progress-container');
  const controlsProgressFill = document.getElementById('controls-progress-fill');
  const controlsProgressLabel = document.getElementById('controls-progress-label');
  const btnControlsDownload = document.getElementById('btn-controls-download');

  const sensitivityRadios = document.querySelectorAll('input[name="sensitivity"]');

  const statAvoided = document.getElementById('stat-avoided');
  const statTotal = document.getElementById('stat-total');

  const testerInput = document.getElementById('tester-input');
  const testerBtn = document.getElementById('tester-btn');
  const testerResult = document.getElementById('tester-result');
  const testerBadgePreview = document.getElementById('tester-badge-preview');
  const testerReason = document.getElementById('tester-reason');

  const i18n = globalThis.DeixaDissoI18n || { t: (k) => k };

  // 1. Aplica internacionalização estática na interface
  function applyI18n() {
    const elTagline = document.querySelector('.tagline');
    if (elTagline) elTagline.textContent = i18n.t('popup.tagline');

    const elSetupTitle = document.querySelector('.setup-title');
    if (elSetupTitle) elSetupTitle.textContent = i18n.t('popup.setupTitle');

    const elSetupSubtitle = document.querySelector('.setup-subtitle');
    if (elSetupSubtitle) elSetupSubtitle.innerHTML = i18n.t('popup.setupSubtitle');

    const elDlTitle = document.querySelector('.download-action-title');
    if (elDlTitle) elDlTitle.textContent = i18n.t('popup.downloadActionTitle');

    const elDlDesc = document.querySelector('.download-action-desc');
    if (elDlDesc) elDlDesc.textContent = i18n.t('popup.downloadActionDesc');

    if (btnStartDownload) btnStartDownload.textContent = i18n.t('popup.downloadActionBtn');
    if (btnRecheck) btnRecheck.textContent = i18n.t('popup.recheckBtn');

    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.textContent = i18n.t('popup.copyBtn');
    });

    const elMasterTitle = document.querySelector('.master-title');
    if (elMasterTitle) elMasterTitle.textContent = i18n.t('popup.masterTitle');

    const elMasterSub = document.querySelector('.master-subtitle');
    if (elMasterSub) elMasterSub.textContent = i18n.t('popup.masterSubtitle');

    const statLabels = document.querySelectorAll('.stat-label');
    if (statLabels[0]) statLabels[0].textContent = i18n.t('popup.statsAvoided');
    if (statLabels[1]) statLabels[1].textContent = i18n.t('popup.statsAnalyzed');

    const elBackendTitle = document.getElementById('section-title-backend');
    if (elBackendTitle) elBackendTitle.textContent = i18n.t('popup.sectionBackend');

    const sectionTitles = document.querySelectorAll('#view-controls .section-title:not(#section-title-backend)');
    if (sectionTitles[0]) sectionTitles[0].textContent = i18n.t('popup.sectionPlatforms');
    if (sectionTitles[1]) sectionTitles[1].textContent = i18n.t('popup.sectionSensitivity');
    if (sectionTitles[2]) sectionTitles[2].textContent = i18n.t('popup.sectionTester');

    const elTesterHint = document.querySelector('.section-hint');
    if (elTesterHint) elTesterHint.textContent = i18n.t('popup.testerHint');

    if (testerInput) testerInput.placeholder = i18n.t('popup.testerPlaceholder');
    if (testerBtn) testerBtn.textContent = i18n.t('popup.testerBtn');

    const elFooter = document.querySelector('.app-footer span');
    if (elFooter) elFooter.textContent = i18n.t('popup.footer');

    // Sensibilidade
    const radioTitles = document.querySelectorAll('.radio-title');
    const radioDescs = document.querySelectorAll('.radio-desc');
    if (radioTitles[0]) radioTitles[0].textContent = i18n.t('popup.sensLenientTitle');
    if (radioDescs[0]) radioDescs[0].textContent = i18n.t('popup.sensLenientDesc');
    if (radioTitles[1]) radioTitles[1].textContent = i18n.t('popup.sensBalancedTitle');
    if (radioDescs[1]) radioDescs[1].textContent = i18n.t('popup.sensBalancedDesc');
    if (radioTitles[2]) radioTitles[2].textContent = i18n.t('popup.sensZenTitle');
    if (radioDescs[2]) radioDescs[2].textContent = i18n.t('popup.sensZenDesc');
  }

  applyI18n();

  // 2. Botões de Copiar Links das Flags
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const textToCopy = btn.getAttribute('data-copy');
      if (textToCopy) {
        try {
          await navigator.clipboard.writeText(textToCopy);
          btn.textContent = i18n.t('popup.copiedBtn');
          setTimeout(() => { btn.textContent = i18n.t('popup.copyBtn'); }, 1500);
        } catch (_) {}
      }
    });
  });

  function syncModelSelectorVisibility(backendValue) {
    const showModel = backendValue !== 'gemini_nano';
    if (setupModelGroup) setupModelGroup.style.display = showModel ? 'block' : 'none';
    if (controlsModelGroup) controlsModelGroup.style.display = showModel ? 'block' : 'none';
  }

  // 3. Checar e alternar entre Tela de Instruções vs Painel de Controles
  async function updateModelStatus() {
    modelStatusBadge.className = 'status-badge status-checking';
    modelStatusText.textContent = i18n.t('popup.statusVerifying');

    try {
      const currentSettings = await globalThis.DeixaDissoStorage.getSettings();
      const backend = currentSettings.backend || 'auto';
      const modelId = currentSettings.webllmModel || 'Qwen3-0.6B-q4f16_1-MLC';

      // 1. Tenta verificar através do background / offscreen bridge
      let response = null;
      try {
        response = await chrome.runtime.sendMessage({
          type: 'GET_MODEL_STATUS',
          backend,
          modelId
        });
      } catch (sendErr) {
        console.warn('[DeixaDisso Popup] Erro ao comunicar com background:', sendErr);
      }

      // 2. Se o offscreen não respondeu ou reportou flags_required, checa direto no contexto da janela do Popup
      if ((!response || response.status === 'flags_required') && globalThis.DeixaDissoPromptAPI) {
        const directCheck = await globalThis.DeixaDissoPromptAPI.checkAvailability({ backend, modelId });
        console.log('[DeixaDisso Popup] Checagem direta no Popup:', directCheck);
        if (directCheck.status === 'ready' || directCheck.status === 'download_available' || directCheck.status === 'downloading') {
          response = directCheck;
        }
      }

      const status = response?.status || 'flags_required';
      const activeBackend = response?.backend || backend;
      console.log('[DeixaDisso Popup] Status final determinado:', status, response);
      chrome.runtime.sendMessage({ type: 'UPDATE_ACTION_BADGE', status }).catch(() => {});

      modelStatusBadge.className = 'status-badge';

      if (status === 'ready') {
        modelStatusBadge.classList.add('status-ready');
        if (activeBackend === 'webllm') {
          modelStatusText.textContent = i18n.t('popup.statusReadyWebLLM');
        } else if (activeBackend === 'gemini_nano') {
          modelStatusText.textContent = i18n.t('popup.statusReadyNano');
        } else {
          modelStatusText.textContent = i18n.t('popup.statusReady');
        }
        viewSetup.style.display = 'none';
        viewControls.style.display = 'flex';
        if (controlsDownloadBox) controlsDownloadBox.style.display = 'none';
      } else if (status === 'downloading') {
        modelStatusBadge.classList.add('status-downloading');
        modelStatusText.textContent = i18n.t('popup.statusDownloading');
        viewSetup.style.display = 'flex';
        viewControls.style.display = 'none';
        if (cardDownloadAction) cardDownloadAction.style.display = 'block';
        if (cardFlagsInstructions) cardFlagsInstructions.style.display = 'none';
        if (downloadProgressContainer) downloadProgressContainer.style.display = 'flex';
        if (btnStartDownload) {
          btnStartDownload.disabled = true;
          btnStartDownload.textContent = i18n.t('popup.downloadingBtn');
        }
      } else if (status === 'download_available') {
        modelStatusBadge.classList.add('status-downloading');
        modelStatusText.textContent = i18n.t('popup.statusDownloadAvailable');
        viewSetup.style.display = 'flex';
        viewControls.style.display = 'none';
        if (cardDownloadAction) cardDownloadAction.style.display = 'block';
        if (cardFlagsInstructions) cardFlagsInstructions.style.display = 'none';
        if (downloadProgressContainer) downloadProgressContainer.style.display = 'none';
        if (btnStartDownload) {
          btnStartDownload.disabled = false;
          btnStartDownload.textContent = i18n.t('popup.downloadActionBtn');
        }
      } else {
        modelStatusBadge.classList.add('status-fallback');
        modelStatusText.textContent = i18n.t('popup.statusFlagsRequired');
        viewSetup.style.display = 'flex';
        viewControls.style.display = 'none';
        if (cardDownloadAction) cardDownloadAction.style.display = 'none';
        if (cardFlagsInstructions) cardFlagsInstructions.style.display = 'block';
      }
    } catch (e) {
      console.error('[DeixaDisso Popup] Falha ao atualizar status:', e);
      modelStatusBadge.className = 'status-badge status-fallback';
      modelStatusText.textContent = i18n.t('popup.statusFlagsRequired');
      viewSetup.style.display = 'flex';
      viewControls.style.display = 'none';
      if (cardDownloadAction) cardDownloadAction.style.display = 'none';
      if (cardFlagsInstructions) cardFlagsInstructions.style.display = 'block';
    }
  }

  // Ação de disparar o download
  async function triggerModelDownload() {
    if (btnStartDownload) {
      btnStartDownload.disabled = true;
      btnStartDownload.textContent = i18n.t('popup.downloadStarting');
    }
    if (btnControlsDownload) {
      btnControlsDownload.disabled = true;
      btnControlsDownload.textContent = i18n.t('popup.downloadStarting');
    }
    if (downloadProgressContainer) downloadProgressContainer.style.display = 'flex';
    if (downloadProgressLabel) downloadProgressLabel.textContent = i18n.t('popup.downloadStarting');
    if (controlsDownloadBox) controlsDownloadBox.style.display = 'block';
    if (controlsProgressContainer) controlsProgressContainer.style.display = 'flex';
    if (controlsProgressLabel) controlsProgressLabel.textContent = i18n.t('popup.downloadStarting');

    try {
      const currentSettings = await globalThis.DeixaDissoStorage.getSettings();
      const res = await chrome.runtime.sendMessage({
        type: 'START_DOWNLOAD',
        backend: currentSettings.backend || 'auto',
        modelId: currentSettings.webllmModel || 'Qwen3-0.6B-q4f16_1-MLC'
      });
      if (res && res.status === 'ready') {
        await updateModelStatus();
      } else if (res && res.status === 'error') {
        throw new Error(res.error || 'Download failed');
      }
    } catch (err) {
      const errText = `Erro: ${err.message || 'Download failed'}`;
      if (downloadProgressLabel) downloadProgressLabel.textContent = errText;
      if (controlsProgressLabel) controlsProgressLabel.textContent = errText;
      if (btnStartDownload) {
        btnStartDownload.disabled = false;
        btnStartDownload.textContent = i18n.t('popup.downloadActionBtn');
      }
      if (btnControlsDownload) {
        btnControlsDownload.disabled = false;
        btnControlsDownload.textContent = i18n.t('popup.downloadActionBtn');
      }
    }
  }

  if (btnStartDownload) {
    btnStartDownload.addEventListener('click', triggerModelDownload);
  }
  if (btnControlsDownload) {
    btnControlsDownload.addEventListener('click', triggerModelDownload);
  }

  // Ouvir progresso do download gravado no storage
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.deixadisso_download_status) {
      const info = changes.deixadisso_download_status.newValue;
      if (info) {
        const pct = info.progress || 0;
        const labelText = info.error
          ? `Erro: ${info.error}`
          : (info.text || i18n.t('popup.downloadProgressLabel', { percent: pct }));

        if (downloadProgressContainer) downloadProgressContainer.style.display = 'flex';
        if (downloadProgressFill) downloadProgressFill.style.width = `${pct}%`;
        if (downloadProgressLabel) downloadProgressLabel.textContent = labelText;

        if (controlsProgressContainer) controlsProgressContainer.style.display = 'flex';
        if (controlsProgressFill) controlsProgressFill.style.width = `${pct}%`;
        if (controlsProgressLabel) controlsProgressLabel.textContent = labelText;

        if (pct === 100 && !info.isDownloading) {
          updateModelStatus();
        }
      }
    }
  });

  if (btnRecheck) {
    btnRecheck.addEventListener('click', async () => {
      btnRecheck.disabled = true;
      btnRecheck.textContent = i18n.t('popup.statusVerifying');
      await updateModelStatus();
      btnRecheck.disabled = false;
      btnRecheck.textContent = i18n.t('popup.recheckBtn');
    });
  }

  // 4. Carregar Configurações
  const settings = await globalThis.DeixaDissoStorage.getSettings();
  toggleMaster.checked = !!settings.enabled;
  toggleTwitter.checked = !!settings.enabledSites?.twitter;
  toggleBluesky.checked = !!settings.enabledSites?.bluesky;
  toggleThreads.checked = !!settings.enabledSites?.threads;

  const savedBackend = settings.backend || 'auto';
  const savedModel = settings.webllmModel || 'Qwen3-0.6B-q4f16_1-MLC';
  if (setupBackendSelect) setupBackendSelect.value = savedBackend;
  if (controlsBackendSelect) controlsBackendSelect.value = savedBackend;
  if (setupModelSelect) setupModelSelect.value = savedModel;
  if (controlsModelSelect) controlsModelSelect.value = savedModel;
  syncModelSelectorVisibility(savedBackend);

  // Verifica status inicial
  await updateModelStatus();

  for (const radio of sensitivityRadios) {
    if (radio.value === settings.sensitivity) {
      radio.checked = true;
    }
  }

  // 5. Carregar Estatísticas
  const stats = await globalThis.DeixaDissoStorage.getStats();
  const today = new Date().toISOString().split('T')[0];
  statAvoided.textContent = stats.dailyAvoided?.[today] || stats.avoidedCount || 0;
  statTotal.textContent = stats.totalAnalyzed || 0;

  // 6. Salvar Alterações
  async function persistSettings(override = {}) {
    const activeSensitivity = Array.from(sensitivityRadios).find(r => r.checked)?.value || 'balanced';
    const backendVal = override.backend || controlsBackendSelect?.value || setupBackendSelect?.value || 'auto';
    const modelVal = override.webllmModel || controlsModelSelect?.value || setupModelSelect?.value || 'Qwen3-0.6B-q4f16_1-MLC';

    if (setupBackendSelect) setupBackendSelect.value = backendVal;
    if (controlsBackendSelect) controlsBackendSelect.value = backendVal;
    if (setupModelSelect) setupModelSelect.value = modelVal;
    if (controlsModelSelect) controlsModelSelect.value = modelVal;
    syncModelSelectorVisibility(backendVal);

    const newSettings = {
      enabled: toggleMaster.checked,
      enabledSites: {
        twitter: toggleTwitter.checked,
        bluesky: toggleBluesky.checked,
        threads: toggleThreads.checked
      },
      sensitivity: activeSensitivity,
      backend: backendVal,
      webllmModel: modelVal,
      autoAnalyze: true,
      showSafeBadges: true
    };

    await globalThis.DeixaDissoStorage.saveSettings(newSettings);
  }

  toggleMaster.addEventListener('change', () => persistSettings());
  toggleTwitter.addEventListener('change', () => persistSettings());
  toggleBluesky.addEventListener('change', () => persistSettings());
  toggleThreads.addEventListener('change', () => persistSettings());

  if (setupBackendSelect) {
    setupBackendSelect.addEventListener('change', async () => {
      await persistSettings({ backend: setupBackendSelect.value });
      await updateModelStatus();
    });
  }
  if (controlsBackendSelect) {
    controlsBackendSelect.addEventListener('change', async () => {
      const newBackend = controlsBackendSelect.value;
      await persistSettings({ backend: newBackend });
      await updateModelStatus();
      // Se o usuário selecionou WebLLM e o modelo ainda não está em cache, inicia o download automaticamente
      if (newBackend === 'webllm') {
        const st = await chrome.runtime.sendMessage({
          type: 'GET_MODEL_STATUS',
          backend: newBackend,
          modelId: controlsModelSelect?.value
        });
        if (st && st.status === 'download_available') {
          triggerModelDownload();
        }
      }
    });
  }
  if (setupModelSelect) {
    setupModelSelect.addEventListener('change', async () => {
      await persistSettings({ webllmModel: setupModelSelect.value });
      await updateModelStatus();
    });
  }
  if (controlsModelSelect) {
    controlsModelSelect.addEventListener('change', async () => {
      const newModel = controlsModelSelect.value;
      await persistSettings({ webllmModel: newModel });
      await updateModelStatus();
      if (controlsBackendSelect?.value === 'webllm') {
        const st = await chrome.runtime.sendMessage({
          type: 'GET_MODEL_STATUS',
          backend: 'webllm',
          modelId: newModel
        });
        if (st && st.status === 'download_available') {
          triggerModelDownload();
        }
      }
    });
  }

  for (const radio of sensitivityRadios) {
    radio.addEventListener('change', () => persistSettings());
  }

  // 7. Testador Interativo ao Vivo (apenas com Gemini Nano)
  testerBtn.addEventListener('click', async () => {
    const text = testerInput.value.trim();
    if (!text) {
      testerInput.focus();
      return;
    }

    testerBtn.disabled = true;
    testerBtn.textContent = i18n.t('popup.testerAnalyzing');
    testerResult.style.display = 'flex';
    testerBadgePreview.innerHTML = '<span class="deixadisso-badge deixadisso-badge-loading">🧠 ...</span>';
    testerReason.textContent = i18n.t('popup.statusDownloading');

    const activeSensitivity = Array.from(sensitivityRadios).find(r => r.checked)?.value || 'balanced';

    try {
      let result = null;

      // 1. Tenta analisar via background/offscreen
      try {
        result = await chrome.runtime.sendMessage({
          type: 'ANALYZE_POST',
          text,
          sensitivity: activeSensitivity
        });
      } catch (bgErr) {
        console.warn('[DeixaDisso Popup] Falha ao enviar para background:', bgErr);
      }

      // 2. Se o background/offscreen retornou erro ou falhou, tenta inferência direta no Popup
      if ((!result || result.source === 'error') && globalThis.DeixaDissoPromptAPI) {
        console.log('[DeixaDisso Popup] Tentando inferência direta com Gemini Nano no Popup...');
        try {
          const isEn = i18n.getLocale?.() === 'en';
          result = await globalThis.DeixaDissoPromptAPI.analyzePost(text, {
            systemPrompt: i18n.getSystemPrompt ? i18n.getSystemPrompt() : '',
            lang: isEn ? 'en' : 'pt',
            emptyReason: i18n.t('ui.emptyPost')
          });
        } catch (directErr) {
          console.error('[DeixaDisso Popup] Inferência direta no Popup também falhou:', directErr);
          if (!result) {
            result = {
              verdict: 'caution',
              reason: `${i18n.t('ui.nanoFailed')} (${directErr.message || 'unknown'})`,
              source: 'error'
            };
          }
        }
      }

      if (!result) {
        throw new Error('Nenhuma resposta recebida do modelo.');
      }

      const verdict = result.verdict || 'safe';
      const config = (globalThis.DEIXADISSO_CONSTANTS?.BADGE_CONFIG || {})[verdict];

      testerBadgePreview.innerHTML = `
        <span class="deixadisso-badge deixadisso-badge-${verdict}">
          <span class="deixadisso-badge-icon">${config?.icon || '💬'}</span>
          <span class="deixadisso-badge-text">${config?.label || 'Normal'}</span>
        </span>
      `;

      const sourceLabel = result.source === 'webllm'
        ? i18n.t('ui.sourceWebLLM')
        : i18n.t('ui.sourceGeminiNano');

      testerReason.innerHTML = `
        <b>${i18n.t('popup.testerReasonPrefix')}</b> ${result.reason}
        <br><small style="color: #64748b; font-size: 10px;">${sourceLabel}</small>
      `;

      const updatedStats = await globalThis.DeixaDissoStorage.getStats();
      statAvoided.textContent = updatedStats.dailyAvoided?.[today] || updatedStats.avoidedCount || 0;
      statTotal.textContent = updatedStats.totalAnalyzed || 0;
    } catch (err) {
      testerBadgePreview.innerHTML = '<span class="deixadisso-badge deixadisso-badge-caution">⚠️</span>';
      testerReason.textContent = i18n.t('ui.nanoFailed');
    } finally {
      testerBtn.disabled = false;
      testerBtn.textContent = i18n.t('popup.testerBtn');
    }
  });
});
