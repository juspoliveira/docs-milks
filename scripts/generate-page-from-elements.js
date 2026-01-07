#!/usr/bin/env node

/**
 * Script para gerar conteúdo Markdown a partir de arquivo JSON com elementos
 * Uso: node scripts/generate-page-from-elements.js content-metadata/configuracoes-elements.json
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

const elementsFile = process.argv[2] || "content-metadata/configuracoes-elements.json";
const elementsPath = join(projectRoot, elementsFile);

console.log("📝 Gerador de Conteúdo Markdown\n");

if (!existsSync(elementsPath)) {
    console.error(`❌ Arquivo não encontrado: ${elementsFile}`);
    console.log("\n💡 Execute primeiro:");
    console.log(`   node scripts/analyze-page-image.js content/configuracoes.md`);
    process.exit(1);
}

try {
    const data = JSON.parse(readFileSync(elementsPath, 'utf-8'));
    const { page, imageUrl, elements } = data;
    
    if (!elements || elements.length === 0) {
        console.error("❌ Nenhum elemento encontrado no arquivo JSON.");
        console.log("   Preencha o arquivo com as informações dos elementos numerados.");
        process.exit(1);
    }
    
    // Ler o arquivo original para manter frontmatter e texto introdutório
    const pagePath = join(projectRoot, page);
    let originalContent = "";
    if (existsSync(pagePath)) {
        originalContent = readFileSync(pagePath, 'utf-8');
    }
    
    // Extrair frontmatter e texto introdutório
    const frontmatterMatch = originalContent.match(/^---\n([\s\S]*?)\n---\n/);
    const frontmatter = frontmatterMatch ? frontmatterMatch[0] : `---
description: Parâmetros globais que afetam o comportamento do módulo de pagamento
---

`;
    
    const introMatch = originalContent.match(/^# Configurações\n\n([\s\S]*?)\n\n<figure>/);
    const intro = introMatch ? introMatch[1] : "Os ajustes iniciais que balizam os cálculos da folha, emissão de documentos e relatórios de saída devem ser feitos a partir das opções disponíveis neste módulo.";
    
    // Gerar conteúdo dos elementos
    const elementsContent = elements
        .sort((a, b) => a.number - b.number) // Ordenar por número
        .map(element => {
            const howToAdjust = Array.isArray(element.howToAdjust) 
                ? element.howToAdjust.map(step => `- ${step}`).join('\n')
                : `- ${element.howToAdjust || '[Instruções de ajuste]'}`;
            
            return `**${element.number}. ${element.name || `[Nome do Elemento ${element.number}]`}**

${element.description || '[Descrição breve do que é este elemento e sua função na tela de configurações]'}

**Como ajustar:**
${howToAdjust}

**Para que serve:**
${element.purpose || '[Explicação detalhada da finalidade desta configuração e quando ela é utilizada no sistema]'}

**Como afeta o cálculo:**
${element.calculationImpact || '[Descrição específica de como esta configuração impacta os cálculos da folha de pagamento, incluindo exemplos práticos se aplicável]'}

---`;
        })
        .join('\n\n');
    
    // Construir conteúdo final
    const finalContent = `${frontmatter}# Configurações

${intro}

<figure>
  <img src="${imageUrl}" alt="Tela de configurações do módulo Pay">
  <figcaption>Tela de configurações do módulo Pay</figcaption>
</figure>

## Descrição dos Elementos

Seguindo a numeração presente na imagem acima:

${elementsContent}
`;
    
    // Salvar arquivo
    writeFileSync(pagePath, finalContent, 'utf-8');
    
    console.log(`✅ Conteúdo gerado com sucesso!`);
    console.log(`📄 Arquivo atualizado: ${page}`);
    console.log(`📊 Total de elementos: ${elements.length}`);
    console.log(`\nElementos incluídos:`);
    elements
        .sort((a, b) => a.number - b.number)
        .forEach(el => {
            console.log(`  ${el.number}. ${el.name || '[Sem nome]'}`);
        });
    console.log(`\n💡 Revise o arquivo e ajuste conforme necessário.`);
    
} catch (error) {
    console.error("❌ Erro:", error.message);
    if (error instanceof SyntaxError) {
        console.error("   Verifique se o arquivo JSON está bem formatado.");
    }
    process.exit(1);
}

