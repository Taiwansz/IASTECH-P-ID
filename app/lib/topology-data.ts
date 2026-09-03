export type TopologyNodeKind = "source" | "equipment" | "instrument" | "valve" | "destination";
export type TopologyEdgeKind = "process" | "signal";

export interface TopologyNode {
  id: string;
  label: string;
  detail: string;
  kind: TopologyNodeKind;
  x: number;
  y: number;
  detectionId?: string;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  kind: TopologyEdgeKind;
  label?: string;
}

export interface FlowRoute {
  id: string;
  name: string;
  purpose: string;
  nodeIds: string[];
  edgeIds: string[];
}

export interface ControlContext {
  id: string;
  name: string;
  type: "control" | "monitoring";
  summary: string;
  warning: string;
  steps: Array<{ nodeId: string; role: string; detail: string }>;
}

export const topologyNodes: TopologyNode[] = [
  { id: "feed", label: "FEED", detail: "Limite de alimentação", kind: "source", x: 5, y: 46 },
  { id: "va25", label: "VA-25", detail: "Válvula de entrada", kind: "valve", x: 14, y: 46, detectionId: "val-va25" },
  { id: "w01", label: "W-01", detail: "Trocador vertical", kind: "equipment", x: 24, y: 46, detectionId: "eq-w01" },
  { id: "ti03", label: "TI 03", detail: "Indicação de temperatura", kind: "instrument", x: 24, y: 21, detectionId: "ins-ti03" },
  { id: "w02", label: "W-02", detail: "Coluna de processo", kind: "equipment", x: 38, y: 36, detectionId: "eq-w02" },
  { id: "pic01", label: "PIC 01", detail: "Medição e controle de pressão", kind: "instrument", x: 38, y: 10, detectionId: "ins-pic01" },
  { id: "b01", label: "B-01", detail: "Vaso de fundo", kind: "equipment", x: 38, y: 67, detectionId: "eq-b01" },
  { id: "p01", label: "P-01", detail: "Bomba de transferência", kind: "equipment", x: 38, y: 87, detectionId: "eq-p01" },
  { id: "bottoms", label: "PRODUTO", detail: "Limite do produto de fundo", kind: "destination", x: 55, y: 87 },
  { id: "w03", label: "W-03", detail: "Trocador intermediário", kind: "equipment", x: 54, y: 36, detectionId: "eq-w03" },
  { id: "b02", label: "B-02", detail: "Vaso separador", kind: "equipment", x: 67, y: 46, detectionId: "eq-b02" },
  { id: "ls01", label: "LS 01", detail: "Chave de nível", kind: "instrument", x: 67, y: 21, detectionId: "ins-ls01" },
  { id: "p03", label: "P-03", detail: "Bomba de transferência", kind: "equipment", x: 67, y: 68, detectionId: "eq-p03" },
  { id: "vp01", label: "VP-01", detail: "Conjunto de bombeamento", kind: "equipment", x: 82, y: 57, detectionId: "eq-vp01" },
  { id: "pi203", label: "PI 2.03", detail: "Indicação de pressão", kind: "instrument", x: 82, y: 34, detectionId: "ins-pi203" },
  { id: "b03", label: "B-03", detail: "Vaso separador", kind: "equipment", x: 92, y: 70, detectionId: "eq-b03" },
  { id: "storage", label: "ARMAZ.", detail: "Banco B-04 a B-08", kind: "destination", x: 92, y: 89 },
  { id: "w04", label: "W-04", detail: "Trocador horizontal", kind: "equipment", x: 55, y: 10, detectionId: "eq-w04" },
  { id: "va09", label: "VA-09", detail: "Válvula de processo", kind: "valve", x: 72, y: 10, detectionId: "val-va09" },
  { id: "overhead", label: "TOPO", detail: "Limite da corrente de topo", kind: "destination", x: 91, y: 10 },
];

