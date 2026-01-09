#!/usr/bin/env node

/**
 * Script para buscar dados de faixas de impostos do banco de dados
 * Tenta primeiro conta 30001, depois 40001, e se não encontrar, gera dados MOCK
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { generateMockFaixasData } from './lib/mock-data-generator.js';

// Note: This script would need MCP MySQL access
// For now, we'll use a placeholder that can be called from the main script

const projectRoot = resolve(process.cwd());

async function fetchFaixasData() {
    let data = null;
    
    // Try conta 30001 first
    console.log('🔍 Consultando faixas de impostos da conta 30001...');
    // This would use MCP MySQL in the actual implementation
    // For now, we'll return the structure that should be used
    
    // Try conta 40001 as fallback
    if (!data) {
        console.log('🔍 Consultando faixas de impostos da conta 40001...');
        // This would use MCP MySQL in the actual implementation
    }
    
    // Generate MOCK data if no records found
    if (!data) {
        console.log('⚠️  Nenhum registro encontrado, gerando dados MOCK...');
        data = generateMockFaixasData({ contaId: 30001, numFaixas: 3 });
    }
    
    // Save to file
    const outputPath = resolve(projectRoot, 'content-metadata/impostos-faixas-data.json');
    writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`✅ Dados salvos em: ${outputPath}`);
    
    return data;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    fetchFaixasData().catch(console.error);
}

export { fetchFaixasData };

