/**
 * Element Detector Module
 * Functions to detect interactive form elements using Puppeteer
 */

/**
 * Detect interactive elements from rendered page using Puppeteer
 * @param {Object} page - Puppeteer page object
 * @returns {Promise<Array>} Array of detected elements with selectors and metadata
 */
export async function detectElements(page) {
    const elements = await page.evaluate(() => {
        const results = [];
        const foundElements = new Set();
        
        /**
         * Generate unique CSS selector for an element
         */
        function generateSelector(element) {
            if (element.id) {
                return `#${element.id}`;
            }
            
            // Build selector from tag name and classes
            let selector = element.tagName.toLowerCase();
            
            if (element.className && typeof element.className === 'string') {
                const classes = element.className.trim().split(/\s+/).filter(c => c);
                if (classes.length > 0) {
                    selector += '.' + classes.join('.');
                }
            }
            
            // Add attributes for uniqueness
            const attrs = [];
            if (element.getAttribute('name')) {
                attrs.push(`[name="${element.getAttribute('name')}"]`);
            }
            if (element.getAttribute('ng-model')) {
                attrs.push(`[ng-model="${element.getAttribute('ng-model')}"]`);
            }
            if (element.getAttribute('type')) {
                attrs.push(`[type="${element.getAttribute('type')}"]`);
            }
            
            selector += attrs.join('');
            
            return selector;
        }
        
        /**
         * Get label text for an element
         */
        function getLabelText(element) {
            // Check for associated label via 'for' attribute
            const id = element.getAttribute('id');
            if (id) {
                const label = document.querySelector(`label[for="${id}"]`);
                if (label) {
                    return label.textContent.trim();
                }
            }
            
            // Check for parent label
            let parent = element.parentElement;
            while (parent && parent.tagName !== 'BODY') {
                if (parent.tagName === 'LABEL') {
                    return parent.textContent.trim();
                }
                parent = parent.parentElement;
            }
            
            // Check for preceding label in same form-group
            const formGroup = element.closest('.form-group');
            if (formGroup) {
                const label = formGroup.querySelector('label');
                if (label) {
                    return label.textContent.trim();
                }
            }
            
            return '';
        }
        
        // Selectors for editable elements related to database attributes
        // Only elements with ng-model linked to record.* (database fields)
        const selectors = [
            // Inputs with ng-model linked to record (database fields)
            'input[ng-model^="record."]',
            // Selects with ng-model linked to record
            'select[ng-model^="record."]',
            // Select2 elements (custom select components)
            'select2[ng-model^="record."]',
            // Any element with ng-model linked to record (for custom components)
            '[ng-model^="record."]',
            // Textareas with ng-model linked to record
            'textarea[ng-model^="record."]',
            // Area for formula construction
            '[ui-sortable][ng-model="record.formula"]',
            '[ui-sortable]'
        ];
        
        selectors.forEach(selector => {
            try {
                const nodes = document.querySelectorAll(selector);
                nodes.forEach(element => {
                    // Skip if already processed
                    if (foundElements.has(element)) {
                        return;
                    }
                    
                    // Skip hidden elements
                    const style = window.getComputedStyle(element);
                    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                        return;
                    }
                    
                    // Skip elements with ng-if="false" or similar
                    const ngIf = element.getAttribute('ng-if');
                    if (ngIf === 'false' || ngIf === '0') {
                        return;
                    }
                    
                    // EXCLUIR: Títulos, headers, elementos decorativos
                    const tagName = element.tagName.toLowerCase();
                    const className = element.className || '';
                    
                    // Excluir títulos e headers
                    if (tagName.match(/^h[1-6]$/i) || 
                        className.includes('panel-title') ||
                        element.classList.contains('panel-title')) {
                        return;
                    }
                    
                    // Excluir labels (apenas inputs serão numerados)
                    if (tagName === 'label') {
                        return;
                    }
                    
                    // Excluir mensagens de validação
                    if (tagName === 'ng-messages' || className.includes('ng-message')) {
                        return;
                    }
                    
                    // Excluir separadores decorativos
                    if (className.includes('line') && className.includes('dashed')) {
                        return;
                    }
                    
                    // Excluir ícones decorativos (sem interação)
                    if (tagName === 'i' && !element.hasAttribute('ng-click')) {
                        return;
                    }
                    
                    // Excluir botões individuais dentro do panel-heading
                    // (os botões são parte do elemento 3, não devem ser numerados individualmente)
                    if (tagName === 'button' && element.closest('.panel-heading')) {
                        return;
                    }
                    
                    // Excluir form-groups que são apenas containers
                    if (tagName === 'div' && className.includes('form-group') && 
                        !element.querySelector('input[ng-model], select[ng-model], textarea[ng-model], select2[ng-model]')) {
                        return;
                    }
                    
                    // Excluir spans e divs que não são elementos editáveis diretos
                    // (mas manter select2 que é um componente customizado)
                    if ((tagName === 'span' || tagName === 'div') && 
                        !element.hasAttribute('ng-model') && 
                        tagName !== 'select2') {
                        return;
                    }
                    
                    foundElements.add(element);
                    
                    const elementSelector = generateSelector(element);
                    const label = getLabelText(element);
                    
                    // Determine element type
                    let type = tagName;
                    if (tagName === 'input') {
                        type = element.getAttribute('type') || 'text';
                    } else if (tagName === 'select2') {
                        type = 'select';
                    } else if (element.hasAttribute('ui-sortable')) {
                        type = 'sortable';
                    }
                    
                    results.push({
                        selector: elementSelector,
                        tagName: tagName,
                        type: type,
                        label: label,
                        name: element.getAttribute('name') || '',
                        id: element.getAttribute('id') || '',
                        ngModel: element.getAttribute('ng-model') || '',
                        className: className
                    });
                });
            } catch (e) {
                // Skip selectors that cause errors (e.g., :has() not supported in all browsers)
            }
        });
        
        return results;
    });
    
    return elements;
}

