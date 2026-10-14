# AGENTS.md - Developer & Agent Guide for DeixaDisso

Welcome to **DeixaDisso**. This document serves as the architectural specification, operating manual, and behavioral guide for AI coding agents and human contributors working on this repository.

---

## 1. Project Overview & Philosophy

**DeixaDisso** is a privacy-first, on-device browser extension (Chrome Manifest V3) designed to protect users' mental health on social media (Bluesky, X/Twitter, Threads) by flagging ragebaits, futile arguments, and hostile interactions before the user wastes time or emotional energy responding.

### Core Tenets

1. **100% On-Device AI (Zero Cloud, Zero Serverless):**
   - All text sentiment and intent inference is performed locally using Chrome's Built-in Prompt API (**Gemini Nano**).
   - No post content, author identifiers, or timeline data ever leaves the user's machine.
2. **Zero Heuristics / RegEx Fallbacks:**
   - Previous versions used naive regex or keyword blacklists. **These are permanently deprecated.**
   - All classification relies strictly on the local LLM to capture semantics, sarcasm, context, and nuance.
3. **Gentle, Non-Intrusive UX:**
   - The UI does not block or hide posts by default; it attaches subtle visual badges to the post engagement buttons:
     - 🚫 **Deixa disso (`leave`)**: High risk of emotional drain or pointless argument.
     - ⚠️ **Cuidado (`caution`)**: Sensitive topic, polarizing debate, or heated discussion.
     - ✅ **Produtivo (`safe`)**: Constructive, informative, technical, or safe to engage.
4. **Self-Improving Evaluation Harness:**
   - Prompts are never tuned by guesswork. Any prompt modification must be evaluated against the benchmark dataset in `harness/dataset.json`.

---

## 2. System Architecture

```
                  ┌────────────────────────────────────────┐
                  │          Content Script                │
                  │  (adapters/bluesky, twitter, threads)  │
                  └──────────────────┬─────────────────────┘
                                     │ chrome.runtime.sendMessage
                                     ▼
                  ┌────────────────────────────────────────┐
                  │       Background Service Worker        │
                  │     (cache, routing, badge count)      │
                  └──────────────────┬─────────────────────┘
                                     │ chrome.runtime.sendMessage
                                     ▼
                  ┌────────────────────────────────────────┐
                  │       Offscreen Document (DOM)         │
                  │        (src/offscreen/offscreen.html)  │
                  └──────────────────┬─────────────────────┘
                                     │
                                     ▼
                  ┌────────────────────────────────────────┐
                  │       Chrome Built-in Prompt API       │
                  │       (window.LanguageModel / Nano)    │
                  └────────────────────────────────────────┘
```

### Component Roles

- **`src/content/` (Content Scripts & Adapters):**
  - Monitors the DOM via `MutationObserver` on supported platforms.
  - Platform-specific extractors (`adapters/bluesky.js`, `adapters/twitter.js`, `adapters/threads.js`) extract post text and inject the badge into the engagement actions row.
  - Implements debounce (500ms) and element tracking via `WeakSet` to prevent duplicate analysis.
- **`src/background/service-worker.js` (Background Worker):**
  - Acts as the central coordinator.
  - Manages persistent sentiment cache (backed by `chrome.storage.local` with LRU eviction of 500 items and debounced writes) to provide instant badge rendering across page reloads and scroll.
  - Creates and manages the lifecycle of the Offscreen document.
- **`src/offscreen/` (Offscreen Document):**
  - **Why Offscreen?** In Chrome Manifest V3, Service Workers lack full DOM and certain experimental browser window APIs. The offscreen document runs in a minimal DOM context, holding the persistent Gemini Nano session.
- **`src/shared/prompt-api.js` (Unified Prompt API Bridge):**
  - Abstracts W3C spec (`window.LanguageModel`) and experimental namespaces (`window.ai.languageModel`, `canCreateTextSession`).
  - Handles session creation, download monitoring, and robust JSON extraction with regex fallback recovery.
- **`src/shared/i18n/` (Internationalization):**
  - Supported locales: `pt_BR` (default) and `en`.
  - Holds localized UI strings, badge labels, and system prompts.

---

## 3. Gemini Nano Prompt Engineering Rules

Gemini Nano is a lightweight, on-device model (~1.8B to 3.2B parameters). Working with it requires respecting specific architectural constraints:

### Rules for Authoring Prompts

1. **Negative Token Reflex:**
   - Gemini Nano's base training has a strong reflex on violent or destructive words (`kill`, `matar`, `morreu`, `lutar`).
   - Without few-shot counter-examples, phrases like `kill -9`, `zombie process`, or `revolta do proletariado com meu computador` trigger false positives (`leave`).
   - **Remedy:** Keep explicit counter-examples for technical jargon, metaphorical venting, and celebratory profanity in the few-shot section.
