import assert from "node:assert/strict";
import test from "node:test";
import { detectionsFromTsv } from "../app/lib/local-ocr.ts";

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
