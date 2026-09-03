export type DetectionKind = "equipment" | "instrument" | "valve" | "tag";
export type DetectionStatus = "accepted" | "review" | "rejected";

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Detection {
  id: string;
  label: string;
  normalized: string;
  kind: DetectionKind;
  group: string;
  confidence: number;
  status: DetectionStatus;
  source: "curated-reference" | "local-ocr";
  box: Box;
  rationale: string;
}

export interface DiagramSample {
  id: string;
  title: string;
  fileName: string;
  image: string;
  width: number;
  height: number;
  profile: "clean" | "dense" | "low-resolution" | "reference";
  description: string;
  referenceReady: boolean;
}

export const samples: DiagramSample[] = [
  {
    id: "distillation-train",
    title: "Trem de destilação B-01",
    fileName: "16.jpg",
    image: "/samples/distillation-train.jpg",
    width: 819,
    height: 701,
    profile: "clean",
    description: "Amostra principal com TAGs, instrumentos, bombas, vasos e válvulas.",
    referenceReady: true,
  },
  {
    id: "reflux-pumps",
    title: "Bombas de refluxo TCS",
    fileName: "160.jpg",
    image: "/samples/reflux-pumps.jpg",
    width: 2556,
    height: 1413,
    profile: "dense",
    description: "Diagrama denso com redundância, instrumentação e linhas sobrepostas.",
    referenceReady: false,
  },
  {
    id: "fractionation-loop",
    title: "Loop de fracionamento T-10013",
    fileName: "151.jpg",
    image: "/samples/fractionation-loop.jpg",
    width: 2935,
    height: 1855,
    profile: "dense",
    description: "Documento colorido de grande formato para estresse do OCR local.",
    referenceReady: false,
  },
  {
    id: "pressure-vessel",
    title: "Vaso de pressão existente",
    fileName: "118.jpg",
    image: "/samples/pressure-vessel.jpg",
    width: 1206,
    height: 1381,
    profile: "low-resolution",
    description: "Caso com baixo contraste e poucos instrumentos legíveis.",
    referenceReady: false,
  },
  {
    id: "instrument-reference",
    title: "Referência de instrumentos",
    fileName: "127.jpg",
    image: "/samples/instrument-reference.jpg",
    width: 1294,
    height: 568,
    profile: "reference",
    description: "Prancha de símbolos para apoiar a futura rotulagem do dataset.",
    referenceReady: false,
  },
  {
    id: "pump-reference",
    title: "Referência de bombas",
    fileName: "135.jpg",
    image: "/samples/pump-reference.jpg",
    width: 651,
    height: 729,
    profile: "reference",
    description: "Catálogo visual de bombas centrífugas e configurações verticais.",
    referenceReady: false,
  },
];

const item = (
  id: string,
  label: string,
  kind: DetectionKind,
  group: string,
  confidence: number,
  box: Box,
  rationale: string,
): Detection => ({
  id,
  label,
  normalized: label.toUpperCase(),
  kind,
  group,
  confidence,
  status: confidence >= 0.78 ? "accepted" : "review",
  source: "curated-reference",
  box,
  rationale,
});