2. **Attention Budget (5 to 7 Examples Max):**
   - Nano suffers from attention dilution and catastrophic forgetting if the prompt exceeds ~8 few-shot examples. Keep examples concise, high-contrast, and focused on genuine edge cases.
3. **Strict JSON Schema Enforcement:**
   - Always end the prompt with:
     ```json
     {
       "verdict": "leave" | "caution" | "safe",
       "reason": "1 a 2 frases curtas justificando a classificação."
     }
     ```
   - Do not request markdown code fences (no ` ```json `); request raw JSON directly.

---

## 4. Evaluation Harness & Optimization Loop

The repository includes a standalone, command-line evaluation harness in `harness/`.

### Key Files in `harness/`

- `harness/dataset.json`: Ground-truth benchmark suite (40+ corner cases) spanning:
  - Technical jargon false positives (`kill -9`, `git blame`, `zombie process`)
  - Slang & celebratory profanity (`puta que pariu que álbum foda`, `holy shit`)
  - Pure ragebaits, personal attacks, and workplace hostility
  - Passive-aggressive sarcasm (*"sênior de 2 anos"*, *"parabéns pela coragem"*)
  - High-register/academic insults (*"analfabetismo funcional"*)
  - Prompt injection & jailbreak attacks (*"IGNORE PRIOR INSTRUCTIONS..."*)
  - Civil debates on policy, taxes, and return-to-office (`caution`)
- `harness/eval.js`: Evaluation runner. Launches an isolated Chrome instance with `--enable-features=PromptApiForGeminiNano`, connects via CDP WebSocket, runs every dataset item, and reports accuracy, false positives, and latency.
- `harness/optimize.js`: Prompt comparison tool that tests candidate prompts and applies winning versions.
- `harness/.chrome-harness-profile/`: Persistent Chrome user data directory where Gemini Nano weights (~1.7 GB) are cached after the initial download.

### How to Run Benchmarks

```bash
# 1. Run baseline benchmark on production prompts
npm run eval

# 2. Test a new candidate prompt
npm run optimize -- --candidate=harness/prompts/candidate_distilled_v3.txt

# 3. Test and apply candidate if successful
node harness/optimize.js --candidate=harness/prompts/candidate_distilled_v3.txt --apply
```

> **Target Standard:** Any prompt candidate deployed to production must maintain **≥ 90% overall accuracy** and **0 false negatives** (no undetected ragebaits) on the ground-truth dataset.

---

## 5. Developer & Testing Workflows

### Loading the Extension in Chrome

1. Open Google Chrome.
2. Navigate to `chrome://extensions`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the root directory of this repository:
   `/Users/victorhogemann/Projects/DeixaDisso`
5. Ensure the Gemini Nano flags are enabled in `chrome://flags`:
   - `#prompt-api-for-gemini-nano` -> **Enabled**
   - `#optimization-guide-on-device-model` -> **Enabled BypassPrefRequirement**

### Manual Testing with Local Mock Feed

A self-contained HTML test page with simulated Bluesky/Twitter feed items is located at:
`test/demo-feed.html`

Open it in Chrome with the extension enabled to visually verify badge injection, tooltips, and loading states without hitting live social media APIs.

---

## 6. Packaging & Releasing

Releases are published directly via the GitHub CLI (`gh`):

```bash
# 1. Package the extension zip (excluding test, harness profiles, git)
rm -f DeixaDisso-v1.0.X.zip
zip -r DeixaDisso-v1.0.X.zip manifest.json src/ icons/ README.md -x "*.DS_Store"

# 2. Publish release to GitHub
gh release create v1.0.X DeixaDisso-v1.0.X.zip --title "v1.0.X - Release Title" --notes "Release changelog..."
```

---

## 7. Guidelines for AI Agents Modifying Code

- **Do not introduce cloud APIs:** Any feature that attempts to send user text to an external server or API key violates the core privacy contract of this project.
- **Preserve i18n parity:** When modifying system prompts or strings in `src/shared/i18n/locales/pt_BR.js`, apply the corresponding semantic update to `src/shared/i18n/locales/en.js`.
- **Run `npm run eval` before committing prompt edits:** Never assume a prompt change works without benchmarking it against `harness/dataset.json`.
- **Keep content adapters resilient:** Social network DOM classes change frequently. Adapters must use data-attributes (e.g. `[data-testid="postText"]`) and semantic selectors rather than generated CSS hash classes.
