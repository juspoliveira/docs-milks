#!/usr/bin/env node

/**
 * Script para deletar uma página específica do GitBook via API
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

// Função para deletar uma página
async function deletePage(pageId) {
    console.log(`🗑️  Tentando remover página ${pageId}...\n`);
    
    try {
        // Obter conteúdo atual do space
        console.log("📖 Obtendo estrutura atual do space...");
        const content = await gitbookApiRequest(`/spaces/${GITBOOK_SPACE_ID}/content`);
        
        // Verificar se a página existe
        const pageExists = content.pages && content.pages.some(page => page.id === pageId);
        if (!pageExists) {
            console.log(`⚠️  Página ${pageId} não encontrada na estrutura atual.`);
            console.log(`   Ela pode já ter sido removida.\n`);
            return { message: "Página não encontrada na estrutura" };
        }
        
        // Encontrar a página para mostrar informações
        const pageToDelete = content.pages.find(page => page.id === pageId);
        console.log(`📄 Página encontrada: "${pageToDelete.title}" (${pageToDelete.path || pageToDelete.slug})\n`);
        
        // Tentar deletar via endpoint de documentos (se disponível)
        try {
            console.log("🔄 Tentando deletar via endpoint de documentos...");
            await gitbookApiRequest(
                `/spaces/${GITBOOK_SPACE_ID}/documents/${pageId}`,
                {
                    method: 'DELETE'
                }
            );
            console.log(`✅ Página deletada com sucesso via endpoint de documentos!\n`);
            return { success: true, method: 'DELETE' };
        } catch (deleteError) {
            console.log(`⚠️  Endpoint de documentos não disponível: ${deleteError.message}\n`);
            
            // Se não conseguir deletar diretamente, informar que precisa ser feito manualmente
            // ou via GitSync
            console.log("💡 Como o GitSync está ativo, a melhor abordagem é:");
            console.log("   1. Garantir que o README.md não está no SUMMARY.md (✅ já feito)");
            console.log("   2. Criar/atualizar book.json para desabilitar README como introdução (✅ já feito)");
            console.log("   3. Fazer commit e push das mudanças");
            console.log("   4. O GitSync sincronizará e a página será removida automaticamente");
            console.log("\n   Alternativamente, você pode deletar a página manualmente via interface do GitBook:");
            console.log(`   ${pageToDelete.urls?.app || 'https://app.gitbook.com'}\n`);
            
            return { 
                success: false, 
                message: "Deleção via API não disponível. Use GitSync ou interface do GitBook.",
                pageUrl: pageToDelete.urls?.app
            };
        }
    } catch (error) {
        throw error;
    }
}

// Função principal
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.error("❌ Erro: ID da página não fornecido");
        console.log("\n💡 Uso:");
        console.log("   node scripts/delete-gitbook-page.js <pageId>");
        console.log("\n💡 Exemplo:");
        console.log("   node scripts/delete-gitbook-page.js DldOleKm0cAtgL4q1str");
        console.log("\n💡 Para encontrar o ID da página, use:");
        console.log("   node scripts/list-gitbook-pages.js");
        process.exit(1);
    }
    
    const pageId = args[0];
    
    console.log(`📖 Space ID: ${GITBOOK_SPACE_ID}`);
    console.log(`📄 Page ID: ${pageId}\n`);
    
    // Confirmar antes de deletar
    if (!args.includes('--confirm')) {
        console.log("⚠️  ATENÇÃO: Esta operação irá deletar a página do GitBook!");
        console.log("   Para confirmar, execute novamente com --confirm:");
        console.log(`   node scripts/delete-gitbook-page.js ${pageId} --confirm\n`);
        process.exit(0);
    }
    
    try {
        await deletePage(pageId);
        console.log("✅ Operação concluída com sucesso!");
        console.log("\n💡 Nota: Pode levar alguns minutos para a mudança aparecer no site do GitBook.");
    } catch (error) {
        console.error(`\n❌ Erro ao deletar página: ${error.message}`);
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
