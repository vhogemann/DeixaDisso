#!/usr/bin/env node

/**
 * DeixaDisso - Benchmark & Evaluation Harness
 * Executa a bateria de testes de sentimento via Chrome Prompt API (Gemini Nano)
 * Mede acurácia, falsos positivos, conformidade de JSON e latência de inferência.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const DATASET_PATH = path.join(__dirname, 'dataset.json');
const RESULTS_DIR = path.join(__dirname, 'results');
const DEFAULT_PORT = parseInt(process.env.CHROME_CDP_PORT || '9222', 10);

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
  constructor(port = DEFAULT_PORT) {
    this.port = port;
    this.ws = null;
    this.msgId = 1;
  }

  async connect(retries = 25) {
    let target = null;
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${this.port}/json/new?about:blank`, { method: 'PUT' });
        if (res.ok) {
          target = await res.json();
          break;
        }
      } catch (_) {}
      await sleep(250);
    }

    if (!target) {
      throw new Error(`Não foi possível conectar ao Chrome CDP na porta ${this.port}. Verifique se o Chrome está rodando.`);
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

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
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

// Inicia o Chrome Headless localmente se nenhum estiver rodando
async function ensureChromeRunning(port = DEFAULT_PORT) {
  try {
    const check = await fetch(`http://127.0.0.1:${port}/json/version`);
    if (check.ok) {
      console.log(`${colors.green}✓ Chrome CDP detectado na porta ${port}.${colors.reset}`);
      return null; // Já está rodando externamente (ex: no Docker ou na máquina)
    }
  } catch (_) {}

  console.log(`${colors.cyan}Iniciando instância isolada do Google Chrome para avaliação...${colors.reset}`);
  
  // Caminhos típicos (macOS ou Linux / Docker)
  const possiblePaths = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ];

  let chromeExecutable = possiblePaths.find(p => fs.existsSync(p));
  if (!chromeExecutable) {
    throw new Error('Executável do Google Chrome não encontrado nos caminhos padrão.');
  }

  const profileDir = path.join('/tmp', `deixadisso-harness-${Date.now()}`);
  const args = [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    '--enable-features=PromptApiForGeminiNano,OptimizationGuideOnDeviceModel',
    '--enable-blink-features=PromptApiForGeminiNano',
    '--optimization-guide-on-device-model-execution-feature-allowed-for-test',
    '--optimization-guide-performance-class=4',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ];

  const proc = spawn(chromeExecutable, args, { stdio: 'ignore' });
  await sleep(1500);
  return { proc, profileDir };
}

async function runBenchmark(customPrompt = null) {
  console.log(`${colors.bold}====================================================${colors.reset}`);
  console.log(`${colors.bold}🧠 DeixaDisso - Gemini Nano Prompt Evaluation Harness${colors.reset}`);
  console.log(`${colors.bold}====================================================${colors.reset}\n`);

  const dataset = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf8'));
  console.log(`Carregado dataset com ${colors.bold}${dataset.length}${colors.reset} casos de teste.\n`);

  let chromeHandle = null;
  const cdp = new ChromeCDP(DEFAULT_PORT);

  try {
    chromeHandle = await ensureChromeRunning(DEFAULT_PORT);
    console.log(`${colors.cyan}Conectando ao Chrome DevTools Protocol...${colors.reset}`);
    await cdp.connect();
    await injectPromptAPIHelper(cdp);

    // Verifica disponibilidade do modelo no Chrome
    const availability = await cdp.evaluate('DeixaDissoPromptAPI.checkAvailability()');
    console.log(`Status da Prompt API no Chrome: ${colors.bold}${availability?.status || 'desconhecido'}${colors.reset} (raw: ${availability?.raw})`);

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
      totalLatency += inference.durationMs;

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

    // Salva o resultado em arquivo JSON
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
    if (chromeHandle?.proc) {
      chromeHandle.proc.kill();
      try {
        fs.rmSync(chromeHandle.profileDir, { recursive: true, force: true });
      } catch (_) {}
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
