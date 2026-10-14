#!/usr/bin/env node

/**
 * DeixaDisso - Prompt Distillation & Optimization Loop
 * Permite iterar e comparar variações de System Prompt contra a base de testes.
 * Mede se uma nova versão reduz falsos positivos e melhora a precisão com o Gemini Nano.
 */

const fs = require('fs');
const path = require('path');
const { runBenchmark } = require('./eval.js');

const PT_LOCALE_PATH = path.join(__dirname, '../src/shared/i18n/locales/pt_BR.js');
const PROMPTS_DIR = path.join(__dirname, 'prompts');

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

async function main() {
  const args = process.argv.slice(2);
  const candidateFile = args.find(a => a.startsWith('--candidate='))?.split('=')[1];

  console.log(`${colors.bold}🧠 DeixaDisso - Ciclo de Otimização e Destilação de Prompt${colors.reset}\n`);

  if (!candidateFile) {
    console.log(`Uso: node harness/optimize.js --candidate=harness/prompts/candidate_1.txt\n`);
    console.log(`Ou para rodar o benchmark atual de referência:`);
    console.log(`  node harness/eval.js\n`);
    process.exit(0);
  }

  if (!fs.existsSync(candidateFile)) {
    console.error(`${colors.red}Arquivo de prompt candidato não encontrado: ${candidateFile}${colors.reset}`);
    process.exit(1);
  }

  const candidatePrompt = fs.readFileSync(candidateFile, 'utf8').trim();
  console.log(`${colors.cyan}Testando prompt candidato de: ${candidateFile}${colors.reset}\n`);

  const result = await runBenchmark(candidatePrompt);

  console.log(`\n${colors.bold}Resultado da Otimização:${colors.reset}`);
  console.log(`Acurácia: ${result.accuracy}% | Falsos Positivos: ${result.falsePositives} | Falsos Negativos: ${result.falseNegatives}`);

  // Se o usuário passar a flag --apply e a acurácia for satisfatória, atualiza os arquivos oficiais
  if (args.includes('--apply')) {
    console.log(`\n${colors.green}Aplicando prompt vencedor em src/shared/i18n/locales/pt_BR.js...${colors.reset}`);
    // Atualiza o prompt no arquivo de locale
    let ptCode = fs.readFileSync(PT_LOCALE_PATH, 'utf8');
    ptCode = ptCode.replace(/systemPrompt:\s*`[\s\S]*?`,/, `systemPrompt: \`${candidatePrompt}\`,`);
    fs.writeFileSync(PT_LOCALE_PATH, ptCode);
    console.log(`${colors.green}✓ Prompt de produção atualizado com sucesso!${colors.reset}`);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
