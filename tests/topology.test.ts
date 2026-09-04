import assert from "node:assert/strict";
import test from "node:test";
import { referenceDetections, type Detection } from "../app/lib/demo-data.ts";
import {
  controlContexts,
  flowRoutes,
  generateTopologyFromDetections,
  getActiveTopologyGraph,
  getImpactNeighborhood,
  getTopologyForSample,
  resetActiveTopologyGraph,
  setActiveTopologyGraph,
  topologyEdges,
  topologyNodeByDetection,
  topologyNodeById,
  topologyNodes,
} from "../app/lib/topology-data.ts";

test("mantém a seleção sincronizada entre evidência e topologia", () => {
  const node = topologyNodeByDetection("eq-p03");
  assert.equal(node?.id, "p03");
  assert.equal(node?.label, "P-03");
});

test("calcula vizinhança de impacto apenas pelas relações de processo", () => {
  const impact = getImpactNeighborhood("p03");

  assert.deepEqual(impact.downstream, ["vp01", "b03", "storage"]);
  assert.ok(impact.upstream.includes("b02"));
  assert.ok(impact.upstream.includes("w02"));
  assert.equal(impact.upstream.includes("ls01"), false);
  assert.equal(impact.downstream.includes("pi203"), false);
});

test("todas as rotas registradas referenciam conexões explícitas", () => {
  for (const route of flowRoutes) {
    assert.equal(route.edgeIds.length, route.nodeIds.length - 1);
  }
});

test("preserva constantes curadas e retrocompatibilidade de 16.jpg", () => {
  assert.equal(topologyNodes.length, 20);
  assert.equal(topologyEdges.length, 20);
  assert.equal(flowRoutes.length, 4);
  assert.equal(controlContexts.length, 2);

  const feed = topologyNodeById("feed");
  assert.ok(feed);
  assert.equal(feed.kind, "source");

  const active = getActiveTopologyGraph();
  assert.equal(active.nodes, topologyNodes);
  assert.equal(active.edges, topologyEdges);
});

test("gera dinamicamente nós com posições percentuais x, y a partir do centro das bounding boxes", () => {
  const mockDetections: Detection[] = [
    {
      id: "eq-test-1",
      label: "TK-101",
      normalized: "TK-101",
      kind: "equipment",
      group: "Tanque de Armazenamento",
      confidence: 0.95,
      status: "accepted",
      source: "local-ocr",
      box: { x: 100, y: 100, width: 100, height: 200 }, // centro: (150, 200)
      rationale: "Tanque cilíndrico",
    },
    {
      id: "val-test-1",
      label: "VA-101",
      normalized: "VA-101",
      kind: "valve",
      group: "Válvula de Bloqueio",
      confidence: 0.9,
      status: "accepted",
      source: "local-ocr",
      box: { x: 260, y: 180, width: 40, height: 40 }, // centro: (280, 200)
      rationale: "Válvula de esfera",
    },
  ];

  const docWidth = 1000;
  const docHeight = 500;

  const { nodes } = generateTopologyFromDetections(mockDetections, docWidth, docHeight);

  assert.equal(nodes.length, 2);

  const tankNode = nodes.find((n) => n.id === "eq-test-1");
  assert.ok(tankNode);
  assert.equal(tankNode.kind, "equipment");
  // 150 / 1000 * 100 = 15%
  assert.equal(tankNode.x, 15);
  // 200 / 500 * 100 = 40%
  assert.equal(tankNode.y, 40);
  assert.equal(tankNode.detectionId, "eq-test-1");

  const valveNode = nodes.find((n) => n.id === "val-test-1");
  assert.ok(valveNode);
  assert.equal(valveNode.kind, "valve");
  // 280 / 1000 * 100 = 28%
  assert.equal(valveNode.x, 28);
  // 200 / 500 * 100 = 40%
  assert.equal(valveNode.y, 40);
});

