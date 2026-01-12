#!/usr/bin/env node

/**
 * Script para adicionar badges numerados em uma imagem existente
 * Usa Puppeteer para obter coordenadas dos elementos HTML e Sharp para adicionar badges na imagem
 */

import sharp from 'sharp';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createFullHTML } from './lib/form-renderer.js';
import { processAngularTemplates, injectAngularScripts } from './lib/angular-processor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * Load configuration from JSON file
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
 * Create badge SVG as buffer
 */
function createBadgeSVG(number, size = 28) {
    const fontSize = Math.floor(size * 0.5);
    const svg = `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="#ff0000" stroke="#ffffff" stroke-width="2"/>
    <text x="${size/2}" y="${size/2 + fontSize/3}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${number}</text>
</svg>`;
    return Buffer.from(svg);
}

/**
 * Get element coordinates from Puppeteer page
 */
async function getElementCoordinates(page, selector, position) {
    try {
        const element = await page.$(selector);
        if (!element) {
            console.warn(`⚠️  Elemento não encontrado: ${selector}`);
            return null;
        }
        
        const box = await element.boundingBox();
        if (!box) {
            console.warn(`⚠️  Não foi possível obter coordenadas para: ${selector}`);
            return null;
        }
        
        // Ajustar coordenadas baseado na posição configurada
        const top = position?.top || '-12px';
        const right = position?.right || '5px';
        
        // Converter posições relativas para pixels
        const topOffset = top.includes('px') ? parseFloat(top) : 0;
        const rightOffset = right.includes('px') ? parseFloat(right) : 0;
        
        // Calcular posição do badge (canto superior direito do elemento)
        const badgeX = box.x + box.width + rightOffset - 14; // -14 para centralizar badge de 28px
        const badgeY = box.y + topOffset - 14; // -14 para centralizar badge de 28px
        
        return {
            x: Math.max(0, Math.round(badgeX)),
            y: Math.max(0, Math.round(badgeY)),
            elementBox: box
        };
    } catch (error) {
        console.warn(`⚠️  Erro ao obter coordenadas de ${selector}: ${error.message}`);
        return null;
    }
}

/**
 * Calculate coordinates based on image structure (fallback when Puppeteer is not available)
 * Coordenadas baseadas na análise visual da imagem 2234x1452
 */
function calculateCoordinatesFromConfig(config, imageWidth, imageHeight) {
    // Coordenadas baseadas na imagem real (2234x1452)
    // Ajustadas proporcionalmente para a imagem atual
    const baseWidth = 2234;
    const baseHeight = 1452;
    const scaleX = imageWidth / baseWidth;
    const scaleY = imageHeight / baseHeight;
    
    // Coordenadas na imagem base (2234x1452)
    const baseCoords = {
        1: { x: 1950, y: 110 },   // Botão "Nova folha" (canto superior direito)
        2: { x: 1950, y: 165 },   // Dropdown "Simulação" (abaixo do botão)
        3: { x: 1800, y: 110 },   // Botão "Filtrar"
        4: { x: 70, y: 280 },     // Coluna "FOLHA"
        5: { x: 840, y: 280 },    // Coluna "FORNECIMENTO"
        6: { x: 1120, y: 280 },   // Coluna "TOTAL BRUTO"
        7: { x: 1400, y: 280 },   // Coluna "PREÇO MÉDIO"
        8: { x: 1680, y: 280 },   // Coluna "STATUS"
        9: { x: 1970, y: 280 },   // Ícone "Visualizar" (alinhado verticalmente com badge 2, um pouco mais à direita)
        10: { x: 2030, y: 280 },  // Ícone "Editar" (alinhado verticalmente com badge 2, espaçado)
        11: { x: 2090, y: 280 }   // Ícone "Excluir" (alinhado verticalmente com badge 2, espaçado)
    };
    
    const coordinates = [];
    for (const element of config.elements || []) {
        const base = baseCoords[element.number];
        if (base) {
            const x = Math.round(base.x * scaleX);
            const y = Math.round(base.y * scaleY);
            coordinates.push({
                number: element.number,
                label: element.label,
                x: x,
                y: y,
                selector: element.selector
            });
            console.log(`   📍 ${element.number}. ${element.label} - (${x}, ${y}) [estimado]`);
        } else {
            console.warn(`   ⚠️  Coordenadas não definidas para elemento ${element.number}`);
        }
    }
    
    return coordinates;
}

/**
 * Main function
 */
async function addBadgesToImage(configPath, sourceImagePath, outputImagePath, useManualCoords = false) {
    console.log('🎨 Adicionando badges numerados à imagem...\n');
    
    // Carregar configuração
    const config = loadConfig(configPath);
    console.log(`📄 Configuração carregada: ${config.pageName}`);
    
    // Verificar se a imagem fonte existe
    const sourcePath = resolve(projectRoot, sourceImagePath);
    if (!existsSync(sourcePath)) {
        throw new Error(`Imagem fonte não encontrada: ${sourcePath}`);
    }
    
    // Carregar imagem existente
    const image = sharp(sourcePath);
    const metadata = await image.metadata();
    console.log(`📐 Dimensões da imagem: ${metadata.width}x${metadata.height}`);
    
    // Usar coordenadas estimadas (Puppeteer não funciona no sandbox)
    console.log('\n📍 Usando coordenadas estimadas baseadas na estrutura visual...');
    const coordinates = calculateCoordinatesFromConfig(config, metadata.width, metadata.height);
    
    if (coordinates.length === 0) {
        throw new Error('Nenhuma coordenada foi obtida. Verifique a configuração.');
    }
    
    console.log(`\n📊 Total de coordenadas obtidas: ${coordinates.length}`);
    
    // Adicionar badges na imagem
    console.log('\n🎨 Adicionando badges na imagem...');
    
    // Preparar todas as composições de uma vez
    const composites = [];
    for (const coord of coordinates) {
        // Criar badge SVG
        const badgeSVG = createBadgeSVG(coord.number, 28);
        
        // Adicionar à lista de composições
        composites.push({
            input: badgeSVG,
            left: coord.x,
            top: coord.y
        });
        
        console.log(`   ✅ Badge ${coord.number} (${coord.label}) preparado para (${coord.x}, ${coord.y})`);
    }
    
    // Aplicar todas as composições de uma vez
    console.log(`\n🔄 Aplicando ${composites.length} badges na imagem...`);
    const imageWithBadges = image.composite(composites);
    
    // Salvar imagem
    const outputPath = resolve(projectRoot, outputImagePath);
    await imageWithBadges.toFile(outputPath);
    
    console.log(`\n✅ Imagem salva em: ${outputPath}`);
    console.log(`📊 Total de badges adicionados: ${coordinates.length}`);
}

// Executar
const configPath = process.argv[2] || 'content-metadata/folha-list-image-config.json';
const sourceImagePath = process.argv[3] || 'assets/folha-list.png';
const outputImagePath = process.argv[4] || 'assets/folha-list-with-badges.png';
const useManual = process.argv[5] === '--manual' || process.argv.includes('--manual');

addBadgesToImage(configPath, sourceImagePath, outputImagePath, useManual).catch(error => {
    console.error('\n❌ Erro:', error.message);
    if (error.stack) {
        console.error(error.stack);
    }
    process.exit(1);
});
