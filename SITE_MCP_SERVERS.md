# Gerenciamento de Site MCP Servers no GitBook

Este documento explica como configurar e gerenciar servidores MCP (Model Context Protocol) para seu Docs Site no GitBook.

## O que são Site MCP Servers?

Site MCP Servers permitem que você configure servidores MCP externos que podem ser usados pelo seu Docs Site no GitBook. Isso permite que assistentes de IA acessem e interajam com recursos externos através do protocolo MCP.

**Documentação oficial**: [GitBook API - Site MCP Servers](https://gitbook.com/docs/developers/gitbook-api/api-reference/docs-sites/site-mcp-servers)

## Pré-requisitos

1. **Token de API do GitBook** configurado no `.env.local`
2. **Organization ID** configurado no `.env.local`
3. **Site ID** (Docs Site) configurado no `.env.local`

### Como obter o Site ID

1. Acesse seu Docs Site no GitBook
2. Observe a URL: `https://app.gitbook.com/o/{ORGANIZATION_ID}/sites/{SITE_ID}`
3. Ou use a API para listar sites:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://api.gitbook.com/v1/orgs/{ORGANIZATION_ID}/sites
   ```

## Configuração

### 1. Adicionar Site ID ao .env.local

Edite o arquivo `.env.local` e adicione:

```bash
GITBOOK_SITE_ID=seu_site_id_aqui
```

### 2. Usar o Script de Gerenciamento

Um script foi criado em `scripts/manage-site-mcp.js` para facilitar o gerenciamento.

## Comandos Disponíveis

### Listar todos os MCP Servers

```bash
node scripts/manage-site-mcp.js list
```

Retorna uma lista de todos os servidores MCP configurados para o site.

### Criar um novo MCP Server

```bash
node scripts/manage-site-mcp.js create \
  "Nome do Servidor" \
  "https://mcp.example.com" \
  '{"Authorization":"Bearer token","Content-Type":"application/json"}'
```

**Parâmetros:**
- `nome`: Nome do servidor (1-100 caracteres)
- `url`: URL do servidor MCP (URI válido, max 2048 caracteres)
- `headers_json` (opcional): JSON com headers HTTP a serem enviados

**Exemplo:**
```bash
node scripts/manage-site-mcp.js create \
  "Pay Manual MCP Server" \
  "https://api.example.com/mcp" \
  '{"Authorization":"Bearer abc123","X-Custom-Header":"value"}'
```

### Obter detalhes de um MCP Server

```bash
node scripts/manage-site-mcp.js get <server_id>
```

**Exemplo:**
```bash
node scripts/manage-site-mcp.js get abc123xyz
```

### Atualizar um MCP Server

```bash
node scripts/manage-site-mcp.js update <server_id> [nome] [url] [headers_json]
```

**Exemplo - Atualizar apenas o nome:**
```bash
node scripts/manage-site-mcp.js update abc123xyz "Novo Nome"
```

**Exemplo - Atualizar URL e headers:**
```bash
node scripts/manage-site-mcp.js update abc123xyz \
  "Nome" \
  "https://nova-url.com/mcp" \
  '{"Authorization":"Bearer novo_token"}'
```

### Deletar um MCP Server

```bash
node scripts/manage-site-mcp.js delete <server_id>
```

**Exemplo:**
```bash
node scripts/manage-site-mcp.js delete abc123xyz
```

## Estrutura do Site MCP Server

Um Site MCP Server possui os seguintes atributos:

```json
{
  "object": "site-mcp-server",
  "id": "unique_id",
  "name": "Nome do Servidor",
  "url": "https://mcp.example.com",
  "headers": {
    "Authorization": "Bearer token",
    "Content-Type": "application/json"
  },
  "urls": {
    "location": "https://mcp.example.com"
  }
}
```

### Validações

- **name**: String com 1-100 caracteres
- **url**: URI válido com máximo de 2048 caracteres
- **headers**: Objeto com headers HTTP (opcional, mas recomendado)

## Casos de Uso

### 1. Configurar servidor MCP externo

Se você tem um servidor MCP rodando em outro servidor:

```bash
node scripts/manage-site-mcp.js create \
  "Servidor Externo" \
  "https://meu-servidor.com/mcp" \
  '{"Authorization":"Bearer meu_token_secreto"}'
```

### 2. Configurar servidor MCP local (via tunnel)

Se você quer usar um servidor MCP local, você precisará expor via tunnel (ngrok, localtunnel, etc.):

```bash
# 1. Expor servidor local via ngrok
ngrok http 3000

# 2. Criar MCP server com URL do ngrok
node scripts/manage-site-mcp.js create \
  "Servidor Local" \
  "https://abc123.ngrok.io" \
  '{}'
```

### 3. Atualizar configuração existente

```bash
# Listar servidores existentes
node scripts/manage-site-mcp.js list

# Atualizar um servidor específico
node scripts/manage-site-mcp.js update abc123xyz \
  "Nome Atualizado" \
  "https://nova-url.com" \
  '{"Authorization":"Bearer novo_token"}'
```

## API Reference

A documentação completa da API está disponível em:
- [GitBook API - Site MCP Servers](https://gitbook.com/docs/developers/gitbook-api/api-reference/docs-sites/site-mcp-servers)

### Endpoints Disponíveis

- `GET /v1/orgs/{organizationId}/sites/{siteId}/mcp-servers` - Listar servidores
- `POST /v1/orgs/{organizationId}/sites/{siteId}/mcp-servers` - Criar servidor
- `GET /v1/orgs/{organizationId}/sites/{siteId}/mcp-servers/{serverId}` - Obter servidor
- `PATCH /v1/orgs/{organizationId}/sites/{siteId}/mcp-servers/{serverId}` - Atualizar servidor
- `DELETE /v1/orgs/{organizationId}/sites/{siteId}/mcp-servers/{serverId}` - Deletar servidor

## Solução de Problemas

### Erro: "Site ID não encontrado"

- Verifique se o `GITBOOK_SITE_ID` está correto no `.env.local`
- Liste os sites disponíveis via API para confirmar o ID

### Erro: "Invalid URL"

- Certifique-se de que a URL é um URI válido
- URLs devem começar com `http://` ou `https://`
- Máximo de 2048 caracteres

### Erro: "Name too long"

- O nome deve ter entre 1 e 100 caracteres

### Erro: "Unauthorized"

- Verifique se o token de API está correto e válido
- Certifique-se de que o token tem permissões para gerenciar sites

## Próximos Passos

1. Configure o `GITBOOK_SITE_ID` no `.env.local`
2. Liste os servidores MCP existentes: `node scripts/manage-site-mcp.js list`
3. Crie um novo servidor MCP conforme necessário
4. Use o servidor MCP configurado no seu Docs Site do GitBook

## Arquivos Relacionados

- `scripts/manage-site-mcp.js` - Script de gerenciamento
- `gitbook-site-mcp-config.json` - Configuração de referência
- `.env.local` - Credenciais (não versionado)
- `env.example` - Template de configuração

