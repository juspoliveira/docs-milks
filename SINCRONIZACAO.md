# Guia de Sincronização GitBook

Este documento explica como sincronizar o conteúdo do GitBook para arquivos locais usando scripts manuais.

## Métodos de Sincronização

Este projeto oferece duas formas de sincronizar com o GitBook:

1. **GitSync (Recomendado)**: Sincronização automática e bidirecional usando a funcionalidade nativa do GitBook
   - ✅ Sincronização automática
   - ✅ Bidirecional (GitHub ↔ GitBook)
   - ✅ Configuração uma vez
   - ⚠️ Desabilita edições online (apenas no Space configurado)
   - 📖 **Documentação**: [GITSYNC.md](GITSYNC.md)

2. **Scripts Manuais (Este guia)**: Sincronização manual usando scripts e API do GitBook
   - ✅ Mantém edições online habilitadas
   - ✅ Controle total sobre o processo
   - ⚠️ Requer execução manual
   - ⚠️ Sincronização unidirecional (GitBook → Local)

**Escolha o método que melhor se adequa ao seu fluxo de trabalho.**

## Visão Geral

O projeto inclui scripts para sincronizar automaticamente o conteúdo das páginas do GitBook para arquivos Markdown locais, facilitando:

- **Versionamento**: Conteúdo pode ser versionado no Git
- **Edição Local**: Editar arquivos Markdown localmente
- **Backup**: Ter cópia local de toda documentação
- **Trabalho Offline**: Acessar conteúdo sem conexão

## Estrutura de Diretórios

```
manual/
├── content/                    # Conteúdo sincronizado do GitBook
│   ├── pagamento-a-produtores.md
│   ├── conceito-e-visao-de-operacao.md
│   └── ... (12 páginas no total)
│
└── content-metadata/           # Metadados e histórico
    ├── pages.json              # Mapeamento de páginas
    └── sync-log.json           # Histórico de sincronizações
```

## Scripts Disponíveis

### 1. Sincronização Completa

Sincroniza todas as páginas do GitBook:

```bash
node scripts/sync-from-gitbook.js --all
```

**Opções:**
- `--all`: Sincronizar todas as páginas (padrão se não especificar página)
- `--dry-run`: Apenas mostrar o que seria feito, sem salvar arquivos
- `--page <path>`: Sincronizar apenas uma página específica

**Exemplos:**

```bash
# Sincronizar todas as páginas
node scripts/sync-from-gitbook.js --all

# Ver o que seria sincronizado (sem salvar)
node scripts/sync-from-gitbook.js --all --dry-run

# Sincronizar apenas uma página
node scripts/sync-from-gitbook.js --page pagamento-a-produtores
```

### 2. Atualizar Página Específica

Atualiza uma única página:

```bash
node scripts/update-page.js <page-path>
```

**Exemplos:**

```bash
# Atualizar página de pagamento
node scripts/update-page.js pagamento-a-produtores

# Atualizar página de configurações
node scripts/update-page.js configuracoes
```

## Como Funciona

### Processo de Sincronização

1. **Obter Estrutura**: O script usa a API do GitBook para obter a lista de todas as páginas
2. **Ler Conteúdo**: Para cada página, obtém o conteúdo em formato Markdown
3. **Verificar Mudanças**: Compara hash MD5 do conteúdo para detectar alterações
4. **Salvar Arquivos**: Salva o conteúdo em arquivos `.md` na pasta `content/`
5. **Atualizar Metadados**: Atualiza `content-metadata/pages.json` com informações das páginas

### Metadados

O arquivo `content-metadata/pages.json` contém:

```json
{
  "spaceId": "wyOmfrOj0hbYJWKsVGBS",
  "spaceName": "Documentação - Milks Pay",
  "lastFullSync": "2026-01-06T...",
  "pages": [
    {
      "id": "8JQoDA1iUNUPXnqSri5H",
      "title": "Pagamento a produtores",
      "path": "pagamento-a-produtores",
      "file": "content/pagamento-a-produtores.md",
      "hash": "ea88a0dbb36351e1fa13f47ffa90eb36",
      "lastSynced": "2026-01-06T18:58:53.383Z"
    }
  ]
}
```

### Detecção de Mudanças

O script usa hash MD5 para detectar se uma página foi modificada no GitBook:

- Se o hash mudou → página é atualizada
- Se o hash é o mesmo → página é pulada (sem alterações)

## Páginas Sincronizadas

Atualmente, as seguintes 12 páginas estão sendo sincronizadas:

