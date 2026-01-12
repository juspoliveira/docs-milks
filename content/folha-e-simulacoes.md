---
description: Geração de folhas e simulações de pagamentos
---

# Folha e simulações

As folhas de pagamento são documentos que consolidam os cálculos de pagamento aos produtores de leite em um período específico. Cada folha está vinculada a uma consolidação de qualidade e contém os demonstrativos de pagamento de todos os produtores que forneceram leite no período. O sistema também permite criar simulações de folhas para projeção de valores antes do fechamento definitivo.

## Listagem de Folhas de Pagamento

A tela de listagem exibe todas as folhas de pagamento cadastradas no sistema, permitindo visualizar informações resumidas, status e realizar ações sobre cada folha.

<figure>
  <img src="../assets/folha-list-with-badges.png" alt="Tela de listagem de folhas de pagamento do módulo Pay">
  <figcaption>Tela de listagem de folhas de pagamento do módulo Pay</figcaption>
</figure>

> **Nota**: Tela de listagem de folhas de pagamento com os elementos principais numerados para referência.

## Descrição dos Elementos da Listagem

Seguindo a numeração presente na imagem acima:

**1. Nova folha**

Botão dropdown que permite criar uma nova folha de pagamento ou simulação.

**Como ajustar:**
- Acesse o menu Pagamento > Folha de Pagamento
- Clique no botão "Nova folha" no canto superior direito
- O formulário de criação será aberto
- Preencha os campos obrigatórios (Consolidação, Referência, Datas) e clique em "Salvar"

**Para que serve:**
Permite criar novas folhas de pagamento no sistema. Cada folha está vinculada a uma consolidação de qualidade e representa um período específico de fornecimento de leite.

**Como afeta o cálculo:**
As novas folhas criadas ficam disponíveis para cálculo de pagamentos. Após criar a folha, é necessário calcular os pagamentos dos produtores, o que gera os demonstrativos individuais baseados nos modelos de pagamento configurados.

---

**2. Simulação**

Opção no dropdown "Nova folha" que permite criar uma simulação de folha de pagamento.

**Como ajustar:**
- Acesse o menu Pagamento > Folha de Pagamento
- Clique no botão "Nova folha" e selecione "Simulação" no dropdown
- O formulário de simulação será aberto
- Preencha os campos e clique em "Salvar"
- A simulação será criada com status "Simulação" e pode ser calculada para projeção de valores

**Para que serve:**
Permite criar simulações de folhas de pagamento para projeção de valores antes do fechamento definitivo. As simulações não afetam os registros oficiais e podem ser utilizadas para análise e planejamento.

**Como afeta o cálculo:**
As simulações utilizam os mesmos modelos de pagamento e cálculos das folhas reais, mas os valores são apenas projetados e não geram demonstrativos oficiais ou notas fiscais.

---

**3. Filtrar**

Botão que abre o painel de filtros para buscar folhas de pagamento específicas.

**Como ajustar:**
- Na tela de listagem, clique no botão "Filtrar"
- O painel de filtros será aberto
- Selecione os critérios de busca desejados (referência, período, status, etc.)
- Clique em "Aplicar" para filtrar os resultados

**Para que serve:**
Permite buscar e filtrar folhas de pagamento cadastradas, facilitando a localização de folhas específicas quando há muitas folhas cadastradas no sistema.

**Como afeta o cálculo:**
O filtro não afeta os cálculos da folha de pagamento, apenas facilita a navegação e localização de folhas na interface administrativa.

---

**4. FOLHA (coluna)**

Coluna que exibe informações detalhadas sobre cada folha de pagamento, incluindo:
- **REFERÊNCIA**: Identificador da folha (ex: "2024/01")
- **PERÍODO**: Data de início e fim do fornecimento
- **CONSOLIDAÇÃO**: Nome da consolidação de qualidade vinculada
- **DEMONSTRATIVOS**: Quantidade de produtores/fornecedores na folha

**Como ajustar:**
- As informações são preenchidas automaticamente ao criar ou editar a folha
- A referência pode ser editada no formulário da folha
- O período é definido pelas datas de corte inicial e final
- A consolidação é selecionada no formulário

**Para que serve:**
Exibe informações essenciais para identificar cada folha de pagamento, permitindo localizar rapidamente folhas por referência, período ou consolidação.

**Como afeta o cálculo:**
A consolidação vinculada determina quais dados de qualidade serão utilizados nos cálculos. O período define o intervalo de fornecimento considerado para o cálculo dos pagamentos.

---

**5. FORNECIMENTO (coluna)**

Coluna que exibe o volume total de leite fornecido no período da folha, em litros.

**Como ajustar:**
- O volume é calculado automaticamente quando a folha é calculada
- É a soma do volume de todos os produtores que forneceram leite no período
- Não pode ser editado diretamente, apenas através do recálculo da folha

