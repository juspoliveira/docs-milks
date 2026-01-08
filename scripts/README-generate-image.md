# Gerador de Imagem do Formulário de Modelos de Pagamento

Este script gera uma imagem do formulário HTML de modelos de pagamento com bullets numerados para uso na documentação.

## Pré-requisitos

1. **Node.js** instalado (versão 18+)
2. **Puppeteer** instalado:
   ```bash
   npm install puppeteer
   ```

## Uso

```bash
node scripts/generate-modelopagamento-image.js
```

## O que o script faz

1. Lê o arquivo HTML do formulário em `/Applications/MAMP/htdocs/milks/web/src/secure/pay/modelopagamento/views/modelopagamento.pagamento.tab.html`
2. Cria um HTML completo com Bootstrap e estilos
3. Adiciona bullets numerados nos elementos principais:
   - Campo Código (1)
   - Campo Modelo (2)
   - Editor de Fórmula - Botões (3)
   - Área de Construção da Fórmula (4)
   - Checkbox Ativo (5)
4. Renderiza o HTML em um navegador headless usando Puppeteer
5. Captura um screenshot em alta resolução
6. Salva a imagem em `content/modelopagamento-form.png`

## Após gerar a imagem

1. Revise a imagem gerada em `content/modelopagamento-form.png`
2. Faça upload da imagem para o GitBook (via interface web ou API)
3. Atualize a URL da imagem no arquivo `content/modelos-de-pagamento.md`
4. Remova a nota sobre geração da imagem se desejar

## Solução de Problemas

### Erro: "Puppeteer não está instalado"
```bash
npm install puppeteer
```

### Erro: "Arquivo HTML não encontrado"
Verifique se o caminho do arquivo HTML está correto no script. O caminho padrão é:
`/Applications/MAMP/htdocs/milks/web/src/secure/pay/modelopagamento/views/modelopagamento.pagamento.tab.html`

### Imagem não mostra os números
- Verifique se o HTML foi renderizado corretamente
- Aumente o tempo de espera no script (linha com `waitForTimeout`)
- Verifique se os seletores CSS estão corretos

### Números mal posicionados
- Ajuste os valores de `top`, `right`, `left` no script para cada elemento
- Teste diferentes posições até encontrar a ideal

## Personalização

Para adicionar mais elementos numerados ou ajustar posições, edite o array `ELEMENTS_TO_NUMBER` no script.

