// Gerenciador de armazenamento local da extensão DeixaDisso

const DeixaDissoStorage = {
  async getSettings() {
    const keys = globalThis.DEIXADISSO_CONSTANTS?.STORAGE_KEYS || { SETTINGS: 'deixadisso_settings' };
    const defaults = globalThis.DEIXADISSO_CONSTANTS?.DEFAULT_SETTINGS || {
      enabled: true,
      enabledSites: { twitter: true, bluesky: true, threads: true },
      sensitivity: 'balanced',
      autoAnalyze: true,
      showSafeBadges: true
    };

    try {
      const data = await chrome.storage.local.get(keys.SETTINGS);
      return { ...defaults, ...(data[keys.SETTINGS] || {}) };
    } catch (e) {
      console.warn('[DeixaDisso] Erro ao ler settings:', e);
      return defaults;
    }
  },

  async saveSettings(settings) {
    const keys = globalThis.DEIXADISSO_CONSTANTS?.STORAGE_KEYS || { SETTINGS: 'deixadisso_settings' };
    try {
      await chrome.storage.local.set({ [keys.SETTINGS]: settings });
    } catch (e) {
      console.error('[DeixaDisso] Erro ao salvar settings:', e);
    }
  },

  async getStats() {
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
      console.warn('[DeixaDisso] Erro ao ler stats:', e);
      return defaultStats;
    }
  },

  async recordAnalysis(verdict) {
    const keys = globalThis.DEIXADISSO_CONSTANTS?.STORAGE_KEYS || { STATS: 'deixadisso_stats' };
    const today = new Date().toISOString().split('T')[0];

    try {
      const stats = await this.getStats();
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
      console.warn('[DeixaDisso] Erro ao atualizar stats:', e);
    }
  },

  async getCache() {
    const keys = globalThis.DEIXADISSO_CONSTANTS?.STORAGE_KEYS || { CACHE: 'deixadisso_cache' };
    try {
      const data = await chrome.storage.local.get(keys.CACHE);
      return data[keys.CACHE] || {};
    } catch (e) {
      console.warn('[DeixaDisso] Erro ao ler cache:', e);
      return {};
    }
  },

  async clearCache() {
    const keys = globalThis.DEIXADISSO_CONSTANTS?.STORAGE_KEYS || { CACHE: 'deixadisso_cache' };
    try {
      await chrome.storage.local.remove(keys.CACHE);
    } catch (e) {
      console.warn('[DeixaDisso] Erro ao limpar cache:', e);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DeixaDissoStorage;
} else if (typeof globalThis !== 'undefined') {
  globalThis.DeixaDissoStorage = DeixaDissoStorage;
}
