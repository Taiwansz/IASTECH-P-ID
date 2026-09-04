"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Button from "@carbon/react/es/components/Button/index.js";
import { InlineNotification } from "@carbon/react/es/components/Notification/Notification.js";
import ProgressBar from "@carbon/react/es/components/ProgressBar/ProgressBar.js";
import { Theme } from "@carbon/react/es/components/Theme/index.js";
import { Archive } from "@phosphor-icons/react/Archive";
import { ArrowsInSimple } from "@phosphor-icons/react/ArrowsInSimple";
import { BookOpenText } from "@phosphor-icons/react/BookOpenText";
import { Brain } from "@phosphor-icons/react/Brain";
import { ChartBar } from "@phosphor-icons/react/ChartBar";
import { Check } from "@phosphor-icons/react/Check";
import { CheckCircle } from "@phosphor-icons/react/CheckCircle";
import { CloudSlash } from "@phosphor-icons/react/CloudSlash";
import { Cpu } from "@phosphor-icons/react/Cpu";
import { Crosshair } from "@phosphor-icons/react/Crosshair";
import { Database } from "@phosphor-icons/react/Database";
import { DownloadSimple } from "@phosphor-icons/react/DownloadSimple";
import { Eye } from "@phosphor-icons/react/Eye";
import { FileArrowUp } from "@phosphor-icons/react/FileArrowUp";
import { FileCode } from "@phosphor-icons/react/FileCode";
import { FileImage } from "@phosphor-icons/react/FileImage";
import { FileText } from "@phosphor-icons/react/FileText";
import { Fingerprint } from "@phosphor-icons/react/Fingerprint";
import { Flask } from "@phosphor-icons/react/Flask";
import { GearSix } from "@phosphor-icons/react/GearSix";
import { Graph } from "@phosphor-icons/react/Graph";
import { ListMagnifyingGlass } from "@phosphor-icons/react/ListMagnifyingGlass";
import { LockKey } from "@phosphor-icons/react/LockKey";
import { Minus } from "@phosphor-icons/react/Minus";
import { Play } from "@phosphor-icons/react/Play";
import { Plus } from "@phosphor-icons/react/Plus";
import { PresentationChart } from "@phosphor-icons/react/PresentationChart";
import { Pulse } from "@phosphor-icons/react/Pulse";
import { ShieldCheck } from "@phosphor-icons/react/ShieldCheck";
import { SlidersHorizontal } from "@phosphor-icons/react/SlidersHorizontal";
import { SquaresFour } from "@phosphor-icons/react/SquaresFour";
import { Table } from "@phosphor-icons/react/Table";
import { UserFocus } from "@phosphor-icons/react/UserFocus";
import { Warning } from "@phosphor-icons/react/Warning";
import { X } from "@phosphor-icons/react/X";
import { XCircle } from "@phosphor-icons/react/XCircle";
import {
  getDetectionsForSample,
  initialAudit,
  referenceDetections,
  samples,
  type Detection,
  type DetectionKind,
  type DiagramSample,
} from "../lib/demo-data";
import {
  calculateSessionMetrics,
  exportToCsv,
  exportToDxf,
  exportToGraphML,
  exportToJson,
  exportToMarkdownReport,
  exportToSvg,
  triggerFileDownload,
} from "../lib/evaluation";
import { runLocalOcr } from "../lib/local-ocr";
import { pidMLEngine } from "../lib/ml-pid-engine";
import {
  flowRoutes,
  generateTopologyFromDetections,
  topologyEdges,
  topologyNodeByDetection,
  topologyNodes,
  type FlowRoute,
  type TopologyEdge,
  type TopologyNode,
} from "../lib/topology-data";
import {
  AnalysisModeTabs,
  AuditTimeline,
  ControlWorkspace,
  DocumentLibrary,
  ImpactWorkspace,
  TopologyUnavailable,
  TopologyWorkspace,
  type AnalysisMode,
} from "./VisualIntelligence";

type View = "overview" | "analysis" | "documents" | "review" | "metrics" | "atlas";
type AnalysisState = "reference" | "ready" | "running" | "complete" | "error";

interface AuditEvent {
  id: string;
  time: string;
  agent: string;
  action: string;
  status: string;
}

const AUDIT_STORAGE_KEY = "thloop-pid-lens-audit-v1";
const MAX_LOCAL_FILE_SIZE = 25 * 1024 * 1024;

const navigation = [
  { id: "overview" as View, label: "Visão geral", icon: PresentationChart },
  { id: "analysis" as View, label: "Análise", icon: Crosshair },
  { id: "documents" as View, label: "Documentos", icon: SquaresFour },
  { id: "review" as View, label: "Revisão humana", icon: UserFocus },
  { id: "metrics" as View, label: "Métricas", icon: ChartBar },
  { id: "atlas" as View, label: "Governança Atlas", icon: Fingerprint },
];

const kindLabels: Record<DetectionKind, string> = {
  equipment: "Equipamento",
  instrument: "Instrumento",
  valve: "Válvula",
  tag: "TAG",
};

const kindIcons: Record<DetectionKind, typeof GearSix> = {
  equipment: GearSix,
  instrument: Pulse,
  valve: SlidersHorizontal,
  tag: Crosshair,
};

const profileLabels: Record<DiagramSample["profile"], string> = {
  clean: "Caso limpo",
  dense: "Alta densidade",
  "low-resolution": "Baixa resolução",
  reference: "Prancha de referência",
};

const confidenceLabel = (value: number) => {
  if (value >= 0.88) return "Alta";
  if (value >= 0.78) return "Moderada";
  if (value < 0.55) return "Crítica";
  return "Revisão";
};

const timeStamp = () =>
  new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());