export const referenceDetections: Detection[] = [
  item("ins-dpic", "dPIC", "instrument", "Controle de pressão diferencial", 0.71, { x: 40, y: 35, width: 60, height: 30 }, "Bolha de instrumento com prefixo dPIC. O sufixo não está legível."),
  item("ins-pic01", "PIC 01", "instrument", "Controle de pressão", 0.94, { x: 230, y: 14, width: 65, height: 40 }, "Prefixo PIC e bolha de controle conectada ao topo da coluna."),
  item("ins-fi201", "FI 2.01", "instrument", "Indicação de vazão", 0.91, { x: 338, y: 34, width: 62, height: 39 }, "Prefixo FI reconhecido em uma bolha de instrumento."),
  item("ins-ti03", "TI 03", "instrument", "Indicação de temperatura", 0.89, { x: 89, y: 153, width: 62, height: 30 }, "Prefixo TI associado à linha de processo."),
  item("ins-ti201", "TI2 01", "instrument", "Indicação de temperatura", 0.79, { x: 499, y: 258, width: 62, height: 31 }, "Texto parcialmente comprimido. Normalização preserva a leitura original."),
  item("ins-pi203", "PI 2.03", "instrument", "Indicação de pressão", 0.86, { x: 541, y: 331, width: 65, height: 34 }, "Prefixo PI em bolha ligada ao conjunto VP-01."),
  item("ins-ls01", "LS 01", "instrument", "Chave de nível", 0.83, { x: 344, y: 311, width: 62, height: 31 }, "Prefixo LS localizado acima do vaso B-02."),
  item("ins-fqr04", "FQR 04", "instrument", "Registro de vazão", 0.76, { x: 205, y: 467, width: 72, height: 31 }, "Prefixo FQR legível, mas o caractere central pode sofrer confusão do OCR."),

  item("eq-w01", "W-01", "equipment", "Trocador de calor", 0.93, { x: 90, y: 190, width: 65, height: 90 }, "TAG adjacente a um trocador vertical."),
  item("eq-w02", "W-02", "equipment", "Coluna de processo", 0.96, { x: 178, y: 63, width: 136, height: 276 }, "TAG sobre a coluna principal com internos visíveis."),
  item("eq-w03", "W-03", "equipment", "Trocador de calor", 0.88, { x: 343, y: 213, width: 78, height: 76 }, "TAG próximo ao equipamento retangular na descarga intermediária."),
  item("eq-w04", "W-04", "equipment", "Trocador de calor", 0.92, { x: 575, y: 199, width: 118, height: 68 }, "TAG ligado ao trocador horizontal no lado direito."),
  item("eq-b01", "B-01", "equipment", "Vaso de fundo", 0.95, { x: 118, y: 256, width: 207, height: 104 }, "Vaso horizontal na base da coluna principal."),
  item("eq-b02", "B-02", "equipment", "Vaso separador", 0.89, { x: 425, y: 306, width: 58, height: 83 }, "Vaso vertical associado ao controle de nível LS 01."),
  item("eq-b03", "B-03", "equipment", "Vaso separador", 0.84, { x: 614, y: 410, width: 74, height: 96 }, "Vaso vertical abaixo do conjunto VP-01."),
  item("eq-b04", "B-04", "equipment", "Tanque de produto", 0.85, { x: 503, y: 650, width: 61, height: 48 }, "Primeiro tanque do banco de produtos."),
  item("eq-b05", "B-05", "equipment", "Tanque de produto", 0.82, { x: 573, y: 650, width: 61, height: 48 }, "Segundo tanque do banco de produtos."),
  item("eq-b06", "B-06", "equipment", "Tanque de produto", 0.81, { x: 640, y: 650, width: 61, height: 48 }, "Terceiro tanque do banco de produtos."),
  item("eq-b07", "B-07", "equipment", "Tanque de produto", 0.79, { x: 704, y: 650, width: 61, height: 48 }, "Quarto tanque do banco de produtos."),
  item("eq-b08", "B-08", "equipment", "Tanque de produto", 0.74, { x: 765, y: 650, width: 52, height: 48 }, "TAG está próximo da borda e requer confirmação humana."),
  item("eq-k01", "K-01", "equipment", "Vaso auxiliar", 0.87, { x: 263, y: 218, width: 61, height: 77 }, "Equipamento vertical conectado à saída lateral da coluna."),
  item("eq-p01", "P-01", "equipment", "Bomba", 0.88, { x: 156, y: 402, width: 75, height: 54 }, "Símbolo circular de bomba abaixo de B-01."),
  item("eq-p02", "P-02", "equipment", "Bomba", 0.86, { x: 309, y: 370, width: 75, height: 58 }, "Bomba na linha de destilado."),
  item("eq-p03", "P-03", "equipment", "Bomba", 0.84, { x: 422, y: 352, width: 75, height: 58 }, "Bomba posicionada abaixo de B-02."),
  item("eq-vp01", "VP-01", "equipment", "Bomba acionada", 0.81, { x: 600, y: 346, width: 83, height: 65 }, "Conjunto de bomba e acionamento na linha de água residual."),
  item("eq-mj1", "MJ-1", "equipment", "Misturador", 0.86, { x: 39, y: 545, width: 72, height: 106 }, "Primeiro misturador do conjunto inferior."),
  item("eq-mj2", "MJ-2", "equipment", "Misturador", 0.84, { x: 106, y: 545, width: 72, height: 106 }, "Segundo misturador do conjunto inferior."),
  item("eq-mj3", "MJ-3", "equipment", "Misturador", 0.83, { x: 172, y: 545, width: 72, height: 106 }, "Terceiro misturador do conjunto inferior."),

  item("val-va09", "VA-09", "valve", "Válvula de processo", 0.88, { x: 605, y: 184, width: 74, height: 42 }, "TAG adjacente à válvula na linha de vapor."),
  item("val-va25", "VA-25", "valve", "Válvula de processo", 0.82, { x: 43, y: 250, width: 72, height: 47 }, "TAG de válvula na entrada lateral esquerda."),
  item("val-va13", "VA-13", "valve", "Válvula de processo", 0.77, { x: 331, y: 422, width: 73, height: 49 }, "O texto toca a linha de processo e requer revisão."),
];

export const atlasAgents = [
  { id: "orchestrator", name: "Atlas Orchestrator", authority: "L4", role: "Coordena o Blueprint e a sequência local", state: "ready" },
  { id: "vision", name: "Vision Analyst", authority: "L2", role: "Executa OCR e localiza evidências", state: "ready" },
  { id: "reviewer", name: "Classification Reviewer", authority: "L1", role: "Sugere classe, grupo e justificativa", state: "ready" },
  { id: "topology", name: "Topology Analyst", authority: "L1", role: "Expõe rotas e relações curadas", state: "ready" },
  { id: "redteam", name: "Red Team Validator", authority: "L1", role: "Expõe incertezas e falhas de evidência", state: "attention" },
];

export const initialAudit = [
  { id: "audit-1", time: "SEED 01", agent: "Atlas Orchestrator", action: "Blueprint THL-PID-BP-001 validado", status: "passed" },
  { id: "audit-2", time: "SEED 02", agent: "Constitution Engine", action: "Política local-only aplicada", status: "passed" },
  { id: "audit-3", time: "SEED 03", agent: "Vision Analyst", action: "Amostra de referência carregada", status: "passed" },
  { id: "audit-4", time: "SEED 04", agent: "Topology Analyst", action: "Topologia demonstrativa da referência carregada", status: "passed" },
  { id: "audit-5", time: "SEED 05", agent: "Red Team Validator", action: "3 ocorrências encaminhadas para revisão", status: "attention" },
];

export const plannedConfusionMatrix = {
  labels: ["TAG", "Equipamento", "Instrumento"],
  values: [
    [12, 1, 1],
    [1, 10, 0],
    [1, 0, 6],
  ],
  note: "Calibração demonstrativa em 32 ocorrências selecionadas. A validação oficial depende de rotulagem por especialista.",
};
