#!/usr/bin/env node

/**
 * Script to Generate Demonstrativo de Pagamento Image
 * Processes Twig templates and generates an anonymized image
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

// Mock data based on the PDF example
const mockData = {
    id: 292923,
    referencia: "06/2025",
    conta: "COOPERATIVA EXEMPLO",
    conta_logo: "", // Empty to hide logo
    doc: "00.000.000/0000-00",
    rota: "Rota Exemplo",
    linha: "LINHA EXEMPLO",
    codigo_produtor: "0000",
    produtor: "PRODUTOR EXEMPLO",
    cpf: "000.000.000-00",
    codigo_fazenda: "0000-01",
    fazenda: "FAZENDA EXEMPLO",
    ipr: "0000000",
    inicio: "2025-06-01",
    fim: "2025-06-30",
    coletas: [
        { dt_coleta: "2025-06-03", quantidade: 162, temperatura: 1.90, quantidade_fora_padrao: 0, quantidade_agua: 0 },
        { dt_coleta: "2025-06-05", quantidade: 84, temperatura: 3.30, quantidade_fora_padrao: 0, quantidade_agua: 0 },
        { dt_coleta: "2025-06-07", quantidade: 94, temperatura: 3.60, quantidade_fora_padrao: 0, quantidade_agua: 0 },
        { dt_coleta: "2025-06-09", quantidade: 126, temperatura: 3.80, quantidade_fora_padrao: 0, quantidade_agua: 0 },
        { dt_coleta: "2025-06-11", quantidade: 116, temperatura: 3.20, quantidade_fora_padrao: 0, quantidade_agua: 0 },
        { dt_coleta: "2025-06-15", quantidade: 213, temperatura: 2.10, quantidade_fora_padrao: 0, quantidade_agua: 0 },
        { dt_coleta: "2025-06-19", quantidade: 228, temperatura: 2.60, quantidade_fora_padrao: 0, quantidade_agua: 0 },
        { dt_coleta: "2025-06-23", quantidade: 250, temperatura: 2.80, quantidade_fora_padrao: 0, quantidade_agua: 0 },
        { dt_coleta: "2025-06-26", quantidade: 191, temperatura: 2.10, quantidade_fora_padrao: 0, quantidade_agua: 0 },
        { dt_coleta: "2025-06-28", quantidade: 129, temperatura: 1.80, quantidade_fora_padrao: 0, quantidade_agua: 0 },
        { dt_coleta: "2025-06-30", quantidade: 133, temperatura: 1.60, quantidade_fora_padrao: 0, quantidade_agua: 0 }
    ],
    qtd_coletas: 11,
    volume_medio_diario: 58,
    volume: 1726,
    media_temperatura: 2.62,
    composicao: [
        { descricao: "Preço Base", quantidade: 1726.000, valor_unitario: 2.400, valor: 4142.40, tipo: "C", exibe_valor_zerado: 0 },
        { descricao: "Bonificação por volume", quantidade: 1726.000, valor_unitario: 0.020, valor: 34.52, tipo: "C", exibe_valor_zerado: 0 },
        { descricao: "CPP", quantidade: 95.000, valor_unitario: 0.002, valor: 3.45, tipo: "C", exibe_valor_zerado: 0 },
        { descricao: "CCS", quantidade: 1246.000, valor_unitario: -0.050, valor: -86.30, tipo: "C", exibe_valor_zerado: 0 },
        { descricao: "Gordura", quantidade: 4.280, valor_unitario: 0.070, valor: 120.82, tipo: "C", exibe_valor_zerado: 0 },
        { descricao: "Proteína", quantidade: 3.840, valor_unitario: 0.050, valor: 86.30, tipo: "C", exibe_valor_zerado: 0 },
        { descricao: "Temperatura", quantidade: 0, valor_unitario: 0.030, valor: 51.78, tipo: "I", exibe_valor_zerado: 0 },
        { descricao: "Fidelidade", quantidade: 0, valor_unitario: 0.010, valor: 17.26, tipo: "I", exibe_valor_zerado: 0 },
        { descricao: "Incentivo produção leiteira MG", quantidade: 1.000, valor_unitario: 109.256, valor: 109.26, tipo: "I", exibe_valor_zerado: 0 }
    ],
    deducao: [],
    impostos: [],
    adicionais: [],
    total_fornecimento: 4142.40,
    total_credito: 337.13,
    total_imposto: 0,
    total_deducao: 0,
    total_pagamento: 4479.49,
    preco_medio: 2.595,
    decimais_valor_unitario: 3,
    exibe_preco_medio: '1',
    exibe_leite_fora_do_padrao: 0,
    exibe_desconto_crioscopia: '0',
    exibe_consolidacao: 1,
    width: 25, // Calculated width for table columns
    exibe_preco_liquido_demonstrativo: '0',
    exibe_dados_tanque_comunitario: '0',
    exibe_dados_nfe: '0',
    contrato: {
        banco: "Banco Exemplo",
        agencia: "0000-0",
        conta: "00000-0"
    },
    consolidacao: {
        cpp: 95.000,
        ccs: 1246.000,
        gordura: 4.280,
        proteina: 3.840,
        lactose: 4.090,
        esd: 8.920,
        solido: 13.200
    }
};

/**
 * Format number with Brazilian locale
 */