**Para que serve:**
Exibe o volume total de leite processado na folha, fornecendo uma visão geral da produção no período.

**Como afeta o cálculo:**
O volume é utilizado nos cálculos de pagamento quando o modelo de pagamento utiliza elementos baseados em volume (ex: "Volume * Preço").

---

**6. TOTAL BRUTO (coluna)**

Coluna que exibe o valor total bruto dos pagamentos calculados na folha, em reais.

**Como ajustar:**
- O total bruto é calculado automaticamente quando a folha é calculada
- É a soma dos valores brutos de todos os demonstrativos da folha
- Não pode ser editado diretamente, apenas através do recálculo da folha

**Para que serve:**
Exibe o valor total que será pago aos produtores antes das deduções, fornecendo uma visão geral do montante da folha.

**Como afeta o cálculo:**
O total bruto é a soma de todos os cálculos de pagamento dos produtores, servindo como referência para controle financeiro e planejamento.

---

**7. PREÇO MÉDIO (coluna)**

Coluna que exibe o preço médio do litro de leite na folha, calculado como total bruto dividido pelo volume total.

**Como ajustar:**
- O preço médio é calculado automaticamente quando a folha é calculada
- É calculado como: Total Bruto / Volume Total
- Não pode ser editado diretamente, apenas através do recálculo da folha

**Para que serve:**
Exibe o preço médio praticado na folha, fornecendo uma referência de valorização do leite no período.

**Como afeta o cálculo:**
O preço médio é uma métrica de referência e não afeta diretamente os cálculos individuais, que são baseados nos modelos de pagamento específicos de cada produtor.

---

**8. STATUS (coluna)**

Coluna que exibe o status atual da folha de pagamento através de badges coloridos:
- **Aberta** (verde): Folha criada e disponível para cálculo e edição
- **Bloqueada** (vermelho): Folha bloqueada devido a consolidação de qualidade aberta
- **Fechada** (azul): Folha finalizada e não pode mais ser editada
- **Simulação** (azul claro): Folha de simulação para projeção

**Como ajustar:**
- O status "Aberta" é o padrão ao criar uma folha
- O status "Fechada" é definido ao fechar a folha através da ação "Fechar folha"
- O status "Bloqueada" é automático quando há consolidação de qualidade aberta
- O status "Simulação" é definido ao criar uma simulação

**Para que serve:**
Indica o estado atual da folha, permitindo identificar rapidamente quais folhas podem ser editadas, calculadas ou estão finalizadas.

**Como afeta o cálculo:**
Folhas fechadas não podem mais ser recalculadas ou editadas. Folhas bloqueadas não podem ser calculadas até que a consolidação de qualidade seja fechada.

---

**9. Visualizar**

Ícone de olho que permite visualizar os detalhes de uma folha de pagamento sem permitir edição.

**Como ajustar:**
- Na listagem, localize a folha que deseja visualizar
- Clique no ícone de visualização (👁️) na linha da folha
- A tela de visualização será aberta mostrando todos os dados da folha e seus demonstrativos

**Para que serve:**
Permite visualizar os detalhes completos de uma folha de pagamento, incluindo informações da folha, demonstrativos de pagamento e ações disponíveis, sem permitir edição.

**Como afeta o cálculo:**
A visualização não afeta os cálculos da folha de pagamento, apenas permite consultar as informações da folha.

---

**10. Editar**

Ícone de lápis que permite editar uma folha de pagamento existente.

**Como ajustar:**
- Na listagem, localize a folha que deseja editar
- Clique no ícone de edição (✏️) na linha da folha
- A tela de edição será aberta com os dados da folha preenchidos
- Modifique os campos desejados (Código, Consolidação, Referência, Datas)
- Clique em "Salvar" para confirmar as alterações

**Para que serve:**
Permite modificar folhas de pagamento já cadastradas, ajustando informações conforme necessário. Isso é útil quando há correções ou atualizações de dados.

**Como afeta o cálculo:**
As alterações nas folhas podem afetar os cálculos se houver mudança na consolidação ou período. Após editar, é recomendado recalcular a folha para garantir que os demonstrativos estejam atualizados.

---

**11. Excluir**

Ícone de lixeira que permite excluir uma folha de pagamento.

**Como ajustar:**
- Na listagem, localize a folha que deseja excluir
- Clique no ícone de exclusão (🗑️) na linha da folha
- Confirme a exclusão quando solicitado
- A folha será removida permanentemente do sistema

**Para que serve:**
Permite remover folhas de pagamento que não são mais necessárias ou que foram cadastradas incorretamente. A exclusão é permanente e não pode ser desfeita.

**Como afeta o cálculo:**
Quando uma folha é excluída, todos os demonstrativos de pagamento vinculados também são excluídos. É importante verificar se a folha não está sendo utilizada em relatórios ou processos antes de excluí-la.

---
