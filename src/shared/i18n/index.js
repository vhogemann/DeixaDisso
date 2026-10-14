// Módulo central de i18n com regras de fallback especificadas

(function() {
  const LOCALES = {
    pt_BR: (typeof DEIXADISSO_I18N_PT_BR !== 'undefined') ? DEIXADISSO_I18N_PT_BR : null,
    en: (typeof DEIXADISSO_I18N_EN !== 'undefined') ? DEIXADISSO_I18N_EN : null
  };

  function resolveLocaleCode(rawLang) {
    if (!rawLang || typeof rawLang !== 'string') return 'en';
    const clean = rawLang.trim().toLowerCase().replace(/_/g, '-');
    
    // Regra: Fallback de 'pt', 'pt-PT', 'pt-BR' para 'pt_BR'
    if (clean === 'pt' || clean.startsWith('pt-')) {
      return 'pt_BR';
    }
    
    // Regra: Qualquer outra língua cai em 'en'
    return 'en';
  }

  function detectBrowserLocale() {
    let lang = 'en';
    try {
      if (typeof chrome !== 'undefined' && chrome.i18n && typeof chrome.i18n.getUILanguage === 'function') {
        lang = chrome.i18n.getUILanguage();
      } else if (typeof navigator !== 'undefined') {
        lang = navigator.language || (navigator.languages && navigator.languages[0]) || 'en';
      }
    } catch (_) {}
    return resolveLocaleCode(lang);
  }

  const DeixaDissoI18n = {
    currentLocale: null,

    getLocale() {
      if (!this.currentLocale) {
        this.currentLocale = detectBrowserLocale();
      }
      return this.currentLocale;
    },

    setLocale(localeCode) {
      this.currentLocale = resolveLocaleCode(localeCode);
    },

    getDictionary(localeCode = null) {
      const code = localeCode ? resolveLocaleCode(localeCode) : this.getLocale();
      
      // Carrega sob demanda se estiver em ambiente Node / CommonJS
      if (!LOCALES[code]) {
        if (typeof require !== 'undefined') {
          try {
            LOCALES[code] = require(`./locales/${code}.js`);
          } catch (_) {
            LOCALES[code] = require('./locales/en.js');
          }
        } else if (typeof globalThis !== 'undefined') {
          LOCALES.pt_BR = globalThis.DEIXADISSO_I18N_PT_BR;
          LOCALES.en = globalThis.DEIXADISSO_I18N_EN;
        }
      }

      return LOCALES[code] || LOCALES.en || {};
    },

    t(keyPath, params = {}, localeCode = null) {
      const dict = this.getDictionary(localeCode);
      const parts = keyPath.split('.');
      let val = dict;

      for (const part of parts) {
        if (val && typeof val === 'object' && part in val) {
          val = val[part];
        } else {
          // Fallback para inglês se não encontrar a chave
          val = null;
          break;
        }
      }

      if (val === null) {
        let fallbackVal = this.getDictionary('en');
        for (const part of parts) {
          if (fallbackVal && typeof fallbackVal === 'object' && part in fallbackVal) {
            fallbackVal = fallbackVal[part];
          } else {
            return keyPath;
          }
        }
        val = fallbackVal;
      }

      if (typeof val === 'string') {
        return val.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? params[k] : `{${k}}`));
      }

      return val;
    },

    getSystemPrompt(localeCode = null) {
      const dict = this.getDictionary(localeCode);
      return dict.systemPrompt || '';
    },

    getBadgeConfig(localeCode = null) {
      const dict = this.getDictionary(localeCode);
      return dict.badges || {};
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeixaDissoI18n;
  } else if (typeof globalThis !== 'undefined') {
    globalThis.DeixaDissoI18n = DeixaDissoI18n;
  }
})();
