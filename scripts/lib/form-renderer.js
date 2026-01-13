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
    <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.8.3/angular-animate.min.js"></script>
    <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.8.3/angular-aria.min.js"></script>
    <!-- Angular Material JS -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/angular-material/1.2.2/angular-material.min.js"></script>
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
    
    <!-- Angular Material CSS -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/angular-material/1.2.2/angular-material.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    
    <!-- Font Awesome -->
    <link href="https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css" rel="stylesheet">
    
    <!-- ag-Grid CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ag-grid-community@31.0.0/styles/ag-grid.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ag-grid-community@31.0.0/styles/ag-theme-alpine.css">
    
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
        /* Material Design Icons */
        md-icon {
            font-family: 'Material Icons';
            font-weight: normal;
            font-style: normal;
            font-size: 24px;
            line-height: 1;
            letter-spacing: normal;
            text-transform: none;
            display: inline-block;
            white-space: nowrap;
            word-wrap: normal;
            direction: ltr;
            -webkit-font-feature-settings: 'liga';
            -webkit-font-smoothing: antialiased;
            cursor: pointer;
            color: #666;
        }
        md-icon:hover {
            color: #333;
        }
        /* Material Design Table */
        md-table-container {
            overflow-x: auto;
        }
        md-table {
            width: 100%;
            border-collapse: collapse;
        }
        md-table th {
            text-align: left;
            font-weight: bold;
            padding: 12px;
            border-bottom: 2px solid #ddd;
        }
        md-table td {
            padding: 12px;
            border-bottom: 1px solid #eee;
        }
        td.action {
            text-align: right;
            white-space: nowrap;
            overflow: visible !important;
            position: relative;
        }
        td.action md-icon {
            margin: 0 4px;
        }
        .action-icon, .material-icons.action-icon {
            position: relative !important;
            display: inline-block !important;
            overflow: visible !important;
        }
        /* Cards de estatísticas */
        .card-group {
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            width: 100% !important;
            max-width: 100% !important;
            position: relative !important;
            overflow: visible !important;
        }
        .card {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            background: white !important;
            border: 1px solid #ddd !important;
            border-radius: 4px !important;
            margin: 0 10px !important;
            flex: 1 !important;
            min-width: 0 !important;
            position: relative !important;
            overflow: visible !important;
        }
        .card-body {
            position: relative !important;
            overflow: visible !important;
        }
        .fs-widget-number-22 {
            position: relative !important;
            overflow: visible !important;
        }
        /* Garantir que cards tenham a mesma largura da tabela */
        .core-ui-neton {
            width: 100% !important;
            max-width: 100% !important;
            position: relative !important;
            overflow: visible !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
        }
        /* Alinhar cards com a margem esquerda da tabela */
        .panel-body {
            padding-left: 15px !important;
            padding-right: 15px !important;
        }
        /* Garantir que o card-group comece na mesma posição da tabela */
        .card-group {
            margin-left: 0 !important;
            padding-left: 0 !important;
        }
        /* Garantir que os painéis tenham a mesma largura da tabela */
        .panel.panel-default {
            box-sizing: border-box !important;
        }
        /* Remover padding dos containers para alinhamento */
        .row {
            margin-left: 0 !important;
            margin-right: 0 !important;
        }
        .col-sm-12 {
            padding-left: 0 !important;
            padding-right: 0 !important;
        }
        table {
            width: 100% !important;
            max-width: 100% !important;
        }
        md-table-container, .table-responsive {
            width: 100% !important;
            max-width: 100% !important;
        }
        .card-body {
            display: block !important;
            visibility: visible !important;
            padding: 15px !important;
        }
        .fs-widget-number-22 {
            display: block !important;
            visibility: visible !important;
            font-size: 22px !important;
            font-weight: bold !important;
            color: #333 !important;
            margin: 10px 0 !important;
        }
        .fs-widget-label {
            display: block !important;
            visibility: visible !important;
            font-size: 12px !important;
            color: #666 !important;
        }
        md-table-container, .table-responsive {
            overflow: visible !important;
        }
        table, tbody, thead {
            overflow: visible !important;
        }
        .panel {
            overflow: visible !important;
        }
        /* Estilos para tabela padrão (após conversão) */
        .table-responsive {
            overflow-x: auto;
        }
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 0;
        }
        .table th {
            text-align: left;
            font-weight: bold;
            padding: 12px;
            border-bottom: 2px solid #ddd;
            background-color: #f8f9fa;
        }
        .table td {
            padding: 12px;
            border-bottom: 1px solid #eee;
            vertical-align: middle;
        }
        .table tbody tr {
            display: table-row !important;
            visibility: visible !important;
        }
        .table tbody tr:hover {
            background-color: #f5f5f5;
        }
        .table-striped tbody tr:nth-of-type(odd) {
            background-color: #f9f9f9;
        }
        .table-striped tbody tr:nth-of-type(even) {
            background-color: #fff;
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
    <!-- ag-Grid JS -->
    <script src="https://cdn.jsdelivr.net/npm/ag-grid-community@31.0.0/dist/ag-grid-community.min.js"></script>
    ${numberBadgeScript}
    <script>
        // Initialize AngularJS app if not already initialized
        if (typeof angular !== 'undefined') {
            document.addEventListener('DOMContentLoaded', function() {
                // Wait a bit for AngularJS to load
                setTimeout(function() {
                    try {
                        // Bootstrap if not already bootstrapped
                        const body = document.body;
                        if (!angular.element(body).injector()) {
                            angular.bootstrap(body, ['pay.ajusteacordo', 'pay.modelopagamento', 'pay.consolidacaoqualidade', 'pay.tabelapreco', 'pay.folha', 'ngMaterial']);
                        }
                    } catch (e) {
                        console.warn('Erro ao inicializar AngularJS:', e.message);
                    }
                }, 100);
            });
        }
    </script>
</body>
</html>`;
}

