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

    const sectionTitles = document.querySelectorAll('.section-title');
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

  // 3. Checar e alternar entre Tela de Instruções vs Painel de Controles
  async function updateModelStatus() {
    modelStatusBadge.className = 'status-badge status-checking';
    modelStatusText.textContent = i18n.t('popup.statusVerifying');

    try {
      // 1. Tenta verificar através do background / offscreen bridge
      let response = null;
      try {
        response = await chrome.runtime.sendMessage({ type: 'GET_MODEL_STATUS' });
      } catch (sendErr) {
        console.warn('[DeixaDisso Popup] Erro ao comunicar com background:', sendErr);
      }

      // 2. Se o offscreen não respondeu ou reportou flags_required, checa direto no contexto da janela do Popup
      if ((!response || response.status === 'flags_required') && globalThis.DeixaDissoPromptAPI) {
        const directCheck = await globalThis.DeixaDissoPromptAPI.checkAvailability();
        console.log('[DeixaDisso Popup] Checagem direta da Prompt API no Popup:', directCheck);
        if (directCheck.status === 'ready' || directCheck.status === 'download_available' || directCheck.status === 'downloading') {
          response = directCheck;
        }
      }

      const status = response?.status || 'flags_required';
      console.log('[DeixaDisso Popup] Status final determinado:', status, response);
      chrome.runtime.sendMessage({ type: 'UPDATE_ACTION_BADGE', status }).catch(() => {});

      modelStatusBadge.className = 'status-badge';

      if (status === 'ready') {
        modelStatusBadge.classList.add('status-ready');
        modelStatusText.textContent = i18n.t('popup.statusReady');
        viewSetup.style.display = 'none';
        viewControls.style.display = 'flex';
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
  if (btnStartDownload) {
    btnStartDownload.addEventListener('click', async () => {
      btnStartDownload.disabled = true;
      btnStartDownload.textContent = i18n.t('popup.downloadStarting');
      if (downloadProgressContainer) downloadProgressContainer.style.display = 'flex';
      if (downloadProgressLabel) downloadProgressLabel.textContent = i18n.t('popup.downloadStarting');

      try {
        const res = await chrome.runtime.sendMessage({ type: 'START_DOWNLOAD' });
        if (res && res.status === 'ready') {
          await updateModelStatus();
        }
      } catch (err) {
        if (downloadProgressLabel) downloadProgressLabel.textContent = `Error: ${err.message || 'Download failed'}`;
        btnStartDownload.disabled = false;
        btnStartDownload.textContent = i18n.t('popup.downloadActionBtn');
      }
    });
  }

  // Ouvir progresso do download gravado no storage
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.deixadisso_download_status) {
      const info = changes.deixadisso_download_status.newValue;
      if (info) {
        if (downloadProgressContainer) downloadProgressContainer.style.display = 'flex';
        if (downloadProgressFill) downloadProgressFill.style.width = `${info.progress || 0}%`;
        if (downloadProgressLabel) {
          downloadProgressLabel.textContent = i18n.t('popup.downloadProgressLabel', { percent: info.progress || 0 });
        }

        if (info.progress === 100 && !info.isDownloading) {
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

  // Verifica status inicial
  await updateModelStatus();

  // 4. Carregar Configurações
  const settings = await globalThis.DeixaDissoStorage.getSettings();
  toggleMaster.checked = !!settings.enabled;
  toggleTwitter.checked = !!settings.enabledSites?.twitter;
  toggleBluesky.checked = !!settings.enabledSites?.bluesky;
  toggleThreads.checked = !!settings.enabledSites?.threads;

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
  async function persistSettings() {
    const activeSensitivity = Array.from(sensitivityRadios).find(r => r.checked)?.value || 'balanced';
    const newSettings = {
      enabled: toggleMaster.checked,
      enabledSites: {
        twitter: toggleTwitter.checked,
        bluesky: toggleBluesky.checked,
        threads: toggleThreads.checked
      },
      sensitivity: activeSensitivity,
      autoAnalyze: true,
      showSafeBadges: true
    };

    await globalThis.DeixaDissoStorage.saveSettings(newSettings);
  }

  toggleMaster.addEventListener('change', persistSettings);
  toggleTwitter.addEventListener('change', persistSettings);
  toggleBluesky.addEventListener('change', persistSettings);
  toggleThreads.addEventListener('change', persistSettings);

  for (const radio of sensitivityRadios) {
    radio.addEventListener('change', persistSettings);
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

      testerReason.innerHTML = `
        <b>${i18n.t('popup.testerReasonPrefix')}</b> ${result.reason}
        <br><small style="color: #64748b; font-size: 10px;">${i18n.t('ui.sourceGeminiNano')}</small>
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
