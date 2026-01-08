# Manual do Módulo Pay

Bem-vindo ao manual do módulo Pay.

Este manual contém toda a documentação necessária para entender, configurar e utilizar o módulo Pay do projeto.

## Estrutura

Este manual está organizado em seções que cobrem:

- Introdução e visão geral
- Instalação e configuração
- Guias de uso
- Referência de API
- Exemplos e casos de uso

## Configuração do MCP (Model Context Protocol)

Este projeto está configurado para acesso via Model Context Protocol (MCP) através do servidor `gitbook-mcp`, permitindo que assistentes de IA acessem e interajam com a documentação do space existente no GitBook.

### Pré-requisitos

- **Node.js 20+ instalado** (inclui npm automaticamente)
  - Se não tiver instalado, consulte a seção "Pré-requisitos" em [SETUP.md](SETUP.md)
  - Verifique a instalação: `node --version` e `npm --version`
- Token de API do GitBook
- ID da organização no GitBook
- ID do space existente no GitBook

### Instalação do Servidor MCP

O servidor MCP (`gitbook-mcp`) já está incluído neste projeto no diretório `gitbook-mcp/`.

Para instalar as dependências:

```bash
cd gitbook-mcp
npm install
npm run build
```

### Configuração

1. **Obter Token de API do GitBook:**
   - Acesse: https://app.gitbook.com/account/developer
   - Gere um novo token de API
   - O token deve começar com `gb_live_` ou `gb_api_`

2. **Identificar IDs:**
   - **Organization ID**: Pode ser encontrado na URL do seu space: `https://app.gitbook.com/o/{ORGANIZATION_ID}/...`
   - **Space ID**: Pode ser encontrado na URL do seu space: `https://app.gitbook.com/o/{ORGANIZATION_ID}/s/{SPACE_ID}/...`
   - Alternativamente, você pode usar as ferramentas MCP `list_organizations` e `list_spaces` após a configuração inicial

3. **Configurar Variáveis de Ambiente:**
   
   Copie o arquivo `env.example` para `.env.local`:
   
   ```bash
   cp env.example .env.local
   ```
   
   Edite o arquivo `.env.local` e adicione suas credenciais:
   
   ```
   GITBOOK_API_TOKEN=seu_token_aqui
   GITBOOK_ORGANIZATION_ID=seu_organization_id_aqui
   GITBOOK_SPACE_ID=seu_space_id_aqui
   ```

### Uso do MCP

#### Para Desenvolvimento Local

```bash
cd gitbook-mcp
npm run dev
```

#### Para Uso com Assistente de IA (Claude Desktop, VS Code, etc.)

O servidor MCP pode ser configurado em diferentes clientes:

**VS Code (com GitHub Copilot):**

Adicione ao arquivo de configuração MCP do VS Code:

```json
{
    "servers": {
        "gitbook-mcp": {
            "type": "stdio",
            "command": "npx",
            "args": [
                "gitbook-mcp",
                "--organization-id=seu_organization_id",
                "--space-id=seu_space_id"
            ],
            "env": {
                "GITBOOK_API_TOKEN": "seu_token_aqui"
            }
        }
    }
}
```

**Claude Desktop:**

Adicione ao arquivo de configuração (`~/Library/Application Support/Claude/claude_desktop_config.json` no macOS):

```json
{
    "mcpServers": {
        "gitbook-mcp": {
            "command": "npx",
            "args": ["gitbook-mcp", "--organization-id=seu_organization_id", "--space-id=seu_space_id"],
            "env": {
                "GITBOOK_API_TOKEN": "seu_token_aqui"
            }
        }
    }
}
```

### Ferramentas Disponíveis

O servidor MCP fornece 12 ferramentas para operações de conteúdo:

- **Descoberta de Organizações**: `list_organizations`
- **Gerenciamento de Spaces**: `list_spaces`, `get_space`, `get_space_content`
- **Busca**: `search_content`
- **Recuperação de Conteúdo**: `get_page_content`, `get_page_by_path`
- **Gerenciamento de Arquivos**: `get_space_files`, `get_file`
- **Gerenciamento de Coleções**: `list_collections`, `get_collection`, `get_collection_spaces`

### Prompts Disponíveis

O servidor também fornece 6 prompts para workflows de documentação:

- `fetch_documentation` - Busca e analisa conteúdo de documentação
- `analyze_content_gaps` - Identifica lacunas na documentação
- `content_audit` - Realiza auditoria de qualidade
- `documentation_summary` - Gera resumos de spaces
- `content_optimization` - Otimiza conteúdo para SEO, legibilidade, etc.

### Documentação Adicional

