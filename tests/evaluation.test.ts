import assert from "node:assert/strict";
import test from "node:test";
import { referenceDetections, type Detection } from "../app/lib/demo-data.ts";
import {
  calculateConfusionMatrix,
  calculateDrawingQualityScore,
  calculateProcessVariableBreakdown,
  calculateSafetyCriticalMetrics,
  calculateSessionMetrics,
  calculateTopologyDensity,
  calculateTopologyHubs,
  exportToCsv,
  exportToDxf,
  exportToGraphML,
  exportToJson,
  exportToMarkdownReport,
  exportToSvg,
} from "../app/lib/evaluation.ts";
import { topologyEdges, topologyNodes } from "../app/lib/topology-data.ts";

test("calcula matriz de confusão dinâmica baseada nas detecções e status humano", () => {
  const sampleDetections: Detection[] = [
    {
      id: "1",
      label: "PIC-01",
      normalized: "PIC-01",
      kind: "instrument",
      group: "Controle de Pressão",
      confidence: 0.95,
      status: "accepted",
      source: "curated-reference",
      box: { x: 10, y: 10, width: 40, height: 30 },
      rationale: "Instrumento",
    },
    {
      id: "2",
      label: "P-01",
      normalized: "P-01",
      kind: "equipment",
      group: "Bomba",
      confidence: 0.92,
      status: "accepted",
      source: "curated-reference",
      box: { x: 100, y: 100, width: 60, height: 50 },
      rationale: "Equipamento",
    },
    {
      id: "3",
      label: "VA-25",
      normalized: "VA-25",
      kind: "valve",
      group: "Válvula",
      confidence: 0.85,
      status: "accepted",
      source: "curated-reference",
      box: { x: 200, y: 100, width: 40, height: 30 },
      rationale: "Válvula",
    },
    {
      id: "4",
      label: "TI-03",
      normalized: "TI-03",
      kind: "tag", // Predito como TAG, mas rejeitado pelo operador humano
      group: "TAG Genérico",
      confidence: 0.65,
      status: "rejected",
      source: "local-ocr",
      box: { x: 50, y: 50, width: 40, height: 30 },
      rationale: "Ruído OCR",
    },
  ];

  const matrix = calculateConfusionMatrix(sampleDetections);

  assert.equal(matrix.labels.length, 4);
  assert.equal(matrix.values.length, 4);
  assert.equal(matrix.support, 4);
  assert.ok(matrix.accuracy > 0);
  assert.ok(matrix.macroF1 > 0);
  assert.match(matrix.note, /Matriz calculada dinamicamente/);

  // Testa caso vazio
  const emptyMatrix = calculateConfusionMatrix([]);
  assert.equal(emptyMatrix.support, 0);
  assert.equal(emptyMatrix.accuracy, 100);
});

test("calcula métricas de densidade topológica", () => {
  const density = calculateTopologyDensity(topologyNodes, topologyEdges);

  assert.equal(density.totalNodes, topologyNodes.length);
  assert.equal(density.totalEdges, topologyEdges.length);
  assert.ok(density.density > 0 && density.density < 1);
  assert.match(density.densityFormatted, /%/);
  assert.ok(density.connectedNodesCount > 0);
  assert.equal(density.connectedRate, 100); // Na referência 16.jpg todos estão conectados
  assert.equal(density.isolatedNodesCount, 0);
});

test("calcula métricas agregadas da sessão com conformidade ISA-5.1", () => {
  const metrics = calculateSessionMetrics(referenceDetections, {
    nodes: topologyNodes,
    edges: topologyEdges,
    routes: [],
  });

  assert.equal(metrics.totalDetections, referenceDetections.length);
  assert.ok(metrics.acceptedCount > 0);
  assert.ok(metrics.averageConfidence > 70);
  assert.ok(metrics.isaComplianceRate >= 80);
  assert.ok(metrics.controlLoopsCount >= 1);
  assert.ok(metrics.topologyDensity.totalNodes > 0);
});

test("exportToJson produz JSON completo de engenharia e estruturado", () => {
  const jsonStr = exportToJson({
    diagram: {
      id: "distillation-train",
      title: "Trem de destilação B-01",
      fileName: "16.jpg",
      width: 819,
      height: 701,
      profile: "clean",
    },
    detections: referenceDetections,
    topology: {
      nodes: topologyNodes,
      edges: topologyEdges,
      routes: [],
    },
    audit: [
      {
        id: "1",
        time: "10:00:00",
        agent: "Vision Analyst",
        action: "OCR executado",
        status: "passed",
      },
    ],
  });

  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.metadata.blueprint, "THL-PID-BP-001");
  assert.equal(parsed.metadata.localExecutionOnly, true);
  assert.equal(parsed.diagram.fileName, "16.jpg");
  assert.equal(parsed.detections.length, referenceDetections.length);
  assert.equal(parsed.topology.nodesCount, topologyNodes.length);
  assert.ok(parsed.evaluation.sessionMetrics.isaComplianceRatePercent > 0);
  assert.ok(parsed.isaControlLoops.length >= 1);
});

