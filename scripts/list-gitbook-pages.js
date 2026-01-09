#!/usr/bin/env node

/**
 * Script para listar todas as páginas do GitBook e identificar páginas relacionadas a README
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

// Função para ler .env.local
function loadEnvFile(filePath) {
    try {
        if (!existsSync(filePath)) {
            return {};
        }
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

if (!GITBOOK_API_TOKEN) {
    console.error("❌ Erro: GITBOOK_API_TOKEN não encontrado");
    console.log("   Configure no arquivo .env.local");
    process.exit(1);
}

if (!GITBOOK_SPACE_ID) {
    console.error("❌ Erro: GITBOOK_SPACE_ID não encontrado");
    console.log("   Configure no arquivo .env.local");
    process.exit(1);
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

// Função para obter estrutura completa do space
async function getSpaceContent() {
    console.log(`📖 Obtendo estrutura do space ${GITBOOK_SPACE_ID}...\n`);
    
    try {
        const content = await gitbookApiRequest(`/spaces/${GITBOOK_SPACE_ID}/content`);
        console.log("📋 Estrutura recebida:", JSON.stringify(content, null, 2).substring(0, 500));
        return content;
    } catch (error) {
        console.error(`❌ Erro ao obter conteúdo do space: ${error.message}`);
        throw error;
    }
}

// Função alternativa para listar documentos diretamente
async function listDocuments() {
    console.log(`📖 Listando documentos do space ${GITBOOK_SPACE_ID}...\n`);
    
    try {
        // Tentar endpoint de documentos
        const documents = await gitbookApiRequest(`/spaces/${GITBOOK_SPACE_ID}/documents`);
        return documents;
    } catch (error) {
        console.log(`⚠️  Endpoint de documentos não disponível: ${error.message}`);
        return null;
    }
}

// Função recursiva para encontrar todas as páginas
function findAllPages(node, pages = []) {
    // Se o node tem um array de pages diretamente
    if (node.pages && Array.isArray(node.pages)) {
        node.pages.forEach(page => {
            pages.push({
                id: page.id,
                title: page.title,
                path: page.path || page.slug,
                slug: page.slug,
                url: page.urls?.app || page.url,
                type: page.type,
                kind: page.kind
            });
        });
    }
    
    // Processar estrutura antiga (com type e children)
    if (node.type === 'page') {
        pages.push({
            id: node.id,
            title: node.title,
            path: node.path,
            url: node.url
        });
    }
    
    if (node.children) {
        node.children.forEach(child => {
            findAllPages(child, pages);
        });
    }
    
    return pages;
}

// Função principal
async function main() {
    try {
        // Tentar obter conteúdo do space
        const content = await getSpaceContent();
        
        // Encontrar todas as páginas na estrutura
        let allPages = [];
        if (content) {
            allPages = findAllPages(content);
        }
        
        // Tentar listar documentos diretamente
        const documents = await listDocuments();
        if (documents && documents.items) {
            console.log(`📄 Documentos encontrados via API de documentos: ${documents.items.length}\n`);
            documents.items.forEach(doc => {
                allPages.push({
                    id: doc.id,
                    title: doc.title || doc.path || 'Sem título',
                    path: doc.path || doc.id,
                    url: doc.url || null
                });
            });
        }
        
        console.log(`📊 Total de páginas encontradas: ${allPages.length}\n`);
        
        // Procurar por páginas relacionadas a README
        const readmePages = allPages.filter(page => 
            page.title.toLowerCase().includes('readme') ||
            page.title.toLowerCase().includes('introdução') ||
            page.title.toLowerCase().includes('introducao') ||
            page.path === 'README' ||
            page.path === 'readme' ||
            page.path === 'README.md' ||
            page.path === 'readme.md' ||
            page.path === '' ||
            page.path === '/'
        );
        
        if (readmePages.length > 0) {
            console.log("⚠️  Páginas relacionadas a README encontradas:\n");
            readmePages.forEach(page => {
                console.log(`   📄 ${page.title}`);
                console.log(`      ID: ${page.id}`);
                console.log(`      Path: ${page.path || '(raiz)'}`);
                console.log(`      URL: ${page.url || 'N/A'}`);
                console.log("");
            });
        } else {
            console.log("✅ Nenhuma página README encontrada no GitBook\n");
        }
        
        // Listar todas as páginas
        if (allPages.length > 0) {
            console.log("📋 Todas as páginas do space:\n");
            allPages.forEach((page, index) => {
                console.log(`${index + 1}. ${page.title} (${page.path || page.id})`);
            });
        }
        
        return { allPages, readmePages };
        
    } catch (error) {
        console.error(`\n❌ Erro: ${error.message}`);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// Executar
main().catch(error => {
    console.error(`\n❌ Erro fatal: ${error.message}`);
    process.exit(1);
});
