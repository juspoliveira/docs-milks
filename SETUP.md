# Guia de Configuração - GitBook MCP

Este guia fornece instruções passo a passo para configurar o acesso ao GitBook via MCP.

## Pré-requisitos: Instalar Node.js

Antes de começar, você precisa ter o Node.js instalado no seu sistema. O Node.js inclui o npm (Node Package Manager), necessário para instalar as dependências do servidor MCP.

### Verificar se o Node.js está instalado

Execute no terminal:

```bash
node --version
npm --version
```

Se os comandos retornarem números de versão, o Node.js já está instalado. Caso contrário, siga as instruções abaixo.

### Instalar Node.js no macOS

**Opção 1: Instalador Oficial (Recomendado para iniciantes)**

1. Acesse: https://nodejs.org/
2. Baixe a versão **LTS (Long Term Support)** - recomendada para a maioria dos usuários
3. Execute o instalador `.pkg` baixado
4. Siga as instruções do instalador
5. Reinicie o terminal após a instalação
6. Verifique a instalação:
   ```bash
   node --version
   npm --version
   ```

**Opção 2: Usando Homebrew (Recomendado para desenvolvedores)**

Se você tem o Homebrew instalado:

```bash
brew install node
```

**Se encontrar erros com Homebrew** (como "FormulaUnavailableError" ou problemas de permissão):

1. **Tente atualizar o Homebrew primeiro:**
   ```bash
   brew update
   brew upgrade
   ```

2. **Se o problema persistir, limpe o cache:**
   ```bash
   brew cleanup
   rm -rf $(brew --cache)
   brew update
   ```

3. **Se ainda houver problemas de permissão, use o instalador oficial** (Opção 1) - é mais simples e confiável.

Depois verifique:

```bash
node --version
npm --version
```

**Opção 3: Usando nvm (Node Version Manager)**

O nvm permite gerenciar múltiplas versões do Node.js:

```bash
# Instalar nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reiniciar o terminal ou executar:
source ~/.zshrc

# Instalar Node.js LTS
nvm install --lts
nvm use --lts

# Verificar
node --version
npm --version
```

### Verificar a Instalação

Após instalar, execute:

```bash
node --version  # Deve mostrar algo como: v20.x.x ou v22.x.x
npm --version   # Deve mostrar algo como: 10.x.x ou 11.x.x
```

**Nota:** O servidor MCP requer Node.js 20 ou superior. Se você tiver uma versão mais antiga, atualize usando um dos métodos acima.

## Passo 1: Obter Credenciais do GitBook

### 1.1 Token de API

1. Acesse: https://app.gitbook.com/account/developer
2. Faça login na sua conta GitBook
3. Clique em "Create new token"
4. Dê um nome descritivo ao token (ex: "MCP Server - Pay Manual")
5. Copie o token gerado (ele começa com `gb_live_` ou `gb_api_`)
6. **Importante**: Guarde o token em local seguro, pois ele não será exibido novamente

### 1.2 Organization ID

1. Acesse seu space no GitBook
2. Observe a URL do navegador
3. A URL terá o formato: `https://app.gitbook.com/o/{ORGANIZATION_ID}/s/{SPACE_ID}/...`
4. Copie o `ORGANIZATION_ID` da URL

**Exemplo:**
- URL: `https://app.gitbook.com/o/abc123xyz/s/def456uvw/...`
- Organization ID: `abc123xyz`

### 1.3 Space ID

1. Ainda na mesma URL do space
2. Copie o `SPACE_ID` da URL

**Exemplo:**
- URL: `https://app.gitbook.com/o/abc123xyz/s/def456uvw/...`
- Space ID: `def456uvw`

**Alternativa:** Você pode usar as ferramentas MCP após a configuração inicial:
- Use `list_organizations` para listar organizações
- Use `list_spaces` para listar spaces

## Passo 2: Configurar Variáveis de Ambiente

1. Copie o arquivo de exemplo:
   ```bash
   cp env.example .env.local
   ```

2. Edite o arquivo `.env.local` e preencha com suas credenciais:
   ```
   GITBOOK_API_TOKEN=gb_api_seu_token_aqui
   GITBOOK_ORGANIZATION_ID=seu_organization_id_aqui
   GITBOOK_SPACE_ID=seu_space_id_aqui
   ```

3. **Importante**: O arquivo `.env.local` está no `.gitignore` e não será versionado. Nunca commite suas credenciais!

## Passo 3: Instalar Dependências do Servidor MCP

```bash
cd gitbook-mcp
npm install
npm run build
```

Isso irá:
- Instalar todas as dependências necessárias
- Compilar o código TypeScript para JavaScript

