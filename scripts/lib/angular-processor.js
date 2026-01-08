/**
 * AngularJS Template Processor Module
 * Functions to process AngularJS templates and directives in static HTML
 */

/**
 * Mock data for the payment formula controller
 */
const mockControllerData = {
    acoes: [
        {display: '(', group: 'info', id: 'AG', action: function() {}},
        {display: ')', group: 'info', id: 'FG', action: function() {}},
        {display: '+', group: 'primary', id: 'ADD', action: function() {}},
        {display: '-', group: 'primary', id: 'SUB', action: function() {}},
        {display: '*', group: 'primary', id: 'MUL', action: function() {}},
        {display: '/', group: 'primary', id: 'DIV', action: function() {}},
        {display: 'Preço', group: 'default', id: 'PB'},
        {display: 'SVL', group: 'default', id: 'PR'},
        {display: 'Volume', group: 'default', id: 'VL'},
        {display: 'Número', group: 'default', id: 'NUM', action: function() {}},
        {display: 'Acordo comercial', group: 'default', id: 'AC'}
    ],
    svl: [
        {display: 'Produção do contrato', id: 'SVL_VF', icon: 'fa fa-file-text-o'},
        {display: 'Produção individual', id: 'SVL_VFI', icon: 'fa fa-user'},
        {display: 'Produção associada', id: 'SVL_VFA', icon: 'fa fa-users'},
        {display: 'CPP', id: 'SVL_CPP', icon: 'milks-svl-cpp'},
        {display: 'CCS', id: 'SVL_CCS', icon: 'milks-svl-ccs'},
        {display: 'Proteína', id: 'SVL_PROT', icon: 'milks-svl-proteina'},
        {display: 'Gordura', id: 'SVL_GOR', icon: 'milks-svl-gordura'},
        {display: 'Temperatura', id: 'SVL_TEMP', icon: 'milks-svl-temperatura'},
        {display: 'Fidelidade', id: 'SVL_FID', icon: 'milks-svl-fidelidade'},
        {display: 'Logística', id: 'SVL_LOG', icon: 'milks-linha-2'},
        {display: 'Certificação', id: 'SVL_CERT', icon: 'milks-svl-certificacao'},
        {display: 'Projetos', id: 'SVL_PROJ', icon: 'milks-svl-projeto'},
        {display: 'Gestão', id: 'SVL_GES', icon: 'milks-svl-gestao'}
    ],
    volumes: [
        {display: 'Volume total no período', id: 'VL_T', icon: 'fa fa-calendar'},
        {display: 'Média diária do volume no período', id: 'VL_M', icon: 'fa fa-calendar-o'},
        {display: 'Volume total fora do padrão', id: 'VL_FP', icon: 'fa fa-warning'}
    ],
    acordos: [
        {display: 'Acordo * Volume total', id: 'AC', icon: 'fa fa-calendar'},
        {display: 'Acordo/L', id: 'AC_U', icon: 'fa fa-calendar-o'}
    ],
    tabelas: [] // Empty by default, can be populated if needed
};

/**
 * Process AngularJS templates in the page
 * @param {Object} page - Puppeteer page object
 * @returns {Promise<void>}
 */
export async function processAngularTemplates(page) {
    try {
        console.log("🔄 Processando templates AngularJS...");
        
        await page.evaluate((mockData) => {
            // Check if AngularJS is already loaded
            if (typeof angular === 'undefined') {
                console.warn('AngularJS não encontrado');
                return false;
            }
            
            // Create or get the module
            let app;
            try {
                app = angular.module('pay.modelopagamento');
            } catch (e) {
                app = angular.module('pay.modelopagamento', []);
            }
            
            // Define the controller
            app.controller('modelopagamento.pagamentoFormulaCtrl', [
                '$scope',
                function($scope) {
                    // Set mock data
                    $scope.acoes = mockData.acoes;
                    $scope.svl = mockData.svl;
                    $scope.volumes = mockData.volumes;
                    $scope.acordos = mockData.acordos;
                    $scope.tabelas = mockData.tabelas;
                    
                    // Mock functions
                    $scope.addSvl = function(item) {};
                    $scope.addPreco = function(item) {};
                    $scope.addVolume = function(item) {};
                    $scope.addSubitem = function(item) {};
                    $scope.moveElementoEsquerda = function(index) {};
                    $scope.moveElementoDireita = function(index) {};
                    $scope.removeElemento = function(index) {};
                    $scope.editaElemento = function(index) {};
                    $scope.editaComposicao = function(index) {};
                    
                    // Initialize record if not exists
                    if (!$scope.record) {
                        $scope.record = {
                            formula: [],
                            ativo: '1',
                            codigo: '',
                            modelo: ''
                        };
                    }
                }
            ]);
            
            // Bootstrap AngularJS if not already bootstrapped
            const body = document.body;
            let injector = angular.element(body).injector();
            
            if (!injector) {
                try {
                    angular.bootstrap(body, ['pay.modelopagamento']);
                    injector = angular.element(body).injector();
                } catch (e) {
                    console.warn('Erro ao fazer bootstrap do AngularJS:', e.message);
                    return false;
                }
            }
            
            // Force digest cycle
            if (injector) {
                try {
                    const $rootScope = injector.get('$rootScope');
                    if ($rootScope) {
                        $rootScope.$apply();
                    }
                } catch (e) {
                    console.warn('Erro ao aplicar digest:', e.message);
                }
            }
            
            return true;
        }, mockControllerData);
        
        // Wait for AngularJS to process templates
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Force another digest cycle
        await page.evaluate(() => {
            const body = document.body;
            const injector = angular.element(body).injector();
            if (injector) {
                try {
                    const $rootScope = injector.get('$rootScope');
                    if ($rootScope) {
                        $rootScope.$apply();
                    }
                } catch (e) {
                    // Ignore errors
                }
            }
        });
        
        console.log("✅ Templates AngularJS processados");
        
    } catch (error) {
        console.warn(`⚠️  Erro ao processar templates AngularJS: ${error.message}`);
        console.warn("   Continuando sem processamento AngularJS...");
    }
}

/**
 * Inject AngularJS and UI Bootstrap scripts into HTML
 * @param {string} htmlContent - HTML content
 * @returns {string} HTML with AngularJS scripts injected
 */
export function injectAngularScripts(htmlContent) {
    // Check if AngularJS is already in the HTML
    if (htmlContent.includes('angular.js') || htmlContent.includes('angular.min.js')) {
        return htmlContent;
    }
    
    // Inject AngularJS and UI Bootstrap before closing body tag
    const angularScripts = `
    <!-- AngularJS -->
    <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.8.3/angular.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/angular-ui-bootstrap/2.5.6/ui-bootstrap-tpls.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/angular-ui-sortable/0.19.0/sortable.min.js"></script>
    `;
    
    // Insert before closing body tag or at the end if no body tag
    if (htmlContent.includes('</body>')) {
        return htmlContent.replace('</body>', `${angularScripts}</body>`);
    } else {
        return htmlContent + angularScripts;
    }
}

