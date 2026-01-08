#!/usr/bin/env node

/**
 * Script para gerar imagem do formulário de modelos de pagamento
 * com bullets numerados para documentação
 * 
 * NOTA: Este script agora é um wrapper que usa o script genérico.
 * Use o script genérico diretamente para mais flexibilidade:
 *   node scripts/generate-form-image.js --config content-metadata/modelos-de-pagamento-image-config.json
 * 
 * NOTA SOBRE DOCUMENTAÇÃO DE IMAGENS:
 * As notas sobre imagens geradas nos arquivos .md devem ser simples e descritivas,
 * apenas informando o que é a tela, sem detalhes técnicos. Exemplo:
 * "> **Nota**: Tela de cadastro e edição de modelos de pagamento com os campos principais numerados para referência."
 * 
 * NÃO incluir:
 * - Menção à geração automática
 * - Origem dos dados (banco de dados, etc.)
 * - Comandos de execução
 * - Requisitos técnicos (Puppeteer, npm, etc.)
 * - Detalhes de sincronização (GitSync, etc.)
 * - Instruções de regeneração
 */

import { spawn } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

// Configuração para usar o script genérico
const CONFIG_PATH = join(projectRoot, "content-metadata", "modelos-de-pagamento-image-config.json");

// Elementos a numerar na ordem de aparição
const ELEMENTS_TO_NUMBER = [
    { selector: '#codigo', number: 1, label: 'Campo Código' },
    { selector: '#modelo', number: 2, label: 'Campo Modelo' },
    { selector: '.panel-heading', number: 3, label: 'Editor de Fórmula - Botões' },
    { selector: '.panel-body', number: 4, label: 'Área de Construção da Fórmula' },
    { selector: 'input[type="checkbox"][ng-model="record.ativo"]', number: 5, label: 'Checkbox Ativo' }
];

// CSS para adicionar bullets numerados
const NUMBER_BADGE_CSS = `
<style>
.element-number-badge {
    position: absolute;
    background: #ff0000;
    color: white;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    border: 2px solid white;
}

.element-number-badge::before {
    content: attr(data-number);
}

.form-group {
    position: relative;
}

.panel-heading {
    position: relative;
}

.panel-body {
    position: relative;
}

.checkbox {
    position: relative;
}
</style>
`;

// JavaScript para adicionar os números
const NUMBER_BADGE_SCRIPT = `
<script>
(function() {
    const elements = ${JSON.stringify(ELEMENTS_TO_NUMBER)};
    
    elements.forEach(function(element) {
        const el = document.querySelector(element.selector);
        if (el) {
            const badge = document.createElement('div');
            badge.className = 'element-number-badge';
            badge.setAttribute('data-number', element.number);
            badge.style.top = '-12px';
            badge.style.right = '-12px';
            
            // Ajustar posicionamento baseado no tipo de elemento
            if (element.selector.includes('input') || element.selector.includes('#codigo') || element.selector.includes('#modelo')) {
                badge.style.top = '-12px';
                badge.style.right = '5px';
            } else if (element.selector.includes('.panel-heading')) {
                badge.style.top = '5px';
                badge.style.right = '5px';
            } else if (element.selector.includes('.panel-body')) {
                badge.style.top = '5px';
                badge.style.left = '5px';
            } else if (element.selector.includes('checkbox')) {
                badge.style.top = '-8px';
                badge.style.left = '20px';
            }
            
            el.style.position = 'relative';
            el.appendChild(badge);
        }
    });
    
    // Aguardar um pouco para garantir renderização
    setTimeout(function() {
        console.log('Números adicionados com sucesso');
    }, 500);
})();
</script>
`;