function formatNumber(value, decimals = 2, thousands = ".", decimal = ",") {
    if (value === null || value === undefined) return "";
    const num = parseFloat(value);
    if (isNaN(num)) return "";
    
    const parts = num.toFixed(decimals).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
    return parts.join(decimal);
}

/**
 * Format date
 */
function formatDate(dateStr, format = "d/m/Y") {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    
    return format
        .replace("d", day)
        .replace("m", month)
        .replace("Y", year);
}

/**
 * Process Twig template syntax
 */
function processTwigTemplate(template, data) {
    let html = template;
    
    // Create a copy of data to avoid mutating the original
    const localData = JSON.parse(JSON.stringify(data)); // Deep copy
    
    // Process {% set %} first - handle complex expressions including ternary
    let setIteration = 0;
    while (html.includes("{% set") && setIteration < 10) {
        const beforeSet = html;
        html = html.replace(/\{%\s*set\s+(\w+)\s*=\s*([^%]+)\s*%\}/g, (match, varName, expr) => {
            // Evaluate expression and store in localData
            const value = evaluateSetExpression(expr.trim(), localData);
            localData[varName] = value;
            if (varName === "width") {
                console.log(`   ✅ Calculado width = ${value}`);
            }
            return "";
        });
        // Stop if no more sets were found
        if (html === beforeSet) break;
        setIteration++;
    }
    
    // Process {% for %} loops - handle nested loops (process innermost first)
    let maxIterations = 20;
    let iteration = 0;
    while (html.includes("{% for") && iteration < maxIterations) {
        // Find innermost loop (one without nested {% for inside)
        const loopMatch = html.match(/\{%\s*for\s+(\w+)\s+in\s+([^%]+)\s*%\}([\s\S]*?)\{%\s*endfor\s*%\}/);
        if (!loopMatch) break;
        
        const [fullMatch, itemVar, arrayExpr, loopBody] = loopMatch;
        
        // Check if this loop contains another {% for
        if (loopBody.includes("{% for")) {
            // Skip this one, process nested first
            html = html.replace(fullMatch, fullMatch); // Keep as is for now
            iteration++;
            continue;
        }
        
        const array = evaluateExpression(arrayExpr.trim(), localData);
        if (!Array.isArray(array)) {
            html = html.replace(fullMatch, "");
            iteration++;
            continue;
        }
        
        let result = "";
        array.forEach((item, index) => {
            let itemHtml = loopBody;
            const loopData = {
                ...localData,
                [itemVar]: item,
                loop: {
                    index: index + 1,
                    last: index === array.length - 1,
                    first: index === 0
                }
            };
            
            // Process nested content (variables, conditions, etc.) - recursive call
            // This will process all {% if %}, {% set %}, and [[variables]] inside the loop
            itemHtml = processTwigTemplate(itemHtml, loopData);
            result += itemHtml;
        });
        
        html = html.replace(fullMatch, result);
        iteration++;
    }
    
    // Process {% if %} conditionals - handle nested (process innermost first)
    let ifIteration = 0;
    let lastIfHtml = "";
    while (html.includes("{% if") && ifIteration < 30) {
        // Stop if no progress
        if (html === lastIfHtml) {
            // Try to process remaining ifs more aggressively
            html = html.replace(/\{%\s*if\s+[^%]+\s*%\}([\s\S]*?)(?:\{%\s*else\s*%\}([\s\S]*?))?\{%\s*endif\s*%\}/g, (match, ifBody, elseBody) => {
                // Default to else body or empty if condition can't be evaluated
                return elseBody || "";
            });
            break;
        }
        lastIfHtml = html;
        
        // Find innermost if (one without nested {% if inside)
        const ifMatch = html.match(/\{%\s*if\s+([^%]+)\s*%\}([\s\S]*?)(?:\{%\s*else\s*%\}([\s\S]*?))?\{%\s*endif\s*%\}/);
        if (!ifMatch) break;
        
        const [fullMatch, condition, ifBody, elseBody] = ifMatch;
        
        // Check if this if contains another {% if
        if (ifBody.includes("{% if") || (elseBody && elseBody.includes("{% if"))) {
            // Try to process nested ifs first by recursively calling processTwigTemplate
            const processedIfBody = processTwigTemplate(ifBody, localData);
            const processedElseBody = elseBody ? processTwigTemplate(elseBody, localData) : "";
            const conditionResult = evaluateCondition(condition.trim(), localData);
            const selectedBody = conditionResult ? processedIfBody : processedElseBody;
            html = html.replace(fullMatch, selectedBody);
            ifIteration++;
            continue;
        }
        
        const conditionResult = evaluateCondition(condition.trim(), localData);
        const body = conditionResult ? ifBody : (elseBody || "");
        const processedBody = processTwigTemplate(body, localData);
        
        html = html.replace(fullMatch, processedBody);
        ifIteration++;
    }
    
    // Replace variables [[variavel | filter]] - process multiple times to handle nested expressions
    let varIteration = 0;
    let lastHtml = "";
    while (html.includes("[[") && varIteration < 30) {
        // Stop if no progress is being made
        if (html === lastHtml) {
            console.warn(`   ⚠️  Parou de processar variáveis após ${varIteration} iterações`);
            // Try one more time with debug
            const remaining = html.match(/\[\[([^\]]+)\]\]/g);
            if (remaining && remaining.length > 0) {
                console.warn(`   Variáveis restantes: ${remaining.slice(0, 5).join(", ")}`);
            }
            break;
        }
        lastHtml = html;
        
        html = html.replace(/\[\[([^\]]+)\]\]/g, (match, expr) => {
            try {
                const parts = expr.split("|").map(s => s.trim());
                const varPath = parts[0].trim();
                const filters = parts.slice(1);
                
                // Get value from localData
                let value = evaluateExpression(varPath, localData);
                
                // If value is still null/undefined, try to get it directly
                if (value === null || value === undefined) {
                    value = getNestedValue(localData, varPath);
                }
                
                // Special case: empty string for conta_logo (to hide logo)
                if (varPath === "conta_logo") {
                    value = localData.conta_logo !== undefined ? localData.conta_logo : "";
                }
                
                // Apply filters
                for (const filter of filters) {
                    if (filter.startsWith("date(")) {
                        const formatMatch = filter.match(/date\(['"]([^'"]+)['"]\)/);
                        const format = formatMatch ? formatMatch[1] : "d/m/Y";
                        value = formatDate(value, format);
                    } else if (filter.startsWith("number_format(")) {
                        const match = filter.match(/number_format\((\d+),['"]([^'"]+)['"],['"]([^'"]+)['"]\)/);
                        if (match) {
                            const decimals = parseInt(match[1]);
                            const decimal = match[2];
                            const thousands = match[3];
                            value = formatNumber(value, decimals, thousands, decimal);
                        }
                    } else if (filter === "number_format(2)") {
                        // Handle number_format(2) without separators
                        value = formatNumber(value, 2, ".", ",");
                    }
                }
                
                // Handle empty string literals
                if (varPath === '""' || varPath === "''") {
                    return "";
                }
                
                const result = value !== null && value !== undefined ? String(value) : "";
                if (result === "" && varPath !== "" && varPath !== '""' && varPath !== "''") {
                    // Only warn for non-empty paths
                    if (!varPath.match(/^["']/)) {
                        console.warn(`   ⚠️  Variável não encontrada: ${varPath}`);
                    }
                }
                return result;
            } catch (error) {
                console.warn(`   ⚠️  Erro ao processar variável ${expr}: ${error.message}`);
                return "";
            }
        });
        varIteration++;
    }
    
    // Remove any remaining [[...]] patterns (safety fallback) - but warn about it
    const remainingVars = html.match(/\[\[[^\]]+\]\]/g);
    if (remainingVars && remainingVars.length > 0) {
        console.warn(`   ⚠️  Removendo ${remainingVars.length} variáveis não processadas: ${remainingVars.slice(0, 5).join(", ")}`);
        html = html.replace(/\[\[[^\]]+\]\]/g, "");
    }
    
    // Remove remaining Twig comments
    html = html.replace(/\{#[\s\S]*?#\}/g, "");
    
    // Remove any remaining {% ... %} tags - but warn about it
    const remainingTags = html.match(/\{%[^%]+%\}/g);
    if (remainingTags && remainingTags.length > 0) {
        console.warn(`   ⚠️  Removendo ${remainingTags.length} tags Twig não processadas: ${remainingTags.slice(0, 5).join(", ")}`);
        html = html.replace(/\{%[^%]+%\}/g, "");
    }
    
    return html;
}

/**
 * Evaluate expression (can be variable path or simple expression)
 */
function evaluateExpression(expr, data) {
    expr = expr.trim();
    
    // Handle expressions like (total_fornecimento + total_credito)
    if (expr.includes("(") && expr.includes(")")) {
        const match = expr.match(/\(([^)]+)\)/);
        if (match) {
            const innerExpr = match[1];
            if (innerExpr.includes("+")) {
                const parts = innerExpr.split("+").map(s => s.trim());
                const values = parts.map(p => evaluateExpression(p, data));
                return values.reduce((a, b) => (parseFloat(a) || 0) + (parseFloat(b) || 0), 0);
            } else if (innerExpr.includes("-")) {
                const parts = innerExpr.split("-").map(s => s.trim());
                const values = parts.map(p => evaluateExpression(p, data));
                return values.reduce((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0));
            } else if (innerExpr.includes("/")) {
                const parts = innerExpr.split("/").map(s => s.trim());
                const values = parts.map(p => evaluateExpression(p, data));
                return values.reduce((a, b) => (parseFloat(a) || 0) / (parseFloat(b) || 1));
            }
        }
    }
    
    // Simple variable path
    return getNestedValue(data, expr);
}

