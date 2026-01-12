#!/usr/bin/env node

/**
 * Generic Script to Generate Form Images with Numbered Badges
 * Supports database integration and form filling
 * 
 * NOTA SOBRE DOCUMENTAÇÃO DE IMAGENS:
 * As notas sobre imagens geradas nos arquivos .md devem ser simples e descritivas,
 * apenas informando o que é a tela, sem detalhes técnicos. Exemplo:
 * "> **Nota**: Tela de cadastro e edição de modelos de pagamento com os campos principais numerados para referência."
 * 
 * NÃO incluir:
 * - Menção à geração automática
 * - Origem dos dados (banco de dados, etc.)
 * - Comandos de execução
 * - Requisitos técnicos (Puppeteer, npm, etc.)
 * - Detalhes de sincronização (GitSync, etc.)
 * - Instruções de regeneração
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { createFullHTML } from "./lib/form-renderer.js";
import { fillFormFields, renderFormula } from "./lib/database-filler.js";
import { detectElements, filterElements } from "./lib/element-detector.js";
import { detectAndSortElements, generateBadgePosition } from "./lib/element-sorter.js";
import { processAngularTemplates, injectAngularScripts } from "./lib/angular-processor.js";
import { generateMockFaixasData } from "./lib/mock-data-generator.js";

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
        // Se for estrutura de faixas (com imposto e faixas), retornar completo
        if (data.imposto && data.faixas) {
            // Verificar se há faixas válidas
            if (data.faixas.length > 0) {
                return data;
            }
            // Se não houver faixas, gerar dados MOCK
            console.log('   ⚠️  Nenhuma faixa encontrada, gerando dados MOCK...');
            return generateMockFaixasData({ contaId: data.imposto?.conta_id || 40001 });
        }
        // Caso contrário, retornar primeiro elemento se for array
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
    
    // Carregar dados adicionais ANTES de processar HTML (para poder adicionar ng-controller)
    let additionalData = {};
    if (config.database?.enabled && config.database?.dataFile) {
        const dataPath = resolve(projectRoot, config.database.dataFile);
        if (existsSync(dataPath)) {
            try {
                const dataContent = readFileSync(dataPath, 'utf-8');
                const data = JSON.parse(dataContent);
                
                // Verificar se é estrutura de faixas (com imposto e faixas) ou lista simples
                if (data.imposto && data.faixas) {
                    additionalData.imposto = data.imposto;
                    additionalData.faixas = Array.isArray(data.faixas) ? data.faixas : [data.faixas];
                    console.log(`   📊 Carregados dados do imposto "${data.imposto.descricao}" com ${additionalData.faixas.length} faixas`);
                    
                    // Adicionar ng-controller para faixas se não tiver (para tabela)
                    if (!formHTML.includes('ng-controller="imposto.FaixaCtrl"') && formHTML.includes('ng-repeat="faixa in faixas"')) {
                        // Adicionar ng-controller ao primeiro div com class wrapper-sm
                        formHTML = formHTML.replace(/<div([^>]*class="[^"]*wrapper-sm[^"]*")/i, '<div$1 ng-controller="imposto.FaixaCtrl"');
                        if (!formHTML.includes('ng-controller="imposto.FaixaCtrl"')) {
                            // Se não encontrou wrapper-sm, adicionar ao primeiro div
                            formHTML = formHTML.replace(/<div([^>]*class="[^"]*")/i, '<div$1 ng-controller="imposto.FaixaCtrl"');
                        }
                        console.log('   ✅ Adicionado ng-controller="imposto.FaixaCtrl"');
                    }
                    
                    // Adicionar ng-controller para modal se não tiver (para modal)
                    if (!formHTML.includes('ng-controller="imposto.FaixaModalCtrl"') && formHTML.includes('ng-model="registro.')) {
                        // Adicionar ng-controller ao form ou primeiro elemento
                        if (formHTML.includes('<form')) {
                            formHTML = formHTML.replace(/<form([^>]*name="forms\.modal")/i, '<form$1 ng-controller="imposto.FaixaModalCtrl"');
                        } else {
                            formHTML = formHTML.replace(/<div([^>]*class="[^"]*modal-body[^"]*")/i, '<div$1 ng-controller="imposto.FaixaModalCtrl"');
                        }
                        console.log('   ✅ Adicionado ng-controller="imposto.FaixaModalCtrl"');
                    }
                } else {
                    // Estrutura de lista simples (records)
                    // Verificar se data tem propriedade records
                    if (data.records && Array.isArray(data.records)) {
                        additionalData.records = data.records;
                    } else if (Array.isArray(data)) {
                        additionalData.records = data;
                    } else {
                        additionalData.records = [data];
                    }
                    console.log(`   📊 Carregados ${additionalData.records.length} registros do arquivo de dados`);
                    
                    // Adicionar ng-controller diretamente no HTML se houver dados
                    if (additionalData.records.length > 0 && formHTML.includes('ng-repeat="record in records')) {
                        // Detectar qual controller usar baseado no caminho do HTML
                        let controllerName = 'ajusteacordo.AcordoListCtrl'; // padrão
                        if (config.htmlPath && config.htmlPath.includes('tabelapreco')) {
                            controllerName = 'tabelapreco.ListCtrl';
                        }
                        
                        // Adicionar ng-controller ao elemento sng-page ou sng-content
                        if (formHTML.includes('<sng-page>') && !formHTML.includes('ng-controller')) {
                            formHTML = formHTML.replace('<sng-page>', `<sng-page ng-controller="${controllerName}">`);
                            console.log(`   ✅ Adicionado ng-controller="${controllerName}" ao sng-page`);
                        } else if (formHTML.includes('<sng-content>') && !formHTML.includes('ng-controller')) {
                            formHTML = formHTML.replace('<sng-content>', `<sng-content ng-controller="${controllerName}">`);
                            console.log(`   ✅ Adicionado ng-controller="${controllerName}" ao sng-content`);
                        }
                    }
                }
            } catch (error) {
                console.warn(`Erro ao carregar dados: ${error.message}`);
            }
        }
    }
    
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
    
    // additionalData já foi carregado acima
    
    // Processar templates AngularJS se necessário
    if (hasAngularTemplates && includeAngular) {
        await processAngularTemplates(page, additionalData);
        // Aguardar um pouco mais para garantir renderização completa
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verificar se as interpolações foram resolvidas
        const interpolationCheck = await page.evaluate(() => {
            const body = document.body;
            const injector = angular.element(body).injector();
            if (!injector) return { success: false, reason: 'No injector' };
            
            const faixaElements = document.querySelectorAll('[ng-controller="imposto.FaixaCtrl"]');
            const results = [];
            
            faixaElements.forEach(element => {
                try {
                    const scope = angular.element(element).scope();
                    if (scope) {
                        const hasRecord = scope.record && scope.record.descricao;
                        const hasFaixas = scope.faixas && scope.faixas.length > 0;
                        const recordDesc = scope.record ? scope.record.descricao : 'N/A';
                        const faixasCount = scope.faixas ? scope.faixas.length : 0;
                        
                        results.push({
                            hasRecord,
                            hasFaixas,
                            recordDesc,
                            faixasCount
                        });
                    }
                } catch (e) {
                    results.push({ error: e.message });
                }
            });
            
            // Check if interpolations are resolved by checking actual rendered content
            const textContent = document.body.textContent || '';
            const innerHTML = document.body.innerHTML || '';
            const hasUnresolved = textContent.includes('{{record.') || textContent.includes('{{faixa.') || 
                                 innerHTML.includes('{{record.') || innerHTML.includes('{{faixa.');
            
            // Check specific elements that should have data
            const titleElement = document.querySelector('.h4');
            const titleText = titleElement ? titleElement.textContent : '';
            const hasTitleData = titleText && !titleText.includes('{{record.');
            
            const tableRows = document.querySelectorAll('tbody tr[ng-repeat]');
            const hasTableData = tableRows.length > 0;
            const firstRowText = tableRows.length > 0 ? tableRows[0].textContent : '';
            const hasRowData = firstRowText && !firstRowText.includes('{{faixa.');
            
            return {
                success: results.length > 0 && results.every(r => r.hasRecord && r.hasFaixas),
                hasUnresolved,
                hasTitleData,
                hasTableData,
                hasRowData,
                titleText: titleText.substring(0, 100),
                firstRowText: firstRowText.substring(0, 100),
                results
            };
        });
        
        if (interpolationCheck.hasUnresolved || !interpolationCheck.success || !interpolationCheck.hasTitleData || !interpolationCheck.hasRowData) {
            console.log('⚠️  Interpolações não resolvidas, tentando novamente...');
            console.log('   Verificação detalhada:');
            console.log('   - Scope OK:', interpolationCheck.success);
            console.log('   - Título renderizado:', interpolationCheck.hasTitleData, interpolationCheck.titleText);
            console.log('   - Linhas da tabela:', interpolationCheck.hasTableData);
            console.log('   - Dados nas linhas:', interpolationCheck.hasRowData, interpolationCheck.firstRowText);
            console.log('   - Interpolações não resolvidas:', interpolationCheck.hasUnresolved);
            
            // Force re-application of data
            await page.evaluate((additionalData) => {
                const body = document.body;
                const injector = angular.element(body).injector();
                if (injector) {
                    const $rootScope = injector.get('$rootScope');
                    const $compile = injector.get('$compile');
                    
                    if (additionalData && additionalData.faixas) {
                        const faixaElements = document.querySelectorAll('[ng-controller="imposto.FaixaCtrl"]');
                        faixaElements.forEach(element => {
                            try {
                                const scope = angular.element(element).scope();
                                if (scope) {
                                    scope.faixas = JSON.parse(JSON.stringify(additionalData.faixas));
                                    if (additionalData.imposto) {
                                        scope.record = JSON.parse(JSON.stringify(additionalData.imposto));
                                    }
                                    scope.viewState = 'edit';
                                    
                                    // Force re-compilation
                                    if ($compile) {
                                        const compiled = $compile(element)(scope);
                                    }
                                    
                                    if (!scope.$$phase && !scope.$root.$$phase) {
                                        scope.$apply();
                                    }
                                }
                            } catch (e) {
                                console.warn('Erro:', e.message);
                            }
                        });
                        
                        if ($rootScope) {
                            $rootScope.$apply();
                        }
                    }
                }
            }, additionalData);
            
            // Wait for rendering
            await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
            console.log('✅ Interpolações resolvidas corretamente');
        }
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
            await processAngularTemplates(page, additionalData);
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    // Preencher formulário com dados do banco se disponível
    if (databaseRecord && config.fillData?.enabled) {
        console.log("📝 Preenchendo formulário com dados do banco...");
        // Se for estrutura de faixas, usar a primeira faixa para preencher o modal
        let recordToFill = databaseRecord;
        if (databaseRecord.faixas && databaseRecord.faixas.length > 0) {
            recordToFill = databaseRecord.faixas[0];
        }
        await fillFormFields(page, recordToFill, config.fillData.mappings || {});
        
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
        
        // Verificação final antes do screenshot
        if (hasAngularTemplates && includeAngular) {
            const finalCheck = await page.evaluate(() => {
                const body = document.body;
                const textContent = body.textContent || '';
                const innerHTML = body.innerHTML || '';
                
                // Check for unresolved interpolations
                const hasUnresolved = textContent.includes('{{record.') || textContent.includes('{{faixa.') || 
                                     innerHTML.includes('{{record.') || innerHTML.includes('{{faixa.');
                
                // Check specific rendered content
                const titleEl = document.querySelector('.h4');
                const titleText = titleEl ? titleEl.textContent.trim() : '';
                const titleHasData = titleText && titleText.length > 0 && !titleText.includes('{{');
                
                const tableRows = document.querySelectorAll('tbody tr');
                const hasRows = tableRows.length > 0;
                let rowHasData = false;
                if (hasRows) {
                    const firstRow = tableRows[0];
                    const rowText = firstRow.textContent || '';
                    rowHasData = rowText.length > 0 && !rowText.includes('{{') && !rowText.includes('Nenhuma faixa');
                }
                
                return {
                    hasUnresolved,
                    titleHasData,
                    titleText: titleText.substring(0, 150),
                    hasRows,
                    rowHasData,
                    rowCount: tableRows.length
                };
            });
            
            if (finalCheck.hasUnresolved || !finalCheck.titleHasData || !finalCheck.rowHasData) {
                console.log('⚠️  Verificação final detectou problemas:');
                console.log('   - Interpolações não resolvidas:', finalCheck.hasUnresolved);
                console.log('   - Título com dados:', finalCheck.titleHasData, '| Texto:', finalCheck.titleText);
                console.log('   - Linhas na tabela:', finalCheck.hasRows, '| Contagem:', finalCheck.rowCount);
                console.log('   - Linhas com dados:', finalCheck.rowHasData);
                
                // Force one more application with aggressive re-compilation
                await page.evaluate((additionalData) => {
                    const body = document.body;
                    const injector = angular.element(body).injector();
                    if (injector) {
                        const $rootScope = injector.get('$rootScope');
                        const $compile = injector.get('$compile');
                        
                        if (additionalData && additionalData.faixas) {
                            // Find all controller elements
                            const elements = document.querySelectorAll('[ng-controller="imposto.FaixaCtrl"]');
                            elements.forEach(el => {
                                const scope = angular.element(el).scope();
                                if (scope) {
                                    // Deep clone data
                                    scope.faixas = JSON.parse(JSON.stringify(additionalData.faixas));
                                    if (additionalData.imposto) {
                                        scope.record = JSON.parse(JSON.stringify(additionalData.imposto));
                                    }
                                    scope.viewState = 'edit';
                                    
                                    // Find and re-compile ng-repeat elements
                                    const repeatElements = el.querySelectorAll('[ng-repeat*="faixa in faixas"]');
                                    repeatElements.forEach(repeatEl => {
                                        const repeatScope = angular.element(repeatEl).scope();
                                        if (repeatScope && repeatScope.$parent) {
                                            repeatScope.$parent.faixas = scope.faixas;
                                            repeatScope.$parent.record = scope.record;
                                            repeatScope.$parent.viewState = 'edit';
                                        }
                                    });
                                    
                                    // Re-compile entire controller element
                                    if ($compile) {
                                        // Remove old compiled content markers
                                        el.removeAttribute('ng-scope');
                                        // Re-compile
                                        $compile(el)(scope);
                                    }
                                    
                                    // Force digest
                                    if (!scope.$$phase && !scope.$root.$$phase) {
                                        scope.$apply();
                                    }
                                    
                                    // Also force digest on parent scopes
                                    let parentScope = scope.$parent;
                                    while (parentScope && parentScope !== scope.$root) {
                                        if (!parentScope.$$phase) {
                                            parentScope.$apply();
                                        }
                                        parentScope = parentScope.$parent;
                                    }
                                }
                            });
                            
                            // Force root scope digest
                            if ($rootScope && !$rootScope.$$phase) {
                                $rootScope.$apply();
                            }
                            
                            // Wait a bit for Angular to process
                            return true;
                        }
                    }
                    return false;
                }, additionalData);
                
                await new Promise(resolve => setTimeout(resolve, 1500));
            } else {
                console.log('✅ Verificação final: tudo OK');
            }
            
            // Fallback: Always replace interpolations directly in DOM as safety measure
            // This runs for ALL templates, not just when problems are detected
            if (hasAngularTemplates && includeAngular && additionalData) {
                console.log('🔄 Aplicando fallback preventivo para garantir resolução de interpolações...');
                await page.evaluate((additionalData) => {
                    const body = document.body;
                    const textContent = body.textContent || '';
                    const innerHTML = body.innerHTML || '';
                    
                    // Always apply fallback to ensure interpolations are resolved
                    const hasUnresolved = textContent.includes('{{record.') || textContent.includes('{{faixa.') || 
                                         innerHTML.includes('{{record.') || innerHTML.includes('{{faixa.');
                    
                    console.log('Aplicando fallback preventivo: garantindo que interpolações estão resolvidas');
                    console.log('Tem interpolações não resolvidas?', hasUnresolved);
                    
                    // Replace record interpolations
                    if (additionalData.imposto) {
                        const record = additionalData.imposto;
                        const recordDesc = record.descricao || '';
                        const recordCodigo = record.codigo || '';
                        
                        console.log('Substituindo record.descricao por:', recordDesc);
                        console.log('Substituindo record.codigo por:', recordCodigo);
                        
                        // Replace in all text nodes (more aggressive)
                        const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, null, false);
                        const textNodes = [];
                        let node;
                        while (node = walker.nextNode()) {
                            if (node.textContent && (node.textContent.includes('{{record.') || node.textContent.includes('{{faixa.'))) {
                                textNodes.push(node);
                            }
                        }
                        
                        textNodes.forEach(textNode => {
                            let text = textNode.textContent;
                            text = text.replace(/\{\{record\.codigo\}\}/g, recordCodigo);
                            text = text.replace(/\{\{record\.descricao\}\}/g, recordDesc);
                            textNode.textContent = text;
                        });
                        
                        // Replace in HTML (more aggressive - replace in all elements)
                        const allElements = body.querySelectorAll('*');
                        allElements.forEach(el => {
                            if (el.innerHTML && el.innerHTML.includes('{{record.')) {
                                el.innerHTML = el.innerHTML
                                    .replace(/\{\{record\.codigo\}\}/g, recordCodigo)
                                    .replace(/\{\{record\.descricao\}\}/g, recordDesc);
                            }
                        });
                        
                        // Also replace in body innerHTML as final fallback
                        body.innerHTML = body.innerHTML
                            .replace(/\{\{record\.codigo\}\}/g, recordCodigo)
                            .replace(/\{\{record\.descricao\}\}/g, recordDesc);
                    }
                        
                        // Replace records in list tables (for tabelapreco and other list views)
                        if (additionalData.records && additionalData.records.length > 0) {
                            console.log('Processando lista de records:', additionalData.records.length, 'registros');
                            
                            // Try to find tbody with md-body or regular tbody
                            let tbody = body.querySelector('tbody[md-body]');
                            if (!tbody) {
                                tbody = body.querySelector('tbody');
                            }
                            
                            if (tbody) {
                                console.log('Tbody encontrado');
                                
                                // Find the ng-repeat element (template row)
                                let repeatElement = tbody.querySelector('tr[md-row][ng-repeat*="record in records"]');
                                if (!repeatElement) {
                                    repeatElement = tbody.querySelector('tr[ng-repeat*="record in records"]');
                                }
                                
                                if (repeatElement) {
                                    console.log('Template row encontrado');
                                    
                                    // Get the template HTML
                                    const templateHTML = repeatElement.outerHTML;
                                    console.log('Template HTML:', templateHTML.substring(0, 200));
                                    
                                    // Clear existing rows except the "no data" row
                                    const existingRows = tbody.querySelectorAll('tr');
                                    existingRows.forEach(row => {
                                        const ngIf = row.getAttribute('ng-if');
                                        if (!ngIf || !ngIf.includes('records.length')) {
                                            row.remove();
                                        }
                                    });
                                    
                                    // Create new rows for each record
                                    additionalData.records.forEach((record, index) => {
                                        const tr = document.createElement('tr');
                                        
                                        // Copy attributes from template
                                        if (repeatElement.hasAttribute('md-row')) {
                                            tr.setAttribute('md-row', '');
                                        }
                                        
                                        // Replace interpolations in template
                                        let rowHTML = templateHTML;
                                        rowHTML = rowHTML.replace(/\{\{record\.codigo\}\}/g, record.codigo || '');
                                        rowHTML = rowHTML.replace(/\{\{record\.nome\s*\|\s*uppercase\}\}/g, (record.nome || '').toUpperCase());
                                        rowHTML = rowHTML.replace(/\{\{record\.nome\}\}/g, record.nome || '');
                                        rowHTML = rowHTML.replace(/ng-repeat="[^"]*"/g, ''); // Remove ng-repeat attribute
                                        
                                        // Parse the HTML
                                        const tempDiv = document.createElement('div');
                                        tempDiv.innerHTML = rowHTML;
                                        const templateRow = tempDiv.querySelector('tr');
                                        if (templateRow) {
                                            // Copy all cells
                                            Array.from(templateRow.querySelectorAll('td')).forEach((td, tdIndex) => {
                                                const newTd = document.createElement('td');
                                                if (td.hasAttribute('md-cell')) {
                                                    newTd.setAttribute('md-cell', '');
                                                }
                                                newTd.innerHTML = td.innerHTML;
                                                tr.appendChild(newTd);
                                            });
                                        } else {
                                            // Fallback: create cells manually
                                            const td1 = document.createElement('td');
                                            td1.setAttribute('md-cell', '');
                                            td1.textContent = record.codigo || '';
                                            tr.appendChild(td1);
                                            
                                            const td2 = document.createElement('td');
                                            td2.setAttribute('md-cell', '');
                                            td2.textContent = (record.nome || '').toUpperCase();
                                            tr.appendChild(td2);
                                            
                                            const td3 = document.createElement('td');
                                            td3.setAttribute('md-cell', '');
                                            td3.className = 'action';
                                            td3.innerHTML = '<md-icon ui-sref="app.pay-tabelapreco-show({id: ' + record.id + '})" acl="f-tabela_preco-show">visibility</md-icon><md-icon ui-sref="app.pay-tabelapreco-edit({id: ' + record.id + '})" acl="f-tabela_preco-show">edit</md-icon><md-icon ng-click="remove(' + record.id + ')" acl="f-tabela_preco-remove">delete</md-icon>';
                                            tr.appendChild(td3);
                                        }
                                        
                                        // Insert before the "no data" row if it exists
                                        const noDataRow = tbody.querySelector('tr[ng-if*="records.length"]');
                                        if (noDataRow) {
                                            tbody.insertBefore(tr, noDataRow);
                                        } else {
                                            tbody.appendChild(tr);
                                        }
                                    });
                                    
                                    console.log('Criadas', additionalData.records.length, 'linhas na tabela');
                                } else {
                                    console.log('Template row não encontrado, criando linhas manualmente');
                                    // Fallback: create rows manually
                                    const existingRows = tbody.querySelectorAll('tr');
                                    existingRows.forEach(row => {
                                        const ngIf = row.getAttribute('ng-if');
                                        if (!ngIf || !ngIf.includes('records.length')) {
                                            row.remove();
                                        }
                                    });
                                    
                                    additionalData.records.forEach(record => {
                                        const tr = document.createElement('tr');
                                        tr.setAttribute('md-row', '');
                                        
                                        const td1 = document.createElement('td');
                                        td1.setAttribute('md-cell', '');
                                        td1.textContent = record.codigo || '';
                                        tr.appendChild(td1);
                                        
                                        const td2 = document.createElement('td');
                                        td2.setAttribute('md-cell', '');
                                        td2.textContent = (record.nome || '').toUpperCase();
                                        tr.appendChild(td2);
                                        
                                        const td3 = document.createElement('td');
                                        td3.setAttribute('md-cell', '');
                                        td3.className = 'action';
                                        td3.innerHTML = '<md-icon ui-sref="app.pay-tabelapreco-show({id: ' + record.id + '})" acl="f-tabela_preco-show">visibility</md-icon><md-icon ui-sref="app.pay-tabelapreco-edit({id: ' + record.id + '})" acl="f-tabela_preco-show">edit</md-icon><md-icon ng-click="remove(' + record.id + ')" acl="f-tabela_preco-remove">delete</md-icon>';
                                        tr.appendChild(td3);
                                        
                                        tbody.appendChild(tr);
                                    });
                                    
                                    console.log('Criadas', additionalData.records.length, 'linhas manualmente');
                                }
                            } else {
                                console.log('Tbody não encontrado');
                            }
                        }
                        
                        // Replace faixa interpolations in table
                        if (additionalData.faixas && additionalData.faixas.length > 0) {
                            const tbody = body.querySelector('tbody');
                            if (tbody) {
                                // Clear existing rows except the "no data" row
                                const existingRows = tbody.querySelectorAll('tr[ng-repeat]');
                                existingRows.forEach(row => row.remove());
                                
                                // Create new rows for each faixa
                                additionalData.faixas.forEach(faixa => {
                                    const tr = document.createElement('tr');
                                    tr.innerHTML = `
                                        <td>${faixa.volume_minimo}</td>
                                        <td>${faixa.volume_maximo}</td>
                                        <td>${faixa.percentual}</td>
                                        <td>
                                            <i class="fa fa-edit" tooltip="Editar" ng-if="viewState == 'edit'" ng-click="abreModalFaixa(faixa)"></i>
                                            <i class="fa fa-trash m-l-xs cursor" tooltip="Excluir" ng-if="viewState == 'edit'" ng-click="remove(${faixa.id})"></i>
                                        </td>
                                    `;
                                    tbody.insertBefore(tr, tbody.querySelector('tr[ng-if]'));
                                });
                            }
                            
                            // Replace modal interpolations and fill form fields
                            const modalBody = body.querySelector('.modal-body');
                            if (modalBody) {
                                console.log('Processando modal-body...');
                                // Replace record.descricao in h4
                                const h4Element = modalBody.querySelector('h4');
                                if (h4Element) {
                                    const originalHTML = h4Element.innerHTML;
                                    if (additionalData.imposto && additionalData.imposto.descricao) {
                                        h4Element.innerHTML = originalHTML.replace(/\{\{record\.descricao\}\}/g, additionalData.imposto.descricao);
                                        console.log('Substituído {{record.descricao}} no h4 por:', additionalData.imposto.descricao);
                                    } else {
                                        // Remove interpolation if no data
                                        h4Element.innerHTML = originalHTML.replace(/\{\{record\.descricao\}\}/g, '');
                                    }
                                }
                                
                                // Fill form fields with first faixa data
                                if (additionalData.faixas && additionalData.faixas.length > 0) {
                                    const firstFaixa = additionalData.faixas[0];
                                    const volumeMinInput = modalBody.querySelector('#volume_minimo');
                                    const volumeMaxInput = modalBody.querySelector('#volume_maximo');
                                    const percentualInput = modalBody.querySelector('#percentual');
                                    
                                    if (volumeMinInput && firstFaixa.volume_minimo !== undefined) {
                                        volumeMinInput.value = firstFaixa.volume_minimo;
                                        volumeMinInput.setAttribute('value', firstFaixa.volume_minimo);
                                        // Trigger input event for AngularJS
                                        volumeMinInput.dispatchEvent(new Event('input', { bubbles: true }));
                                        console.log('Preenchido volume_minimo:', firstFaixa.volume_minimo);
                                    }
                                    if (volumeMaxInput && firstFaixa.volume_maximo !== undefined) {
                                        volumeMaxInput.value = firstFaixa.volume_maximo;
                                        volumeMaxInput.setAttribute('value', firstFaixa.volume_maximo);
                                        volumeMaxInput.dispatchEvent(new Event('input', { bubbles: true }));
                                        console.log('Preenchido volume_maximo:', firstFaixa.volume_maximo);
                                    }
                                    if (percentualInput && firstFaixa.percentual !== undefined) {
                                        percentualInput.value = firstFaixa.percentual;
                                        percentualInput.setAttribute('value', firstFaixa.percentual);
                                        percentualInput.dispatchEvent(new Event('input', { bubbles: true }));
                                        console.log('Preenchido percentual:', firstFaixa.percentual);
                                    }
                                }
                            }
                        }
                        
                        return {
                            replaced: true,
                            hasUnresolved: textContent.includes('{{record.') || textContent.includes('{{faixa.') || 
                                         innerHTML.includes('{{record.') || innerHTML.includes('{{faixa.')
                        };
                }, additionalData);
                
                console.log('✅ Fallback aplicado');
                
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
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

