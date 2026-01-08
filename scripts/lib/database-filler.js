/**
 * Database Filler Module
 * Functions to fetch data from MySQL database and fill forms
 */

/**
 * Fetch a record from the database using MCP MySQL
 * @param {Object} config - Database configuration
 * @param {string} config.table - Table name
 * @param {number} config.contaId - Account ID to filter
 * @param {Array} config.fields - Fields to select
 * @param {string} config.where - Additional WHERE clause (optional)
 * @param {string} config.orderBy - ORDER BY clause (optional)
 * @param {number} config.limit - Limit number of records (optional)
 * @returns {Promise<Object|null>} Record object or null if not found
 */
export async function getDatabaseRecord(config) {
    const { table, contaId, fields = ['*'], where = '', orderBy = '', limit = 1 } = config;
    
    // Build SELECT clause
    const selectFields = fields.includes('*') ? '*' : fields.join(', ');
    
    // Build WHERE clause
    let whereClause = `conta_id = ${contaId}`;
    if (where) {
        whereClause += ` AND ${where}`;
    }
    
    // Build ORDER BY clause
    let orderByClause = '';
    if (orderBy) {
        orderByClause = ` ORDER BY ${orderBy}`;
    }
    
    // Build LIMIT clause
    const limitClause = limit ? ` LIMIT ${limit}` : '';
    
    // Build SQL query
    const sql = `SELECT ${selectFields} FROM ${table} WHERE ${whereClause}${orderByClause}${limitClause}`;
    
    try {
        // Note: This function will be called from the main script which has access to MCP
        // For now, we return the SQL query and configuration
        // The actual execution will happen in the main script
        return {
            sql,
            config
        };
    } catch (error) {
        console.error(`Error building database query: ${error.message}`);
        return null;
    }
}

/**
 * Fill form fields with data from database record
 * @param {Object} page - Puppeteer page object
 * @param {Object} record - Database record
 * @param {Object} mappings - Field mappings (selector -> field name)
 * @returns {Promise<void>}
 */
export async function fillFormFields(page, record, mappings) {
    for (const [selector, mapping] of Object.entries(mappings)) {
        try {
            const fieldName = typeof mapping === 'string' ? mapping : mapping.field;
            const fieldType = typeof mapping === 'object' ? mapping.type : 'text';
            const value = record[fieldName];
            
            if (value === undefined || value === null) {
                continue;
            }
            
            // Wait for element to be available
            await page.waitForSelector(selector, { timeout: 3000 }).catch(() => {
                console.warn(`Element not found: ${selector}`);
            });
            
            // Fill based on field type
            if (fieldType === 'checkbox') {
                const trueValue = mapping.trueValue !== undefined ? mapping.trueValue : 1;
                const isChecked = value == trueValue;
                
                await page.evaluate((sel, checked) => {
                    const element = document.querySelector(sel);
                    if (element) {
                        element.checked = checked;
                        // Trigger change event for AngularJS
                        const event = new Event('change', { bubbles: true });
                        element.dispatchEvent(event);
                    }
                }, selector, isChecked);
                
            } else if (fieldType === 'select') {
                await page.select(selector, String(value));
                
            } else {
                // Text input, textarea, etc.
                await page.evaluate((sel, val) => {
                    const element = document.querySelector(sel);
                    if (element) {
                        element.value = val;
                        // Trigger input event for AngularJS
                        const event = new Event('input', { bubbles: true });
                        element.dispatchEvent(event);
                    }
                }, selector, String(value));
            }
            
            // Small delay between fields
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (error) {
            console.warn(`Error filling field ${selector}: ${error.message}`);
        }
    }
    
    // Wait for AngularJS digest cycle if needed
    await page.evaluate(() => {
        if (window.angular) {
            const injector = window.angular.element(document.body).injector();
            if (injector) {
                const $rootScope = injector.get('$rootScope');
                if ($rootScope) {
                    $rootScope.$apply();
                }
            }
        }
    });
}

/**
 * Render formula JSON as visual elements in the construction area
 * @param {Object} page - Puppeteer page object
 * @param {string|Object} formula - Formula JSON string or object
 * @param {string} targetSelector - Selector for the construction area
 * @returns {Promise<void>}
 */
export async function renderFormula(page, formula, targetSelector) {
    try {
        // Parse formula if it's a string
        const formulaObj = typeof formula === 'string' ? JSON.parse(formula) : formula;
        
        if (!Array.isArray(formulaObj)) {
            console.warn('Formula is not an array, skipping render');
            return;
        }
        
        // Wait for target element
        await page.waitForSelector(targetSelector, { timeout: 3000 });
        
        // Render formula elements
        await page.evaluate((formulaData, targetSel) => {
            const target = document.querySelector(targetSel);
            if (!target) {
                console.warn('Target element not found:', targetSel);
                return;
            }
            
            // Clear existing content
            target.innerHTML = '';
            
            // Create visual elements for each formula component
            formulaData.forEach((element, index) => {
                const div = document.createElement('div');
                div.className = 'm-b-sm m-r-xs';
                div.style.cssText = 'float: left;';
                
                const button = document.createElement('a');
                button.href = '#';
                button.className = `btn btn-lg btn-${element.type || 'default'}`;
                
                const bold = document.createElement('b');
                bold.textContent = element.display || element.id || `Element ${index + 1}`;
                button.appendChild(bold);
                
                div.appendChild(button);
                target.appendChild(div);
            });
            
            // Trigger AngularJS update if available
            if (window.angular) {
                const injector = window.angular.element(document.body).injector();
                if (injector) {
                    const $rootScope = injector.get('$rootScope');
                    if ($rootScope) {
                        $rootScope.$apply();
                    }
                }
            }
        }, formulaObj, targetSelector);
        
        // Wait for rendering
        await new Promise(resolve => setTimeout(resolve, 500));
        
    } catch (error) {
        console.warn(`Error rendering formula: ${error.message}`);
    }
}

