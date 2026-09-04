import assert from "node:assert/strict";
import test from "node:test";
import type { SymbolDetectionResult } from "../app/lib/computer-vision.ts";
import { associateSymbolsWithOcr, detectionsFromTsv } from "../app/lib/local-ocr.ts";

const header = "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext";

test("normaliza TAGs industriais e preserva o gate humano", () => {
  const tsv = [
    header,
    "5\t1\t1\t1\t1\t1\t20\t20\t48\t18\t93\tP01",
    "5\t1\t1\t1\t2\t1\t80\t20\t44\t18\t89\tPIC",
    "5\t1\t1\t1\t2\t2\t128\t20\t22\t18\t89\t01",
    "5\t1\t1\t1\t3\t1\t160\t20\t48\t18\t67\tVA13",
    "5\t1\t1\t1\t4\t1\t220\t20\t48\t18\t82\tBO2",
  ].join("\n");

  const detections = detectionsFromTsv(tsv);
  const byLabel = new Map(detections.map((item) => [item.label, item]));

  assert.equal(byLabel.get("P-01")?.kind, "equipment");
  assert.equal(byLabel.get("PIC-01")?.kind, "instrument");
  assert.equal(byLabel.get("VA-13")?.kind, "valve");
  assert.equal(byLabel.get("VA-13")?.status, "review");
  assert.equal(byLabel.get("B-02")?.kind, "equipment");
  assert.match(byLabel.get("B-02")?.rationale ?? "", /Normalizada de BO2 para B-02/);
});

test("unifica bounding boxes em TAGs compostas de múltiplas palavras na mesma linha", () => {
  const tsv = [
    header,
    "5\t1\t1\t1\t2\t1\t80\t20\t44\t18\t89\tPIC",
    "5\t1\t1\t1\t2\t2\t128\t20\t22\t18\t89\t01",
  ].join("\n");

  const detections = detectionsFromTsv(tsv);
  assert.equal(detections.length, 1);

  const pic01 = detections[0];
  assert.equal(pic01.label, "PIC-01");
  // left = min(80, 128) = 80
  // top = min(20, 20) = 20
  // width = max(80 + 44, 128 + 22) - 80 = 150 - 80 = 70
  // height = max(20 + 18, 20 + 18) - 20 = 18
  assert.deepEqual(pic01.box, { x: 80, y: 20, width: 70, height: 18 });
});

test("enriquece classificação e rationale com a norma ISA-5.1", () => {
  const tsv = [
    header,
    "5\t1\t1\t1\t1\t1\t80\t20\t44\t18\t95\tPIC",
    "5\t1\t1\t1\t1\t2\t128\t20\t22\t18\t95\t01",
    "5\t1\t1\t1\t2\t1\t160\t20\t48\t18\t90\tVA13",
    "5\t1\t1\t1\t3\t1\t20\t20\t48\t18\t92\tP01",
  ].join("\n");

  const detections = detectionsFromTsv(tsv);
  const byLabel = new Map(detections.map((item) => [item.label, item]));

  const pic = byLabel.get("PIC-01");
  assert.ok(pic);
  assert.equal(pic.kind, "instrument");
  assert.equal(pic.group, "Instrumentação e Controle (ISA-5.1)");
  assert.match(pic.rationale, /ISA-5\.1/);
  assert.match(pic.rationale, /Pressão/);
  assert.match(pic.rationale, /Indicador/);
  assert.match(pic.rationale, /Controlador/);
  assert.match(pic.rationale, /Laço 01/);

  const va = byLabel.get("VA-13");
  assert.ok(va);
  assert.equal(va.kind, "valve");
  assert.equal(va.group, "Válvulas e Elementos Finais");
  assert.match(va.rationale, /Válvula de processo manual\/bloqueio/);

  const p01 = byLabel.get("P-01");
  assert.ok(p01);
  assert.equal(p01.kind, "equipment");
  assert.equal(p01.group, "Equipamentos de Processo");
  assert.match(p01.rationale, /Bomba centrífuga/);
});

