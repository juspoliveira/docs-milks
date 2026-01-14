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
 * Fetch data from MySQL database using MCP
 * This function can be called with pre-fetched data or will attempt to load from a temp file
 * @param {Object} config - Configuration object with database settings
 * @param {Array} preFetchedData - Optional pre-fetched data from MCP (passed by external caller)
 * @returns {Promise<Array|null>} Array of records or null if failed
 */
async function fetchDataFromMCP(config, preFetchedData = null) {
    if (!config.database?.useMCP) {
        return null;
    }

    // Verificar se é para valores da tabela de preços (não formatar como folha)
    const isValoresTabela = config.htmlPath && config.htmlPath.includes('tabelapreco.valor.tab');
    
    // Se dados já foram pré-carregados, usar diretamente
    if (preFetchedData && Array.isArray(preFetchedData)) {
        console.log(`   ✅ Usando ${preFetchedData.length} registros pré-carregados do MCP`);
        // Para valores da tabela, retornar dados sem formatação
        if (isValoresTabela) {
            return preFetchedData;
        }
        return formatMCPData(preFetchedData);
    }

    // Tentar carregar de arquivo temporário (criado por chamada MCP externa)
    const { join } = await import('path');
    const tempDataPath = join(projectRoot, 'content-metadata', '.mcp-temp-data.json');
    
    if (existsSync(tempDataPath)) {
        try {
            console.log('   🔍 Carregando dados do MCP via arquivo temporário...');
            const tempData = JSON.parse(readFileSync(tempDataPath, 'utf-8'));
            if (tempData && Array.isArray(tempData.result)) {
                // Para valores da tabela, retornar dados sem formatação
                if (isValoresTabela) {
                    return tempData.result;
                }
                const formatted = formatMCPData(tempData.result);
                // NÃO deletar arquivo temporário aqui - será usado durante o processamento
                // O arquivo será limpo no final do processamento se necessário
                return formatted;
            }
        } catch (error) {
            console.warn(`   ⚠️  Erro ao carregar dados temporários: ${error.message}`);
        }
    }

    console.warn('   ⚠️  MCP não disponível diretamente. Use arquivo JSON como fallback.');
    return null;
}

/**
 * Format MCP query results to expected format
 * @param {Array} records - Raw records from MCP query
 * @returns {Array} Formatted records
 */
