# Gerador Genérico de Imagens de Formulário

Este script genérico gera imagens de formulários HTML com bullets numerados para uso na documentação. Suporta preenchimento automático de dados do banco de dados e renderização de fórmulas complexas.

## Pré-requisitos

1. **Node.js** instalado (versão 18+)
2. **Puppeteer** instalado:
   ```bash
   npm install puppeteer
   ```

## Uso Básico

```bash
# Usar arquivo de configuração
node scripts/generate-form-image.js --config content-metadata/modelos-de-pagamento-image-config.json

# Com dados do banco (arquivo JSON pré-gerado)
node scripts/generate-form-image.js --config content-metadata/modelos-de-pagamento-image-config.json --data content-metadata/modelos-de-pagamento-data.json
```

## Estrutura de Configuração

Crie um arquivo JSON de configuração em `content-metadata/` com a seguinte estrutura:

```json
{
  "pageName": "nome-da-pagina",
  "title": "Título do Formulário",
  "htmlPath": "/caminho/para/form.html",
  "outputImage": "content/imagem-form.png",
  "database": {
    "enabled": true,
    "table": "nome_tabela",
    "contaId": 40001,
    "dataFile": "content-metadata/nome-da-pagina-data.json"
  },
  "elements": [
    {
      "selector": "#campo-id",
      "number": 1,
      "label": "Nome do Campo",
      "position": {
        "top": "-12px",
        "right": "5px"
      }
    }
  ],
  "fillData": {
    "enabled": true,
    "mappings": {
      "#campo-id": {
        "field": "nome_campo_db",
        "type": "text"
      }
    }
  },
  "renderOptions": {
    "viewport": {
      "width": 1200,
      "height": 800,
      "deviceScaleFactor": 2
    }
  }
}
```

## Buscar Dados do Banco de Dados

Para buscar dados do banco de dados (conta_id = 40001), use as funções MCP MySQL:

1. Execute a query SQL para buscar o registro:
   ```sql
   SELECT * FROM pay_modelo_pagamento 
   WHERE conta_id = 40001 AND dt_exclusao IS NULL 
   ORDER BY id DESC LIMIT 1
   ```

2. Salve o resultado em um arquivo JSON em `content-metadata/`:
   ```json
   {
     "id": 27,
     "codigo": "00123",
     "modelo": "Modelo Básico",
     "formula": "[...]",
     "ativo": 1
   }
   ```

3. Configure o `dataFile` no arquivo de configuração ou use `--data` na linha de comando.

## Elementos a Numerar

Configure os elementos que devem receber bullets numerados no array `elements`:

```json
{
  "selector": "#codigo",
  "number": 1,
  "label": "Campo Código",
  "position": {
    "top": "-12px",
    "right": "5px"
  }
}
```

- **selector**: Seletor CSS do elemento
- **number**: Número do bullet
- **label**: Descrição do elemento (opcional)
- **position**: Posição do bullet relativa ao elemento

## Preenchimento de Dados

Configure o mapeamento de campos do banco para elementos do formulário:

```json
{
  "fillData": {
    "enabled": true,
    "mappings": {
      "#codigo": {
        "field": "codigo",
        "type": "text"
      },
      "input[type='checkbox'][ng-model='record.ativo']": {
        "field": "ativo",
        "type": "checkbox",
        "trueValue": 1,
        "falseValue": 0
      }
    }
  }
}
```

### Tipos de Campo Suportados

- **text**: Campos de texto (input, textarea)
- **checkbox**: Checkboxes
- **select**: Dropdowns/selects

## Renderização de Fórmulas

Para renderizar fórmulas JSON visualmente (como em modelos de pagamento):

```json
{
  "fillData": {
    "formula": {
      "enabled": true,
      "field": "formula",
      "targetSelector": ".panel-body[ui-sortable]"
    }
  }
}
```

A fórmula será decodificada do JSON e renderizada como elementos visuais na área de construção.

## Exemplos de Uso

### Exemplo 1: Modelos de Pagamento

```bash
# Gerar imagem com dados do banco
node scripts/generate-form-image.js \
  --config content-metadata/modelos-de-pagamento-image-config.json \
  --data content-metadata/modelos-de-pagamento-data.json
```

### Exemplo 2: Configurações

```bash
# Criar configuração para outra página
# 1. Criar content-metadata/configuracoes-image-config.json
# 2. Executar:
node scripts/generate-form-image.js \
  --config content-metadata/configuracoes-image-config.json
```

## Solução de Problemas

### Erro: "Puppeteer não está instalado"
```bash
npm install puppeteer
```

### Erro: "Arquivo HTML não encontrado"
Verifique se o caminho em `htmlPath` está correto no arquivo de configuração.

### Imagem não mostra os números
- Verifique se os seletores CSS em `elements` estão corretos
- Aumente `waitTimeout` em `renderOptions`
- Verifique se os elementos existem no HTML

### Dados não são preenchidos
- Verifique se `fillData.enabled` está `true`
- Verifique se os mapeamentos estão corretos
- Verifique se o arquivo de dados JSON existe e está no formato correto

### Fórmula não é renderizada
- Verifique se `fillData.formula.enabled` está `true`
- Verifique se o campo `formula` existe no registro do banco
- Verifique se `targetSelector` aponta para o elemento correto

## Personalização

### Estilos Customizados

Adicione CSS customizado no campo `customStyles` da configuração:

```json
{
  "customStyles": ".meu-elemento { background: #f0f0f0; }"
}
```

### Opções de Renderização

Ajuste as opções de viewport e espera:

```json
{
  "renderOptions": {
    "viewport": {
      "width": 1400,
      "height": 1000,
      "deviceScaleFactor": 2
    },
    "waitForSelector": ".element-number-badge",
    "waitTimeout": 10000,
    "fallbackWait": 2000
  }
}
```

## Arquivos Relacionados

- `scripts/generate-form-image.js` - Script principal genérico
- `scripts/lib/form-renderer.js` - Funções de renderização
- `scripts/lib/database-filler.js` - Funções de preenchimento
- `scripts/fetch-database-data.js` - Helper para buscar dados do banco
- `content-metadata/*-image-config.json` - Arquivos de configuração
- `content-metadata/*-data.json` - Dados do banco de dados

## Migração do Script Antigo

O script antigo `generate-modelopagamento-image.js` pode ser mantido como wrapper ou removido após migração. Para migrar:

1. Crie o arquivo de configuração JSON
2. Busque dados do banco e salve em JSON
3. Use o novo script genérico com `--config`

