/**
 * Mock Data Generator Module
 * Functions to generate mock data when database records are not available
 */

/**
 * Generate mock data for tax bands (faixas de impostos)
 * Generic function that can be used as fallback when no database records are found
 * @param {Object} options - Options for generating mock data
 * @param {number} options.contaId - Account ID (optional, defaults to 40001)
 * @param {number} options.numFaixas - Number of bands to generate (optional, defaults to 3)
 * @param {string} options.descricao - Imposto description (optional, defaults to 'Imposto de Exemplo')
 * @param {string} options.codigo - Imposto code (optional, auto-generated if not provided)
 * @returns {Object} Mock data object with imposto and faixas
 */
export function generateMockFaixasData(options = {}) {
    const contaId = options.contaId || 40001;
    const numFaixas = options.numFaixas || 3;
    const descricao = options.descricao || 'Imposto de Exemplo';
    const codigo = options.codigo || `IMP-${String(Math.floor(Math.random() * 100)).padStart(3, '0')}`;
    
    // Generate mock imposto
    const imposto = {
        id: Math.floor(Math.random() * 1000) + 1,
        codigo: codigo,
        descricao: descricao,
        conta_id: contaId
    };
    
    // Generate mock faixas with realistic ranges
    const faixas = [];
    let volumeMinimo = 100;
    
    for (let i = 0; i < numFaixas; i++) {
        const volumeMaximo = volumeMinimo + Math.floor(Math.random() * 1000) + 200;
        const percentual = (Math.random() * 5 + 0.5).toFixed(4); // Between 0.5% and 5.5%
        
        faixas.push({
            id: Math.floor(Math.random() * 1000) + 1,
            imposto_id: imposto.id,
            volume_minimo: volumeMinimo,
            volume_maximo: volumeMaximo,
            percentual: percentual
        });
        
        volumeMinimo = volumeMaximo + 1;
    }
    
    return {
        imposto,
        faixas
    };
}

/**
 * Generate mock data for a generic record
 * @param {Object} schema - Schema definition with field types
 * @param {Object} options - Options for generating mock data
 * @returns {Object} Mock record object
 */
export function generateMockRecord(schema, options = {}) {
    const record = {};
    
    for (const [field, type] of Object.entries(schema)) {
        switch (type) {
            case 'string':
                record[field] = `Mock ${field}`;
                break;
            case 'number':
                record[field] = Math.floor(Math.random() * 1000) + 1;
                break;
            case 'decimal':
                record[field] = (Math.random() * 100).toFixed(4);
                break;
            case 'boolean':
                record[field] = Math.random() > 0.5;
                break;
            case 'date':
                record[field] = new Date().toISOString().split('T')[0];
                break;
            default:
                record[field] = `Mock ${field}`;
        }
    }
    
    return record;
}

/**
 * Generate mock data for a list of records
 * @param {Object} schema - Schema definition with field types
 * @param {number} count - Number of records to generate
 * @param {Object} options - Options for generating mock data
 * @returns {Array} Array of mock records
 */
export function generateMockRecords(schema, count = 5, options = {}) {
    const records = [];
    
    for (let i = 0; i < count; i++) {
        records.push(generateMockRecord(schema, options));
    }
    
    return records;
}

