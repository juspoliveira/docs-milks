---
description: Como planejamos o módulo e suas principais capacidades.
---

# Conceito e visão de operação

O Módulo Milk's Pay foi desenhado para prover um ambiente que possibilite aos laticínios gerar a folha de pagamento dos produtores de leite de forma rápida, flexível e sobretudo parametrizável. \
\
O Principal fundamento de operação está apoiado sobre o conceito de pagamento por qualidade, onde o **principal** requisito é a [**consolidação**](consolidacao-de-qualidade) dos resultados de análises dos indicadores de composição do leite. Esta consolidação fornece um diferencial para **bonificação** ou **penalização** dos produtores de acordo com a performance obtida por cada um no período de fechamento.\
\
Outro requisito indispensável para que a folha de pagamento seja construída é a utilização do módulo [**Milk's Rota**](https://app.gitbook.com/o/-LjslsqvYZjoA2L-GX5y/s/-MiarV4x7C9ia6BvqaTk/) (Aplicativo coletor), pois o levantamento do volume entregue pelo produtor e obtido através dos registros oriundos deste aplicativo, única forma de se obter o dado essencial para os cálculos.\
\
A flexibilização para inclusão de parâmetros que controlam o sistema de valorização do leite **(SVL)** e bem extensa e faz parte do modelo de [**precificação**](sistema-de-precificacao-svl). Aqui são admitidas várias **versões de tabelas,**  que consideram faixas de bonificação ou penalização para diversos indicadores além da qualidade, como : Volume, Temperatura, Crioscopia, Logística, Fidelidade, Projetos, Gestão e Certificação.\
\
As **Deduções** e **Créditos** são considerados por meio da importação de registros pré-formatados em arquivo ou por meio da **API.**\
\
Parâmetros adicionais de controle , bonificação, acordos comerciais, junção de volumes por  participação em tanques coletivos ou cooperativas virtuais também são admitidos por meio de outro pilar fundamental que é o [**contrato**](contratos-e-vigencias) e sua **vigência.** No contrato são definidas as principais regras de operação que determinam como a folha será calculada, podendo ser considerado o pagamento por propriedade (fazenda) para os casos onde o produtor deseja receber por unidade de produção, ampliando o controle.\
\
Por fim, o [**Modelo de Pagamento** ](modelos-de-pagamento) contém o cerne de funcionamento do módulo, que é a **Fórmula de Cálculo,** o maior diferencial do módulo Milk's Pay,  que permite a utilização de **variáveis** de substituição (**Macros**),  para indicar o que será calculado no modelo de pagamento e o que será impresso no demonstrativo, com a nomenclatura já utilizada pelo laticínio. Vários modelos de pagamento são admitidos, provendo uma infinidade de fórmulas  independentes, que podem ser utilizadas na mesma folha de pagamento. \
\
O Milk's Pay admite, em funções secundárias, a configuração e emissão de **NF-e, Simulação de Valores, Publicação dos demonstrativos e Documentos além de conter os** [**relatórios de controle**](relatorios-e-conciliacoes) **bem como o apoio a conferência dos valores antes da geração final da folha.**