export const topologyEdges: TopologyEdge[] = [
  { id: "feed-va25", source: "feed", target: "va25", kind: "process" },
  { id: "va25-w01", source: "va25", target: "w01", kind: "process" },
  { id: "w01-w02", source: "w01", target: "w02", kind: "process" },
  { id: "w02-b01", source: "w02", target: "b01", kind: "process" },
  { id: "b01-p01", source: "b01", target: "p01", kind: "process" },
  { id: "p01-bottoms", source: "p01", target: "bottoms", kind: "process" },
  { id: "w02-w03", source: "w02", target: "w03", kind: "process" },
  { id: "w03-b02", source: "w03", target: "b02", kind: "process" },
  { id: "b02-p03", source: "b02", target: "p03", kind: "process" },
  { id: "p03-vp01", source: "p03", target: "vp01", kind: "process" },
  { id: "vp01-b03", source: "vp01", target: "b03", kind: "process" },
  { id: "b03-storage", source: "b03", target: "storage", kind: "process" },
  { id: "w02-w04", source: "w02", target: "w04", kind: "process" },
  { id: "w04-va09", source: "w04", target: "va09", kind: "process" },
  { id: "va09-overhead", source: "va09", target: "overhead", kind: "process" },
  { id: "ti03-w02", source: "ti03", target: "w02", kind: "signal", label: "medição" },
  { id: "pic01-w02", source: "pic01", target: "w02", kind: "signal", label: "pressão" },
  { id: "pic01-va09", source: "pic01", target: "va09", kind: "signal", label: "relação sugerida" },
  { id: "ls01-b02", source: "ls01", target: "b02", kind: "signal", label: "nível" },
  { id: "pi203-vp01", source: "pi203", target: "vp01", kind: "signal", label: "pressão" },
];

export const flowRoutes: FlowRoute[] = [
  {
    id: "feed-column",
    name: "Alimentação da coluna",
    purpose: "Percurso curado da alimentação até W-02.",
    nodeIds: ["feed", "va25", "w01", "w02"],
    edgeIds: ["feed-va25", "va25-w01", "w01-w02"],
  },
  {
    id: "bottoms-transfer",
    name: "Transferência de fundo",
    purpose: "Vizinhança de processo entre W-02 e o limite de produto.",
    nodeIds: ["w02", "b01", "p01", "bottoms"],
    edgeIds: ["w02-b01", "b01-p01", "p01-bottoms"],
  },
  {
    id: "side-stream",
    name: "Corrente intermediária",
    purpose: "Percurso visual de W-02 ao banco de armazenamento.",
    nodeIds: ["w02", "w03", "b02", "p03", "vp01", "b03", "storage"],
    edgeIds: ["w02-w03", "w03-b02", "b02-p03", "p03-vp01", "vp01-b03", "b03-storage"],
  },
  {
    id: "overhead-route",
    name: "Corrente de topo",
    purpose: "Relação curada entre W-02, W-04 e o limite superior.",
    nodeIds: ["w02", "w04", "va09", "overhead"],
    edgeIds: ["w02-w04", "w04-va09", "va09-overhead"],
  },
];

export const controlContexts: ControlContext[] = [
  {
    id: "column-pressure",
    name: "Contexto de pressão da coluna",
    type: "control",
    summary: "PIC 01, VA-09 e W-02 aparecem como uma relação de controle demonstrativa na camada curada.",
    warning: "A associação do elemento final precisa ser confirmada por especialista antes de qualquer uso técnico.",
    steps: [
      { nodeId: "pic01", role: "Medição e controle", detail: "Bolha PIC 01 ligada ao contexto de pressão." },
      { nodeId: "va09", role: "Elemento final sugerido", detail: "Válvula registrada na mesma vizinhança semântica." },
      { nodeId: "w02", role: "Processo associado", detail: "Coluna principal observada no documento." },
    ],
  },
  {
    id: "b02-level",
    name: "Monitoramento de nível em B-02",
    type: "monitoring",
    summary: "LS 01, B-02 e P-03 formam um contexto de monitoramento e transferência, não uma malha fechada confirmada.",
    warning: "O mapa não afirma intertravamento, lógica de partida ou consequência operacional.",
    steps: [
      { nodeId: "ls01", role: "Sinal de nível", detail: "Chave de nível identificada acima do vaso." },
      { nodeId: "b02", role: "Equipamento monitorado", detail: "Vaso separador associado à evidência LS 01." },
      { nodeId: "p03", role: "Transferência relacionada", detail: "Bomba próxima na rota de processo curada." },
    ],
  },
];

const processEdges = topologyEdges.filter((edge) => edge.kind === "process");

const walk = (startId: string, direction: "upstream" | "downstream") => {
  const visited = new Set<string>();
  const queue = [startId];

  while (queue.length) {
    const current = queue.shift();
    if (!current) continue;
    for (const edge of processEdges) {
      const matches = direction === "downstream" ? edge.source === current : edge.target === current;
      if (!matches) continue;
      const next = direction === "downstream" ? edge.target : edge.source;
      if (next === startId || visited.has(next)) continue;
      visited.add(next);
      queue.push(next);
    }
  }

  return Array.from(visited);
};

export const getImpactNeighborhood = (nodeId: string) => ({
  upstream: walk(nodeId, "upstream"),
  downstream: walk(nodeId, "downstream"),
});

export const topologyNodeByDetection = (detectionId: string | null) =>
  topologyNodes.find((node) => node.detectionId === detectionId) ?? null;

export const topologyNodeById = (nodeId: string) =>
  topologyNodes.find((node) => node.id === nodeId) ?? null;
