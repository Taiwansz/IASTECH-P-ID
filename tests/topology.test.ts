import assert from "node:assert/strict";
import test from "node:test";
import { flowRoutes, getImpactNeighborhood, topologyNodeByDetection } from "../app/lib/topology-data.ts";

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
