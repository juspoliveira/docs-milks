#!/usr/bin/env node

/**
 * Script para atualizar uma página específica do GitBook
 * Uso: node scripts/update-page.js <page-path>
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

// Importar função de sincronização do script principal
import { spawn } from "child_process";

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

// Função principal
async function main() {
    const pagePath = process.argv[2];

    if (!pagePath) {
        console.error("❌ Uso: node scripts/update-page.js <page-path>");
        console.log("\nExemplos:");
        console.log("  node scripts/update-page.js pagamento-a-produtores");
        console.log("  node scripts/update-page.js configuracoes");
        process.exit(1);
    }

    console.log(`🔄 Atualizando página: ${pagePath}\n`);

    // Executar script de sincronização com --page
    const syncScript = join(projectRoot, "scripts", "sync-from-gitbook.js");
    const child = spawn("node", [syncScript, "--page", pagePath], {
        cwd: projectRoot,
        stdio: "inherit"
    });

    child.on("close", (code) => {
        if (code === 0) {
            console.log(`\n✅ Página ${pagePath} atualizada com sucesso!`);
        } else {
            console.error(`\n❌ Erro ao atualizar página (código: ${code})`);
            process.exit(code);
        }
    });

    child.on("error", (error) => {
        console.error(`\n❌ Erro ao executar script: ${error.message}`);
        process.exit(1);
    });
}

main();

