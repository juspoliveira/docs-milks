#!/usr/bin/env node

/**
 * Script para adicionar badges numerados na imagem do menu de relatórios
 */

import sharp from 'sharp';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * Create badge SVG as buffer
 */
function createBadgeSVG(number, size = 28) {
    const fontSize = Math.floor(size * 0.5);
    const svg = `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="#5bc0de" stroke="#ffffff" stroke-width="2"/>
    <text x="${size/2}" y="${size/2 + fontSize/3}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${number}</text>
</svg>`;
    return Buffer.from(svg);
}

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
    if (config.sourceImage && !config.sourceImage.startsWith('/')) {
        config.sourceImage = resolve(projectRoot, config.sourceImage);
    }
    
    if (config.outputImage && !config.outputImage.startsWith('/')) {
        config.outputImage = resolve(projectRoot, config.outputImage);
    }
    
    return config;
}

/**
 * Add badges to image
 */
async function addBadgesToImage() {
    console.log("📄 Adicionando badges na imagem do menu de relatórios...");
    
    const configPath = resolve(projectRoot, 'content-metadata/menu-relatorio-pay-badges-config.json');
    const config = loadConfig(configPath);
    
    console.log(`   📁 Imagem fonte: ${config.sourceImage}`);
    console.log(`   📁 Imagem saída: ${config.outputImage}`);
    
    if (!existsSync(config.sourceImage)) {
        throw new Error(`Source image not found: ${config.sourceImage}`);
    }
    
    // Load image and get metadata
    const image = sharp(config.sourceImage);
    const metadata = await image.metadata();
    
    console.log(`   📐 Dimensões: ${metadata.width}x${metadata.height}`);
    
    // Create composite operations for badges
    const compositeOperations = [];
    const badgeSize = 28;
    
    for (const badge of config.badges) {
        const badgeSVG = createBadgeSVG(badge.number, badgeSize);
        
        // Position badge (x, y are top-left coordinates)
        // Adjust to center the badge at the specified position
        const left = Math.max(0, badge.x - badgeSize / 2);
        const top = Math.max(0, badge.y - badgeSize / 2);
        
        compositeOperations.push({
            input: badgeSVG,
            left: Math.round(left),
            top: Math.round(top)
        });
        
        console.log(`   ✅ Badge ${badge.number}: ${badge.name} - (${Math.round(left)}, ${Math.round(top)})`);
    }
    
    // Apply badges to image
    await image
        .composite(compositeOperations)
        .toFile(config.outputImage);
    
    console.log('\n✅ Imagem gerada com sucesso!');
    console.log(`📁 Arquivo: ${config.outputImage}`);
}

// Run
addBadgesToImage().catch(error => {
    console.error('❌ Erro ao adicionar badges:', error);
    process.exit(1);
});
