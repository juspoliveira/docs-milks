/**
 * Element Sorter Module
 * Functions to sort elements by visual position (top to bottom, left to right)
 */

/**
 * Get bounding rectangles for all elements using Puppeteer
 * @param {Object} page - Puppeteer page object
 * @param {Array} selectors - Array of CSS selectors
 * @returns {Promise<Array>} Array of elements with positions
 */
export async function getElementPositions(page, selectors) {
    const positions = await page.evaluate((selArray) => {
        const results = [];
        
        selArray.forEach((selector, index) => {
            try {
                const element = document.querySelector(selector);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    const style = window.getComputedStyle(element);
                    
                    // Skip if element is not visible
                    if (rect.width === 0 && rect.height === 0) {
                        return;
                    }
                    
                    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                        return;
                    }
                    
                    results.push({
                        selector: selector,
                        index: index,
                        top: rect.top,
                        left: rect.left,
                        bottom: rect.bottom,
                        right: rect.right,
                        width: rect.width,
                        height: rect.height,
                        centerX: rect.left + rect.width / 2,
                        centerY: rect.top + rect.height / 2
                    });
                }
            } catch (e) {
                console.warn(`Error getting position for selector ${selector}:`, e.message);
            }
        });
        
        return results;
    }, selectors);
    
    return positions;
}

/**
 * Sort elements by visual position (top to bottom, left to right)
 * @param {Array} positions - Array of element positions from getElementPositions
 * @param {number} lineTolerance - Tolerance in pixels for grouping elements in same line (default: 5)
 * @returns {Array} Sorted array with sequential numbers
 */
export function sortElementsByPosition(positions, lineTolerance = 5) {
    if (positions.length === 0) {
        return [];
    }
    
    // Group elements by line (similar top position)
    const lines = [];
    const processed = new Set();
    
    positions.forEach((pos, index) => {
        if (processed.has(index)) {
            return;
        }
        
        const line = [pos];
        processed.add(index);
        
        // Find other elements in the same line (within tolerance)
        positions.forEach((otherPos, otherIndex) => {
            if (processed.has(otherIndex)) {
                return;
            }
            
            const topDiff = Math.abs(pos.top - otherPos.top);
            if (topDiff <= lineTolerance) {
                line.push(otherPos);
                processed.add(otherIndex);
            }
        });
        
        // Sort line by left position
        line.sort((a, b) => {
            // First by top (in case of slight differences)
            if (Math.abs(a.top - b.top) > lineTolerance) {
                return a.top - b.top;
            }
            // Then by left
            return a.left - b.left;
        });
        
        lines.push(line);
    });
    
    // Sort lines by top position
    lines.sort((a, b) => {
        const aTop = a[0].top;
        const bTop = b[0].top;
        return aTop - bTop;
    });
    
    // Flatten and add sequential numbers
    const sorted = [];
    let number = 1;
    
    lines.forEach(line => {
        line.forEach(element => {
            sorted.push({
                ...element,
                number: number++
            });
        });
    });
    
    return sorted;
}

/**
 * Detect and sort form elements automatically
 * @param {Object} page - Puppeteer page object
 * @param {Array} detectedElements - Array of detected elements from element-detector
 * @returns {Promise<Array>} Sorted elements with sequential numbers
 */
export async function detectAndSortElements(page, detectedElements) {
    if (!detectedElements || detectedElements.length === 0) {
        return [];
    }
    
    // Extract selectors
    const selectors = detectedElements.map(el => el.selector);
    
    // Get positions
    const positions = await getElementPositions(page, selectors);
    
    // Sort by position
    const sorted = sortElementsByPosition(positions);
    
    // Combine with original element data
    const result = sorted.map(sortedEl => {
        const original = detectedElements.find(el => el.selector === sortedEl.selector);
        return {
            ...original,
            number: sortedEl.number,
            position: {
                top: sortedEl.top,
                left: sortedEl.left,
                centerX: sortedEl.centerX,
                centerY: sortedEl.centerY
            }
        };
    });
    
    return result;
}

/**
 * Generate badge position based on element position and type
 * @param {Object} element - Element with position data
 * @param {string} elementType - Type of element (input, select, button, etc.)
 * @returns {Object} Position object for badge
 */
export function generateBadgePosition(element, elementType) {
    const position = element.position || {};
    
    // Default positions based on element type
    const defaults = {
        input: { top: '-12px', right: '5px' },
        select: { top: '-12px', right: '5px' },
        textarea: { top: '-12px', right: '5px' },
        checkbox: { top: '-8px', left: '20px' },
        radio: { top: '-8px', left: '20px' },
        button: { top: '5px', right: '5px' },
        'panel-heading': { top: '5px', right: '5px' },
        'form-group': { top: '-12px', right: '5px' },
        clickable: { top: '5px', right: '5px' },
        dropdown: { top: '5px', right: '5px' },
        sortable: { top: '5px', left: '5px' }
    };
    
    return defaults[elementType] || defaults.input;
}