1. **Pagamento a produtores** (`pagamento-a-produtores`)
2. **Conceito e visão de operação** (`conceito-e-visao-de-operacao`)
3. **Configurações** (`configuracoes`)
4. **Consolidação de qualidade** (`consolidacao-de-qualidade`)
5. **Sistema de Precificação (SVL)** (`sistema-de-precificacao-svl`)
6. **Tabela de preços** (`tabela-de-precos`)
7. **Modelos de pagamento** (`modelos-de-pagamento`)
8. **Contratos e vigências** (`contratos-e-vigencias`)
9. **Impostos** (`impostos`)
10. **Folha e simulações** (`folha-e-simulacoes`)
11. **Acordos comerciais** (`acordos-comerciais`)
12. **Relatórios e Conciliações** (`relatorios-e-conciliacoes`)

## Fluxo de Trabalho Recomendado

### Sincronização Inicial

1. Execute a sincronização completa:
   ```bash
   node scripts/sync-from-gitbook.js --all
   ```

2. Verifique os arquivos criados em `content/`

3. Revise o `SUMMARY.md` que foi atualizado automaticamente

### Atualizações Regulares

1. **Sincronização Incremental**: Execute novamente o script - apenas páginas modificadas serão atualizadas
   ```bash
   node scripts/sync-from-gitbook.js --all
   ```

2. **Atualização de Página Específica**: Se souber que uma página específica foi alterada
   ```bash
   node scripts/update-page.js <page-path>
   ```

### Antes de Fazer Mudanças

1. Sincronize para garantir que tem a versão mais recente:
   ```bash
   node scripts/sync-from-gitbook.js --all
   ```

2. Faça suas edições nos arquivos em `content/`

3. (Opcional) Faça commit das mudanças no Git

## Solução de Problemas

### Erro: "GITBOOK_API_TOKEN não configurado"

Verifique se o arquivo `.env.local` existe e contém:
```
GITBOOK_API_TOKEN=seu_token
GITBOOK_SPACE_ID=seu_space_id
```

### Erro: "Erro ao obter por path"

O script tenta obter páginas por path primeiro, e se falhar, usa o ID. Isso é normal e o script continua funcionando.

### Páginas não estão sendo atualizadas

- Verifique se o hash mudou no GitBook (pode não haver alterações)
- Execute com `--dry-run` para ver o que seria feito
- Verifique os logs em `content-metadata/sync-log.json`

### Conteúdo parece incompleto

Algumas páginas podem ter conteúdo em formato "document" que precisa ser convertido. O script tenta obter em formato Markdown, mas pode precisar de ajustes.

## Integração com SUMMARY.md

O arquivo `SUMMARY.md` foi atualizado para incluir todas as páginas sincronizadas. Ele referencia os arquivos em `content/` mantendo a ordem original do GitBook.

## Quando Usar Scripts Manuais vs GitSync

### Use Scripts Manuais quando:
- ✅ Você precisa manter edições online habilitadas no GitBook
- ✅ Você quer controle total sobre quando sincronizar
- ✅ Você precisa sincronizar apenas em uma direção (GitBook → Local)
- ✅ Você quer usar a API do GitBook diretamente

### Use GitSync quando:
- ✅ Você quer sincronização automática e bidirecional
- ✅ Você não precisa editar online no GitBook (apenas no Space configurado)
- ✅ Você quer uma solução mais simples e integrada
- ✅ Você quer que mudanças no GitHub sejam automaticamente refletidas no GitBook

**Nota**: O GitSync é configurado por Space e não afeta outros projetos. Veja [GITSYNC.md](GITSYNC.md) para mais informações sobre isolamento.

## Próximos Passos

1. **Considerar GitSync**: Se você não precisa de edições online, considere usar [GitSync](GITSYNC.md) para sincronização automática
2. **Sincronização Automática**: Configure um cron job ou GitHub Action para sincronizar periodicamente
3. **Validação**: Adicione validação de formato Markdown
4. **Imagens**: Implemente download de imagens anexas (se necessário)
5. **Diff**: Adicione funcionalidade para mostrar diferenças entre versões

## Referências

- [GITSYNC.md](GITSYNC.md) - Configuração do GitSync (sincronização automática)
- [GitBook API Documentation](https://api.gitbook.com/openapi.json)
- [CONFIGURACAO_COMPLETA.md](CONFIGURACAO_COMPLETA.md) - Configuração do projeto
- [README.md](README.md) - Visão geral do projeto

