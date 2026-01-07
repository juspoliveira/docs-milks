#!/usr/bin/env node

/**
 * Script para gerenciar Site MCP Servers no GitBook
 * Baseado na documentação: https://gitbook.com/docs/developers/gitbook-api/api-reference/docs-sites/site-mcp-servers
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

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
const env = loadEnvFile(join(projectRoot, ".env"));

const GITBOOK_API_TOKEN = envLocal.GITBOOK_API_TOKEN || env.GITBOOK_API_TOKEN || process.env.GITBOOK_API_TOKEN;
const GITBOOK_ORGANIZATION_ID = envLocal.GITBOOK_ORGANIZATION_ID || env.GITBOOK_ORGANIZATION_ID || process.env.GITBOOK_ORGANIZATION_ID;
const GITBOOK_SITE_ID = envLocal.GITBOOK_SITE_ID || env.GITBOOK_SITE_ID || process.env.GITBOOK_SITE_ID;

const API_BASE_URL = "https://api.gitbook.com/v1";

// Função para fazer requisições à API
async function gitbookApiRequest(method, endpoint, body = null) {
    if (!GITBOOK_API_TOKEN) {
        throw new Error("GITBOOK_API_TOKEN não configurado no .env.local");
    }

    const url = `${API_BASE_URL}${endpoint}`;
    const options = {
        method,
        headers: {
            "Authorization": `Bearer ${GITBOOK_API_TOKEN}`,
            "Content-Type": "application/json",
            "Accept": "*/*"
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ${response.status}: ${response.statusText}\n${errorText}`);
    }

    if (response.status === 204 || response.status === 205) {
        return null; // No content
    }

    return await response.json();
}

// Listar todos os MCP servers de um site
async function listMcpServers(organizationId, siteId) {
    console.log(`\n📋 Listando MCP servers do site ${siteId}...`);
    const result = await gitbookApiRequest(
        "GET",
        `/orgs/${organizationId}/sites/${siteId}/mcp-servers`
    );
    
    console.log(`✅ Encontrados ${result.count || 0} servidor(es) MCP:\n`);
    
    if (result.items && result.items.length > 0) {
        result.items.forEach((server, index) => {
            console.log(`${index + 1}. ${server.name} (ID: ${server.id})`);
            console.log(`   URL: ${server.url}`);
            console.log(`   Headers: ${JSON.stringify(server.headers)}`);
            console.log(`   Location: ${server.urls?.location || 'N/A'}\n`);
        });
    } else {
        console.log("   Nenhum servidor MCP configurado.\n");
    }
    
    return result;
}

// Criar um novo MCP server
async function createMcpServer(organizationId, siteId, name, url, headers) {
    console.log(`\n➕ Criando novo MCP server "${name}"...`);
    
    const body = {
        name,
        url,
        headers
    };
    
    const result = await gitbookApiRequest(
        "POST",
        `/orgs/${organizationId}/sites/${siteId}/mcp-servers`,
        body
    );
    
    console.log(`✅ Servidor MCP criado com sucesso!`);
    console.log(`   ID: ${result.id}`);
    console.log(`   Nome: ${result.name}`);
    console.log(`   URL: ${result.url}\n`);
    
    return result;
}

// Obter detalhes de um MCP server
async function getMcpServer(organizationId, siteId, serverId) {
    console.log(`\n🔍 Obtendo detalhes do servidor MCP ${serverId}...`);
    
    const result = await gitbookApiRequest(
        "GET",
        `/orgs/${organizationId}/sites/${siteId}/mcp-servers/${serverId}`
    );
    
    console.log(`✅ Detalhes do servidor MCP:`);
    console.log(`   Nome: ${result.name}`);
    console.log(`   URL: ${result.url}`);
    console.log(`   Headers: ${JSON.stringify(result.headers, null, 2)}`);
    console.log(`   Location: ${result.urls?.location || 'N/A'}\n`);
    
    return result;
}

// Atualizar um MCP server
async function updateMcpServer(organizationId, siteId, serverId, updates) {
    console.log(`\n✏️  Atualizando servidor MCP ${serverId}...`);
    
    const body = {};
    if (updates.name) body.name = updates.name;
    if (updates.url) body.url = updates.url;
    if (updates.headers) body.headers = updates.headers;
    
    const result = await gitbookApiRequest(
        "PATCH",
        `/orgs/${organizationId}/sites/${siteId}/mcp-servers/${serverId}`,
        body
    );
    
    console.log(`✅ Servidor MCP atualizado com sucesso!\n`);
    
    return result;
}

// Deletar um MCP server
async function deleteMcpServer(organizationId, siteId, serverId) {
    console.log(`\n🗑️  Deletando servidor MCP ${serverId}...`);
    
    await gitbookApiRequest(
        "DELETE",
        `/orgs/${organizationId}/sites/${siteId}/mcp-servers/${serverId}`
    );
    
    console.log(`✅ Servidor MCP deletado com sucesso!\n`);
}

// Função principal
async function main() {
    const command = process.argv[2];
    
    console.log("🔧 Gerenciador de Site MCP Servers do GitBook\n");
    
    if (!GITBOOK_API_TOKEN) {
        console.error("❌ GITBOOK_API_TOKEN não encontrado!");
        console.log("💡 Configure o arquivo .env.local com suas credenciais");
        process.exit(1);
    }
    
    if (!GITBOOK_ORGANIZATION_ID || !GITBOOK_SITE_ID) {
        console.error("❌ GITBOOK_ORGANIZATION_ID ou GITBOOK_SITE_ID não configurados!");
        console.log("💡 Adicione ao .env.local:");
        console.log("   GITBOOK_ORGANIZATION_ID=seu_org_id");
        console.log("   GITBOOK_SITE_ID=seu_site_id");
        process.exit(1);
    }
    
    try {
        switch (command) {
            case "list":
                await listMcpServers(GITBOOK_ORGANIZATION_ID, GITBOOK_SITE_ID);
                break;
                
            case "create":
                const name = process.argv[3];
                const url = process.argv[4];
                const headersJson = process.argv[5] || "{}";
                
                if (!name || !url) {
                    console.error("❌ Uso: node manage-site-mcp.js create <nome> <url> [headers_json]");
                    process.exit(1);
                }
                
                let headers = {};
                try {
                    headers = JSON.parse(headersJson);
                } catch (e) {
                    console.error("❌ Headers devem ser um JSON válido");
                    process.exit(1);
                }
                
                await createMcpServer(GITBOOK_ORGANIZATION_ID, GITBOOK_SITE_ID, name, url, headers);
                break;
                
            case "get":
                const serverId = process.argv[3];
                if (!serverId) {
                    console.error("❌ Uso: node manage-site-mcp.js get <server_id>");
                    process.exit(1);
                }
                await getMcpServer(GITBOOK_ORGANIZATION_ID, GITBOOK_SITE_ID, serverId);
                break;
                
            case "update":
                const updateServerId = process.argv[3];
                const updateName = process.argv[4];
                const updateUrl = process.argv[5];
                const updateHeadersJson = process.argv[6];
                
                if (!updateServerId) {
                    console.error("❌ Uso: node manage-site-mcp.js update <server_id> [nome] [url] [headers_json]");
                    process.exit(1);
                }
                
                const updateData = {};
                if (updateName) updateData.name = updateName;
                if (updateUrl) updateData.url = updateUrl;
                if (updateHeadersJson) {
                    try {
                        updateData.headers = JSON.parse(updateHeadersJson);
                    } catch (e) {
                        console.error("❌ Headers devem ser um JSON válido");
                        process.exit(1);
                    }
                }
                
                await updateMcpServer(GITBOOK_ORGANIZATION_ID, GITBOOK_SITE_ID, updateServerId, updateData);
                break;
                
            case "delete":
                const deleteServerId = process.argv[3];
                if (!deleteServerId) {
                    console.error("❌ Uso: node manage-site-mcp.js delete <server_id>");
                    process.exit(1);
                }
                await deleteMcpServer(GITBOOK_ORGANIZATION_ID, GITBOOK_SITE_ID, deleteServerId);
                break;
                
            default:
                console.log("Uso: node manage-site-mcp.js <comando> [argumentos]");
                console.log("\nComandos disponíveis:");
                console.log("  list                                    - Listar todos os MCP servers");
                console.log("  create <nome> <url> [headers_json]      - Criar novo MCP server");
                console.log("  get <server_id>                          - Obter detalhes de um servidor");
                console.log("  update <server_id> [nome] [url] [headers] - Atualizar servidor");
                console.log("  delete <server_id>                       - Deletar servidor");
                console.log("\nExemplos:");
                console.log('  node manage-site-mcp.js list');
                console.log('  node manage-site-mcp.js create "Meu MCP" "https://mcp.example.com" \'{"Authorization":"Bearer token"}\'');
                console.log('  node manage-site-mcp.js get abc123');
                console.log('  node manage-site-mcp.js delete abc123');
        }
    } catch (error) {
        console.error("\n❌ Erro:", error.message);
        process.exit(1);
    }
}

main();