export default function PIDLensApp() {
  const [activeView, setActiveView] = useState<View>("overview");
  const [sample, setSample] = useState<DiagramSample>(samples[0]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [detections, setDetections] = useState<Detection[]>(referenceDetections);
  const [analysisState, setAnalysisState] = useState<AnalysisState>("reference");
  const [analysisProgress, setAnalysisProgress] = useState(1);
  const [analysisMessage, setAnalysisMessage] = useState("Amostra curada pronta para inspeção");
  const [selectedDetection, setSelectedDetection] = useState<string | null>(referenceDetections[0]?.id ?? null);
  const [kindFilter, setKindFilter] = useState<DetectionKind | "all">("all");
  const [zoom, setZoom] = useState(1);
  const diagramScrollRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest(".detection-box")) return;
    const container = diagramScrollRef.current;
    if (!container) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current || !diagramScrollRef.current) return;
    e.preventDefault();
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    diagramScrollRef.current.scrollLeft = dragStartRef.current.scrollLeft - dx;
    diagramScrollRef.current.scrollTop = dragStartRef.current.scrollTop - dy;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      setZoom((value) => Math.min(2.8, Math.max(0.5, Number((value + delta).toFixed(2)))));
    }
  };

  const resetZoomAndPan = () => {
    setZoom(1);
    if (diagramScrollRef.current) {
      diagramScrollRef.current.scrollTo({ left: 0, top: 0, behavior: "smooth" });
    }
  };

  const centerOnDetection = (det: Detection) => {
    setSelectedDetection(det.id);
    const container = diagramScrollRef.current;
    if (!container) return;
    const canvasWidth = container.scrollWidth;
    const canvasHeight = container.scrollHeight;
    const targetX = ((det.box.x + det.box.width / 2) / sample.width) * canvasWidth;
    const targetY = ((det.box.y + det.box.height / 2) / sample.height) * canvasHeight;

    container.scrollTo({
      left: Math.max(0, targetX - container.clientWidth / 2),
      top: Math.max(0, targetY - container.clientHeight / 2),
      behavior: "smooth",
    });
  };

  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("document");
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [selectedTopologyNode, setSelectedTopologyNode] = useState("p03");
  const [routeId, setRouteId] = useState("side-stream");
  const [audit, setAudit] = useState<AuditEvent[]>(() => {
    if (typeof window === "undefined") return initialAudit;
    try {
      const stored = window.localStorage.getItem(AUDIT_STORAGE_KEY);
      return stored ? JSON.parse(stored) : initialAudit;
    } catch {
      return initialAudit;
    }
  });
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(audit.slice(0, 80)));
    } catch {
      // The session remains functional in memory.
    }
  }, [audit]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 5200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const activeImage = sample.image;
    return () => {
      if (activeImage.startsWith("blob:")) URL.revokeObjectURL(activeImage);
    };
  }, [sample.image]);

  const filteredDetections = useMemo(
    () => detections.filter((item) => kindFilter === "all" || item.kind === kindFilter),
    [detections, kindFilter],
  );

  const selected = useMemo(
    () => detections.find((item) => item.id === selectedDetection) ?? detections[0] ?? null,
    [detections, selectedDetection],
  );

  const topologyData = useMemo(() => {
    if (sample.id === "distillation-train" && sample.referenceReady) {
      return {
        nodes: topologyNodes,
        edges: topologyEdges,
        routes: flowRoutes,
      };
    }
    return generateTopologyFromDetections(detections, sample.width, sample.height);
  }, [sample.id, sample.referenceReady, sample.width, sample.height, detections]);

  const synchronizedTopologyNode = useMemo(
    () => topologyNodeByDetection(selectedDetection, topologyData.nodes),
    [selectedDetection, topologyData.nodes],
  );
  const activeTopologyNodeId = useMemo(() => {
    if (synchronizedTopologyNode?.id) return synchronizedTopologyNode.id;
    if (topologyData.nodes.some((n) => n.id === selectedTopologyNode)) return selectedTopologyNode;
    return topologyData.nodes[0]?.id ?? "p03";
  }, [synchronizedTopologyNode, selectedTopologyNode, topologyData.nodes]);

  const reviewQueue = useMemo(
    () => detections.filter((item) => item.status === "review"),
    [detections],
  );

  const isolatedNodes = useMemo(() => {
    const connected = new Set<string>();
    for (const e of topologyData.edges) {
      connected.add(e.source);
      connected.add(e.target);
    }
    return topologyData.nodes.filter((n) => !connected.has(n.id));
  }, [topologyData]);

  const counts = useMemo(() => {
    const byKind = detections.reduce(
      (acc, item) => {
        acc[item.kind] += 1;
        return acc;
      },
      { equipment: 0, instrument: 0, valve: 0, tag: 0 },
    );
    const accepted = detections.filter((item) => item.status === "accepted").length;
    return { byKind, accepted, review: reviewQueue.length, total: detections.length };
  }, [detections, reviewQueue.length]);

  const activeAtlasAgents = useMemo(() => {
    const isRunning = analysisState === "running";
    const uncertainCount = reviewQueue.length;
    const disconnectedCount = isolatedNodes.length;
    const metrics = calculateSessionMetrics(detections, topologyData);

    return [
      {
        id: "orchestrator",
        name: "Atlas Orchestrator",
        authority: "L4",
        role: isRunning
          ? "Executando OCR e sequência local..."
          : `Blueprint THL-PID-BP-001 ativo (${sample.fileName})`,
        state: isRunning ? "running" : "ready",
      },
      {
        id: "vision",
        name: "Vision Analyst",
        authority: "L2",
        role: isRunning
          ? analysisMessage
          : `${detections.length} candidatos visuais mapeados`,
        state: isRunning ? "running" : "ready",
      },
      {
        id: "reviewer",
        name: "Classification Reviewer ISA-5.1",
        authority: "L1",
        role: `${metrics.isaComplianceRate}% conformidade ISA-5.1 (${counts.byKind.instrument} inst, ${counts.byKind.valve} válv, ${counts.byKind.equipment} eq)`,
        state: "ready",
      },
      {
        id: "topology",
        name: "Topology Analyst",
        authority: "L1",
        role: `${topologyData.nodes.length} nós, ${topologyData.edges.length} conexões (${metrics.topologyDensity.densityFormatted} densidade)`,
        state: disconnectedCount > 0 ? "attention" : "ready",
      },
      {
        id: "redteam",
        name: "Red Team Auditor",
        authority: "L1",
        role: uncertainCount > 0 || disconnectedCount > 0
          ? `${uncertainCount} ocorrências em revisão, ${disconnectedCount} nós sem conexões topológicas`
          : "Nenhuma inconsistência ou nó isolado detectado",
        state: uncertainCount > 0 || disconnectedCount > 0 ? "attention" : "ready",
      },
      {
        id: "ml-engine",
        name: "ML Pattern Engine",
        authority: "L2",
        role: `${pidMLEngine.getLearnedPatternsCount()} padrões aprendidos localmente com o usuário`,
        state: "ready",
      },
    ];
  }, [analysisState, analysisMessage, sample.fileName, detections, topologyData, reviewQueue.length, isolatedNodes.length, counts]);

  const appendAudit = (agent: string, action: string, status = "passed") => {
    setAudit((events) => [
      { id: `audit-${Date.now()}-${events.length}`, time: timeStamp(), agent, action, status },
      ...events,
    ]);
  };

  const chooseSample = (id: string) => {
    const next = samples.find((item) => item.id === id);
    if (!next) return;
    setSample(next);
    setUploadedFile(null);
    setZoom(1);
    setKindFilter("all");
    const sampleDets = getDetectionsForSample(next.id);
    setDetections(sampleDets);
    setSelectedDetection(sampleDets[0]?.id ?? null);
    if (next.referenceReady) {
      setAnalysisState("reference");
      setAnalysisProgress(1);
      setAnalysisMessage("Amostra curada pronta para inspeção");
      appendAudit("Atlas Orchestrator", `Amostra ${next.fileName} carregada com referência curada`);
      appendAudit("Topology Analyst", `Topologia curada de referência carregada para ${next.fileName}`);
    } else {
      setAnalysisState("ready");
      setAnalysisProgress(1);
      setAnalysisMessage(`Topologia dinâmica ativa (${sampleDets.length} detecções)`);
      appendAudit("Atlas Orchestrator", `Amostra ${next.fileName} carregada com topologia dinâmica`);
      appendAudit("Topology Analyst", `Topologia sintetizada dinamicamente para ${next.fileName}`);
      appendAudit("Classification Reviewer ISA-5.1", `Regras ISA-5.1 aplicadas à amostra ${next.fileName}`);
      const uncertain = sampleDets.filter((d) => d.status === "review").length;
      if (uncertain > 0) {
        appendAudit("Red Team Auditor", `${uncertain} detecções de baixa confiança encaminhadas para revisão`, "attention");
      }
    }
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setNotice("Nesta versão, o processamento ao vivo aceita imagens JPG, PNG e WebP.");
      return;
    }
    if (file.size > MAX_LOCAL_FILE_SIZE) {
      setNotice("O arquivo ultrapassa o limite local de 25 MB desta demonstração.");
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    try {
      image.src = url;
      await image.decode();
    } catch {
      URL.revokeObjectURL(url);
      setNotice("O navegador não conseguiu decodificar esta imagem.");
      return;
    }
    setSample({
      id: `upload-${Date.now()}`,
      title: file.name.replace(/\.[^.]+$/, ""),
      fileName: file.name,
      image: url,
      width: image.naturalWidth,
      height: image.naturalHeight,
      profile: "dense",
      description: "Arquivo local selecionado pelo usuário. Nenhum pixel sai deste dispositivo.",
      referenceReady: false,
    });
    setUploadedFile(file);
    setDetections([]);
    setSelectedDetection(null);
    setAnalysisState("ready");
    setAnalysisProgress(0);
    setAnalysisMessage("Arquivo isolado no navegador. Execute o OCR local para gerar topologia.");
    setActiveView("analysis");
    appendAudit("Constitution Engine", `Arquivo ${file.name} isolado em memória local`);
    appendAudit("Atlas Orchestrator", `Novo documento ${file.name} preparado para análise local`);
  };

  const runAnalysis = async () => {
    setAnalysisState("running");
    setAnalysisProgress(0.03);
    setAnalysisMessage("Constituição e Blueprint validados");
    setDetections([]);
    setSelectedDetection(null);
    appendAudit("Atlas Orchestrator", `Execução local iniciada para ${sample.fileName}`);

    try {
      const source = uploadedFile ?? sample.image;
      const result = await runLocalOcr(source, (progress, status) => {
        setAnalysisProgress(Math.max(0.08, progress));
        const messages: Record<string, string> = {
          "loading tesseract core": "Carregando motor neural local",
          "initializing tesseract": "Inicializando OCR local",
          "loading language traineddata": "Carregando modelo de linguagem offline",
          "initializing api": "Preparando análise em memória",
          "recognizing text": "Vision Analyst reconhecendo TAGs",
        };
        setAnalysisMessage(messages[status] ?? "Processando documento localmente");
      });
      setDetections(result);
      setSelectedDetection(result[0]?.id ?? null);
      setAnalysisProgress(1);
      setAnalysisState("complete");
      setAnalysisMessage(`${result.length} candidatos localizados sem chamada externa`);
      appendAudit("Vision Analyst", `${result.length} candidatos produzidos por OCR neural local`);
      appendAudit("Classification Reviewer ISA-5.1", `Conformidade ISA-5.1 calculada sobre ${result.length} detecções`);
      appendAudit("Topology Analyst", `Topologia dinâmica gerada via proximidade espacial e BFS`);
      const uncertain = result.filter((item) => item.status === "review").length;
      appendAudit("Red Team Auditor", `${uncertain} ocorrências encaminhadas para o gate de revisão humana`, uncertain ? "attention" : "passed");
    } catch (error) {
      setAnalysisState("error");
      setAnalysisProgress(0);
      setAnalysisMessage("O motor OCR local não concluiu a leitura");
      setNotice(error instanceof Error ? error.message : "Falha inesperada no OCR local.");
      appendAudit("Red Team Auditor", "Falha do OCR preservada sem inventar resultados", "blocked");
      const fallbackDets = getDetectionsForSample(sample.id);
      setDetections(fallbackDets);
      setSelectedDetection(fallbackDets[0]?.id ?? null);
    }
  };

  const restoreReference = () => {
    chooseSample("distillation-train");
    setActiveView("analysis");
  };

  const selectTopologyNode = (node: TopologyNode) => {
    setSelectedTopologyNode(node.id);
    setSelectedDetection(node.detectionId ?? null);
  };

  const selectRoute = (id: string) => {
    setRouteId(id);
    const route = topologyData.routes.find((r) => r.id === id);
    const routeName = route?.name ?? (id === "feed-column" ? "Alimentação da coluna" : id === "bottoms-transfer" ? "Transferência de fundo" : id === "overhead-route" ? "Corrente de topo" : "Corrente intermediária");
    appendAudit("Topology Analyst", `Rota ${routeName} ativada`);
  };

  const confirmImpact = (node: TopologyNode) => {
    appendAudit("Human Review Gate", `Escopo topológico de ${node.label} confirmado por Matheus`, "human");
    setNotice(`Escopo de ${node.label} registrado na trilha local.`);
  };

  const locateEvidence = (detectionId: string) => {
    setSelectedDetection(detectionId);
    setAnalysisMode("document");
    setActiveView("analysis");
  };

  const openDocument = (id: string) => {
    chooseSample(id);
    setAnalysisMode("document");
    setActiveView("analysis");
  };

  const resolveReview = (id: string, decision: "accepted" | "rejected") => {
    const target = detections.find((item) => item.id === id);
    if (!target) return;
    setDetections((items) => items.map((item) => (item.id === id ? { ...item, status: decision } : item)));
    if (decision === "accepted") {
      pidMLEngine.trainSample(target.label, target.box, sample.width, sample.height, target.kind);
      appendAudit("ML Training Engine", `Modelo treinado localmente com padrão de ${target.kind}: ${target.label}`, "human");
      setNotice(`Padrão aprendido pelo modelo ML local: ${target.label} (${target.kind}).`);
    } else {
      appendAudit("Human Review Gate", `${target.label} rejeitado por decisão do engenheiro`, "human");
      setNotice(`Decisão registrada na memória local: ${target.label}.`);
    }
  };

  const [exportModalOpen, setExportModalOpen] = useState(false);

  const handleExport = (format: "json" | "graphml" | "csv" | "svg" | "report" | "dxf") => {
    if (format === "json") {
      const content = exportToJson({
        diagram: sample,
        detections,
        topology: topologyData,
        audit,
        activeRouteId: routeId,
        selectedNodeId: activeTopologyNodeId,
      });
      triggerFileDownload(content, `${sample.id}-engineering-model.json`, "application/json");
      appendAudit("Atlas Orchestrator", `Exportação JSON completa gerada para ${sample.fileName}`, "human");
      setNotice(`Arquivo JSON de engenharia baixado: ${sample.fileName}.`);
    } else if (format === "graphml") {
      const content = exportToGraphML(topologyData, sample.title);
      triggerFileDownload(content, `${sample.id}-topology.graphml`, "application/xml");
      appendAudit("Topology Analyst", `Topologia GraphML exportada para Cytoscape/Gephi (${sample.fileName})`, "human");
      setNotice(`Topologia GraphML exportada (${topologyData.nodes.length} nós, ${topologyData.edges.length} arestas).`);
    } else if (format === "csv") {
      const content = exportToCsv(detections, topologyData);
      triggerFileDownload(content, `${sample.id}-instrument-equipment-index.csv`, "text/csv;charset=utf-8;");
      appendAudit("Classification Reviewer ISA-5.1", `Índice de Instrumentos & Equipamentos CSV exportado`, "human");
      setNotice(`Índice CSV com ${detections.length} itens exportado.`);
    } else if (format === "svg") {
      const content = exportToSvg(sample, detections, topologyData);
      triggerFileDownload(content, `${sample.id}-vector-overlay.svg`, "image/svg+xml;charset=utf-8;");
      appendAudit("Vision Analyst", `Vetor SVG com camadas industriais exportado (${sample.fileName})`, "human");
      setNotice(`Vetor SVG com caixas e malha topológica exportado.`);
    } else if (format === "report") {
      const content = exportToMarkdownReport({
        diagram: sample,
        detections,
        topology: topologyData,
        audit,
      });
      triggerFileDownload(content, `${sample.id}-technical-audit-report.md`, "text/markdown;charset=utf-8;");
      appendAudit("Red Team Auditor", `Relatório de Auditoria Técnica e PSM exportado em Markdown`, "human");
      setNotice(`Relatório técnico executivo de auditoria baixado.`);
    } else if (format === "dxf") {
      const content = exportToDxf(detections, topologyData, sample);
      triggerFileDownload(content, `${sample.id}-cad-model.dxf`, "application/dxf;charset=utf-8;");
      appendAudit("Topology Analyst", `Arquivo CAD DXF (AutoCAD R2000) gerado com camadas de projeto`, "human");
      setNotice(`Modelo CAD DXF industrial exportado.`);
    }
    setExportModalOpen(false);
  };

  const startDemo = () => {
    setActiveView("analysis");
    setAnalysisMode("document");
    setPresentationOpen(true);
    restoreReference();
  };

  return (
    <Theme theme="white">
      <div className="atlas-app">
        <header className="topbar">
          <button className="brand-lockup" onClick={() => setActiveView("overview")} aria-label="Abrir visão geral">
            <Image className="brand-mark-image" src="/brand/marks/rastro-mark.svg" alt="" width={40} height={40} priority />
            <span className="brand-copy">
              <strong>RASTRO</strong>
              <small>P&amp;ID LENS</small>
            </span>
          </button>
          <div className="topbar-actions">
            <span className="privacy-state"><CloudSlash size={16} weight="bold" /> Sem transmissão externa</span>
            <Button kind="ghost" size="sm" renderIcon={BookOpenText} onClick={() => setPresentationOpen(true)}>
              Roteiro de 15 min
            </Button>
          </div>
        </header>

        <aside className="sidebar" aria-label="Navegação principal">
          <button className="sidebar-brand" onClick={() => setActiveView("overview")} aria-label="Abrir visão geral">
            <Image src="/brand/marks/rastro-mark.svg" alt="" width={58} height={58} priority />
            <span><strong>RASTRO</strong><small>P&amp;ID LENS</small></span>
          </button>
          <nav>
            {navigation.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`nav-item ${activeView === id ? "active" : ""}`}
                onClick={() => setActiveView(id)}
                aria-current={activeView === id ? "page" : undefined}
              >
                <Icon size={19} weight={activeView === id ? "fill" : "regular"} />
                <span>{label}</span>
                {id === "review" && reviewQueue.length > 0 && <b>{reviewQueue.length}</b>}
              </button>
            ))}
          </nav>
          <div className="sidebar-foot">
            <div className="team-chip">
              <span>JS</span>
              <div><strong>Jonas Silva</strong><small>Engenheiro</small></div>
            </div>
            <div className="offline-note"><LockKey size={15} /> Runtime local protegido</div>
          </div>
        </aside>

        <main className="workspace">
          {activeView === "overview" && (
            <Overview counts={counts} sample={sample} samplesCount={samples.length} onStart={startDemo} onAtlas={() => setActiveView("atlas")} />
          )}

          {activeView === "analysis" && (
            <section className="page analysis-page" aria-labelledby="analysis-title">
              <PageHeader
                title="Análise com evidência visual"
                description="OCR neural local, regras explicáveis e revisão humana em um único fluxo."
                actions={
                  <>
                    <Button kind="secondary" size="md" renderIcon={FileArrowUp} onClick={() => fileInputRef.current?.click()}>
                      Abrir imagem
                    </Button>
                    <Button kind="primary" size="md" renderIcon={Play} onClick={runAnalysis} disabled={analysisState === "running"}>
                      {analysisState === "running" ? "Analisando" : "Executar OCR local"}
                    </Button>
                    <input
                      ref={fileInputRef}
                      className="sr-only"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => event.target.files?.[0] && handleFile(event.target.files[0])}
                    />
                  </>
                }
              />

              <div className="analysis-toolbar">
                <label>
                  <span>Documento</span>
                  <select value={samples.some((item) => item.id === sample.id) ? sample.id : "upload"} onChange={(event) => chooseSample(event.target.value)}>
                    {!samples.some((item) => item.id === sample.id) && <option value="upload">{sample.fileName}</option>}
                    {samples.map((item) => <option key={item.id} value={item.id}>{item.fileName} - {item.title}</option>)}
                  </select>
                </label>
                <div className="document-facts">
                  <span><FileImage size={16} /> {sample.width} x {sample.height}</span>
                  <span>{profileLabels[sample.profile]}</span>
                  <span className="mode-fact">{analysisState === "reference" ? "Referência curada" : "Medição local"}</span>
                </div>
                {sample.referenceReady && analysisState !== "reference" && (
                  <Button kind="ghost" size="sm" onClick={restoreReference}>Restaurar referência</Button>
                )}
              </div>

              <AnalysisModeTabs
                mode={analysisMode}
                onChange={setAnalysisMode}
                heatmap={heatmapEnabled}
                onHeatmap={() => setHeatmapEnabled((value) => !value)}
              />

              {analysisState === "running" && (
                <div className="analysis-progress" aria-live="polite">
                  <div><Cpu size={18} /><span>{analysisMessage}</span></div>
                  <ProgressBar label="Progresso da análise" hideLabel value={Math.round(analysisProgress * 100)} max={100} />
                </div>
              )}

              {analysisState === "error" && (
                <InlineNotification
                  kind="error"
                  lowContrast
                  title="Análise interrompida"
                  subtitle="Nenhum resultado foi inventado. A amostra curada permanece disponível como fallback."
                  hideCloseButton
                />
              )}

              {analysisMode === "document" && <div className="analysis-grid">
                <article className="viewer-panel">
                  <div className="panel-head">
                    <div><strong>{sample.title}</strong><span>{sample.description}</span></div>
                    <div className="zoom-controls" aria-label="Controles de zoom">
                      <button onClick={() => setZoom((value) => Math.max(0.5, Number((value - 0.15).toFixed(2))))} aria-label="Reduzir zoom"><Minus size={16} /></button>
                      <span title="Dica: segure botão esquerdo para arrastar ou use Ctrl + Scroll">{Math.round(zoom * 100)}%</span>
                      <button onClick={() => setZoom((value) => Math.min(2.8, Number((value + 0.15).toFixed(2))))} aria-label="Aumentar zoom"><Plus size={16} /></button>
                      <button onClick={resetZoomAndPan} aria-label="Ajustar à tela" title="Ajustar à tela (Resetar zoom e arrasto)"><ArrowsInSimple size={16} /></button>
                    </div>
                  </div>
                  <div
                    ref={diagramScrollRef}
                    className="diagram-scroll"
                    style={{ cursor: isDragging ? "grabbing" : "grab", userSelect: isDragging ? "none" : "auto" }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                  >
                    <div className="diagram-canvas" style={{ width: `${zoom * 100}%` }}>
                      <Image
                        src={sample.image}
                        alt={`Diagrama P&ID ${sample.title}`}
                        width={sample.width}
                        height={sample.height}
                        sizes="(max-width: 760px) 100vw, 68vw"
                        unoptimized
                      />
                      {heatmapEnabled && (
                        <div className="confidence-heat-layer" aria-hidden="true">
                          {filteredDetections.map((item) => (
                            <span
                              key={`heat-${item.id}`}
                              className={item.confidence >= 0.88 ? "confidence-high" : item.confidence >= 0.78 ? "confidence-moderate" : "confidence-review"}
                              style={{
                                left: `${(item.box.x / sample.width) * 100}%`,
                                top: `${(item.box.y / sample.height) * 100}%`,
                                width: `${(item.box.width / sample.width) * 100}%`,
                                height: `${(item.box.height / sample.height) * 100}%`,
                              }}
                            />
                          ))}
                        </div>
                      )}
                      <div className="detection-layer" aria-label="Detecções sobre o diagrama">
                        {filteredDetections.map((item) => (
                          <button
                            key={item.id}
                            className={`detection-box kind-${item.kind} ${item.id === selected?.id ? "selected" : ""} ${item.status === "review" ? "review" : ""} ${item.confidence < 0.55 ? "critical" : ""}`}
                            style={{
                              left: `${(item.box.x / sample.width) * 100}%`,
                              top: `${(item.box.y / sample.height) * 100}%`,
                              width: `${(item.box.width / sample.width) * 100}%`,
                              height: `${(item.box.height / sample.height) * 100}%`,
                            }}
                            onClick={() => setSelectedDetection(item.id)}
                            aria-label={`${item.label}, ${kindLabels[item.kind]}, confiança ${Math.round(item.confidence * 100)}%`}
                          >
                            <span>{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="viewer-status">
                    <span><Eye size={16} /> {counts.total} evidências</span>
                    <span><ShieldCheck size={16} /> {counts.accepted} aceitas</span>
                    <span className={counts.review ? "attention" : ""}><Warning size={16} /> {counts.review} em revisão</span>
                    <span className="viewer-status-end"><CloudSlash size={16} /> pixels processados localmente</span>
                  </div>
                </article>

                <aside className="evidence-panel">
                  <div className="panel-head compact">
                    <div><strong>Evidências</strong><span>{analysisMessage}</span></div>
                    <button className="export-icon-button" aria-label="Exportar resultados (JSON, GraphML, CSV)" onClick={() => setExportModalOpen(true)}>
                      <DownloadSimple size={17} />
                    </button>
                  </div>
                  <div className="kind-filters" role="group" aria-label="Filtrar evidências">
                    {(["all", "equipment", "instrument", "valve", "tag"] as const).map((kind) => (
                      <button key={kind} className={kindFilter === kind ? "active" : ""} onClick={() => setKindFilter(kind)}>
                        {kind === "all" ? "Todos" : kindLabels[kind]}
                      </button>
                    ))}
                  </div>
                  {filteredDetections.length ? (
                    <div className="evidence-list">
                      {filteredDetections.map((item) => {
                        const Icon = kindIcons[item.kind];
                        return (
                          <button key={item.id} className={item.id === selected?.id ? "active" : ""} onClick={() => centerOnDetection(item)}>
                            <span className={`evidence-icon kind-${item.kind}`}><Icon size={18} /></span>
                            <span className="evidence-copy"><strong>{item.label}</strong><small>{item.group}</small></span>
                            <span className={`confidence ${item.status === "review" ? "review" : ""} ${item.confidence < 0.55 ? "critical" : ""}`}>{Math.round(item.confidence * 100)}%</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <ListMagnifyingGlass size={34} />
                      <strong>Nenhum candidato exibido</strong>
                      <p>Execute o OCR local ou carregue a amostra de referência.</p>
                    </div>
                  )}
                  {selected && (
                    <div className="evidence-detail">
                      <div className="detail-title"><span>{kindLabels[selected.kind]}</span><strong>{selected.label}</strong></div>
                      <dl>
                        <div><dt>Grupo</dt><dd>{selected.group}</dd></div>
                        <div><dt>Confiança</dt><dd>{Math.round(selected.confidence * 100)}% - {confidenceLabel(selected.confidence)}</dd></div>
                        <div><dt>Origem</dt><dd>{selected.source === "local-ocr" ? "OCR neural local" : "Referência curada"}</dd></div>
                      </dl>
                      <p>{selected.rationale}</p>
                    </div>
                  )}
                </aside>
              </div>}

              {analysisMode !== "document" && topologyData.nodes.length === 0 && !sample.referenceReady && (
                <TopologyUnavailable onRestore={restoreReference} onRunOcr={runAnalysis} />
              )}

              {analysisMode === "topology" && (sample.referenceReady || topologyData.nodes.length > 0) && (
                <TopologyWorkspace
                  sample={sample}
                  detections={detections}
                  selectedDetection={selectedDetection}
                  selectedNodeId={activeTopologyNodeId}
                  routeId={routeId}
                  heatmap={heatmapEnabled}
                  onSelectDetection={setSelectedDetection}
                  onSelectNode={selectTopologyNode}
                  onRoute={selectRoute}
                  nodes={topologyData.nodes}
                  edges={topologyData.edges}
                  routes={topologyData.routes}
                />
              )}

              {analysisMode === "impact" && (sample.referenceReady || topologyData.nodes.length > 0) && (
                <ImpactWorkspace
                  detections={detections}
                  selectedNodeId={activeTopologyNodeId}
                  onSelectNode={selectTopologyNode}
                  onConfirm={confirmImpact}
                  onLocate={locateEvidence}
                  nodes={topologyData.nodes}
                  edges={topologyData.edges}
                />
              )}

              {analysisMode === "control" && (sample.referenceReady || topologyData.nodes.length > 0) && (
                <ControlWorkspace
                  detections={detections}
                  selectedNodeId={activeTopologyNodeId}
                  onSelectNode={selectTopologyNode}
                  onLocate={locateEvidence}
                  nodes={topologyData.nodes}
                  edges={topologyData.edges}
                />
              )}

              <div className="agent-strip" aria-label="Equipe de agentes Atlas">
                {activeAtlasAgents.map((agent, index) => (
                  <div key={agent.id} className={agent.state === "attention" ? "attention" : agent.state === "running" ? "running" : ""}>
                    <span>{index + 1}</span>
                    <div><strong>{agent.name}</strong><small>{agent.role}</small></div>
                    {agent.state === "attention" ? <Warning size={18} weight="fill" /> : <CheckCircle size={18} />}
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeView === "documents" && (
            <DocumentLibrary onOpen={openDocument} />
          )}

          {activeView === "review" && (
            <ReviewView queue={reviewQueue} selected={selected} setSelected={setSelectedDetection} resolve={resolveReview} onAnalysis={() => setActiveView("analysis")} sample={sample} />
          )}

          {activeView === "metrics" && (
            <MetricsView counts={counts} detections={detections} topologyData={topologyData} onExport={handleExport} />
          )}

          {activeView === "atlas" && (
            <AtlasView audit={audit} onAnalyze={() => setActiveView("analysis")} agents={activeAtlasAgents} />
          )}
        </main>

        <nav className="mobile-nav" aria-label="Navegação móvel">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} className={activeView === id ? "active" : ""} onClick={() => setActiveView(id)} aria-label={label}>
              <Icon size={20} weight={activeView === id ? "fill" : "regular"} />
            </button>
          ))}
        </nav>

        {presentationOpen && (
          <PresentationDrawer onClose={() => setPresentationOpen(false)} navigate={(view, mode) => { setActiveView(view); if (mode) setAnalysisMode(mode); setPresentationOpen(false); }} />
        )}

        {exportModalOpen && (
          <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setExportModalOpen(false)}>
            <aside className="presentation-drawer export-modal" role="dialog" aria-modal="true" aria-labelledby="export-dialog-title" style={{ maxWidth: "560px" }}>
              <div className="drawer-head">
                <div>
                  <span>Exportação de Engenharia</span>
                  <h2 id="export-dialog-title">Exportar Dados da Sessão</h2>
                </div>
                <button onClick={() => setExportModalOpen(false)} aria-label="Fechar janela de exportação">
                  <X size={19} />
                </button>
              </div>
              <p className="drawer-intro">
                Selecione o formato desejado para salvar os dados verificados de <strong>{sample.fileName}</strong> localmente no seu dispositivo.
              </p>
              <div className="presentation-phases" style={{ gap: "12px", marginTop: "16px" }}>
                <button
                  onClick={() => handleExport("json")}
                  style={{ display: "flex", alignItems: "flex-start", gap: "14px", padding: "16px", borderRadius: "8px", border: "1px solid var(--border, #e0e0e0)", background: "var(--surface-2, #f4f4f4)", cursor: "pointer", textAlign: "left", width: "100%" }}
                >
                  <DownloadSimple size={26} style={{ color: "var(--cds-interactive, #0f62fe)", flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <strong style={{ display: "block", fontSize: "15px", color: "var(--text, #161616)" }}>JSON Completo de Engenharia (.json)</strong>
                    <p style={{ margin: "4px 0 0", color: "var(--text-soft, #525252)", fontSize: "12px", lineHeight: "1.4" }}>
                      Metadados completos, detecções com caixas delimitadoras, validação ISA-5.1, grafo topológico, malhas de controle e trilha de auditoria.
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => handleExport("graphml")}
                  style={{ display: "flex", alignItems: "flex-start", gap: "14px", padding: "16px", borderRadius: "8px", border: "1px solid var(--border, #e0e0e0)", background: "var(--surface-2, #f4f4f4)", cursor: "pointer", textAlign: "left", width: "100%" }}
                >
                  <Graph size={26} style={{ color: "var(--cds-interactive, #0f62fe)", flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <strong style={{ display: "block", fontSize: "15px", color: "var(--text, #161616)" }}>Topologia XML GraphML (.graphml)</strong>
                    <p style={{ margin: "4px 0 0", color: "var(--text-soft, #525252)", fontSize: "12px", lineHeight: "1.4" }}>
                      Formato padrão da indústria compatível com Cytoscape, Gephi e ferramentas CAD para análise de caminhos e conectividade.
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => handleExport("csv")}
                  style={{ display: "flex", alignItems: "flex-start", gap: "14px", padding: "16px", borderRadius: "8px", border: "1px solid var(--border, #e0e0e0)", background: "var(--surface-2, #f4f4f4)", cursor: "pointer", textAlign: "left", width: "100%" }}
                >
                  <Table size={26} style={{ color: "var(--cds-interactive, #0f62fe)", flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <strong style={{ display: "block", fontSize: "15px", color: "var(--text, #161616)" }}>Índice de Instrumentos &amp; Equipamentos (.csv)</strong>
                    <p style={{ margin: "4px 0 0", color: "var(--text-soft, #525252)", fontSize: "12px", lineHeight: "1.4" }}>
                      Planilha formatada com UTF-8 BOM para Excel contendo lista detalhada de TAGs, tipos, classes ISA, coordenadas e conexões.
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => handleExport("svg")}
                  style={{ display: "flex", alignItems: "flex-start", gap: "14px", padding: "16px", borderRadius: "8px", border: "1px solid var(--border, #e0e0e0)", background: "var(--surface-2, #f4f4f4)", cursor: "pointer", textAlign: "left", width: "100%" }}
                >
                  <FileImage size={26} style={{ color: "var(--cds-interactive, #0f62fe)", flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <strong style={{ display: "block", fontSize: "15px", color: "var(--text, #161616)" }}>Vetor SVG com Camadas Industriais (.svg)</strong>
                    <p style={{ margin: "4px 0 0", color: "var(--text-soft, #525252)", fontSize: "12px", lineHeight: "1.4" }}>
                      Desenho vetorial escalável independente, com caixas delimitadoras coloridas por norma ISA, rótulos e arestas de processo e sinal.
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => handleExport("report")}
                  style={{ display: "flex", alignItems: "flex-start", gap: "14px", padding: "16px", borderRadius: "8px", border: "1px solid var(--border, #e0e0e0)", background: "var(--surface-2, #f4f4f4)", cursor: "pointer", textAlign: "left", width: "100%" }}
                >
                  <FileText size={26} style={{ color: "var(--cds-interactive, #0f62fe)", flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <strong style={{ display: "block", fontSize: "15px", color: "var(--text, #161616)" }}>Relatório Executivo de Auditoria (.md)</strong>
                    <p style={{ margin: "4px 0 0", color: "var(--text-soft, #525252)", fontSize: "12px", lineHeight: "1.4" }}>
                      Documento executivo em Markdown com Scorecard de Qualidade (DQS), análise de segurança PSM, malhas ISA e registro do Red Team.
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => handleExport("dxf")}
                  style={{ display: "flex", alignItems: "flex-start", gap: "14px", padding: "16px", borderRadius: "8px", border: "1px solid var(--border, #e0e0e0)", background: "var(--surface-2, #f4f4f4)", cursor: "pointer", textAlign: "left", width: "100%" }}
                >
                  <FileCode size={26} style={{ color: "var(--cds-interactive, #0f62fe)", flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <strong style={{ display: "block", fontSize: "15px", color: "var(--text, #161616)" }}>CAD Industrial AutoCAD (.dxf)</strong>
                    <p style={{ margin: "4px 0 0", color: "var(--text-soft, #525252)", fontSize: "12px", lineHeight: "1.4" }}>
                      Formato CAD universal (AutoCAD 2000 R12) com camadas padronizadas (PID_EQUIPMENT, PID_VALVES, PID_INSTRUMENTS, PID_PROCESS_PIPING).
                    </p>
                  </div>
                </button>
              </div>
            </aside>
          </div>
        )}

        {notice && <div className="toast" role="status"><CheckCircle size={18} /><span>{notice}</span><button onClick={() => setNotice(null)} aria-label="Fechar"><X size={15} /></button></div>}
      </div>
    </Theme>
  );
}

function PageHeader({ title, description, actions }: { title: string; description: string; actions?: React.ReactNode }) {
  return (
    <header className="page-header">
      <div><h1 id="analysis-title">{title}</h1><p>{description}</p></div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

function Overview({
  counts,
  sample,
  samplesCount,
  onStart,
  onAtlas,
}: {
  counts: { accepted: number; review: number; total: number };
  sample: DiagramSample;
  samplesCount: number;
  onStart: () => void;
  onAtlas: () => void;
}) {
  const completionRate = counts.total > 0 ? Math.round((counts.accepted / counts.total) * 100) : 100;
  const pendingRate = counts.total > 0 ? Math.round((counts.review / counts.total) * 100) : 0;

  return (
    <section className="overview-page dashboard-overview">
      <header className="dashboard-welcome">
        <div>
          <span className="dashboard-eyebrow">PAINEL DE RASTREABILIDADE</span>
          <h1>Bom dia, Jonas</h1>
          <p>Acompanhe os rastros dos seus documentos com inteligência local.</p>
        </div>
        <Button kind="primary" size="lg" renderIcon={Plus} onClick={onStart}>Nova análise</Button>
      </header>

      <article className="project-progress-card">
        <Image className="trace-stamp-corner" src="/brand/visual/trace-stamp.svg" alt="" width={360} height={360} aria-hidden="true" priority />
        <div className="project-progress-head">
          <div className="project-folder"><Archive size={26} /></div>
          <div><h2>{sample.fileName} - {sample.title}</h2><p><span>EM ANÁLISE</span> Atualizado localmente</p></div>
          <div className="project-percentage"><strong>{completionRate}%</strong><small>concluído</small></div>
        </div>
        <div className="project-steps" aria-label="Progresso do projeto">
          {[
            ["Documentos", "carregados", "done"],
            ["TAGs", "identificadas", "done"],
            ["Conexões", "validadas", "done"],
            ["Revisão", "manual", counts.review === 0 ? "done" : "current"],
            ["Pendências", `${counts.review} ativas`, counts.review > 0 ? "current" : "done"],
            ["Relatório", "pronto", "done"],
          ].map(([title, subtitle, state]) => (
            <div key={title} className={`project-step ${state}`}>
              <i>{state === "done" ? <Check size={15} weight="bold" /> : null}</i>
              <strong>{title}</strong><small>{subtitle}</small>
            </div>
          ))}
        </div>
      </article>

      <div className="dashboard-metrics">
        <article className="dashboard-metric metric-blue"><span><FileImage size={25} /></span><div><strong>{samplesCount}</strong><p>documentos</p><small>amostras e uploads locais</small></div></article>
        <article className="dashboard-metric metric-lime"><span><Crosshair size={25} /></span><div><strong>{counts.total}</strong><p>tags identificadas</p><small>{counts.accepted} verificadas</small></div></article>
        <article className="dashboard-metric metric-coral"><span><Warning size={25} /></span><div><strong>{counts.review}</strong><p>pendências</p><small>{counts.review > 0 ? "revisão humana necessária" : "todas revisadas"}</small></div></article>
      </div>

      <div className="dashboard-main-grid">
        <article className="recent-analysis-card">
          <div className="dashboard-section-head">
            <div><span>DOCUMENTO ATIVO</span><h2>{sample.fileName} - {sample.title}</h2></div>
            <button onClick={onStart}>Ver no documento <Eye size={17} /></button>
          </div>
          <div className="recent-diagram">
            <Image src={sample.image} alt={`P&ID ${sample.title} com evidências identificadas`} width={sample.width} height={sample.height} sizes="(max-width: 1100px) 100vw, 60vw" priority unoptimized style={{ width: "100%", height: "auto", maxHeight: "320px", objectFit: "contain", background: "#fdfdfd" }} />
            <Image className="diagram-trace-stamp" src="/brand/visual/trace-stamp.svg" alt="" width={300} height={300} aria-hidden="true" />
          </div>
          <footer><span>{counts.total} evidências encontradas</span><span>Coordenadas locais • {sample.width} x {sample.height} px</span></footer>
        </article>

        <div className="dashboard-side-column">
          <article className="activity-card">
            <div className="dashboard-section-head"><div><span>ÚLTIMOS EVENTOS</span><h2>Atividade</h2></div></div>
            <ol>
              <li className="success"><i><Check size={12} weight="bold" /></i><div><strong>Sessão ativa em {sample.fileName}</strong><small>Processamento 100% offline</small></div></li>
              <li className="info"><i /><div><strong>Modelo ML Local pronto</strong><small>Classificador ISA-5.1 e k-NN ativo</small></div></li>
              <li className={counts.review > 0 ? "alert" : "success"}><i>{counts.review > 0 ? "!" : <Check size={12} weight="bold" />}</i><div><strong>{counts.review > 0 ? `${counts.review} pendências ativas` : "Nenhuma pendência"}</strong><small>Gate de soberania humana</small></div></li>
              <li className="success"><i><Check size={12} weight="bold" /></i><div><strong>Topologia dinâmica sintetizada</strong><small>Nós e conexões espaciais</small></div></li>
            </ol>
            <button className="text-action" onClick={onAtlas}>Ver trilha completa</button>
          </article>

          <article className="project-health-card">
            <div className="dashboard-section-head"><div><span>STATUS GERAL</span><h2>Saúde do projeto</h2></div></div>
            <div className="health-content">
              <div className="health-ring" aria-label={`Saúde do projeto: ${completionRate} por cento`}><span>{completionRate}%</span><small>saudável</small></div>
              <dl>
                <div><dt><i className="lime-dot" />Documentos</dt><dd>100%</dd></div>
                <div><dt><i className="blue-dot" />Validação</dt><dd>{completionRate}%</dd></div>
                <div><dt><i className="coral-dot" />Pendências</dt><dd>{pendingRate}%</dd></div>
              </dl>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function ReviewView({
  queue,
  selected,
  setSelected,
  resolve,
  onAnalysis,
  sample,
}: {
  queue: Detection[];
  selected: Detection | null;
  setSelected: (id: string) => void;
  resolve: (id: string, decision: "accepted" | "rejected") => void;
  onAnalysis: () => void;
  sample: DiagramSample;
}) {
  const reviewSelected = selected?.status === "review" ? selected : queue[0] ?? null;

  let cropX = 0;
  let cropY = 0;
  let cropW = 100;
  let cropH = 100;

  if (reviewSelected) {
    const padX = Math.max(30, reviewSelected.box.width * 0.4);
    const padY = Math.max(30, reviewSelected.box.height * 0.4);
    cropX = Math.max(0, reviewSelected.box.x - padX);
    cropY = Math.max(0, reviewSelected.box.y - padY);
    cropW = Math.min(sample.width - cropX, reviewSelected.box.width + padX * 2);
    cropH = Math.min(sample.height - cropY, reviewSelected.box.height + padY * 2);
  }

  return (
    <section className="page review-page">
      <PageHeader title="Revisão humana" description="A soberania humana aplicada a cada evidência de baixa confiança." />
      {queue.length ? (
        <div className="review-layout">
          <div className="review-queue">
            <div className="section-head"><div><h2>Fila de decisão</h2><p>{queue.length} ocorrências aguardando Matheus</p></div><span>{queue.length}</span></div>
            <div className="review-list">
              {queue.map((item) => (
                <button key={item.id} className={reviewSelected?.id === item.id ? "active" : ""} onClick={() => setSelected(item.id)}>
                  <span className={`evidence-icon kind-${item.kind}`}>{kindLabels[item.kind].slice(0, 1)}</span>
                  <div><strong>{item.label}</strong><small>{item.group}</small></div>
                  <b>{Math.round(item.confidence * 100)}%</b>
                </button>
              ))}
            </div>
          </div>
          {reviewSelected && (
            <article className="review-decision">
              <div className="decision-top"><span>DEC-{reviewSelected.id.toUpperCase()}</span><strong>Decisão requerida</strong></div>
              <div className="decision-confidence"><span>{Math.round(reviewSelected.confidence * 100)}%</span><div><strong>{confidenceLabel(reviewSelected.confidence)} confiança</strong><small>abaixo do gate de aceitação de 78%</small></div></div>

              <div className="review-visual-crop" style={{
                margin: "14px 0",
                borderRadius: "8px",
                border: "1px solid var(--border, #e0e0e0)",
                background: "#ffffff",
                overflow: "hidden",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
              }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  background: "var(--surface-2, #f4f4f4)",
                  borderBottom: "1px solid var(--border, #e0e0e0)",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--text-secondary, #525252)"
                }}>
                  <span>Recorte do Símbolo no Diagrama ({sample.fileName})</span>
                  <span style={{ fontFamily: "monospace" }}>
                    X: {Math.round(reviewSelected.box.x)} Y: {Math.round(reviewSelected.box.y)} • {Math.round(reviewSelected.box.width)}x{Math.round(reviewSelected.box.height)}px
                  </span>
                </div>
                <div style={{ height: "160px", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f9fa", position: "relative" }}>
                  <svg
                    viewBox={`${cropX} ${cropY} ${cropW} ${cropH}`}
                    preserveAspectRatio="xMidYMid meet"
                    style={{ width: "100%", height: "100%", maxHeight: "160px" }}
                    aria-label={`Recorte do símbolo ${reviewSelected.label}`}
                  >
                    <image href={sample.image} width={sample.width} height={sample.height} />
                    <rect
                      x={reviewSelected.box.x}
                      y={reviewSelected.box.y}
                      width={reviewSelected.box.width}
                      height={reviewSelected.box.height}
                      fill="rgba(218, 30, 40, 0.12)"
                      stroke="#da1e28"
                      strokeWidth={Math.max(2, cropW / 140)}
                      strokeDasharray="5 3"
                    />
                  </svg>
                </div>
              </div>

              <dl>
                <div><dt>Leitura</dt><dd>{reviewSelected.label}</dd></div>
                <div><dt>Classe sugerida</dt><dd>{kindLabels[reviewSelected.kind]}</dd></div>
                <div><dt>Grupo</dt><dd>{reviewSelected.group}</dd></div>
                <div><dt>Fonte</dt><dd>{reviewSelected.source === "local-ocr" ? "OCR neural local" : "Referência curada"}</dd></div>
              </dl>
              <div className="decision-rationale"><Brain size={19} /><p>{reviewSelected.rationale}</p></div>
              <div className="redteam-finding"><Warning size={19} weight="fill" /><div><strong>Achado do Red Team</strong><p>A evidência deve ser confirmada visualmente antes de entrar no conjunto aceito. Sua aprovação treina o motor de Machine Learning localmente.</p></div></div>
              <div className="decision-actions">
                <Button kind="danger--tertiary" size="lg" renderIcon={XCircle} onClick={() => resolve(reviewSelected.id, "rejected")}>Rejeitar</Button>
                <Button kind="primary" size="lg" renderIcon={Check} onClick={() => resolve(reviewSelected.id, "accepted")}>Aceitar evidência</Button>
              </div>
            </article>
          )}
        </div>
      ) : (
        <div className="review-empty"><CheckCircle size={44} weight="fill" /><h2>Fila concluída</h2><p>Nenhuma evidência precisa de decisão humana neste momento.</p><Button kind="tertiary" onClick={onAnalysis}>Voltar para análise</Button></div>
      )}
    </section>
  );
}

function MetricsView({
  counts,
  detections,
  topologyData,
  onExport,
}: {
  counts: { byKind: Record<DetectionKind, number>; accepted: number; review: number; total: number };
  detections: Detection[];
  topologyData: { nodes: TopologyNode[]; edges: TopologyEdge[]; routes: FlowRoute[] };
  onExport: (format: "json" | "graphml" | "csv" | "svg" | "report" | "dxf") => void;
}) {
  const metrics = useMemo(
    () => calculateSessionMetrics(detections, topologyData),
    [detections, topologyData],
  );
  const acceptedRate = metrics.acceptedRate;
  const averageConfidence = metrics.averageConfidence;

  return (
    <section className="page metrics-page">
      <PageHeader
        title="Métricas e Análises Avançadas de Engenharia"
        description="Scorecard de Qualidade (DQS), Espectro de Variáveis ISA-5.1, Segurança de Processo (PSM), Centralidade Topológica e Matriz de Confusão."
        actions={
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <Button kind="secondary" size="md" renderIcon={DownloadSimple} onClick={() => onExport("json")}>
              JSON
            </Button>
            <Button kind="secondary" size="md" renderIcon={Table} onClick={() => onExport("csv")}>
              CSV
            </Button>
            <Button kind="secondary" size="md" renderIcon={FileImage} onClick={() => onExport("svg")}>
              SVG Vetorial
            </Button>
            <Button kind="secondary" size="md" renderIcon={FileText} onClick={() => onExport("report")}>
              Relatório MD
            </Button>
            <Button kind="secondary" size="md" renderIcon={FileCode} onClick={() => onExport("dxf")}>
              CAD DXF
            </Button>
            <Button kind="tertiary" size="md" renderIcon={Graph} onClick={() => onExport("graphml")}>
              GraphML
            </Button>
          </div>
        }
      />

      <div className="metric-ledger" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
        <div>
          <span>Candidatos na sessão</span>
          <strong>{metrics.totalDetections}</strong>
          <small>{metrics.acceptedCount} aceitos • {metrics.reviewCount} em revisão</small>
        </div>
        <div>
          <span>Acurácia da sessão</span>
          <strong>{metrics.confusionMatrix.accuracy}%</strong>
          <small>F1-score macro: {metrics.confusionMatrix.macroF1}%</small>
        </div>
        <div>
          <span>Conformidade ISA-5.1</span>
          <strong>{metrics.isaComplianceRate}%</strong>
          <small>{metrics.isaCompliantCount} conformes • {metrics.controlLoopsCount} malhas</small>
        </div>
        <div>
          <span>Densidade topológica</span>
          <strong>{metrics.topologyDensity.densityFormatted}</strong>
          <small>{metrics.topologyDensity.totalEdges} arestas em {metrics.topologyDensity.totalNodes} nós</small>
        </div>
        <div>
          <span>Quality Score (DQS)</span>
          <strong>{metrics.qualityScore.score}/100</strong>
          <small>{metrics.qualityScore.maturityLevel}</small>
        </div>
        <div>
          <span>Economia de Engenharia</span>
          <strong>~{metrics.qualityScore.hoursSaved}h</strong>
          <small>{acceptedRate}% automação direta</small>
        </div>
      </div>

      <div className="metrics-layout" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))" }}>
        {/* Painel 1: Espectro de Variáveis de Processo */}
        <article className="distribution-panel" style={{ minHeight: "340px" }}>
          <div className="section-head">
            <div>
              <h2>Espectro de Variáveis de Processo (ISA-5.1)</h2>
              <p>Distribuição de instrumentos por grandeza física monitorada</p>
            </div>
            <ChartBar size={22} />
          </div>
          <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {metrics.variableBreakdown.map((item) => (
              <div key={item.code} style={{ display: "grid", gridTemplateColumns: "170px 1fr 65px", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "12px", color: "var(--text, #161616)", fontWeight: 500, display: "flex", alignItems: "center", gap: "6px" }}>
                  <i style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: item.color }} />
                  {item.name}
                </span>
                <div style={{ background: "var(--surface-3, #e0e0e0)", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ background: item.color, height: "100%", width: `${Math.max(4, item.percentage)}%`, borderRadius: "4px", transition: "width 0.4s ease" }} />
                </div>
                <strong style={{ fontSize: "12px", textAlign: "right", fontFamily: "var(--font-geist-mono), monospace" }}>
                  {item.count} <small style={{ fontWeight: 400, color: "var(--muted, #8d8d8d)" }}>({item.percentage}%)</small>
                </strong>
              </div>
            ))}
          </div>
        </article>

        {/* Painel 2: Segurança de Processo (PSM & Elementos Críticos) */}
        <article className="confidence-panel" style={{ minHeight: "340px" }}>
          <div className="section-head">
            <div>
              <h2>Segurança de Processo &amp; Salvaguardas (PSM)</h2>
              <p>Elementos Críticos de Segurança (SCE) e barreiras operacionais</p>
            </div>
            <ShieldCheck size={22} />
          </div>
          <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
              <div style={{ background: "var(--surface-3, #f4f4f4)", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border, #e0e0e0)" }}>
                <span style={{ fontSize: "11px", color: "var(--text-soft, #525252)", display: "block" }}>Válvulas Alívio</span>
                <strong style={{ fontSize: "20px", color: "#da1e28", fontFamily: "var(--font-geist-mono), monospace" }}>{metrics.safetyMetrics.reliefValvesCount}</strong>
                <small style={{ fontSize: "9px", color: "var(--muted, #8d8d8d)", display: "block" }}>PSV / PRV / Ruptura</small>
              </div>
              <div style={{ background: "var(--surface-3, #f4f4f4)", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border, #e0e0e0)" }}>
                <span style={{ fontSize: "11px", color: "var(--text-soft, #525252)", display: "block" }}>Chaves Alarme</span>
                <strong style={{ fontSize: "20px", color: "#ff832b", fontFamily: "var(--font-geist-mono), monospace" }}>{metrics.safetyMetrics.alarmsCount}</strong>
                <small style={{ fontSize: "9px", color: "var(--muted, #8d8d8d)", display: "block" }}>PSH/TSH/LSH/VE</small>
              </div>
              <div style={{ background: "var(--surface-3, #f4f4f4)", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border, #e0e0e0)" }}>
                <span style={{ fontSize: "11px", color: "var(--text-soft, #525252)", display: "block" }}>Intertravamentos</span>
                <strong style={{ fontSize: "20px", color: "#0f62fe", fontFamily: "var(--font-geist-mono), monospace" }}>{metrics.safetyMetrics.interlocksCount}</strong>
                <small style={{ fontSize: "9px", color: "var(--muted, #8d8d8d)", display: "block" }}>ESD / SOV / Lógica</small>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(15, 98, 254, 0.08)", padding: "10px 14px", borderRadius: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: 500 }}>Cobertura de Salvaguardas em Equipamentos:</span>
              <strong style={{ fontSize: "16px", color: "var(--cds-interactive, #0f62fe)" }}>{metrics.safetyMetrics.safeguardCoveragePercent}%</strong>
            </div>

            <div>
              <span style={{ fontSize: "11px", color: "var(--text-soft, #525252)", display: "block", marginBottom: "6px" }}>TAGs Críticas Mapeadas na Folha:</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {metrics.safetyMetrics.items.map((tag) => (
                  <span key={tag} style={{ background: "var(--surface-2, #f4f4f4)", border: "1px solid var(--border-strong, #8d8d8d)", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontFamily: "var(--font-geist-mono), monospace", fontWeight: 600 }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </article>

        {/* Painel 3: Hubs Topológicos e Centralidade */}
        <article className="distribution-panel" style={{ minHeight: "340px" }}>
          <div className="section-head">
            <div>
              <h2>Hubs de Conectividade Topológica</h2>
              <p>Equipamentos e nós centrais com maior grau de conexões</p>
            </div>
            <Graph size={22} />
          </div>
          <div style={{ padding: "12px 24px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border, #e0e0e0)", color: "var(--muted, #8d8d8d)", textAlign: "left" }}>
                  <th style={{ padding: "8px 4px" }}>TAG do Hub</th>
                  <th style={{ padding: "8px 4px" }}>Tipo</th>
                  <th style={{ padding: "8px 4px", textAlign: "center" }}>Grau Total</th>
                  <th style={{ padding: "8px 4px", textAlign: "center" }}>Processo</th>
                  <th style={{ padding: "8px 4px", textAlign: "center" }}>Sinal</th>
                </tr>
              </thead>
              <tbody>
                {metrics.topologyHubs.map((hub) => (
                  <tr key={hub.id} style={{ borderBottom: "1px solid var(--border-light, #f0f0f0)" }}>
                    <td style={{ padding: "8px 4px", fontWeight: 600, fontFamily: "var(--font-geist-mono), monospace" }}>{hub.label}</td>
                    <td style={{ padding: "8px 4px", color: "var(--text-soft, #525252)" }}>{hub.kind}</td>
                    <td style={{ padding: "8px 4px", textAlign: "center", fontWeight: 700, color: "var(--cds-interactive, #0f62fe)" }}>{hub.degree}</td>
                    <td style={{ padding: "8px 4px", textAlign: "center", color: "#198038" }}>{hub.processConnections}</td>
                    <td style={{ padding: "8px 4px", textAlign: "center", color: "#0f62fe" }}>{hub.signalConnections}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        {/* Painel 4: Gate de Confiança & Validação Humana */}
        <article className="confidence-panel" style={{ minHeight: "340px" }}>
          <div className="section-head">
            <div>
              <h2>Gate de Confiança e Revisão</h2>
              <p>Status de aprovação pelo operador de processo</p>
            </div>
            <ShieldCheck size={22} />
          </div>
          <div className="confidence-ring">
            <svg className="confidence-orbit" viewBox="0 0 100 100" aria-hidden="true">
              <circle className="confidence-track" cx="50" cy="50" r="44" />
              <circle
                className="confidence-value"
                cx="50"
                cy="50"
                r="44"
                pathLength="100"
                style={{ strokeDasharray: `${acceptedRate} ${100 - acceptedRate}` }}
              />
            </svg>
            <div>
              <strong>{acceptedRate}%</strong>
              <span>aceitas</span>
            </div>
          </div>
          <p>
            {counts.review
              ? `${counts.review} ocorrências aguardam revisão humana. Média de confiança do modelo: ${averageConfidence}%.`
              : "Todas as ocorrências foram confirmadas pelo operador ou ultrapassaram o gate."}
          </p>
        </article>

        {/* Painel 5: Matriz de Confusão Dinâmica */}
        <article className="matrix-panel" style={{ gridColumn: "1 / -1" }}>
          <div className="section-head">
            <div>
              <h2>Matriz de Confusão Dinâmica e Métricas por Classe</h2>
              <p>Calculada em tempo real com base no status humano e na norma ANSI/ISA-5.1</p>
            </div>
            <Flask size={22} />
          </div>
          <div className="matrix-wrap">
            <div className="matrix-axis">
              <span>Real (Ground Truth)</span>
              <span>Predito (Visão / OCR)</span>
            </div>
            <div
              className="matrix-grid"
              style={{
                gridTemplateColumns: `90px repeat(${metrics.confusionMatrix.labels.length}, 1fr)`,
              }}
            >
              <span />
              {metrics.confusionMatrix.labels.map((label) => (
                <b key={`head-${label}`}>{label}</b>
              ))}
              {metrics.confusionMatrix.values.map((row, rowIndex) => [
                <b key={`label-${rowIndex}`}>{metrics.confusionMatrix.labels[rowIndex]}</b>,
                ...row.map((value, columnIndex) => (
                  <span
                    key={`${rowIndex}-${columnIndex}`}
                    className={rowIndex === columnIndex ? "diagonal" : "off-diagonal"}
                    style={{ opacity: 0.45 + Math.min(0.55, value / 15) }}
                  >
                    {value}
                  </span>
                )),
              ])}
            </div>
          </div>
          <p className="matrix-note">
            <Warning size={16} /> {metrics.confusionMatrix.note}
          </p>
          <div
            className="matrix-class-breakdown"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "10px",
              marginTop: "16px",
              padding: "0 28px 20px",
            }}
          >
            {metrics.confusionMatrix.classMetrics.map((cm) => (
              <div
                key={cm.kind}
                style={{
                  background: "var(--surface-3, #f4f4f4)",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--border, #e0e0e0)",
                }}
              >
                <strong style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>
                  {cm.label} ({cm.support})
                </strong>
                <div style={{ fontSize: "11px", color: "var(--text-soft, #525252)", display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span>Precisão: <b>{cm.precision}%</b></span>
                  <span>Revogação: <b>{cm.recall}%</b></span>
                  <span>F1-Score: <b>{cm.f1}%</b></span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function AtlasView({
  audit,
  onAnalyze,
  agents,
}: {
  audit: AuditEvent[];
  onAnalyze: () => void;
  agents: Array<{ id: string; name: string; authority: string; role: string; state: string }>;
}) {
  const principles = [
    { icon: BookOpenText, name: "Blueprint primeiro", text: "Topologia, contratos e gates aprovados antes da implementação." },
    { icon: ShieldCheck, name: "Governança constitucional", text: "Privacidade, evidência e honestidade não podem ser ignoradas." },
    { icon: Database, name: "Memória local", text: "Correções e decisões permanecem consultáveis no dispositivo." },
    { icon: Graph, name: "Topologia sem causalidade", text: "Relações curadas ajudam a investigar, mas não viram instrução operacional." },
    { icon: Flask, name: "Red Team", text: "Incertezas são expostas em vez de escondidas pela interface." },
    { icon: UserFocus, name: "Soberania humana", text: "A IA sugere. A decisão relevante continua com Matheus." },
  ];
  return (
    <section className="page atlas-page">
      <PageHeader title="Governança Atlas" description="A camada de governança do Rastro que transforma uma detecção em uma decisão verificável." actions={<Button kind="primary" renderIcon={Crosshair} onClick={onAnalyze}>Abrir análise</Button>} />
      <div className="constitution-banner">
        <div className="constitution-seal"><Fingerprint size={34} weight="duotone" /></div>
        <div><span>Constituição THL-PID-CONST-001</span><h2>7 invariantes ativos. Nenhuma exceção aberta.</h2><p>A execução é local, evidências são obrigatórias e resultados incertos dependem de aprovação humana.</p></div>
        <strong><CheckCircle size={19} weight="fill" /> Ratificada</strong>
      </div>
      <div className="atlas-layout">
        <article className="principles-panel">
          <div className="section-head"><div><h2>Princípios aplicados</h2><p>Conceitos do repositório Atlas convertidos em comportamento do produto</p></div></div>
          <div className="principles-list">
            {principles.map(({ icon: Icon, name, text }) => (
              <div key={name}><Icon size={22} /><div><strong>{name}</strong><p>{text}</p></div><CheckCircle size={18} /></div>
            ))}
          </div>
        </article>
        <article className="agents-panel">
          <div className="section-head"><div><h2>Manifesto de agentes</h2><p>Autoridade mínima e responsabilidade explícita</p></div><Cpu size={22} /></div>
          <div className="agent-cards">
            {agents.map((agent) => (
              <div key={agent.id}><span>{agent.authority}</span><strong>{agent.name}</strong><p>{agent.role}</p><small>{agent.state === "attention" ? "1 achado aberto" : "Pronto"}</small></div>
            ))}
          </div>
        </article>
        <article className="audit-panel">
          <div className="section-head"><div><h2>Trilha de auditoria</h2><p>Eventos append-only armazenados neste navegador</p></div><Archive size={22} /></div>
          <AuditTimeline audit={audit} />
        </article>
      </div>
    </section>
  );
}

function PresentationDrawer({ onClose, navigate }: { onClose: () => void; navigate: (view: View, mode?: AnalysisMode) => void }) {
  const phases: Array<{ time: string; title: string; detail: string; view: View; mode?: AnalysisMode }> = [
    { time: "2 min", title: "Problema e oportunidade", detail: "Contextualize o desafio e a privacidade industrial.", view: "overview" },
    { time: "3 min", title: "Análise ao vivo", detail: "Mostre o documento, os overlays e execute o OCR local.", view: "analysis", mode: "document" },
    { time: "4 min", title: "Topologia e impacto", detail: "Trace uma rota, selecione P-03 e confirme o escopo topológico.", view: "analysis", mode: "topology" },
    { time: "2 min", title: "Revisão humana", detail: "Decida um item de baixa confiança e registre memória.", view: "review" },
    { time: "2 min", title: "Métricas", detail: "Explique gates, distribuição e matriz de calibração.", view: "metrics" },
    { time: "2 min", title: "Por que Atlas", detail: "Feche com Constituição, agentes, auditoria e próximos passos.", view: "atlas" },
  ];
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="presentation-drawer" role="dialog" aria-modal="true" aria-labelledby="presentation-title">
        <div className="drawer-head"><div><span>Guia do apresentador</span><h2 id="presentation-title">Roteiro de 15 minutos</h2></div><button onClick={onClose} aria-label="Fechar roteiro"><X size={19} /></button></div>
        <p className="drawer-intro">Cada bloco abre diretamente a tela correspondente. Os resultados de referência garantem continuidade, enquanto o OCR local comprova a funcionalidade real.</p>
        <div className="presentation-phases">
          {phases.map((phase) => (
            <button key={phase.title} onClick={() => navigate(phase.view, phase.mode)}>
              <span>{phase.time}</span><div><strong>{phase.title}</strong><p>{phase.detail}</p></div><Play size={17} weight="fill" />
            </button>
          ))}
        </div>
        <div className="speaker-note"><Brain size={20} /><p><strong>Mensagem central:</strong> o diferencial não é apenas reconhecer símbolos. É provar de onde cada resultado veio, assumir a incerteza e preservar a decisão humana.</p></div>
      </aside>
    </div>
  );
}
