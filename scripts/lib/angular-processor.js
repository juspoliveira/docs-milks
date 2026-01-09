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
 * @param {Object} additionalData - Additional data to pass to controllers (e.g., records for list controllers)
 * @returns {Promise<void>}
 */
export async function processAngularTemplates(page, additionalData = {}) {
    try {
        console.log("🔄 Processando templates AngularJS...");
        if (additionalData.records) {
            console.log(`   📊 Dados adicionais: ${additionalData.records.length} registros`);
        }
        
        await page.evaluate((mockData, additionalData) => {
            // Check if AngularJS is already loaded
            if (typeof angular === 'undefined') {
                console.warn('AngularJS não encontrado');
                return false;
            }
            
            // Initialize ag-Grid with AngularJS if available
            if (typeof agGrid !== 'undefined' && agGrid.initialiseAgGridWithAngular1) {
                try {
                    agGrid.initialiseAgGridWithAngular1(angular);
                } catch (e) {
                    console.warn('Erro ao inicializar ag-Grid:', e.message);
                }
            }
            
            // Create or get modules
            let appModelo;
            try {
                appModelo = angular.module('pay.modelopagamento');
            } catch (e) {
                appModelo = angular.module('pay.modelopagamento', []);
            }
            
            let appConsolidacao;
            try {
                appConsolidacao = angular.module('pay.consolidacaoqualidade');
            } catch (e) {
                appConsolidacao = angular.module('pay.consolidacaoqualidade', ['agGrid']);
            }
            
            let appAjusteAcordo;
            try {
                appAjusteAcordo = angular.module('pay.ajusteacordo');
                console.log('Módulo pay.ajusteacordo já existe');
            } catch (e) {
                appAjusteAcordo = angular.module('pay.ajusteacordo', []);
                console.log('Módulo pay.ajusteacordo criado');
            }
            
            let appImposto;
            try {
                appImposto = angular.module('pay.imposto');
                console.log('Módulo pay.imposto já existe');
            } catch (e) {
                appImposto = angular.module('pay.imposto', []);
                console.log('Módulo pay.imposto criado');
            }
            
            // Define the payment model controller
            appModelo.controller('modelopagamento.pagamentoFormulaCtrl', [
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
            
            // Define the producer list controller
            appConsolidacao.controller('consolidacao.produtorListCtrl', [
                '$scope',
                function($scope) {
                    // Mock data para a listagem de produtores
                    // Configurado para mostrar todos os botões possíveis
                    $scope.record = {
                        codigo: '12/2024',
                        descricao: 'Parcial 12/2024',
                        fechado: '0', // '0' para mostrar Finalizar e Atualizar, '1' para Exportar
                        id: 451
                    };
                    
                    // Mock data com produtores e indicadores de qualidade
                    $scope.records = [
                        {
                            nomeProdutor: 'João Silva',
                            amostras: 15,
                            cpp: 125.5,
                            ccs: 280.3,
                            gordura: 3.8,
                            proteina: 3.2,
                            esd: 8.5,
                            solido: 12.3,
                            lactose: 4.6,
                            acidez: 16.2,
                            densidade: 1.030,
                            crioscopia: -0.540,
                            temperatura: 4.2
                        },
                        {
                            nomeProdutor: 'Maria Santos',
                            amostras: 18,
                            cpp: 98.2,
                            ccs: 245.7,
                            gordura: 4.1,
                            proteina: 3.4,
                            esd: 8.8,
                            solido: 12.9,
                            lactose: 4.7,
                            acidez: 15.8,
                            densidade: 1.031,
                            crioscopia: -0.545,
                            temperatura: 3.9
                        },
                        {
                            nomeProdutor: 'Pedro Oliveira',
                            amostras: 12,
                            cpp: 142.3,
                            ccs: 310.5,
                            gordura: 3.5,
                            proteina: 3.0,
                            esd: 8.2,
                            solido: 11.7,
                            lactose: 4.4,
                            acidez: 17.1,
                            densidade: 1.029,
                            crioscopia: -0.535,
                            temperatura: 4.5
                        }
                    ];
                    
                    $scope.viewState = 'edit'; // != 'create' para mostrar Finalizar/Exportar
                    $scope.produtoresPendentes = [{ nome: 'Produtor Pendente', codigo: '123', volume: 1000 }]; // Para mostrar botão Pendentes
                    $scope.hasConfiguracao = true;
                    
                    // Mock functions
                    $scope.finaliza = function() {};
                    $scope.exportToCsv = function() {};
                    $scope.refreshData = function() {};
                    $scope.showPendentes = function() {};
                    $scope.exibeModalAnalise = function() {};
                    
                    // Column definitions for ag-Grid
                    var columnDefs = [
                        {
                            headerName: "FORNECEDOR",
                            width: 400,
                            pinned: 'left',
                            colId: 'prod',
                            children: [
                                {
                                    headerName: 'Produtor',
                                    field: 'nomeProdutor',
                                    width: 300,
                                    colId: 'nome',
                                    filter: 'agTextColumnFilter',
                                    columnGroupShow: 'open',
                                    pinned: 'left',
                                    sortable: true
                                }
                            ]
                        },
                        {
                            headerName: "CPP",
                            width: 250,
                            colId: 'cpp',
                            children: [
                                {
                                    headerName: 'Amostras',
                                    field: 'amostras',
                                    width: 150,
                                    colId: 'amostrasCpp',
                                    columnGroupShow: 'open'
                                },
                                {
                                    headerName: 'Média',
                                    field: 'cpp',
                                    width: 150,
                                    colId: 'mediaCpp',
                                    filter: 'agNumberColumnFilter',
                                    columnGroupShow: 'open'
                                }
                            ]
                        },
                        {
                            headerName: "CCS",
                            width: 250,
                            pinned: 'left',
                            colId: 'ccs',
                            children: [
                                {
                                    headerName: 'Amostras',
                                    field: 'amostras',
                                    width: 150,
                                    colId: 'amostraCcs',
                                    columnGroupShow: 'open'
                                },
                                {
                                    headerName: 'Média',
                                    field: 'ccs',
                                    width: 150,
                                    colId: 'mediaCcs',
                                    filter: 'agNumberColumnFilter',
                                    columnGroupShow: 'open'
                                }
                            ]
                        },
                        {
                            headerName: "GORDURA",
                            width: 150,
                            children: [
                                {
                                    headerName: 'Nº Amostras',
                                    field: 'amostras',
                                    width: 150,
                                    colId: 'amostraGordura',
                                    columnGroupShow: 'open'
                                },
                                {
                                    headerName: 'Média',
                                    field: 'gordura',
                                    width: 150,
                                    colId: 'mediaGordura',
                                    filter: 'agNumberColumnFilter',
                                    columnGroupShow: 'open'
                                }
                            ]
                        },
                        {
                            headerName: "PROTEINAS",
                            width: 150,
                            children: [
                                {
                                    headerName: 'Nº Amostras',
                                    field: 'amostras',
                                    width: 150,
                                    colId: 'amostraProteina',
                                    columnGroupShow: 'open'
                                },
                                {
                                    headerName: 'Média',
                                    field: 'proteina',
                                    width: 150,
                                    colId: 'mediaProteina',
                                    filter: 'agNumberColumnFilter',
                                    columnGroupShow: 'open'
                                }
                            ]
                        },
                        {
                            headerName: "ESD",
                            width: 150,
                            children: [
                                {
                                    headerName: 'Nº Amostras',
                                    field: 'amostras',
                                    width: 150,
                                    colId: 'amostraEsd',
                                    columnGroupShow: 'open'
                                },
                                {
                                    headerName: 'Média',
                                    field: 'esd',
                                    width: 150,
                                    colId: 'mediaEsd',
                                    filter: 'agNumberColumnFilter',
                                    columnGroupShow: 'open'
                                }
                            ]
                        },
                        {
                            headerName: "SOLIDOS",
                            width: 150,
                            children: [
                                {
                                    headerName: 'Nº Amostras',
                                    field: 'amostras',
                                    width: 150,
                                    colId: 'amostraSolido',
                                    columnGroupShow: 'open'
                                },
                                {
                                    headerName: 'Média',
                                    field: 'solido',
                                    width: 150,
                                    colId: 'mediaSolido',
                                    filter: 'agNumberColumnFilter',
                                    columnGroupShow: 'open'
                                }
                            ]
                        },
                        {
                            headerName: "LACTOSE",
                            width: 150,
                            children: [
                                {
                                    headerName: 'Nº Amostras',
                                    field: 'amostras',
                                    width: 150,
                                    colId: 'amostraLactose',
                                    columnGroupShow: 'open'
                                },
                                {
                                    headerName: 'Média',
                                    field: 'lactose',
                                    width: 150,
                                    colId: 'mediaLactose',
                                    filter: 'agNumberColumnFilter',
                                    columnGroupShow: 'open'
                                }
                            ]
                        },
                        {
                            headerName: "ACIDEZ",
                            width: 150,
                            children: [
                                {
                                    headerName: 'Nº Amostras',
                                    field: 'amostras',
                                    width: 150,
                                    colId: 'amostraAcidez',
                                    columnGroupShow: 'open'
                                },
                                {
                                    headerName: 'Média',
                                    field: 'acidez',
                                    width: 150,
                                    colId: 'mediaAcidez',
                                    filter: 'agNumberColumnFilter',
                                    columnGroupShow: 'open'
                                }
                            ]
                        },
                        {
                            headerName: "DENSIDADE",
                            width: 150,
                            children: [
                                {
                                    headerName: 'Nº Amostras',
                                    field: 'amostras',
                                    width: 150,
                                    colId: 'amostraDensidade',
                                    columnGroupShow: 'open'
                                },
                                {
                                    headerName: 'Média',
                                    field: 'densidade',
                                    width: 150,
                                    colId: 'mediaDensidade',
                                    filter: 'agNumberColumnFilter',
                                    columnGroupShow: 'open'
                                }
                            ]
                        },
                        {
                            headerName: "CRISCOPIA",
                            width: 150,
                            children: [
                                {
                                    headerName: 'Nº Amostras',
                                    field: 'amostras',
                                    width: 150,
                                    colId: 'amostraCrioscopia',
                                    columnGroupShow: 'open'
                                },
                                {
                                    headerName: 'Média',
                                    field: 'crioscopia',
                                    width: 150,
                                    colId: 'mediaCrioscopia',
                                    filter: 'agNumberColumnFilter',
                                    columnGroupShow: 'open'
                                }
                            ]
                        },
                        {
                            headerName: "TEMPERATURA",
                            width: 150,
                            children: [
                                {
                                    headerName: 'Nº Amostras',
                                    field: 'amostras',
                                    width: 150,
                                    colId: 'amostraTemperatura',
                                    columnGroupShow: 'open'
                                },
                                {
                                    headerName: 'Média',
                                    field: 'temperatura',
                                    width: 150,
                                    colId: 'mediaTemperatura',
                                    filter: 'agNumberColumnFilter',
                                    columnGroupShow: 'open'
                                }
                            ]
                        }
                    ];
                    
                    // Initialize ag-Grid options
                    $scope.gridOptions = {
                        columnDefs: columnDefs,
                        rowData: $scope.records,
                        angularCompileRows: true,
                        skipHeaderOnAutoSize: true,
                        onGridReady: function(params) {
                            params.api.autoSizeAllColumns();
                        },
                        onCellClicked: function(event) {
                            // Mock cell click handler
                        }
                    };
                }
            ]);
            
            // Define the tax band controller (must be in pay.imposto module)
            appImposto.controller('imposto.FaixaCtrl', [
                '$scope',
                function($scope) {
                    console.log('imposto.FaixaCtrl sendo inicializado...');
                    // Use real data if provided
                    const faixasData = additionalData && additionalData.faixas ? additionalData.faixas : [
                        {
                            id: 15,
                            imposto_id: 4,
                            volume_minimo: 300,
                            volume_maximo: 1200,
                            percentual: '2.0000'
                        }
                    ];
                    const impostoData = additionalData && additionalData.imposto ? additionalData.imposto : {
                        id: 4,
                        codigo: null,
                        descricao: 'Senar'
                    };
                    
                    // Set data immediately
                    $scope.record = impostoData;
                    $scope.faixas = faixasData;
                    $scope.viewState = 'edit'; // Para mostrar botões de ação
                    
                    // Mock functions
                    $scope.abreModalFaixa = function(faixa) {};
                    $scope.remove = function(id) {};
                    
                    console.log('imposto.FaixaCtrl inicializado com', faixasData.length, 'faixas');
                    console.log('Record:', impostoData);
                    if (faixasData.length > 0) {
                        console.log('Primeira faixa:', faixasData[0]);
                    }
                    
                    // Force immediate digest
                    if (!$scope.$$phase && !$scope.$root.$$phase) {
                        $scope.$apply();
                    }
                }
            ]);
            
            // Define the tax band modal controller (must be in pay.imposto module)
            appImposto.controller('imposto.FaixaModalCtrl', [
                '$scope',
                function($scope) {
                    console.log('imposto.FaixaModalCtrl sendo inicializado...');
                    const registroData = additionalData && additionalData.faixas && additionalData.faixas.length > 0 
                        ? JSON.parse(JSON.stringify(additionalData.faixas[0]))
                        : {
                            volume_minimo: 300,
                            volume_maximo: 1200,
                            percentual: '2.0000'
                        };
                    
                    const impostoData = additionalData && additionalData.imposto 
                        ? JSON.parse(JSON.stringify(additionalData.imposto))
                        : {
                            id: 4,
                            codigo: null,
                            descricao: 'Senar'
                        };
                    
                    $scope.registro = registroData;
                    $scope.record = impostoData;
                    $scope.isCreate = false;
                    $scope.isEdit = true;
                    $scope.isSubmited = false;
                    $scope.forms = {
                        modal: {}
                    };
                    
                    // Mock functions
                    $scope.save = function() {};
                    $scope.cancel = function() {};
                    $scope.close = function() {};
                    
                    console.log('imposto.FaixaModalCtrl inicializado');
                    console.log('Record:', $scope.record);
                    console.log('Registro:', $scope.registro);
                    
                    // Force immediate digest
                    if (!$scope.$$phase && !$scope.$root.$$phase) {
                        $scope.$apply();
                    }
                }
            ]);
            
            // Define the agreement adjustment controller
            appAjusteAcordo.controller('ajusteacordo.AcordoListCtrl', [
                '$scope',
                function($scope) {
                    console.log('ajusteacordo.AcordoListCtrl sendo inicializado...');
                    // Use real data if provided, otherwise use mock data
                    const recordsData = additionalData && additionalData.records ? additionalData.records : [
                        {
                            contrato_id: 239,
                            codigo: '001',
                            contrato_codigo: '001',
                            codigo_produtor: '0120',
                            fazenda: 'FAZENDA BELA VISTA',
                            adicional_acordo: 0.225,
                            quantidade: 15000,
                            previsao_coleta: 18000,
                            media_diaria: 500,
                            acordo_total: 3375.00,
                            acordo_previsto: 4050.00
                        },
                        {
                            contrato_id: 242,
                            codigo: '004',
                            contrato_codigo: '004',
                            codigo_produtor: '1149',
                            fazenda: null,
                            adicional_acordo: 0.12,
                            quantidade: 12000,
                            previsao_coleta: 15000,
                            media_diaria: 400,
                            acordo_total: 1440.00,
                            acordo_previsto: 1800.00
                        },
                        {
                            contrato_id: 1442,
                            codigo: '2023',
                            contrato_codigo: '2023',
                            codigo_produtor: 'P-061',
                            fazenda: 'FAZENDA BOA NOVA',
                            adicional_acordo: 0.15,
                            quantidade: 20000,
                            previsao_coleta: 24000,
                            media_diaria: 667,
                            acordo_total: 3000.00,
                            acordo_previsto: 3600.00
                        }
                    ];
                    
                    $scope.records = recordsData;
                    $scope.filter = {
                        contrato: ''
                    };
                    $scope.podeEditar = true;
                    
                    // Mock filtro service
                    $scope.filtro = {
                        open: function() {}
                    };
                    
                    // Log para debug
                    console.log('ajusteacordo.AcordoListCtrl inicializado com', recordsData ? recordsData.length : 0, 'registros');
                    if (recordsData && recordsData.length > 0) {
                        console.log('Primeiro registro:', recordsData[0]);
                    }
                    
                    // Mock functions
                    $scope.salvaAcordoContrato = function(contrato) {};
                    $scope.onAlteraAdicionalAcordo = function(contrato) {
                        contrato.acordo_total = contrato.adicional_acordo * contrato.quantidade;
                        contrato.acordo_previsto = contrato.adicional_acordo * contrato.previsao_coleta;
                    };
                    $scope.onAlteraAdicionalTotal = function(contrato) {
                        contrato.adicional_acordo = contrato.acordo_total / contrato.quantidade;
                        contrato.acordo_previsto = contrato.adicional_acordo * contrato.previsao_coleta;
                    };
                    $scope.reloadData = function() {};
                }
            ]);
            
            // Bootstrap AngularJS if not already bootstrapped
            const body = document.body;
            let injector = angular.element(body).injector();
            
            if (!injector) {
                try {
                    // Bootstrap with all modules including pay.imposto
                    angular.bootstrap(body, ['pay.modelopagamento', 'pay.consolidacaoqualidade', 'pay.ajusteacordo', 'pay.imposto']);
                    injector = angular.element(body).injector();
                    console.log('AngularJS bootstrapped com módulos:', 'pay.modelopagamento', 'pay.consolidacaoqualidade', 'pay.ajusteacordo', 'pay.imposto');
                } catch (e) {
                    console.warn('Erro ao fazer bootstrap do AngularJS:', e.message);
                    // Try without ajusteacordo module
                    try {
                        angular.bootstrap(body, ['pay.modelopagamento', 'pay.consolidacaoqualidade', 'pay.imposto']);
                        injector = angular.element(body).injector();
                        console.log('AngularJS bootstrapped sem pay.ajusteacordo');
                    } catch (e2) {
                        console.warn('Erro ao fazer bootstrap alternativo:', e2.message);
                        // Try with just pay.imposto
                        try {
                            angular.bootstrap(body, ['pay.imposto']);
                            injector = angular.element(body).injector();
                            console.log('AngularJS bootstrapped apenas com pay.imposto');
                        } catch (e3) {
                            console.warn('Erro ao fazer bootstrap mínimo:', e3.message);
                            return false;
                        }
                    }
                }
            } else {
                console.log('AngularJS já estava bootstrapped');
            }
            
            // Force digest cycle and apply data to scopes
            if (injector) {
                try {
                    const $rootScope = injector.get('$rootScope');
                    const $compile = injector.get('$compile');
                    
                    // Apply faixas data immediately if available
                    if (additionalData && additionalData.faixas) {
                        const faixaElements = document.querySelectorAll('[ng-controller="imposto.FaixaCtrl"]');
                        faixaElements.forEach(element => {
                            try {
                                const scope = angular.element(element).scope();
                                if (scope) {
                                    scope.faixas = JSON.parse(JSON.stringify(additionalData.faixas));
                                    if (additionalData.imposto) {
                                        scope.record = JSON.parse(JSON.stringify(additionalData.imposto));
                                    }
                                    scope.viewState = 'edit';
                                    if (!scope.$$phase && !scope.$root.$$phase) {
                                        scope.$apply();
                                    }
                                    console.log('Dados de faixas aplicados imediatamente:', scope.faixas.length, 'faixas');
                                }
                            } catch (e) {
                                console.warn('Erro ao aplicar faixas imediatamente:', e.message);
                            }
                        });
                        
                        // Apply modal controller data if available
                        const modalElements = document.querySelectorAll('[ng-controller="imposto.FaixaModalCtrl"]');
                        modalElements.forEach(element => {
                            try {
                                const scope = angular.element(element).scope();
                                if (scope) {
                                    if (additionalData.faixas && additionalData.faixas.length > 0) {
                                        scope.registro = JSON.parse(JSON.stringify(additionalData.faixas[0]));
                                    }
                                    if (additionalData.imposto) {
                                        scope.record = JSON.parse(JSON.stringify(additionalData.imposto));
                                    }
                                    scope.isCreate = false;
                                    scope.isEdit = true;
                                    scope.isSubmited = false;
                                    if (!scope.$$phase && !scope.$root.$$phase) {
                                        scope.$apply();
                                    }
                                    console.log('Dados do modal aplicados imediatamente');
                                }
                            } catch (e) {
                                console.warn('Erro ao aplicar dados do modal imediatamente:', e.message);
                            }
                        });
                    }
                    
                    if ($rootScope && additionalData.records) {
                        // Apply data to root scope first (controllers might inherit from it)
                        $rootScope.$apply();
                        
                        // Wait a bit for controllers to initialize
                        setTimeout(() => {
                            // Find all scopes and apply records data
                            const allElements = document.querySelectorAll('*');
                            const processedScopes = new Set();
                            
                            allElements.forEach(element => {
                                try {
                                    const scope = angular.element(element).scope();
                                    if (scope && !processedScopes.has(scope)) {
                                        processedScopes.add(scope);
                                        
                                        // Check if element has ng-repeat with records
                                        const ngRepeat = element.getAttribute('ng-repeat');
                                        if (ngRepeat && ngRepeat.includes('record in records')) {
                                            // Walk up scope chain to find controller scope
                                            let currentScope = scope;
                                            let parentScope = scope.$parent;
                                            
                                            while (parentScope && parentScope !== currentScope.$root) {
                                                if (parentScope.records !== undefined) {
                                                    currentScope = parentScope;
                                                    break;
                                                }
                                                currentScope = parentScope;
                                                parentScope = parentScope.$parent;
                                            }
                                            
                                            if (currentScope && currentScope.records === undefined) {
                                                currentScope.records = additionalData.records;
                                                currentScope.filter = { contrato: '' };
                                                currentScope.podeEditar = true;
                                                currentScope.$apply();
                                            }
                                        }
                                    }
                                } catch (e) {
                                    // Ignore errors
                                }
                            });
                            
                            $rootScope.$apply();
                        }, 100);
                    } else {
                        $rootScope.$apply();
                    }
                } catch (e) {
                    console.warn('Erro ao aplicar digest:', e.message);
                }
            }
            
            return true;
        }, mockControllerData, additionalData);
        
        // Wait for AngularJS to process templates and ag-Grid to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Force another digest cycle and ensure all controllers are initialized
        // Pass additionalData as a serializable object
        const serializedData = additionalData && additionalData.records ? {
            records: JSON.parse(JSON.stringify(additionalData.records))
        } : additionalData && additionalData.faixas ? {
            faixas: JSON.parse(JSON.stringify(additionalData.faixas)),
            imposto: additionalData.imposto ? JSON.parse(JSON.stringify(additionalData.imposto)) : null
        } : {};
        
        await page.evaluate((serializedData, fullAdditionalData) => {
            const body = document.body;
            const injector = angular.element(body).injector();
            if (injector) {
                try {
                    const $rootScope = injector.get('$rootScope');
                    const $compile = injector.get('$compile');
                    
                    if ($rootScope && additionalData && additionalData.records) {
                        // Find element with ng-repeat="record in records"
                        const repeatElement = document.querySelector('[ng-repeat*="record in records"]');
                        
                        if (repeatElement) {
                            try {
                                // Get scope of the element with ng-repeat
                                let scope = angular.element(repeatElement).scope();
                                
                                // Walk up the scope chain to find the controller scope
                                let controllerScope = scope;
                                let maxDepth = 10; // Prevent infinite loop
                                let depth = 0;
                                
                                while (controllerScope && controllerScope.$parent && controllerScope.$parent !== controllerScope.$root && depth < maxDepth) {
                                    controllerScope = controllerScope.$parent;
                                    depth++;
                                }
                                
                                // Apply data to the controller scope
                                if (controllerScope) {
                                    controllerScope.records = additionalData.records;
                                    controllerScope.filter = controllerScope.filter || { contrato: '' };
                                    controllerScope.podeEditar = controllerScope.podeEditar !== undefined ? controllerScope.podeEditar : true;
                                    
                                    // Find the parent tbody or table to recompile
                                    let parentToCompile = repeatElement;
                                    while (parentToCompile && parentToCompile.tagName !== 'TBODY' && parentToCompile.tagName !== 'TABLE') {
                                        parentToCompile = parentToCompile.parentElement;
                                        if (!parentToCompile || parentToCompile === document.body) break;
                                    }
                                    
                                    if (parentToCompile && $compile) {
                                        // Re-compile the parent element to ensure ng-repeat processes the data
                                        const compiled = $compile(parentToCompile)(controllerScope);
                                        controllerScope.$apply();
                                    } else {
                                        controllerScope.$apply();
                                    }
                                    
                                    console.log('Dados aplicados ao scope:', controllerScope.records ? controllerScope.records.length : 0, 'registros');
                                }
                            } catch (e) {
                                console.warn('Erro ao aplicar dados ao scope:', e.message);
                            }
                        } else {
                            // If no ng-repeat found, try to apply to root scope or any scope
                            console.warn('Elemento com ng-repeat não encontrado, aplicando dados ao rootScope');
                            if ($rootScope) {
                                $rootScope.records = additionalData.records;
                                $rootScope.filter = { contrato: '' };
                                $rootScope.podeEditar = true;
                                $rootScope.$apply();
                            }
                        }
                        
                        // Also try to apply to all scopes that might need it
                        const allElements = document.querySelectorAll('sng-page, sng-content, [ng-repeat]');
                        allElements.forEach(element => {
                            try {
                                const scope = angular.element(element).scope();
                                if (scope) {
                                    let currentScope = scope;
                                    // Walk up to find controller scope
                                    while (currentScope && currentScope.$parent && currentScope.$parent !== currentScope.$root) {
                                        if (currentScope.records !== undefined) {
                                            break;
                                        }
                                        currentScope = currentScope.$parent;
                                    }
                                    
                                    if (currentScope && currentScope.records === undefined) {
                                        currentScope.records = additionalData.records;
                                        currentScope.filter = { contrato: '' };
                                        currentScope.podeEditar = true;
                                        currentScope.$apply();
                                    }
                                }
                            } catch (e) {
                                // Ignore errors
                            }
                        });
                        
                        $rootScope.$apply();
                        
                        // Try to manually initialize ag-Grid if not already initialized
                        setTimeout(() => {
                            const gridElement = document.querySelector('[ag-grid]');
                            if (gridElement && typeof agGrid !== 'undefined') {
                                const scope = angular.element(gridElement).scope();
                                if (scope && scope.gridOptions) {
                                    // Grid should be initialized by ag-grid directive
                                    // Force another apply to ensure grid renders
                                    $rootScope.$apply();
                                }
                            }
                        }, 500);
                    }
                } catch (e) {
                    // Ignore errors
                }
            }
        }, additionalData);
        
        // Additional wait for ag-Grid to render and ng-repeat to process
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // One more pass to ensure data is applied to controller scopes
        await page.evaluate((additionalData) => {
            const body = document.body;
            const injector = angular.element(body).injector();
            if (injector) {
                const $rootScope = injector.get('$rootScope');
                const $compile = injector.get('$compile');
                
                // Handle faixas (for imposto.FaixaCtrl)
                if (additionalData && additionalData.faixas) {
                        // Find controller elements
                        const faixaControllerElements = document.querySelectorAll('[ng-controller="imposto.FaixaCtrl"]');
                        faixaControllerElements.forEach(element => {
                            try {
                                const scope = angular.element(element).scope();
                                if (scope) {
                                    // Apply data
                                    scope.faixas = JSON.parse(JSON.stringify(additionalData.faixas));
                                    if (additionalData.imposto) {
                                        scope.record = JSON.parse(JSON.stringify(additionalData.imposto));
                                    }
                                    scope.viewState = 'edit';
                                    
                                    // Re-compile to force ng-repeat to process
                                    if ($compile) {
                                        $compile(element)(scope);
                                    }
                                    
                                    // Force digest cycle
                                    if (!scope.$$phase && !scope.$root.$$phase) {
                                        scope.$apply();
                                    }
                                    console.log('Faixas aplicadas no segundo pass:', scope.faixas.length, 'faixas');
                                    console.log('Record aplicado:', scope.record);
                                }
                            } catch (e) {
                                console.warn('Erro ao aplicar faixas:', e.message);
                            }
                        });
                        
                        // Handle modal controller (for imposto.FaixaModalCtrl)
                        const modalControllerElements = document.querySelectorAll('[ng-controller="imposto.FaixaModalCtrl"]');
                        modalControllerElements.forEach(element => {
                            try {
                                const scope = angular.element(element).scope();
                                if (scope) {
                                    // Apply data
                                    if (additionalData.faixas && additionalData.faixas.length > 0) {
                                        scope.registro = JSON.parse(JSON.stringify(additionalData.faixas[0]));
                                    }
                                    if (additionalData.imposto) {
                                        scope.record = JSON.parse(JSON.stringify(additionalData.imposto));
                                    }
                                    scope.isCreate = false;
                                    scope.isEdit = true;
                                    scope.isSubmited = false;
                                    
                                    // Re-compile to force templates to process
                                    if ($compile) {
                                        $compile(element)(scope);
                                    }
                                    
                                    // Force digest cycle
                                    if (!scope.$$phase && !scope.$root.$$phase) {
                                        scope.$apply();
                                    }
                                    console.log('Modal controller aplicado no segundo pass');
                                    console.log('Record no modal:', scope.record);
                                    console.log('Registro no modal:', scope.registro);
                                }
                            } catch (e) {
                                console.warn('Erro ao aplicar modal controller:', e.message);
                            }
                        });
                        
                        // Find ng-repeat for faixas and ensure parent scope has data
                        const faixaRepeatElements = document.querySelectorAll('[ng-repeat*="faixa in faixas"]');
                        faixaRepeatElements.forEach(element => {
                            try {
                                let scope = angular.element(element).scope();
                                let parentScope = scope.$parent;
                                let maxDepth = 10;
                                let depth = 0;
                                
                                // Walk up to find controller scope
                                while (parentScope && parentScope !== scope.$root && depth < maxDepth) {
                                    if (parentScope.faixas !== undefined || parentScope.record !== undefined) {
                                        // Found controller scope
                                        if (!parentScope.faixas || parentScope.faixas.length === 0) {
                                            parentScope.faixas = JSON.parse(JSON.stringify(additionalData.faixas));
                                        }
                                        if (additionalData.imposto && (!parentScope.record || !parentScope.record.descricao)) {
                                            parentScope.record = JSON.parse(JSON.stringify(additionalData.imposto));
                                        }
                                        parentScope.viewState = 'edit';
                                        
                                        // Re-compile parent element
                                        if ($compile) {
                                            const parentElement = element.closest('[ng-controller]') || element.parentElement;
                                            if (parentElement) {
                                                $compile(parentElement)(parentScope);
                                            }
                                        }
                                        
                                        if (!parentScope.$$phase && !parentScope.$root.$$phase) {
                                            parentScope.$apply();
                                        }
                                        console.log('Faixas aplicadas via ng-repeat parent scope');
                                        break;
                                    }
                                    parentScope = parentScope.$parent;
                                    depth++;
                                }
                            } catch (e) {
                                console.warn('Erro ao processar ng-repeat:', e.message);
                            }
                        });
                    }
                    
                    // Handle records (for ajusteacordo)
                    if (additionalData && additionalData.records) {
                        // Find all controller elements
                        const controllerElements = document.querySelectorAll('[ng-controller="ajusteacordo.AcordoListCtrl"]');
                        controllerElements.forEach(element => {
                            try {
                                const scope = angular.element(element).scope();
                                if (scope) {
                                    scope.records = additionalData.records;
                                    scope.filter = { contrato: '' };
                                    scope.podeEditar = true;
                                    scope.filtro = scope.filtro || { open: function() {} };
                                    
                                    // Re-compile to force ng-repeat to process
                                    if ($compile) {
                                        $compile(element)(scope);
                                    }
                                    scope.$apply();
                                    console.log('Dados aplicados no segundo pass:', scope.records.length, 'registros');
                                }
                            } catch (e) {
                                console.warn('Erro no segundo pass:', e.message);
                            }
                        });
                        
                        // Also find ng-repeat elements and ensure their parent scope has data
                        const repeatElements = document.querySelectorAll('[ng-repeat*="record in records"]');
                        repeatElements.forEach(element => {
                            try {
                                let scope = angular.element(element).scope();
                                let parentScope = scope.$parent;
                                while (parentScope && parentScope !== scope.$root) {
                                    if (parentScope.records) {
                                        if (!parentScope.records.length && fullAdditionalData.records) {
                                            parentScope.records = fullAdditionalData.records;
                                            parentScope.$apply();
                                            console.log('Dados aplicados via ng-repeat parent scope');
                                        }
                                        break;
                                    }
                                    parentScope = parentScope.$parent;
                                }
                            } catch (e) {
                                // Ignore
                            }
                        });
                    }
                
                if ($rootScope) {
                    $rootScope.$apply();
                }
            }
        }, additionalData);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
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

