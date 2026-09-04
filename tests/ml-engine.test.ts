import assert from "node:assert/strict";
import test from "node:test";
import { PidMLEngine } from "../app/lib/ml-pid-engine.ts";

test("extrai vetor de características invariantes de símbolos e TAGs", () => {
  const engine = new PidMLEngine();
  const box = { x: 100, y: 200, width: 48, height: 48 };
  const features = engine.extractFeatures(box, "PIC-01", 2000, 1000, "circle");

  assert.equal(features.aspectRatio, 1);
  assert.equal(features.circularity, 1);
  assert.equal(features.hasIsaPrefix, 1);
  assert.equal(features.shapeFeature, 1);
  assert.equal(features.isLineTag, 0);
});

test("modelo prediz classe correta para instrumentos, válvulas e equipamentos", () => {
  const engine = new PidMLEngine();

  // Instrumento (balão circular ISA-5.1)
  const instFeat = engine.extractFeatures({ x: 100, y: 100, width: 45, height: 45 }, "TI-101", 2000, 1000, "circle");
  const instPred = engine.predict(instFeat, "TI-101");
  assert.equal(instPred.kind, "instrument");
  assert.ok(instPred.confidence >= 0.75);

  // Válvula de controle
  const valveFeat = engine.extractFeatures({ x: 200, y: 200, width: 60, height: 45 }, "FV-201", 2000, 1000, "valve-pair");
  const valvePred = engine.predict(valveFeat, "FV-201");
  assert.equal(valvePred.kind, "valve");
  assert.ok(valvePred.confidence >= 0.75);

  // Equipamento (bomba)
  const equipFeat = engine.extractFeatures({ x: 500, y: 500, width: 120, height: 180 }, "P-0201A", 2000, 1000, "vessel-rect");
  const equipPred = engine.predict(equipFeat, "P-0201A");
  assert.equal(equipPred.kind, "equipment");
  assert.ok(equipPred.confidence >= 0.75);

  // Linha de processo
  const lineFeat = engine.extractFeatures({ x: 300, y: 300, width: 160, height: 24 }, "250-P01-20020404-B01C-HC", 2000, 1000, "none");
  const linePred = engine.predict(lineFeat, "250-P01-20020404-B01C-HC");
  assert.equal(linePred.kind, "tag");
});

test("aprendizado ativo adapta o modelo com base no feedback do usuário", () => {
  const engine = new PidMLEngine();
  engine.clearLearnedPatterns();

  // Caso ambíguo customizado
  const customTag = "SPECIAL-DEVICE-99";
  const feat = engine.extractFeatures({ x: 50, y: 50, width: 50, height: 50 }, customTag, 2000, 1000, "none");

  // Usuário treina o modelo indicando que este dispositivo é uma válvula
  engine.trainSample(customTag, { x: 50, y: 50, width: 50, height: 50 }, 2000, 1000, "valve");
  assert.equal(engine.getLearnedPatternsCount(), 1);

  // Próxima predição para símbolo similar deve refletir o aprendizado ativo
  const predAfter = engine.predict(feat, customTag);
  assert.equal(predAfter.kind, "valve");
  assert.ok(predAfter.isLearned);
  assert.match(predAfter.rationale, /modelo ML treinado localmente/);
});