test("conecta equipamentos adjacentes e instrumentos aos seus equipamentos mais próximos (< 220px)", () => {
  const mockDetections: Detection[] = [
    // Equipamento 1: centro (100, 200)
    {
      id: "eq-1",
      label: "P-101",
      normalized: "P-101",
      kind: "equipment",
      group: "Bomba",
      confidence: 0.9,
      status: "accepted",
      source: "local-ocr",
      box: { x: 80, y: 180, width: 40, height: 40 },
      rationale: "Bomba centrífuga",
    },
    // Equipamento 2: centro (220, 200) -> dist para eq-1 = 120px (< 220px)
    {
      id: "eq-2",
      label: "W-101",
      normalized: "W-101",
      kind: "equipment",
      group: "Trocador",
      confidence: 0.92,
      status: "accepted",
      source: "local-ocr",
      box: { x: 200, y: 180, width: 40, height: 40 },
      rationale: "Trocador de calor",
    },
    // Equipamento 3: centro (380, 200) -> dist para eq-2 = 160px (< 220px), dist para eq-1 = 280px (> 220px)
    {
      id: "eq-3",
      label: "V-101",
      normalized: "V-101",
      kind: "equipment",
      group: "Vaso",
      confidence: 0.94,
      status: "accepted",
      source: "local-ocr",
      box: { x: 360, y: 180, width: 40, height: 40 },
      rationale: "Vaso de separação",
    },
    // Equipamento 4 (isolado): centro (900, 200) -> dist > 500px (> 220px)
    {
      id: "eq-4",
      label: "TK-999",
      normalized: "TK-999",
      kind: "equipment",
      group: "Tanque",
      confidence: 0.85,
      status: "accepted",
      source: "local-ocr",
      box: { x: 880, y: 180, width: 40, height: 40 },
      rationale: "Tanque remoto",
    },
    // Instrumento 1: centro (110, 150) -> dist para eq-1 = 51px, dist para eq-2 = 121px -> conecta a eq-1
    {
      id: "ins-1",
      label: "PI 101",
      normalized: "PI-101",
      kind: "instrument",
      group: "Pressão",
      confidence: 0.88,
      status: "accepted",
      source: "local-ocr",
      box: { x: 95, y: 135, width: 30, height: 30 },
      rationale: "Manômetro na sucção",
    },
    // Instrumento 2 (distante): centro (500, 800) -> nenhum equipamento próximo (< 220px)
    {
      id: "ins-isolated",
      label: "TI 999",
      normalized: "TI-999",
      kind: "instrument",
      group: "Temperatura",
      confidence: 0.8,
      status: "accepted",
      source: "local-ocr",
      box: { x: 485, y: 785, width: 30, height: 30 },
      rationale: "Transmissor remoto",
    },
  ];

  const { edges } = generateTopologyFromDetections(mockDetections, 1000, 1000);

  // Arestas de processo esperadas:
  // eq-1 -> eq-2 (dist = 120 < 220)
  // eq-2 -> eq-3 (dist = 160 < 220)
  const edge12 = edges.find((e) => e.source === "eq-1" && e.target === "eq-2");
  assert.ok(edge12, "Deveria existir conexão de processo entre eq-1 e eq-2");
  assert.equal(edge12.kind, "process");

  const edge23 = edges.find((e) => e.source === "eq-2" && e.target === "eq-3");
  assert.ok(edge23, "Deveria existir conexão de processo entre eq-2 e eq-3");
  assert.equal(edge23.kind, "process");

  // eq-1 e eq-3 estão a 280px (> 220px), não devem ter aresta direta
  const edge13 = edges.find(
    (e) => (e.source === "eq-1" && e.target === "eq-3") || (e.source === "eq-3" && e.target === "eq-1"),
  );
  assert.equal(edge13, undefined, "eq-1 e eq-3 estão além de 220px e não devem se conectar diretamente");

  // eq-4 está isolado (> 220px de todos)
  const edgeTo4 = edges.find((e) => e.source === "eq-4" || e.target === "eq-4");
  assert.equal(edgeTo4, undefined, "eq-4 é remoto e não deve ter arestas de processo");

  // Instrumento 1 deve se conectar ao seu equipamento mais próximo (eq-1)
  const insEdge = edges.find((e) => e.source === "ins-1" && e.target === "eq-1");
  assert.ok(insEdge, "Instrumento ins-1 deve se conectar ao equipamento mais próximo eq-1");
  assert.equal(insEdge.kind, "signal");

  // Instrumento 1 NÃO deve ter aresta com eq-2
  const insEdgeTo2 = edges.find((e) => e.source === "ins-1" && e.target === "eq-2");
  assert.equal(insEdgeTo2, undefined, "Instrumento não deve se conectar a múltiplos equipamentos");

  // Instrumento isolado não deve ter arestas
  const isolatedEdge = edges.find((e) => e.source === "ins-isolated" || e.target === "ins-isolated");
  assert.equal(isolatedEdge, undefined, "Instrumento distante não deve gerar conexões");
});

