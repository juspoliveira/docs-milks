# Instruções para Preenchimento da Página Configurações

## Status Atual

A página `content/configuracoes.md` foi preparada com a estrutura base seguindo o padrão estabelecido. Agora é necessário preencher com as informações reais dos elementos numerados na imagem.

## Processo de Preenchimento

### Passo 1: Analisar a Imagem

1. Acesse a URL da imagem:
   ```
   https://447677371-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FwyOmfrOj0hbYJWKsVGBS%2Fuploads%2Fg2VxmOiWM4qLQdpqTtN6%2Fpay-config-fiscais.png?alt=media&token=6379e38d-e95a-47a9-b953-cf4741c40185
   ```

2. Identifique todos os números/bullets visíveis na imagem
3. Anote o que cada número aponta

### Passo 2: Preencher o Arquivo JSON

1. Abra o arquivo: `content-metadata/configuracoes-elements.json`
2. Para cada elemento numerado, adicione um objeto no array `elements`:

```json
{
  "number": 1,
  "name": "Nome do Campo/Opção",
  "description": "Descrição breve do elemento",
  "location": "Onde está na tela (ex: 'Painel superior direito')",
  "howToAdjust": [
    "Passo 1: Descrição",
    "Passo 2: Descrição",
    "Passo 3: Descrição"
  ],
  "purpose": "Explicação detalhada da finalidade desta configuração",
  "calculationImpact": "Como esta configuração impacta os cálculos da folha de pagamento"
}
```

### Passo 3: Gerar o Conteúdo

Após preencher o JSON, execute:

```bash
node scripts/generate-page-from-elements.js content-metadata/configuracoes-elements.json
```

Isso irá gerar automaticamente o conteúdo Markdown formatado.

### Passo 4: Revisar e Ajustar

1. Abra `content/configuracoes.md`
2. Revise o conteúdo gerado
3. Ajuste formatação, textos e detalhes conforme necessário
4. Visualize usando preview do VS Code (`Cmd+Shift+V`)

## Estrutura Esperada

A página final deve ter:

1. **Frontmatter** com description
2. **Título** (# Configurações)
3. **Texto introdutório** (já presente)
4. **Imagem** com figure tag (já presente)
5. **Seção "Descrição dos Elementos"** com:
   - Texto introdutório
   - Cada elemento numerado com:
     - Nome em negrito
     - Descrição
     - Como ajustar
     - Para que serve
     - Como afeta o cálculo
   - Separadores `---` entre elementos

## Exemplo de Elemento Completo

```markdown
**1. Configuração de Regime Tributário**

Campo responsável por definir o regime tributário aplicado nos cálculos da folha de pagamento.

**Como ajustar:**
- Acesse o menu "Configurações" no painel principal
- Localize a seção "Parâmetros Fiscais"
- Selecione o regime desejado no dropdown (Simples Nacional, Lucro Presumido, etc.)
- Clique em "Salvar" para aplicar as alterações

**Para que serve:**
Define qual regime tributário será utilizado para calcular os impostos incidentes sobre a folha de pagamento. Esta configuração é fundamental para determinar as alíquotas e bases de cálculo corretas.

**Como afeta o cálculo:**
Esta configuração impacta diretamente o cálculo de impostos como PIS, COFINS, IRPJ e CSLL. Diferentes regimes têm alíquotas distintas, o que altera o valor final a ser pago aos produtores. Por exemplo, no Simples Nacional, as alíquotas são menores, resultando em valores líquidos maiores para os produtores.

---
```

## Checklist

- [ ] Imagem analisada e todos os números identificados
- [ ] Arquivo JSON preenchido com informações de todos os elementos
- [ ] Script de geração executado
- [ ] Conteúdo revisado e ajustado
- [ ] Preview visualizado
- [ ] Formatação verificada
- [ ] Revisão final concluída

## Scripts Disponíveis

1. **analyze-page-image.js**: Gera template JSON e mostra URL da imagem
   ```bash
   node scripts/analyze-page-image.js content/configuracoes.md
   ```

2. **generate-page-from-elements.js**: Gera Markdown a partir do JSON preenchido
   ```bash
   node scripts/generate-page-from-elements.js content-metadata/configuracoes-elements.json
   ```

## Próximos Passos

Após completar esta página, o mesmo processo pode ser aplicado às outras páginas do manual que seguem o mesmo padrão de elementos numerados.

