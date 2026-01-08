#!/usr/bin/env node

/**
 * Helper script to fetch database data via MCP MySQL
 * This script is meant to be called by the AI assistant using MCP functions
 * 
 * Usage: The AI will call MCP MySQL functions and save the result to a JSON file
 * This script provides the structure for what data to fetch
 */

import { writeFileSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

/**
 * Save database record to JSON file
 * @param {Object} record - Database record
 * @param {string} outputPath - Output file path
 */
export function saveDatabaseRecord(record, outputPath) {
    const fullPath = resolve(projectRoot, outputPath);
    writeFileSync(fullPath, JSON.stringify(record, null, 2), 'utf-8');
    console.log(`✅ Dados salvos em: ${fullPath}`);
    return fullPath;
}

/**
 * Generate SQL query for fetching payment model record
 * @param {number} contaId - Account ID
 * @returns {string} SQL query
 */
export function getPaymentModelQuery(contaId = 40001) {
    return `SELECT id, conta_id, codigo, modelo, formula, ativo 
            FROM pay_modelo_pagamento 
            WHERE conta_id = ${contaId} AND dt_exclusao IS NULL 
            ORDER BY id DESC 
            LIMIT 1`;
}

// This script is primarily a helper for the AI assistant
// The AI will use MCP MySQL functions to execute queries and save results
console.log("💡 Este script fornece funções auxiliares para buscar dados do banco.");
console.log("💡 Use as funções MCP MySQL para executar queries e salvar os resultados.");

