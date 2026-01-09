# Módulo Milk's Pay

Bem-vindo à documentação do módulo **Milk's Pay**, o sistema completo para geração de folha de pagamento de produtores de leite.

O Milk's Pay foi desenvolvido para proporcionar aos laticínios um ambiente que possibilite gerar a folha de pagamento dos produtores de forma rápida, flexível e totalmente parametrizável, com foco no **pagamento por qualidade** e na valorização justa da produção.

## Principais Funcionalidades

O módulo Milk's Pay oferece um conjunto abrangente de funcionalidades para gerenciar todo o processo de pagamento aos produtores:

### 📊 Gestão de Qualidade e Consolidação
- **Consolidação de Qualidade**: Agregação e análise dos resultados de análises dos indicadores de composição do leite
- **Bonificação e Penalização**: Sistema automático de bonificação ou penalização baseado na performance de cada produtor
- **Indicadores de Qualidade**: Controle de CPP, CCS, Gordura, Proteína, ESD, Sólidos, Lactose, Acidez, Densidade, Crioscopia e Temperatura

### 💰 Sistema de Precificação (SVL)
- **Múltiplas Tabelas de Preços**: Suporte a várias versões de tabelas de precificação
- **Faixas de Bonificação/Penalização**: Configuração de faixas para diferentes indicadores:
  - Volume
  - Temperatura
  - Crioscopia
  - Logística
  - Fidelidade
  - Projetos
  - Gestão
  - Certificação
- **Flexibilidade de Configuração**: Parâmetros extensos para controle do sistema de valorização do leite

### 📝 Modelos de Pagamento
- **Fórmulas de Cálculo Personalizadas**: Sistema de fórmulas flexíveis com variáveis de substituição (Macros)
- **Múltiplos Modelos**: Suporte a vários modelos de pagamento independentes na mesma folha
- **Nomenclatura Customizada**: Uso da nomenclatura já utilizada pelo laticínio nos demonstrativos

### 📄 Contratos e Vigências
- **Gestão de Contratos**: Definição das principais regras de operação que determinam como a folha será calculada
- **Vigências**: Controle de períodos de vigência dos contratos
- **Pagamento por Propriedade**: Suporte a pagamento por fazenda para produtores que desejam receber por unidade de produção
- **Acordos Comerciais**: Configuração de acordos comerciais e bonificações especiais
- **Tanques Coletivos**: Suporte a junção de volumes por participação em tanques coletivos ou cooperativas virtuais

### 📊 Folha e Simulações
- **Geração de Folha**: Cálculo completo da folha de pagamento
- **Simulações**: Simulação de valores antes da geração final
- **Conferência de Valores**: Apoio à conferência dos valores antes da geração final da folha

### 🧾 Emissão de Documentos
- **Notas Fiscais Eletrônicas (NF-e)**: Configuração e emissão de NF-e
- **Demonstrativos**: Publicação dos demonstrativos de pagamento
- **Documentos Complementares**: Geração de documentos adicionais conforme necessário

### 📈 Relatórios e Conciliações
- **Relatórios de Controle**: Relatórios completos para controle e auditoria
- **Conciliações**: Ferramentas para conciliação de valores e volumes
- **Análises**: Relatórios analíticos para tomada de decisão

### 🔄 Integração e Importação
- **Integração com Milk's Rota**: Integração com o aplicativo coletor para obtenção de volumes
- **Importação de Dados**: Importação de deduções e créditos via arquivo pré-formatado
- **API**: Suporte a integração via API para deduções, créditos e outros dados

### ⚙️ Configurações e Parâmetros
- **Configurações Globais**: Parâmetros globais que afetam o comportamento do módulo
- **Impostos e Faixas**: Configuração de impostos com faixas de incidência baseadas em volume
- **Tabelas de Preços**: Gestão de tabelas de preços e suas versões

## Conceito e Visão de Operação

O Módulo Milk's Pay foi desenhado para prover um ambiente que possibilite aos laticínios gerar a folha de pagamento dos produtores de leite de forma rápida, flexível e sobretudo parametrizável.

O principal fundamento de operação está apoiado sobre o conceito de **pagamento por qualidade**, onde o principal requisito é a [**consolidação**](content/consolidacao-de-qualidade.md) dos resultados de análises dos indicadores de composição do leite. Esta consolidação fornece um diferencial para **bonificação** ou **penalização** dos produtores de acordo com a performance obtida por cada um no período de fechamento.

