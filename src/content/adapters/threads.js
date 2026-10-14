// Adapter para Threads (threads.net e threads.com)

const ThreadsAdapter = {
  name: 'threads',

  canHandle() {
    const host = window.location.hostname.toLowerCase();
    return host.includes('threads.net') || host.includes('threads.com');
  },

  findPosts() {
    const found = new Set();

    // 1. Seletores diretos de cards de post
    const primarySelectors = [
      'div[data-pressable-container="true"]:not([data-deixadisso-processed])',
      'div[role="article"]:not([data-deixadisso-processed])',
      'article:not([data-deixadisso-processed])'
    ];

    document.querySelectorAll(primarySelectors.join(', ')).forEach(el => {
      // Garantir que tem texto ou ações de post
      if (el.querySelector('svg[aria-label], a[href*="/@"]') || el.innerText?.length > 10) {
        found.add(el);
      }
    });

    // 2. Seletor por botões de interação do Threads (Curtir / Responder / Like / Reply)
    const interactionSvgs = document.querySelectorAll(
      'svg[aria-label="Responder"], svg[aria-label="Reply"], svg[aria-label="Curtir"], svg[aria-label="Like"]'
    );

    interactionSvgs.forEach(svg => {
      // Sobe até encontrar o container do post
      const postCard = svg.closest('div[data-pressable-container="true"]') ||
                       svg.closest('div[role="article"]') ||
                       svg.closest('article') ||
                       svg.closest('div[style*="border-bottom"]') ||
                       svg.parentElement?.parentElement?.parentElement?.parentElement;

      if (postCard && !postCard.hasAttribute('data-deixadisso-processed')) {
        found.add(postCard);
      }
    });

    // 3. Fallback via links de autor (@usuario)
    const authorLinks = document.querySelectorAll('a[href^="/@"]:not([data-deixadisso-processed])');
    authorLinks.forEach(link => {
      // Ignorar links do header de navegação
      if (link.closest('header') || link.closest('nav')) return;

      const postCard = link.closest('div[data-pressable-container="true"]') ||
                       link.closest('div[role="article"]') ||
                       link.closest('article') ||
                       link.closest('div[style*="border-bottom"]');

      if (postCard && !postCard.hasAttribute('data-deixadisso-processed')) {
        found.add(postCard);
      }
    });

    return Array.from(found);
  },

  extractText(postElement) {
    // No Threads, o texto do post geralmente está dentro de spans/divs com dir="auto"
    const textNodes = postElement.querySelectorAll('div[dir="auto"], span[dir="auto"]');
    const validChunks = [];

    textNodes.forEach(node => {
      // Desconsidera se estiver dentro de botões de ação ou links de perfil
      if (node.closest('button') || node.closest('a[href^="/@"]') || node.closest('time')) {
        return;
      }

      // Desconsidera contadores ("12 respostas", "4 curtidas")
      const text = (node.innerText || node.textContent || '').trim();
      if (!text) return;

      const isCounter = /^\d+\s+(respostas?|curtidas?|replies|likes)/i.test(text);
      const isTimestamp = /^(\d+[smhdwy]|\d+\s+(min|h|d))/i.test(text);

      if (!isCounter && !isTimestamp && text.length > 2) {
        validChunks.push(text);
      }
    });

    if (validChunks.length > 0) {
      // Ordena por tamanho ou junta os blocos sem repetição
      const uniqueChunks = Array.from(new Set(validChunks));
      // Geralmente o maior bloco ou a combinação dos blocos únicos é o post completo
      return uniqueChunks.join(' ');
    }

    // Fallback: texto geral do post excluindo cabeçalhos e botões
    const clone = postElement.cloneNode(true);
    clone.querySelectorAll('button, a[href^="/@"], svg, time').forEach(el => el.remove());
    return (clone.innerText || clone.textContent || '').trim();
  },

  injectBadge(postElement, badgeContainer) {
    // 1. Tentar injetar logo ao lado do nome do autor (@handle) ou timestamp
    const authorLink = postElement.querySelector('a[href^="/@"]');
    if (authorLink) {
      // Localiza a linha do autor (parent que contém o handle e o timestamp)
      const headerLine = authorLink.closest('div[style*="flex-direction: row"]') ||
                         authorLink.parentElement;
      if (headerLine) {
        headerLine.appendChild(badgeContainer);
        postElement.setAttribute('data-deixadisso-processed', 'true');
        return true;
      }
    }

    // 2. Tentar barra de ações inferior
    const actionSvgs = postElement.querySelectorAll('svg[aria-label="Responder"], svg[aria-label="Reply"]');
    if (actionSvgs.length > 0) {
      const actionRow = actionSvgs[0].closest('div[style*="flex-direction: row"]') ||
                        actionSvgs[0].parentElement?.parentElement;
      if (actionRow) {
        actionRow.appendChild(badgeContainer);
        postElement.setAttribute('data-deixadisso-processed', 'true');
        return true;
      }
    }

    // 3. Fallback: topo do card do post
    postElement.insertBefore(badgeContainer, postElement.firstChild);
    postElement.setAttribute('data-deixadisso-processed', 'true');
    return true;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThreadsAdapter;
} else if (typeof globalThis !== 'undefined') {
  globalThis.ThreadsAdapter = ThreadsAdapter;
}