Para mais informações sobre o servidor MCP, consulte:
- [README do gitbook-mcp](gitbook-mcp/README.md)
- [Documentação do GitBook API](https://api.gitbook.com/openapi.json)
- [Model Context Protocol](https://modelcontextprotocol.io)

## Estrutura do Projeto

```
manual/
├── README.md                  # Este arquivo
├── SUMMARY.md                 # Sumário do GitBook
├── SETUP.md                   # Guia de configuração
├── SITE_MCP_SERVERS.md        # Gerenciamento de Site MCP Servers
├── docs/                      # Arquivos de documentação
│   ├── instalacao.md
│   ├── configuracao.md
│   ├── uso.md
│   ├── api.md
│   └── exemplos.md
├── scripts/                   # Scripts de gerenciamento
│   └── manage-site-mcp.js     # Gerenciar Site MCP Servers
├── gitbook-mcp/               # Servidor MCP do GitBook
├── gitbook-site-mcp-config.json # Configuração de referência
├── env.example                # Template de configuração
└── .gitignore                 # Arquivos ignorados pelo git
```

## Gerenciamento de Site MCP Servers

Este projeto também inclui suporte para gerenciar Site MCP Servers no GitBook, permitindo configurar servidores MCP externos para uso no seu Docs Site.

**Documentação completa**: [SITE_MCP_SERVERS.md](SITE_MCP_SERVERS.md)

### Comandos Rápidos

```bash
# Listar servidores MCP configurados
node scripts/manage-site-mcp.js list

# Criar novo servidor MCP
node scripts/manage-site-mcp.js create "Nome" "https://url.com" '{"Authorization":"Bearer token"}'

# Ver detalhes de um servidor
node scripts/manage-site-mcp.js get <server_id>

# Atualizar servidor
node scripts/manage-site-mcp.js update <server_id> [nome] [url] [headers]

# Deletar servidor
node scripts/manage-site-mcp.js delete <server_id>
```

**Nota**: Para usar os comandos acima, você precisa configurar `GITBOOK_SITE_ID` no arquivo `.env.local`.

## Sincronização com GitSync

Este projeto suporta sincronização bidirecional automática com o GitBook usando **GitSync**, a funcionalidade nativa do GitBook.

### O que é GitSync?

O GitSync permite sincronizar automaticamente o conteúdo entre o repositório GitHub e o Space do GitBook, mantendo ambos sempre atualizados.

### ⚠️ Isolamento e Escopo

**Importante**: A configuração do GitSync é **isolada por Space** e não afeta outros projetos:

- ✅ Configurado apenas para o Space específico (`wyOmfrOj0hbYJWKsVGBS` - Documentação - Milks Pay)
- ✅ Não afeta outros Spaces na organização
- ✅ Não afeta outros repositórios GitHub
- ✅ Outros projetos continuam permitindo edições online normalmente

### Configuração

1. **Valide a estrutura** antes de configurar:
   ```bash
   node scripts/validate-gitsync.js
   ```

2. **Siga o guia completo**: Consulte [GITSYNC.md](GITSYNC.md) para instruções detalhadas passo a passo.

### Diferenças: GitSync vs Scripts Manuais

| Aspecto | GitSync | Scripts Manuais |
|---------|---------|------------------|
| **Sincronização** | Automática e bidirecional | Manual, via API |
| **Edições online** | Desabilitadas (apenas neste Space) | Permanecem habilitadas |
| **Configuração** | Uma vez, via interface | Requer scripts e API |
| **Isolamento** | Por Space (automático) | Por script/configuração |

### Quando Usar Cada Método

- **Use GitSync se**: Você quer sincronização automática e bidirecional, e não precisa editar online no GitBook
- **Use Scripts Manuais se**: Você precisa manter edições online habilitadas ou quer mais controle sobre o processo

**Documentação completa**: [GITSYNC.md](GITSYNC.md)

## Próximos Passos

1. Configure as credenciais no arquivo `.env.local`:
   - `GITBOOK_API_TOKEN`
   - `GITBOOK_ORGANIZATION_ID`
   - `GITBOOK_SPACE_ID` (para acesso via gitbook-mcp)
   - `GITBOOK_SITE_ID` (para gerenciar Site MCP Servers)
2. Instale as dependências do servidor MCP: `cd gitbook-mcp && npm install && npm run build`
3. Configure o servidor MCP no seu assistente de IA preferido
4. (Opcional) Configure Site MCP Servers para seu Docs Site: veja [SITE_MCP_SERVERS.md](SITE_MCP_SERVERS.md)
5. (Opcional) Configure GitSync para sincronização automática: veja [GITSYNC.md](GITSYNC.md)
6. Comece a usar as ferramentas MCP para acessar e ajustar o manual do módulo Pay
