// Adapter para BlueSky (bsky.app)

const BlueSkyAdapter = {
  name: 'bluesky',

  canHandle() {
    return window.location.hostname.includes('bsky.app');
  },

  findPosts() {
    // Busca itens de feed ou itens de thread não processados
    const items = document.querySelectorAll(
      'div[data-testid^="feedItem-"]:not([data-deixadisso-processed]), ' +
      'div[data-testid^="postThreadItem"]:not([data-deixadisso-processed]), ' +
      'div[data-testid="postContent"]:not([data-deixadisso-processed])'
    );
    return Array.from(items);
  },

  extractText(postElement) {
    // Busca blocos com data-word-wrap ou elementos de texto do post
    const textNode = postElement.querySelector('div[data-word-wrap="1"]') ||
                     postElement.querySelector('div[dir="auto"][style*="user-select: text"]') ||
                     postElement.querySelector('div[data-testid="postText"]');
    
    if (textNode) {
      return textNode.innerText || textNode.textContent || '';
    }

    // Fallback: busca nós de texto que não sejam o nome do usuário nem botões
    const paragraphs = postElement.querySelectorAll('div[dir="auto"]');
    for (const p of paragraphs) {
      const text = p.innerText || '';
      // Evita pegar apenas timestamp ou nome curto
      if (text.length > 15 && !p.closest('button')) {
        return text;
      }
    }

    return '';
  },

  injectBadge(postElement, badgeContainer) {
    // Localiza linha de cabeçalho do autor ou a barra de ações
    const headerRow = postElement.querySelector('div[data-testid="postAuthor"]') ||
                      postElement.querySelector('div[style*="flex-direction: row"]');
    
    if (headerRow) {
      headerRow.appendChild(badgeContainer);
      postElement.setAttribute('data-deixadisso-processed', 'true');
      return true;
    }

    const actionBar = postElement.querySelector('div[role="group"]');
    if (actionBar) {
      actionBar.appendChild(badgeContainer);
      postElement.setAttribute('data-deixadisso-processed', 'true');
      return true;
    }

    // Se não encontrou cabeçalho ou action bar, anexa no próprio container do post
    postElement.appendChild(badgeContainer);
    postElement.setAttribute('data-deixadisso-processed', 'true');
    return true;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BlueSkyAdapter;
} else if (typeof globalThis !== 'undefined') {
  globalThis.BlueSkyAdapter = BlueSkyAdapter;
}
