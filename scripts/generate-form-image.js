#!/usr/bin/env node

/**
 * Generic Script to Generate Form Images with Numbered Badges
 * Supports database integration and form filling
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { createFullHTML } from "./lib/form-renderer.js";
import { fillFormFields, renderFormula } from "./lib/database-filler.js";
import { detectElements, filterElements } from "./lib/element-detector.js";
import { detectAndSortElements, generateBadgePosition } from "./lib/element-sorter.js";
import { processAngularTemplates, injectAngularScripts } from "./lib/angular-processor.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

/**
 * Load configuration from JSON file
 * @param {string} configPath - Path to configuration file
 * @returns {Object} Configuration object
 */
function loadConfig(configPath) {
    if (!existsSync(configPath)) {
        throw new Error(`Configuration file not found: ${configPath}`);
    }
    
    const configContent = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    
    // Resolve relative paths
    if (config.htmlPath && !config.htmlPath.startsWith('/')) {
        config.htmlPath = resolve(projectRoot, config.htmlPath);
    }
    
    if (config.outputImage && !config.outputImage.startsWith('/')) {
        config.outputImage = resolve(projectRoot, config.outputImage);
    }
    
    return config;
}

/**
 * Load database record from JSON file (pre-fetched via MCP)
 * @param {string} dataPath - Path to JSON file with database record
 * @returns {Object|null} Record object or null
 */
function loadDatabaseRecord(dataPath) {
    if (!existsSync(dataPath)) {
        return null;
    }
    
    try {
        const dataContent = readFileSync(dataPath, 'utf-8');
        const data = JSON.parse(dataContent);
        return Array.isArray(data) ? data[0] : data;
    } catch (error) {
        console.warn(`Error loading database record: ${error.message}`);
        return null;
    }
}

/**
 * Main function to generate form image
 * @param {Object} config - Configuration object
 * @param {Object} databaseRecord - Optional database record to fill form
 */