/**
 * Filter and prioritize elements for numbering
 * Only include editable elements related to database attributes that are documented
 * @param {Array} elements - Array of detected elements
 * @returns {Array} Filtered and prioritized elements
 */
export function filterElements(elements) {
    const filtered = [];
    const seen = new Set();
    
    // Campos conhecidos das tabelas que são documentados
    // pay_modelo_pagamento
    const modeloPagamentoFields = ['codigo', 'modelo', 'ativo', 'formula'];
    // pay_contrato
    const contratoFields = [
        'codigo', 'produtor_id', 'fazenda_id', 'contrato_principal_id', 
        'versao_id', 'modelo_pagamento_id', 'vigencia_inicio', 'vigencia_fim',
        'distancia_pagto_logistica', 'adicional_acordo', 'tipo_bonus_volume',
        'tanque_id', 'cooperativa_id', 'substituir_producao_por_bonus_volume',
        'emissao_nfe', 'meio_pagamento', 'banco', 'agencia', 'conta', 'tipo_conta',
        'beneficiario', 'nome_beneficiario', 'cpf_beneficiario',
        'possui_gestao', 'tipo_bonus_gestao', 'gestao_tanque_id', 'gestao_cooperativa_id',
        'utiliza_volume_informado'
    ];
    
    // Mapeamento de IDs/names do HTML para campos da base
    const idToFieldMap = {
        'codigo': 'codigo',
        'produtor': 'produtor_id',
        'fazenda': 'fazenda_id',
        'ctprincipal': 'contrato_principal_id',
        'versao': 'versao_id',
        'modelo': 'modelo_pagamento_id',
        'dt_inicio': 'vigencia_inicio',
        'dt_fim': 'vigencia_fim',
        'distancia_pagto_logistica': 'distancia_pagto_logistica',
        'acordo': 'adicional_acordo',
        'tipo': 'tipo_bonus_volume',
        'tanque': 'tanque_id',
        'cooperativa': 'cooperativa_id',
        'emissao_nfe': 'emissao_nfe',
        'meio_pagamento': 'meio_pagamento',
        'banco': 'banco',
        'agencia': 'agencia',
        'conta': 'conta',
        'tipo_conta': 'tipo_conta',
        'beneficiario': 'beneficiario',
        'nomeBeneficiario': 'nome_beneficiario',
        'cpf': 'cpf_beneficiario',
        'tipo_gestao': 'tipo_bonus_gestao',
        'tanque_gestao': 'gestao_tanque_id',
        'cooperativa_gestao': 'gestao_cooperativa_id'
    };
    
    // Combinar todos os campos
    const allDbFields = [...new Set([...modeloPagamentoFields, ...contratoFields])];
    
    elements.forEach(el => {
        // Skip if selector already seen
        if (seen.has(el.selector)) {
            return;
        }
        
        // CRITÉRIO 1: ng-model vinculado a record.* (atributo da base de dados)
        if (el.ngModel && el.ngModel.startsWith('record.')) {
            const fieldName = el.ngModel.replace('record.', '');
            if (allDbFields.includes(fieldName)) {
                // Verificar se é um elemento editável (input, select, select2, textarea)
                // input inclui checkbox, radio, text, etc.
                if (['input', 'select', 'select2', 'textarea'].includes(el.tagName)) {
                    seen.add(el.selector);
                    filtered.push(el);
                    return;
                }
            }
        }
        
        // CRITÉRIO 2: id ou name corresponde a campo da base de dados (via mapeamento)
        if (el.id || el.name) {
            const htmlId = el.id || el.name;
            // Verificar mapeamento direto
            if (idToFieldMap[htmlId] && allDbFields.includes(idToFieldMap[htmlId])) {
                if (['input', 'select', 'select2', 'textarea'].includes(el.tagName)) {
                    seen.add(el.selector);
                    filtered.push(el);
                    return;
                }
            }
            // Verificar se o id/name corresponde diretamente a um campo
            if (allDbFields.includes(htmlId)) {
                if (['input', 'select', 'select2', 'textarea'].includes(el.tagName)) {
                    seen.add(el.selector);
                    filtered.push(el);
                    return;
                }
            }
        }
        
        // CRITÉRIO 3: Área ui-sortable com ng-model="record.formula" (área de construção de fórmula)
        if (el.type === 'sortable' && el.ngModel === 'record.formula') {
            seen.add(el.selector);
            filtered.push(el);
            return;
        }
        
        // CRITÉRIO 4: Checkboxes com ng-model relacionado a campos da base
        if (el.tagName === 'input' && el.type === 'checkbox' && el.ngModel) {
            const fieldName = el.ngModel.replace('record.', '');
            if (allDbFields.includes(fieldName)) {
                seen.add(el.selector);
                filtered.push(el);
                return;
            }
        }
        
        // EXCLUIR: Todos os outros elementos não atendem aos critérios
        // (não retorna, elemento é excluído)
    });
    
    return filtered;
}

