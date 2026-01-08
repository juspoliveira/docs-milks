#!/usr/bin/env node

/**
 * Script para fazer upload de imagem para o GitBook e atualizar link no documento
 */

import { readFileSync, writeFileSync, existsSync, createReadStream } from "fs";
import { join, dirname, basename } from "path";
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

// Função para fazer requisições à API do GitBook
async function gitbookApiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            "Authorization": `Bearer ${GITBOOK_API_TOKEN}`,
            ...options.headers
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ${response.status}: ${response.statusText}\n${errorText}`);
    }

    if (response.status === 204 || response.status === 205) {
        return null;
    }

    return await response.json();
}

/**
 * Upload de arquivo para o GitBook
 * @param {string} filePath - Caminho do arquivo local
 * @param {string} fileName - Nome do arquivo no GitBook
 * @returns {Promise<string>} URL do arquivo no GitBook
 */
async function uploadFileToGitBook(filePath, fileName) {
    if (!existsSync(filePath)) {
        throw new Error(`Arquivo não encontrado: ${filePath}`);
    }

    console.log(`📤 Fazendo upload de ${fileName}...`);

    // Ler arquivo como buffer
    const fileBuffer = readFileSync(filePath);
    
    // Criar FormData manualmente (Node.js não tem FormData nativo, vamos usar multipart/form-data)
    const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;
    const formData = Buffer.concat([
        Buffer.from(`--${boundary}\r\n`),
        Buffer.from(`Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`),
        Buffer.from(`Content-Type: image/png\r\n\r\n`),
        fileBuffer,
        Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    try {
        // Usar endpoint de upload de arquivos do GitBook
        const endpoint = `/spaces/${GITBOOK_SPACE_ID}/uploads`;
        const response = await gitbookApiRequest(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
            },
            body: formData
        });

        if (response && response.url) {
            console.log(`✅ Upload concluído!`);
            console.log(`   URL: ${response.url}`);
            return response.url;
        } else {
            throw new Error('Resposta inesperada da API');
        }
    } catch (error) {
        // Tentar método alternativo usando fetch com FormData (se disponível)
        console.log(`⚠️  Método padrão falhou, tentando método alternativo...`);
        
        // Para Node.js, vamos usar uma abordagem diferente
        // GitBook aceita uploads via API de conteúdo
        // Vamos usar o endpoint de assets
        const endpoint = `/spaces/${GITBOOK_SPACE_ID}/content/attachments`;
        
        // Criar um FormData usando uma biblioteca ou método alternativo
        // Por enquanto, vamos retornar um erro informativo
        throw new Error(`Upload via API requer FormData. Use a interface web do GitBook ou uma biblioteca como 'form-data'. Erro: ${error.message}`);
    }
}

/**
 * Atualizar link da imagem no documento Markdown
 * @param {string} docPath - Caminho do documento
 * @param {string} oldSrc - Src antigo da imagem
 * @param {string} newSrc - Nova URL da imagem
 */
function updateImageLink(docPath, oldSrc, newSrc) {
    if (!existsSync(docPath)) {
        throw new Error(`Documento não encontrado: ${docPath}`);
    }

    let content = readFileSync(docPath, 'utf-8');
    
    // Substituir o src da imagem
    const imagePattern = new RegExp(`(<img[^>]*src=["'])([^"']*)(${oldSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(["'][^>]*>)`, 'g');
    content = content.replace(imagePattern, `$1${newSrc}$4`);
    
    // Se não encontrou com o padrão completo, tentar substituição simples
    if (!content.includes(newSrc)) {
        content = content.replace(new RegExp(`src=["']${oldSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'g'), `src="${newSrc}"`);
    }

    writeFileSync(docPath, content, 'utf-8');
    console.log(`✅ Link atualizado no documento: ${docPath}`);
}

/**
 * Main function
 */
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.error("❌ Uso: node scripts/upload-image-to-gitbook.js <caminho-da-imagem> [caminho-do-documento]");
        console.log("\n💡 Exemplo:");
        console.log("   node scripts/upload-image-to-gitbook.js content/modelopagamento-form.png content/modelos-de-pagamento.md");
        process.exit(1);
    }

    const imagePath = join(projectRoot, args[0]);
    const docPath = args[1] ? join(projectRoot, args[1]) : null;

    if (!GITBOOK_API_TOKEN || !GITBOOK_SPACE_ID) {
        console.error("❌ GITBOOK_API_TOKEN e GITBOOK_SPACE_ID devem estar configurados em .env.local");
        process.exit(1);
    }

    try {
        const fileName = basename(imagePath);
        console.log(`🖼️  Upload de imagem para GitBook\n`);
        console.log(`   Arquivo: ${imagePath}`);
        console.log(`   Space ID: ${GITBOOK_SPACE_ID}\n`);

        // Tentar fazer upload
        try {
            const imageUrl = await uploadFileToGitBook(imagePath, fileName);
            
            // Atualizar documento se fornecido
            if (docPath) {
                const oldSrc = fileName; // Nome do arquivo local
                updateImageLink(docPath, oldSrc, imageUrl);
            }
            
            console.log(`\n✅ Processo concluído!`);
            if (imageUrl) {
                console.log(`\n📋 URL da imagem: ${imageUrl}`);
                console.log(`\n💡 Copie esta URL e atualize manualmente no documento se necessário.`);
            }
        } catch (uploadError) {
            console.error(`\n⚠️  Upload via API não disponível: ${uploadError.message}`);
            console.log(`\n💡 Alternativas:`);
            console.log(`   1. Faça upload manualmente pela interface web do GitBook`);
            console.log(`   2. Use a funcionalidade de arrastar e soltar no editor do GitBook`);
            console.log(`   3. A imagem já está em: ${imagePath}`);
            console.log(`   4. Após upload manual, atualize o link no documento com a URL fornecida pelo GitBook`);
        }
    } catch (error) {
        console.error(`\n❌ Erro: ${error.message}`);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

main();