test("associa detecções geométricas de símbolos industriais com o OCR", () => {
  const tsv = [
    header,
    "5\t1\t1\t1\t1\t1\t80\t20\t44\t18\t80\tPIC",
    "5\t1\t1\t1\t1\t2\t128\t20\t22\t18\t80\t01",
    "5\t1\t1\t1\t2\t1\t160\t50\t48\t18\t65\tVA13",
  ].join("\n");

  const symbols: SymbolDetectionResult[] = [
    {
      id: "sym-circle-101",
      kind: "instrument",
      group: "Instrumentação e Controle",
      shape: "circle",
      box: { x: 70, y: 10, width: 85, height: 40 },
      confidence: 0.94,
      center: { x: 112.5, y: 30 },
    },
    {
      id: "sym-valve-202",
      kind: "valve",
      group: "Válvula de Processo",
      shape: "valve-pair",
      box: { x: 155, y: 45, width: 55, height: 28 },
      confidence: 0.91,
      center: { x: 182.5, y: 59 },
    },
  ];

  const detections = detectionsFromTsv(tsv, symbols);
  const byLabel = new Map(detections.map((item) => [item.label, item]));

  const pic = byLabel.get("PIC-01");
  assert.ok(pic);
  assert.equal(pic.symbolId, "sym-circle-101");
  assert.match(pic.rationale, /Confirmado por símbolo geométrico circle/);
  assert.ok(pic.confidence >= 0.85);

  const va = byLabel.get("VA-13");
  assert.ok(va);
  assert.equal(va.symbolId, "sym-valve-202");
  assert.match(va.rationale, /Confirmado por símbolo geométrico valve-pair/);
  assert.equal(va.status, "accepted"); // Confiança promovida pelo reforço geométrico

  // Valida chamada direta a associateSymbolsWithOcr
  const rawDetections = detectionsFromTsv(tsv);
  const associated = associateSymbolsWithOcr(rawDetections, symbols);
  assert.equal(associated.find((d) => d.label === "PIC-01")?.symbolId, "sym-circle-101");
});

test("reconhece e normaliza TAGs industriais com prefixo de área e códigos de processo", () => {
  const tsv = [
    header,
    "5\t1\t1\t1\t1\t1\t80\t20\t88\t18\t95\t20-P-0201A",
    "5\t1\t1\t1\t2\t1\t200\t20\t44\t18\t92\t20-PI",
    "5\t1\t1\t1\t2\t2\t248\t20\t32\t18\t92\t0201",
    "5\t1\t1\t1\t3\t1\t320\t20\t72\t18\t88\t20-FV-0201",
    "5\t1\t1\t1\t4\t1\t420\t20\t96\t18\t90\t200-P01-20020408",
  ].join("\n");

  const detections = detectionsFromTsv(tsv);
  const byLabel = new Map(detections.map((item) => [item.label, item]));

  const pump = byLabel.get("20-P-0201A");
  assert.ok(pump);
  assert.equal(pump.kind, "equipment");
  assert.match(pump.rationale, /Bomba/);
  assert.match(pump.rationale, /Área 20/);

  const pi = byLabel.get("20-PI-0201");
  assert.ok(pi);
  assert.equal(pi.kind, "instrument");
  assert.match(pi.rationale, /Pressão/);

  const fv = byLabel.get("20-FV-0201");
  assert.ok(fv);
  assert.equal(fv.kind, "valve");
  assert.match(fv.rationale, /vazão/);

  const line = byLabel.get("200-P01-20020408");
  assert.ok(line);
  assert.ok(line.kind === "tag" || line.kind === "equipment");
});

test("preserva e classifica via ML símbolos visuais não associados a palavras de texto OCR", () => {
  const tsv = [
    header,
    "5\t1\t1\t1\t1\t1\t80\t20\t44\t18\t90\tPIC",
    "5\t1\t1\t1\t1\t2\t128\t20\t22\t18\t90\t01",
  ].join("\n");

  const symbols: SymbolDetectionResult[] = [
    {
      id: "sym-circle-101",
      kind: "instrument",
      group: "Instrumentação e Controle",
      shape: "circle",
      box: { x: 70, y: 10, width: 85, height: 40 },
      confidence: 0.94,
      center: { x: 112.5, y: 30 },
    },
    {
      id: "sym-unattached-valve",
      kind: "valve",
      group: "Válvula de Processo",
      shape: "valve-pair",
      box: { x: 500, y: 350, width: 35, height: 20 },
      confidence: 0.88,
      center: { x: 517.5, y: 360 },
    },
    {
      id: "sym-unattached-vessel",
      kind: "equipment",
      group: "Equipamentos de Processo",
      shape: "vessel-rect",
      box: { x: 800, y: 475, width: 42, height: 82 },
      confidence: 0.92,
      center: { x: 821, y: 516 },
    },
  ];

  const detections = detectionsFromTsv(tsv, symbols);
  assert.equal(detections.length, 3);

  const pic = detections.find((d) => d.label === "PIC-01");
  assert.ok(pic);
  assert.equal(pic.symbolId, "sym-circle-101");

  const unattachedValve = detections.find((d) => d.symbolId === "sym-unattached-valve");
  assert.ok(unattachedValve);
  assert.equal(unattachedValve.kind, "valve");
  assert.equal(unattachedValve.status, "review");
  assert.match(unattachedValve.rationale, /Símbolo visual valve-pair extraído diretamente do diagrama/);

  const unattachedVessel = detections.find((d) => d.symbolId === "sym-unattached-vessel");
  assert.ok(unattachedVessel);
  assert.equal(unattachedVessel.kind, "equipment");
  assert.equal(unattachedVessel.status, "review");
  assert.match(unattachedVessel.rationale, /Símbolo visual vessel-rect extraído diretamente do diagrama/);
});



