# 🧘 DeixaDisso - Filtro Anti-Ragebait & Saúde Mental com Gemini Nano

Extensão Manifest V3 para Google Chrome que analisa publicações e respostas em redes sociais (**X / Twitter**, **BlueSky** e **Threads**) utilizando inteligência artificial **on-device** (**Gemini Nano** via Prompt API nativa do Chrome).

A extensão adiciona um selo visual (badge) ao lado de cada post indicando se vale a pena interagir ou se é melhor "deixar disso", exibindo uma justificativa concisa ao passar o mouse.

---

## ✨ Recursos

- 🧠 **100% On-Device & Privado**: Toda a inferência roda localmente no seu computador com o Gemini Nano embarcado no Chrome. Nenhum texto ou tweet é enviado para servidores externos.
- 🔴🟡🟢 **Classificação em 3 Níveis**:
  - 🔴 **Deixa disso**: Posts com ragebait, ofensas pessoais, trollagem ou discussões estéreis.
  - 🟡 **Cuidado**: Temas polarizados, discussões inflamadas ou sarcasmo agressivo.
  - 🟢 **Produtivo**: Conteúdo civilizado, colaborativo, perguntas genuínas ou descontraídas.
- 💬 **Hover Tooltip com Justificativa**: Passe o mouse sobre o badge para ler uma breve explicação do motivo pelo qual a IA recomenda responder ou ignorar.
- ⚡ **Alta Performance no Scroll Infinito**:
  - `IntersectionObserver`: Avalia apenas os posts visíveis na viewport.
  - Cache LRU em memória: Evita reprocessar posts duplicados.
- 🛠️ **Testador ao Vivo no Popup**: Simule qualquer post diretamente no painel da extensão.
- 🛡️ **Modo de Contingência (Fallback)**: Caso o Gemini Nano ainda não esteja ativo nas flags do navegador, a extensão opera com um motor local heurístico de sentimento para você já desfrutar dos recursos.

---

## 🚀 Como Instalar no Google Chrome

1. Abra o Chrome e acesse `chrome://extensions/`.
2. No canto superior direito, ative a opção **Modo do desenvolvedor** (*Developer mode*).
3. Clique no botão **Carregar sem compactação** (*Load unpacked*).
4. Selecione a pasta deste projeto: `/Users/victorhogemann/Projects/DeixaDisso`.
5. A extensão estará pronta e visível na sua barra de ferramentas!

---

## ⚙️ Como Ativar o Gemini Nano no Chrome

Para tirar proveito do modelo de linguagem nativo do Chrome:

1. Acesse `chrome://flags/#prompt-api-for-gemini-nano` e marque como **Enabled**.
2. Acesse `chrome://flags/#optimization-guide-on-device-model` e marque como **Enabled (BypassPerfRequirement)**.
3. Reinicie o Chrome.
4. Acesse `chrome://components` e localize **Optimization Guide On Device Model**. Clique em **Verificar atualizações** (*Check for update*) para baixar o modelo localmente caso ainda não esteja instalado.

---

## 🧪 Testando a Extensão

1. **Página de Demonstração Interativa**:
   - Abra o arquivo `test/demo-feed.html` no Chrome para ver uma simulação visual dos posts de redes sociais com os badges e tooltips.
2. **Testador no Popup**:
   - Clique no ícone do **DeixaDisso** na barra de ferramentas do Chrome.
   - Digite qualquer frase no campo "Testar Frase Agora" e veja a classificação imediata!
3. **Em Redes Reais**:
   - Navegue normalmente no [X / Twitter](https://x.com), [BlueSky](https://bsky.app) ou [Threads](https://threads.net).
