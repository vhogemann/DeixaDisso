// Fábrica e manipulador de Badges e Tooltips com Portal Global para máxima prioridade de sobreposição

const DeixaDissoUI = {
  _portalTooltip: null,
  _activeBadge: null,
  _hideTimeout: null,

  // Inicializa ou obtém o elemento do Popover Global anexado diretamente ao body
  getOrCreateGlobalTooltip() {
    if (this._portalTooltip && document.body.contains(this._portalTooltip)) {
      return this._portalTooltip;
    }

    const tooltip = document.createElement('div');
    tooltip.id = 'deixadisso-global-portal-tooltip';
    tooltip.className = 'deixadisso-tooltip';

    const header = document.createElement('div');
    header.className = 'deixadisso-tooltip-header';

    const tag = document.createElement('span');
    tag.className = 'deixadisso-tooltip-tag';
    tag.textContent = 'Analisando...';

    const source = document.createElement('span');
    source.className = 'deixadisso-tooltip-source';
    source.textContent = 'Gemini Nano';

    header.appendChild(tag);
    header.appendChild(source);

    const body = document.createElement('div');
    body.className = 'deixadisso-tooltip-body';

    const reasonText = document.createElement('div');
    reasonText.className = 'deixadisso-reason-text';
    reasonText.textContent = globalThis.DeixaDissoI18n?.t('ui.analyzingInitial') || 'Avaliando se responder a este post vale o seu tempo e paz de espírito...';

    body.appendChild(reasonText);

    const footer = document.createElement('div');
    footer.className = 'deixadisso-tooltip-footer';

    tooltip.appendChild(header);
    tooltip.appendChild(body);
    tooltip.appendChild(footer);

    // Manter visível enquanto o mouse estiver sobre o próprio popover
    tooltip.addEventListener('mouseenter', () => {
      clearTimeout(this._hideTimeout);
    });

    tooltip.addEventListener('mouseleave', () => {
      this.scheduleHideTooltip();
    });

    document.body.appendChild(tooltip);

    tooltip._tagElement = tag;
    tooltip._sourceElement = source;
    tooltip._reasonText = reasonText;
    tooltip._footerElement = footer;

    this._portalTooltip = tooltip;
    return tooltip;
  },

  showTooltipForBadge(badgeElement, result) {
    clearTimeout(this._hideTimeout);
    this._activeBadge = badgeElement;

    const tooltip = this.getOrCreateGlobalTooltip();
    const verdict = result?.verdict || 'safe';
    const config = (globalThis.DEIXADISSO_CONSTANTS?.BADGE_CONFIG || {})[verdict] || {
      label: 'Normal',
      icon: '💬',
      description: 'Post construtivo.'
    };

    // Preenche cabeçalho
    tooltip._tagElement.className = `deixadisso-tooltip-tag deixadisso-tooltip-badge-tag-${verdict}`;
    tooltip._tagElement.textContent = `${config.icon} ${config.label}`;
    tooltip._sourceElement.textContent = result?.source === 'gemini_nano'
      ? (globalThis.DeixaDissoI18n?.t('ui.sourceGeminiNano') || 'Gemini Nano (On-device)')
      : (globalThis.DeixaDissoI18n?.t('ui.sourceFallback') || 'IA Anti-Ragebait');

    // Justificativa dinâmica limpa e direta
    tooltip._reasonText.textContent = result?.reason || config.description;

    // Atualiza Footer com botão de ação
    tooltip._footerElement.innerHTML = '';
    if (verdict === 'leave') {
      const avoidBtn = document.createElement('button');
      avoidBtn.className = 'deixadisso-action-btn deixadisso-action-btn-leave';
      avoidBtn.type = 'button';
      avoidBtn.textContent = globalThis.DeixaDissoI18n?.t('ui.avoidAction') || '🙏 Deixei disso (+1 Paz)';
      avoidBtn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        avoidBtn.textContent = globalThis.DeixaDissoI18n?.t('ui.avoidRecorded') || '✓ Registrado!';
        avoidBtn.disabled = true;
        try {
          chrome.runtime.sendMessage({ type: 'RECORD_AVOIDED' });
        } catch (_) {}
      };
      tooltip._footerElement.appendChild(avoidBtn);
    } else {
      const peaceSpan = document.createElement('span');
      peaceSpan.style.color = '#94a3b8';
      peaceSpan.style.fontSize = '10px';
      peaceSpan.textContent = 'DeixaDisso AI';
      tooltip._footerElement.appendChild(peaceSpan);
    }

    // Calcula posição fixa na tela (Viewport)
    const rect = badgeElement.getBoundingClientRect();
    const popoverWidth = 280;
    const padding = 12;

    let left = rect.left + (rect.width / 2) - (popoverWidth / 2);
    if (left < padding) left = padding;
    if (left + popoverWidth > window.innerWidth - padding) {
      left = window.innerWidth - padding - popoverWidth;
    }

    // Posição vertical: acima por padrão, ou abaixo se estiver muito no topo da tela
    let top;
    if (rect.top < 130) {
      // Abre para baixo
      top = rect.bottom + 8;
      tooltip.classList.remove('deixadisso-tooltip-above');
      tooltip.classList.add('deixadisso-tooltip-below');
    } else {
      // Abre para cima
      top = rect.top - 8;
      tooltip.classList.remove('deixadisso-tooltip-below');
      tooltip.classList.add('deixadisso-tooltip-above');
    }

    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
    tooltip.classList.add('deixadisso-tooltip-visible');
  },

  scheduleHideTooltip() {
    clearTimeout(this._hideTimeout);
    this._hideTimeout = setTimeout(() => {
      if (this._portalTooltip) {
        this._portalTooltip.classList.remove('deixadisso-tooltip-visible');
      }
      this._activeBadge = null;
    }, 180);
  },

  createBadge() {
    const container = document.createElement('div');
    container.className = 'deixadisso-badge-container';

    const badge = document.createElement('button');
    badge.className = 'deixadisso-badge deixadisso-badge-loading';
    badge.type = 'button';
    badge.setAttribute('aria-label', 'DeixaDisso: Analisando post...');

    const iconSpan = document.createElement('span');
    iconSpan.className = 'deixadisso-badge-icon';
    iconSpan.textContent = '🧠';

    const textSpan = document.createElement('span');
    textSpan.className = 'deixadisso-badge-text';
    textSpan.textContent = '...';

    badge.appendChild(iconSpan);
    badge.appendChild(textSpan);
    container.appendChild(badge);

    let currentResult = {
      verdict: 'loading',
      badgeText: 'Analisando...',
      reason: 'O Gemini Nano está analisando este post localmente.',
      source: 'gemini_nano'
    };

    // Eventos de hover para exibir no portal global
    badge.addEventListener('mouseenter', () => {
      this.showTooltipForBadge(badge, currentResult);
    });

    badge.addEventListener('mouseleave', () => {
      this.scheduleHideTooltip();
    });

    // Retorna o container com referências internas
    container._badgeElement = badge;
    container._iconElement = iconSpan;
    container._textElement = textSpan;
    container._setResult = (res) => {
      currentResult = res;
    };

    return container;
  },

  updateBadge(container, result) {
    if (!container || !container._badgeElement) return;

    const badge = container._badgeElement;
    const iconSpan = container._iconElement;
    const textSpan = container._textElement;

    const verdict = result.verdict || 'safe';
    const config = (globalThis.DEIXADISSO_CONSTANTS?.BADGE_CONFIG || {})[verdict] || {
      label: 'Normal',
      icon: '💬'
    };

    // Atualiza estado e classes
    badge.className = 'deixadisso-badge';
    badge.classList.add(`deixadisso-badge-${verdict}`);

    iconSpan.textContent = config.icon;
    textSpan.textContent = config.label;

    if (container._setResult) {
      container._setResult(result);
    }

    // Se este badge estiver ativo no momento, atualiza o popover aberto
    if (this._activeBadge === badge) {
      this.showTooltipForBadge(badge, result);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DeixaDissoUI;
} else if (typeof globalThis !== 'undefined') {
  globalThis.DeixaDissoUI = DeixaDissoUI;
}
