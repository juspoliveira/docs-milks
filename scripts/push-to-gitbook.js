#!/usr/bin/env node

/**
 * Script para atualizar conteúdo do GitBook a partir de arquivos locais
 * Usa a API do GitBook diretamente para enviar conteúdo Markdown para páginas
 * Estrutura baseada em sync-from-gitbook.js
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

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
const GITBOOK_API_TOKEN = envLocal.GITBOOK_API_TOKEN || process.env.GITBOOK_API_TOKEN;
const GITBOOK_SPACE_ID = envLocal.GITBOOK_SPACE_ID || process.env.GITBOOK_SPACE_ID;

const API_BASE_URL = "https://api.gitbook.com/v1";

// Diretórios
const CONTENT_DIR = join(projectRoot, "content");
const METADATA_DIR = join(projectRoot, "content-metadata");
const PAGES_JSON = join(METADATA_DIR, "pages.json");
const SYNC_LOG = join(METADATA_DIR, "sync-log.json");

// Função para fazer requisições à API do GitBook
async function gitbookApiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            "Authorization": `Bearer ${GITBOOK_API_TOKEN}`,
            "Content-Type": "application/json",
            "Accept": "*/*",
            ...options.headers
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ${response.status}: ${response.statusText}\n${errorText}`);
    }

    // Alguns endpoints retornam 204 No Content
    if (response.status === 204 || response.status === 205) {
        return null;
    }

    return await response.json();
}

// Calcular hash do conteúdo
function calculateHash(content) {
    return createHash('md5').update(content).digest('hex');
}

// Ler metadados existentes
function loadMetadata() {
    if (existsSync(PAGES_JSON)) {
        try {
            return JSON.parse(readFileSync(PAGES_JSON, 'utf-8'));
        } catch (e) {
            return { pages: [] };
        }
    }
    return { pages: [] };
}

// Salvar metadados
function saveMetadata(metadata) {
    writeFileSync(PAGES_JSON, JSON.stringify(metadata, null, 2), 'utf-8');
}

// Adicionar entrada ao log de sincronização
function addSyncLog(entry) {
    let log = [];
    if (existsSync(SYNC_LOG)) {
        try {
            log = JSON.parse(readFileSync(SYNC_LOG, 'utf-8'));
        } catch (e) {
            log = [];
        }
    }
    
    log.push({
        timestamp: new Date().toISOString(),
        ...entry
    });
    
    // Manter apenas últimas 100 entradas
    if (log.length > 100) {
        log = log.slice(-100);
    }
    
    writeFileSync(SYNC_LOG, JSON.stringify(log, null, 2), 'utf-8');
}

// Atualizar uma página no GitBook
async function updatePage(pagePath, pageId, metadata, dryRun = false) {
    const fileName = `${pagePath}.md`;
    const filePath = join(CONTENT_DIR, fileName);

    console.log(`\n📤 Atualizando: ${pagePath}`);
    console.log(`   ID: ${pageId}`);
    console.log(`   Arquivo: ${fileName}`);

    // Verificar se arquivo local existe
    if (!existsSync(filePath)) {
        throw new Error(`Arquivo local não encontrado: ${filePath}`);
    }

    // Ler conteúdo do arquivo local
    const localContent = readFileSync(filePath, 'utf-8');
    const contentHash = calculateHash(localContent);

    // Verificar se já existe nos metadados e se mudou
    const existingPage = metadata.pages.find(p => p.id === pageId);
    if (existingPage && existingPage.hash === contentHash) {
        console.log(`   ✅ Sem alterações (hash: ${contentHash.substring(0, 8)}...)`);
        return { ...existingPage, skipped: true };
    }

    if (dryRun) {
        console.log(`   🔍 [DRY RUN] Seria atualizado no GitBook`);
        console.log(`   📊 Tamanho: ${localContent.length} caracteres`);
        console.log(`   📝 Hash: ${contentHash}`);
        return { id: pageId, path: pagePath, file: fileName, hash: contentHash, dryRun: true };
    }

    try {
        // Usar abordagem correta da API do GitBook
        // Endpoint: /spaces/{SPACE_ID}/documents/{DOCUMENT_ID}
        // Body: { title: "...", content: { markdown: "..." } }
        const pageTitle = existingPage?.title || pagePath;
        
        const endpoint = `/spaces/${GITBOOK_SPACE_ID}/documents/${pageId}`;
        const response = await gitbookApiRequest(endpoint, {
            method: 'PATCH',
            body: JSON.stringify({
                title: pageTitle,
                content: {
                    markdown: localContent
                }
            })
        });
        
        console.log(`   ✅ Atualizado com sucesso (PATCH)`);
        const success = true;

        // Atualizar metadados
        const pageMetadata = {
            id: pageId,
            title: existingPage?.title || pagePath,
            path: pagePath,
            file: `content/${fileName}`,
            hash: contentHash,
            lastSynced: new Date().toISOString()
        };

        const index = metadata.pages.findIndex(p => p.id === pageId);
        if (index >= 0) {
            metadata.pages[index] = pageMetadata;
        } else {
            metadata.pages.push(pageMetadata);
        }

        return pageMetadata;

    } catch (error) {
        console.error(`   ❌ Erro ao atualizar: ${error.message}`);
        return { id: pageId, path: pagePath, error: error.message };
    }
}

// Função principal
async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const pagePathArg = args.includes('--page') ? args[args.indexOf('--page') + 1] : null;
    const pageIdArg = args.includes('--page-id') ? args[args.indexOf('--page-id') + 1] : null;

    console.log("🚀 Atualização de Conteúdo para GitBook\n");

    if (!GITBOOK_API_TOKEN || !GITBOOK_SPACE_ID) {
        console.error("❌ GITBOOK_API_TOKEN ou GITBOOK_SPACE_ID não configurados!");
        console.log("💡 Configure o arquivo .env.local com suas credenciais");
        process.exit(1);
    }

    if (dryRun) {
        console.log("🔍 Modo DRY RUN - nenhuma atualização será feita no GitBook\n");
    }

    if (!pagePathArg && !pageIdArg) {
        console.error("❌ Especifique --page <path> ou --page-id <id>");
        console.log("\nExemplos:");
        console.log("  node scripts/push-to-gitbook.js --page configuracoes");
        console.log("  node scripts/push-to-gitbook.js --page-id 4qvdPd91MFxH0S2f5Sep");
        console.log("  node scripts/push-to-gitbook.js --page configuracoes --dry-run");
        process.exit(1);
    }

    try {
        // Carregar metadados existentes
        const metadata = loadMetadata();

        let pageId = pageIdArg;
        let pagePath = pagePathArg;

        // Se forneceu apenas path, buscar ID nos metadados
        if (pagePath && !pageId) {
            const page = metadata.pages.find(p => p.path === pagePath);
            if (!page) {
                console.error(`❌ Página '${pagePath}' não encontrada nos metadados!`);
                console.log("💡 Execute primeiro: node scripts/sync-from-gitbook.js --all");
                process.exit(1);
            }
            pageId = page.id;
            console.log(`📋 Página encontrada nos metadados: ID=${pageId}`);
        }

        // Se forneceu apenas ID, buscar path nos metadados
        if (pageId && !pagePath) {
            const page = metadata.pages.find(p => p.id === pageId);
            if (!page) {
                console.error(`❌ Página com ID '${pageId}' não encontrada nos metadados!`);
                console.log("💡 Execute primeiro: node scripts/sync-from-gitbook.js --all");
                process.exit(1);
            }
            pagePath = page.path;
            console.log(`📋 Página encontrada nos metadados: Path=${pagePath}`);
        }

        // Atualizar página
        const result = await updatePage(pagePath, pageId, metadata, dryRun);

        if (result.error) {
            console.error(`\n❌ Erro ao atualizar página: ${result.error}`);
            process.exit(1);
        }

        if (result.skipped) {
            console.log(`\n✅ Página não precisa ser atualizada (sem alterações)`);
        } else if (result.dryRun) {
            console.log(`\n🔍 Modo DRY RUN - Execute sem --dry-run para atualizar no GitBook`);
        } else {
            // Salvar metadados
            saveMetadata(metadata);
            
            // Adicionar ao log
            addSyncLog({
                type: 'push',
                pagePath: pagePath,
                pageId: pageId,
                success: true
            });

            console.log(`\n✅ Página atualizada com sucesso!`);
            console.log(`📄 Metadados atualizados em: content-metadata/pages.json`);
            console.log(`📝 Log registrado em: content-metadata/sync-log.json`);
        }

    } catch (error) {
        console.error("\n❌ Erro durante atualização:");
        console.error(error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

main().catch(error => {
    console.error("\n❌ Erro não capturado:");
    console.error(error.message);
    if (error.stack) {
        console.error(error.stack);
    }
    process.exit(1);
});