// HTML wrapper completo
function createFullHTML(formHTML) {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Modelo de Pagamento - Formulário</title>
    
    <!-- Bootstrap CSS -->
    <link href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- Font Awesome -->
    <link href="https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css" rel="stylesheet">
    
    ${NUMBER_BADGE_CSS}
    
    <style>
        body {
            padding: 20px;
            background: #f5f5f5;
        }
        .panel-body {
            background: white;
            padding: 20px;
        }
        .form-control {
            border: 1px solid #ddd;
        }
        .btn {
            margin: 2px;
        }
        .panel-heading {
            background: #f8f9fa;
            border-bottom: 1px solid #ddd;
            padding: 10px 15px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="panel panel-default">
            <div class="panel-heading">
                <h3 class="panel-title">Modelo de Pagamento</h3>
            </div>
            ${formHTML}
        </div>
    </div>
    
    ${NUMBER_BADGE_SCRIPT}
</body>
</html>`;
}

// Função principal
async function main() {
    console.log("🖼️  Gerador de Imagem do Formulário de Modelos de Pagamento\n");
    
    // Verificar se Puppeteer está disponível
    let puppeteer;
    try {
        const puppeteerModule = await import('puppeteer');
        // Compatibilidade com diferentes versões do Puppeteer
        puppeteer = puppeteerModule.default || puppeteerModule;
    } catch (error) {
        console.error("❌ Puppeteer não está instalado!");
        console.log("\n💡 Para instalar o Puppeteer, execute:");
        console.log("   npm install puppeteer");
        console.log("\n💡 Alternativamente, você pode:");
        console.log("   1. Capturar a imagem manualmente do formulário");
        console.log("   2. Adicionar os números manualmente usando uma ferramenta de edição");
        console.log("   3. Fazer upload da imagem para o GitBook");
        process.exit(1);
    }
    
    // Ler o HTML do formulário
    if (!existsSync(FORM_HTML_PATH)) {
        console.error(`❌ Arquivo HTML não encontrado: ${FORM_HTML_PATH}`);
        process.exit(1);
    }
    
    console.log(`📄 Lendo HTML do formulário: ${FORM_HTML_PATH}`);
    const formHTML = readFileSync(FORM_HTML_PATH, 'utf-8');
    
    // Criar HTML completo
    const fullHTML = createFullHTML(formHTML);
    
    // Salvar HTML temporário
    const tempHTMLPath = join(projectRoot, "temp-form.html");
    writeFileSync(tempHTMLPath, fullHTML, 'utf-8');
    console.log(`✅ HTML temporário criado: ${tempHTMLPath}`);
    
    // Renderizar com Puppeteer
    console.log("\n🌐 Iniciando navegador headless...");
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Configurar viewport
    await page.setViewport({
        width: 1200,
        height: 800,
        deviceScaleFactor: 2 // Para melhor qualidade
    });
    
    // Carregar HTML
    const fileUrl = `file://${tempHTMLPath}`;
    console.log(`📖 Carregando HTML: ${fileUrl}`);
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });
    
    // Aguardar renderização dos números - aguardar até que os badges apareçam
    try {
        await page.waitForSelector('.element-number-badge', { timeout: 5000 });
        console.log("✅ Badges numerados renderizados");
    } catch (e) {
        // Se não encontrar, aguarda um tempo fixo para garantir renderização
        console.log("⏳ Aguardando renderização...");
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    // Capturar screenshot
    console.log("📸 Capturando screenshot...");
    await page.screenshot({
        path: OUTPUT_IMAGE_PATH,
        fullPage: true,
        type: 'png'
    });
    
    await browser.close();
    
    // Remover arquivo temporário
    try {
        const { unlinkSync } = await import('fs');
        unlinkSync(tempHTMLPath);
    } catch (e) {
        // Ignorar erro se não conseguir remover
    }
    
    console.log(`\n✅ Imagem gerada com sucesso!`);
    console.log(`📁 Arquivo: ${OUTPUT_IMAGE_PATH}`);
    console.log(`\n💡 Próximos passos:`);
    console.log(`   1. Revise a imagem gerada`);
    console.log(`   2. Faça upload para o GitBook (se necessário)`);
    console.log(`   3. Atualize a URL da imagem no arquivo modelos-de-pagamento.md`);
    
    return OUTPUT_IMAGE_PATH;
}

// Executar
main().catch(error => {
    console.error("\n❌ Erro ao gerar imagem:");
    console.error(error.message);
    if (error.stack) {
        console.error(error.stack);
    }
    process.exit(1);
});

