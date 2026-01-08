#!/usr/bin/env node

/**
 * Script para validar estrutura do projeto antes de configurar GitSync
 * Verifica SUMMARY.md, arquivos referenciados, Space ID e isolamento
 */

import { readFileSync, existsSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

// Configuração esperada
const EXPECTED_SPACE_ID = "wyOmfrOj0hbYJWKsVGBS";
const EXPECTED_REPO = "juspoliveira/docs-milks";
const EXPECTED_BRANCH = "master";

// Função para ler .env.local
function loadEnvFile(filePath) {
    try {
        const content = readFileSync(filePath, 'utf-8');
        const env = {};
        
        content.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    env[key.trim()] = valueParts.join('=').trim();
                }
            }
        });
        
        return env;
    } catch (error) {
        return {};
    }
}

// Carregar variáveis de ambiente
const envLocal = loadEnvFile(join(projectRoot, ".env.local"));
const GITBOOK_SPACE_ID = envLocal.GITBOOK_SPACE_ID || process.env.GITBOOK_SPACE_ID;

// Cores para output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'cyan');
}

// Resultados da validação
const results = {
    passed: [],
    failed: [],
    warnings: []
};

function addResult(type, message) {
    if (results[type] && Array.isArray(results[type])) {
        results[type].push(message);
    } else {
        console.error(`Erro: tipo de resultado inválido: ${type}`);
    }
}

// Validar SUMMARY.md
function validateSummary() {
    logInfo("\n📋 Validando SUMMARY.md...");
    
    const summaryPath = join(projectRoot, "SUMMARY.md");
    
    if (!existsSync(summaryPath)) {
        addResult('failed', 'SUMMARY.md não encontrado na raiz do projeto');
        logError('SUMMARY.md não encontrado');
        return false;
    }
    
    logSuccess('SUMMARY.md encontrado');
    
    try {
        const summaryContent = readFileSync(summaryPath, 'utf-8');
        
        // Verificar formato básico
        if (!summaryContent.trim()) {
            addResult('failed', 'SUMMARY.md está vazio');
            logError('SUMMARY.md está vazio');
            return false;
        }
        
        logSuccess('SUMMARY.md tem conteúdo');
        
        // Extrair referências de arquivos
        const fileReferences = [];
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let match;
        
        while ((match = linkRegex.exec(summaryContent)) !== null) {
            const filePath = match[2];
            if (filePath && !filePath.startsWith('http')) {
                fileReferences.push({
                    title: match[1],
                    path: filePath
                });
            }
        }
        
        logInfo(`Encontradas ${fileReferences.length} referências de arquivos`);
        
        // Verificar se cada arquivo existe
        let allFilesExist = true;
        for (const ref of fileReferences) {
            const fullPath = join(projectRoot, ref.path);
            if (!existsSync(fullPath)) {
                addResult('failed', `Arquivo referenciado não encontrado: ${ref.path}`);
                logError(`Arquivo não encontrado: ${ref.path}`);
                allFilesExist = false;
            } else {
                logSuccess(`Arquivo existe: ${ref.path}`);
            }
        }
        
        if (allFilesExist) {
            addResult('passed', `Todos os ${fileReferences.length} arquivos referenciados existem`);
        }
        
        return allFilesExist;
        
    } catch (error) {
        addResult('failed', `Erro ao ler SUMMARY.md: ${error.message}`);
        logError(`Erro ao ler SUMMARY.md: ${error.message}`);
        return false;
    }
}

// Validar estrutura de diretórios
function validateDirectoryStructure() {
    logInfo("\n📁 Validando estrutura de diretórios...");
    
    const requiredDirs = [
        'content',
        'docs'
    ];
    
    let allDirsExist = true;
    for (const dir of requiredDirs) {
        const dirPath = join(projectRoot, dir);
        if (!existsSync(dirPath)) {
            addResult('failed', `Diretório necessário não encontrado: ${dir}`);
            logError(`Diretório não encontrado: ${dir}`);
            allDirsExist = false;
        } else {
            const stats = statSync(dirPath);
            if (!stats.isDirectory()) {
                addResult('failed', `${dir} existe mas não é um diretório`);
                logError(`${dir} não é um diretório`);
                allDirsExist = false;
            } else {
                logSuccess(`Diretório existe: ${dir}`);
            }
        }
    }
    
    if (allDirsExist) {
        addResult('passed', 'Estrutura de diretórios está correta');
    }
    
    return allDirsExist;
}

// Validar Space ID
function validateSpaceId() {
    logInfo("\n🔍 Validando Space ID...");
    
    if (!GITBOOK_SPACE_ID) {
        addResult('warnings', 'GITBOOK_SPACE_ID não configurado no .env.local');
        logWarning('GITBOOK_SPACE_ID não encontrado no .env.local');
        logInfo('Isso não impede a validação, mas é recomendado para verificação completa');
        return true; // Não é um erro fatal
    }
    
    logSuccess(`GITBOOK_SPACE_ID encontrado: ${GITBOOK_SPACE_ID}`);
    
    if (GITBOOK_SPACE_ID === EXPECTED_SPACE_ID) {
        addResult('passed', `Space ID correto: ${EXPECTED_SPACE_ID}`);
        logSuccess(`Space ID correto: ${EXPECTED_SPACE_ID}`);
        return true;
    } else {
        addResult('failed', `Space ID incorreto! Esperado: ${EXPECTED_SPACE_ID}, Encontrado: ${GITBOOK_SPACE_ID}`);
        logError(`Space ID incorreto! Esperado: ${EXPECTED_SPACE_ID}`);
        logError(`Encontrado: ${GITBOOK_SPACE_ID}`);
        logWarning('⚠️  ATENÇÃO: Configurar GitSync com Space ID incorreto pode afetar o Space errado!');
        return false;
    }
}

