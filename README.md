# 🧘 DeixaDisso - Filtro Anti-Ragebait & Saúde Mental com Gemini Nano

Extensão Manifest V3 para Google Chrome que analisa publicações e respostas em redes sociais (**X / Twitter**, **BlueSky** e **Threads**) utilizando inteligência artificial **100% on-device** (**Gemini Nano** via Prompt API nativa do Chrome).

A extensão adiciona um selo visual (*badge*) ao lado de cada post indicando se vale a pena interagir ou se é melhor "deixar disso", exibindo uma justificativa concisa gerada dinamicamente pelo modelo ao passar o mouse.

---

## ✨ Recursos

- 🧠 **100% On-Device & Privado**: Toda a inferência roda localmente no seu computador com o Gemini Nano embarcado no Chrome. Nenhum dado, post ou texto é enviado para servidores externos ou nuvem.
- 🔴🟡🟢 **Classificação em 3 Níveis**:
  - 🔴 **Deixa disso**: Posts com ragebait, ofensas pessoais, trollagem ou discussões estéreis.
  - 🟡 **Cuidado**: Temas polarizados, discussões inflamadas ou sarcasmo agressivo.
  - 🟢 **Produtivo**: Conteúdo civilizado, colaborativo, perguntas genuínas ou descontraídas.
- 💬 **Hover Tooltip com Justificativa Dinâmica**: Passe o mouse sobre o badge para ler a explicação concisa gerada pela IA sobre o motivo pelo qual ela recomenda responder ou ignorar.
- 🏷️ **Badges de Status no Ícone da Barra de Ferramentas**:
  - **`!`** (Vermelho): Prompt API não habilitada no Chrome (requer ativação das flags).
  - **`DL`** (Âmbar): Modelo suportado e pronto para download.
  - **`X%`** (Azul): Download do Gemini Nano em andamento em tempo real.
  - **`OFF`** (Cinza): Extensão desativada pelo interruptor geral.
  - *(Limpo / Sem badge)*: Quando tudo está 100% pronto e ativo.
- 🌐 **Internacionalização Completa (i18n)**: Suporte nativo a Português do Brasil (`pt_BR`) e Inglês (`en`), com prompts e interfaces traduzidos automaticamente.
- ⚡ **Alta Performance no Scroll Infinito**:
  - `IntersectionObserver`: Avalia apenas os posts visíveis na viewport.
  - Cache LRU em memória: Evita reprocessar posts repetidos no feed.
- 🛠️ **Testador ao Vivo no Popup**: Simule e teste qualquer frase diretamente no painel da extensão.

---

## 📦 Como Instalar pelo GitHub Releases (Recomendado para Testes)

1. Acesse a página de **[Releases no GitHub](https://github.com/vhogemann/DeixaDisso/releases)**.
2. Baixe o arquivo **`DeixaDisso-v1.0.0.zip`** da versão mais recente e descompacte-o em uma pasta no seu computador.
3. No Google Chrome, abra uma nova aba e digite `chrome://extensions/`.
4. No canto superior direito, ative a chave **Modo do desenvolvedor** (*Developer mode*).
5. Clique no botão **Carregar sem compactação** (*Load unpacked*).
6. Selecione a pasta onde os arquivos foram descompactados (a pasta que contém o arquivo `manifest.json`).
7. Pronto! A extensão estará instalada e visível na barra de ferramentas do Chrome.

---

## ⚙️ Como Ativar o Gemini Nano no Chrome

Para utilizar os recursos de inteligência artificial on-device da Prompt API:

1. **Ative as flags no Chrome:**
   - Acesse `chrome://flags/#prompt-api-for-gemini-nano` e marque como **Enabled**.
   - Acesse `chrome://flags/#optimization-guide-on-device-model` e marque como **Enabled (BypassPerfRequirement)**.
   - Clique no botão **Relaunch** no rodapé para reiniciar o navegador.
2. **Requisitos de Sistema:**
   - O Chrome exige ao menos **22 GB de espaço livre em disco** no volume do seu perfil de usuário para baixar e manter o modelo local (~1.7 GB).
3. **Download do Modelo:**
   - Abra o Popup da extensão e clique em **Iniciar Download do Gemini Nano** (ou acesse `chrome://components` e clique em *Check for update* no componente **Optimization Guide On Device Model**).
   - Enquanto o modelo baixa, você verá o progresso em tempo real diretamente no ícone da extensão!

---

## 🧪 Testando a Extensão

1. **Página de Demonstração Interativa**:
   - Abra o arquivo `test/demo-feed.html` no Chrome para ver uma simulação visual de feed com posts de exemplo, badges e popovers.
2. **Testador no Popup**:
   - Clique no ícone do **DeixaDisso** na barra de ferramentas do Chrome.
   - Digite ou cole qualquer frase no campo "Testar Frase Agora" e veja a classificação imediata!
3. **Em Redes Sociais Suportadas**:
   - Navegue normalmente no [X / Twitter](https://x.com), [BlueSky](https://bsky.app) ou [Threads](https://threads.net).