/**
 * Evaluate {% set %} expression (can be ternary operator with and/or)
 */
function evaluateSetExpression(expr, data) {
    expr = expr.trim();
    
    // Handle ternary operator: condition ? value1 : value2 (can be nested)
    if (expr.includes("?") && expr.includes(":")) {
        // Find the rightmost ? and : that are at the same depth (outermost ternary)
        // We need to find the ? that corresponds to the last : at depth 0
        let depth = 0;
        let questionPos = -1;
        let colonPos = -1;
        
        // First, find all ? and : positions with their depths
        const positions = [];
        for (let i = 0; i < expr.length; i++) {
            if (expr[i] === '(') depth++;
            else if (expr[i] === ')') depth--;
            else if (expr[i] === '?') {
                positions.push({ type: '?', pos: i, depth });
            } else if (expr[i] === ':') {
                positions.push({ type: ':', pos: i, depth });
            }
        }
        
        // Find the outermost ternary: the ? at depth 0 and its matching : at depth 0
        for (let i = positions.length - 1; i >= 0; i--) {
            if (positions[i].type === ':' && positions[i].depth === 0) {
                colonPos = positions[i].pos;
                // Find the matching ? before this :
                for (let j = i - 1; j >= 0; j--) {
                    if (positions[j].type === '?' && positions[j].depth === 0) {
                        questionPos = positions[j].pos;
                        break;
                    }
                }
                if (questionPos !== -1) break;
            }
        }
        
        if (questionPos !== -1 && colonPos !== -1) {
            const condition = expr.substring(0, questionPos).trim();
            const trueValue = expr.substring(questionPos + 1, colonPos).trim();
            const falseValue = expr.substring(colonPos + 1).trim();
            
            const conditionResult = evaluateCondition(condition, data);
            const selectedValue = conditionResult ? trueValue : falseValue;
            
            // Recursively evaluate the selected value (might be another ternary)
            return evaluateSetExpression(selectedValue, data);
        }
    }
    
    // If not a ternary, evaluate as a simple expression or number
    const numValue = parseFloat(expr);
    if (!isNaN(numValue)) {
        return numValue;
    }
    
    return evaluateExpression(expr, data);
}

