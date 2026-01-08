/**
 * Form Renderer Module
 * Functions to render HTML forms and add numbered badges
 */

// CSS para adicionar bullets numerados
export const NUMBER_BADGE_CSS = `
<style>
.element-number-badge {
    position: absolute;
    background: #ff0000;
    color: white;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    min-width: 28px;
    min-height: 28px;
    display: flex !important;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    border: 2px solid white;
    line-height: 1;
    padding: 0;
    margin: 0;
}

.form-group {
    position: relative;
}

.panel-heading {
    position: relative;
}

.panel-body {
    position: relative;
}

.checkbox {
    position: relative;
}
</style>
`;

/**
 * Generate JavaScript to add numbered badges to elements
 * @param {Array} elements - Array of element configurations
 * @returns {string} JavaScript code
 */
export function generateNumberBadgeScript(elements) {
    return `
<script>
(function() {
    const elements = ${JSON.stringify(elements)};
    
    elements.forEach(function(element) {
        const el = document.querySelector(element.selector);
        if (el) {
            const badge = document.createElement('div');
            badge.className = 'element-number-badge';
            badge.setAttribute('data-number', element.number);
            
            // Use custom position if provided, otherwise use defaults
            const position = element.position || {};
            badge.style.top = position.top || '-12px';
            badge.style.right = position.right || '-12px';
            badge.style.left = position.left || 'auto';
            badge.style.bottom = position.bottom || 'auto';
            
            el.style.position = 'relative';
            el.appendChild(badge);
        }
    });
    
    // Aguardar um pouco para garantir renderização
    setTimeout(function() {
        console.log('Números adicionados com sucesso');
    }, 500);
})();
</script>
`;
}

/**
 * Create full HTML wrapper with Bootstrap and styles
 * @param {string} formHTML - The form HTML content
 * @param {string} title - Page title
 * @param {Array} elements - Elements to number
 * @param {Object} customStyles - Additional custom CSS
 * @param {boolean} includeAngular - Whether to include AngularJS scripts
 * @returns {string} Complete HTML document
 */
export function createFullHTML(formHTML, title = 'Formulário', elements = [], customStyles = '', includeAngular = false) {
    const numberBadgeScript = generateNumberBadgeScript(elements);
    
    // AngularJS scripts if needed
    const angularScripts = includeAngular ? `
    <!-- AngularJS -->
    <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.8.3/angular.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/angular-ui-bootstrap/2.5.6/ui-bootstrap-tpls.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/angular-ui-sortable/0.19.0/sortable.min.js"></script>
    ` : '';
    
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    
    <!-- Bootstrap CSS -->
    <link href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- Font Awesome -->
    <link href="https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css" rel="stylesheet">
    
    ${NUMBER_BADGE_CSS}
    
    <style>
        body {
            padding: 20px;
            background: #f5f5f5;
        }
        .panel-body {
            background: white;
            padding: 20px;
        }
        .form-control {
            border: 1px solid #ddd;
        }
        .btn {
            margin: 2px;
        }
        .panel-heading {
            background: #f8f9fa;
            border-bottom: 1px solid #ddd;
            padding: 10px 15px;
        }
        ${customStyles}
    </style>
</head>
<body>
    <div class="container">
        <div class="panel panel-default">
            <div class="panel-heading">
                <h3 class="panel-title">${title}</h3>
            </div>
            ${formHTML}
        </div>
    </div>
    
    ${angularScripts}
    ${numberBadgeScript}
</body>
</html>`;
}