test("exportToGraphML gera XML GraphML válido para Cytoscape e Gephi", () => {
  const xml = exportToGraphML(
    {
      nodes: topologyNodes,
      edges: topologyEdges,
      routes: [],
    },
    "Trem de Destilacao",
  );

  assert.match(xml, /<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<graphml xmlns="http:\/\/graphml\.graphdrawing\.org\/xmlns"/);
  assert.match(xml, /<graph id="Trem de Destilacao" edgedefault="directed">/);
  assert.match(xml, /<node id="p03">/);
  assert.match(xml, /<edge id="feed-va25" source="feed" target="va25">/);
});

test("exportToCsv gera Instrument & Equipment Index formatado com UTF-8 BOM", () => {
  const csv = exportToCsv(referenceDetections, {
    nodes: topologyNodes,
    edges: topologyEdges,
    routes: [],
  });

  assert.ok(csv.startsWith("\uFEFF")); // UTF-8 BOM
  assert.match(csv, /"TAG","Tipo","Classe ISA-5.1","Descrição \/ Grupo"/);
  assert.match(csv, /"PIC 01","Instrumento"/);
  assert.match(csv, /"P-03","Equipamento"/);
});

test("calcula espectro de variáveis de processo conforme primeira letra ISA-5.1", () => {
  const breakdown = calculateProcessVariableBreakdown(referenceDetections);
  assert.ok(breakdown.length >= 2);
  const press = breakdown.find((b) => b.code === "P");
  assert.ok(press);
  assert.match(press.name, /Pressão/);
  assert.ok(press.count >= 1);
  assert.ok(press.percentage > 0);
});

test("calcula métricas de segurança de processo (PSM) e elementos críticos (SCE)", () => {
  const safety = calculateSafetyCriticalMetrics(referenceDetections);
  assert.ok(typeof safety.sceCount === "number");
  assert.ok(safety.safeguardCoveragePercent > 0);
  assert.ok(Array.isArray(safety.items));
});

test("identifica nós hub e centralidade topológica", () => {
  const hubs = calculateTopologyHubs({
    nodes: topologyNodes,
    edges: topologyEdges,
    routes: [],
  });

  assert.ok(hubs.length > 0);
  assert.ok(hubs[0].degree >= hubs[hubs.length - 1].degree);
  assert.ok(hubs[0].label.length > 0);
});

test("calcula Drawing Quality Score (DQS) e horas economizadas", () => {
  const dqs = calculateDrawingQualityScore(referenceDetections, {
    nodes: topologyNodes,
    edges: topologyEdges,
    routes: [],
  });

  assert.ok(dqs.score >= 0 && dqs.score <= 100);
  assert.match(dqs.maturityLevel, /Nível/);
  assert.ok(dqs.hoursSaved > 0);
});

test("exportToSvg gera desenho vetorial SVG com camadas industriais", () => {
  const svg = exportToSvg(
    { width: 819, height: 701, title: "Trem de Destilação", image: "/samples/distillation-train.jpg" },
    referenceDetections,
    { nodes: topologyNodes, edges: topologyEdges, routes: [] },
  );

  assert.match(svg, /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, /<g id="topology-edges">/);
  assert.match(svg, /<g id="detections">/);
  assert.match(svg, /<g id="title-block"/);
  assert.match(svg, /PIC 01/);
});

test("exportToMarkdownReport gera relatório executivo técnico completo", () => {
  const report = exportToMarkdownReport({
    diagram: {
      id: "distillation-train",
      title: "Trem de destilação B-01",
      fileName: "16.jpg",
      width: 819,
      height: 701,
    },
    detections: referenceDetections,
    topology: { nodes: topologyNodes, edges: topologyEdges, routes: [] },
    audit: [
      { id: "1", time: "10:00", agent: "Red Team", action: "Auditoria OK", status: "passed" },
    ],
  });

  assert.match(report, /# Relatório Técnico de Inspeção e Extração/);
  assert.match(report, /Drawing Quality Score \(DQS\)/);
  assert.match(report, /Elementos Críticos de Segurança \(SCE\)/);
  assert.match(report, /Espectro de Instrumentação por Variável/);
  assert.match(report, /Malhas de Controle Identificadas/);
  assert.match(report, /Inventário de Equipamentos e Instrumentos/);
});

test("exportToDxf gera arquivo CAD industrial compatível com AutoCAD R2000", () => {
  const dxf = exportToDxf(
    referenceDetections,
    { nodes: topologyNodes, edges: topologyEdges, routes: [] },
    { width: 819, height: 701, title: "Trem de Destilação" },
  );

  assert.match(dxf, /SECTION\r?\n2\r?\nHEADER/);
  assert.match(dxf, /AC1015/); // AutoCAD 2000 format
  assert.match(dxf, /PID_EQUIPMENT/);
  assert.match(dxf, /PID_VALVES/);
  assert.match(dxf, /PID_INSTRUMENTS/);
  assert.match(dxf, /LWPOLYLINE/);
  assert.match(dxf, /TEXT/);
  assert.match(dxf, /EOF/);
});