## Passo 4: Testar a Instalação

### Opção 1: Usando o Inspector MCP

```bash
cd gitbook-mcp
npm run inspect
```

Isso abrirá o MCP Inspector, uma interface web para testar as ferramentas MCP.

### Opção 2: Teste Manual

Você pode testar se o servidor está funcionando executando:

```bash
cd gitbook-mcp
npm run dev
```

## Passo 5: Configurar no Assistente de IA

### Para VS Code (GitHub Copilot)

1. Abra as configurações do MCP no VS Code
2. Adicione a seguinte configuração:

```json
{
    "servers": {
        "gitbook-mcp": {
            "type": "stdio",
            "command": "npx",
            "args": [
                "gitbook-mcp",
                "--organization-id=SEU_ORGANIZATION_ID",
                "--space-id=SEU_SPACE_ID"
            ],
            "env": {
                "GITBOOK_API_TOKEN": "SEU_TOKEN_AQUI"
            }
        }
    }
}
```

### Para Claude Desktop

1. Localize o arquivo de configuração:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. Adicione a configuração:

```json
{
    "mcpServers": {
        "gitbook-mcp": {
            "command": "npx",
            "args": [
                "gitbook-mcp",
                "--organization-id=SEU_ORGANIZATION_ID",
                "--space-id=SEU_SPACE_ID"
            ],
            "env": {
                "GITBOOK_API_TOKEN": "SEU_TOKEN_AQUI"
            }
        }
    }
}
```

3. Reinicie o Claude Desktop

## Passo 6: Verificar Funcionamento

Após configurar, você pode verificar se está funcionando:

1. Abra seu assistente de IA (VS Code, Claude Desktop, etc.)
2. Tente usar uma ferramenta MCP, por exemplo:
   - "Liste as organizações do GitBook"
   - "Mostre os spaces disponíveis"
   - "Busque conteúdo sobre [tópico]"

## Solução de Problemas

### Erro: "Unauthorized - Invalid API token"

- Verifique se o token está correto
- Certifique-se de que o token começa com `gb_live_` ou `gb_api_`
- Verifique se o token não expirou

### Erro: "Forbidden - Insufficient permissions"

- Verifique se o token tem permissões para acessar o space
- Verifique se você tem acesso ao space na conta do GitBook

### Erro: "Not Found - Resource doesn't exist"

- Verifique se os IDs de organização e space estão corretos
- Use as ferramentas `list_organizations` e `list_spaces` para verificar os IDs

### npm não encontrado / Node.js não encontrado

**Sintoma:** `zsh: command not found: npm` ou `command not found: node`

**Solução:**

1. **Instale o Node.js** seguindo as instruções na seção "Pré-requisitos" acima
   - **Recomendação:** Use o **Instalador Oficial (Opção 1)** se tiver problemas com Homebrew
2. **Após instalar, reinicie o terminal** para que as variáveis de ambiente sejam atualizadas
3. **Verifique se está funcionando:**
   ```bash
   node --version
   npm --version
   ```
4. **Se ainda não funcionar após reiniciar o terminal:**
   - No macOS, verifique se o PATH está configurado corretamente no `~/.zshrc`:
     ```bash
     echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.zshrc
     source ~/.zshrc
     ```
   - Ou adicione o caminho do Node.js manualmente (geralmente `/usr/local/bin` ou `~/.nvm/versions/node/v*/bin`)

### Erro do Homebrew: "FormulaUnavailableError" ou problemas de permissão

**Sintoma:** `FormulaUnavailableError: No available formula with the name "formula.jws.json"` ou erros de permissão ao usar `brew install node`

**Soluções:**

1. **Solução Rápida (Recomendada):** Use o **Instalador Oficial do Node.js** (Opção 1 na seção Pré-requisitos)
   - Baixe de: https://nodejs.org/
   - É mais simples e não depende do Homebrew

2. **Se preferir corrigir o Homebrew:**
   ```bash
   # Atualizar Homebrew
   brew update
   
   # Limpar cache
   brew cleanup
   rm -rf $(brew --cache)
   
   # Tentar novamente
   brew update
   brew install node
   ```

3. **Se houver problemas de permissão persistentes:**
   - Verifique as permissões: `brew doctor`
   - Pode ser necessário corrigir permissões manualmente ou usar o instalador oficial

## Próximos Passos

Após a configuração bem-sucedida, você pode:

1. Usar as ferramentas MCP para acessar conteúdo do GitBook
2. Usar os prompts para análise e otimização de documentação
3. Ajustar o manual do módulo Pay através do MCP

Para mais informações, consulte:
- [README.md](README.md)
- [README do gitbook-mcp](gitbook-mcp/README.md)