Outro requisito indispensável para que a folha de pagamento seja construída é a utilização do módulo [**Milk's Rota**](https://app.gitbook.com/o/-LjslsqvYZjoA2L-GX5y/s/-MiarV4x7C9ia6BvqaTk/) (Aplicativo coletor), pois o levantamento do volume entregue pelo produtor é obtido através dos registros oriundos deste aplicativo, única forma de se obter o dado essencial para os cálculos.

A flexibilização para inclusão de parâmetros que controlam o sistema de valorização do leite **(SVL)** é bem extensa e faz parte do modelo de [**precificação**](content/sistema-de-precificacao-svl.md). Aqui são admitidas várias **versões de tabelas**, que consideram faixas de bonificação ou penalização para diversos indicadores além da qualidade, como: Volume, Temperatura, Crioscopia, Logística, Fidelidade, Projetos, Gestão e Certificação.

As **Deduções** e **Créditos** são considerados por meio da importação de registros pré-formatados em arquivo ou por meio da **API**.

Parâmetros adicionais de controle, bonificação, acordos comerciais, junção de volumes por participação em tanques coletivos ou cooperativas virtuais também são admitidos por meio de outro pilar fundamental que é o [**contrato**](content/contratos-e-vigencias.md) e sua **vigência**. No contrato são definidas as principais regras de operação que determinam como a folha será calculada, podendo ser considerado o pagamento por propriedade (fazenda) para os casos onde o produtor deseja receber por unidade de produção, ampliando o controle.

Por fim, o [**Modelo de Pagamento**](content/modelos-de-pagamento.md) contém o cerne de funcionamento do módulo, que é a **Fórmula de Cálculo**, o maior diferencial do módulo Milk's Pay, que permite a utilização de **variáveis** de substituição (**Macros**), para indicar o que será calculado no modelo de pagamento e o que será impresso no demonstrativo, com a nomenclatura já utilizada pelo laticínio. Vários modelos de pagamento são admitidos, provendo uma infinidade de fórmulas independentes, que podem ser utilizadas na mesma folha de pagamento.

O Milk's Pay admite, em funções secundárias, a configuração e emissão de **NF-e, Simulação de Valores, Publicação dos demonstrativos e Documentos** além de conter os [**relatórios de controle**](content/relatorios-e-conciliacoes.md) bem como o apoio a conferência dos valores antes da geração final da folha.

## Documentação

Esta documentação está organizada nas seguintes seções:

- **[Pagamento a produtores](content/pagamento-a-produtores.md)** - Visão geral do processo de pagamento
- **[Conceito e visão de operação](content/conceito-e-visao-de-operacao.md)** - Fundamentos e planejamento do módulo
- **[Configurações](content/configuracoes.md)** - Parâmetros globais e configurações do sistema
- **[Consolidação de qualidade](content/consolidacao-de-qualidade.md)** - Gestão de análises e indicadores de qualidade
- **[Sistema de Precificação (SVL)](content/sistema-de-precificacao-svl.md)** - Configuração de tabelas e faixas de precificação
- **[Tabela de preços](content/tabela-de-precos.md)** - Gestão de tabelas de preços
- **[Modelos de pagamento](content/modelos-de-pagamento.md)** - Configuração de fórmulas de cálculo
- **[Contratos e vigências](content/contratos-e-vigencias.md)** - Gestão de contratos e regras de operação
- **[Impostos](content/impostos.md)** - Configuração de impostos e faixas de incidência
- **[Folha e simulações](content/folha-e-simulacoes.md)** - Geração de folha e simulações
- **[Acordos comerciais](content/acordos-comerciais.md)** - Gestão de acordos comerciais
- **[Relatórios e Conciliações](content/relatorios-e-conciliacoes.md)** - Relatórios e ferramentas de conciliação

## Início Rápido

Para começar a usar o módulo Milk's Pay:

1. Configure os [parâmetros globais](content/configuracoes.md) do sistema
2. Defina as [tabelas de preços](content/tabela-de-precos.md) e o [sistema de precificação](content/sistema-de-precificacao-svl.md)
3. Configure os [modelos de pagamento](content/modelos-de-pagamento.md) com suas fórmulas
4. Cadastre os [contratos](content/contratos-e-vigencias.md) dos produtores
5. Realize a [consolidação de qualidade](content/consolidacao-de-qualidade.md) do período
6. Gere a [folha de pagamento](content/folha-e-simulacoes.md)

## Requisitos

- Integração com o módulo **Milk's Rota** para obtenção de volumes de coleta
- Configuração de análises de qualidade do leite
- Definição de contratos e modelos de pagamento

---

Para mais informações detalhadas sobre cada funcionalidade, consulte a documentação completa nas seções acima.
