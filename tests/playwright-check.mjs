import { chromium } from "playwright";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const ARTIFACT_DIR = "C:/Users/52319400/.gemini/antigravity/brain/b7de0dca-c54a-42d4-9fb7-f1bcf5b9d3a4";
if (!existsSync(ARTIFACT_DIR)) {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function run() {
  console.log("Iniciando navegador com Playwright...");
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  } catch (e) {
    console.log("Chromium default falhou, tentando canal chrome/msedge...", e.message);
    try {
      browser = await chromium.launch({ channel: "chrome", headless: true });
    } catch {
      browser = await chromium.launch({ channel: "msedge", headless: true });
    }
  }

  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
  });
  const page = await context.newPage();

  page.on("console", (msg) => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
  page.on("pageerror", (err) => console.error(`[Browser Page Error] ${err.message}`));

  console.log("Navegando para http://localhost:5173...");
  await page.goto("http://localhost:5173", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);

  // 0. Overview
  console.log("Capturando visão do Painel Geral (Overview)...");
  const shotOverview = resolve(ARTIFACT_DIR, "playwright-overview.png");
  await page.screenshot({ path: shotOverview, fullPage: false });
  console.log(`Screenshot salvo: ${shotOverview}`);

  // 1. Ir para a tela de Revisão Humana (com 16.jpg ativa e 4 pendências)
  console.log("Abrindo visão de Revisão Humana...");
  const reviewNav = page.locator("button.nav-item:has-text('Revisão')");
  await reviewNav.click();
  await page.waitForTimeout(1500);

  const cropPreview = page.locator(".review-visual-crop");
  const cropCount = await cropPreview.count();
  console.log(`>>> Recorte Visual presente na tela de Revisão: ${cropCount > 0}`);

  const shotReviewPath = resolve(ARTIFACT_DIR, "playwright-review.png");
  await page.screenshot({ path: shotReviewPath, fullPage: false });
  console.log(`Screenshot salvo: ${shotReviewPath}`);

  // 2. Ir para a tela de Análise
  console.log("Abrindo visão de Análise...");
  const analysisNav = page.locator("button.nav-item:has-text('Análise')");
  await analysisNav.click();
  await page.waitForTimeout(1500);

  // 2. Selecionar amostra 160.jpg
  console.log("Selecionando amostra 160.jpg (Bombas de refluxo TCS)...");
  const docSelect = page.locator(".analysis-toolbar select");
  await docSelect.selectOption("reflux-pumps");
  await page.waitForTimeout(2000);

  // 3. Verificar detecções na imagem
  const boxes = page.locator(".detection-box");
  const count = await boxes.count();
  console.log(`>>> Total de caixas de detecção encontradas em 160.jpg: ${count}`);

  const evidenceItems = page.locator(".evidence-list button");
  const evidenceCount = await evidenceItems.count();
  console.log(`>>> Total de itens listados no painel de evidências: ${evidenceCount}`);

  // Coleta as primeiras 10 labels visíveis
  const labels = [];
  for (let i = 0; i < Math.min(count, 15); i++) {
    const text = await boxes.nth(i).innerText().catch(() => "");
    if (text) labels.push(text.trim());
  }
  console.log(">>> Amostra de TAGs mapeadas sobre o diagrama:", labels.join(", "));

  // Salvar screenshot do documento 160.jpg com as detecções
  const shot1Path = resolve(ARTIFACT_DIR, "playwright-160-analysis.png");
  await page.screenshot({ path: shot1Path, fullPage: false });
  console.log(`Screenshot salvo: ${shot1Path}`);

  // 4. Testar aba Topologia e fluxo
  console.log("Alternando para aba 'Topologia e fluxo'...");
  const topoTab = page.locator("button[role='tab']:has-text('Topologia e fluxo')");
  await topoTab.click();
  await page.waitForTimeout(2000);

  const topoNodes = page.locator(".topology-node");
  const nodeCount = await topoNodes.count();
  const topoEdges = page.locator(".topology-graph path");
  const edgeCount = await topoEdges.count();
  console.log(`>>> Nós no grafo topológico dinâmico: ${nodeCount}`);
  console.log(`>>> Conexões de fluxo e sinal no grafo: ${edgeCount}`);

  const shot2Path = resolve(ARTIFACT_DIR, "playwright-160-topology.png");
  await page.screenshot({ path: shot2Path, fullPage: false });
  console.log(`Screenshot salvo: ${shot2Path}`);

  // 5. Testar aba Impacto
  console.log("Alternando para aba 'Impacto'...");
  const impactTab = page.locator("button[role='tab']:has-text('Impacto')");
  await impactTab.click();
  await page.waitForTimeout(2000);

  // Clica em um nó de bomba (ex: 20-P-0201B ou primeiro nó)
  if (nodeCount > 0) {
    console.log("Clicando em nó para calcular vizinhança montante/jusante...");
    await topoNodes.first().click();
    await page.waitForTimeout(1000);
  }

  const shot3Path = resolve(ARTIFACT_DIR, "playwright-160-impact.png");
  await page.screenshot({ path: shot3Path, fullPage: false });
  console.log(`Screenshot salvo: ${shot3Path}`);

  // 6. Testar tela de Métricas
  console.log("Abrindo visão de Métricas...");
  const metricsNav = page.locator("button.nav-item:has-text('Métricas')");
  await metricsNav.click();
  await page.waitForTimeout(1500);

  const matrixCells = page.locator(".matrix-grid span");
  const cellCount = await matrixCells.count();
  console.log(`>>> Células renderizadas na matriz de confusão: ${cellCount}`);

  const shot4Path = resolve(ARTIFACT_DIR, "playwright-metrics.png");
  await page.screenshot({ path: shot4Path, fullPage: true });
  console.log(`Screenshot salvo: ${shot4Path}`);

  // 6.1 Testar modal de exportação com os 6 formatos
  console.log("Voltando para Análise e abrindo modal de exportação...");
  await analysisNav.click();
  await page.waitForTimeout(1000);
  const exportBtn = page.locator(".export-icon-button").first();
  if (await exportBtn.count() > 0) {
    await exportBtn.click();
    await page.waitForTimeout(1000);
    const shotExport = resolve(ARTIFACT_DIR, "playwright-export-modal.png");
    await page.screenshot({ path: shotExport, fullPage: false });
    console.log(`Screenshot salvo: ${shotExport}`);
    // Fechar modal
    const closeBtn = page.locator("button[aria-label='Fechar janela de exportação']").first();
    if (await closeBtn.count() > 0) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }
  }

  // 7. Testar visualização do novo diagrama ultra-complexo (petrochem-complex)
  console.log("Abrindo visão de Análise para o diagrama ultra-complexo petrochem-complex...");
  await analysisNav.click();
  await page.waitForTimeout(1000);
  await docSelect.selectOption("petrochem-complex");
  await page.waitForTimeout(2000);
  const shotPetroPath = resolve(ARTIFACT_DIR, "playwright-petrochem.png");
  await page.screenshot({ path: shotPetroPath, fullPage: false });
  console.log(`Screenshot salvo: ${shotPetroPath}`);

  await browser.close();
  console.log("Teste com Playwright concluído com sucesso!");
}

run().catch((err) => {
  console.error("Erro na execução do Playwright:", err);
  process.exit(1);
});