test("adiciona rota dinâmica padrão via BFS conectando equipamentos de menor X para maior X", () => {
  const mockDetections: Detection[] = [
    // Entrada (Feed): menor X (100)
    {
      id: "eq-feed",
      label: "B-01",
      normalized: "B-01",
      kind: "equipment",
      group: "Tanque de Alimentação",
      confidence: 0.9,
      status: "accepted",
      source: "local-ocr",
      box: { x: 80, y: 180, width: 40, height: 40 }, // centro: 100, 200
      rationale: "Início do processo",
    },
    // Intermediário 1: X (240) -> dist = 140px
    {
      id: "eq-pump",
      label: "P-01",
      normalized: "P-01",
      kind: "equipment",
      group: "Bomba de Carga",
      confidence: 0.91,
      status: "accepted",
      source: "local-ocr",
      box: { x: 220, y: 180, width: 40, height: 40 }, // centro: 240, 200
      rationale: "Elevação de pressão",
    },
    // Intermediário 2: X (380) -> dist = 140px
    {
      id: "eq-column",
      label: "C-01",
      normalized: "C-01",
      kind: "equipment",
      group: "Coluna Fracionadora",
      confidence: 0.93,
      status: "accepted",
      source: "local-ocr",
      box: { x: 360, y: 180, width: 40, height: 40 }, // centro: 380, 200
      rationale: "Separação",
    },
    // Saída (Produto): maior X (520) -> dist = 140px
    {
      id: "eq-storage",
      label: "TK-02",
      normalized: "TK-02",
      kind: "equipment",
      group: "Armazenamento de Destilado",
      confidence: 0.89,
      status: "accepted",
      source: "local-ocr",
      box: { x: 500, y: 180, width: 40, height: 40 }, // centro: 520, 200
      rationale: "Produto final",
    },
  ];

  const { routes, edges } = generateTopologyFromDetections(mockDetections, 1000, 1000);

  assert.ok(routes.length >= 1, "Deveria conter ao menos uma rota de fluxo");
  const mainRoute = routes[0];

  assert.equal(mainRoute.id, "main-process-route");
  assert.deepEqual(mainRoute.nodeIds, ["eq-feed", "eq-pump", "eq-column", "eq-storage"]);
  assert.equal(mainRoute.edgeIds.length, mainRoute.nodeIds.length - 1);

  // Valida que cada aresta da rota de fato existe na lista de arestas geradas
  for (const edgeId of mainRoute.edgeIds) {
    const exists = edges.some((e) => e.id === edgeId);
    assert.ok(exists, `Aresta da rota ${edgeId} deve existir no grafo gerado`);
  }
});

test("calcula vizinhança de impacto dinâmica sobre grafo customizado ou ativo", () => {
  const dynamicEdges = [
    { id: "e1-e2", source: "node-a", target: "node-b", kind: "process" as const },
    { id: "e2-e3", source: "node-b", target: "node-c", kind: "process" as const },
    { id: "e3-e4", source: "node-c", target: "node-d", kind: "process" as const },
    { id: "sig-b", source: "sensor-x", target: "node-b", kind: "signal" as const },
  ];

  // 1. Passando arestas customizadas explicitamente
  const impactDirect = getImpactNeighborhood("node-b", dynamicEdges);
  assert.deepEqual(impactDirect.upstream, ["node-a"]);
  assert.deepEqual(impactDirect.downstream, ["node-c", "node-d"]);
  assert.equal(impactDirect.upstream.includes("sensor-x"), false);

  // 2. Passando objeto com propriedade edges
  const impactObj = getImpactNeighborhood("node-c", { edges: dynamicEdges });
  assert.deepEqual(impactObj.downstream, ["node-d"]);
  assert.ok(impactObj.upstream.includes("node-b"));
  assert.ok(impactObj.upstream.includes("node-a"));

  // 3. Modificando o grafo ativo globalmente
  const customGraph = {
    nodes: [
      { id: "node-a", label: "A", detail: "", kind: "equipment" as const, x: 10, y: 50 },
      { id: "node-b", label: "B", detail: "", kind: "equipment" as const, x: 40, y: 50 },
      { id: "node-c", label: "C", detail: "", kind: "equipment" as const, x: 70, y: 50 },
      { id: "node-d", label: "D", detail: "", kind: "equipment" as const, x: 90, y: 50 },
    ],
    edges: dynamicEdges,
    routes: [],
  };

  setActiveTopologyGraph(customGraph);
  const activeImpact = getImpactNeighborhood("node-b");
  assert.deepEqual(activeImpact.upstream, ["node-a"]);
  assert.deepEqual(activeImpact.downstream, ["node-c", "node-d"]);

  // 4. Restaurando o grafo ativo de referência
  resetActiveTopologyGraph();
  const restoredImpact = getImpactNeighborhood("p03");
  assert.deepEqual(restoredImpact.downstream, ["vp01", "b03", "storage"]);
});

test("calcula topologia para as detecções da amostra de referência e lida com casos vazios", () => {
  // Lista vazia
  const empty = generateTopologyFromDetections([], 1000, 1000);
  assert.deepEqual(empty.nodes, []);
  assert.deepEqual(empty.edges, []);
  assert.deepEqual(empty.routes, []);

  // Amostra de referência com 16.jpg retorna fallback curado
  const sampleFallback = getTopologyForSample("distillation-train", referenceDetections, 819, 701);
  assert.equal(sampleFallback.nodes, topologyNodes);
  assert.equal(sampleFallback.edges, topologyEdges);
  assert.equal(sampleFallback.routes, flowRoutes);

  // Amostra não-referência (e.g. 160.jpg, 151.jpg) gera topologia dinâmica
  const sampleDynamic = getTopologyForSample("reflux-pumps", referenceDetections, 819, 701);
  assert.ok(sampleDynamic.nodes.length > 0);
  assert.ok(sampleDynamic.edges.length > 0);
  assert.ok(sampleDynamic.routes.length > 0);
  assert.notEqual(sampleDynamic.nodes, topologyNodes);
});
