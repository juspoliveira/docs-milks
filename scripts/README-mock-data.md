# Geração de Dados MOCK para Documentação

Este documento descreve o procedimento de fallback para geração de dados MOCK quando não há registros disponíveis no banco de dados.

## Visão Geral

O sistema de geração de imagens para documentação utiliza dados reais do banco de dados sempre que possível. No entanto, quando não há registros disponíveis nas contas consultadas (30001 ou 40001), o sistema gera automaticamente dados MOCK para permitir a geração das imagens.

## Módulo de Geração MOCK

O módulo `scripts/lib/mock-data-generator.js` contém funções para gerar dados MOCK:

### `generateMockFaixasData(options)`

Gera dados MOCK para faixas de impostos.

**Parâmetros:**
- `options.contaId` (opcional): ID da conta (padrão: 40001)
- `options.numFaixas` (opcional): Número de faixas a gerar (padrão: 3)

**Retorna:**
```javascript
{
  imposto: {
    id: number,
    codigo: string,
    descricao: string,
    conta_id: number
  },
  faixas: [
    {
      id: number,
      imposto_id: number,
      volume_minimo: number,
      volume_maximo: number,
      percentual: string
    }
  ]
}
```

### `generateMockRecord(schema, options)`

Gera um registro MOCK genérico baseado em um schema.

**Parâmetros:**
- `schema`: Objeto com definição de tipos de campos
- `options`: Opções adicionais

**Exemplo:**
```javascript
const schema = {
  codigo: 'string',
  descricao: 'string',
  valor: 'decimal',
  ativo: 'boolean'
};

const record = generateMockRecord(schema);
```

### `generateMockRecords(schema, count, options)`

Gera múltiplos registros MOCK.

**Parâmetros:**
- `schema`: Objeto com definição de tipos de campos
- `count`: Número de registros a gerar (padrão: 5)
- `options`: Opções adicionais

## Uso no Sistema

### Fallback Automático

O sistema aplica fallback MOCK automaticamente em dois cenários:

1. **Arquivo de dados vazio ou sem faixas**: Quando o arquivo JSON de dados existe mas não contém faixas válidas, o sistema gera dados MOCK automaticamente.

2. **Arquivo de dados não encontrado**: Quando o arquivo não existe, o sistema pode ser configurado para gerar dados MOCK (requer implementação adicional).

### Exemplo de Uso

No arquivo `scripts/generate-form-image.js`, a função `loadDatabaseRecord` verifica se há faixas válidas:

```javascript
if (data.imposto && data.faixas) {
    if (data.faixas.length > 0) {
        return data; // Usa dados reais
    }
    // Gera MOCK se não houver faixas
    console.log('   ⚠️  Nenhuma faixa encontrada, gerando dados MOCK...');
    return generateMockFaixasData({ contaId: data.imposto?.conta_id || 40001 });
}
```

## Estrutura de Dados MOCK

### Faixas de Impostos

Os dados MOCK para faixas de impostos seguem esta estrutura:

```json
{
  "imposto": {
    "id": 1,
    "codigo": "IMP-001",
    "descricao": "Imposto de Exemplo",
    "conta_id": 40001
  },
  "faixas": [
    {
      "id": 1,
      "imposto_id": 1,
      "volume_minimo": 100,
      "volume_maximo": 500,
      "percentual": "1.5000"
    }
  ]
}
```

### Tipos de Campos Suportados

- `string`: Gera texto genérico
- `number`: Gera número inteiro aleatório
- `decimal`: Gera número decimal com 4 casas decimais
- `boolean`: Gera valor booleano aleatório
- `date`: Gera data no formato ISO

## Extensão para Outras Páginas

Para usar dados MOCK em outras páginas de documentação:

1. **Criar função de geração MOCK específica** no módulo `mock-data-generator.js`:
   ```javascript
   export function generateMock[Entidade]Data(options = {}) {
       // Implementação específica
   }
   ```

2. **Atualizar `loadDatabaseRecord`** para detectar o tipo de dados e aplicar o fallback apropriado:
   ```javascript
   if (data.imposto && data.faixas) {
       // Fallback para faixas
   } else if (data.entidade && data.registros) {
       // Fallback para outra entidade
   }
   ```

3. **Adicionar schema de validação** para garantir que os dados MOCK seguem a estrutura esperada.

## Boas Práticas

1. **Sempre tentar dados reais primeiro**: O sistema deve sempre tentar usar dados reais do banco antes de gerar MOCK.

2. **Manter estrutura consistente**: Os dados MOCK devem seguir a mesma estrutura dos dados reais para garantir compatibilidade.

3. **Valores realistas**: Os valores MOCK devem ser realistas e representativos do uso real do sistema.

4. **Documentar geração MOCK**: Quando dados MOCK são gerados, o sistema deve logar uma mensagem informativa.

5. **Não persistir dados MOCK**: Os dados MOCK são gerados em memória e não devem ser salvos nos arquivos JSON de dados.

## Notas Importantes

- Os dados MOCK são gerados apenas para fins de documentação e geração de imagens.
- Os valores são aleatórios mas seguem padrões realistas.
- O sistema não valida se os dados MOCK são válidos para o contexto de negócio.
- Para produção, sempre use dados reais do banco de dados.