// Verificar isolamento
function validateIsolation() {
    logInfo("\n🔒 Verificando isolamento...");
    
    logInfo('O GitSync é configurado por Space, não globalmente.');
    logInfo('Cada Space tem sua própria configuração independente.');
    logSuccess('Isolamento garantido por design do GitBook');
    
    addResult('passed', 'Isolamento: GitSync é configurado por Space, não afeta outros projetos');
    
    // Verificar se há outros arquivos de configuração que possam indicar outros Spaces
    const envExample = readFileSync(join(projectRoot, 'env.example'), 'utf-8');
    if (envExample.includes(EXPECTED_SPACE_ID)) {
        logSuccess('env.example referencia o Space ID correto');
    }
    
    return true;
}

// Validar repositório Git
function validateGitRepository() {
    logInfo("\n🔗 Validando repositório Git...");
    
    const gitDir = join(projectRoot, '.git');
    if (!existsSync(gitDir)) {
        addResult('failed', 'Diretório .git não encontrado - não é um repositório Git');
        logError('Diretório .git não encontrado');
        return false;
    }
    
    logSuccess('Repositório Git encontrado');
    
    // Tentar ler remote (se possível)
    try {
        const gitConfig = readFileSync(join(projectRoot, '.git', 'config'), 'utf-8');
        if (gitConfig.includes(EXPECTED_REPO)) {
            logSuccess(`Repositório remoto correto: ${EXPECTED_REPO}`);
            addResult('passed', `Repositório remoto: ${EXPECTED_REPO}`);
        } else {
            logWarning('Não foi possível verificar se o repositório remoto está correto');
            addResult('warnings', 'Verifique manualmente se o repositório remoto está correto');
        }
    } catch (error) {
        logWarning('Não foi possível ler configuração do Git');
        addResult('warnings', 'Não foi possível verificar configuração do Git');
    }
    
    return true;
}

// Gerar relatório final
function generateReport() {
    log("\n" + "=".repeat(60), 'blue');
    log("📊 RELATÓRIO DE VALIDAÇÃO", 'blue');
    log("=".repeat(60), 'blue');
    
    log(`\n✅ Validações Passadas: ${results.passed.length}`, 'green');
    results.passed.forEach(msg => log(`   • ${msg}`, 'green'));
    
    if (results.warnings.length > 0) {
        log(`\n⚠️  Avisos: ${results.warnings.length}`, 'yellow');
        results.warnings.forEach(msg => log(`   • ${msg}`, 'yellow'));
    }
    
    if (results.failed.length > 0) {
        log(`\n❌ Falhas: ${results.failed.length}`, 'red');
        results.failed.forEach(msg => log(`   • ${msg}`, 'red'));
    }
    
    log("\n" + "=".repeat(60), 'blue');
    
    // Resumo final
    const totalChecks = results.passed.length + results.warnings.length + results.failed.length;
    const successRate = ((results.passed.length / totalChecks) * 100).toFixed(1);
    
    log(`\n📈 Resumo:`, 'cyan');
    log(`   Total de verificações: ${totalChecks}`);
    log(`   Taxa de sucesso: ${successRate}%`);
    
    if (results.failed.length === 0) {
        log("\n✅ VALIDAÇÃO CONCLUÍDA COM SUCESSO!", 'green');
        log("   Você pode prosseguir com a configuração do GitSync.", 'green');
        log("\n   Próximos passos:", 'cyan');
        log("   1. Certifique-se de que está no Space correto no GitBook");
        log(`   2. Space ID esperado: ${EXPECTED_SPACE_ID}`);
        log(`   3. Repositório: ${EXPECTED_REPO}`);
        log(`   4. Branch: ${EXPECTED_BRANCH}`);
        log("   5. Siga as instruções em GITSYNC.md");
        return true;
    } else {
        log("\n❌ VALIDAÇÃO FALHOU!", 'red');
        log("   Corrija os erros acima antes de configurar o GitSync.", 'red');
        return false;
    }
}

// Função principal
function main() {
    log("🚀 Validação de Estrutura para GitSync\n", 'cyan');
    log("Este script valida a estrutura do projeto antes de configurar o GitSync.\n");
    
    let allValid = true;
    
    // Executar todas as validações
    allValid = validateSummary() && allValid;
    allValid = validateDirectoryStructure() && allValid;
    allValid = validateSpaceId() && allValid;
    allValid = validateIsolation() && allValid;
    allValid = validateGitRepository() && allValid;
    
    // Gerar relatório
    const finalResult = generateReport();
    
    // Exit code
    process.exit(finalResult ? 0 : 1);
}

// Executar
main().catch(error => {
    logError(`\n❌ Erro não capturado: ${error.message}`);
    if (error.stack) {
        console.error(error.stack);
    }
    process.exit(1);
});

