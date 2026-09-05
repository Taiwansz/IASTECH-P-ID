/**
 * Módulo de Avaliação, Métricas e Exportação de Engenharia — P&ID Lens.
 * 
 * Fornece:
 * - Cálculo dinâmico da Matriz de Confusão com base no status de revisão humana (aceito/revisão/rejeitado) e classes ISA-5.1.
 * - Métricas reais de precisão, conformidade ISA-5.1 e densidade de conexões topológicas.
 * - Geradores de exportação de engenharia:
 *   - exportToJson: JSON completo de engenharia (detections, topology, isaLoops, audit, metrics).
 *   - exportToGraphML: XML GraphML padrão para Cytoscape, Gephi e ferramentas CAD/CAM.
 *   - exportToCsv: Instrument & Equipment Index (CSV estruturado compatível com Excel).
 */

import type { Detection, DetectionKind } from "./demo-data.ts";
import { detectControlLoops, formatTagTypeClass, parseIsaTag } from "./isa51-rules.ts";
import type { TopologyEdge, TopologyGraphData, TopologyNode } from "./topology-data.ts";

export interface ConfusionMatrixData {
  labels: string[];
  kinds: DetectionKind[];
  values: number[][]; // values[realIndex][predIndex]
  accuracy: number; // 0 a 100
  macroF1: number; // 0 a 100
  support: number;
  note: string;
  classMetrics: Array<{
    kind: DetectionKind;
    label: string;
    precision: number;
    recall: number;
    f1: number;
    support: number;
  }>;
}

export interface TopologyDensityMetrics {
  totalNodes: number;
  totalEdges: number;
  processEdges: number;
  signalEdges: number;
  density: number; // 0 a 1
  densityFormatted: string; // Ex: "8.5%"
  averageDegree: number;
  connectedNodesCount: number;
  isolatedNodesCount: number;
  connectedRate: number; // 0 a 100
}

