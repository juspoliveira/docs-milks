#!/usr/bin/env node

/**
 * Script para sincronizar conteúdo do GitBook para arquivos locais
 * Usa a API do GitBook diretamente para ler páginas e salvar em Markdown
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
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

// Criar diretórios se não existirem
if (!existsSync(CONTENT_DIR)) {
    mkdirSync(CONTENT_DIR, { recursive: true });
}
if (!existsSync(METADATA_DIR)) {
    mkdirSync(METADATA_DIR, { recursive: true });
}

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

// Obter estrutura do space
async function getSpaceContent() {
    console.log("📋 Obtendo estrutura do space...");
    const content = await gitbookApiRequest(`/spaces/${GITBOOK_SPACE_ID}/content`);
    return content;
}

// Obter conteúdo de uma página por path
async function getPageByPath(pagePath, format = "markdown") {
    const encodedPath = encodeURIComponent(pagePath);
    const endpoint = `/spaces/${GITBOOK_SPACE_ID}/content/page/${encodedPath}?format=${format}`;
    return await gitbookApiRequest(endpoint);
}

// Obter conteúdo de uma página por ID
async function getPageById(pageId, format = "markdown") {
    const endpoint = `/spaces/${GITBOOK_SPACE_ID}/content/page/${pageId}?format=${format}`;
    return await gitbookApiRequest(endpoint);
}

// Sincronizar uma página
async function syncPage(page, metadata, dryRun = false) {
    const { id, title, path, slug } = page;
    const pagePath = path || slug;
    const fileName = `${pagePath}.md`;
    const filePath = join(CONTENT_DIR, fileName);

    console.log(`\n📄 Sincronizando: ${title}`);
    console.log(`   Path: ${pagePath}`);
    console.log(`   ID: ${id}`);

    try {
        // Tentar obter por path primeiro, depois por ID
        let pageContent;
        try {
            pageContent = await getPageByPath(pagePath, "markdown");
        } catch (e) {
            console.log(`   ⚠️  Erro ao obter por path, tentando por ID...`);
            pageContent = await getPageById(id, "markdown");
        }

        const content = pageContent.content || pageContent.markdown || JSON.stringify(pageContent, null, 2);
        const contentHash = calculateHash(content);

        // Verificar se já existe e se mudou
        const existingPage = metadata.pages.find(p => p.id === id);
        if (existingPage && existingPage.hash === contentHash) {
            console.log(`   ✅ Sem alterações (hash: ${contentHash.substring(0, 8)}...)`);
            return { ...existingPage, skipped: true };
        }

        if (dryRun) {
            console.log(`   🔍 [DRY RUN] Seria salvo em: ${fileName}`);
            console.log(`   📊 Tamanho: ${content.length} caracteres`);
            return { id, title, path: pagePath, file: fileName, hash: contentHash, dryRun: true };
        }

        // Salvar arquivo
        writeFileSync(filePath, content, 'utf-8');
        console.log(`   ✅ Salvo em: ${fileName} (${content.length} caracteres)`);

        // Atualizar metadados
        const pageMetadata = {
            id,
            title,
            path: pagePath,
            file: `content/${fileName}`,
            hash: contentHash,
            lastSynced: new Date().toISOString()
        };

        const index = metadata.pages.findIndex(p => p.id === id);
        if (index >= 0) {
            metadata.pages[index] = pageMetadata;
        } else {
            metadata.pages.push(pageMetadata);
        }

        return pageMetadata;

    } catch (error) {
        console.error(`   ❌ Erro ao sincronizar: ${error.message}`);
        return { id, title, path: pagePath, error: error.message };
    }
}

// Função principal
async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const allPages = args.includes('--all') || !args.includes('--page');
    const specificPage = args.includes('--page') ? args[args.indexOf('--page') + 1] : null;

    console.log("🚀 Sincronização de Conteúdo do GitBook\n");

    if (!GITBOOK_API_TOKEN || !GITBOOK_SPACE_ID) {
        console.error("❌ GITBOOK_API_TOKEN ou GITBOOK_SPACE_ID não configurados!");
        console.log("💡 Configure o arquivo .env.local com suas credenciais");
        process.exit(1);
    }

    if (dryRun) {
        console.log("🔍 Modo DRY RUN - nenhum arquivo será salvo\n");
    }

    try {
        // Carregar metadados existentes
        const metadata = loadMetadata();

        if (specificPage) {
            // Sincronizar página específica
            console.log(`📄 Sincronizando página específica: ${specificPage}\n`);
            
            const pageContent = await getPageByPath(specificPage, "markdown");
            const page = {
                id: pageContent.id || 'unknown',
                title: pageContent.title || specificPage,
                path: specificPage,
                slug: specificPage
            };
            
            await syncPage(page, metadata, dryRun);
        } else {
            // Obter estrutura completa do space
            const spaceContent = await getSpaceContent();
            const pages = spaceContent.pages || [];

            console.log(`\n✅ Encontradas ${pages.length} página(s) no space\n`);

            if (pages.length === 0) {
                console.log("⚠️  Nenhuma página encontrada!");
                process.exit(0);
            }

            // Sincronizar todas as páginas
            const results = [];
            for (const page of pages) {
                const result = await syncPage(page, metadata, dryRun);
                results.push(result);
                
                // Pequeno delay para não sobrecarregar a API
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Salvar metadados
            if (!dryRun) {
                saveMetadata(metadata);
                
                // Adicionar ao log
                addSyncLog({
                    type: 'full_sync',
                    pagesCount: pages.length,
                    successful: results.filter(r => !r.error && !r.skipped).length,
                    skipped: results.filter(r => r.skipped).length,
                    errors: results.filter(r => r.error).length
                });
            }

            // Resumo
            console.log("\n" + "=".repeat(60));
            console.log("📊 Resumo da Sincronização");
            console.log("=".repeat(60));
            console.log(`Total de páginas: ${pages.length}`);
            console.log(`Sincronizadas: ${results.filter(r => !r.error && !r.skipped && !r.dryRun).length}`);
            console.log(`Sem alterações: ${results.filter(r => r.skipped).length}`);
            console.log(`Erros: ${results.filter(r => r.error).length}`);
            
            if (dryRun) {
                console.log(`\n🔍 Modo DRY RUN - Execute sem --dry-run para salvar os arquivos`);
            } else {
                console.log(`\n✅ Metadados salvos em: content-metadata/pages.json`);
            }
        }

    } catch (error) {
        console.error("\n❌ Erro durante sincronização:");
        console.error(error.message);
        process.exit(1);
    }
}

main();

