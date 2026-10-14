// Adapter para X (antigo Twitter) - x.com e twitter.com

const TwitterAdapter = {
  name: 'twitter',

  canHandle() {
    return window.location.hostname.includes('twitter.com') || window.location.hostname.includes('x.com');
  },

  findPosts() {
    // Busca todos os tweets que ainda não possuem o badge DeixaDisso
    const tweets = document.querySelectorAll('article[data-testid="tweet"]:not([data-deixadisso-processed])');
    return Array.from(tweets);
  },

  extractText(postElement) {
    const textNode = postElement.querySelector('div[data-testid="tweetText"]');
    if (!textNode) return '';
    return textNode.innerText || textNode.textContent || '';
  },

  injectBadge(postElement, badgeContainer) {
    // Tenta injetar no cabeçalho ao lado do User-Name
    const userNameContainer = postElement.querySelector('div[data-testid="User-Name"]');
    if (userNameContainer) {
      userNameContainer.appendChild(badgeContainer);
      postElement.setAttribute('data-deixadisso-processed', 'true');
      return true;
    }

    // Alternativa: na barra de ações inferior
    const actionBar = postElement.querySelector('div[role="group"]');
    if (actionBar) {
      actionBar.appendChild(badgeContainer);
      postElement.setAttribute('data-deixadisso-processed', 'true');
      return true;
    }

    return false;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TwitterAdapter;
} else if (typeof globalThis !== 'undefined') {
  globalThis.TwitterAdapter = TwitterAdapter;
}
