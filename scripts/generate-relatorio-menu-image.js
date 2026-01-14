#!/usr/bin/env node

/**
 * Script to Generate Relatório Menu Image with Numbered Badges
 * Renders the relatório menu sidebar and adds numbered badges to each report option
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

/**
 * Load configuration from JSON file
 */
function loadConfig(configPath) {
    if (!existsSync(configPath)) {
        throw new Error(`Configuration file not found: ${configPath}`);
    }
    
    const configContent = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    
    if (config.htmlPath && !config.htmlPath.startsWith('/')) {
        config.htmlPath = resolve(projectRoot, config.htmlPath);
    }
    
    if (config.outputImage && !config.outputImage.startsWith('/')) {
        config.outputImage = resolve(projectRoot, config.outputImage);
    }
    
    return config;
}

/**
 * Create full HTML wrapper for rendering
 */
function createFullHTML(htmlPath, config) {
    const htmlContent = readFileSync(htmlPath, 'utf-8');
    
    // Read necessary CSS and JS files
    const basePath = '/Applications/MAMP/htdocs/milks/web';
    
    // Mock data for relatórios
    const relatoriosData = [
        {
            nome: 'Conciliação de folha de pagamento',
            descricao: 'Relatório para conferência dos requisitos para geração de uma folha de pagamento',
            icon: 'balance-scale',
            color: 'info'
        },
        {
            nome: 'Custo flash',
            descricao: 'Relatório de custo flash de pagamento',
            icon: 'dollar',
            color: 'success'
        },
        {
            nome: 'Controle de pagamentos',
            descricao: 'Relatório de controle de pagamentos dos produtores na folha',
            icon: 'check-square-o',
            color: 'warning'
        },
        {
            nome: 'Análise de pagamentos de produtores',
            descricao: 'Relatório para análise de pagamentos de produtores em um período',
            icon: 'dashboard',
            color: 'primary'
        },
        {
            nome: 'Informe de Rendimentos',
            descricao: 'Relatório de informe de rendimentos para declaração de IRPF',
            icon: 'file-text-o',
            color: 'danger'
        }
    ];
    
    // Replace ng-repeat with actual HTML
    let processedHTML = htmlContent;
    if (htmlContent.includes('ng-repeat="relatorio in relatorios')) {
        const repeatMatch = htmlContent.match(/<a[^>]*ng-repeat="relatorio in relatorios[^"]*"[^>]*>([\s\S]*?)<\/a>/);
        if (repeatMatch) {
            const itemTemplate = repeatMatch[1];
            let itemsHTML = '';
            relatoriosData.forEach((relatorio, index) => {
                let item = itemTemplate
                    .replace(/\{\{relatorio\.nome\}\}/g, relatorio.nome)
                    .replace(/\{\{relatorio\.descricao\}\}/g, relatorio.descricao)
                    .replace(/fa-\{\{relatorio\.icon\}\}/g, `fa-${relatorio.icon}`)
                    .replace(/b-l-\{\{relatorio\.color\}\}/g, `b-l-${relatorio.color}`)
                    .replace(/ng-repeat="[^"]*"/g, '')
                    .replace(/ng-class="[^"]*"/g, '')
                    .replace(/ng-click="[^"]*"/g, '');
                itemsHTML += `<a class="list-group-item b-l-${relatorio.color} b-l-3x hover-anchor group" style="position: relative;">${item}</a>`;
            });
            processedHTML = htmlContent.replace(/<a[^>]*ng-repeat="relatorio in relatorios[^"]*"[^>]*>[\s\S]*?<\/a>/g, itemsHTML);
        }
    }
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatórios de Pagamento</title>
    <link rel="stylesheet" href="file://${basePath}/assets/css/app.css">
    <link rel="stylesheet" href="file://${basePath}/assets/css/font-awesome.min.css">
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: "Source Sans Pro", "Helvetica Neue", Helvetica, Arial, sans-serif;
            background: #f0f3f4;
        }
        .app {
            height: 100vh;
        }
        .hbox {
            display: flex;
            height: 100vh;
        }
        .col.w-xl {
            width: 300px;
            min-width: 300px;
            background: white;
            border-right: 1px solid #ddd;
            overflow-y: auto;
        }
        .col {
            flex: 1;
            background: #f0f3f4;
        }
        .list-group-item {
            position: relative;
            padding: 15px;
            border-left: 3px solid #ccc;
            margin-bottom: 5px;
            cursor: pointer;
            background: white;
            display: block;
            text-decoration: none;
            color: #333;
        }
        .list-group-item:hover {
            background: #f5f5f5;
        }
        .list-group-item.hover {
            background: #e8f4f8;
            border-left-color: #5bc0de;
        }
        .b-l-info { border-left-color: #5bc0de !important; }
        .b-l-success { border-left-color: #5cb85c !important; }
        .b-l-warning { border-left-color: #f0ad4e !important; }
        .b-l-primary { border-left-color: #337ab7 !important; }
        .b-l-danger { border-left-color: #d9534f !important; }
        .badge-number {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #5bc0de;
            color: white;
            border-radius: 50%;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            z-index: 1000;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            pointer-events: none;
        }
        .fa {
            margin-right: 8px;
        }
        .text-ellipsis {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .text-muted {
            color: #999;
            font-size: 12px;
            margin-top: 5px;
            display: block;
        }
        .font-bold {
            font-weight: bold;
        }
        .text-info {
            color: #5bc0de;
        }
        .input-group {
            margin-bottom: 10px;
        }
        .wrapper-sm {
            padding: 10px;
        }
        .wrapper {
            padding: 15px;
        }
        .block {
            display: block;
        }
    </style>
</head>
<body>
    <div class="app">
        <div class="hbox hbox-auto-xs bg-light">
            <div class="col w-xl lter b-r">
                ${processedHTML}
            </div>
        </div>
    </div>
    <script>
        // Add badges to menu items
        document.addEventListener('DOMContentLoaded', function() {
            const items = document.querySelectorAll('.list-group-item');
            items.forEach((item, index) => {
                if (index < 5) {
                    const badge = document.createElement('div');
                    badge.className = 'badge-number';
                    badge.textContent = index + 1;
                    item.appendChild(badge);
                }
            });
        });
    </script>
</body>
</html>`;
}

/**
 * Main function
 */
async function generateRelatorioMenuImage() {
    console.log("📄 Gerando imagem do menu de relatórios...");
    
    const configPath = join(projectRoot, "content-metadata", "relatorio-menu-image-config.json");
    const config = loadConfig(configPath);
    
    const htmlPath = resolve("/Applications/MAMP/htdocs/milks/web/src/secure/pay/relatoriopagamento/views/relatorio.aside.html");
    
    if (!existsSync(htmlPath)) {
        throw new Error(`HTML não encontrado: ${htmlPath}`);
    }
    
    console.log(`   📁 HTML: ${htmlPath}`);
    console.log(`   📁 Saída: ${config.outputImage}`);
    
    // Create full HTML
    const fullHTML = createFullHTML(htmlPath, config);
    
    // Save temporary HTML
    const tempHTMLPath = join(projectRoot, "temp-relatorio-menu.html");
    writeFileSync(tempHTMLPath, fullHTML, "utf-8");
    console.log("   ✅ HTML temporário criado");
    
    // Launch Puppeteer
    console.log("   🖼️  Renderizando com Puppeteer...");
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 400, height: 800, deviceScaleFactor: 2 });
    
    await page.goto(`file://${tempHTMLPath}`, { waitUntil: 'networkidle0' });
    
    // Wait for content to render
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Add badges using page.evaluate
    await page.evaluate(() => {
        const items = document.querySelectorAll('.list-group-item');
        items.forEach((item, index) => {
            if (index < 5) {
                const badge = document.createElement('div');
                badge.className = 'badge-number';
                badge.textContent = index + 1;
                badge.style.cssText = 'position: absolute; top: 10px; right: 10px; background: #5bc0de; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; z-index: 1000; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);';
                item.style.position = 'relative';
                item.appendChild(badge);
            }
        });
    });
    
    // Wait a bit more for badges to render
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Capture screenshot
    await page.screenshot({
        path: config.outputImage,
        fullPage: true,
        type: 'png'
    });
    
    await browser.close();
    
    // Cleanup
    if (existsSync(tempHTMLPath)) {
        const { unlinkSync } = await import('fs');
        unlinkSync(tempHTMLPath);
    }
    
    console.log(`\n✅ Imagem gerada com sucesso!`);
    console.log(`📁 Arquivo: ${config.outputImage}`);
}

// Run
generateRelatorioMenuImage().catch(error => {
    console.error("❌ Erro:", error);
    process.exit(1);
});
