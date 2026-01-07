# Guia de Preenchimento - Páginas com Elementos Numerados

Este guia explica como preencher páginas que seguem o padrão de elementos numerados em imagens.

## Processo de Preenchimento

### 1. Analisar a Imagem

1. Abra o arquivo Markdown da página (ex: `content/configuracoes.md`)
2. Localize a URL da imagem no código
3. Acesse a URL no navegador para visualizar a imagem
4. Identifique todos os números/bullets visíveis na imagem

### 2. Documentar os Elementos

Para cada número encontrado na imagem, documente:

- **Número**: Qual número está visível (1, 2, 3...)
- **Nome**: Nome do campo/opção que o número aponta
- **Localização**: Onde está na tela (ex: "Painel superior", "Menu lateral")
- **Descrição**: O que é este elemento
- **Como ajustar**: Passos para configurar
- **Para que serve**: Finalidade da configuração
- **Como afeta o cálculo**: Impacto nos cálculos da folha

### 3. Usar o Script Auxiliar

Execute o script para gerar um template:

```bash
node scripts/analyze-page-image.js content/configuracoes.md
```

Isso criará um arquivo JSON em `content-metadata/` que você pode preencher.

### 4. Preencher o Markdown

Use o template abaixo para cada elemento:

```markdown
**N. [Nome do Elemento]**

[Descrição breve do que é este elemento e sua função na tela de configurações]

**Como ajustar:**
- Passo 1: [Descrição do passo]
- Passo 2: [Descrição do passo]
- Passo 3: [Descrição do passo]

**Para que serve:**
[Explicação detalhada da finalidade desta configuração e quando ela é utilizada no sistema]

**Como afeta o cálculo:**
[Descrição específica de como esta configuração impacta os cálculos da folha de pagamento, incluindo exemplos práticos se aplicável]

---
```

### 5. Estrutura Final

A página deve ter:

1. Frontmatter com description
2. Título (# Configurações)
3. Texto introdutório
4. Tag `<figure>` com a imagem
5. Seção "## Descrição dos Elementos"
6. Texto introdutório da seção
7. Cada elemento numerado seguindo o template
8. Separadores `---` entre elementos

## Exemplo Completo

```markdown
---
description: Parâmetros globais que afetam o comportamento do módulo de pagamento
---

# Configurações

Os ajustes iniciais que balizam os cálculos da folha...

<figure>
  <img src="[URL]" alt="Tela de configurações">
  <figcaption>Tela de configurações do módulo Pay</figcaption>
</figure>

## Descrição dos Elementos

Seguindo a numeração presente na imagem acima:

**1. Configuração Fiscal**

Campo responsável por definir os parâmetros fiscais aplicados nos cálculos.

**Como ajustar:**
- Acesse o menu Configurações
- Localize a seção "Parâmetros Fiscais"
- Selecione a opção desejada no dropdown

**Para que serve:**
Define o regime tributário e as regras fiscais que serão aplicadas em todos os cálculos da folha de pagamento.

**Como afeta o cálculo:**
Esta configuração determina quais impostos serão calculados e suas respectivas alíquotas, impactando diretamente o valor líquido a ser pago aos produtores.

---

**2. [Próximo elemento]**
...
```

## Checklist

- [ ] Imagem analisada e todos os números identificados
- [ ] Lista de elementos criada
- [ ] Informações coletadas para cada elemento
- [ ] Template aplicado para cada elemento
- [ ] Conteúdo escrito e revisado
- [ ] Formatação Markdown verificada
- [ ] Preview visualizado
- [ ] Revisão final concluída

## Dicas

1. **Ordem**: Sempre siga a ordem numérica (1, 2, 3...)
2. **Consistência**: Mantenha o mesmo formato para todos os elementos
3. **Clareza**: Use linguagem clara e objetiva
4. **Exemplos**: Inclua exemplos práticos quando relevante
5. **Separação**: Use `---` para separar visualmente cada elemento