function formatMCPData(records) {
    if (!Array.isArray(records) || records.length === 0) {
        return [];
    }

    console.log(`   📊 Formatando ${records.length} registros do MCP...`);
    
    return records.map(record => ({
        id: record.id,
        referencia: record.referencia || '',
        dt_inicio_fornecimento: record.dt_inicio_fornecimento ? 
            (typeof record.dt_inicio_fornecimento === 'string' && record.dt_inicio_fornecimento.includes('T') ?
                record.dt_inicio_fornecimento.split('T')[0] :
                new Date(record.dt_inicio_fornecimento).toISOString().split('T')[0]) : null,
        dt_fim_fornecimento: record.dt_fim_fornecimento ? 
            (typeof record.dt_fim_fornecimento === 'string' && record.dt_fim_fornecimento.includes('T') ?
                record.dt_fim_fornecimento.split('T')[0] :
                new Date(record.dt_fim_fornecimento).toISOString().split('T')[0]) : null,
        consolidacao: record.consolidacao || '',
        fornecedores: parseInt(record.fornecedores) || 0,
        volume: parseFloat(record.volume) || 0,
        total_fornecimento: parseFloat(record.total_fornecimento) || 0,
        preco_medio: parseFloat(record.preco_medio) || 0,
        status: record.status || 'A',
        simulacao: record.simulacao !== undefined ? String(record.simulacao) : '0'
    }));
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
    if (config.database?.enabled) {
        let dataLoaded = false;
        
        // Tentar buscar via MCP primeiro se habilitado
        if (config.database?.useMCP) {
            try {
                const mcpData = await fetchDataFromMCP(config);
                if (mcpData && Array.isArray(mcpData) && mcpData.length > 0) {
                    // Verificar se é estrutura de valores da tabela de preços
                    if (config.htmlPath && config.htmlPath.includes('tabelapreco.valor.tab')) {
                        // Formatar dados para valores da tabela de preços
                        const valores = mcpData.map(v => {
                            return {
                            id: v.id || null,
                            codigo: v.codigo || null,
                            ano: v.ano ? parseInt(v.ano) : null,
                            mes: v.mes ? parseInt(v.mes) : null,
                            valor: v.valor ? parseFloat(v.valor) : 0
                        };
                        });
                        
                        // Pegar dados da tabela do primeiro registro
                        const record = mcpData.length > 0 ? {
                            id: mcpData[0].tabela_preco_id || 5,
                            codigo: mcpData[0].tabela_codigo || null,
                            nome: mcpData[0].tabela_nome || 'Tabela de Preços'
                        } : { id: 5, codigo: null, nome: 'CEPEA' };
                        
                        additionalData.valores = valores;
                        additionalData.record = record;
                        dataLoaded = true;
                        console.log(`   ✅ Carregados ${valores.length} valores do banco via MCP para tabela "${record.nome}"`);
                    } else {
                        additionalData.records = mcpData;
                        dataLoaded = true;
                        console.log(`   ✅ Carregados ${mcpData.length} registros do banco via MCP`);
                    }
                }
            } catch (error) {
                console.warn(`   ⚠️  Erro ao buscar dados via MCP: ${error.message}`);
            }
        }
        
        // Fallback para arquivo JSON se MCP não retornou dados
        if (!dataLoaded && config.database?.dataFile) {
        const dataPath = resolve(projectRoot, config.database.dataFile);
        if (existsSync(dataPath)) {
            try {
                const dataContent = readFileSync(dataPath, 'utf-8');
                const data = JSON.parse(dataContent);
                
                    // Verificar se é array direto (para folha, tabelapreco, etc)
                    if (Array.isArray(data)) {
                        additionalData.records = data;
                        console.log(`   📊 Carregados ${data.length} registros do arquivo de dados (fallback)`);
                        dataLoaded = true;
                    } else if (data.records && Array.isArray(data.records)) {
                        // Estrutura com objeto contendo records
                        additionalData.records = data.records;
                        console.log(`   📊 Carregados ${data.records.length} registros do arquivo de dados (fallback)`);
                        dataLoaded = true;
                    } else if (data.imposto && data.faixas) {
                        // Verificar se é estrutura de faixas (com imposto e faixas)
                    additionalData.imposto = data.imposto;
                    additionalData.faixas = Array.isArray(data.faixas) ? data.faixas : [data.faixas];
                        console.log(`   📊 Carregados dados do imposto "${data.imposto.descricao}" com ${additionalData.faixas.length} faixas (fallback)`);
                        dataLoaded = true;
                    
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
                    } else if (data.record && data.valores) {
                        // Estrutura de valores (com record e valores)
                        additionalData.record = data.record;
                        additionalData.valores = Array.isArray(data.valores) ? data.valores : [data.valores];
                        console.log(`   📊 Carregados dados da tabela "${data.record.nome}" com ${additionalData.valores.length} valores (fallback)`);
                        dataLoaded = true;
                        
                        // Adicionar ng-controller para valores se não tiver
                    if (!formHTML.includes('ng-controller="tabelapreco.ValorCtrl"') && formHTML.includes('ng-repeat="valor in valores"')) {
                        // Adicionar ng-controller ao primeiro div com class wrapper-sm ou ng-controller
                        formHTML = formHTML.replace(/<div([^>]*ng-controller="tabelapreco\.ValorCtrl"[^>]*class="[^"]*wrapper-sm[^"]*")/i, '<div$1');
                        if (!formHTML.includes('ng-controller="tabelapreco.ValorCtrl"')) {
                            formHTML = formHTML.replace(/<div([^>]*class="[^"]*wrapper-sm[^"]*")/i, '<div$1 ng-controller="tabelapreco.ValorCtrl"');
                        }
                        console.log('   ✅ Adicionado ng-controller="tabelapreco.ValorCtrl"');
                        }
                    } else if (data.record && data.registro) {
                        // Estrutura de modal de valores (com record e registro)
                        additionalData.record = data.record;
                        additionalData.registro = data.registro;
                        console.log(`   📊 Carregados dados do modal para tabela "${data.record.nome}" (fallback)`);
                        dataLoaded = true;
                        
                        // Adicionar ng-controller para modal de valores se não tiver
                    if (!formHTML.includes('ng-controller="tabelapreco.ValorModalCtrl"') && formHTML.includes('ng-model="registro.')) {
                        // Adicionar ng-controller ao form
                        if (formHTML.includes('<form')) {
                            formHTML = formHTML.replace(/<form([^>]*name="forms\.modal")/i, '<form$1 ng-controller="tabelapreco.ValorModalCtrl"');
                        } else {
                            formHTML = formHTML.replace(/<div([^>]*class="[^"]*modal-body[^"]*")/i, '<div$1 ng-controller="tabelapreco.ValorModalCtrl"');
                        }
                        console.log('   ✅ Adicionado ng-controller="tabelapreco.ValorModalCtrl"');
                        }
                } else if (data.record && data.pagamentos && Array.isArray(data.pagamentos)) {
                    // Estrutura de aba de pagamentos (com record, estatisticasFolha e pagamentos)
                    additionalData.record = data.record;
                    additionalData.estatisticasFolha = data.estatisticasFolha || {};
                    additionalData.pagamentos = data.pagamentos || [];
                    console.log(`   📊 Carregados dados da aba de pagamentos "${data.record.referencia || 'Folha'}" com ${additionalData.pagamentos.length} pagamentos (fallback)`);
                    dataLoaded = true;
                    
                    // Adicionar ng-controller para aba de pagamentos
                    if (!formHTML.includes('ng-controller="folha.pagamento.ListCtrl"') && formHTML.includes('ng-repeat="pagamento in')) {
                        const controllerName = 'folha.pagamento.ListCtrl';
                        
                        // Adicionar ng-controller ao wrapper-xs ou primeiro div
                        if (formHTML.includes('<div') && formHTML.includes('wrapper-xs') && !formHTML.includes('ng-controller')) {
                            formHTML = formHTML.replace(/<div([^>]*class="[^"]*wrapper-xs[^"]*")/i, `<div$1 ng-controller="${controllerName}"`);
                            console.log(`   ✅ Adicionado ng-controller="${controllerName}" ao wrapper-xs`);
                        } else if (formHTML.includes('<div') && !formHTML.includes('ng-controller')) {
                            formHTML = formHTML.replace(/<div([^>]*class="[^"]*")/i, `<div$1 ng-controller="${controllerName}"`);
                            console.log(`   ✅ Adicionado ng-controller="${controllerName}" ao primeiro div`);
                        }
                    }
                } else if (data.record && (data.consolidacoes || data.statusFolha || data.tiposFolha)) {
                    // Estrutura de formulário de folha (com record e opções)
                    additionalData.record = data.record;
                    additionalData.consolidacoes = data.consolidacoes || [];
                    additionalData.statusFolha = data.statusFolha || [];
                    additionalData.tiposFolha = data.tiposFolha || [];
                    additionalData.tiposDataCorte = data.tiposDataCorte || [];
                    console.log(`   📊 Carregados dados do formulário de folha "${data.record.referencia || data.record.codigo || 'Nova folha'}" (fallback)`);
                    dataLoaded = true;
                    
                    // Adicionar ng-controller para formulário de folha
                    if (!formHTML.includes('ng-controller="folha.') && formHTML.includes('name="forms.folha"')) {
                        // Detectar se é criação ou edição baseado na presença de id
                        let controllerName = 'folha.CreateCtrl';
                        if (data.record.id) {
                            controllerName = 'folha.EditCtrl';
                        }
                        
                        // Adicionar ng-controller ao form ou panel-body
                        if (formHTML.includes('<form') && !formHTML.includes('ng-controller')) {
                            formHTML = formHTML.replace(/<form([^>]*name="forms\.folha")/i, `<form$1 ng-controller="${controllerName}"`);
                            console.log(`   ✅ Adicionado ng-controller="${controllerName}" ao form`);
                        } else if (formHTML.includes('<div') && formHTML.includes('panel-body') && !formHTML.includes('ng-controller')) {
                            formHTML = formHTML.replace(/<div([^>]*class="[^"]*panel-body[^"]*")/i, `<div$1 ng-controller="${controllerName}"`);
                            console.log(`   ✅ Adicionado ng-controller="${controllerName}" ao panel-body`);
                        }
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
                        console.log(`   📊 Carregados ${additionalData.records.length} registros do arquivo de dados (fallback)`);
                        dataLoaded = true;
                    
                    // Adicionar ng-controller diretamente no HTML se houver dados
                    if (additionalData.records.length > 0 && formHTML.includes('ng-repeat="record in records')) {
                        // Detectar qual controller usar baseado no caminho do HTML
                        let controllerName = 'ajusteacordo.AcordoListCtrl'; // padrão
                        if (config.htmlPath && config.htmlPath.includes('tabelapreco')) {
                            controllerName = 'tabelapreco.ListCtrl';
                        } else if (config.htmlPath && config.htmlPath.includes('folha')) {
                            controllerName = 'folha.ListCtrl';
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
    const wrapInModal = config.wrapInModal === true;
    
    // Função para converter Material Design para HTML padrão
    function convertMaterialDesignToStandardHTML(html) {
        // Converter md-table-container para div
        html = html.replace(/<md-table-container>/g, '<div class="table-responsive">');
        html = html.replace(/<\/md-table-container>/g, '</div>');
        
        // Converter md-table para table padrão
        html = html.replace(/<table\s+md-table>/g, '<table class="table table-striped">');
        
        // Converter md-head para thead
        html = html.replace(/<thead\s+md-head[^>]*>/g, '<thead>');
        
        // Converter md-body para tbody (manter todas as linhas já criadas)
        html = html.replace(/<tbody\s+md-body[^>]*>/g, '<tbody>');
        html = html.replace(/<tbody[^>]*>/g, '<tbody>'); // Também converter tbody sem md-body
        
        // Converter md-row para tr (remover atributo mas manter a tag)
        html = html.replace(/<tr\s+md-row[^>]*>/g, (match) => {
            // Remover apenas md-row, manter outros atributos
            return match.replace(/\s+md-row/g, '');
        });
        
        // Converter md-column para th (remover atributos md-* mas manter outros)
        html = html.replace(/<th\s+md-column([^>]*)>/g, (match, attrs) => {
            // Manter apenas atributos não-md
            const cleanAttrs = attrs.replace(/\s+md-[^\s=]+(="[^"]*")?/g, '').trim();
            return `<th${cleanAttrs ? ' ' + cleanAttrs : ''}>`;
        });
        
        // Converter md-cell para td (remover atributo mas manter classe e outros atributos)
        html = html.replace(/<td\s+md-cell([^>]*)>/g, (match, attrs) => {
            // Remover md-cell mas manter outros atributos como class
            const cleanAttrs = attrs.replace(/\s+md-cell/g, '').trim();
            return `<td${cleanAttrs ? ' ' + cleanAttrs : ''}>`;
        });
        
        // Converter md-icon para span com classe material-icons (já deve estar convertido no pré-processamento)
        // Mas fazer novamente para garantir
        html = html.replace(/<md-icon([^>]*)>([\s\S]*?)<\/md-icon>/g, (match, attrs, content) => {
            // Remover atributos AngularJS que não são necessários para renderização
            const cleanAttrs = attrs
                .replace(/\s+ui-sref="[^"]*"/g, '')
                .replace(/\s+ng-click="[^"]*"/g, '')
                .replace(/\s+acl="[^"]*"/g, '')
                .trim();
            const iconContent = content.trim();
            // Adicionar classe action-icon para facilitar seleção
            const iconClass = 'material-icons action-icon';
            return `<span class="${iconClass}"${cleanAttrs ? ' ' + cleanAttrs : ''} style="font-family: Material Icons; cursor: pointer; color: #666; display: inline-block; margin: 0 4px;">${iconContent}</span>`;
        });
        
        return html;
    }
    
    // Pre-processar HTML para criar linhas da tabela ANTES da conversão (Abordagem 2)
    // Isso garante que o template seja encontrado antes da conversão remover atributos
    
    // Processar ng-repeat-start/end para aba de pagamentos
    if (additionalData.pagamentos && additionalData.pagamentos.length > 0 && (formHTML.includes('ng-repeat-start="pagamento in') || formHTML.includes('ng-repeat-start=\'pagamento in'))) {
        console.log('🔄 Pré-processando HTML para criar linhas da tabela de pagamentos (ng-repeat-start/end)...');
        console.log(`   📊 Total de pagamentos: ${additionalData.pagamentos.length}`);
        
        // Encontrar o tbody que contém o ng-repeat-start
        let tbodyStartRegex = /<tbody[^>]*md-body[^>]*>/;
        let tbodyMatch = formHTML.match(tbodyStartRegex);
        if (!tbodyMatch) {
            tbodyStartRegex = /<tbody[^>]*>/;
            tbodyMatch = formHTML.match(tbodyStartRegex);
        }
        
        if (tbodyMatch) {
            const tbodyStartIndex = formHTML.indexOf(tbodyMatch[0]);
            const tbodyStartTag = tbodyMatch[0];
            
            // Encontrar o conteúdo do tbody até o próximo </tbody>
            let tbodyEndIndex = formHTML.indexOf('</tbody>', tbodyStartIndex);
            if (tbodyEndIndex === -1) {
                tbodyEndIndex = formHTML.indexOf('</tbody>', tbodyStartIndex + tbodyStartTag.length);
            }
            
            if (tbodyEndIndex !== -1) {
                const tbodyContent = formHTML.substring(tbodyStartIndex + tbodyStartTag.length, tbodyEndIndex);
                console.log(`   📋 Tbody encontrado, tamanho do conteúdo: ${tbodyContent.length} caracteres`);
                
                // Encontrar o template de linha com ng-repeat-start (mais flexível)
                // Pode ter aspas simples ou duplas, e pode ter espaços extras
                const trStartRegex = /<tr[^>]*ng-repeat-start\s*=\s*["']pagamento\s+in\s+resultadosFiltrados[^>]*>([\s\S]*?)<\/tr>[\s\S]*?<tr[^>]*ng-repeat-end[^>]*>([\s\S]*?)<\/tr>/;
                let trMatch = tbodyContent.match(trStartRegex);
                
                if (!trMatch) {
                    // Tentar com regex mais flexível
                    const trStartRegex2 = /<tr[^>]*ng-repeat-start[^>]*pagamento[^>]*in[^>]*resultadosFiltrados[^>]*>([\s\S]*?)<\/tr>[\s\S]*?<tr[^>]*ng-repeat-end[^>]*>([\s\S]*?)<\/tr>/;
                    trMatch = tbodyContent.match(trStartRegex2);
                }
                
                if (trMatch) {
                    const headerRowHTML = trMatch[1]; // Linha de cabeçalho do produtor
                    const dataRowHTML = trMatch[2];   // Linha de dados do pagamento
                    
                    console.log(`   📊 Encontrado template de pagamento. Criando ${additionalData.pagamentos.length} linhas...`);
                    console.log(`   📋 Tamanho do headerRow: ${headerRowHTML.length} caracteres`);
                    console.log(`   📋 Tamanho do dataRow: ${dataRowHTML.length} caracteres`);
                    
                    // Criar novas linhas para cada pagamento
                    let newRowsHTML = '';
                    for (let i = 0; i < additionalData.pagamentos.length; i++) {
                        const pagamento = additionalData.pagamentos[i];
                        
                        // Processar linha de cabeçalho (nome do produtor, badges, etc.)
                        let headerRow = headerRowHTML;
                        headerRow = headerRow.replace(/\{\{pagamento\.nomeProdutor\}\}/g, pagamento.nomeProdutor || '');
                        headerRow = headerRow.replace(/\{\{pagamento\.produtor\}\}/g, pagamento.produtor || '');
                        headerRow = headerRow.replace(/\{\{pagamento\.fazenda\}\}/g, pagamento.fazenda || '');
                        headerRow = headerRow.replace(/\{\{pagamento\.modelo\}\}/g, pagamento.modelo || '');
                        headerRow = headerRow.replace(/\{\{pagamento\.preco_medio\s*\|\s*number:3\}\}/g, (pagamento.preco_medio || 0).toFixed(3));
                        headerRow = headerRow.replace(/\{\{pagamento\.preco_medio\s*\|\|\s*0\s*\|\s*number:3\}\}/g, (pagamento.preco_medio || 0).toFixed(3));
                        headerRow = headerRow.replace(/\{\{pagamento\.codigo_erro[^}]*\}\}/g, ''); // Remover condições de erro
                        
                        // Processar linha de dados (valores)
                        let dataRow = dataRowHTML;
                        dataRow = dataRow.replace(/\{\{pagamento\.volume\s*\|\s*number:0\}\}/g, (pagamento.volume || 0).toLocaleString('pt-BR'));
                        dataRow = dataRow.replace(/\{\{pagamento\.volume\s*\|\|\s*0\s*\|\s*number:0\}\}/g, (pagamento.volume || 0).toLocaleString('pt-BR'));
                        dataRow = dataRow.replace(/\{\{pagamento\.total_fornecimento[^}]*\}\}/g, new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pagamento.total_fornecimento || 0));
                        dataRow = dataRow.replace(/\{\{pagamento\.total_credito[^}]*\}\}/g, new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pagamento.total_credito || 0));
                        // Substituir total_impostodeducao (usar total_deducao dos dados)
                        dataRow = dataRow.replace(/\{\{pagamento\.total_impostodeducao[^}]*\}\}/g, new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pagamento.total_deducao || pagamento.total_impostodeducao || 0));
                        dataRow = dataRow.replace(/\{\{pagamento\.total_deducao[^}]*\}\}/g, new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pagamento.total_deducao || 0));
                        dataRow = dataRow.replace(/\{\{pagamento\.total_pagamento[^}]*\}\}/g, new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pagamento.total_pagamento || 0));
                        
                        // Remover ng-repeat-start e ng-repeat-end e outros atributos AngularJS
                        headerRow = headerRow.replace(/\s+ng-repeat-start\s*=\s*["'][^"']*["']/g, '');
                        headerRow = headerRow.replace(/\s+ng-repeat-end/g, '');
                        headerRow = headerRow.replace(/\s+ng-if="[^"]*"/g, ''); // Remover ng-if condicionais
                        headerRow = headerRow.replace(/\s+ng-if='[^']*'/g, ''); // Remover ng-if com aspas simples
                        dataRow = dataRow.replace(/\s+ng-repeat-end/g, '');
                        dataRow = dataRow.replace(/\s+ng-if="[^"]*"/g, ''); // Remover ng-if condicionais
                        dataRow = dataRow.replace(/\s+ng-if='[^']*'/g, ''); // Remover ng-if com aspas simples
                        dataRow = dataRow.replace(/\s+ng-click="[^"]*"/g, ''); // Remover ng-click
                        dataRow = dataRow.replace(/\s+uib-tooltip="[^"]*"/g, ''); // Remover tooltips
                        
                        // Remover atributos md-* que podem causar problemas
                        headerRow = headerRow.replace(/\s+md-row/g, '');
                        headerRow = headerRow.replace(/\s+md-cell/g, '');
                        dataRow = dataRow.replace(/\s+md-row/g, '');
                        dataRow = dataRow.replace(/\s+md-cell/g, '');
                        
                        // Converter md-icon para span
                        headerRow = headerRow.replace(/<md-icon([^>]*)>([\s\S]*?)<\/md-icon>/g, (match, attrs, content) => {
                            return `<span class="material-icons action-icon" style="font-family: Material Icons; cursor: pointer; color: #666; display: inline-block; margin: 0 4px;">${content.trim()}</span>`;
                        });
                        dataRow = dataRow.replace(/<md-icon([^>]*)>([\s\S]*?)<\/md-icon>/g, (match, attrs, content) => {
                            return `<span class="material-icons action-icon" style="font-family: Material Icons; cursor: pointer; color: #666; display: inline-block; margin: 0 4px;">${content.trim()}</span>`;
                        });
                        
                        // Converter md-button para button
                        dataRow = dataRow.replace(/<md-button([^>]*)>([\s\S]*?)<\/md-button>/g, '<button$1>$2</button>');
                        
                        newRowsHTML += `<tr>${headerRow}</tr>\n<tr>${dataRow}</tr>\n`;
                    }
                    
                    // Remover o tbody com ng-if="results.length == 0" se existir (para não mostrar mensagem vazia)
                    formHTML = formHTML.replace(/<tbody[^>]*ng-if\s*=\s*["']results\.length\s*==\s*0["'][^>]*>[\s\S]*?<\/tbody>/g, '');
                    
                    // Substituir o conteúdo do tbody
                    const newTbodyContent = newRowsHTML;
                    formHTML = formHTML.substring(0, tbodyStartIndex + tbodyStartTag.length) + 
                               newTbodyContent + 
                               formHTML.substring(tbodyEndIndex);
                    
                    // Remover COMPLETAMENTE o ng-repeat-start original do HTML para evitar que o AngularJS tente processá-lo novamente
                    // Remover toda a estrutura ng-repeat-start/end que ainda possa existir
                    formHTML = formHTML.replace(/<tr[^>]*ng-repeat-start\s*=\s*["']pagamento\s+in\s+resultadosFiltrados[^>]*>[\s\S]*?<\/tr>\s*<tr[^>]*ng-repeat-end[^>]*>[\s\S]*?<\/tr>/g, '');
                    formHTML = formHTML.replace(/<tr[^>]*ng-repeat-start[^>]*>[\s\S]*?<\/tr>\s*<tr[^>]*ng-repeat-end[^>]*>[\s\S]*?<\/tr>/g, '');
                    // Remover também qualquer referência isolada
                    formHTML = formHTML.replace(/\s+ng-repeat-start\s*=\s*["'][^"']*["']/g, '');
                    formHTML = formHTML.replace(/\s+ng-repeat-end/g, '');
                    
                    console.log(`   ✅ ${additionalData.pagamentos.length} linhas de pagamento criadas`);
                    console.log(`   📊 Total de caracteres nas linhas: ${newRowsHTML.length}`);
                } else {
                    console.log('   ⚠️ Template ng-repeat-start/end não encontrado no formato esperado');
                    console.log(`   📋 Primeiros 500 caracteres do tbody: ${tbodyContent.substring(0, 500)}`);
                }
            }
        }
    }
    
    // Processar ng-repeat para valores da tabela de preços
    if (additionalData.valores && additionalData.valores.length > 0 && formHTML.includes('ng-repeat="valor in valores"')) {
        console.log('🔄 Pré-processando HTML para criar linhas da tabela de valores...');
        console.log(`   📊 Total de valores: ${additionalData.valores.length}`);
        
        // Encontrar o tbody que contém o ng-repeat
        let tbodyStartRegex = /<tbody[^>]*>/;
        let tbodyMatch = formHTML.match(tbodyStartRegex);
        
        if (tbodyMatch) {
            const tbodyStartIndex = formHTML.indexOf(tbodyMatch[0]);
            const tbodyStartTag = tbodyMatch[0];
            
            // Encontrar o conteúdo do tbody até o próximo </tbody>
            let tbodyEndIndex = formHTML.indexOf('</tbody>', tbodyStartIndex);
            if (tbodyEndIndex === -1) {
                tbodyEndIndex = formHTML.indexOf('</tbody>', tbodyStartIndex + tbodyStartTag.length);
            }
            
            if (tbodyEndIndex !== -1) {
                const tbodyContent = formHTML.substring(tbodyStartIndex + tbodyStartTag.length, tbodyEndIndex);
                console.log(`   📋 Tbody encontrado, tamanho do conteúdo: ${tbodyContent.length} caracteres`);
                
                // Encontrar o template de linha com ng-repeat
                const trRegex = /<tr[^>]*ng-repeat\s*=\s*["']valor\s+in\s+valores["'][^>]*>([\s\S]*?)<\/tr>/;
                let trMatch = tbodyContent.match(trRegex);
                
                if (!trMatch) {
                    // Tentar com regex mais flexível
                    const trRegex2 = /<tr[^>]*ng-repeat[^>]*valor[^>]*in[^>]*valores[^>]*>([\s\S]*?)<\/tr>/;
                    trMatch = tbodyContent.match(trRegex2);
                }
                
                if (trMatch) {
                    const templateRowHTML = trMatch[1];
                    console.log(`   📊 Encontrado template de valor. Criando ${additionalData.valores.length} linhas...`);
                    console.log(`   📋 Tamanho do template: ${templateRowHTML.length} caracteres`);
                    console.log(`   📋 Template (primeiros 300 chars): ${templateRowHTML.substring(0, 300)}`);
                    
                    // Criar novas linhas para cada valor - construir diretamente sem depender do template
                    let newRowsHTML = '';
                    for (let i = 0; i < additionalData.valores.length; i++) {
                        const valor = additionalData.valores[i];
                        
                        // Valores formatados
                        const codigoVal = valor.codigo || '';
                        const anoVal = String(valor.ano || '');
                        const mesVal = String(valor.mes || '');
                        const valorFormatado = valor.valor ? parseFloat(valor.valor).toFixed(4).replace(/\.?0+$/, '') : '0';
                        
                        // Construir linha diretamente com os valores (sem quebras de linha extras)
                        // Garantir que os valores sejam inseridos corretamente
                        const row = `<td style="padding: 12px; border-bottom: 1px solid #eee;">${codigoVal}</td><td style="padding: 12px; border-bottom: 1px solid #eee;">${anoVal}</td><td style="padding: 12px; border-bottom: 1px solid #eee;">${mesVal}</td><td style="padding: 12px; border-bottom: 1px solid #eee;">${valorFormatado}</td><td style="padding: 12px; border-bottom: 1px solid #eee; width:70px;"><i class="fa fa-edit" tooltip="Editar" style="cursor: pointer; margin-right: 8px;"></i><i class="fa fa-trash m-l-xs cursor" tooltip="Excluir" style="cursor: pointer;"></i></td>`;
                        
                        newRowsHTML += `<tr style="display: table-row; visibility: visible; opacity: 1;">${row}</tr>`;
                    }
                    
                    console.log(`   ✅ ${additionalData.valores.length} linhas de valores criadas`);
                    console.log(`   📊 Primeira linha (primeiros 300 chars): ${newRowsHTML.substring(0, 300)}`);
                    
                    // Remover o tbody com ng-if="valores.length == 0" se existir
                    formHTML = formHTML.replace(/<tr[^>]*ng-if\s*=\s*["']valores\.length\s*==\s*0["'][^>]*>[\s\S]*?<\/tr>/g, '');
                    
                    // Substituir o conteúdo do tbody
                    const newTbodyContent = newRowsHTML;
                    formHTML = formHTML.substring(0, tbodyStartIndex + tbodyStartTag.length) + 
                               newTbodyContent + 
                               formHTML.substring(tbodyEndIndex);
                    
                    // Remover COMPLETAMENTE o ng-repeat original do HTML
                    formHTML = formHTML.replace(/<tr[^>]*ng-repeat\s*=\s*["']valor\s+in\s+valores["'][^>]*>[\s\S]*?<\/tr>/g, '');
                    formHTML = formHTML.replace(/\s+ng-repeat\s*=\s*["']valor\s+in\s+valores["']/g, '');
                    
                    // Substituir também record.codigo e record.nome no cabeçalho
                    if (additionalData.record) {
                        formHTML = formHTML.replace(/\{\{record\.codigo\}\}/g, additionalData.record.codigo || '');
                        formHTML = formHTML.replace(/\{\{record\.nome\}\}/g, additionalData.record.nome || '');
                    }
                    
                    console.log(`   ✅ ${additionalData.valores.length} linhas de valores criadas`);
                    console.log(`   📊 Total de caracteres nas linhas: ${newRowsHTML.length}`);
                } else {
                    console.log('   ⚠️ Template ng-repeat="valor in valores" não encontrado no formato esperado');
                    console.log(`   📋 Primeiros 500 caracteres do tbody: ${tbodyContent.substring(0, 500)}`);
                }
            }
        }
    }
    
    // Processar ng-repeat normal para outras tabelas
    if (additionalData.records && additionalData.records.length > 0 && formHTML.includes('ng-repeat="record in records"')) {
        console.log('🔄 Pré-processando HTML para criar linhas da tabela...');
        
        // Encontrar o tbody que contém o ng-repeat (pode ser md-body ou não)
        let tbodyStartRegex = /<tbody[^>]*md-body[^>]*>/;
        let tbodyMatch = formHTML.match(tbodyStartRegex);
        if (!tbodyMatch) {
            // Tentar sem md-body
            tbodyStartRegex = /<tbody[^>]*>/;
            tbodyMatch = formHTML.match(tbodyStartRegex);
        }
        
        if (tbodyMatch) {
            const tbodyStartIndex = formHTML.indexOf(tbodyMatch[0]);
            const tbodyStartTag = tbodyMatch[0];
            
            // Encontrar o conteúdo do tbody até o próximo </tbody>
            let tbodyEndIndex = formHTML.indexOf('</tbody>', tbodyStartIndex);
            if (tbodyEndIndex === -1) {
                // Tentar encontrar qualquer </tbody>
                tbodyEndIndex = formHTML.indexOf('</tbody>', tbodyStartIndex + tbodyStartTag.length);
            }
            
            if (tbodyEndIndex !== -1) {
                const tbodyContent = formHTML.substring(tbodyStartIndex + tbodyStartTag.length, tbodyEndIndex);
                
                // Encontrar o template de linha dentro do tbody
                // Após conversão, pode ser <tr> ou <tr md-row>
                const trStartRegex = /<tr[^>]*ng-repeat\s*=\s*["']record\s+in\s+records["'][^>]*>/;
                let trMatch = tbodyContent.match(trStartRegex);
                if (!trMatch) {
                    // Tentar sem md-row (após conversão)
                    const trStartRegex2 = /<tr[^>]*ng-repeat[^>]*record[^>]*in[^>]*records[^>]*>/;
                    trMatch = tbodyContent.match(trStartRegex2);
                }
                
                if (trMatch) {
                    const trStartIndex = tbodyContent.indexOf(trMatch[0]);
                    const trStartTag = trMatch[0];
                    
                    // Encontrar o fechamento desta linha </tr>
                    const trEndIndex = tbodyContent.indexOf('</tr>', trStartIndex);
                    
                    if (trEndIndex !== -1) {
                        const templateRow = tbodyContent.substring(trStartIndex, trEndIndex + 5); // +5 para incluir </tr>
                        console.log('Template row encontrado, tamanho:', templateRow.length);
                        console.log('Template row completo:', templateRow);
                        
                        let rowsHTML = '';
                        
                        additionalData.records.forEach((record, index) => {
                            // Fazer substituições preservando toda a estrutura
                            let rowHTML = templateRow;
                            
                            // Remover ng-repeat primeiro
                            rowHTML = rowHTML.replace(/ng-repeat\s*=\s*["'][^"']*["']/g, '');
                            
                            // Substituir interpolações - usar replace global para pegar todas as ocorrências
                            rowHTML = rowHTML.replace(/\{\{record\.codigo\}\}/g, record.codigo || '');
                            rowHTML = rowHTML.replace(/\{\{record\.nome\s*\|\s*uppercase\}\}/g, (record.nome || '').toUpperCase());
                            rowHTML = rowHTML.replace(/\{\{record\.nome\}\}/g, record.nome || '');
                            rowHTML = rowHTML.replace(/\{\{record\.id\}\}/g, record.id || '');
                            
                            // Substituir campos específicos da folha
                            rowHTML = rowHTML.replace(/\{\{record\.referencia\}\}/g, record.referencia || '');
                            rowHTML = rowHTML.replace(/\{\{record\.consolidacao\}\}/g, record.consolidacao || '');
                            rowHTML = rowHTML.replace(/\{\{record\.fornecedores\}\}/g, record.fornecedores || 0);
                            rowHTML = rowHTML.replace(/\{\{record\.volume\s*\|\s*number:0\}\}/g, (record.volume || 0).toLocaleString('pt-BR'));
                            rowHTML = rowHTML.replace(/\{\{record\.volume\s*\|\|\s*0\s*\|\s*number:0\}\}/g, (record.volume || 0).toLocaleString('pt-BR'));
                            rowHTML = rowHTML.replace(/\{\{record\.total_fornecimento\s*\|\s*currency\}\}/g, new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(record.total_fornecimento || 0));
                            rowHTML = rowHTML.replace(/\{\{record\.total_fornecimento\s*\|\|\s*0\s*\|\s*currency\}\}/g, new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(record.total_fornecimento || 0));
                            rowHTML = rowHTML.replace(/\{\{record\.preco_medio\s*\|\s*number:3\}\}/g, (record.preco_medio || 0).toFixed(3));
                            rowHTML = rowHTML.replace(/\{\{record\.preco_medio\s*\|\|\s*0\s*\|\s*number:3\}\}/g, (record.preco_medio || 0).toFixed(3));
                            
                            // Substituir datas com formato (corrigir timezone)
                            if (record.dt_inicio_fornecimento) {
                                // Usar apenas a data sem considerar timezone
                                const dateStr = record.dt_inicio_fornecimento.split('T')[0]; // YYYY-MM-DD
                                const [year, month, day] = dateStr.split('-');
                                const dtInicioStr = `${day}/${month}/${year}`;
                                rowHTML = rowHTML.replace(/\{\{record\.dt_inicio_fornecimento\s*\|\s*amDateFormat:'DD\/MM\/YYYY'\}\}/g, dtInicioStr);
                            }
                            if (record.dt_fim_fornecimento) {
                                // Usar apenas a data sem considerar timezone
                                const dateStr = record.dt_fim_fornecimento.split('T')[0]; // YYYY-MM-DD
                                const [year, month, day] = dateStr.split('-');
                                const dtFimStr = `${day}/${month}/${year}`;
                                rowHTML = rowHTML.replace(/\{\{record\.dt_fim_fornecimento\s*\|\s*amDateFormat:'DD\/MM\/YYYY'\}\}/g, dtFimStr);
                            }
                            
                            // Substituir interpolações dentro de atributos (ex: ui-sref)
                            rowHTML = rowHTML.replace(/\{id:\s*record\.id\}/g, `{id: ${record.id}}`);
                            rowHTML = rowHTML.replace(/\{id:\s*record\.id,\s*tipo:record\.simulacao\}/g, `{id: ${record.id}, tipo: ${record.simulacao || 0}}`);
                            
                            // Converter md-icon para span.material-icons.action-icon no pré-processamento
                            // Usar regex mais robusto que captura múltiplas linhas
                            rowHTML = rowHTML.replace(/<md-icon([^>]*)>([\s\S]*?)<\/md-icon>/g, (match, attrs, content) => {
                                const cleanAttrs = attrs
                                    .replace(/\s+ui-sref="[^"]*"/g, '')
                                    .replace(/\s+ng-click="[^"]*"/g, '')
                                    .replace(/\s+acl="[^"]*"/g, '')
                                    .trim();
                                const iconContent = content.trim();
                                return `<span class="material-icons action-icon"${cleanAttrs ? ' ' + cleanAttrs : ''} style="font-family: Material Icons; cursor: pointer; color: #666; display: inline-block; margin: 0 4px;">${iconContent}</span>`;
                            });
                            
                            rowsHTML += rowHTML;
                        });
                        
                        // Substituir o conteúdo do tbody: manter a tag de abertura, substituir o conteúdo, manter a tag de fechamento
                        const newTbodyContent = rowsHTML;
                        const beforeTbody = formHTML.substring(0, tbodyStartIndex + tbodyStartTag.length);
                        const afterTbody = formHTML.substring(tbodyEndIndex);
                        formHTML = beforeTbody + newTbodyContent + afterTbody;
                        
                        // Remover o tbody com ng-if="records.length == 0" se existir
                        formHTML = formHTML.replace(/<tbody[^>]*ng-if\s*=\s*["']records\.length\s*==\s*0["'][^>]*>[\s\S]*?<\/tbody>/g, '');
                        
                        console.log(`✅ Criadas ${additionalData.records.length} linhas no HTML`);
                        console.log(`📊 Total de caracteres nas linhas: ${rowsHTML.length}`);
                        console.log(`📊 Primeira linha (primeiros 500 chars): ${rowsHTML.substring(0, 500)}`);
                        // Verificar se dados reais foram substituídos
                        const hasRealData = rowsHTML.includes('OUTUBRO') || rowsHTML.includes('589') || rowsHTML.includes('516498');
                        console.log(`📊 Dados reais encontrados nas linhas: ${hasRealData ? 'SIM ✅' : 'NÃO ❌'}`);
                        if (!hasRealData && additionalData.records.length > 0) {
                            console.log(`⚠️ ATENÇÃO: Linhas criadas mas dados não foram substituídos!`);
                            console.log(`📊 Primeiro registro:`, JSON.stringify(additionalData.records[0], null, 2));
                        }
                    } else {
                        console.log('⚠️ Fechamento </tr> não encontrado no template');
                    }
                } else {
                    console.log('⚠️ Template row com ng-repeat não encontrado no tbody');
                }
            } else {
                console.log('⚠️ Fechamento </tbody> não encontrado');
            }
        } else {
            console.log('⚠️ Tbody não encontrado');
        }
    }
    
    // Converter Material Design para HTML padrão DEPOIS do pré-processamento (Abordagem 1)
    // Isso garante que as linhas já foram criadas antes da conversão
    if (formHTML.includes('md-table') || formHTML.includes('md-icon') || formHTML.includes('md-row') || formHTML.includes('md-cell')) {
        console.log('🔄 Convertendo elementos Material Design para HTML padrão (após pré-processamento)...');
        formHTML = convertMaterialDesignToStandardHTML(formHTML);
        // Verificar se ainda há elementos Material Design
        if (formHTML.includes('md-')) {
            console.log('⚠️ Ainda há elementos Material Design após conversão, tentando novamente...');
            formHTML = convertMaterialDesignToStandardHTML(formHTML);
        }
    }
    
    // Se for modal, envolver o HTML em estrutura de modal Bootstrap
    let finalFormHTML = formHTML;
    if (wrapInModal && !formHTML.includes('<div class="modal')) {
        finalFormHTML = `<div class="modal" style="display: block; position: relative;">
    <div class="modal-dialog" style="margin: 20px auto; width: 600px;">
        <div class="modal-content">
            ${formHTML}
        </div>
    </div>
</div>`;
    }
    
    // A conversão já foi feita após o pré-processamento, então não precisa fazer novamente
    
    const initialHTML = createFullHTML(finalFormHTML, title, [], customStyles, includeAngular);
    const tempHTMLPath = join(projectRoot, "temp-form.html");
    writeFileSync(tempHTMLPath, initialHTML, 'utf-8');
    console.log(`✅ HTML temporário criado: ${tempHTMLPath}`);
    console.log(`📊 Tamanho do HTML: ${initialHTML.length} caracteres`);
    console.log(`📊 HTML contém card-group: ${initialHTML.includes('card-group')}`);
    console.log(`📊 HTML contém tbody: ${initialHTML.includes('<tbody')}`);
    console.log(`📊 HTML contém ng-controller: ${initialHTML.includes('ng-controller')}`);
    
    // Carregar HTML
    const fileUrl = `file://${tempHTMLPath}`;
    console.log(`📖 Carregando HTML: ${fileUrl}`);
    await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Verificar erros do console
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        if (type === 'error') {
            console.error(`   🚨 Erro no console: ${text}`);
        } else if (text.includes('Error') || text.includes('error')) {
            console.warn(`   ⚠️  Aviso no console: ${text}`);
        }
    });
    
    page.on('pageerror', error => {
        console.error(`   🚨 Erro na página: ${error.message}`);
    });
    
    // Verificar se o conteúdo foi carregado
    const pageContent = await page.evaluate(() => {
        return {
            bodyHTML: document.body ? document.body.innerHTML.substring(0, 500) : 'NO BODY',
            hasCardGroup: !!document.querySelector('.card-group'),
            hasTbody: !!document.querySelector('tbody'),
            hasController: !!document.querySelector('[ng-controller]'),
            bodyText: document.body ? document.body.textContent.substring(0, 200) : 'NO BODY',
            bodyLength: document.body ? document.body.innerHTML.length : 0,
            angularExists: typeof angular !== 'undefined',
            readyState: document.readyState
        };
    });
    console.log(`📊 Conteúdo da página após carregamento:`);
    console.log(`   - Body HTML length: ${pageContent.bodyLength}`);
    console.log(`   - Body HTML (primeiros 500 chars): ${pageContent.bodyHTML.substring(0, 200)}...`);
    console.log(`   - Tem card-group: ${pageContent.hasCardGroup}`);
    console.log(`   - Tem tbody: ${pageContent.hasTbody}`);
    console.log(`   - Tem ng-controller: ${pageContent.hasController}`);
    console.log(`   - AngularJS existe: ${pageContent.angularExists}`);
    console.log(`   - Ready state: ${pageContent.readyState}`);
    console.log(`   - Body text (primeiros 200 chars): ${pageContent.bodyText}`);
    
    if (pageContent.bodyLength === 0) {
        console.error('   🚨 ERRO: Body está vazio! Verificando se o HTML foi carregado...');
        const htmlContent = await page.content();
        console.log(`   📊 HTML completo length: ${htmlContent.length}`);
        console.log(`   📊 HTML contém body: ${htmlContent.includes('<body')}`);
        console.log(`   📊 HTML contém card-group: ${htmlContent.includes('card-group')}`);
    }
    
    // additionalData já foi carregado acima
    
    // Para aba de pagamentos, garantir que as linhas criadas manualmente não sejam removidas pelo AngularJS
    if (additionalData.pagamentos && additionalData.pagamentos.length > 0) {
        await page.evaluate(() => {
            // Remover qualquer ng-repeat-start/end que ainda esteja no HTML para evitar que o AngularJS tente processá-lo
            const body = document.body;
            const allElements = body.querySelectorAll('*');
            allElements.forEach(el => {
                if (el.hasAttribute('ng-repeat-start')) {
                    el.removeAttribute('ng-repeat-start');
                }
                if (el.hasAttribute('ng-repeat-end')) {
                    el.removeAttribute('ng-repeat-end');
                }
            });
            
            // Garantir que as linhas da tabela estejam visíveis
            const tbody = body.querySelector('tbody');
            if (tbody) {
                const rows = tbody.querySelectorAll('tr');
                rows.forEach(row => {
                    row.style.display = 'table-row';
                    row.style.visibility = 'visible';
                    row.style.opacity = '1';
                });
                console.log(`✅ ${rows.length} linhas da tabela garantidas como visíveis`);
            }
        });
    }
    
    // Processar templates AngularJS se necessário
    if (hasAngularTemplates && includeAngular) {
        await processAngularTemplates(page, additionalData);
        // Aguardar um pouco mais para garantir renderização completa
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Para aba de pagamentos, garantir que os cards sejam visíveis
        if (additionalData.pagamentos && additionalData.pagamentos.length > 0) {
            await page.evaluate(() => {
                // Remover ng-if que pode estar ocultando os cards
                const ngIfElements = document.querySelectorAll('[ng-if="!isCalculating"]');
                ngIfElements.forEach(el => {
                    el.style.display = 'block';
                    el.style.visibility = 'visible';
                    el.style.opacity = '1';
                });
                
                // Garantir que o card-group esteja visível
                const cardGroup = document.querySelector('.card-group');
                if (cardGroup) {
                    cardGroup.style.display = 'flex';
                    cardGroup.style.visibility = 'visible';
                    cardGroup.style.opacity = '1';
                    
                    const cards = cardGroup.querySelectorAll('.card');
                    cards.forEach(card => {
                        card.style.display = 'block';
                        card.style.visibility = 'visible';
                        card.style.opacity = '1';
                    });
                }
            });
        }
        
        // Para aba de pagamentos, garantir que as linhas criadas manualmente sejam preservadas
        if (additionalData.pagamentos && additionalData.pagamentos.length > 0) {
            await page.evaluate((pagamentos) => {
                const body = document.body;
                const tbody = body.querySelector('tbody');
                
                if (tbody) {
                    const rows = tbody.querySelectorAll('tr');
                    console.log(`📊 Linhas encontradas após processamento AngularJS: ${rows.length}`);
                    
                    // Se não há linhas mas há dados, recriar as linhas
                    if (rows.length === 0 && pagamentos && pagamentos.length > 0) {
                        console.log('⚠️ Nenhuma linha encontrada, mas há dados. Verificando se o tbody está vazio...');
                        
                        // Verificar se o tbody tem conteúdo
                        const tbodyContent = tbody.innerHTML.trim();
                        if (tbodyContent.length === 0 || tbodyContent.includes('ng-repeat')) {
                            console.log('⚠️ Tbody está vazio ou ainda tem ng-repeat. As linhas foram removidas pelo AngularJS.');
                            console.log(`   Tentando recriar ${pagamentos.length} linhas manualmente...`);
                            
                            // Recriar TODAS as linhas para visualização
                            pagamentos.forEach((pagamento, index) => {
                                if (index >= 5) return; // Limitar a 5 linhas para a imagem
                                
                                const headerRow = document.createElement('tr');
                                headerRow.innerHTML = `
                                    <td colspan="6" style="text-align: left;height: 20px; background-color: #e7e7e7;color: #666666;font-weight: bold;padding-right: 10px;">
                                        <div class="pull-left p-t-xs">
                                            ${pagamento.nomeProdutor || 'PRODUTOR'}&nbsp;
                                            <span class="label label-default"><i class="fa fa-user"></i> ${pagamento.produtor || ''}</span>
                                            ${pagamento.fazenda ? `<span class="label label-default"><i class="fa fa-home"></i> ${pagamento.fazenda}</span>` : ''}
                                            <span class="label label-primary">${pagamento.modelo || ''}&nbsp;</span>
                                            <span class="label label-info"><i class="fa fa-tint"></i> R$ ${(pagamento.preco_medio || 0).toFixed(3)}&nbsp;</span>
                                        </div>
                                    </td>
                                `;
                                
                                const dataRow = document.createElement('tr');
                                const totalDeducao = pagamento.total_deducao || pagamento.total_impostodeducao || 0;
                                dataRow.innerHTML = `
                                    <td>
                                        <button class="btn btn-sm btn-default" style="width: 100%; font-size: 14px; text-align: center">
                                            <span><i class="fa fa-tint"></i> ${(pagamento.volume || 0).toLocaleString('pt-BR')} L</span>
                                        </button>
                                    </td>
                                    <td style="text-align: right;">
                                        <button class="btn btn-sm btn-info" style="width: 100%; font-size: 14px; text-align: center">
                                            <i class="fas fa-coins"></i> ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pagamento.total_fornecimento || 0)}
                                        </button>
                                    </td>
                                    <td style="text-align: right;">
                                        <button class="btn btn-sm btn-default" style="width: 100%; font-size: 14px; text-align: center">
                                            <span style="color: #0d47a1;"><i class="fa fa-plus-circle"></i> ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pagamento.total_credito || 0)}</span>
                                        </button>
                                    </td>
                                    <td style="text-align: right;">
                                        <button class="btn btn-sm btn-default" style="width: 100%;font-size: 14px; text-align: center">
                                            <span style="color: #ac2925;"> <i class="fa fa-minus-circle"></i> ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDeducao)}</span>
                                        </button>
                                    </td>
                                    <td style="text-align: right;width: 100px;">
                                        <button class="btn btn-sm ${(pagamento.total_pagamento || 0) >= 0 ? 'btn-success' : 'btn-danger'}" style="font-size: 14px;width: 100%;text-align: center;">
                                            <i class="fa fa-${(pagamento.total_pagamento || 0) >= 0 ? 'plus' : 'minus'}-circle"></i> &nbsp;${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pagamento.total_pagamento || 0)}
                                        </button>
                                    </td>
                                    <td style="padding: 0px 0px 0px 0px;">
                                        <div class="row" style="margin-left: 0px;margin-right: 0px;">
                                            <div class="col-sm-6" style="padding: 0px;">
                                                <button class="md-icon-button" style="border: none; background: none; cursor: pointer;">
                                                    <span class="material-icons action-icon" style="font-family: Material Icons; cursor: pointer; color: #666; display: inline-block; margin: 0 4px; font-size: 24px;">calculate</span>
                                                </button>
                                            </div>
                                            <div class="col-sm-6" style="padding: 0px;">
                                                <button class="md-icon-button" style="border: none; background: none; cursor: pointer;">
                                                    <span class="material-icons action-icon" style="font-family: Material Icons; cursor: pointer; color: #666; display: inline-block; margin: 0 4px; font-size: 24px;">print</span>
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                `;
                                
                                tbody.appendChild(headerRow);
                                tbody.appendChild(dataRow);
                            });
                            
                            console.log(`✅ ${Math.min(pagamentos.length, 5)} linhas recriadas manualmente`);
                        }
                        
                        // Garantir que os cards de estatísticas sejam renderizados
                        const cardGroup = body.querySelector('.card-group');
                        if (cardGroup) {
                            const cards = cardGroup.querySelectorAll('.card .fs-widget-number-22');
                            console.log(`📊 Cards encontrados: ${cards.length}`);
                            
                            // Se não há cards ou estão vazios, criar manualmente
                            if (cards.length === 0 || Array.from(cards).every(card => !card.textContent.trim() || card.textContent.includes('{{'))) {
                                console.log('⚠️ Cards não renderizados, criando manualmente...');
                                
                                const estatisticas = pagamentos.reduce((acc, p) => {
                                    acc.totalDemonstrativos = (acc.totalDemonstrativos || 0) + 1;
                                    acc.volumeCaptado = (acc.volumeCaptado || 0) + (p.volume || 0);
                                    acc.totalBruto = (acc.totalBruto || 0) + (parseFloat(p.total_fornecimento) || 0);
                                    acc.totalLiquido = (acc.totalLiquido || 0) + (parseFloat(p.total_pagamento) || 0);
                                    return acc;
                                }, { totalDemonstrativos: 0, volumeCaptado: 0, totalBruto: 0, totalLiquido: 0 });
                                
                                estatisticas.precoMedio = estatisticas.volumeCaptado > 0 ? (estatisticas.totalBruto / estatisticas.volumeCaptado).toFixed(3) : '0.000';
                                
                                // Criar ou atualizar cards
                                const cardNumbers = cardGroup.querySelectorAll('.fs-widget-number-22');
                                if (cardNumbers.length >= 5) {
                                    cardNumbers[0].textContent = estatisticas.totalDemonstrativos;
                                    cardNumbers[1].textContent = estatisticas.volumeCaptado.toLocaleString('pt-BR') + ' L';
                                    cardNumbers[2].textContent = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(estatisticas.totalBruto);
                                    cardNumbers[3].textContent = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(estatisticas.totalLiquido);
                                    cardNumbers[4].textContent = estatisticas.precoMedio;
                                    console.log('✅ Cards atualizados manualmente');
                                }
                            }
                        }
                    } else if (rows.length > 0) {
                        // Se há linhas mas são poucas, criar mais linhas se necessário
                        if (rows.length < pagamentos.length && pagamentos.length > 0) {
                            console.log(`⚠️ Apenas ${rows.length} linhas encontradas, mas há ${pagamentos.length} pagamentos. Criando linhas adicionais...`);
                            
                            // Criar linhas adicionais a partir do índice atual
                            for (let i = rows.length / 2; i < Math.min(pagamentos.length, 5); i++) {
                                const pagamento = pagamentos[i];
                                if (!pagamento) continue;
                                
                                const headerRow = document.createElement('tr');
                                headerRow.innerHTML = `
                                    <td colspan="6" style="text-align: left;height: 20px; background-color: #e7e7e7;color: #666666;font-weight: bold;padding-right: 10px;">
                                        <div class="pull-left p-t-xs">
                                            ${pagamento.nomeProdutor || 'PRODUTOR'}&nbsp;
                                            <span class="label label-default"><i class="fa fa-user"></i> ${pagamento.produtor || ''}</span>
                                            ${pagamento.fazenda ? `<span class="label label-default"><i class="fa fa-home"></i> ${pagamento.fazenda}</span>` : ''}
                                            <span class="label label-primary">${pagamento.modelo || ''}&nbsp;</span>
                                            <span class="label label-info"><i class="fa fa-tint"></i> R$ ${(pagamento.preco_medio || 0).toFixed(3)}&nbsp;</span>
                                        </div>
                                    </td>
                                `;
                                
                                const dataRow = document.createElement('tr');
                                const totalDeducao = pagamento.total_deducao || pagamento.total_impostodeducao || 0;
                                dataRow.innerHTML = `
                                    <td>
                                        <button class="btn btn-sm btn-default" style="width: 100%; font-size: 14px; text-align: center">
                                            <span><i class="fa fa-tint"></i> ${(pagamento.volume || 0).toLocaleString('pt-BR')} L</span>
                                        </button>
                                    </td>
                                    <td style="text-align: right;">
                                        <button class="btn btn-sm btn-info" style="width: 100%; font-size: 14px; text-align: center">
                                            <i class="fas fa-coins"></i> ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pagamento.total_fornecimento || 0)}
                                        </button>
                                    </td>
                                    <td style="text-align: right;">
                                        <button class="btn btn-sm btn-default" style="width: 100%; font-size: 14px; text-align: center">
                                            <span style="color: #0d47a1;"><i class="fa fa-plus-circle"></i> ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pagamento.total_credito || 0)}</span>
                                        </button>
                                    </td>
                                    <td style="text-align: right;">
                                        <button class="btn btn-sm btn-default" style="width: 100%;font-size: 14px; text-align: center">
                                            <span style="color: #ac2925;"> <i class="fa fa-minus-circle"></i> ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDeducao)}</span>
                                        </button>
                                    </td>
                                    <td style="text-align: right;width: 100px;">
                                        <button class="btn btn-sm ${(pagamento.total_pagamento || 0) >= 0 ? 'btn-success' : 'btn-danger'}" style="font-size: 14px;width: 100%;text-align: center;">
                                            <i class="fa fa-${(pagamento.total_pagamento || 0) >= 0 ? 'plus' : 'minus'}-circle"></i> &nbsp;${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pagamento.total_pagamento || 0)}
                                        </button>
                                    </td>
                                    <td style="padding: 0px 0px 0px 0px;">
                                        <div class="row" style="margin-left: 0px;margin-right: 0px;">
                                            <div class="col-sm-6" style="padding: 0px;">
                                                <button class="md-icon-button" style="border: none; background: none; cursor: pointer;">
                                                    <span class="material-icons action-icon" style="font-family: Material Icons; cursor: pointer; color: #666; display: inline-block; margin: 0 4px; font-size: 24px;">calculate</span>
                                                </button>
                                            </div>
                                            <div class="col-sm-6" style="padding: 0px;">
                                                <button class="md-icon-button" style="border: none; background: none; cursor: pointer;">
                                                    <span class="material-icons action-icon" style="font-family: Material Icons; cursor: pointer; color: #666; display: inline-block; margin: 0 4px; font-size: 24px;">print</span>
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                `;
                                
                                tbody.appendChild(headerRow);
                                tbody.appendChild(dataRow);
                            }
                            
                            console.log(`✅ Linhas adicionais criadas`);
                        }
                    } else {
                        // Garantir que as linhas existentes estejam visíveis
                        rows.forEach(row => {
                            row.style.display = 'table-row';
                            row.style.visibility = 'visible';
                            row.style.opacity = '1';
                        });
                        console.log(`✅ ${rows.length} linhas garantidas como visíveis`);
                    }
                } else {
                    console.log('⚠️ Tbody não encontrado');
                }
            }, additionalData.pagamentos);
        }
        
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
                    
                    // Processar aba de pagamentos
                    if (additionalData && additionalData.pagamentos && Array.isArray(additionalData.pagamentos)) {
                        const pagamentoElements = document.querySelectorAll('[ng-controller="folha.pagamento.ListCtrl"]');
                        pagamentoElements.forEach(element => {
                            try {
                                const scope = angular.element(element).scope();
                                if (scope) {
                                    // Aplicar dados
                                    if (additionalData.record) {
                                        scope.record = JSON.parse(JSON.stringify(additionalData.record));
                                    }
                                    if (additionalData.estatisticasFolha) {
                                        scope.estatisticasFolha = JSON.parse(JSON.stringify(additionalData.estatisticasFolha));
                                    }
                                    if (additionalData.pagamentos) {
                                        scope.pagamentos = JSON.parse(JSON.stringify(additionalData.pagamentos));
                                        scope.resultadosFiltrados = JSON.parse(JSON.stringify(additionalData.pagamentos));
                                    }
                                    
                                    // Inicializar filtros
                                    if (!scope.filter) {
                                        scope.filter = { produtor: '' };
                                    }
                                    if (!scope.opcaoFiltro) {
                                        scope.opcaoFiltro = 'todosOsCampos';
                                    }
                                    
                                    // Garantir que viewState está definido
                                    if (!scope.viewState) {
                                        scope.viewState = 'edit';
                                    }
                                    if (scope.isCalculating === undefined) {
                                        scope.isCalculating = false;
                                    }
                                    
                                    // Force re-compilation
                                    if ($compile) {
                                        const compiled = $compile(element)(scope);
                                    }
                                    
                                    if (!scope.$$phase && !scope.$root.$$phase) {
                                        scope.$apply();
                                    }
                                    
                                    console.log('✅ Dados aplicados ao folha.pagamento.ListCtrl');
                                    console.log('   Pagamentos:', scope.pagamentos ? scope.pagamentos.length : 0);
                                    console.log('   Estatísticas:', scope.estatisticasFolha);
                                }
                            } catch (e) {
                                console.warn('Erro ao aplicar dados de pagamento:', e.message);
                            }
                        });
                    }
                    
                    // Processar faixas (mantido para compatibilidade)
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
                    }
                        
                        if ($rootScope) {
                            $rootScope.$apply();
                    }
                }
            }, additionalData);
            
            // Wait for rendering
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Verificação específica para valores da tabela de preços
            if (additionalData && additionalData.valores && Array.isArray(additionalData.valores) && config.htmlPath && config.htmlPath.includes('tabelapreco.valor.tab')) {
                const valoresCheck = await page.evaluate(() => {
                    const tableRows = document.querySelectorAll('tbody tr');
                    const rowsWithData = Array.from(tableRows).filter(row => {
                        const cells = row.querySelectorAll('td');
                        if (cells.length === 0) return false;
                        // Verificar se pelo menos uma célula tem conteúdo (não vazio e não só espaços)
                        return Array.from(cells).some(cell => {
                            const text = cell.textContent.trim();
                            return text.length > 0 && !text.includes('{{');
                        });
                    });
                    
                    // Verificar se há interpolações não resolvidas
                    const textContent = document.body.textContent || '';
                    const hasUnresolved = textContent.includes('{{valor.') || 
                                         textContent.includes('{{record.');
                    
                    return {
                        totalRows: tableRows.length,
                        rowsWithData: rowsWithData.length,
                        hasUnresolved,
                        firstRowContent: rowsWithData.length > 0 ? rowsWithData[0].textContent.trim().substring(0, 100) : ''
                    };
                });
                
                if (valoresCheck.rowsWithData === 0 || valoresCheck.hasUnresolved) {
                    console.log('⚠️  Dados de valores não renderizados corretamente, aplicando novamente...');
                    console.log(`   Linhas totais: ${valoresCheck.totalRows}, com dados: ${valoresCheck.rowsWithData}`);
                    
                    // Aplicar dados novamente e garantir que as linhas sejam visíveis
                    await page.evaluate((additionalData) => {
                        const body = document.body;
                        const injector = angular.element(body).injector();
                        if (injector) {
                            const valorElements = document.querySelectorAll('[ng-controller="tabelapreco.ValorCtrl"]');
                            valorElements.forEach(element => {
                                try {
                                    const scope = angular.element(element).scope();
                                    if (scope) {
                                        if (additionalData.record) {
                                            scope.record = JSON.parse(JSON.stringify(additionalData.record));
                                        }
                                        if (additionalData.valores) {
                                            scope.valores = JSON.parse(JSON.stringify(additionalData.valores));
                                        }
                                        scope.viewState = 'edit';
                                        
                                        if (!scope.$$phase && !scope.$root.$$phase) {
                                            scope.$apply();
                                        }
                                    }
                                } catch (e) {
                                    console.warn('Erro:', e.message);
                                }
                            });
                            
                            // Garantir que as linhas da tabela sejam visíveis
                            const tableRows = document.querySelectorAll('tbody tr');
                            tableRows.forEach(row => {
                                row.style.display = 'table-row';
                                row.style.visibility = 'visible';
                                row.style.opacity = '1';
                                row.style.height = 'auto';
                            });
                        }
                    }, additionalData);
                    
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    console.log('✅ Dados de valores renderizados corretamente');
                    console.log(`   Linhas com dados: ${valoresCheck.rowsWithData}/${valoresCheck.totalRows}`);
                    if (valoresCheck.firstRowContent) {
                        console.log(`   Primeira linha: ${valoresCheck.firstRowContent}`);
                    }
                }
            }
            
            // Verificação específica para aba de pagamentos
            if (additionalData && additionalData.pagamentos && Array.isArray(additionalData.pagamentos)) {
                const pagamentoCheck = await page.evaluate(() => {
                    const body = document.body;
                    const injector = angular.element(body).injector();
                    if (!injector) return { success: false, reason: 'No injector' };
                    
                    const pagamentoElements = document.querySelectorAll('[ng-controller="folha.pagamento.ListCtrl"]');
                    const results = [];
                    
                    pagamentoElements.forEach(element => {
                        try {
                            const scope = angular.element(element).scope();
                            if (scope) {
                                const hasRecord = scope.record && scope.record.referencia;
                                const hasEstatisticas = scope.estatisticasFolha && scope.estatisticasFolha.totalDemonstrativos !== undefined;
                                const hasPagamentos = scope.pagamentos && scope.pagamentos.length > 0;
                                const hasResultadosFiltrados = scope.resultadosFiltrados && scope.resultadosFiltrados.length > 0;
                                
                                results.push({
                                    hasRecord,
                                    hasEstatisticas,
                                    hasPagamentos,
                                    hasResultadosFiltrados,
                                    pagamentosCount: scope.pagamentos ? scope.pagamentos.length : 0,
                                    resultadosCount: scope.resultadosFiltrados ? scope.resultadosFiltrados.length : 0
                                });
                            }
                        } catch (e) {
                            results.push({ error: e.message });
                        }
                    });
                    
                    // Verificar se cards de estatísticas estão visíveis
                    const cards = document.querySelectorAll('.card-group .card');
                    const cardsWithData = Array.from(cards).filter(card => {
                        const number = card.querySelector('.fs-widget-number-22');
                        return number && number.textContent.trim() && !number.textContent.includes('{{');
                    });
                    
                    // Verificar se tabela tem linhas
                    const tableRows = document.querySelectorAll('tbody tr');
                    const hasTableRows = tableRows.length > 0;
                    
                    // Verificar se há interpolações não resolvidas
                    const textContent = document.body.textContent || '';
                    const hasUnresolved = textContent.includes('{{estatisticasFolha.') || 
                                         textContent.includes('{{pagamento.') ||
                                         textContent.includes('{{record.');
                    
                    return {
                        success: results.length > 0 && results.every(r => r.hasRecord && r.hasEstatisticas && r.hasPagamentos),
                        hasUnresolved,
                        cardsCount: cards.length,
                        cardsWithDataCount: cardsWithData.length,
                        hasTableRows,
                        tableRowsCount: tableRows.length,
                        results
                    };
                });
                
                if (!pagamentoCheck.success || pagamentoCheck.hasUnresolved) {
                    console.log('⚠️  Dados de pagamento não renderizados corretamente, aplicando novamente...');
                    console.log('   Cards:', pagamentoCheck.cardsCount, 'com dados:', pagamentoCheck.cardsWithDataCount);
                    console.log('   Linhas da tabela:', pagamentoCheck.tableRowsCount);
                    
                    // Aplicar dados novamente
                    await page.evaluate((additionalData) => {
                        const body = document.body;
                        const injector = angular.element(body).injector();
                        if (injector) {
                            const pagamentoElements = document.querySelectorAll('[ng-controller="folha.pagamento.ListCtrl"]');
                            pagamentoElements.forEach(element => {
                                try {
                                    const scope = angular.element(element).scope();
                                    if (scope) {
                                        if (additionalData.record) {
                                            scope.record = JSON.parse(JSON.stringify(additionalData.record));
                                        }
                                        if (additionalData.estatisticasFolha) {
                                            scope.estatisticasFolha = JSON.parse(JSON.stringify(additionalData.estatisticasFolha));
                                        }
                                        if (additionalData.pagamentos) {
                                            scope.pagamentos = JSON.parse(JSON.stringify(additionalData.pagamentos));
                                            scope.resultadosFiltrados = JSON.parse(JSON.stringify(additionalData.pagamentos));
                                        }
                                        
                                        // Garantir que isCalculating seja false
                                        scope.isCalculating = false;
                                        scope.isExportingDemonstrativos = false;
                                        scope.isEmitindoNfe = false;
                                        
                                        if (!scope.$$phase && !scope.$root.$$phase) {
                                            scope.$apply();
                                        }
                                        
                                        // Garantir que os cards sejam visíveis
                                        setTimeout(() => {
                                            const cardGroup = document.querySelector('.card-group');
                                            if (cardGroup) {
                                                cardGroup.style.display = 'flex';
                                                cardGroup.style.visibility = 'visible';
                                                cardGroup.style.opacity = '1';
                                            }
                                        }, 100);
                                    }
                                } catch (e) {
                                    console.warn('Erro:', e.message);
                                }
                            });
                        }
                    }, additionalData);
                    
            await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    console.log('✅ Dados de pagamento renderizados corretamente');
                    console.log(`   Cards: ${pagamentoCheck.cardsWithDataCount}/${pagamentoCheck.cardsCount}`);
                    console.log(`   Linhas da tabela: ${pagamentoCheck.tableRowsCount}`);
                }
            }
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
            
            // Para valores da tabela de preços, garantir que os dados sejam reaplicados após o AngularJS
            if (additionalData.valores && additionalData.valores.length > 0 && config.htmlPath && config.htmlPath.includes('tabelapreco.valor.tab')) {
                console.log('🔄 Reaplicando valores após processamento AngularJS...');
                await page.evaluate((valoresData, recordData) => {
                    // Aplicar dados ao controller
                    const valorElements = document.querySelectorAll('[ng-controller="tabelapreco.ValorCtrl"]');
                    valorElements.forEach(element => {
                        try {
                            const scope = angular.element(element).scope();
                            if (scope) {
                                scope.record = recordData;
                                scope.valores = valoresData;
                                scope.viewState = 'edit';
                                if (!scope.$$phase && !scope.$root.$$phase) {
                                    scope.$apply();
                                }
                            }
                        } catch (e) {
                            console.warn('Erro ao aplicar dados:', e.message);
                        }
                    });
                    
                    // Preencher células diretamente (fallback se AngularJS não renderizar)
                    const tbody = document.querySelector('tbody');
                    if (tbody) {
                        const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => !row.querySelector('th'));
                        rows.forEach((row, index) => {
                            if (valoresData[index]) {
                                const valor = valoresData[index];
                                const tds = Array.from(row.querySelectorAll('td'));
                                const codigoVal = valor.codigo || '';
                                const anoVal = String(valor.ano || '');
                                const mesVal = String(valor.mes || '');
                                const valorFormatado = valor.valor ? parseFloat(valor.valor).toFixed(4).replace(/\.?0+$/, '') : '0';
                                
                                if (tds.length >= 4) {
                                    tds[0].textContent = codigoVal;
                                    tds[1].textContent = anoVal;
                                    tds[2].textContent = mesVal;
                                    tds[3].textContent = valorFormatado;
                                }
                            }
                        });
                    }
                }, additionalData.valores, additionalData.record);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
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
        
        // Garantir que todos os md-icon sejam convertidos ANTES de adicionar badges
        const conversionResult = await page.evaluate(() => {
            const body = document.body;
            const mdIcons = body.querySelectorAll('md-icon');
            console.log('🔍 Convertendo', mdIcons.length, 'ícones md-icon antes de adicionar badges...');
            
            let convertedCount = 0;
            mdIcons.forEach((icon, index) => {
                const content = icon.textContent.trim();
                const span = document.createElement('span');
                span.className = 'material-icons action-icon';
                span.textContent = content;
                span.style.cssText = 'font-family: Material Icons; cursor: pointer; color: #666; display: inline-block; margin: 0 4px; font-size: 24px; line-height: 1;';
                if (icon.parentNode) {
                    icon.parentNode.replaceChild(span, icon);
                    convertedCount++;
                    console.log(`✅ Ícone ${index + 1} convertido: ${content}`);
                }
            });
            
            // Verificar quantos action-icon existem após conversão
            const actionIcons = body.querySelectorAll('.action-icon');
            console.log('📊 Total de action-icon após conversão:', actionIcons.length);
            
            // Verificar especificamente na primeira linha
            const firstActionCell = body.querySelector('td.action');
            let iconsInFirstCell = 0;
            if (firstActionCell) {
                const icons = firstActionCell.querySelectorAll('.action-icon');
                iconsInFirstCell = icons.length;
                console.log('📊 Ícones na primeira célula action:', iconsInFirstCell);
                icons.forEach((icon, idx) => {
                    console.log(`   Ícone ${idx + 1}: "${icon.textContent.trim()}"`);
                });
            } else {
                console.log('⚠️ Primeira célula action não encontrada');
            }
            
            console.log('✅ Conversão de ícones concluída');
            return { converted: convertedCount, total: actionIcons.length, inFirstCell: iconsInFirstCell };
        });
        
        console.log('📊 Resultado da conversão:', conversionResult);
        
        // Aguardar um pouco para garantir que a conversão foi aplicada
        await new Promise(resolve => setTimeout(resolve, 200));
        
        console.log('🔢 Iniciando adição de badges...');
        console.log(`📋 Total de elementos para processar: ${elements.length}`);
        
        const badgesAdded = await page.evaluate((elementsConfig) => {
            console.log('🔢 Dentro do page.evaluate - processando badges...');
            console.log(`📋 Total de elementos: ${elementsConfig.length}`);
            // Remover badges existentes se houver
            document.querySelectorAll('.element-number-badge').forEach(badge => badge.remove());
            
            let addedCount = 0;
            const results = [];
            const debugInfo = [];
            
            elementsConfig.forEach((element) => {
                let el = null;
                let debugMsg = '';
                
                // Para cards, garantir que os elementos sejam encontrados
                if (element.selector.includes('.card-group') || element.selector.includes('.fs-widget-number-22')) {
                    debugMsg = `Badge ${element.number}: selector="${element.selector}"`;
                    el = document.querySelector(element.selector);
                    if (!el) {
                        // Tentar encontrar de forma alternativa
                        const cardGroup = document.querySelector('.card-group');
                        if (cardGroup) {
                            const cards = cardGroup.querySelectorAll('.card');
                            if (element.number === 2 && cards[0]) {
                                el = cards[0].querySelector('.fs-widget-number-22');
                            } else if (element.number === 3 && cards[1]) {
                                el = cards[1].querySelector('.fs-widget-number-22');
                            } else if (element.number === 4 && cards[2]) {
                                el = cards[2].querySelector('.fs-widget-number-22');
                            } else if (element.number === 5 && cards[3]) {
                                el = cards[3].querySelector('.fs-widget-number-22');
                            } else if (element.number === 6 && cards[4]) {
                                el = cards[4].querySelector('.fs-widget-number-22');
                            }
                        }
                    }
                    if (el) {
                        debugMsg += ` | ✅ Encontrado: "${el.textContent.substring(0, 20)}"`;
                    } else {
                        debugMsg += ` | ✗ Não encontrado`;
                    }
                }
                // Para action-icon, sempre usar abordagem direta (não confiar em :first-of-type, etc)
                else if (element.selector.includes('action-icon')) {
                    debugMsg = `Badge ${element.number}: selector="${element.selector}"`;
                    
                    // Encontrar a segunda linha da tabela (primeira linha de dados, não header)
                    const secondRow = document.querySelector('tbody tr:nth-child(2)');
                    if (secondRow) {
                        // Tentar encontrar na última célula
                        const lastCell = secondRow.querySelector('td:last-child');
                        if (lastCell) {
                            const iconDiv = lastCell.querySelector('div');
                            if (iconDiv) {
                                const allIcons = Array.from(iconDiv.querySelectorAll('.action-icon, span.material-icons, md-icon'));
                                debugMsg += ` | Encontrados ${allIcons.length} ícones`;
                                
                                // Determinar qual ícone usar baseado no número do badge
                                // Badge 14 = primeiro ícone (recalcular pagamento)
                                // Badge 15 = segundo ícone (imprimir)
                                if (element.selector.includes('first-of-type') || element.number === 14) {
                                    el = allIcons[0] || null;
                                    debugMsg += ` | Primeiro: ${el ? `"${el.textContent.trim()}"` : 'não encontrado'}`;
                                } else if (element.selector.includes('nth-of-type(2)') || element.number === 15) {
                                    el = allIcons[1] || null;
                                    debugMsg += ` | Segundo: ${el ? `"${el.textContent.trim()}"` : 'não encontrado'}`;
                                } else if (element.selector.includes('last-of-type')) {
                                    el = allIcons[allIcons.length - 1] || null;
                                    debugMsg += ` | Último: ${el ? `"${el.textContent.trim()}"` : 'não encontrado'}`;
                                }
                            } else {
                                debugMsg += ` | ⚠️ Div de ícones não encontrada`;
                            }
                        } else {
                            debugMsg += ` | ⚠️ Última célula não encontrada`;
                        }
                    } else {
                        debugMsg += ` | ⚠️ Segunda linha não encontrada`;
                    }
                }
                // Para dropdown menu (recalcular folha)
                else if (element.selector.includes('dropdown-menu') || element.selector.includes('recalculaPagamentos')) {
                    debugMsg = `Badge ${element.number}: selector="${element.selector}"`;
                    el = document.querySelector(element.selector);
                    if (!el) {
                        // Tentar encontrar o link de recalcular folha
                        const dropdown = document.querySelector('ul.dropdown-menu');
                        if (dropdown) {
                            const links = dropdown.querySelectorAll('a');
                            links.forEach(link => {
                                if (link.getAttribute('ng-click') === 'recalculaPagamentos()') {
                                    el = link;
                                }
                            });
                        }
                    }
                    if (el) {
                        debugMsg += ` | ✅ Encontrado: "${el.textContent.trim()}"`;
                    } else {
                        debugMsg += ` | ✗ Não encontrado`;
                    }
                } else {
                    // Para outros elementos, usar o seletor original
                    el = document.querySelector(element.selector);
                }
                
                if ((element.number >= 5 && element.number <= 7) || (element.number >= 9 && element.number <= 11)) {
                    debugInfo.push(debugMsg);
                }
                
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
                    const isActionIcon = el.classList.contains('action-icon') || el.classList.contains('material-icons');
                    const isCardNumber = el.classList.contains('fs-widget-number-22');
                    
                    // Para cards (fs-widget-number-22), usar o card como container
                    if (isCardNumber) {
                        const card = el.closest('.card');
                        if (card) {
                            container = card;
                            // Garantir que o card tenha position relative
                            card.style.position = 'relative';
                            card.style.overflow = 'visible';
                            card.style.zIndex = '1';
                            
                            // Garantir que o card-body também tenha overflow visible
                            const cardBody = card.querySelector('.card-body');
                            if (cardBody) {
                                cardBody.style.position = 'relative';
                                cardBody.style.overflow = 'visible';
                            }
                            
                            // Garantir que o card-group tenha overflow visible
                            const cardGroup = card.closest('.card-group');
                            if (cardGroup) {
                                cardGroup.style.overflow = 'visible';
                                cardGroup.style.position = 'relative';
                            }
                            
                            // Garantir que o número tenha position relative
                            el.style.position = 'relative';
                            el.style.overflow = 'visible';
                        }
                    }
                    // Para action-icon, usar o próprio elemento como container (não o td.action)
                    else if (isActionIcon) {
                        container = el;
                        // Garantir que o ícone tenha position relative para o badge aparecer
                        // SEMPRE aplicar, mesmo se já tiver position relative
                        el.style.position = 'relative';
                        el.style.display = 'inline-block';
                        el.style.overflow = 'visible';
                        el.style.zIndex = '1';
                        
                        // Também garantir que o td.action tenha position relative
                        const actionCell = el.closest('td.action');
                        if (actionCell) {
                            actionCell.style.position = 'relative';
                            actionCell.style.overflow = 'visible';
                        }
                    } else if (isInput && !isCheckbox) {
                    // Para inputs, usar o form-group como container
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
                    // Especialmente importante para badges em ícones dentro de tabelas
                    if (isActionIcon) {
                        // Para action-icon, garantir overflow visible em todos os containers da tabela
                        const actionCell = el.closest('td.action');
                        const tbody = el.closest('tbody');
                        const table = el.closest('table');
                        const tableContainer = el.closest('md-table-container, .table-responsive');
                        const panel = el.closest('.panel');
                        
                        [actionCell, tbody, table, tableContainer, panel].forEach(container => {
                            if (container) {
                                container.style.overflow = 'visible';
                                container.style.overflowX = 'visible';
                                container.style.overflowY = 'visible';
                            }
                        });
                    }
                    
                    // Verificação geral para todos os containers pais
                    let parent = container.parentElement;
                    while (parent && parent !== document.body) {
                        const parentStyle = window.getComputedStyle(parent);
                        if (parentStyle.overflow === 'hidden' || parentStyle.overflowY === 'hidden' || parentStyle.overflowX === 'hidden') {
                            parent.style.overflow = 'visible';
                            parent.style.overflowX = 'visible';
                            parent.style.overflowY = 'visible';
                        }
                        parent = parent.parentElement;
                    }
                    
                    const badge = document.createElement('div');
                    badge.className = 'element-number-badge';
                    badge.setAttribute('data-number', element.number);
                    badge.textContent = element.number;
                    
                    // Para badges em cards, ajustar posicionamento
                    if (isCardNumber) {
                        badge.style.top = element.position?.top || '-12px';
                        badge.style.right = element.position?.right || '5px';
                        badge.style.zIndex = '10001'; // Mais alto que outros badges
                    }
                    
                    // Use custom position if provided, otherwise use smart defaults
                    const position = element.position || {};
                    
                    // Posicionar badges de forma que fiquem visíveis
                    if (isActionIcon) {
                        // Para action-icon, posicionar no canto superior direito do ícone
                        // Usar posição mais próxima do ícone para evitar corte por overflow
                        badge.style.top = position.top || '-5px';
                        badge.style.right = position.right || '-5px';
                        badge.style.left = 'auto';
                        badge.style.bottom = 'auto';
                        badge.style.width = '24px';
                        badge.style.height = '24px';
                        badge.style.fontSize = '14px';
                        badge.style.fontWeight = 'bold';
                        badge.style.lineHeight = '24px';
                        badge.style.zIndex = '10000';
                        badge.style.backgroundColor = '#ff4444';
                        badge.style.color = '#ffffff';
                        badge.style.borderRadius = '50%';
                        badge.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
                        badge.style.pointerEvents = 'none'; // Não interferir com cliques
                        badge.style.border = '2px solid white'; // Melhorar visibilidade
                    } else if (isCheckbox) {
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
                    
                    // Verificação de visibilidade para badges 5-7 (ícones) - fazer de forma síncrona
                    if (isActionIcon && element.number >= 5 && element.number <= 7) {
                        // Forçar reflow para garantir que o badge foi renderizado
                        void badge.offsetHeight;
                        
                        const rect = badge.getBoundingClientRect();
                        const isVisible = rect.width > 0 && rect.height > 0;
                        
                        if (!isVisible || rect.width === 0 || rect.height === 0) {
                            // Se não estiver visível, tentar ajustar posicionamento
                            badge.style.top = '0px';
                            badge.style.right = '0px';
                            // Forçar reflow novamente
                            void badge.offsetHeight;
                        }
                        
                        const finalRect = badge.getBoundingClientRect();
                        debugInfo.push(`Badge ${element.number} final: width=${finalRect.width}, height=${finalRect.height}, top=${finalRect.top}, right=${window.innerWidth - finalRect.right}, visible=${finalRect.width > 0 && finalRect.height > 0}`);
                    }
                    
                    addedCount++;
                    results.push({ number: element.number, selector: element.selector, found: true, container: container.tagName });
                } else {
                    results.push({ number: element.number, selector: element.selector, found: false });
                }
            });
            return { count: addedCount, details: results, debugInfo: debugInfo };
        }, elements);
        
        // Exibir informações de debug para badges 5-7
        if (badgesAdded.debugInfo && badgesAdded.debugInfo.length > 0) {
            console.log('📊 Debug badges 5-7:');
            badgesAdded.debugInfo.forEach(msg => console.log(`   ${msg}`));
        }
        
        console.log(`   ✅ ${badgesAdded.count} badges adicionados`);
        badgesAdded.details.forEach(detail => {
            if (detail.found) {
                console.log(`      ✓ Badge ${detail.number} adicionado: ${detail.selector}`);
            } else {
                console.log(`      ✗ Badge ${detail.number} NÃO encontrado: ${detail.selector}`);
            }
        });
        
        // Aguardar renderização dos badges e garantir que o CSS foi aplicado
        // Aumentar delay para garantir que badges em ícones sejam renderizados
        await new Promise(resolve => setTimeout(resolve, 1500));
        
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
            const finalCheck = await page.evaluate((additionalData) => {
                const body = document.body;
                const textContent = body.textContent || '';
                const innerHTML = body.innerHTML || '';
                
                // Check for unresolved interpolations (incluindo pagamento e estatisticasFolha)
                const hasUnresolved = textContent.includes('{{record.') || textContent.includes('{{faixa.') || 
                                     textContent.includes('{{pagamento.') || textContent.includes('{{estatisticasFolha.') ||
                                     innerHTML.includes('{{record.') || innerHTML.includes('{{faixa.') ||
                                     innerHTML.includes('{{pagamento.') || innerHTML.includes('{{estatisticasFolha.');
                
                // Check specific rendered content
                const titleEl = document.querySelector('.h4');
                const titleText = titleEl ? titleEl.textContent.trim() : '';
                const titleHasData = titleText && titleText.length > 0 && !titleText.includes('{{');
                
                // Verificar cards de estatísticas (para aba de pagamentos)
                const cards = document.querySelectorAll('.card-group .card .fs-widget-number-22');
                const cardsWithData = Array.from(cards).filter(card => {
                    const text = card.textContent.trim();
                    return text && text.length > 0 && !text.includes('{{');
                });
                
                // Verificar tabela
                const tableRows = document.querySelectorAll('tbody tr');
                const hasRows = tableRows.length > 0;
                let rowHasData = false;
                if (hasRows) {
                    const firstRow = tableRows[0];
                    const rowText = firstRow.textContent || '';
                    rowHasData = rowText.length > 0 && !rowText.includes('{{') && !rowText.includes('Nenhuma faixa') && !rowText.includes('Ainda não foi realizado');
                }
                
                // Verificar se é aba de pagamentos
                const isPagamentoPage = body.querySelector('[ng-controller="folha.pagamento.ListCtrl"]') !== null;
                
                return {
                    hasUnresolved,
                    titleHasData,
                    titleText: titleText.substring(0, 150),
                    hasRows,
                    rowHasData,
                    rowCount: tableRows.length,
                    isPagamentoPage,
                    cardsCount: cards.length,
                    cardsWithDataCount: cardsWithData.length
                };
            }, additionalData);
            
            // Verificação específica para aba de pagamentos
            if (finalCheck.isPagamentoPage) {
                console.log('📊 Verificação específica para aba de pagamentos:');
                console.log(`   - Cards: ${finalCheck.cardsWithDataCount}/${finalCheck.cardsCount} com dados`);
                console.log(`   - Linhas da tabela: ${finalCheck.rowCount}`);
                
                // Sempre garantir que os cards estejam visíveis e com dados
                if (finalCheck.cardsWithDataCount < 5) {
                    console.log('   ⚠️  Cards de estatísticas não renderizados completamente');
                }
                
                // Garantir que os cards sejam renderizados visualmente
                const cardsEnsured = await page.evaluate((estatisticas) => {
                    // Remover ng-if que pode estar ocultando elementos
                    const ngIfElements = document.querySelectorAll('[ng-if]');
                    ngIfElements.forEach(el => {
                        const ngIf = el.getAttribute('ng-if');
                        // Se for !isCalculating, garantir que está visível
                        if (ngIf === '!isCalculating' || ngIf.includes('!isCalculating')) {
                            el.style.display = 'block';
                            el.style.visibility = 'visible';
                            el.style.opacity = '1';
                            el.removeAttribute('ng-if');
                        }
                    });
                    
                    // Garantir que isCalculating seja false para mostrar os cards
                    const panels = document.querySelectorAll('[ng-if="!isCalculating"]');
                    panels.forEach(panel => {
                        panel.style.display = 'block';
                        panel.style.visibility = 'visible';
                        panel.style.opacity = '1';
                    });
                    
                    const cardGroup = document.querySelector('.card-group');
                    if (cardGroup) {
                        // Garantir que o card-group esteja visível
                        cardGroup.style.display = 'flex';
                        cardGroup.style.visibility = 'visible';
                        cardGroup.style.opacity = '1';
                        cardGroup.style.width = '100%';
                        cardGroup.style.marginBottom = '20px';
                        
                        const cards = cardGroup.querySelectorAll('.card');
                        console.log(`📊 Cards encontrados: ${cards.length}`);
                        cards.forEach((card, index) => {
                            card.style.display = 'block';
                            card.style.visibility = 'visible';
                            card.style.opacity = '1';
                            card.style.flex = '1';
                            card.style.margin = '0 10px';
                            card.style.background = 'white';
                            card.style.border = '1px solid #ddd';
                            card.style.borderRadius = '4px';
                            
                            const cardBody = card.querySelector('.card-body');
                            if (cardBody) {
                                cardBody.style.display = 'block';
                                cardBody.style.visibility = 'visible';
                                cardBody.style.padding = '15px';
                            }
                            
                            // Garantir que os ícones dos cards sejam visíveis
                            const icons = card.querySelectorAll('i');
                            icons.forEach(icon => {
                                icon.style.display = 'inline-block';
                                icon.style.visibility = 'visible';
                            });
                        });
                        
                        const cardNumbers = cardGroup.querySelectorAll('.fs-widget-number-22');
                        console.log(`📊 Números de cards encontrados: ${cardNumbers.length}`);
                        if (cardNumbers.length >= 5 && estatisticas) {
                            // Atualizar valores com formatação correta
                            cardNumbers[0].textContent = estatisticas.totalDemonstrativos || 0;
                            cardNumbers[0].style.display = 'block';
                            cardNumbers[0].style.visibility = 'visible';
                            cardNumbers[0].style.fontSize = '22px';
                            cardNumbers[0].style.fontWeight = 'bold';
                            cardNumbers[0].style.color = '#333';
                            
                            cardNumbers[1].textContent = (estatisticas.volumeCaptado || 0).toLocaleString('pt-BR') + ' L';
                            cardNumbers[1].style.display = 'block';
                            cardNumbers[1].style.visibility = 'visible';
                            cardNumbers[1].style.fontSize = '22px';
                            cardNumbers[1].style.fontWeight = 'bold';
                            cardNumbers[1].style.color = '#333';
                            
                            cardNumbers[2].textContent = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(estatisticas.totalBruto || 0);
                            cardNumbers[2].style.display = 'block';
                            cardNumbers[2].style.visibility = 'visible';
                            cardNumbers[2].style.fontSize = '22px';
                            cardNumbers[2].style.fontWeight = 'bold';
                            cardNumbers[2].style.color = '#333';
                            
                            cardNumbers[3].textContent = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(estatisticas.totalLiquido || 0);
                            cardNumbers[3].style.display = 'block';
                            cardNumbers[3].style.visibility = 'visible';
                            cardNumbers[3].style.fontSize = '22px';
                            cardNumbers[3].style.fontWeight = 'bold';
                            cardNumbers[3].style.color = '#333';
                            
                            cardNumbers[4].textContent = (estatisticas.precoMedio || 0).toFixed(3);
                            cardNumbers[4].style.display = 'block';
                            cardNumbers[4].style.visibility = 'visible';
                            cardNumbers[4].style.fontSize = '22px';
                            cardNumbers[4].style.fontWeight = 'bold';
                            cardNumbers[4].style.color = '#333';
                            
                            console.log('✅ Cards atualizados e garantidos como visíveis');
                            return true;
                        } else {
                            console.log(`⚠️ CardGroup ou cards não encontrados. Cards: ${cards.length}, Números: ${cardNumbers.length}`);
                            return false;
                        }
                    } else {
                        console.log('⚠️ CardGroup não encontrado no DOM');
                        return false;
                    }
                }, additionalData.estatisticasFolha);
                if (cardsEnsured) {
                    console.log('   ✅ Cards garantidos como visíveis e atualizados');
                }
                if (finalCheck.rowCount === 0 && additionalData.pagamentos && additionalData.pagamentos.length > 0) {
                    console.log('   ⚠️  Tabela de pagamentos vazia, mas há dados disponíveis');
                    console.log(`   📊 Tentando criar ${Math.min(additionalData.pagamentos.length, 5)} linhas manualmente...`);
                    // Criar linhas manualmente
                    const rowsCreated = await page.evaluate((pagamentos) => {
                        // Tentar encontrar tbody de várias formas
                        let tbody = document.querySelector('tbody');
                        if (!tbody) {
                            tbody = document.querySelector('md-table-container tbody');
                        }
                        if (!tbody) {
                            tbody = document.querySelector('.table-responsive tbody');
                        }
                        if (!tbody) {
                            tbody = document.querySelector('table tbody');
                        }
                        if (!tbody) {
                            // Tentar encontrar qualquer table e criar tbody se necessário
                            let table = document.querySelector('table') || document.querySelector('md-table-container table') || document.querySelector('md-table-container');
                            if (!table) {
                                // Criar tabela completa se não existir
                                const container = document.querySelector('md-table-container') || document.querySelector('.table-responsive') || document.body;
                                table = document.createElement('table');
                                table.className = 'table table-striped table-hover';
                                let thead = table.querySelector('thead');
                                if (!thead) {
                                    thead = document.createElement('thead');
                                    thead.innerHTML = `
                                        <tr>
                                            <th style="text-align: center;">FORNECIMENTO</th>
                                            <th style="text-align: center;">VALOR BRUTO (R$)</th>
                                            <th style="text-align: center;">CRÉDITOS (R$)</th>
                                            <th style="text-align: center;">DEDUÇÕES (R$)</th>
                                            <th style="text-align: center;">A RECEBER (R$)</th>
                                            <th style="width: 90px;"></th>
                                        </tr>
                                    `;
                                    table.appendChild(thead);
                                    console.log('📊 Thead criado dinamicamente');
                                }
                                container.appendChild(table);
                                console.log('📊 Tabela criada dinamicamente');
                            }
                            if (table) {
                                tbody = table.querySelector('tbody');
                                if (!tbody) {
                                    tbody = document.createElement('tbody');
                                    table.appendChild(tbody);
                                    console.log('📊 Tbody criado dinamicamente');
                                }
                            }
                        }
                        
                        console.log('📊 Tbody encontrado:', !!tbody);
                        console.log('📊 Pagamentos disponíveis:', pagamentos ? pagamentos.length : 0);
                        if (tbody) {
                            console.log('📊 Tbody HTML antes:', tbody.innerHTML.substring(0, 200));
                        }
                        
                        if (tbody && pagamentos && pagamentos.length > 0) {
                            console.log(`📊 Criando ${Math.min(pagamentos.length, 5)} linhas...`);
                            // Limpar tbody
                            tbody.innerHTML = '';
                            
                            // Criar até 5 linhas
                            for (let i = 0; i < Math.min(pagamentos.length, 5); i++) {
                                console.log(`📊 Criando linha ${i + 1} para ${pagamentos[i].nomeProdutor || 'PRODUTOR'}`);
                                const pagamento = pagamentos[i];
                                const totalDeducao = pagamento.total_deducao || pagamento.total_impostodeducao || 0;
                                
                                // Linha de cabeçalho
                                const headerRow = document.createElement('tr');
                                headerRow.innerHTML = `
                                    <td colspan="6" style="text-align: left;height: 20px; background-color: #e7e7e7;color: #666666;font-weight: bold;padding-right: 10px;">
                                        <div class="pull-left p-t-xs">
                                            ${pagamento.nomeProdutor || 'PRODUTOR'}&nbsp;
                                            <span class="label label-default"><i class="fa fa-user"></i> ${pagamento.produtor || ''}</span>
                                            ${pagamento.fazenda ? `<span class="label label-default"><i class="fa fa-home"></i> ${pagamento.fazenda}</span>` : ''}
                                            <span class="label label-primary">${pagamento.modelo || ''}&nbsp;</span>
                                            <span class="label label-info"><i class="fa fa-tint"></i> R$ ${(pagamento.preco_medio || 0).toFixed(3)}&nbsp;</span>
                                        </div>
                                    </td>
                                `;
                                
                                // Linha de dados
                                const dataRow = document.createElement('tr');
                                dataRow.innerHTML = `
                                    <td>
                                        <button class="btn btn-sm btn-default" style="width: 100%; font-size: 14px; text-align: center">
                                            <span><i class="fa fa-tint"></i> ${(pagamento.volume || 0).toLocaleString('pt-BR')} L</span>
                                        </button>
                                    </td>
                                    <td style="text-align: right;">
                                        <button class="btn btn-sm btn-info" style="width: 100%; font-size: 14px; text-align: center">
                                            <i class="fas fa-coins"></i> ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pagamento.total_fornecimento || 0)}
                                        </button>
                                    </td>
                                    <td style="text-align: right;">
                                        <button class="btn btn-sm btn-default" style="width: 100%; font-size: 14px; text-align: center">
                                            <span style="color: #0d47a1;"><i class="fa fa-plus-circle"></i> ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pagamento.total_credito || 0)}</span>
                                        </button>
                                    </td>
                                    <td style="text-align: right;">
                                        <button class="btn btn-sm btn-default" style="width: 100%;font-size: 14px; text-align: center">
                                            <span style="color: #ac2925;"> <i class="fa fa-minus-circle"></i> ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDeducao)}</span>
                                        </button>
                                    </td>
                                    <td style="text-align: right;width: 100px;">
                                        <button class="btn btn-sm ${(pagamento.total_pagamento || 0) >= 0 ? 'btn-success' : 'btn-danger'}" style="font-size: 14px;width: 100%;text-align: center;">
                                            <i class="fa fa-${(pagamento.total_pagamento || 0) >= 0 ? 'plus' : 'minus'}-circle"></i> &nbsp;${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pagamento.total_pagamento || 0)}
                                        </button>
                                    </td>
                                    <td style="padding: 0px 0px 0px 0px; position: relative;">
                                        <div class="row" style="margin-left: 0px;margin-right: 0px;">
                                            <div class="col-sm-6" style="padding: 0px;">
                                                <button class="md-icon-button" style="border: none; background: none; cursor: pointer; position: relative;">
                                                    <span class="material-icons action-icon" style="font-family: 'Material Icons'; font-size: 24px; color: #666; display: inline-block; margin: 0 4px; line-height: 1; vertical-align: middle;">calculate</span>
                                                </button>
                                            </div>
                                            <div class="col-sm-6" style="padding: 0px;">
                                                <button class="md-icon-button" style="border: none; background: none; cursor: pointer; position: relative;">
                                                    <span class="material-icons action-icon" style="font-family: 'Material Icons'; font-size: 24px; color: #666; display: inline-block; margin: 0 4px; line-height: 1; vertical-align: middle;">print</span>
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                `;
                                
                                tbody.appendChild(headerRow);
                                tbody.appendChild(dataRow);
                            }
                            const finalRowCount = tbody.querySelectorAll('tr').length;
                            console.log(`✅ ${finalRowCount} linhas criadas manualmente (esperado: ${Math.min(pagamentos.length, 5) * 2})`);
                            return true;
                        } else {
                            const errorInfo = {
                                hasTbody: !!tbody,
                                hasPagamentos: !!(pagamentos && pagamentos.length > 0),
                                pagamentosCount: pagamentos ? pagamentos.length : 0,
                                allTbodies: document.querySelectorAll('tbody').length,
                                allTables: document.querySelectorAll('table').length
                            };
                            console.log('⚠️ Tbody não encontrado ou sem pagamentos:', JSON.stringify(errorInfo));
                            return errorInfo;
                        }
                    }, additionalData.pagamentos);
                    if (rowsCreated === true) {
                        console.log('   ✅ Linhas criadas manualmente');
                        // Aguardar um pouco para garantir renderização
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                        // Verificar novamente se as linhas foram criadas
                        const recheckRows = await page.evaluate(() => {
                            const tbody = document.querySelector('tbody');
                            if (tbody) {
                                const rows = tbody.querySelectorAll('tr');
                                return rows.length;
                            }
                            return 0;
                        });
                        console.log(`   📊 Linhas após criação manual: ${recheckRows}`);
                        
                        // Re-adicionar badges que podem ter sido perdidos (headers e ícones)
                        if (recheckRows > 0 && config.elements) {
                            console.log('   🔄 Re-adicionando badges para headers e ícones...');
                            const missingBadges = config.elements.filter(el => el.number >= 8 && el.number <= 15);
                            if (missingBadges.length > 0) {
                                const badgesAdded = await page.evaluate((badges) => {
                                    let added = 0;
                                    
                                    // Garantir que o dropdown esteja aberto para badge 13
                                    const dropdownButton = document.querySelector('button[data-toggle="dropdown"]');
                                    if (dropdownButton) {
                                        dropdownButton.click();
                                        // Aguardar um pouco para o dropdown abrir
                                        setTimeout(() => {}, 100);
                                    }
                                    
                                    badges.forEach(badge => {
                                        let el = null;
                                        
                                        // Para headers (8-12), encontrar o thead
                                        if (badge.number >= 8 && badge.number <= 12) {
                                            const thead = document.querySelector('thead');
                                            if (thead) {
                                                const ths = thead.querySelectorAll('th');
                                                const index = badge.number - 8; // 8->0, 9->1, etc
                                                if (ths[index]) {
                                                    el = ths[index];
                                                }
                                            }
                                        }
                                        // Para ícones de ação (14-15), encontrar na segunda linha
                                        else if (badge.number >= 14 && badge.number <= 15) {
                                            const secondRow = document.querySelector('tbody tr:nth-child(2)');
                                            if (secondRow) {
                                                const lastCell = secondRow.querySelector('td:last-child');
                                                if (lastCell) {
                                                    const iconDiv = lastCell.querySelector('div');
                                                    if (iconDiv) {
                                                        const allIcons = Array.from(iconDiv.querySelectorAll('.action-icon, span.material-icons'));
                                                        if (badge.number === 14 && allIcons[0]) {
                                                            el = allIcons[0];
                                                        } else if (badge.number === 15 && allIcons[1]) {
                                                            el = allIcons[1];
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        // Para outros, usar o seletor original
                                        else {
                                            el = document.querySelector(badge.selector);
                                        }
                                        
                                        console.log(`📊 Badge ${badge.number}: elemento encontrado: ${!!el}, selector: ${badge.selector}`);
                                        if (el && !el.querySelector('.element-number-badge')) {
                                            const badgeEl = document.createElement('div');
                                            badgeEl.className = 'element-number-badge';
                                            badgeEl.setAttribute('data-number', badge.number);
                                            badgeEl.textContent = badge.number;
                                            badgeEl.style.position = 'absolute';
                                            badgeEl.style.top = badge.position?.top || '-12px';
                                            badgeEl.style.right = badge.position?.right || '5px';
                                            badgeEl.style.backgroundColor = '#ff4444';
                                            badgeEl.style.color = '#ffffff';
                                            badgeEl.style.borderRadius = '50%';
                                            badgeEl.style.width = '24px';
                                            badgeEl.style.height = '24px';
                                            badgeEl.style.fontSize = '14px';
                                            badgeEl.style.fontWeight = 'bold';
                                            badgeEl.style.lineHeight = '24px';
                                            badgeEl.style.zIndex = '10000';
                                            badgeEl.style.display = 'flex';
                                            badgeEl.style.alignItems = 'center';
                                            badgeEl.style.justifyContent = 'center';
                                            badgeEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
                                            badgeEl.style.border = '2px solid white';
                                            badgeEl.style.pointerEvents = 'none';
                                            
                                            const container = el.closest('th, td') || el;
                                            if (container) {
                                                container.style.position = 'relative';
                                                container.appendChild(badgeEl);
                                                added++;
                                                console.log(`✅ Badge ${badge.number} adicionado após criação da tabela`);
                                            }
                                        } else if (el && el.querySelector('.element-number-badge')) {
                                            console.log(`⚠️ Badge ${badge.number} já existe`);
                                        }
                                    });
                                    return added;
                                }, missingBadges);
                                console.log(`   ✅ ${badgesAdded} badges adicionados após criação da tabela`);
                            }
                        }
                    } else {
                        console.log('   ⚠️ Falha ao criar linhas manualmente');
                        if (typeof rowsCreated === 'object') {
                            console.log('   📊 Detalhes do erro:', JSON.stringify(rowsCreated));
                        }
                    }
                }
            }
            
            // Verificar novamente após criação manual
            if (finalCheck.isPagamentoPage) {
                const recheck = await page.evaluate(() => {
                    const cards = document.querySelectorAll('.card-group .card .fs-widget-number-22');
                    const cardsWithData = Array.from(cards).filter(card => {
                        const text = card.textContent.trim();
                        return text && text.length > 0 && !text.includes('{{');
                    });
                    const tableRows = document.querySelectorAll('tbody tr');
                    return {
                        cardsCount: cards.length,
                        cardsWithDataCount: cardsWithData.length,
                    rowCount: tableRows.length
                };
            });
                console.log(`📊 Verificação pós-criação manual: Cards ${recheck.cardsWithDataCount}/${recheck.cardsCount}, Linhas ${recheck.rowCount}`);
            }
            
            if (finalCheck.hasUnresolved || !finalCheck.titleHasData || (!finalCheck.rowHasData && !finalCheck.isPagamentoPage)) {
                console.log('⚠️  Verificação final detectou problemas:');
                console.log('   - Interpolações não resolvidas:', finalCheck.hasUnresolved);
                console.log('   - Título com dados:', finalCheck.titleHasData, '| Texto:', finalCheck.titleText);
                console.log('   - Linhas na tabela:', finalCheck.hasRows, '| Contagem:', finalCheck.rowCount);
                console.log('   - Linhas com dados:', finalCheck.rowHasData);
                
                // Garantir que as linhas da tabela estejam visíveis
                await page.evaluate((additionalData) => {
                    const body = document.body;
                    
                    // Verificar se é aba de pagamentos
                    const isPagamentoPage = body.querySelector('[ng-controller="folha.pagamento.ListCtrl"]') !== null;
                    
                    if (isPagamentoPage && additionalData.pagamentos && additionalData.pagamentos.length > 0) {
                        // Para aba de pagamentos, garantir que os cards e tabela estejam visíveis
                        const cards = body.querySelectorAll('.card-group .card .fs-widget-number-22');
                        cards.forEach(card => {
                            card.style.display = 'block';
                            card.style.visibility = 'visible';
                            card.style.opacity = '1';
                        });
                        
                        // Garantir que a tabela esteja visível
                        const tableContainer = body.querySelector('md-table-container, .table-responsive');
                        if (tableContainer) {
                            tableContainer.style.display = 'block';
                            tableContainer.style.visibility = 'visible';
                        }
                        
                        // Verificar se há linhas na tabela
                        const tbody = body.querySelector('tbody');
                        if (tbody) {
                            const rows = tbody.querySelectorAll('tr');
                            console.log('Linhas de pagamento encontradas:', rows.length);
                            
                            // Garantir que todas as linhas sejam visíveis
                            rows.forEach(row => {
                                row.style.display = 'table-row';
                                row.style.visibility = 'visible';
                                row.style.opacity = '1';
                                row.style.height = 'auto';
                            });
                            
                            // Se não há linhas, verificar se o pré-processamento criou as linhas
                            if (rows.length === 0) {
                                console.log('⚠️ Nenhuma linha encontrada na tabela de pagamentos');
                            }
                        }
                    }
                    
                    // Verificar se há linhas na tabela (para outras páginas)
                    const tbody = body.querySelector('tbody');
                    if (tbody && !isPagamentoPage) {
                        const rows = tbody.querySelectorAll('tr');
                        console.log('Linhas encontradas no tbody:', rows.length);
                        
                        // Se não há linhas mas há dados, criar as linhas novamente
                        if (rows.length === 0 && additionalData.records && additionalData.records.length > 0) {
                            console.log('Nenhuma linha encontrada, criando linhas manualmente...');
                            
                            additionalData.records.forEach(record => {
                                const tr = document.createElement('tr');
                                
                                const td1 = document.createElement('td');
                                td1.textContent = record.codigo || '';
                                tr.appendChild(td1);
                                
                                const td2 = document.createElement('td');
                                td2.textContent = (record.nome || '').toUpperCase();
                                tr.appendChild(td2);
                                
                                const td3 = document.createElement('td');
                                td3.className = 'action';
                                td3.innerHTML = `
                                    <span class="material-icons action-icon" style="font-family: Material Icons; cursor: pointer; color: #666; display: inline-block; margin: 0 4px;">visibility</span>
                                    <span class="material-icons action-icon" style="font-family: Material Icons; cursor: pointer; color: #666; display: inline-block; margin: 0 4px;">edit</span>
                                    <span class="material-icons action-icon" style="font-family: Material Icons; cursor: pointer; color: #666; display: inline-block; margin: 0 4px;">delete</span>
                                `;
                                tr.appendChild(td3);
                                
                                tbody.appendChild(tr);
                            });
                            
                            console.log('Linhas criadas:', additionalData.records.length);
                        }
                        
                        // Garantir que todas as linhas sejam visíveis
                        rows.forEach(row => {
                            row.style.display = 'table-row';
                            row.style.visibility = 'visible';
                            row.style.opacity = '1';
                        });
                    }
                }, additionalData);
                
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
            
            // Garantir que as linhas da tabela estejam visíveis ANTES do fallback
            if (additionalData.records && additionalData.records.length > 0) {
                await page.evaluate((additionalData) => {
                    const body = document.body;
                    
                    // Procurar tbody de várias formas
                    let tbody = body.querySelector('tbody');
                    if (!tbody) {
                        const table = body.querySelector('table');
                        if (table) {
                            tbody = table.querySelector('tbody');
                        }
                    }
                    if (!tbody) {
                        const tableContainer = body.querySelector('.table-responsive');
                        if (tableContainer) {
                            const table = tableContainer.querySelector('table');
                            if (table) {
                                tbody = table.querySelector('tbody');
                            }
                        }
                    }
                    
                    if (tbody) {
                        const rows = tbody.querySelectorAll('tr');
                        console.log('Verificação final: Linhas encontradas no tbody:', rows.length);
                        
                        // Se não há linhas ou há menos linhas que o esperado, criar/recriar
                        if (rows.length < additionalData.records.length) {
                            console.log('Recriando linhas da tabela...');
                            
                            // Remover linhas existentes (exceto cabeçalho se houver)
                            rows.forEach(row => {
                                // Não remover se for cabeçalho (tem th)
                                if (!row.querySelector('th')) {
                                    row.remove();
                                }
                            });
                            
                            // Criar novas linhas
                            additionalData.records.forEach(record => {
                                const tr = document.createElement('tr');
                                
                                const td1 = document.createElement('td');
                                td1.textContent = record.codigo || '';
                                tr.appendChild(td1);
                                
                                const td2 = document.createElement('td');
                                td2.textContent = (record.nome || '').toUpperCase();
                                tr.appendChild(td2);
                                
                                const td3 = document.createElement('td');
                                td3.className = 'action';
                                td3.innerHTML = `
                                    <span class="material-icons action-icon" style="font-family: Material Icons; cursor: pointer; color: #666; display: inline-block; margin: 0 4px;">visibility</span>
                                    <span class="material-icons action-icon" style="font-family: Material Icons; cursor: pointer; color: #666; display: inline-block; margin: 0 4px;">edit</span>
                                    <span class="material-icons action-icon" style="font-family: Material Icons; cursor: pointer; color: #666; display: inline-block; margin: 0 4px;">delete</span>
                                `;
                                tr.appendChild(td3);
                                
                                // Garantir visibilidade
                                tr.style.display = 'table-row';
                                tr.style.visibility = 'visible';
                                tr.style.opacity = '1';
                                
                                tbody.appendChild(tr);
                            });
                            
                            console.log('Linhas recriadas:', additionalData.records.length);
                        } else {
                            // Garantir que todas as linhas existentes sejam visíveis
                            rows.forEach(row => {
                                if (!row.querySelector('th')) { // Não é cabeçalho
                                    row.style.display = 'table-row';
                                    row.style.visibility = 'visible';
                                    row.style.opacity = '1';
                                }
                            });
                        }
                    } else {
                        console.log('Tbody não encontrado na verificação final');
                    }
                }, additionalData);
                
                // Aguardar um pouco para garantir renderização
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // Verificação final ANTES do screenshot - garantir que as linhas estejam visíveis
            if (additionalData.records && additionalData.records.length > 0) {
                console.log('🔍 Verificação final antes do screenshot...');
                await page.evaluate((additionalData) => {
                    const body = document.body;
                    
                    // Procurar tbody
                    let tbody = body.querySelector('tbody');
                    if (!tbody) {
                        const table = body.querySelector('table.table, table[class*="table"]');
                        if (table) {
                            tbody = table.querySelector('tbody');
                        }
                    }
                    
                    if (tbody) {
                        const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => !row.querySelector('th'));
                        console.log('Linhas de dados encontradas:', rows.length);
                        
                        if (rows.length === 0 || rows.length < additionalData.records.length) {
                            console.log('Criando linhas diretamente no DOM...');
                            
                            // Limpar linhas existentes (exceto cabeçalho)
                            rows.forEach(row => row.remove());
                            
                            // Criar linhas
                            additionalData.records.forEach(record => {
                                const tr = document.createElement('tr');
                                tr.style.display = 'table-row';
                                tr.style.visibility = 'visible';
                                tr.style.opacity = '1';
                                
                                const td1 = document.createElement('td');
                                td1.textContent = record.codigo || '';
                                tr.appendChild(td1);
                                
                                const td2 = document.createElement('td');
                                td2.textContent = (record.nome || '').toUpperCase();
                                tr.appendChild(td2);
                                
                                const td3 = document.createElement('td');
                                td3.className = 'action';
                                td3.style.textAlign = 'right';
                                td3.innerHTML = `
                                    <span class="material-icons action-icon" style="font-family: Material Icons; cursor: pointer; color: #666; display: inline-block; margin: 0 4px; font-size: 24px;">visibility</span>
                                    <span class="material-icons action-icon" style="font-family: Material Icons; cursor: pointer; color: #666; display: inline-block; margin: 0 4px; font-size: 24px;">edit</span>
                                    <span class="material-icons action-icon" style="font-family: Material Icons; cursor: pointer; color: #666; display: inline-block; margin: 0 4px; font-size: 24px;">delete</span>
                                `;
                                tr.appendChild(td3);
                                
                                tbody.appendChild(tr);
                            });
                            
                            console.log('Linhas criadas:', additionalData.records.length);
                        }
                        
                        // Garantir que todas as linhas sejam visíveis
                        const allRows = tbody.querySelectorAll('tr');
                        allRows.forEach(row => {
                            if (!row.querySelector('th')) {
                                row.style.display = 'table-row';
                                row.style.visibility = 'visible';
                                row.style.opacity = '1';
                                row.style.height = 'auto';
                            }
                        });
                    }
                }, additionalData);
                
                // Aguardar renderização
                await new Promise(resolve => setTimeout(resolve, 300));
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
                    console.log('additionalData.records:', additionalData.records ? additionalData.records.length : 0);
                    
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
                            
                            // Also try to find md-table-container > table > tbody
                            if (!tbody) {
                                const mdTableContainer = body.querySelector('md-table-container');
                                if (mdTableContainer) {
                                    const table = mdTableContainer.querySelector('table');
                                    if (table) {
                                        tbody = table.querySelector('tbody[md-body]') || table.querySelector('tbody');
                                    }
                                }
                            }
                            
                            // Also try to find table directly
                            if (!tbody) {
                                const table = body.querySelector('table[md-table]');
                                if (table) {
                                    tbody = table.querySelector('tbody[md-body]') || table.querySelector('tbody');
                                }
                            }
                            
                            if (tbody) {
                                console.log('Tbody encontrado:', tbody.tagName, tbody.className);
                                
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
    
    // Verificação final ULTIMA antes do screenshot - converter elementos Material Design que ainda existem
    if (additionalData.records && additionalData.records.length > 0) {
        console.log('🔍 Verificação ULTIMA antes do screenshot...');
        const finalCheck = await page.evaluate((additionalData) => {
            const body = document.body;
            
            // Converter elementos Material Design que ainda existem no DOM
            // Converter md-row para remover atributo
            body.querySelectorAll('tr[md-row]').forEach(tr => {
                tr.removeAttribute('md-row');
                tr.style.display = 'table-row';
                tr.style.visibility = 'visible';
                tr.style.opacity = '1';
            });
            
            // Converter md-cell para remover atributo
            body.querySelectorAll('td[md-cell]').forEach(td => {
                td.removeAttribute('md-cell');
            });
            
            // Converter md-icon para span.material-icons - IMPORTANTE: fazer isso ANTES de procurar os ícones
            const mdIcons = body.querySelectorAll('md-icon');
            console.log('Ícones md-icon encontrados para conversão:', mdIcons.length);
            mdIcons.forEach((icon, index) => {
                const content = icon.textContent.trim();
                const span = document.createElement('span');
                span.className = 'material-icons action-icon';
                span.textContent = content;
                span.style.cssText = 'font-family: Material Icons; cursor: pointer; color: #666; display: inline-block; margin: 0 4px; font-size: 24px; line-height: 1;';
                
                // Preservar a posição no DOM
                if (icon.parentNode) {
                    icon.parentNode.replaceChild(span, icon);
                }
                console.log(`Ícone ${index + 1} convertido: ${content}`);
            });
            
            // Verificar se ainda há md-icon após conversão
            const remainingMdIcons = body.querySelectorAll('md-icon');
            if (remainingMdIcons.length > 0) {
                console.log('⚠️ Ainda há', remainingMdIcons.length, 'ícones md-icon após conversão');
            }
            
            // Verificar se os action-icon foram criados
            const actionIcons = body.querySelectorAll('.action-icon');
            console.log('Ícones .action-icon encontrados após conversão:', actionIcons.length);
            
            // Procurar tbody
            let tbody = body.querySelector('tbody');
            if (!tbody) {
                const table = body.querySelector('table.table, table[class*="table"]');
                if (table) {
                    tbody = table.querySelector('tbody');
                }
            }
            
            if (tbody) {
                const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => !row.querySelector('th'));
                console.log('Linhas encontradas antes do screenshot:', rows.length);
                
                // Garantir que todas as linhas sejam visíveis
                rows.forEach(row => {
                    row.style.display = 'table-row';
                    row.style.visibility = 'visible';
                    row.style.opacity = '1';
                    row.style.height = 'auto';
                });
                
                if (rows.length === 0 || rows.length < additionalData.records.length) {
                    console.log('Criando/recriando linhas agora...');
                    
                    // Remover linhas existentes (exceto cabeçalho)
                    rows.forEach(row => row.remove());
                    
                    // Criar linhas diretamente
                    additionalData.records.forEach(record => {
                        const tr = document.createElement('tr');
                        tr.style.cssText = 'display: table-row !important; visibility: visible !important; opacity: 1 !important; height: auto !important;';
                        
                        const td1 = document.createElement('td');
                        td1.textContent = record.codigo || '';
                        td1.style.cssText = 'padding: 12px; border-bottom: 1px solid #eee;';
                        tr.appendChild(td1);
                        
                        const td2 = document.createElement('td');
                        td2.textContent = (record.nome || '').toUpperCase();
                        td2.style.cssText = 'padding: 12px; border-bottom: 1px solid #eee;';
                        tr.appendChild(td2);
                        
                        const td3 = document.createElement('td');
                        td3.className = 'action';
                        td3.style.cssText = 'padding: 12px; border-bottom: 1px solid #eee; text-align: right; white-space: nowrap;';
                        td3.innerHTML = `
                            <span class="material-icons action-icon" style="font-family: Material Icons; cursor: pointer; color: #666; display: inline-block; margin: 0 4px; font-size: 24px; line-height: 1;">visibility</span>
                            <span class="material-icons action-icon" style="font-family: Material Icons; cursor: pointer; color: #666; display: inline-block; margin: 0 4px; font-size: 24px; line-height: 1;">edit</span>
                            <span class="material-icons action-icon" style="font-family: Material Icons; cursor: pointer; color: #666; display: inline-block; margin: 0 4px; font-size: 24px; line-height: 1;">delete</span>
                        `;
                        tr.appendChild(td3);
                        
                        tbody.appendChild(tr);
                    });
                    
                    return { created: additionalData.records.length, found: 0, converted: true };
                }
                
                return { created: 0, found: rows.length, converted: true };
            }
            
            return { created: 0, found: 0, error: 'Tbody não encontrado' };
        }, additionalData);
        
        console.log('Resultado da verificação final:', finalCheck);
        
        if (finalCheck.created > 0) {
            console.log(`✅ ${finalCheck.created} linhas criadas na verificação final`);
        }
        
        // Aguardar renderização
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Debug final: verificar HTML antes do screenshot e garantir que tudo está visível
    if (additionalData.records && additionalData.records.length > 0) {
        const debugInfo = await page.evaluate((additionalData) => {
            const body = document.body;
            const tbody = body.querySelector('tbody');
            if (tbody) {
                const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => !row.querySelector('th'));
                
                // Garantir que todas as linhas sejam visíveis com estilos inline
                rows.forEach(row => {
                    row.style.cssText = 'display: table-row !important; visibility: visible !important; opacity: 1 !important; height: auto !important;';
                    Array.from(row.querySelectorAll('td')).forEach(td => {
                        td.style.cssText = 'padding: 12px; border-bottom: 1px solid #eee; display: table-cell !important; visibility: visible !important;';
                    });
                });
                
                // Garantir que a tabela seja visível
                const table = tbody.closest('table');
                if (table) {
                    table.style.cssText = 'width: 100%; border-collapse: collapse; display: table !important; visibility: visible !important;';
                }
                
                // Garantir que o tbody seja visível
                tbody.style.cssText = 'display: table-row-group !important; visibility: visible !important;';
                
                return {
                    tbodyFound: true,
                    rowCount: rows.length,
                    firstRowHTML: rows.length > 0 ? rows[0].outerHTML.substring(0, 200) : 'N/A',
                    tbodyHTML: tbody.innerHTML.substring(0, 500),
                    allRowsVisible: rows.every(row => {
                        const style = window.getComputedStyle(row);
                        return style.display === 'table-row' && style.visibility === 'visible';
                    })
                };
            }
            return { tbodyFound: false };
        }, additionalData);
        console.log('🔍 Debug final - HTML da tabela:', JSON.stringify(debugInfo, null, 2));
        
        if (!debugInfo.allRowsVisible) {
            console.log('⚠️ Algumas linhas não estão visíveis, aplicando correções...');
        }
    }
    
    // Verificação específica para valores da tabela de preços
    if (additionalData.valores && additionalData.valores.length > 0 && config.htmlPath && config.htmlPath.includes('tabelapreco.valor.tab')) {
        console.log('🔍 Verificando valores da tabela de preços antes do screenshot...');
        const valoresDebug = await page.evaluate((valoresData) => {
            const body = document.body;
            const tbody = body.querySelector('tbody');
            if (tbody) {
                const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => !row.querySelector('th'));
                
                console.log(`Encontradas ${rows.length} linhas na tabela`);
                
                // Garantir que todas as linhas sejam visíveis e preencher com dados
                rows.forEach((row, index) => {
                    row.style.cssText = 'display: table-row !important; visibility: visible !important; opacity: 1 !important; height: auto !important;';
                    
                    // Garantir que todas as células sejam visíveis e tenham conteúdo
                    const tds = Array.from(row.querySelectorAll('td'));
                    
                    // Preencher células diretamente com dados
                    if (valoresData[index]) {
                        const valor = valoresData[index];
                        const codigoVal = valor.codigo || '';
                        const anoVal = String(valor.ano || '');
                        const mesVal = String(valor.mes || '');
                        const valorFormatado = valor.valor ? parseFloat(valor.valor).toFixed(4).replace(/\.?0+$/, '') : '0';
                        
                        // Preencher as primeiras 4 células com dados
                        if (tds.length >= 4) {
                            // Primeira célula: código
                            tds[0].innerHTML = codigoVal;
                            tds[0].textContent = codigoVal;
                            tds[0].style.cssText = 'padding: 12px; border-bottom: 1px solid #eee; display: table-cell !important; visibility: visible !important;';
                            
                            // Segunda célula: ano
                            tds[1].innerHTML = anoVal;
                            tds[1].textContent = anoVal;
                            tds[1].style.cssText = 'padding: 12px; border-bottom: 1px solid #eee; display: table-cell !important; visibility: visible !important;';
                            
                            // Terceira célula: mês
                            tds[2].innerHTML = mesVal;
                            tds[2].textContent = mesVal;
                            tds[2].style.cssText = 'padding: 12px; border-bottom: 1px solid #eee; display: table-cell !important; visibility: visible !important;';
                            
                            // Quarta célula: valor
                            tds[3].innerHTML = valorFormatado;
                            tds[3].textContent = valorFormatado;
                            tds[3].style.cssText = 'padding: 12px; border-bottom: 1px solid #eee; display: table-cell !important; visibility: visible !important;';
                        }
                        // Células 4+ são de ação (ícones), aplicar apenas estilo
                        for (let i = 4; i < tds.length; i++) {
                            tds[i].style.cssText = 'padding: 12px; border-bottom: 1px solid #eee; display: table-cell !important; visibility: visible !important;';
                        }
                    } else {
                        // Se não houver dados, apenas aplicar estilo
                        tds.forEach(td => {
                            td.style.cssText = 'padding: 12px; border-bottom: 1px solid #eee; display: table-cell !important; visibility: visible !important;';
                        });
                    }
                });
                
                // Garantir que a tabela seja visível
                const table = tbody.closest('table');
                if (table) {
                    table.style.cssText = 'width: 100%; border-collapse: collapse; display: table !important; visibility: visible !important;';
                }
                
                // Garantir que o tbody seja visível
                tbody.style.cssText = 'display: table-row-group !important; visibility: visible !important;';
                
                // Garantir que o container da tabela seja visível
                const tableResponsive = tbody.closest('.table-responsive');
                if (tableResponsive) {
                    tableResponsive.style.cssText = 'display: block !important; visibility: visible !important; width: 100% !important; overflow-x: auto !important;';
                }
                
                // Verificar conteúdo após preenchimento
                const firstRowCells = rows.length > 0 ? Array.from(rows[0].querySelectorAll('td')).map(td => td.textContent.trim()) : [];
                
                return {
                    tbodyFound: true,
                    rowCount: rows.length,
                    expectedRows: valoresData.length,
                    firstRowHTML: rows.length > 0 ? rows[0].outerHTML.substring(0, 300) : 'N/A',
                    firstRowText: rows.length > 0 ? rows[0].textContent : 'N/A',
                    firstRowCells: firstRowCells,
                    firstRowCellsCount: firstRowCells.length,
                    allRowsVisible: rows.every(row => {
                        const style = window.getComputedStyle(row);
                        return style.display === 'table-row' && style.visibility === 'visible';
                    })
                };
            }
            return { tbodyFound: false };
        }, additionalData.valores);
        
        console.log('🔍 Debug valores - HTML da tabela:', JSON.stringify(valoresDebug, null, 2));
        
        if (valoresDebug.rowCount !== valoresDebug.expectedRows) {
            console.log(`⚠️ Número de linhas não corresponde: esperado ${valoresDebug.expectedRows}, encontrado ${valoresDebug.rowCount}`);
        }
        
        // Se as células ainda estão vazias, preencher novamente
        if (valoresDebug.firstRowCells && valoresDebug.firstRowCells.filter(c => c && c.trim()).length < 3) {
            console.log('⚠️ Células ainda vazias, preenchendo novamente...');
            await page.evaluate((valoresData) => {
                const tbody = document.querySelector('tbody');
                if (tbody) {
                    const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => !row.querySelector('th'));
                    rows.forEach((row, index) => {
                        if (valoresData[index]) {
                            const valor = valoresData[index];
                            const tds = Array.from(row.querySelectorAll('td'));
                            if (tds.length > 0) tds[0].textContent = valor.codigo || '';
                            if (tds.length > 1) tds[1].textContent = String(valor.ano || '');
                            if (tds.length > 2) tds[2].textContent = String(valor.mes || '');
                            if (tds.length > 3) {
                                const valorFormatado = valor.valor ? parseFloat(valor.valor).toFixed(4).replace(/\.?0+$/, '') : '0';
                                tds[3].textContent = valorFormatado;
                            }
                        }
                    });
                }
            }, additionalData.valores);
            
            // Aguardar um pouco para garantir que o preenchimento foi aplicado
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        if (!valoresDebug.allRowsVisible) {
            console.log('⚠️ Algumas linhas de valores não estão visíveis, aplicando correções...');
        }
    }
    
    // Verificação final antes do screenshot - garantir que cards e ícones estejam visíveis
    if (additionalData.pagamentos && additionalData.pagamentos.length > 0) {
        await page.evaluate((estatisticas) => {
            // Garantir que o dropdown esteja aberto para mostrar o badge 13
            const dropdownButton = document.querySelector('button[data-toggle="dropdown"]');
            const dropdownMenu = document.querySelector('ul.dropdown-menu');
            if (dropdownButton && dropdownMenu) {
                // Remover classes que podem estar ocultando o dropdown
                dropdownMenu.classList.remove('hidden');
                dropdownMenu.style.setProperty('display', 'block', 'important');
                dropdownMenu.style.setProperty('visibility', 'visible', 'important');
                dropdownMenu.style.setProperty('opacity', '1', 'important');
                dropdownMenu.style.setProperty('position', 'absolute', 'important');
                dropdownMenu.style.setProperty('z-index', '1000', 'important');
                
                // Garantir que o link de recalcular folha esteja visível
                const recalcularLink = dropdownMenu.querySelector('a[ng-click="recalculaPagamentos()"]');
                if (recalcularLink) {
                    recalcularLink.style.setProperty('display', 'block', 'important');
                    recalcularLink.style.setProperty('visibility', 'visible', 'important');
                }
            }
            
            // Remover ng-if que pode estar ocultando elementos
            const ngIfElements = document.querySelectorAll('[ng-if]');
            ngIfElements.forEach(el => {
                const ngIf = el.getAttribute('ng-if');
                // Se for !isCalculating, remover o atributo e garantir visibilidade
                if (ngIf === '!isCalculating' || ngIf.includes('!isCalculating')) {
                    el.removeAttribute('ng-if');
                    el.style.display = 'block';
                    el.style.visibility = 'visible';
                    el.style.opacity = '1';
                }
            });
            
            // Garantir que todos os cards estejam visíveis
            const cardGroup = document.querySelector('.card-group');
            if (cardGroup) {
                // Remover ng-if do card-group se existir
                cardGroup.removeAttribute('ng-if');
                cardGroup.style.setProperty('display', 'flex', 'important');
                cardGroup.style.setProperty('visibility', 'visible', 'important');
                cardGroup.style.setProperty('opacity', '1', 'important');
                cardGroup.style.setProperty('width', '100%', 'important');
                cardGroup.style.setProperty('max-width', '100%', 'important');
                cardGroup.style.setProperty('margin-bottom', '20px', 'important');
                cardGroup.style.setProperty('position', 'relative', 'important');
                cardGroup.style.setProperty('overflow', 'visible', 'important');
                cardGroup.style.setProperty('z-index', '1', 'important');
                
                // Garantir que o container dos cards tenha a mesma largura da tabela
                const coreUiNeton = cardGroup.closest('.core-ui-neton');
                if (coreUiNeton) {
                    coreUiNeton.style.setProperty('width', '100%', 'important');
                    coreUiNeton.style.setProperty('max-width', '100%', 'important');
                }
                
                // Garantir que a tabela tenha a mesma largura e sincronizar com os cards
                const tableForAlignment = document.querySelector('table');
                const tableContainer = document.querySelector('md-table-container, .table-responsive');
                if (tableForAlignment) {
                    const tableWidth = tableForAlignment.offsetWidth || tableForAlignment.clientWidth || tableForAlignment.getBoundingClientRect().width;
                    const tableContainerWidth = tableContainer ? (tableContainer.offsetWidth || tableContainer.clientWidth || tableContainer.getBoundingClientRect().width) : 0;
                    const effectiveTableWidth = tableContainerWidth > 0 ? tableContainerWidth : tableWidth;
                    
                    if (effectiveTableWidth > 0) {
                        // Usar a largura da tabela como referência
                        const targetWidth = effectiveTableWidth;
                        
                        // Aplicar a mesma largura aos cards
                        cardGroup.style.setProperty('width', targetWidth + 'px', 'important');
                        cardGroup.style.setProperty('max-width', targetWidth + 'px', 'important');
                        cardGroup.style.setProperty('min-width', targetWidth + 'px', 'important');
                        
                        // Garantir que o container dos cards também tenha a mesma largura e alinhamento
                        const coreUiNeton = cardGroup.closest('.core-ui-neton');
                        if (coreUiNeton) {
                            coreUiNeton.style.setProperty('width', targetWidth + 'px', 'important');
                            coreUiNeton.style.setProperty('max-width', targetWidth + 'px', 'important');
                            // Remover padding para alinhar com a tabela
                            coreUiNeton.style.setProperty('padding', '0', 'important');
                            coreUiNeton.style.setProperty('padding-left', '0', 'important');
                            coreUiNeton.style.setProperty('padding-right', '0', 'important');
                            coreUiNeton.style.setProperty('margin-left', '0', 'important');
                            coreUiNeton.style.setProperty('margin-right', '0', 'important');
                        }
                        
                        // Alinhar cards com a margem esquerda da tabela
                        // Pegar a posição absoluta da tabela e dos cards
                        const tableRect = tableForAlignment.getBoundingClientRect();
                        const cardGroupRect = cardGroup.getBoundingClientRect();
                        
                        // Calcular a diferença de posição horizontal
                        const offsetDiff = tableRect.left - cardGroupRect.left;
                        
                        if (Math.abs(offsetDiff) > 1) {
                            // Aplicar o offset aos cards
                            const currentMarginLeft = parseInt(window.getComputedStyle(cardGroup).marginLeft) || 0;
                            cardGroup.style.setProperty('margin-left', (currentMarginLeft + offsetDiff) + 'px', 'important');
                            console.log(`📊 Alinhamento ajustado: offset=${offsetDiff}px`);
                        }
                        
                        // Garantir que cada card tenha largura proporcional
                        const cards = cardGroup.querySelectorAll('.card');
                        if (cards.length > 0) {
                            const cardWidth = (targetWidth - (cards.length * 20)) / cards.length; // 20px de margem entre cards
                            cards.forEach(card => {
                                card.style.setProperty('width', cardWidth + 'px', 'important');
                                card.style.setProperty('min-width', cardWidth + 'px', 'important');
                                card.style.setProperty('max-width', cardWidth + 'px', 'important');
                            });
                        }
                        
                        console.log(`📊 Larguras sincronizadas: Tabela=${effectiveTableWidth}px, Cards=${targetWidth}px`);
                    }
                } else {
                    // Se não encontrou a tabela, apenas remover padding dos cards
                    const coreUiNeton = cardGroup.closest('.core-ui-neton');
                    if (coreUiNeton) {
                        coreUiNeton.style.setProperty('padding', '0', 'important');
                        console.log(`📊 Padding dos cards removido (tabela não encontrada)`);
                    }
                }
                
                const cards = cardGroup.querySelectorAll('.card');
                console.log(`📊 Cards encontrados: ${cards.length}`);
                cards.forEach((card, index) => {
                    card.style.setProperty('display', 'block', 'important');
                    card.style.setProperty('visibility', 'visible', 'important');
                    card.style.setProperty('opacity', '1', 'important');
                    card.style.setProperty('height', 'auto', 'important');
                    card.style.setProperty('background', 'white', 'important');
                    card.style.setProperty('border', '1px solid #ddd', 'important');
                    card.style.setProperty('border-radius', '4px', 'important');
                    card.style.setProperty('margin', '0 10px', 'important');
                    card.style.setProperty('flex', '1', 'important');
                    card.style.setProperty('min-width', '150px', 'important');
                    
                    // Garantir que card-body esteja visível
                    const cardBody = card.querySelector('.card-body');
                    if (cardBody) {
                        cardBody.style.setProperty('display', 'block', 'important');
                        cardBody.style.setProperty('visibility', 'visible', 'important');
                        cardBody.style.setProperty('padding', '15px', 'important');
                        cardBody.style.setProperty('min-height', '100px', 'important');
                    }
                    
                    // Garantir que números estejam visíveis e com valores
                    const numbers = card.querySelectorAll('.fs-widget-number-22');
                    numbers.forEach((num, numIndex) => {
                        num.style.setProperty('display', 'block', 'important');
                        num.style.setProperty('visibility', 'visible', 'important');
                        num.style.setProperty('opacity', '1', 'important');
                        num.style.setProperty('font-size', '22px', 'important');
                        num.style.setProperty('font-weight', 'bold', 'important');
                        num.style.setProperty('color', '#333', 'important');
                        num.style.setProperty('margin', '10px 0', 'important');
                        num.style.setProperty('position', 'relative', 'important');
                        num.style.setProperty('overflow', 'visible', 'important');
                        num.style.setProperty('z-index', '1', 'important');
                        
                        // Garantir que badges nos números estejam visíveis
                        const badge = num.querySelector('.element-number-badge');
                        if (badge) {
                            badge.style.setProperty('position', 'absolute', 'important');
                            badge.style.setProperty('top', '-12px', 'important');
                            badge.style.setProperty('right', '5px', 'important');
                            badge.style.setProperty('z-index', '10001', 'important');
                            badge.style.setProperty('display', 'flex', 'important');
                            badge.style.setProperty('visibility', 'visible', 'important');
                            badge.style.setProperty('opacity', '1', 'important');
                        }
                        
                        // Garantir que tenha conteúdo
                        if (!num.textContent || num.textContent.trim() === '' || num.textContent.includes('{{')) {
                            if (estatisticas && numIndex === 0) {
                                num.textContent = estatisticas.totalDemonstrativos || 0;
                            } else if (estatisticas && numIndex === 1) {
                                num.textContent = (estatisticas.volumeCaptado || 0).toLocaleString('pt-BR') + ' L';
                            } else if (estatisticas && numIndex === 2) {
                                num.textContent = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(estatisticas.totalBruto || 0);
                            } else if (estatisticas && numIndex === 3) {
                                num.textContent = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(estatisticas.totalLiquido || 0);
                            } else if (estatisticas && numIndex === 4) {
                                num.textContent = (estatisticas.precoMedio || 0).toFixed(3);
                            }
                        }
                    });
                    
                    // Garantir que labels estejam visíveis
                    const labels = card.querySelectorAll('.fs-widget-label');
                    labels.forEach(label => {
                        label.style.setProperty('display', 'block', 'important');
                        label.style.setProperty('visibility', 'visible', 'important');
                        label.style.setProperty('font-size', '12px', 'important');
                        label.style.setProperty('color', '#666', 'important');
                    });
                    
                    // Garantir que ícones dos cards estejam visíveis
                    const icons = card.querySelectorAll('i');
                    icons.forEach(icon => {
                        icon.style.setProperty('display', 'inline-block', 'important');
                        icon.style.setProperty('visibility', 'visible', 'important');
                        icon.style.setProperty('opacity', '1', 'important');
                        icon.style.setProperty('font-size', '24px', 'important');
                    });
                });
                
                console.log(`✅ ${cards.length} cards garantidos como visíveis`);
            } else {
                console.log('⚠️ CardGroup não encontrado');
            }
            
            // Garantir que ícones de ação na tabela estejam visíveis
            const actionIcons = document.querySelectorAll('.action-icon, .material-icons');
            actionIcons.forEach(icon => {
                icon.style.setProperty('display', 'inline-block', 'important');
                icon.style.setProperty('visibility', 'visible', 'important');
                icon.style.setProperty('opacity', '1', 'important');
                icon.style.setProperty('font-size', '24px', 'important');
                icon.style.setProperty('font-family', "'Material Icons'", 'important');
                icon.style.setProperty('color', '#666', 'important');
            });
            console.log(`✅ ${actionIcons.length} ícones de ação garantidos como visíveis`);
            
            // Garantir que a tabela esteja visível
            const tableForVisibility = document.querySelector('table');
            if (tableForVisibility) {
                tableForVisibility.style.setProperty('display', 'table', 'important');
                tableForVisibility.style.setProperty('visibility', 'visible', 'important');
            }
            
            const tbody = document.querySelector('tbody');
            if (tbody) {
                tbody.style.setProperty('display', 'table-row-group', 'important');
                tbody.style.setProperty('visibility', 'visible', 'important');
                
                const rows = tbody.querySelectorAll('tr');
                rows.forEach(row => {
                    row.style.setProperty('display', 'table-row', 'important');
                    row.style.setProperty('visibility', 'visible', 'important');
                    row.style.setProperty('opacity', '1', 'important');
                });
            }
            
            // Verificação final: garantir que badges dos cards estejam visíveis
            const cardBadges = document.querySelectorAll('.card .element-number-badge');
            console.log(`📊 Badges nos cards encontrados: ${cardBadges.length}`);
            cardBadges.forEach((badge, index) => {
                badge.style.setProperty('position', 'absolute', 'important');
                badge.style.setProperty('top', '-12px', 'important');
                badge.style.setProperty('right', '5px', 'important');
                badge.style.setProperty('z-index', '10001', 'important');
                badge.style.setProperty('display', 'flex', 'important');
                badge.style.setProperty('visibility', 'visible', 'important');
                badge.style.setProperty('opacity', '1', 'important');
                badge.style.setProperty('background', '#ff4444', 'important');
                badge.style.setProperty('color', '#ffffff', 'important');
                badge.style.setProperty('border', '2px solid white', 'important');
                badge.style.setProperty('border-radius', '50%', 'important');
                badge.style.setProperty('width', '24px', 'important');
                badge.style.setProperty('height', '24px', 'important');
                badge.style.setProperty('font-size', '14px', 'important');
                badge.style.setProperty('font-weight', 'bold', 'important');
                badge.style.setProperty('box-shadow', '0 2px 4px rgba(0,0,0,0.3)', 'important');
                
                // Garantir que o container (número) tenha position relative
                const numberEl = badge.closest('.fs-widget-number-22');
                if (numberEl) {
                    numberEl.style.setProperty('position', 'relative', 'important');
                    numberEl.style.setProperty('overflow', 'visible', 'important');
                }
                
                // Garantir que o card tenha overflow visible
                const card = badge.closest('.card');
                if (card) {
                    card.style.setProperty('overflow', 'visible', 'important');
                }
                
                console.log(`✅ Badge ${badge.textContent} nos cards garantido como visível`);
            });
            
            // Alinhar cards com a margem esquerda da tabela (verificação final)
            const tableElementFinal = document.querySelector('table');
            const cardGroupElementFinal = document.querySelector('.card-group');
            
            if (tableElementFinal && cardGroupElementFinal) {
                // Remover todo padding do container dos cards
                const coreUiNetonFinal = cardGroupElementFinal.closest('.core-ui-neton');
                if (coreUiNetonFinal) {
                    coreUiNetonFinal.style.setProperty('padding', '0', 'important');
                    coreUiNetonFinal.style.setProperty('padding-left', '0', 'important');
                    coreUiNetonFinal.style.setProperty('padding-right', '0', 'important');
                    coreUiNetonFinal.style.setProperty('margin-left', '0', 'important');
                    coreUiNetonFinal.style.setProperty('margin-right', '0', 'important');
                }
                
                // Pegar a posição absoluta da tabela e dos cards
                const tableRect = tableElementFinal.getBoundingClientRect();
                const cardGroupRect = cardGroupElementFinal.getBoundingClientRect();
                
                // Calcular a diferença de posição horizontal
                const offsetDiff = tableRect.left - cardGroupRect.left;
                
                if (Math.abs(offsetDiff) > 1) {
                    // Aplicar o offset aos cards
                    const currentMarginLeft = parseInt(window.getComputedStyle(cardGroupElementFinal).marginLeft) || 0;
                    cardGroupElementFinal.style.setProperty('margin-left', (currentMarginLeft + offsetDiff) + 'px', 'important');
                    console.log(`📊 Alinhamento final ajustado: offset=${offsetDiff}px, margin-left=${currentMarginLeft + offsetDiff}px`);
                } else {
                    console.log(`📊 Cards já estão alinhados com a tabela`);
                }
            }
            
            console.log('✅ Verificação final: cards, ícones e tabela garantidos como visíveis');
        }, additionalData.estatisticasFolha);
        
        // Aguardar um pouco para garantir renderização
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verificação final de alinhamento antes do screenshot
        await page.evaluate(() => {
            const tableForAlign = document.querySelector('table');
            const cardGroupForAlign = document.querySelector('.card-group');
            
            if (tableForAlign) {
                // Pegar a largura e posição da tabela
                const tableRect = tableForAlign.getBoundingClientRect();
                const tableWidth = tableRect.width;
                const tableLeft = tableRect.left;
                
                console.log(`📊 Tabela encontrada: largura=${tableWidth}px, posição esquerda=${tableLeft}px`);
                
                // Encontrar todos os painéis que precisam ser ajustados
                const panels = document.querySelectorAll('.panel.panel-default');
                console.log(`📊 Painéis encontrados: ${panels.length}`);
                
                panels.forEach((panel, index) => {
                    // Pegar a posição atual do painel
                    const panelRect = panel.getBoundingClientRect();
                    const panelLeft = panelRect.left;
                    const panelWidth = panelRect.width;
                    
                    console.log(`📊 Painel ${index + 1}: largura atual=${panelWidth}px, posição esquerda=${panelLeft}px`);
                    
                    // Calcular o offset necessário para alinhar pela margem esquerda
                    const offsetDiff = tableLeft - panelLeft;
                    
                    // Aplicar a largura da tabela ao painel
                    panel.style.setProperty('width', tableWidth + 'px', 'important');
                    panel.style.setProperty('max-width', tableWidth + 'px', 'important');
                    panel.style.setProperty('min-width', tableWidth + 'px', 'important');
                    panel.style.setProperty('box-sizing', 'border-box', 'important');
                    
                    // Aplicar o offset para alinhar pela margem esquerda
                    // Usar position relative e left para garantir alinhamento preciso
                    const currentLeft = parseInt(window.getComputedStyle(panel).left) || 0;
                    const currentMarginLeft = parseInt(window.getComputedStyle(panel).marginLeft) || 0;
                    
                    // Calcular a posição absoluta necessária
                    const bodyRect = document.body.getBoundingClientRect();
                    const targetLeft = tableLeft - bodyRect.left;
                    const currentPanelLeft = panelLeft - bodyRect.left;
                    const finalOffset = targetLeft - currentPanelLeft;
                    
                    panel.style.setProperty('margin-left', (currentMarginLeft + finalOffset) + 'px', 'important');
                    panel.style.setProperty('margin-right', 'auto', 'important');
                    panel.style.setProperty('position', 'relative', 'important');
                    
                    console.log(`📊 Painel ${index + 1} ajustado: largura=${tableWidth}px, offset=${finalOffset}px, margin-left=${currentMarginLeft + finalOffset}px`);
                    
                    // Ajustar o panel-heading e panel-body para ocupar toda a largura
                    const panelHeading = panel.querySelector('.panel-heading');
                    if (panelHeading) {
                        panelHeading.style.setProperty('width', '100%', 'important');
                        panelHeading.style.setProperty('box-sizing', 'border-box', 'important');
                        panelHeading.style.setProperty('padding-left', '15px', 'important');
                        panelHeading.style.setProperty('padding-right', '15px', 'important');
                    }
                    
                    const panelBody = panel.querySelector('.panel-body');
                    if (panelBody) {
                        panelBody.style.setProperty('width', '100%', 'important');
                        panelBody.style.setProperty('box-sizing', 'border-box', 'important');
                    }
                    
                    // Ajustar o core-ui-neton dentro do painel
                    const coreUiNeton = panel.querySelector('.core-ui-neton');
                    if (coreUiNeton) {
                        coreUiNeton.style.setProperty('width', '100%', 'important');
                        coreUiNeton.style.setProperty('box-sizing', 'border-box', 'important');
                    }
                });
                
                // Ajustar o container dos cards
                if (cardGroupForAlign) {
                    // Remover todo padding do container dos cards
                    const coreUiNetonForAlign = cardGroupForAlign.closest('.core-ui-neton');
                    if (coreUiNetonForAlign) {
                        coreUiNetonForAlign.style.setProperty('padding', '0', 'important');
                        coreUiNetonForAlign.style.setProperty('padding-left', '0', 'important');
                        coreUiNetonForAlign.style.setProperty('padding-right', '0', 'important');
                        coreUiNetonForAlign.style.setProperty('margin-left', '0', 'important');
                        coreUiNetonForAlign.style.setProperty('margin-right', '0', 'important');
                        coreUiNetonForAlign.style.setProperty('width', '100%', 'important');
                        coreUiNetonForAlign.style.setProperty('max-width', '100%', 'important');
                    }
                    
                    // Pegar a posição absoluta da tabela e dos cards
                    const cardGroupRect = cardGroupForAlign.getBoundingClientRect();
                    
                    // Calcular a diferença de posição horizontal
                    const offsetDiff = tableLeft - cardGroupRect.left;
                    
                    if (Math.abs(offsetDiff) > 1) {
                        // Aplicar o offset aos cards
                        const currentMarginLeft = parseInt(window.getComputedStyle(cardGroupForAlign).marginLeft) || 0;
                        cardGroupForAlign.style.setProperty('margin-left', (currentMarginLeft + offsetDiff) + 'px', 'important');
                        console.log(`📊 Cards ajustados: offset=${offsetDiff}px, margin-left=${currentMarginLeft + offsetDiff}px`);
                    } else {
                        console.log(`📊 Cards já estão alinhados com a tabela (offset=${offsetDiff}px)`);
                    }
                }
                
                // Ajustar os containers row e col-sm-12 para garantir alinhamento
                const rows = document.querySelectorAll('.row');
                rows.forEach(row => {
                    const rowRect = row.getBoundingClientRect();
                    const rowOffsetDiff = tableLeft - rowRect.left;
                    
                    if (Math.abs(rowOffsetDiff) > 1) {
                        const currentMarginLeft = parseInt(window.getComputedStyle(row).marginLeft) || 0;
                        row.style.setProperty('margin-left', (currentMarginLeft + rowOffsetDiff) + 'px', 'important');
                        row.style.setProperty('margin-right', 'auto', 'important');
                    }
                });
                
                const colSm12s = document.querySelectorAll('.col-sm-12');
                colSm12s.forEach(col => {
                    col.style.setProperty('padding-left', '0', 'important');
                    col.style.setProperty('padding-right', '0', 'important');
                });
                
                // Ajustar o wrapper para garantir que não haja padding extra
                const wrapper = document.querySelector('.wrapper-xs');
                if (wrapper) {
                    wrapper.style.setProperty('padding-left', '0', 'important');
                    wrapper.style.setProperty('padding-right', '0', 'important');
                }
                
                return {
                    tableWidth: tableWidth,
                    tableLeft: tableLeft,
                    panelsCount: panels.length,
                    success: true
                };
            } else {
                console.log('⚠️ Tabela não encontrada para alinhamento');
                return { success: false, error: 'Tabela não encontrada' };
            }
        });
        
        // Log do resultado do alinhamento
        const alignResult = await page.evaluate(() => {
            const tableForAlign = document.querySelector('table');
            if (tableForAlign) {
                const tableRect = tableForAlign.getBoundingClientRect();
                const panels = document.querySelectorAll('.panel.panel-default');
                return {
                    tableWidth: tableRect.width,
                    tableLeft: tableRect.left,
                    panelsCount: panels.length,
                    panelsInfo: Array.from(panels).map((panel, index) => {
                        const rect = panel.getBoundingClientRect();
                        return {
                            index: index + 1,
                            width: rect.width,
                            left: rect.left
                        };
                    })
                };
            }
            return null;
        });
        
        if (alignResult) {
            console.log(`📊 Alinhamento aplicado: Tabela largura=${alignResult.tableWidth}px, Painéis=${alignResult.panelsCount}`);
            alignResult.panelsInfo.forEach(info => {
                console.log(`   - Painel ${info.index}: largura=${info.width}px, posição=${info.left}px`);
            });
        }
        
        // Aguardar um pouco mais para garantir que o alinhamento foi aplicado
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Preenchimento final de valores da tabela de preços ANTES do screenshot
    if (additionalData.valores && additionalData.valores.length > 0) {
        console.log('🔧 Preenchimento final de valores antes do screenshot...');
        await page.evaluate((valoresData) => {
            const tbody = document.querySelector('tbody');
            if (tbody) {
                const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => !row.querySelector('th'));
                console.log(`Preenchendo ${rows.length} linhas com dados...`);
                
                rows.forEach((row, index) => {
                    if (valoresData[index]) {
                        const valor = valoresData[index];
                        const tds = Array.from(row.querySelectorAll('td'));
                        const codigoVal = valor.codigo || '';
                        const anoVal = String(valor.ano || '');
                        const mesVal = String(valor.mes || '');
                        const valorFormatado = valor.valor ? parseFloat(valor.valor).toFixed(4).replace(/\.?0+$/, '') : '0';
                        
                        // Preencher células usando innerHTML para garantir que funcione
                        if (tds.length > 0) {
                            // Primeira célula: código
                            tds[0].innerHTML = codigoVal;
                            tds[0].textContent = codigoVal;
                        }
                        if (tds.length > 1) {
                            // Segunda célula: ano
                            tds[1].innerHTML = anoVal;
                            tds[1].textContent = anoVal;
                        }
                        if (tds.length > 2) {
                            // Terceira célula: mês
                            tds[2].innerHTML = mesVal;
                            tds[2].textContent = mesVal;
                        }
                        if (tds.length > 3) {
                            // Quarta célula: valor
                            tds[3].innerHTML = valorFormatado;
                            tds[3].textContent = valorFormatado;
                        }
                        
                        // Garantir visibilidade e conteúdo
                        tds.forEach((td, idx) => {
                            td.style.setProperty('display', 'table-cell', 'important');
                            td.style.setProperty('visibility', 'visible', 'important');
                            td.style.setProperty('opacity', '1', 'important');
                            // Se ainda estiver vazia após preenchimento, tentar novamente
                            if (idx < 4 && !td.textContent.trim()) {
                                if (idx === 0) td.innerHTML = codigoVal;
                                else if (idx === 1) td.innerHTML = anoVal;
                                else if (idx === 2) td.innerHTML = mesVal;
                                else if (idx === 3) td.innerHTML = valorFormatado;
                            }
                        });
                    }
                });
                
                console.log('Preenchimento concluído');
                return { rowsProcessed: rows.length };
            }
            return { error: 'Tbody não encontrado' };
        }, additionalData.valores);
        
        // Verificar se o preenchimento funcionou e tentar novamente se necessário
        const verifyFill = await page.evaluate(() => {
            const tbody = document.querySelector('tbody');
            if (tbody) {
                const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => !row.querySelector('th'));
                if (rows.length > 0) {
                    const firstRowTds = Array.from(rows[0].querySelectorAll('td'));
                    return {
                        rowsCount: rows.length,
                        firstRowCells: firstRowTds.slice(0, 4).map(td => td.textContent.trim())
                    };
                }
            }
            return { rowsCount: 0, firstRowCells: [] };
        });
        
        console.log(`   📊 Verificação pós-preenchimento: ${verifyFill.rowsCount} linhas, primeira linha: [${verifyFill.firstRowCells.join(', ')}]`);
        
        // Se ainda estiver vazio, tentar uma última vez com abordagem mais agressiva
        if (verifyFill.firstRowCells.filter(c => c && c.length > 0).length < 3) {
            console.log('   ⚠️ Células ainda vazias, tentando preenchimento final agressivo...');
            await page.evaluate((valoresData) => {
                const tbody = document.querySelector('tbody');
                if (tbody) {
                    const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => !row.querySelector('th'));
                    console.log(`Preenchendo ${rows.length} linhas com abordagem agressiva...`);
                    rows.forEach((row, index) => {
                        if (valoresData[index]) {
                            const valor = valoresData[index];
                            const tds = Array.from(row.querySelectorAll('td'));
                            const codigoVal = valor.codigo || '';
                            const anoVal = String(valor.ano || '');
                            const mesVal = String(valor.mes || '');
                            const valorFormatado = valor.valor ? parseFloat(valor.valor).toFixed(4).replace(/\.?0+$/, '') : '0';
                            
                            // Preencher células de forma mais agressiva
                            if (tds.length > 0) {
                                // Limpar completamente e preencher
                                tds[0].textContent = '';
                                tds[0].innerHTML = codigoVal;
                                tds[0].textContent = codigoVal;
                            }
                            if (tds.length > 1) {
                                tds[1].textContent = '';
                                tds[1].innerHTML = anoVal;
                                tds[1].textContent = anoVal;
                            }
                            if (tds.length > 2) {
                                tds[2].textContent = '';
                                tds[2].innerHTML = mesVal;
                                tds[2].textContent = mesVal;
                            }
                            if (tds.length > 3) {
                                tds[3].textContent = '';
                                tds[3].innerHTML = valorFormatado;
                                tds[3].textContent = valorFormatado;
                            }
                            
                            // Forçar visibilidade
                            tds.forEach(td => {
                                td.style.cssText = 'display: table-cell !important; visibility: visible !important; opacity: 1 !important; padding: 12px !important;';
                            });
                        }
                    });
                    console.log('Preenchimento agressivo concluído');
                }
            }, additionalData.valores);
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Aguardar para garantir que o preenchimento foi aplicado
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Ajustar viewport para capturar toda a página antes do screenshot
    const bodyHeight = await page.evaluate(() => {
        return Math.max(
            document.body.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.clientHeight,
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight
        );
    });
    
    const bodyWidth = await page.evaluate(() => {
        return Math.max(
            document.body.scrollWidth,
            document.body.offsetWidth,
            document.documentElement.clientWidth,
            document.documentElement.scrollWidth,
            document.documentElement.offsetWidth
        );
    });
    
    console.log(`📐 Dimensões da página: ${bodyWidth}x${bodyHeight}`);
    
    // Preenchimento final ULTRA agressivo para valores da tabela de preços ANTES do screenshot
    if (additionalData.valores && additionalData.valores.length > 0 && config.htmlPath && config.htmlPath.includes('tabelapreco.valor.tab')) {
        console.log('🔧 Preenchimento final ULTRA agressivo antes do screenshot...');
        await page.evaluate((valoresData, recordData) => {
            const tbody = document.querySelector('tbody');
            if (tbody) {
                // Remover TODAS as linhas existentes
                tbody.innerHTML = '';
                
                // Criar novas linhas com dados diretamente
                valoresData.forEach((valor, index) => {
                    const tr = document.createElement('tr');
                    tr.style.cssText = 'display: table-row !important; visibility: visible !important; opacity: 1 !important;';
                    
                    const codigoVal = valor.codigo || '';
                    const anoVal = String(valor.ano || '');
                    const mesVal = String(valor.mes || '');
                    const valorFormatado = valor.valor ? parseFloat(valor.valor).toFixed(4).replace(/\.?0+$/, '') : '0';
                    
                    // Código
                    const td1 = document.createElement('td');
                    td1.innerHTML = codigoVal;
                    td1.textContent = codigoVal;
                    td1.style.cssText = 'padding: 12px; border-bottom: 1px solid #eee; display: table-cell !important; visibility: visible !important; white-space: nowrap;';
                    tr.appendChild(td1);
                    
                    // Ano
                    const td2 = document.createElement('td');
                    td2.innerHTML = anoVal;
                    td2.textContent = anoVal;
                    td2.style.cssText = 'padding: 12px; border-bottom: 1px solid #eee; display: table-cell !important; visibility: visible !important; white-space: nowrap;';
                    tr.appendChild(td2);
                    
                    // Mês
                    const td3 = document.createElement('td');
                    td3.innerHTML = mesVal;
                    td3.textContent = mesVal;
                    td3.style.cssText = 'padding: 12px; border-bottom: 1px solid #eee; display: table-cell !important; visibility: visible !important; white-space: nowrap;';
                    tr.appendChild(td3);
                    
                    // Valor
                    const td4 = document.createElement('td');
                    td4.innerHTML = valorFormatado;
                    td4.textContent = valorFormatado;
                    td4.style.cssText = 'padding: 12px; border-bottom: 1px solid #eee; display: table-cell !important; visibility: visible !important; white-space: nowrap;';
                    tr.appendChild(td4);
                    
                    // Ações
                    const td5 = document.createElement('td');
                    td5.style.cssText = 'padding: 12px; border-bottom: 1px solid #eee; width:70px; display: table-cell !important; visibility: visible !important;';
                    td5.innerHTML = '<i class="fa fa-edit" tooltip="Editar" style="cursor: pointer; margin-right: 8px;"></i><i class="fa fa-trash m-l-xs cursor" tooltip="Excluir" style="cursor: pointer;"></i>';
                    tr.appendChild(td5);
                    
                    tbody.appendChild(tr);
                });
                
                // Atualizar cabeçalho
                const header = document.querySelector('.h4');
                if (header && recordData) {
                    const headerText = (recordData.codigo ? recordData.codigo + ' - ' : '') + (recordData.nome || 'Tabela de Preços');
                    header.textContent = headerText;
                    header.innerHTML = '<i class="fa fa-table"></i> ' + headerText;
                }
                
                // Verificar se as linhas foram criadas corretamente
                const finalRows = tbody.querySelectorAll('tr');
                const firstRowCells = finalRows.length > 0 ? Array.from(finalRows[0].querySelectorAll('td')).map(td => td.textContent.trim()) : [];
                console.log(`✅ ${finalRows.length} linhas criadas no preenchimento final`);
                console.log(`📊 Primeira linha: [${firstRowCells.join(', ')}]`);
                
                return {
                    rowsCreated: finalRows.length,
                    firstRowCells: firstRowCells
                };
            }
            return { rowsCreated: 0, firstRowCells: [] };
        }, additionalData.valores, additionalData.record);
        
        const fillResult = await page.evaluate(() => {
            const tbody = document.querySelector('tbody');
            if (tbody) {
                const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => !row.querySelector('th'));
                const firstRowCells = rows.length > 0 ? Array.from(rows[0].querySelectorAll('td')).map(td => td.textContent.trim()) : [];
                return {
                    rowsCount: rows.length,
                    firstRowCells: firstRowCells
                };
            }
            return { rowsCount: 0, firstRowCells: [] };
        });
        
        console.log(`📊 Verificação pós-preenchimento final: ${fillResult.rowsCount} linhas, primeira linha: [${fillResult.firstRowCells.join(', ')}]`);
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Ajustar viewport se necessário para capturar toda a área
    const currentViewport = page.viewport();
    // Para valores da tabela, garantir viewport maior para capturar toda a tabela
    const minWidth = config.htmlPath && config.htmlPath.includes('tabelapreco.valor.tab') ? 1600 : bodyWidth + 100;
    const minHeight = config.htmlPath && config.htmlPath.includes('tabelapreco.valor.tab') ? 1200 : bodyHeight + 100;
    const newWidth = Math.max(currentViewport.width, minWidth);
    const newHeight = Math.max(currentViewport.height, minHeight);
    
    if (newWidth > currentViewport.width || newHeight > currentViewport.height) {
        await page.setViewport({
            width: newWidth,
            height: newHeight,
            deviceScaleFactor: currentViewport.deviceScaleFactor || 2
        });
        console.log(`📐 Viewport ajustado para: ${newWidth}x${newHeight}`);
    }
    
    // Capturar screenshot
    const outputPath = resolve(projectRoot, config.outputImage);
    console.log("📸 Capturando screenshot...");
    console.log("📁 Caminho de saída:", outputPath);
    await page.screenshot({
        path: outputPath,
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