/**
 * Get nested value from object
 */
function getNestedValue(obj, path) {
    if (!path) return null;
    const parts = path.split(".");
    let value = obj;
    for (const part of parts) {
        if (value === null || value === undefined) return null;
        value = value[part];
    }
    return value;
}

/**
 * Evaluate simple condition (supports and/or operators)
 */
function evaluateCondition(condition, data) {
    condition = condition.trim();
    
    // Handle "and" operator (higher precedence)
    if (condition.includes(" and ")) {
        const parts = condition.split(" and ").map(s => s.trim());
        return parts.every(part => evaluateCondition(part, data));
    }
    
    // Handle "or" operator
    if (condition.includes(" or ")) {
        const parts = condition.split(" or ").map(s => s.trim());
        return parts.some(part => evaluateCondition(part, data));
    }
    
    // Handle parentheses
    if (condition.startsWith("(") && condition.endsWith(")")) {
        return evaluateCondition(condition.slice(1, -1), data);
    }
    
    // Handle "is odd" check
    if (condition.includes("is odd")) {
        const varPath = condition.replace("is odd", "").trim();
        const value = evaluateExpression(varPath, data);
        return parseInt(value) % 2 !== 0;
    }
    
    // Handle "is defined" and "is not empty"
    if (condition.includes("is defined") || condition.includes("is not empty")) {
        const varPath = condition.replace(/is\s+(defined|not empty)/, "").trim();
        const value = getNestedValue(data, varPath);
        if (condition.includes("is not empty")) {
            return value !== null && value !== undefined && value !== "";
        }
        return value !== undefined;
    }
    
    // Check for ==, !=, >, <, etc.
    if (condition.includes("==")) {
        const [left, right] = condition.split("==").map(s => s.trim());
        const leftVal = evaluateExpression(left, data);
        const rightVal = right.replace(/['"]/g, "");
        return String(leftVal) == String(rightVal);
    }
    
    if (condition.includes("!=")) {
        const [left, right] = condition.split("!=").map(s => s.trim());
        const leftVal = evaluateExpression(left, data);
        const rightVal = right.replace(/['"]/g, "");
        return String(leftVal) != String(rightVal);
    }
    
    if (condition.includes(">")) {
        const [left, right] = condition.split(">").map(s => s.trim());
        const leftVal = parseFloat(evaluateExpression(left, data) || 0);
        const rightVal = parseFloat(right || 0);
        return leftVal > rightVal;
    }
    
    if (condition.includes("<")) {
        const [left, right] = condition.split("<").map(s => s.trim());
        const leftVal = parseFloat(evaluateExpression(left, data) || 0);
        const rightVal = parseFloat(right || 0);
        return leftVal < rightVal;
    }
    
    // Simple truthy check
    const value = evaluateExpression(condition, data);
    return Boolean(value);
}

/**
 * Main function
 */
async function generateDemonstrativoImage() {
    console.log("📄 Gerando imagem do demonstrativo de pagamento...");
    
    // Load templates
    const headerPath = resolve("/Applications/MAMP/htdocs/milks/views/pay/folha.header.html");
    const mapaPath = resolve("/Applications/MAMP/htdocs/milks/views/pay/folha.mapa.html");
    const footerPath = resolve("/Applications/MAMP/htdocs/milks/views/pay/folha.footer.html");
    const stylePath = resolve("/Applications/MAMP/htdocs/milks/views/pay/style.css");
    
    if (!existsSync(headerPath) || !existsSync(mapaPath) || !existsSync(footerPath)) {
        throw new Error("Templates não encontrados");
    }
    
    const headerTemplate = readFileSync(headerPath, "utf-8");
    const mapaTemplate = readFileSync(mapaPath, "utf-8");
    const footerTemplate = readFileSync(footerPath, "utf-8");
    const styleCSS = existsSync(stylePath) ? readFileSync(stylePath, "utf-8") : "";
    
    // Process templates with multiple passes to ensure all Twig code is processed
    console.log("   🔄 Processando templates...");
    let headerHTML = processTwigTemplate(headerTemplate, mockData);
    let mapaHTML = processTwigTemplate(mapaTemplate, mockData);
    let footerHTML = processTwigTemplate(footerTemplate, { ...mockData, data: "14/01/2026 às 11:37" });
    
    // Process again if there are still unprocessed codes
    let passes = 0;
    while (passes < 3) {
        const headerUnprocessed = (headerHTML.match(/\[\[[^\]]+\]\]|\{%[^%]+%\}/g) || []).length;
        const mapaUnprocessed = (mapaHTML.match(/\[\[[^\]]+\]\]|\{%[^%]+%\}/g) || []).length;
        const footerUnprocessed = (footerHTML.match(/\[\[[^\]]+\]\]|\{%[^%]+%\}/g) || []).length;
        
        if (headerUnprocessed === 0 && mapaUnprocessed === 0 && footerUnprocessed === 0) {
            break;
        }
        
        if (headerUnprocessed > 0) {
            headerHTML = processTwigTemplate(headerHTML, mockData);
        }
        if (mapaUnprocessed > 0) {
            mapaHTML = processTwigTemplate(mapaHTML, mockData);
        }
        if (footerUnprocessed > 0) {
            footerHTML = processTwigTemplate(footerHTML, { ...mockData, data: "14/01/2026 às 11:37" });
        }
        
        passes++;
    }
    
    // Final cleanup - remove any remaining Twig syntax
    headerHTML = headerHTML.replace(/\[\[[^\]]+\]\]/g, "").replace(/\{%[^%]+%\}/g, "");
    mapaHTML = mapaHTML.replace(/\[\[[^\]]+\]\]/g, "").replace(/\{%[^%]+%\}/g, "");
    footerHTML = footerHTML.replace(/\[\[[^\]]+\]\]/g, "").replace(/\{%[^%]+%\}/g, "");
    
    // Create full HTML document
    const fullHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        ${styleCSS}
        body {
            font-family: "Source Sans Pro", "Helvetica Neue", Helvetica, Arial, sans-serif;
            font-size: 12px;
            padding: 20px;
            background: white;
        }
        img {
            max-width: 100%;
            height: auto;
        }
        table {
            border-collapse: collapse;
        }
    </style>
