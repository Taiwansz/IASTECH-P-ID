import assert from "node:assert/strict";
import test from "node:test";
import { detectControlLoops, parseIsaTag } from "../app/lib/isa51-rules.ts";

test("identifica instrumentos de pressão conforme norma ISA-5.1", () => {
  const result = parseIsaTag("PIC01");
  assert.equal(result.isValid, true);
  assert.equal(result.kind, "instrument");
  assert.equal(result.tag, "PIC-01");
  assert.match(result.variable ?? "", /Pressão/);
  assert.match(result.functionName ?? "", /Indicador/);
  assert.match(result.functionName ?? "", /Controlador/);
  assert.equal(result.loopNumber, "01");
});

test("identifica instrumentos de temperatura com modificadores", () => {
  const result = parseIsaTag("TI-03");
  assert.equal(result.kind, "instrument");
  assert.match(result.variable ?? "", /Temperatura/);
  assert.match(result.functionName ?? "", /Indicador/);
});

test("identifica válvulas industriais por código de serviço", () => {
  const result = parseIsaTag("VA-25");
  assert.equal(result.kind, "valve");
  assert.match(result.rationale, /bloqueio/);

  const fv = parseIsaTag("FV101");
  assert.equal(fv.kind, "valve");
  assert.match(fv.rationale, /controle de vazão/);
});

test("identifica equipamentos de processo de destilação", () => {
  const b01 = parseIsaTag("B-01");
  assert.equal(b01.kind, "equipment");
  assert.match(b01.group, /Equipamentos de Processo/);

  const p03 = parseIsaTag("P-03");
  assert.equal(p03.kind, "equipment");
  assert.match(p03.rationale, /Bomba/);
});

test("detecta malhas de controle fechadas completas", () => {
  const detections = [
    { id: "1", label: "PIC-01", kind: "instrument" },
    { id: "2", label: "PV-01", kind: "valve" },
    { id: "3", label: "TI-03", kind: "instrument" },
  ];

  const loops = detectControlLoops(detections);
  const pLoop = loops.find((l) => l.loopId === "P-01");
  assert.ok(pLoop);
  assert.equal(pLoop.isComplete, true);
  assert.equal(pLoop.controller, "PIC-01");
  assert.equal(pLoop.valve, "PV-01");

  const tLoop = loops.find((l) => l.loopId === "T-03");
  assert.ok(tLoop);
  assert.equal(tLoop.isComplete, false); // Falta válvula de controle de temperatura
});
