#!/usr/bin/env node

console.log("Script iniciado...");

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

console.log("Imports carregados...");

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

// Página de configurações
const DOCUMENT_ID = "4qvdPd91MFxH0S2f5Sep";
const markdown = readFileSync(join(projectRoot, "content/configuracoes.md"), "utf-8");

console.log("🚀 Publicando página de Configurações no GitBook\n");
console.log(`Space ID: ${GITBOOK_SPACE_ID}`);
console.log(`Document ID: ${DOCUMENT_ID}`);
console.log(`Tamanho do markdown: ${markdown.length} caracteres\n`);

const url = `${API_BASE_URL}/spaces/${GITBOOK_SPACE_ID}/documents/${DOCUMENT_ID}`;
console.log(`URL: ${url}\n`);

try {
    console.log("📤 Enviando requisição PATCH...\n");
    
    const response = await fetch(url, {
        method: "PATCH",
        headers: {
            "Authorization": `Bearer ${GITBOOK_API_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            title: "Configurações",
            content: {
                markdown: markdown
            }
        })
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`\n❌ Erro: ${errorText}`);
        process.exit(1);
    } else {
        const result = await response.json();
        console.log(`\n✅ Página atualizada com sucesso!`);
        if (result) {
            console.log(JSON.stringify(result, null, 2));
        }
    }
} catch (error) {
    console.error(`\n❌ Erro na requisição: ${error.message}`);
    if (error.stack) {
        console.error(error.stack);
    }
    process.exit(1);
}