</head>
<body>
    ${headerHTML}
    ${mapaHTML}
    ${footerHTML}
</body>
</html>`;
    
    // Save temporary HTML
    const tempHTMLPath = join(projectRoot, "temp-demonstrativo.html");
    writeFileSync(tempHTMLPath, fullHTML, "utf-8");
    console.log("   ✅ HTML temporário criado");
    
    // Check for unprocessed Twig code
    const unprocessed = fullHTML.match(/\[\[[^\]]+\]\]|\{%[^%]+%\}/g);
    if (unprocessed && unprocessed.length > 0) {
        console.warn(`   ⚠️  Aviso: ${unprocessed.length} códigos Twig não processados encontrados`);
        console.warn(`   Primeiros: ${unprocessed.slice(0, 5).join(", ")}`);
        
        // Try to process again
        console.log("   🔄 Tentando processar novamente...");
        const reprocessedHeader = processTwigTemplate(headerTemplate, mockData);
        const reprocessedMapa = processTwigTemplate(mapaTemplate, mockData);
        const reprocessedFooter = processTwigTemplate(footerTemplate, { ...mockData, data: "14/01/2026 às 11:37" });
        
        const reprocessedHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        ${styleCSS}
        body {
            font-family: "Source Sans Pro", "Helvetica Neue", Helvetica, Arial, sans-serif;
            font-size: 12px;
            padding: 20px;
            background: white;
        }
        img {
            max-width: 100%;
            height: auto;
        }
        table {
            border-collapse: collapse;
        }
    </style>
</head>
<body>
    ${reprocessedHeader}
    ${reprocessedMapa}
    ${reprocessedFooter}
</body>
</html>`;
        
        const stillUnprocessed = reprocessedHTML.match(/\[\[[^\]]+\]\]|\{%[^%]+%\}/g);
        if (stillUnprocessed && stillUnprocessed.length > 0) {
            console.warn(`   ⚠️  Ainda há ${stillUnprocessed.length} códigos não processados após reprocessamento`);
        } else {
            console.log("   ✅ Todos os códigos processados após reprocessamento");
            writeFileSync(tempHTMLPath, reprocessedHTML, "utf-8");
        }
    }
    
    // Launch Puppeteer
    console.log("   🖼️  Renderizando com Puppeteer...");
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
    
    await page.goto(`file://${tempHTMLPath}`, { waitUntil: 'networkidle0' });
    
    // Wait for content to render
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Capture screenshot
    const outputPath = join(projectRoot, "content", "demonstrativo-folha.png");
    await page.screenshot({
        path: outputPath,
        fullPage: true,
        type: 'png'
    });
    
    await browser.close();
    
    // Check final HTML for unprocessed codes before cleanup
    const finalUnprocessed = fullHTML.match(/\[\[[^\]]+\]\]|\{%[^%]+%\}/g);
    if (finalUnprocessed && finalUnprocessed.length > 0) {
        console.warn(`\n⚠️  ATENÇÃO: ${finalUnprocessed.length} códigos Twig ainda não processados:`);
        const unique = [...new Set(finalUnprocessed)].slice(0, 10);
        unique.forEach(code => console.warn(`   - ${code}`));
        console.warn(`\n   O arquivo temporário foi mantido em: ${tempHTMLPath}`);
        console.warn(`   Revise o processamento dos templates.\n`);
    } else {
        console.log("   ✅ Todos os códigos Twig foram processados corretamente");
        // Cleanup only if everything is processed
        if (existsSync(tempHTMLPath)) {
            const { unlinkSync } = await import('fs');
            unlinkSync(tempHTMLPath);
        }
    }
    
    console.log(`\n✅ Imagem gerada com sucesso!`);
    console.log(`📁 Arquivo: ${outputPath}`);
}

// Run
generateDemonstrativoImage().catch(error => {
    console.error("❌ Erro:", error);
    process.exit(1);
});