async function generateFormImage(config, databaseRecord = null) {
    console.log(`🖼️  Gerador de Imagem de Formulário: ${config.pageName || 'Formulário'}\n`);
    
    // Verificar se Puppeteer está disponível
    let puppeteer;
    try {
        const puppeteerModule = await import('puppeteer');
        puppeteer = puppeteerModule.default || puppeteerModule;
    } catch (error) {
        console.error("❌ Puppeteer não está instalado!");
        console.log("\n💡 Para instalar o Puppeteer, execute:");
        console.log("   npm install puppeteer");
        process.exit(1);
    }
    
    // Validar caminho do HTML
    if (!existsSync(config.htmlPath)) {
        throw new Error(`Arquivo HTML não encontrado: ${config.htmlPath}`);
    }
    
    console.log(`📄 Lendo HTML do formulário: ${config.htmlPath}`);
    let formHTML = readFileSync(config.htmlPath, 'utf-8');
    
    // Verificar se HTML contém templates AngularJS
    const hasAngularTemplates = formHTML.includes('{{') || 
                                 formHTML.includes('ng-repeat') || 
                                 formHTML.includes('ng-controller') ||
                                 formHTML.includes('ng-if');
    
    // Renderizar com Puppeteer (precisamos renderizar primeiro para detectar elementos)
    console.log("\n🌐 Iniciando navegador headless...");
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Configurar viewport
    const viewport = config.renderOptions?.viewport || {
        width: 1200,
        height: 800,
        deviceScaleFactor: 2
    };
    await page.setViewport(viewport);
    
    // Criar HTML temporário inicial (sem bullets ainda)
    const title = config.title || config.pageName || 'Formulário';
    const customStyles = config.customStyles || '';
    const includeAngular = hasAngularTemplates && (config.processAngularTemplates !== false);
    const initialHTML = createFullHTML(formHTML, title, [], customStyles, includeAngular);
    const tempHTMLPath = join(projectRoot, "temp-form.html");
    writeFileSync(tempHTMLPath, initialHTML, 'utf-8');
    console.log(`✅ HTML temporário criado: ${tempHTMLPath}`);
    
    // Carregar HTML
    const fileUrl = `file://${tempHTMLPath}`;
    console.log(`📖 Carregando HTML: ${fileUrl}`);
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });
    
    // Processar templates AngularJS se necessário
    if (hasAngularTemplates && includeAngular) {
        await processAngularTemplates(page);
        // Aguardar um pouco mais para garantir renderização completa
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Detectar elementos automaticamente se configurado
    let elements = config.elements || [];
    const autoDetect = config.autoDetectElements !== false && (elements.length === 0 || config.autoDetectElements === true);
    
    if (autoDetect) {
        console.log("🔍 Detectando elementos automaticamente...");
        const detectedElements = await detectElements(page);
        const filteredElements = filterElements(detectedElements);
        
        if (filteredElements.length > 0) {
            console.log(`   Encontrados ${filteredElements.length} elementos`);
            
            // Ordenar elementos por posição visual
            const sortedElements = await detectAndSortElements(page, filteredElements);
            
            // Converter para formato de configuração
            elements = sortedElements.map(el => {
                const badgePos = generateBadgePosition(el, el.type);
                return {
                    selector: el.selector,
                    number: el.number,
                    label: el.label || el.name || el.id || `Elemento ${el.number}`,
                    position: badgePos
                };
            });
            
            console.log(`   ✅ ${elements.length} elementos ordenados e numerados sequencialmente`);
        } else {
            console.log("   ⚠️  Nenhum elemento detectado, usando configuração manual");
        }
    }
    
    // Se temos elementos, recriar HTML com bullets
    if (elements.length > 0) {
        const fullHTML = createFullHTML(formHTML, title, elements, customStyles, includeAngular);
        writeFileSync(tempHTMLPath, fullHTML, 'utf-8');
        
        // Recarregar página com bullets
        await page.goto(fileUrl, { waitUntil: 'networkidle0' });
        
        // Processar templates AngularJS novamente após recarregar
        if (hasAngularTemplates && includeAngular) {
            await processAngularTemplates(page);
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    // Preencher formulário com dados do banco se disponível
    if (databaseRecord && config.fillData?.enabled) {
        console.log("📝 Preenchendo formulário com dados do banco...");
        await fillFormFields(page, databaseRecord, config.fillData.mappings || {});
        
        // Renderizar fórmula se configurado
        if (config.fillData.formula?.enabled && databaseRecord[config.fillData.formula.field]) {
            console.log("🔢 Renderizando fórmula...");
            const targetSelector = config.fillData.formula.targetSelector || '.panel-body[ui-sortable]';
            await renderFormula(page, databaseRecord[config.fillData.formula.field], targetSelector);
        }
    }
    
    // Adicionar badges numerados DEPOIS de tudo estar processado
    if (elements.length > 0) {
        console.log("🔢 Adicionando badges numerados...");
        const badgesAdded = await page.evaluate((elementsConfig) => {
            // Remover badges existentes se houver
            document.querySelectorAll('.element-number-badge').forEach(badge => badge.remove());
            
            let addedCount = 0;
            const results = [];
            
            elementsConfig.forEach((element) => {
                let el = document.querySelector(element.selector);
                
                // Se não encontrou, tentar alternativas
                if (!el && element.selector.includes('ui-sortable')) {
                    el = document.querySelector('[ui-sortable]');
                }
                if (!el && element.selector.includes('checkbox') && element.selector.includes('ativo')) {
                    el = document.querySelector('input[type="checkbox"][ng-model="record.ativo"]');
                }
                
                if (el) {
                    // Encontrar o container apropriado (form-group ou o próprio elemento)
                    let container = el;
                    const tagName = el.tagName.toLowerCase();
                    const isCheckbox = tagName === 'input' && el.type === 'checkbox';
                    const isInput = tagName === 'input' || tagName === 'select' || tagName === 'textarea';
                    
                    // Para inputs, usar o form-group como container
                    if (isInput && !isCheckbox) {
                        const formGroup = el.closest('.form-group');
                        if (formGroup) {
                            container = formGroup;
                        }
                    } else if (isCheckbox) {
                        // Para checkbox, usar o container checkbox ou form-group
                        const checkboxContainer = el.closest('.checkbox') || el.closest('.form-group');
                        if (checkboxContainer) {
                            container = checkboxContainer;
                        }
                    }
                    
                    // Garantir que o container tenha position relative
                    const containerStyle = window.getComputedStyle(container);
                    if (containerStyle.position === 'static') {
                        container.style.position = 'relative';
                    }
                    
                    // Garantir que containers pais tenham overflow visible
                    let parent = container.parentElement;
                    while (parent && parent !== document.body) {
                        const parentStyle = window.getComputedStyle(parent);
                        if (parentStyle.overflow === 'hidden' || parentStyle.overflowY === 'hidden') {
                            parent.style.overflow = 'visible';
                        }
                        parent = parent.parentElement;
                    }
                    
                    const badge = document.createElement('div');
                    badge.className = 'element-number-badge';
                    badge.setAttribute('data-number', element.number);
                    badge.textContent = element.number;
                    
                    // Use custom position if provided, otherwise use smart defaults
                    const position = element.position || {};
                    
                    // Posicionar badges de forma que fiquem visíveis
                    if (isCheckbox) {
                        // Para checkbox, posicionar ao lado esquerdo
                        badge.style.top = '0px';
                        badge.style.left = '-35px';
                        badge.style.right = 'auto';
                        badge.style.bottom = 'auto';
                    } else if (isInput) {
                        // Para inputs, posicionar no canto superior direito do form-group
                        badge.style.top = '-12px';
                        badge.style.right = '5px';
                        badge.style.left = 'auto';
                        badge.style.bottom = 'auto';
                    } else {
                        // Para outros elementos (como ui-sortable), usar posição customizada ou padrão
                        badge.style.top = position.top || '5px';
                        badge.style.left = position.left || '5px';
                        badge.style.right = position.right || 'auto';
                        badge.style.bottom = position.bottom || 'auto';
                    }
                    
                    // Garantir que o badge seja visível
                    badge.style.display = 'flex';
                    badge.style.alignItems = 'center';
                    badge.style.justifyContent = 'center';
                    badge.style.visibility = 'visible';
                    badge.style.opacity = '1';
                    
                    container.appendChild(badge);
                    addedCount++;
                    results.push({ number: element.number, selector: element.selector, found: true, container: container.tagName });
                } else {
                    results.push({ number: element.number, selector: element.selector, found: false });
                }
            });
            return { count: addedCount, details: results };
        }, elements);
        
        console.log(`   ✅ ${badgesAdded.count} badges adicionados`);
        badgesAdded.details.forEach(detail => {
            if (detail.found) {
                console.log(`      ✓ Badge ${detail.number} adicionado: ${detail.selector}`);
            } else {
                console.log(`      ✗ Badge ${detail.number} NÃO encontrado: ${detail.selector}`);
            }
        });
        
        // Aguardar renderização dos badges e garantir que o CSS foi aplicado
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verificar se os badges estão visíveis e têm o CSS correto
        const badgesInfo = await page.evaluate(() => {
            const badges = document.querySelectorAll('.element-number-badge');
            return Array.from(badges).map(badge => {
                const style = window.getComputedStyle(badge);
                const rect = badge.getBoundingClientRect();
                return {
                    number: badge.textContent,
                    display: style.display,
                    visibility: style.visibility,
                    opacity: style.opacity,
                    position: style.position,
                    zIndex: style.zIndex,
                    top: style.top,
                    left: style.left,
                    right: style.right,
                    bottom: style.bottom,
                    visible: rect.width > 0 && rect.height > 0 && style.opacity !== '0' && style.visibility !== 'hidden'
                };
            });
        });
        
        console.log(`   ✅ ${badgesInfo.length} badges visíveis na página`);
        if (badgesInfo.length > 0) {
            console.log(`   📊 Verificação dos badges:`);
            badgesInfo.forEach((info, idx) => {
                const status = info.visible ? '✓' : '✗';
                console.log(`      ${status} Badge ${idx + 1}: número=${info.number}, posição=${info.position}, visível=${info.visible}`);
            });
        }
        
        // Aguardar mais um pouco para garantir renderização completa
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Capturar screenshot
    console.log("📸 Capturando screenshot...");
    await page.screenshot({
        path: config.outputImage,
        fullPage: true,
        type: 'png'
    });
    
    await browser.close();
    
    // Remover arquivo temporário
    try {
        const { unlinkSync } = await import('fs');
        unlinkSync(tempHTMLPath);
    } catch (e) {
        // Ignorar erro se não conseguir remover
    }
    
    console.log(`\n✅ Imagem gerada com sucesso!`);
    console.log(`📁 Arquivo: ${config.outputImage}`);
    
    // Atualizar arquivo de configuração se solicitado
    if (config.autoUpdateConfig === true && autoDetect && elements.length > 0) {
        try {
            const configPath = process.argv.includes('--config') 
                ? resolve(process.argv[process.argv.indexOf('--config') + 1])
                : null;
            
            if (configPath && existsSync(configPath)) {
                const configContent = readFileSync(configPath, 'utf-8');
                const configObj = JSON.parse(configContent);
                configObj.elements = elements.map(el => ({
                    ...el,
                    autoDetected: true
                }));
                writeFileSync(configPath, JSON.stringify(configObj, null, 2), 'utf-8');
                console.log(`📝 Configuração atualizada: ${configPath}`);
            }
        } catch (error) {
            console.warn(`⚠️  Não foi possível atualizar configuração: ${error.message}`);
        }
    }
    
    return config.outputImage;
}

/**
 * Main entry point
 */
async function main() {
    const args = process.argv.slice(2);
    
    // Parse command line arguments
    let configPath = null;
    let dataPath = null;
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--config' && args[i + 1]) {
            configPath = resolve(args[i + 1]);
            i++;
        } else if (args[i] === '--data' && args[i + 1]) {
            dataPath = resolve(args[i + 1]);
            i++;
        }
    }
    
    if (!configPath) {
        console.error("❌ Erro: Arquivo de configuração não especificado");
        console.log("\n💡 Uso:");
        console.log("   node scripts/generate-form-image.js --config <caminho-do-config.json> [--data <caminho-do-dados.json>]");
        console.log("\n💡 Exemplo:");
        console.log("   node scripts/generate-form-image.js --config content-metadata/modelos-de-pagamento-image-config.json");
        process.exit(1);
    }
    
    // Load configuration
    const config = loadConfig(configPath);
    
    // Load database record if provided
    let databaseRecord = null;
    if (dataPath) {
        databaseRecord = loadDatabaseRecord(dataPath);
    } else if (config.database?.enabled) {
        // Try to load from config dataFile path
        if (config.database.dataFile) {
            const configDataPath = resolve(projectRoot, config.database.dataFile);
            databaseRecord = loadDatabaseRecord(configDataPath);
        } else {
            // Try to load from default path
            const defaultDataPath = join(projectRoot, 'content-metadata', `${config.pageName}-data.json`);
            databaseRecord = loadDatabaseRecord(defaultDataPath);
        }
    }
    
    // Generate image
    try {
        await generateFormImage(config, databaseRecord);
    } catch (error) {
        console.error("\n❌ Erro ao gerar imagem:");
        console.error(error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// Executar
main().catch(error => {
    console.error("\n❌ Erro fatal:");
    console.error(error.message);
    if (error.stack) {
        console.error(error.stack);
    }
    process.exit(1);
});