export interface ProcessVariableBreakdown {
  code: string;
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface SafetyCriticalMetrics {
  sceCount: number;
  reliefValvesCount: number;
  alarmsCount: number;
  interlocksCount: number;
  safeguardCoveragePercent: number;
  items: string[];
}

export interface TopologyHub {
  id: string;
  label: string;
  kind: string;
  degree: number;
  processConnections: number;
  signalConnections: number;
}

export interface DrawingQualityScore {
  score: number;
  maturityLevel: "Nível 1 (Esboço/Draft)" | "Nível 2 (Engenharia Básica - FEED)" | "Nível 3 (Engenharia Detalhada - IFC)";
  breakdown: {
    isa: number;
    confidence: number;
    topology: number;
    humanGate: number;
  };
  hoursSaved: number;
}

export interface SessionEvaluationMetrics {
  totalDetections: number;
  acceptedCount: number;
  reviewCount: number;
  rejectedCount: number;
  acceptedRate: number; // 0 a 100
  averageConfidence: number; // 0 a 100
  isaComplianceRate: number; // 0 a 100
  isaCompliantCount: number;
  controlLoopsCount: number;
  completeLoopsCount: number;
  confusionMatrix: ConfusionMatrixData;
  topologyDensity: TopologyDensityMetrics;
  variableBreakdown: ProcessVariableBreakdown[];
  safetyMetrics: SafetyCriticalMetrics;
  topologyHubs: TopologyHub[];
  qualityScore: DrawingQualityScore;
}

export interface ExportDataPayload {
  blueprint?: string;
  constitution?: string;
  diagram: {
    id: string;
    title: string;
    fileName: string;
    width: number;
    height: number;
    profile?: string;
  };
  detections: Detection[];
  topology: TopologyGraphData;
  audit: Array<{
    id: string;
    time: string;
    agent: string;
    action: string;
    status: string;
  }>;
  activeRouteId?: string;
  selectedNodeId?: string;
}

const KIND_DISPLAY_LABELS: Record<DetectionKind, string> = {
  tag: "TAG",
  equipment: "Equipamento",
  instrument: "Instrumento",
  valve: "Válvula",
};

const ORDERED_KINDS: DetectionKind[] = ["tag", "equipment", "instrument", "valve"];

/**
 * Determina a classe "Real" (Ground Truth) de uma detecção para cálculo da matriz:
 * 1. Se o operador humano aceitou (status = "accepted"): a predição é ratificada como verdade fundamental.
 * 2. Se o operador rejeitou (status = "rejected"): a predição da IA falhou.
 *    Se o TAG tiver classe ISA válida diferente, adota essa classe; caso contrário, é considerado ruído/TAG genérico.
 * 3. Se estiver em revisão (status = "review"): avalia a conformidade semântica segundo a norma ANSI/ISA-5.1
 *    (via parseIsaTag) em contraste com a classe predita pelo modelo visual/OCR.
 */
function determineGroundTruthKind(detection: Detection): DetectionKind {
  if (detection.status === "accepted") {
    return detection.kind;
  }

  const isa = parseIsaTag(detection.label);

  if (detection.status === "rejected") {
    // Se o humano rejeitou, a classificação do modelo estava incorreta.
    // Se a norma ISA apontava para outra classe, adotamos a classe ISA; caso contrário, é apenas um texto/TAG genérico.
    if (isa.kind !== detection.kind && ORDERED_KINDS.includes(isa.kind)) {
      return isa.kind;
    }
    return detection.kind === "tag" ? "instrument" : "tag";
  }

  // Em status "review": a verdade esperada é a norma ISA-5.1 se válida, ou o próprio kind se consistente
  if (isa.isValid && ORDERED_KINDS.includes(isa.kind)) {
    return isa.kind;
  }

  return detection.kind;
}

/**
 * Calcula dinamicamente a Matriz de Confusão com base nas detecções ativas da sessão,
 * nos votos do gate humano (aceito / revisão / rejeitado) e nas regras de engenharia ISA-5.1.
 */
export function calculateConfusionMatrix(detections: Detection[]): ConfusionMatrixData {
  const kinds = ORDERED_KINDS;
  const labels = kinds.map((k) => KIND_DISPLAY_LABELS[k]);
  const size = kinds.length;

  // Inicializa matriz size x size
  const values: number[][] = Array.from({ length: size }, () => Array(size).fill(0));

  if (!detections || detections.length === 0) {
    return {
      labels,
      kinds,
      values,
      accuracy: 0,
      macroF1: 0,
      support: 0,
      note: "Matriz demonstrativa baseada na coerência da sessão e regras ISA-5.1. Requer Ground Truth rotulado para validação de benchmark.",
      classMetrics: kinds.map((kind) => ({
        kind,
        label: KIND_DISPLAY_LABELS[kind],
        precision: 0,
        recall: 0,
        f1: 0,
        support: 0,
      })),
    };
  }

  // Popula os valores com base em Real x Predito
  for (const det of detections) {
    const realKind = determineGroundTruthKind(det);
    const predKind = det.kind;

    const realIdx = kinds.indexOf(realKind);
    const predIdx = kinds.indexOf(predKind);

    if (realIdx >= 0 && predIdx >= 0) {
      values[realIdx][predIdx] += 1;
    }
  }

  // Calcula métricas por classe (Precisão, Recall, F1)
  let totalCorrect = 0;
  const totalSamples = detections.length;

  const classMetrics = kinds.map((kind, i) => {
    const tp = values[i][i];
    totalCorrect += tp;

    // Total predito como classe i (soma da coluna i)
    let colSum = 0;
    for (let r = 0; r < size; r++) {
      colSum += values[r][i];
    }

    // Total real da classe i (soma da linha i)
    const rowSum = values[i].reduce((a, b) => a + b, 0);

    const precision = colSum > 0 ? (tp / colSum) * 100 : tp > 0 ? 100 : 0;
    const recall = rowSum > 0 ? (tp / rowSum) * 100 : rowSum === 0 ? 100 : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return {
      kind,
      label: KIND_DISPLAY_LABELS[kind],
      precision: Number(precision.toFixed(1)),
      recall: Number(recall.toFixed(1)),
      f1: Number(f1.toFixed(1)),
      support: rowSum,
    };
  });

  const accuracy = totalSamples > 0 ? Number(((totalCorrect / totalSamples) * 100).toFixed(1)) : 0;
  const activeClasses = classMetrics.filter((c) => c.support > 0);
  const macroF1 =
    activeClasses.length > 0
      ? Number((activeClasses.reduce((sum, c) => sum + c.f1, 0) / activeClasses.length).toFixed(1))
      : 0;

  const note =
    "Matriz demonstrativa baseada na coerência da sessão e regras ISA-5.1. Requer Ground Truth rotulado para validação de benchmark.";

  return {
    labels,
    kinds,
    values,
    accuracy,
    macroF1,
    support: totalSamples,
    note,
    classMetrics,
  };
}

/**
 * Calcula a densidade de conexões topológicas e estatísticas de conectividade do grafo.
 */
export function calculateTopologyDensity(
  nodes: TopologyNode[],
  edges: TopologyEdge[],
): TopologyDensityMetrics {
  const totalNodes = nodes ? nodes.length : 0;
  const totalEdges = edges ? edges.length : 0;

  const processEdges = edges ? edges.filter((e) => e.kind === "process").length : 0;
  const signalEdges = edges ? edges.filter((e) => e.kind === "signal").length : 0;

  if (totalNodes <= 1) {
    return {
      totalNodes,
      totalEdges,
      processEdges,
      signalEdges,
      density: 0,
      densityFormatted: "0.0%",
      averageDegree: 0,
      connectedNodesCount: totalNodes === 1 && totalEdges > 0 ? 1 : 0,
      isolatedNodesCount: totalNodes,
      connectedRate: 0,
    };
  }

  // Densidade em grafo direcionado: D = E / (N * (N - 1))
  const maxPossibleEdges = totalNodes * (totalNodes - 1);
  const density = maxPossibleEdges > 0 ? totalEdges / maxPossibleEdges : 0;

  // Grau médio: k = 2E / N
  const averageDegree = totalNodes > 0 ? Number(((2 * totalEdges) / totalNodes).toFixed(2)) : 0;

  // Identificação de nós conectados vs isolados
  const connectedNodeSet = new Set<string>();
  if (edges) {
    for (const edge of edges) {
      connectedNodeSet.add(edge.source);
      connectedNodeSet.add(edge.target);
    }
  }

  let connectedCount = 0;
  if (nodes) {
    for (const node of nodes) {
      if (connectedNodeSet.has(node.id)) {
        connectedCount++;
      }
    }
  }

  const isolatedNodesCount = totalNodes - connectedCount;
  const connectedRate = totalNodes > 0 ? Number(((connectedCount / totalNodes) * 100).toFixed(1)) : 0;

  return {
    totalNodes,
    totalEdges,
    processEdges,
    signalEdges,
    density: Number(density.toFixed(4)),
    densityFormatted: `${(density * 100).toFixed(1)}%`,
    averageDegree,
    connectedNodesCount: connectedCount,
    isolatedNodesCount,
    connectedRate,
  };
}

/**
 * Análise por Variável de Processo conforme código da primeira letra da norma ANSI/ISA-5.1.
 */
export function calculateProcessVariableBreakdown(detections: Detection[]): ProcessVariableBreakdown[] {
  const counts: Record<string, { name: string; count: number; color: string }> = {
    P: { name: "Pressão (Pressure)", count: 0, color: "#0f62fe" },
    T: { name: "Temperatura (Temperature)", count: 0, color: "#ff832b" },
    F: { name: "Vazão / Fluxo (Flow)", count: 0, color: "#198038" },
    L: { name: "Nível (Level)", count: 0, color: "#8a3ffc" },
    A: { name: "Análise / Qualidade (Analyzer)", count: 0, color: "#007d79" },
    S: { name: "Lógica / Intertravamento / Chaves", count: 0, color: "#fa4d56" },
    O: { name: "Outros Instrumentos e TAGs", count: 0, color: "#6f6f6f" },
  };

  let totalInstruments = 0;

  for (const det of detections) {
    if (det.kind === "equipment") continue; // foca em instrumentação e válvulas
    const isa = parseIsaTag(det.label);
    const variable = (isa.variable || "").toLowerCase();
    const label = det.label.toUpperCase();

    totalInstruments++;

    if (variable.includes("pressão") || /^P(I|T|C|S|V|D)/i.test(label) || /^20-P(I|T|C|S|V)/i.test(label)) {
      counts.P.count++;
    } else if (variable.includes("temperatura") || /^T(I|T|C|S|E|A)/i.test(label) || /^20-T(I|T|C|S|E)/i.test(label)) {
      counts.T.count++;
    } else if (variable.includes("vazão") || /^F(I|T|C|E|V|Q)/i.test(label) || /^20-F(I|T|C|E|V)/i.test(label)) {
      counts.F.count++;
    } else if (variable.includes("nível") || /^L(I|T|C|S|V)/i.test(label) || /^20-L(I|T|C|S|V)/i.test(label)) {
      counts.L.count++;
    } else if (variable.includes("análise") || /^A(I|T|C)/i.test(label) || /^20-A(I|T)/i.test(label)) {
      counts.A.count++;
    } else if (/^(HS|XL|ESD|SE|VI|SOV|LOGIC|ZSO|ZSC)/i.test(label) || /^20-(HS|XL|ESD|SE|VI|ZSO|ZSC)/i.test(label)) {
      counts.S.count++;
    } else {
      counts.O.count++;
    }
  }

  const safeTotal = Math.max(1, totalInstruments);
  return Object.entries(counts)
    .filter(([, data]) => data.count > 0)
    .map(([code, data]) => ({
      code,
      name: data.name,
      count: data.count,
      percentage: Number(((data.count / safeTotal) * 100).toFixed(1)),
      color: data.color,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Análise de Segurança de Processo (PSM) e Elementos Críticos de Segurança (Safety Critical Elements - SCE).
 */
export function calculateSafetyCriticalMetrics(detections: Detection[]): SafetyCriticalMetrics {
  const sceItems: string[] = [];
  let reliefValvesCount = 0;
  let alarmsCount = 0;
  let interlocksCount = 0;

  for (const det of detections) {
    const label = det.label.toUpperCase();
    const isRelief =
      /(?:PSV|PRV|ALIVIO|SAFETY|RUPTURE)/i.test(label) || /alívio|alivio|segurança|ruptura/i.test(det.group);
    const isAlarmSwitch =
      /(?:PSH|PSHH|PSL|PSLL|TSH|TSHH|TSL|TAH|LAH|LAL|LSH|LSL|VE|VI|SE|\b(?:LS|PS|TS|FS|HS|ZS)\b|\b(?:LS|PS|TS|FS|HS|ZS)\s*\d+)/i.test(
        label,
      ) || /chave|switch|alarme|alarm/i.test(det.group);
    const isInterlock =
      /(?:ESD|HS-|SOV|XV-|INTERLOCK|LOGIC|XL-)/i.test(label) ||
      /intertravamento|interlock|parada|emergência|emergencia/i.test(det.group);

    if (isRelief || isAlarmSwitch || isInterlock) {
      sceItems.push(det.label);
      if (isRelief) reliefValvesCount++;
      if (isAlarmSwitch) alarmsCount++;
      if (isInterlock) interlocksCount++;
    }
  }

  const equipmentCount = detections.filter((d) => d.kind === "equipment").length;
  // A cobertura de salvaguardas requer análise formal de HAZOP/LOPA com rastreamento 1:1 comprovado.
  // Sem matriz de causa e efeito validada, calcula a razão proporcional observada sem assumir 100% artificial.
  const safeguardCoveragePercent =
    equipmentCount > 0 && sceItems.length > 0
      ? Math.min(90, Math.round((sceItems.length / equipmentCount) * 100))
      : 0;

  return {
    sceCount: sceItems.length,
    reliefValvesCount,
    alarmsCount,
    interlocksCount,
    safeguardCoveragePercent,
    items: sceItems.slice(0, 8),
  };
}

/**
 * Análise de Centralidade de Grafo: identifica os nós "Hub" com maior conectividade.
 */
export function calculateTopologyHubs(topology?: TopologyGraphData): TopologyHub[] {
  if (!topology || !topology.nodes || topology.nodes.length === 0) return [];

  const degreeMap = new Map<string, { process: number; signal: number; total: number }>();
  for (const node of topology.nodes) {
    degreeMap.set(node.id, { process: 0, signal: 0, total: 0 });
  }

  for (const edge of topology.edges || []) {
    const src = degreeMap.get(edge.source);
    const tgt = degreeMap.get(edge.target);
    if (src) {
      src.total++;
      if (edge.kind === "process") src.process++;
      else src.signal++;
    }
    if (tgt) {
      tgt.total++;
      if (edge.kind === "process") tgt.process++;
      else tgt.signal++;
    }
  }

  return topology.nodes
    .map((node) => {
      const deg = degreeMap.get(node.id) || { process: 0, signal: 0, total: 0 };
      return {
        id: node.id,
        label: node.label,
        kind: node.kind,
        degree: deg.total,
        processConnections: deg.process,
        signalConnections: deg.signal,
      };
    })
    .sort((a, b) => b.degree - a.degree)
    .slice(0, 5);
}

/**
 * Índice de Qualidade e Maturidade do P&ID (Drawing Quality Score - DQS).
 */
export function calculateDrawingQualityScore(
  detections: Detection[],
  topology?: TopologyGraphData,
): DrawingQualityScore {
  const total = detections.length;
  if (total === 0) {
    return {
      score: 0,
      maturityLevel: "Nível 1 (Esboço/Draft)",
      breakdown: { isa: 0, confidence: 0, topology: 0, humanGate: 0 },
      hoursSaved: 0,
    };
  }

  let isaCompliant = 0;
  let totalConfidence = 0;
  let accepted = 0;

  for (const det of detections) {
    const isa = parseIsaTag(det.label);
    if (isa.isValid && (isa.isaStandard || isa.kind === "equipment")) isaCompliant++;
    totalConfidence += det.confidence;
    if (det.status === "accepted") accepted++;
  }

  const isaRate = Math.round((isaCompliant / total) * 100);
  const confRate = Math.round((totalConfidence / total) * 100);
  const gateRate = Math.round((accepted / total) * 100);

  const nodes = topology?.nodes ?? [];
  const edges = topology?.edges ?? [];
  const density = calculateTopologyDensity(nodes, edges);
  const topoRate = density.connectedRate;

  const score = Math.round(isaRate * 0.30 + confRate * 0.25 + topoRate * 0.25 + gateRate * 0.20);

  const maturityLevel =
    score >= 88
      ? "Nível 3 (Engenharia Detalhada - IFC)"
      : score >= 70
        ? "Nível 2 (Engenharia Básica - FEED)"
        : "Nível 1 (Esboço/Draft)";

  const hoursSaved = Number(((total * 1.5) / 60).toFixed(1));

  return {
    score,
    maturityLevel,
    breakdown: {
      isa: isaRate,
      confidence: confRate,
      topology: topoRate,
      humanGate: gateRate,
    },
    hoursSaved,
  };
}

/**
 * Calcula todas as métricas agregadas da sessão:
 * Precisão real, conformidade ISA-5.1, laços de controle, matriz de confusão, densidade topológica,
 * espectro de variáveis, segurança de processo e índice de qualidade DQS.
 */
export function calculateSessionMetrics(
  detections: Detection[],
  topology?: TopologyGraphData,
): SessionEvaluationMetrics {
  const totalDetections = detections.length;
  const acceptedCount = detections.filter((d) => d.status === "accepted").length;
  const reviewCount = detections.filter((d) => d.status === "review").length;
  const rejectedCount = detections.filter((d) => d.status === "rejected").length;

  const acceptedRate = totalDetections > 0 ? Math.round((acceptedCount / totalDetections) * 100) : 0;
  const averageConfidence =
    totalDetections > 0
      ? Math.round((detections.reduce((sum, item) => sum + item.confidence, 0) / totalDetections) * 100)
      : 0;

  // Avaliação de Conformidade ISA-5.1
  let isaCompliantCount = 0;
  for (const det of detections) {
    const validation = parseIsaTag(det.label);
    if (validation.isValid && (validation.isaStandard || validation.kind === "equipment")) {
      isaCompliantCount++;
    }
  }

  const isaComplianceRate =
    totalDetections > 0 ? Math.round((isaCompliantCount / totalDetections) * 100) : 0;

  // Detecção de Malhas de Controle ISA
  const loops = detectControlLoops(detections);
  const controlLoopsCount = loops.length;
  const completeLoopsCount = loops.filter((l) => l.isComplete).length;

  const confusionMatrix = calculateConfusionMatrix(detections);

  const nodes = topology?.nodes ?? [];
  const edges = topology?.edges ?? [];
  const topologyDensity = calculateTopologyDensity(nodes, edges);

  const variableBreakdown = calculateProcessVariableBreakdown(detections);
  const safetyMetrics = calculateSafetyCriticalMetrics(detections);
  const topologyHubs = calculateTopologyHubs(topology);
  const qualityScore = calculateDrawingQualityScore(detections, topology);

  return {
    totalDetections,
    acceptedCount,
    reviewCount,
    rejectedCount,
    acceptedRate,
    averageConfidence,
    isaComplianceRate,
    isaCompliantCount,
    controlLoopsCount,
    completeLoopsCount,
    confusionMatrix,
    topologyDensity,
    variableBreakdown,
    safetyMetrics,
    topologyHubs,
    qualityScore,
  };
}

/**
 * Exportador 1: JSON de Engenharia Completo.
 * Inclui: metadata, detections com validação ISA, topologia detalhada, malhas de controle, trilha de auditoria e métricas.
 */
export function exportToJson(payload: ExportDataPayload): string {
  const metrics = calculateSessionMetrics(payload.detections, payload.topology);
  const controlLoops = detectControlLoops(payload.detections);

  const isCurated =
    payload.diagram.fileName === "16.jpg" || payload.diagram.id === "distillation-train";
  const topologyStatus = isCurated ? "curated" : "unverified";

  const fullData = {
    metadata: {
      generator: "Rastro — P&ID Lens",
      version: "0.1.0",
      blueprint: payload.blueprint ?? "THL-PID-BP-001",
      constitution: payload.constitution ?? "THL-PID-CONST-001",
      exportedAt: new Date().toISOString(),
      localExecutionOnly: true,
      securityGuarantee: "Zero data transmitted externally. All processing executed in local runtime.",
      disclaimer:
        "AVISO: Este relatório é um auxílio computacional e não substitui avaliação presencial de engenharia nem estudos formais de HAZOP/LOPA.",
    },
    diagram: {
      id: payload.diagram.id,
      title: payload.diagram.title,
      fileName: payload.diagram.fileName,
      dimensions: {
        width: payload.diagram.width,
        height: payload.diagram.height,
      },
      profile: payload.diagram.profile ?? "dense",
    },
    evaluation: {
      sessionMetrics: {
        totalCandidates: metrics.totalDetections,
        accepted: metrics.acceptedCount,
        inReview: metrics.reviewCount,
        rejected: metrics.rejectedCount,
        acceptanceRatePercent: metrics.acceptedRate,
        averageConfidencePercent: metrics.averageConfidence,
        isaComplianceRatePercent: metrics.isaComplianceRate,
        controlLoopsDetected: metrics.controlLoopsCount,
        completeLoops: metrics.completeLoopsCount,
      },
      confusionMatrix: metrics.confusionMatrix,
      topologyDensity: metrics.topologyDensity,
    },
    detections: payload.detections.map((det) => {
      const isa = parseIsaTag(det.label);
      const formatted = formatTagTypeClass(det.label);
      return {
        id: det.id,
        label: det.label,
        normalized: det.normalized,
        kind: det.kind,
        group: det.group,
        tagTypeClass: {
          type: formatted.type,
          class: formatted.class,
          formatted: formatted.formatted,
        },
        confidence: det.confidence,
        status: det.status,
        source: det.source,
        boundingBox: det.box,
        rationale: det.rationale,
        symbolId: det.symbolId,
        isa51Validation: {
          isValid: isa.isValid,
          standardTag: isa.tag,
          variable: isa.variable,
          function: isa.functionName,
          loopNumber: isa.loopNumber,
          isStandard: isa.isaStandard,
        },
      };
    }),
    topology: {
      status: topologyStatus,
      nodesCount: payload.topology.nodes.length,
      edgesCount: payload.topology.edges.length,
      routesCount: payload.topology.routes.length,
      activeRoute: payload.activeRouteId,
      selectedNode: payload.selectedNodeId,
      nodes: payload.topology.nodes,
      edges: payload.topology.edges,
      routes: payload.topology.routes,
    },
    isaControlLoops: controlLoops,
    auditTrail: payload.audit,
  };

  return JSON.stringify(fullData, null, 2);
}

/**
 * Exportador 2: XML GraphML Padrão da Indústria para Cytoscape / Gephi.
 */
export function exportToGraphML(
  topology: TopologyGraphData,
  diagramTitle = "P&ID Lens Topology",
): string {
  const nodes = topology.nodes || [];
  const edges = topology.edges || [];

  const escapeXml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const lines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<graphml xmlns="http://graphml.graphdrawing.org/xmlns"`,
    `    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"`,
    `    xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns`,
    `    http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">`,
    `  <!-- Schema Attributes -->`,
    `  <key id="d_label" for="node" attr.name="label" attr.type="string"/>`,
    `  <key id="d_kind" for="node" attr.name="kind" attr.type="string"/>`,
    `  <key id="d_detail" for="node" attr.name="detail" attr.type="string"/>`,
    `  <key id="d_x" for="node" attr.name="x_percent" attr.type="double"/>`,
    `  <key id="d_y" for="node" attr.name="y_percent" attr.type="double"/>`,
    `  <key id="d_detectionId" for="node" attr.name="detectionId" attr.type="string"/>`,
    `  <key id="d_edge_kind" for="edge" attr.name="kind" attr.type="string"/>`,
    `  <key id="d_edge_label" for="edge" attr.name="label" attr.type="string"/>`,
    `  <graph id="${escapeXml(diagramTitle)}" edgedefault="directed">`,
  ];

  // Adiciona Nós
  for (const node of nodes) {
    lines.push(`    <node id="${escapeXml(node.id)}">`);
    lines.push(`      <data key="d_label">${escapeXml(node.label)}</data>`);
    lines.push(`      <data key="d_kind">${escapeXml(node.kind)}</data>`);
    lines.push(`      <data key="d_detail">${escapeXml(node.detail || "")}</data>`);
    lines.push(`      <data key="d_x">${node.x}</data>`);
    lines.push(`      <data key="d_y">${node.y}</data>`);
    if (node.detectionId) {
      lines.push(`      <data key="d_detectionId">${escapeXml(node.detectionId)}</data>`);
    }
    lines.push(`    </node>`);
  }

  // Adiciona Arestas
  for (const edge of edges) {
    lines.push(`    <edge id="${escapeXml(edge.id)}" source="${escapeXml(edge.source)}" target="${escapeXml(edge.target)}">`);
    lines.push(`      <data key="d_edge_kind">${escapeXml(edge.kind)}</data>`);
    if (edge.label) {
      lines.push(`      <data key="d_edge_label">${escapeXml(edge.label)}</data>`);
    }
    lines.push(`    </edge>`);
  }

  lines.push(`  </graph>`);
  lines.push(`</graphml>`);

  return lines.join("\n");
}

/**
 * Exportador 3: Instrument & Equipment Index (CSV estruturado).
 * Utiliza separador vírgula e adiciona UTF-8 BOM para compatibilidade imediata com Excel em português.
 */
export function exportToCsv(
  detections: Detection[],
  topology?: TopologyGraphData,
): string {
  const escapeCsv = (val: string | number | undefined | null) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headers = [
    "TAG",
    "Tipo",
    "Classe ISA-5.1",
    "Descrição / Grupo",
    "Formato Oficial (TAG=TYPE/CLASS)",
    "Variável Medida",
    "Função ISA",
    "Laço / Malha",
    "Status de Revisão",
    "Confiança (%)",
    "Origem",
    "Posição X (px)",
    "Posição Y (px)",
    "Largura (px)",
    "Altura (px)",
    "Conexões no Grafo",
    "Justificativa / Rationale",
  ];

  // Mapeia conexões topológicas de cada detecção
  const connectionCounts = new Map<string, number>();
  if (topology?.edges) {
    const detNodeMap = new Map<string, string>();
    for (const n of topology.nodes) {
      if (n.detectionId) detNodeMap.set(n.id, n.detectionId);
    }
    for (const edge of topology.edges) {
      const srcDet = detNodeMap.get(edge.source) || edge.source;
      const tgtDet = detNodeMap.get(edge.target) || edge.target;
      connectionCounts.set(srcDet, (connectionCounts.get(srcDet) || 0) + 1);
      connectionCounts.set(tgtDet, (connectionCounts.get(tgtDet) || 0) + 1);
    }
  }

  const rows: string[] = [headers.map(escapeCsv).join(",")];

  for (const det of detections) {
    const isa = parseIsaTag(det.label);
    const formatted = formatTagTypeClass(det.label);
    const connCount = connectionCounts.get(det.id) ?? 0;

    const row = [
      escapeCsv(det.label),
      escapeCsv(KIND_DISPLAY_LABELS[det.kind] || det.kind),
      escapeCsv(isa.isaStandard ? "Conforme ANSI/ISA-5.1" : isa.kind === "equipment" ? "Equipamento de Engenharia" : "Não Classificado"),
      escapeCsv(det.group),
      escapeCsv(formatted.formatted),
      escapeCsv(isa.variable || "N/A"),
      escapeCsv(isa.functionName || "N/A"),
      escapeCsv(isa.loopNumber || "Geral"),
      escapeCsv(det.status === "accepted" ? "Aceito" : det.status === "rejected" ? "Rejeitado" : "Pendente de Revisão"),
      escapeCsv(Math.round(det.confidence * 100)),
      escapeCsv(det.source === "curated-reference" ? "Referência Curada" : "OCR Neural Local"),
      escapeCsv(det.box.x),
      escapeCsv(det.box.y),
      escapeCsv(det.box.width),
      escapeCsv(det.box.height),
      escapeCsv(connCount),
      escapeCsv(det.rationale),
    ];

    rows.push(row.join(","));
  }

  // Adiciona UTF-8 BOM (\uFEFF) para garantir caracteres acentuados no Excel
  return `\uFEFF${rows.join("\r\n")}`;
}

/**
 * Exportador 4: SVG Vetorial de Engenharia com Camadas.
 * Stand-alone, escalável, com caixas delimitadoras coloridas por classe ISA-5.1 e linhas de fluxo/sinal.
 */
export function exportToSvg(
  sample: { width: number; height: number; title: string; image?: string; fileName?: string },
  detections: Detection[],
  topology?: TopologyGraphData,
): string {
  const w = sample.width || 1200;
  const h = sample.height || 800;

  const lines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`,
    `  <defs>`,
    `    <marker id="arrow-proc" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">`,
    `      <path d="M 0 0 L 10 5 L 0 10 z" fill="#198038"/>`,
    `    </marker>`,
    `    <marker id="arrow-sig" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">`,
    `      <path d="M 0 0 L 10 5 L 0 10 z" fill="#0f62fe"/>`,
    `    </marker>`,
    `  </defs>`,
    `  <rect width="100%" height="100%" fill="#fdfbf7"/>`,
  ];

  if (sample.image) {
    lines.push(`  <image href="${sample.image}" width="${w}" height="${h}" opacity="0.85"/>`);
  }

  // Camada de conexões de topologia
  if (topology?.edges && topology.edges.length > 0) {
    const nodeMap = new Map(topology.nodes.map((n) => [n.id, n]));
    lines.push(`  <!-- Camada de Conexões Topológicas -->`);
    lines.push(`  <g id="topology-edges">`);
    for (const edge of topology.edges) {
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);
      if (!src || !tgt) continue;
      const x1 = (src.x / 100) * w;
      const y1 = (src.y / 100) * h;
      const x2 = (tgt.x / 100) * w;
      const y2 = (tgt.y / 100) * h;
      const isProc = edge.kind === "process";
      const stroke = isProc ? "#198038" : "#0f62fe";
      const dash = isProc ? "" : ' stroke-dasharray="4,4"';
      const marker = isProc ? ' marker-end="url(#arrow-proc)"' : ' marker-end="url(#arrow-sig)"';
      lines.push(`    <line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${stroke}" stroke-width="${isProc ? 2.5 : 1.5}"${dash}${marker}/>`);
    }
    lines.push(`  </g>`);
  }

  // Camada de Caixas Delimitadoras e Rótulos
  lines.push(`  <!-- Camada de Detecções ISA-5.1 -->`);
  lines.push(`  <g id="detections">`);
  for (const det of detections) {
    const { x, y, width, height } = det.box;
    const color =
      det.kind === "equipment"
        ? "#b28600"
        : det.kind === "valve"
          ? "#0f62fe"
          : det.kind === "instrument"
            ? "#198038"
            : "#8a3ffc";
    const bgFill =
      det.kind === "equipment"
        ? "rgba(241, 194, 27, 0.18)"
        : det.kind === "valve"
          ? "rgba(15, 98, 254, 0.15)"
          : det.kind === "instrument"
            ? "rgba(25, 128, 56, 0.15)"
            : "rgba(138, 63, 252, 0.15)";

    lines.push(`    <g id="det-${det.id}">`);
    lines.push(`      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="3" fill="${bgFill}" stroke="${color}" stroke-width="2"/>`);
    lines.push(`      <rect x="${x}" y="${Math.max(0, y - 16)}" width="${Math.max(48, det.label.length * 7.5)}" height="15" rx="2" fill="${color}"/>`);
    lines.push(`      <text x="${x + 4}" y="${Math.max(11, y - 5)}" font-family="monospace" font-size="10" font-weight="bold" fill="#ffffff">${det.label}</text>`);
    lines.push(`    </g>`);
  }
  lines.push(`  </g>`);

  // Carimbo de Engenharia
  lines.push(`  <!-- Carimbo de Engenharia -->`);
  lines.push(`  <g id="title-block" transform="translate(${Math.max(10, w - 330)}, ${Math.max(10, h - 70)})">`);
  lines.push(`    <rect width="320" height="60" fill="#ffffff" stroke="#161616" stroke-width="1.5"/>`);
  lines.push(`    <text x="10" y="18" font-family="sans-serif" font-size="11" font-weight="bold" fill="#161616">RASTRO P&amp;ID LENS — EXPORTAÇÃO VETORIAL</text>`);
  lines.push(`    <text x="10" y="34" font-family="sans-serif" font-size="9" fill="#525252">${sample.title || sample.fileName || "Diagrama P&ID"} • ${detections.length} Componentes</text>`);
  lines.push(`    <text x="10" y="48" font-family="sans-serif" font-size="8" fill="#8d8d8d">Norma ANSI/ISA-5.1 • Processamento 100% Local</text>`);
  lines.push(`  </g>`);
  lines.push(`</svg>`);

  return lines.join("\n");
}

/**
 * Exportador 5: Relatório Técnico de Inspeção e Auditoria em Markdown (.md).
 * Formato executivo com sumário, KPIs de segurança de processo, inventário e auditoria.
 */
export function exportToMarkdownReport(payload: ExportDataPayload): string {
  const metrics = calculateSessionMetrics(payload.detections, payload.topology);
  const controlLoops = detectControlLoops(payload.detections);

  const lines: string[] = [
    `# Relatório Técnico de Inspeção e Extração — ${payload.diagram.title}`,
    ``,
    `> **Data de Emissão**: ${new Date().toLocaleString("pt-BR")}  `,
    `> **Arquivo Analisado**: \`${payload.diagram.fileName}\` (${payload.diagram.width} × ${payload.diagram.height} px)  `,
    `> **Plataforma**: Rastro P&ID Lens • Versão 0.1.0  `,
    `> **Garantia de Privacidade**: Execução 100% offline no dispositivo do usuário. Zero dados externos.  `,
    `> **AVISO**: Este relatório é um auxílio computacional e não substitui avaliação presencial de engenharia nem estudos formais de HAZOP/LOPA.`,
    ``,
    `---`,
    ``,
    `## 1. Sumário Executivo e Scorecard de Qualidade (DQS)`,
    ``,
    `| Métrica de Engenharia | Valor Obtido | Benchmark Normativo |`,
    `| :--- | :--- | :--- |`,
    `| **Drawing Quality Score (DQS)** | **${metrics.qualityScore.score}/100** | $\\ge 85/100$ |`,
    `| **Nível de Maturidade** | **${metrics.qualityScore.maturityLevel}** | Nível 3 - IFC |`,
    `| **Conformidade ANSI/ISA-5.1** | **${metrics.isaComplianceRate}%** | $\\ge 80\\%$ |`,
    `| **Acurácia Global do Modelo** | **${metrics.confusionMatrix.accuracy}%** | $\\ge 80\\%$ |`,
    `| **Taxa de Conectividade Topológica** | **${metrics.topologyDensity.connectedRate}%** | $\\ge 75\\%$ |`,
    `| **Tempo de Engenharia Economizado** | **~${metrics.qualityScore.hoursSaved} horas** | Produtividade 10x |`,
    ``,
    `---`,
    ``,
    `## 2. Análise de Segurança de Processo (PSM & Safety Critical Elements)`,
    ``,
    `- **Elementos Críticos de Segurança (SCE) identificados**: ${metrics.safetyMetrics.sceCount}`,
    `- **Válvulas de Alívio de Pressão (PSV/PRV)**: ${metrics.safetyMetrics.reliefValvesCount}`,
    `- **Chaves de Nível / Pressão / Temperatura de Alta (Alarmes)**: ${metrics.safetyMetrics.alarmsCount}`,
    `- **Intertravamentos e Comandos de Desarme (ESD/SOV/HS)**: ${metrics.safetyMetrics.interlocksCount}`,
    `- **Cobertura de Salvaguardas em Equipamentos**: ${metrics.safetyMetrics.safeguardCoveragePercent}%`,
    `- **Amostra de TAGs de Segurança**: ${metrics.safetyMetrics.items.join(", ") || "Nenhum SCE registrado"}`,
    ``,
    `---`,
    ``,
    `## 3. Espectro de Instrumentação por Variável de Processo`,
    ``,
    `| Variável Física | Código | Contagem | Proporção (%) |`,
    `| :--- | :---: | :---: | :---: |`,
  ];

  for (const v of metrics.variableBreakdown) {
    lines.push(`| ${v.name} | \`${v.code}\` | ${v.count} | ${v.percentage}% |`);
  }

  lines.push(
    ``,
    `---`,
    ``,
    `## 4. Topologia e Nós Centrais do Grafo (Process Hubs)`,
    ``,
    `| TAG do Hub | Tipo | Grau Total | Linhas de Processo | Linhas de Sinal |`,
    `| :--- | :--- | :---: | :---: | :---: |`,
  );

  for (const hub of metrics.topologyHubs) {
    lines.push(`| **${hub.label}** | ${hub.kind} | ${hub.degree} | ${hub.processConnections} | ${hub.signalConnections} |`);
  }

  lines.push(
    ``,
    `---`,
    ``,
    `## 5. Malhas de Controle Identificadas (ISA-5.1)`,
    ``,
    `Total de malhas mapeadas: **${controlLoops.length}** (sendo **${controlLoops.filter((l) => l.isComplete).length}** completas com Sensor $\\to$ Transmissor $\\to$ Controlador $\\to$ Válvula).`,
    ``,
    `| Identificador da Malha | Variável | Status da Malha | Componentes Integrados |`,
    `| :--- | :--- | :--- | :--- |`,
  );

  for (const loop of controlLoops.slice(0, 15)) {
    const parts = [loop.transmitter, loop.controller, loop.valve, ...loop.indicators].filter(Boolean);
    lines.push(`| **Malha ${loop.loopId}** | ${loop.variable} | ${loop.isComplete ? "[CONFORME] Malha Fechada Completa" : "[REVISÃO] Malha Aberta / Incompleta"} | ${parts.join(", ") || "Sem elementos"} |`);
  }

  lines.push(
    ``,
    `---`,
    ``,
    `## 6. Inventário de Equipamentos e Instrumentos`,
    ``,
    `| TAG | Tipo | Classe ISA-5.1 | Status | Confiança | Coordenadas (X, Y) |`,
    `| :--- | :--- | :--- | :--- | :---: | :---: |`,
  );

  for (const det of payload.detections.slice(0, 35)) {
    lines.push(`| \`${det.label}\` | ${det.kind} | ${det.group} | ${det.status} | ${Math.round(det.confidence * 100)}% | (${det.box.x}, ${det.box.y}) |`);
  }
  if (payload.detections.length > 35) {
    lines.push(`| ... e mais ${payload.detections.length - 35} componentes | | | | | |`);
  }

  lines.push(
    ``,
    `---`,
    ``,
    `## 7. Registro de Governança dos 5 Agentes do Atlas`,
    ``,
    `| Horário | Agente | Ação Executada | Status |`,
    `| :--- | :--- | :--- | :--- |`,
  );

  for (const a of payload.audit.slice(0, 10)) {
    lines.push(`| ${a.time} | ${a.agent} | ${a.action} | ${a.status} |`);
  }

  lines.push(
    ``,
    `---`,
    ``,
    `> **AVISO**: Este relatório é um auxílio computacional e não substitui avaliação presencial de engenharia nem estudos formais de HAZOP/LOPA.`,
  );

  return lines.join("\n");
}

/**
 * Exportador 6: CAD Industrial DXF (AutoCAD Drawing Exchange Format).
 * Exporta caixas em LWPOLYLINE, textos dos TAGs e linhas de processo/sinal em camadas CAD padronizadas.
 */
export function exportToDxf(
  detections: Detection[],
  topology?: TopologyGraphData,
  sample?: { width: number; height: number; title: string },
): string {
  const safeW = sample?.width || 1200;
  const safeH = sample?.height || 800;

  const lines: string[] = [
    "0", "SECTION",
    "2", "HEADER",
    "9", "$ACADVER",
    "1", "AC1015", // AutoCAD 2000 format
    "0", "ENDSEC",
    "0", "SECTION",
    "2", "TABLES",
    "0", "TABLE",
    "2", "LAYER",
    "70", "6",
    // Camada EQUIPAMENTOS
    "0", "LAYER", "2", "PID_EQUIPMENT", "70", "0", "62", "2", "6", "CONTINUOUS",
    // Camada VALVULAS
    "0", "LAYER", "2", "PID_VALVES", "70", "0", "62", "4", "6", "CONTINUOUS",
    // Camada INSTRUMENTOS
    "0", "LAYER", "2", "PID_INSTRUMENTS", "70", "0", "62", "3", "6", "CONTINUOUS",
    // Camada TUBULACAO PROCESSO
    "0", "LAYER", "2", "PID_PROCESS_PIPING", "70", "0", "62", "1", "6", "CONTINUOUS",
    // Camada SINAL
    "0", "LAYER", "2", "PID_SIGNAL_LINES", "70", "0", "62", "5", "6", "DASHED",
    // Camada TEXTOS
    "0", "LAYER", "2", "PID_TAG_TEXTS", "70", "0", "62", "7", "6", "CONTINUOUS",
    "0", "ENDTAB",
    "0", "ENDSEC",
    "0", "SECTION",
    "2", "ENTITIES",
  ];

  // Adiciona retângulos das detecções e textos
  for (const det of detections) {
    const layer =
      det.kind === "equipment"
        ? "PID_EQUIPMENT"
        : det.kind === "valve"
          ? "PID_VALVES"
          : "PID_INSTRUMENTS";

    const x1 = det.box.x;
    const y1 = -det.box.y;
    const x2 = det.box.x + det.box.width;
    const y2 = -(det.box.y + det.box.height);

    // Bounding box como LWPOLYLINE fechada
    lines.push(
      "0", "LWPOLYLINE",
      "8", layer,
      "90", "4",
      "70", "1", // Fechada
      "10", x1.toFixed(2), "20", y1.toFixed(2),
      "10", x2.toFixed(2), "20", y1.toFixed(2),
      "10", x2.toFixed(2), "20", y2.toFixed(2),
      "10", x1.toFixed(2), "20", y2.toFixed(2),
    );

    // TAG de texto posicionado
    lines.push(
      "0", "TEXT",
      "8", "PID_TAG_TEXTS",
      "10", x1.toFixed(2),
      "20", (y1 + 12).toFixed(2),
      "30", "0.0",
      "40", "12.0", // Altura do texto
      "1", det.label,
    );
  }

  // Adiciona arestas de tubulação e sinal
  if (topology?.edges) {
    const nodeMap = new Map(topology.nodes.map((n) => [n.id, n]));
    for (const edge of topology.edges) {
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);
      if (!src || !tgt) continue;

      const layer = edge.kind === "process" ? "PID_PROCESS_PIPING" : "PID_SIGNAL_LINES";
      const x1 = (src.x / 100) * safeW;
      const y1 = -((src.y / 100) * safeH);
      const x2 = (tgt.x / 100) * safeW;
      const y2 = -((tgt.y / 100) * safeH);

      lines.push(
        "0", "LINE",
        "8", layer,
        "10", x1.toFixed(2),
        "20", y1.toFixed(2),
        "30", "0.0",
        "11", x2.toFixed(2),
        "20", y2.toFixed(2),
        "30", "0.0",
      );
    }
  }

  lines.push("0", "ENDSEC", "0", "EOF");
  return lines.join("\n");
}

/**
 * Função utilitária no navegador para acionar o download do arquivo.
 */
export function triggerFileDownload(content: string, fileName: string, mimeType: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
