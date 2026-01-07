#!/usr/bin/env node

/**
 * Script auxiliar para analisar e documentar elementos numerados em imagens
 * Ajuda a criar a lista de elementos para preencher nas páginas
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

const pageFile = process.argv[2] || "content/configuracoes.md";
const pagePath = join(projectRoot, pageFile);

console.log("📋 Analisador de Elementos Numerados\n");
console.log(`Arquivo: ${pageFile}\n`);

try {
    const content = readFileSync(pagePath, 'utf-8');
    
    // Extrair URL da imagem
    const imageMatch = content.match(/<img src="([^"]+)"/);
    if (imageMatch) {
        const imageUrl = imageMatch[1];
        console.log("🖼️  URL da Imagem:");
        console.log(imageUrl);
        console.log("\n" + "=".repeat(60));
        console.log("📝 INSTRUÇÕES PARA PREENCHIMENTO:");
        console.log("=".repeat(60));
        console.log("\n1. Acesse a URL da imagem acima no navegador");
        console.log("2. Identifique todos os números/bullets visíveis na imagem");
        console.log("3. Para cada número, anote:");
        console.log("   - O que o número aponta/representa");
        console.log("   - Nome do campo/opção");
        console.log("   - Localização na interface");
        console.log("\n4. Use o template abaixo para cada elemento:\n");
        
        console.log(`
**N. [Nome do Elemento]**

[Descrição breve do que é este elemento]

**Como ajustar:**
- [Instrução passo a passo]

**Para que serve:**
[Finalidade e propósito]

**Como afeta o cálculo:**
[Impacto nos cálculos da folha]
`);
        
        console.log("\n" + "=".repeat(60));
        console.log("📋 TEMPLATE DE LISTA DE ELEMENTOS:");
        console.log("=".repeat(60));
        console.log(`
Crie um arquivo JSON com a estrutura:

{
  "page": "${pageFile}",
  "imageUrl": "${imageUrl}",
  "elements": [
    {
      "number": 1,
      "name": "Nome do Elemento",
      "description": "Descrição breve",
      "location": "Onde está na tela",
      "howToAdjust": ["Passo 1", "Passo 2"],
      "purpose": "Para que serve",
      "calculationImpact": "Como afeta o cálculo"
    }
  ]
}
`);
        
        // Criar arquivo de template
        const templatePath = join(projectRoot, "content-metadata", `${pageFile.replace('content/', '').replace('.md', '')}-elements.json`);
        const template = {
            page: pageFile,
            imageUrl: imageUrl,
            elements: []
        };
        
        writeFileSync(templatePath, JSON.stringify(template, null, 2), 'utf-8');
        console.log(`\n✅ Template criado em: ${templatePath}`);
        console.log("   Preencha este arquivo com as informações dos elementos numerados.\n");
        
    } else {
        console.log("⚠️  Nenhuma imagem encontrada no arquivo.");
    }
    
} catch (error) {
    console.error("❌ Erro:", error.message);
    process.exit(1);
}

