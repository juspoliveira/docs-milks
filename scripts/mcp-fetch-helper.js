#!/usr/bin/env node

/**
 * Helper script to fetch data from MCP MySQL and save to temp file
 * This script is called before generate-form-image.js when useMCP is enabled
 */

import { writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * SQL query to fetch folha data (equivalent to milkspay/folha/find endpoint)
 */
const FOLHA_QUERY = `
    SELECT 
        f.id,
        f.referencia,
        f.dt_inicio_fornecimento,
        f.dt_fim_fornecimento,
        f.volume,
        f.total_fornecimento,
        f.preco_medio,
        f.status,
        f.simulacao,
        c.descricao as consolidacao,
        COUNT(p.id) as fornecedores
    FROM pay_folha f
    LEFT JOIN pay_consolidacao_qualidade c ON c.id = f.consolidacao_id
    LEFT JOIN pay_folha_pagamento p ON p.folha_id = f.id
    WHERE f.dt_exclusao IS NULL
    GROUP BY f.id
    ORDER BY f.id DESC
    LIMIT 5
`;

/**
 * Main function - this will be called externally with MCP data
 * @param {Object} mcpResult - Result from mcp_mysql_sql_query
 */
export function saveMCPData(mcpResult) {
    const tempDataPath = join(projectRoot, 'content-metadata', '.mcp-temp-data.json');
    
    try {
        if (mcpResult && mcpResult.result && Array.isArray(mcpResult.result)) {
            writeFileSync(tempDataPath, JSON.stringify(mcpResult, null, 2), 'utf-8');
            console.log(`✅ Dados MCP salvos em: ${tempDataPath}`);
            return true;
        } else {
            console.warn('⚠️  MCP retornou dados inválidos');
            return false;
        }
    } catch (error) {
        console.error(`❌ Erro ao salvar dados MCP: ${error.message}`);
        return false;
    }
}

// Se executado diretamente, apenas exportar a query para uso externo
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('Este script deve ser usado como módulo ou chamado externamente com dados MCP.');
    console.log(`Query SQL: ${FOLHA_QUERY}`);
}

export { FOLHA_QUERY };
