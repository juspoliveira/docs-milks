#!/usr/bin/env node

/**
 * Script to Convert PDF Demonstrativo to Image
 * Uses Puppeteer to render PDF and capture as image
 */

import { readFileSync, existsSync, writeFileSync, unlinkSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

/**
 * Main function
 */
async function generateDemonstrativoFromPDF() {
    console.log("📄 Convertendo PDF do demonstrativo em imagem...");
    
    const pdfPath = resolve(projectRoot, "assets", "demosntrativo-folha-exemplo.pdf");
    const outputPath = resolve(projectRoot, "content", "demonstrativo-folha.png");
    
    if (!existsSync(pdfPath)) {
        throw new Error(`PDF não encontrado: ${pdfPath}`);
    }
    
    console.log(`   📁 PDF: ${pdfPath}`);
    console.log(`   📁 Saída: ${outputPath}`);
    
    // Launch Puppeteer
    console.log("   🖼️  Renderizando PDF com Puppeteer...");
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set viewport for high resolution
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
    
    // Load PDF as data URL
    const pdfBuffer = readFileSync(pdfPath);
    const pdfBase64 = pdfBuffer.toString('base64');
    const pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`;
    
    // Create HTML page with embedded PDF
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            margin: 0;
            padding: 20px;
            background: white;
        }
        embed {
            width: 100%;
            height: 100vh;
            border: none;
        }
    </style>
</head>
<body>
    <embed src="${pdfDataUrl}" type="application/pdf" />
</body>
</html>`;
    
    // Save temporary HTML
    const tempHTMLPath = join(projectRoot, "temp-pdf-viewer.html");
    writeFileSync(tempHTMLPath, htmlContent, "utf-8");
    
    try {
        // Navigate to HTML page
        await page.goto(`file://${tempHTMLPath}`, { waitUntil: 'networkidle0' });
        
        // Wait for PDF to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Capture screenshot
        await page.screenshot({
            path: outputPath,
            fullPage: true,
            type: 'png'
        });
        
        console.log(`\n✅ Imagem gerada com sucesso!`);
        console.log(`📁 Arquivo: ${outputPath}`);
    } finally {
        await browser.close();
        
        // Cleanup
        if (existsSync(tempHTMLPath)) {
            unlinkSync(tempHTMLPath);
        }
    }
}

// Run
generateDemonstrativoFromPDF().catch(error => {
    console.error("❌ Erro:", error);
    process.exit(1);
});
