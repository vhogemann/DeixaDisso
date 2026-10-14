#!/usr/bin/env node

/**
 * DeixaDisso - Benchmark & Evaluation Harness
 * Executa a bateria de testes de sentimento via Chrome Prompt API (Gemini Nano)
 * Mede acurácia, falsos positivos, conformidade de JSON e latência de inferência.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const DATASET_PATH = path.join(__dirname, 'dataset.json');
const RESULTS_DIR = path.join(__dirname, 'results');
const PROFILE_DIR = path.join(__dirname, '.chrome-harness-profile');
const DEFAULT_CDP_PORT = parseInt(process.env.CHROME_CDP_PORT || '9222', 10);
const DEFAULT_HTTP_PORT = parseInt(process.env.HARNESS_HTTP_PORT || '9876', 10);

// Carrega os prompts oficiais do projeto
const PT_BR_LOCALE = require('../src/shared/i18n/locales/pt_BR.js');
const EN_LOCALE = require('../src/shared/i18n/locales/en.js');

// Cores ANSI para o terminal
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Conexão e comunicação direta via Chrome DevTools Protocol (CDP) usando WebSockets nativos do Node
class ChromeCDP {
  constructor(port = DEFAULT_CDP_PORT) {
    this.port = port;
    this.ws = null;
    this.msgId = 1;
  }

  async connect(httpPort = DEFAULT_HTTP_PORT, retries = 30) {
    let target = null;
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${this.port}/json/list`);
        if (res.ok) {
          const list = await res.json();
          target = list.find(p => p.url.includes(`${httpPort}`)) || list.find(p => p.type === 'page');
          if (target && target.webSocketDebuggerUrl) {
            break;
          }
        }
      } catch (_) {}
      await sleep(300);
    }

    if (!target || !target.webSocketDebuggerUrl) {
      throw new Error(`Não foi possível conectar ao Chrome CDP na porta ${this.port}.`);
    }

    this.ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    await this.send('Runtime.enable');
    return target;
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.msgId++;
      const handler = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.id === id) {
            this.ws.removeEventListener('message', handler);
            if (msg.error) {
              reject(new Error(msg.error.message || JSON.stringify(msg.error)));
            } else {
              resolve(msg.result);
            }
          }
        } catch (e) {
          reject(e);
        }
      };
      this.ws.addEventListener('message', handler);
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression, userGesture = true) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      userGesture,
      awaitPromise: true,
      returnByValue: true
    });
    return res.result?.value;
  }

  close() {
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
    }
  }
}

// Inicia um servidor HTTP local simples para expor uma origem segura (localhost) ao Chrome
function startLocalServer(port = DEFAULT_HTTP_PORT) {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>DeixaDisso Harness</title></head>
<body><h1>DeixaDisso Local AI Runner</h1></body>
</html>`);
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

// Inicia o Chrome Headless localmente com suporte completo à Prompt API
async function ensureChromeRunning(cdpPort = DEFAULT_CDP_PORT, httpPort = DEFAULT_HTTP_PORT) {
  try {
    const check = await fetch(`http://127.0.0.1:${cdpPort}/json/version`);
    if (check.ok) {
      console.log(`${colors.green}✓ Chrome CDP detectado na porta ${cdpPort}.${colors.reset}`);
      return null;
    }
  } catch (_) {}

  console.log(`${colors.cyan}Iniciando instância isolada do Google Chrome com Gemini Nano ativado...${colors.reset}`);

  const possiblePaths = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ];

  const chromeExecutable = possiblePaths.find(p => fs.existsSync(p));
  if (!chromeExecutable) {
    throw new Error('Executável do Google Chrome não encontrado nos caminhos padrão.');
  }

  if (!fs.existsSync(PROFILE_DIR)) {
    fs.mkdirSync(PROFILE_DIR, { recursive: true });
  }

  const args = [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${PROFILE_DIR}`,
    '--enable-features=PromptApiForGeminiNano,OptimizationGuideOnDeviceModel',
    '--enable-blink-features=PromptApiForGeminiNano',
    '--optimization-guide-on-device-model-execution-feature-allowed-for-test',
    '--optimization-guide-performance-class=4',
    '--component-updater=fast-update',
    '--no-first-run',
    '--no-default-browser-check',
    `http://127.0.0.1:${httpPort}`
  ];

  const proc = spawn(chromeExecutable, args, { stdio: 'ignore' });
  await sleep(1500);
  return proc;
}

// Injeta o helper DeixaDissoPromptAPI na página de teste do Chrome
async function injectPromptAPIHelper(cdp) {
  const promptApiCode = fs.readFileSync(path.join(__dirname, '../src/shared/prompt-api.js'), 'utf8');
  await cdp.evaluate(promptApiCode);
}

// Executa a inferência para um post individual dentro do Chrome
async function runInference(cdp, text, systemPrompt, lang = 'pt') {
  const start = Date.now();
  const escapedText = JSON.stringify(text);
  const escapedPrompt = JSON.stringify(systemPrompt);

  const script = `
    (async () => {
      if (!globalThis.DeixaDissoPromptAPI) {
        return { error: 'DeixaDissoPromptAPI não encontrada' };
      }
      try {
        const result = await globalThis.DeixaDissoPromptAPI.analyzePost(${escapedText}, {
          systemPrompt: ${escapedPrompt},
          lang: ${JSON.stringify(lang)}
        });
        return result;
      } catch (err) {
        return { error: err.message };
      }
    })()
  `;

  const result = await cdp.evaluate(script);
  const durationMs = Date.now() - start;

  return {
    ...result,
    durationMs
  };
}

async function runBenchmark(customPrompt = null) {
  console.log(`${colors.bold}====================================================${colors.reset}`);
  console.log(`${colors.bold}🧠 DeixaDisso - Gemini Nano Prompt Evaluation Harness${colors.reset}`);
  console.log(`${colors.bold}====================================================${colors.reset}\n`);

  const dataset = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf8'));
  console.log(`Carregado dataset com ${colors.bold}${dataset.length}${colors.reset} casos de teste.\n`);

  const server = await startLocalServer(DEFAULT_HTTP_PORT);
  let chromeProc = null;
  const cdp = new ChromeCDP(DEFAULT_CDP_PORT);

  try {
    chromeProc = await ensureChromeRunning(DEFAULT_CDP_PORT, DEFAULT_HTTP_PORT);
    console.log(`${colors.cyan}Conectando ao Chrome DevTools Protocol...${colors.reset}`);
    await cdp.connect(DEFAULT_HTTP_PORT);
    await injectPromptAPIHelper(cdp);

    // Verifica disponibilidade do modelo no Chrome
    const availability = await cdp.evaluate('DeixaDissoPromptAPI.checkAvailability()');
    console.log(`Status da Prompt API no Chrome: ${colors.bold}${availability?.status || 'desconhecido'}${colors.reset} (raw: ${availability?.raw})`);

    // Se estiver em download_available, aciona a criação de sessão com monitor
    if (availability?.status === 'download_available' || availability?.raw === 'downloadable') {
      console.log(`${colors.yellow}O modelo precisa ser carregado. Inicializando sessão...${colors.reset}`);
      await cdp.evaluate(`
        (async () => {
          if (window.LanguageModel) {
            await window.LanguageModel.create();
          }
        })()
      `, true);
    }

    const results = [];
    let correctCount = 0;
    let falsePositives = 0; // Safe classificado como Leave
    let falseNegatives = 0; // Leave classificado como Safe
    let totalLatency = 0;

    console.log(`\n${colors.bold}Iniciando execução dos casos de teste...${colors.reset}\n`);

    for (let i = 0; i < dataset.length; i++) {
      const item = dataset[i];
      const lang = item.lang || 'pt';
      const systemPrompt = customPrompt || (lang === 'en' ? EN_LOCALE.systemPrompt : PT_BR_LOCALE.systemPrompt);

      process.stdout.write(`[${i + 1}/${dataset.length}] ${colors.bold}${item.id}${colors.reset} (${item.category})... `);

      const inference = await runInference(cdp, item.text, systemPrompt, lang);
      totalLatency += (inference.durationMs || 0);

      const isMatch = inference.verdict === item.expectedVerdict;
      if (isMatch) {
        correctCount++;
        console.log(`${colors.green}✓ ACERTO (${inference.verdict})${colors.reset} [${inference.durationMs}ms]`);
      } else {
        console.log(`${colors.red}✗ ERRO (Esperado: ${item.expectedVerdict}, Obteve: ${inference.verdict || 'erro'})${colors.reset} [${inference.durationMs}ms]`);
        if (item.expectedVerdict === 'safe' && inference.verdict === 'leave') {
          falsePositives++;
        }
        if (item.expectedVerdict === 'leave' && inference.verdict === 'safe') {
          falseNegatives++;
        }
      }

      results.push({
        id: item.id,
        category: item.category,
        text: item.text,
        expectedVerdict: item.expectedVerdict,
        actualVerdict: inference.verdict,
        reason: inference.reason,
        matched: isMatch,
        durationMs: inference.durationMs,
        notes: item.notes,
        error: inference.error
      });
    }

    const accuracy = Math.round((correctCount / dataset.length) * 100);
    const avgLatency = Math.round(totalLatency / dataset.length);

    console.log(`\n${colors.bold}====================================================${colors.reset}`);
    console.log(`${colors.bold}📊 RESULTADO DO BENCHMARK${colors.reset}`);
    console.log(`${colors.bold}====================================================${colors.reset}`);
    console.log(`Acurácia Geral:        ${accuracy >= 80 ? colors.green : colors.yellow}${accuracy}%${colors.reset} (${correctCount}/${dataset.length})`);
    console.log(`Falsos Positivos:      ${falsePositives > 0 ? colors.red : colors.green}${falsePositives}${colors.reset} (posts inofensivos rotulados como 'leave')`);
    console.log(`Falsos Negativos:      ${falseNegatives > 0 ? colors.red : colors.green}${falseNegatives}${colors.reset} (ragebaits rotulados como 'safe')`);
    console.log(`Tempo Médio:           ${colors.cyan}${avgLatency}ms por inferência${colors.reset}\n`);

    // Exibe o relatório de falhas para análise e refino
    const failures = results.filter(r => !r.matched);
    if (failures.length > 0) {
      console.log(`${colors.bold}${colors.red}Casos com Discrepância para Calibração de Prompt:${colors.reset}`);
      failures.forEach((f, idx) => {
        console.log(`\n${colors.bold}${idx + 1}. [${f.id}]${colors.reset} - ${f.notes}`);
        console.log(`   Texto:    "${f.text}"`);
        console.log(`   Esperado: ${colors.green}${f.expectedVerdict}${colors.reset} | Obtido: ${colors.red}${f.actualVerdict || 'erro'}${colors.reset}`);
        console.log(`   Motivo retornado: "${f.reason || f.error || 'Nenhum'}"`);
      });
      console.log('\n');
    }

    if (!fs.existsSync(RESULTS_DIR)) {
      fs.mkdirSync(RESULTS_DIR, { recursive: true });
    }
    const outputPath = path.join(RESULTS_DIR, 'latest.json');
    fs.writeFileSync(outputPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      accuracy,
      correctCount,
      totalCount: dataset.length,
      falsePositives,
      falseNegatives,
      avgLatencyMs: avgLatency,
      results
    }, null, 2));

    console.log(`Relatório detalhado gravado em: ${colors.gray}${outputPath}${colors.reset}`);
    return { accuracy, falsePositives, falseNegatives, results };
  } finally {
    cdp.close();
    server.close();
    if (chromeProc) {
      chromeProc.kill();
    }
  }
}

if (require.main === module) {
  runBenchmark().catch(err => {
    console.error(`\n${colors.red}Erro durante o benchmark:${colors.reset}`, err);
    process.exit(1);
  });
}

module.exports = { runBenchmark, DATASET_PATH };
