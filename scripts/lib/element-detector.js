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
        
        // Selectors for interactive elements
        const selectors = [
            'input[type="text"]',
            'input[type="number"]',
            'input[type="email"]',
            'input[type="password"]',
            'input[type="tel"]',
            'input[type="url"]',
            'input[type="date"]',
            'input[type="time"]',
            'input[type="datetime-local"]',
            'input[type="search"]',
            'input[type="checkbox"]',
            'input[type="radio"]',
            'input[type="button"]',
            'input[type="submit"]',
            'input[type="reset"]',
            'select',
            'textarea',
            'button',
            '[ng-click]',
            '[uib-dropdown]',
            '[ui-sortable]',
            '.panel-heading',
            '.form-group:has(input, select, textarea, button)'
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
                    
                    foundElements.add(element);
                    
                    const elementSelector = generateSelector(element);
                    const label = getLabelText(element);
                    const tagName = element.tagName.toLowerCase();
                    
                    // Determine element type
                    let type = tagName;
                    if (tagName === 'input') {
                        type = element.getAttribute('type') || 'text';
                    } else if (element.hasAttribute('ng-click')) {
                        type = 'clickable';
                    } else if (element.hasAttribute('uib-dropdown')) {
                        type = 'dropdown';
                    } else if (element.hasAttribute('ui-sortable')) {
                        type = 'sortable';
                    } else if (element.classList.contains('panel-heading')) {
                        type = 'panel-heading';
                    } else if (element.classList.contains('form-group')) {
                        type = 'form-group';
                    }
                    
                    results.push({
                        selector: elementSelector,
                        tagName: tagName,
                        type: type,
                        label: label,
                        name: element.getAttribute('name') || '',
                        id: element.getAttribute('id') || '',
                        ngModel: element.getAttribute('ng-model') || '',
                        className: element.className || ''
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
 * @param {Array} elements - Array of detected elements
 * @returns {Array} Filtered and prioritized elements
 */
export function filterElements(elements) {
    const filtered = [];
    const seen = new Set();
    
    elements.forEach(el => {
        // Skip if selector already seen
        if (seen.has(el.selector)) {
            return;
        }
        
        // Skip pure container elements that don't have direct interaction
        // form-group elements are already filtered in detection (only those with inputs/selects/buttons)
        
        seen.add(el.selector);
        filtered.push(el);
    });
    
    return filtered;
}

