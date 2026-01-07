#!/usr/bin/env node

/**
 * Script para listar Docs Sites disponíveis na organização
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
const GITBOOK_API_TOKEN = envLocal.GITBOOK_API_TOKEN || process.env.GITBOOK_API_TOKEN;
const GITBOOK_ORGANIZATION_ID = envLocal.GITBOOK_ORGANIZATION_ID || process.env.GITBOOK_ORGANIZATION_ID;

const API_BASE_URL = "https://api.gitbook.com/v1";

console.log("🔍 Listando Docs Sites disponíveis...\n");

if (!GITBOOK_API_TOKEN || !GITBOOK_ORGANIZATION_ID) {
    console.error("❌ GITBOOK_API_TOKEN ou GITBOOK_ORGANIZATION_ID não configurados!");
    process.exit(1);
}

try {
    const response = await fetch(
        `${API_BASE_URL}/orgs/${GITBOOK_ORGANIZATION_ID}/sites`,
        {
            headers: {
                "Authorization": `Bearer ${GITBOOK_API_TOKEN}`,
                "Content-Type": "application/json",
                "Accept": "*/*"
            }
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ${response.status}: ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    
    console.log(`✅ Encontrados ${data.count || 0} site(s):\n`);
    
    if (data.items && data.items.length > 0) {
        data.items.forEach((site, index) => {
            console.log(`${index + 1}. ${site.title || site.id} (ID: ${site.id})`);
            if (site.urls?.public) {
                console.log(`   URL pública: ${site.urls.public}`);
            }
            if (site.urls?.app) {
                console.log(`   URL app: ${site.urls.app}`);
            }
            console.log("");
        });
    } else {
        console.log("   Nenhum site encontrado.\n");
    }
    
} catch (error) {
    console.error("❌ Erro:", error.message);
    process.exit(1);
}

