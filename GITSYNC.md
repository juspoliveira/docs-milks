# Configuração do GitSync do GitBook

Este guia explica como configurar a sincronização bidirecional entre o repositório GitHub e o Space do GitBook usando a funcionalidade nativa **GitSync**.

## ⚠️ Importante: Isolamento e Escopo

### Garantias de Isolamento

**A configuração do GitSync é isolada por Space e não afeta outros projetos:**

- ✅ **Configuração por Space**: O GitSync é configurado **apenas para o Space específico** (`wyOmfrOj0hbYJWKsVGBS` - Documentação - Milks Pay)
- ✅ **Não afeta outros Spaces**: Outros Spaces na organização continuam funcionando normalmente
- ✅ **Não afeta outros repositórios**: Apenas o repositório `juspoliveira/docs-milks` será vinculado
- ✅ **Edições online preservadas**: Outros projetos continuam permitindo edições online no GitBook
- ✅ **Branch específica**: Apenas a branch `master` será sincronizada

**Cada Space no GitBook tem sua própria configuração de GitSync independente. Ativar GitSync em um Space não afeta outros Spaces.**

## Contexto do Projeto

- **Repositório GitHub**: `juspoliveira/docs-milks`
- **Branch**: `master`
- **Space ID**: `wyOmfrOj0hbYJWKsVGBS`
- **Space Name**: Documentação - Milks Pay
- **Organização**: `-LjslsqvYZjoA2L-GX5y` (Milk's Rota)
- **Estrutura**: Arquivos Markdown em `content/` com `SUMMARY.md` na raiz

## Pré-requisitos

Antes de começar, certifique-se de ter:

1. ✅ **Conta GitHub** com acesso ao repositório `juspoliveira/docs-milks`
2. ✅ **Conta GitBook** vinculada à organização Milk's Rota
3. ✅ **Permissões de administrador** no Space "Documentação - Milks Pay"
4. ✅ **Repositório GitHub** já configurado e sincronizado localmente
5. ✅ **Estrutura validada**: Execute `node scripts/validate-gitsync.js` antes de configurar

## Passo a Passo de Configuração

### 1. Validar Estrutura Local

Antes de configurar o GitSync, valide a estrutura do projeto:

```bash
node scripts/validate-gitsync.js
```

Este script verifica:
- ✅ Existência e formato do `SUMMARY.md`
- ✅ Existência de todos os arquivos referenciados
- ✅ Estrutura de diretórios correta
- ✅ Space ID correto (`wyOmfrOj0hbYJWKsVGBS`)
- ✅ Isolamento (não afeta outros Spaces)

**Não prossiga se houver erros de validação.**

### 2. Commit e Push para GitHub

Certifique-se de que todas as mudanças estão commitadas e enviadas para o GitHub:

```bash
git add .
git commit -m "Preparar estrutura para GitSync"
git push origin master
```

### 3. Acessar Configurações do Space no GitBook

1. Acesse o GitBook: https://app.gitbook.com
2. Navegue até o Space **"Documentação - Milks Pay"**
3. **⚠️ VERIFIQUE O SPACE ID**: Confirme que está no Space correto (`wyOmfrOj0hbYJWKsVGBS`)
   - O Space ID aparece na URL: `https://app.gitbook.com/o/-LjslsqvYZjoA2L-GX5y/s/wyOmfrOj0hbYJWKsVGBS/...`
4. Clique em **"Configurar"** (ícone de engrenagem) no canto superior direito
5. Selecione **"GitHub Sync"** ou **"Git Sync"** no menu

### 4. Autenticar GitHub no GitBook

Se ainda não vinculou sua conta GitHub ao GitBook:

1. Clique em **"Conectar GitHub"** ou **"Authorize GitHub"**
2. Siga as instruções para autenticar
3. Conceda as permissões necessárias ao GitBook

### 5. Instalar App GitBook no GitHub

Se ainda não instalou o app GitBook no GitHub:

1. Você será redirecionado para instalar o **GitBook App** no GitHub
2. Escolha a instalação:
   - **Para toda a organização** (recomendado se você gerencia múltiplos projetos)
   - **Apenas para este repositório** (mais restritivo)
3. ⚠️ **Importante**: Mesmo instalando para toda a organização, cada Space escolhe se usa ou não o GitSync
4. Conceda as permissões necessárias

### 6. Configurar GitSync no Space Específico

**⚠️ ATENÇÃO: Certifique-se de estar no Space correto antes de continuar!**

1. **Verifique novamente o Space ID**: `wyOmfrOj0hbYJWKsVGBS`
2. No menu de configuração do Space, selecione **"GitHub Sync"**
3. Você verá uma lista de repositórios disponíveis

### 7. Selecionar Repositório e Branch

1. **Selecione o repositório**: `juspoliveira/docs-milks`
2. **Selecione a branch**: `master`
3. **⚠️ Confirme**: Verifique que está selecionando:
   - ✅ Repositório: `juspoliveira/docs-milks`
   - ✅ Branch: `master`
   - ✅ Space: Documentação - Milks Pay (`wyOmfrOj0hbYJWKsVGBS`)

### 8. Sincronização Inicial

O GitBook oferecerá duas opções para sincronização inicial:

#### Opção A: Sincronizar do GitHub para GitBook (Recomendado)

Use esta opção se:
- ✅ O conteúdo no GitHub está mais atualizado
- ✅ Você quer manter a estrutura atual do repositório
- ✅ Os arquivos em `content/` estão corretos

#### Opção B: Sincronizar do GitBook para GitHub

Use esta opção se:
- ⚠️ O conteúdo no GitBook está mais atualizado
- ⚠️ Você quer sobrescrever o conteúdo do GitHub

**Recomendação**: Use a Opção A (GitHub → GitBook) para manter a estrutura atual.

### 9. Verificar Isolamento

Após a configuração, **verifique que outros Spaces não foram afetados**:

1. Navegue para outro Space na organização
2. Verifique que as edições online ainda estão habilitadas
3. Confirme que o GitSync não está ativado nesses Spaces
4. Teste fazer uma edição online em outro Space (deve funcionar normalmente)

### 10. Testar Sincronização Bidirecional

1. **Teste GitHub → GitBook**:
   - Faça uma pequena alteração em um arquivo em `content/`
   - Commit e push para GitHub
   - Verifique se a mudança aparece no GitBook (pode levar alguns minutos)

2. **Teste GitBook → GitHub**:
   - No GitBook, você verá opções para criar Pull Requests
   - Mudanças no GitBook serão sincronizadas via Pull Requests no GitHub

## Como Funciona Após a Configuração

### Edições ao Vivo Desabilitadas (Apenas neste Space)

⚠️ **Importante**: Com GitSync ativado, as edições diretas no GitBook são **desabilitadas apenas para este Space específico**. 

- ✅ Outros Spaces continuam permitindo edições online normalmente
- ✅ Para editar este Space, você deve:
  - Editar arquivos localmente
  - Fazer commit e push para GitHub
  - Ou criar Pull Requests no GitBook que serão sincronizadas

### Sincronização Automática

- **GitHub → GitBook**: Mudanças no GitHub são automaticamente sincronizadas para o GitBook
- **GitBook → GitHub**: Mudanças no GitBook são sincronizadas via Pull Requests no GitHub

### Conflitos

Se houver conflitos entre edições no GitBook e no GitHub:
- O GitBook criará Pull Requests para resolver os conflitos
- Você precisará revisar e mesclar os Pull Requests

## Troubleshooting

### Erro: "Repository not found"

- Verifique que o app GitBook está instalado no GitHub
- Confirme que você tem acesso ao repositório `juspoliveira/docs-milks`
- Verifique as permissões do app GitBook no GitHub

### Erro: "Branch not found"

- Confirme que a branch `master` existe no repositório
- Verifique que você fez push da branch para o GitHub

### Sincronização não está funcionando

- Verifique que o GitSync está ativado no Space correto
- Confirme que está no Space `wyOmfrOj0hbYJWKsVGBS`
- Verifique os logs no GitBook (menu Configurar → GitHub Sync → Logs)

### Outros Spaces foram afetados?

- ⚠️ Isso não deveria acontecer, mas se ocorrer:
- Verifique cada Space individualmente
- O GitSync é configurado por Space, não globalmente
- Se necessário, desative o GitSync no Space afetado

### Como Desativar GitSync

Se precisar desativar o GitSync:

1. Acesse o Space no GitBook
2. Vá em Configurar → GitHub Sync
3. Clique em "Desconectar" ou "Disable Sync"
4. ⚠️ Isso desabilitará a sincronização, mas não afetará outros Spaces

## Verificação de Isolamento

Para garantir que apenas o Space correto foi configurado:

```bash
# Execute o script de validação
node scripts/validate-gitsync.js

# Verifique o Space ID no GitBook
# URL deve conter: /s/wyOmfrOj0hbYJWKsVGBS/
```

## Estrutura Esperada pelo GitSync

O GitBook GitSync espera:

- ✅ `SUMMARY.md` na raiz do repositório
- ✅ Arquivos Markdown referenciados no `SUMMARY.md`
- ✅ Estrutura compatível (suporta subdiretórios como `content/`)

Nossa estrutura atual é compatível:
```
manual/
├── SUMMARY.md              # Sumário (raiz)
├── README.md               # Introdução (raiz)
├── content/                # Conteúdo principal
│   ├── pagamento-a-produtores.md
│   └── ...
└── docs/                   # Documentação adicional
    └── ...
```

## Diferenças: GitSync vs Scripts Manuais

| Aspecto | GitSync | Scripts Manuais |
|---------|---------|------------------|
| **Sincronização** | Automática e bidirecional | Manual, via API |
| **Edições online** | Desabilitadas (apenas neste Space) | Permanecem habilitadas |
| **Conflitos** | Resolvidos via Pull Requests | Resolvidos manualmente |
| **Configuração** | Uma vez, via interface | Requer scripts e API |
| **Isolamento** | Por Space | Por script/configuração |

## Referências

- [Documentação Oficial do GitBook GitSync](https://docs.gitbook.com/integrations/git-sync)
- [GitBook API Documentation](https://api.gitbook.com/openapi.json)
- [SINCRONIZACAO.md](SINCRONIZACAO.md) - Scripts manuais de sincronização
- [README.md](README.md) - Visão geral do projeto

## Suporte

Se encontrar problemas:

1. Execute o script de validação: `node scripts/validate-gitsync.js`
2. Verifique os logs no GitBook (Configurar → GitHub Sync → Logs)
3. Consulte a documentação oficial do GitBook
4. Verifique que está no Space correto (`wyOmfrOj0hbYJWKsVGBS`)

---

**Última atualização**: Janeiro 2026
**Space ID**: `wyOmfrOj0hbYJWKsVGBS`
**Repositório**: `juspoliveira/docs-milks`
**Branch**: `master`

