"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Button from "@carbon/react/es/components/Button/index.js";
import { InlineNotification } from "@carbon/react/es/components/Notification/Notification.js";
import ProgressBar from "@carbon/react/es/components/ProgressBar/ProgressBar.js";
import { Theme } from "@carbon/react/es/components/Theme/index.js";
import { Archive } from "@phosphor-icons/react/Archive";
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
import { FileImage } from "@phosphor-icons/react/FileImage";
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
import { UserFocus } from "@phosphor-icons/react/UserFocus";
import { Warning } from "@phosphor-icons/react/Warning";
import { X } from "@phosphor-icons/react/X";
import { XCircle } from "@phosphor-icons/react/XCircle";
import {
  atlasAgents,
  initialAudit,
  plannedConfusionMatrix,
  referenceDetections,
  samples,
  type Detection,
  type DetectionKind,
  type DiagramSample,
} from "../lib/demo-data";
import { runLocalOcr } from "../lib/local-ocr";
import { topologyNodeByDetection, type TopologyNode } from "../lib/topology-data";
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

  const synchronizedTopologyNode = useMemo(
    () => topologyNodeByDetection(selectedDetection),
    [selectedDetection],
  );
  const activeTopologyNodeId = synchronizedTopologyNode?.id ?? selectedTopologyNode;

  const reviewQueue = useMemo(
    () => detections.filter((item) => item.status === "review"),
    [detections],
  );

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
    if (next.referenceReady) {
      setDetections(referenceDetections);
      setSelectedDetection(referenceDetections[0]?.id ?? null);
      setAnalysisState("reference");
      setAnalysisProgress(1);
      setAnalysisMessage("Amostra curada pronta para inspeção");
      appendAudit("Atlas Orchestrator", `Amostra ${next.fileName} carregada com referência local`);
    } else {
      setDetections([]);
      setSelectedDetection(null);
      setAnalysisState("ready");
      setAnalysisProgress(0);
      setAnalysisMessage("Pronto para OCR neural local");
      appendAudit("Atlas Orchestrator", `Amostra ${next.fileName} preparada para análise local`);
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
    setAnalysisMessage("Arquivo isolado no navegador");
    setActiveView("analysis");
    appendAudit("Constitution Engine", `Arquivo ${file.name} isolado em memória local`);
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
      appendAudit("Vision Analyst", `${result.length} candidatos produzidos por OCR local`);
      const uncertain = result.filter((item) => item.status === "review").length;
      appendAudit("Red Team Validator", `${uncertain} ocorrências de baixa confiança expostas`, uncertain ? "attention" : "passed");
    } catch (error) {
      setAnalysisState("error");
      setAnalysisProgress(0);
      setAnalysisMessage("O motor OCR local não concluiu a leitura");
      setNotice(error instanceof Error ? error.message : "Falha inesperada no OCR local.");
      appendAudit("Red Team Validator", "Falha do OCR preservada sem inventar resultados", "blocked");
      if (sample.referenceReady) {
        setDetections(referenceDetections);
        setSelectedDetection(referenceDetections[0]?.id ?? null);
      }
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
    const routeName = id === "feed-column" ? "Alimentação da coluna" : id === "bottoms-transfer" ? "Transferência de fundo" : id === "overhead-route" ? "Corrente de topo" : "Corrente intermediária";
    appendAudit("Topology Analyst", `Rota demonstrativa ${routeName} ativada`);
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
    appendAudit("Human Review Gate", `${target.label} marcado como ${decision === "accepted" ? "aceito" : "rejeitado"} por Matheus`, "human");
    setNotice(`Decisão registrada na memória local: ${target.label}.`);
  };

  const exportResults = () => {
    const payload = {
      blueprint: "THL-PID-BP-001",
      constitution: "THL-PID-CONST-001",
      generatedAt: new Date().toISOString(),
      localOnly: true,
      diagram: { id: sample.id, title: sample.title, fileName: sample.fileName },
      detections,
      audit,
      semanticLayer: {
        status: "curated-demonstration",
        activeRoute: routeId,
        selectedNode: activeTopologyNodeId,
      },
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${sample.id}-atlas-result.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    appendAudit("Atlas Orchestrator", `Exportação local preparada para ${sample.fileName}`, "human");
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
              <span>TS</span>
              <div><strong>Matheus Sousa</strong><small>ThLoop × IASTECH</small></div>
            </div>
            <div className="offline-note"><LockKey size={15} /> Runtime local protegido</div>
          </div>
        </aside>

        <main className="workspace">
          {activeView === "overview" && (
            <Overview onStart={startDemo} onAtlas={() => setActiveView("atlas")} />
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
                      <button onClick={() => setZoom((value) => Math.max(0.7, value - 0.15))} aria-label="Reduzir zoom"><Minus size={16} /></button>
                      <span>{Math.round(zoom * 100)}%</span>
                      <button onClick={() => setZoom((value) => Math.min(2.3, value + 0.15))} aria-label="Aumentar zoom"><Plus size={16} /></button>
                    </div>
                  </div>
                  <div className="diagram-scroll">
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
                    <button className="export-icon-button" aria-label="Exportar resultados em JSON" onClick={exportResults}>
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
                          <button key={item.id} className={item.id === selected?.id ? "active" : ""} onClick={() => setSelectedDetection(item.id)}>
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

              {analysisMode !== "document" && !sample.referenceReady && (
                <TopologyUnavailable onRestore={restoreReference} />
              )}

              {analysisMode === "topology" && sample.referenceReady && (
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
                />
              )}

              {analysisMode === "impact" && sample.referenceReady && (
                <ImpactWorkspace
                  detections={detections}
                  selectedNodeId={activeTopologyNodeId}
                  onSelectNode={selectTopologyNode}
                  onConfirm={confirmImpact}
                  onLocate={locateEvidence}
                />
              )}

              {analysisMode === "control" && sample.referenceReady && (
                <ControlWorkspace
                  detections={detections}
                  selectedNodeId={activeTopologyNodeId}
                  onSelectNode={selectTopologyNode}
                  onLocate={locateEvidence}
                />
              )}

              <div className="agent-strip">
                {atlasAgents.map((agent, index) => (
                  <div key={agent.id} className={agent.state === "attention" ? "attention" : ""}>
                    <span>{index + 1}</span>
                    <div><strong>{agent.name}</strong><small>{agent.role}</small></div>
                    {agent.state === "attention" ? <Warning size={18} /> : <CheckCircle size={18} />}
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeView === "documents" && (
            <DocumentLibrary onOpen={openDocument} />
          )}

          {activeView === "review" && (
            <ReviewView queue={reviewQueue} selected={selected} setSelected={setSelectedDetection} resolve={resolveReview} onAnalysis={() => setActiveView("analysis")} />
          )}

          {activeView === "metrics" && (
            <MetricsView counts={counts} detections={detections} />
          )}

          {activeView === "atlas" && (
            <AtlasView audit={audit} onAnalyze={() => setActiveView("analysis")} />
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

function Overview({ onStart, onAtlas }: { onStart: () => void; onAtlas: () => void }) {
  return (
    <section className="overview-page">
      <div className="overview-hero">
        <Image className="hero-brand-decor" src="/brand/png/corner-route-1200.png" alt="" width={1200} height={1200} aria-hidden="true" priority />
        <div className="overview-copy">
          <span className="hero-kicker"><ShieldCheck size={17} weight="fill" /> Inteligência que deixa rastro</span>
          <h1>Siga cada evidência do seu P&amp;ID.</h1>
          <p>O Rastro localiza TAGs, conecta rotas e mostra de onde cada resultado veio — tudo localmente, com a decisão final nas suas mãos.</p>
          <div className="hero-actions">
            <Button kind="primary" size="lg" renderIcon={Play} onClick={onStart}>Iniciar demonstração</Button>
            <Button kind="tertiary" size="lg" renderIcon={Fingerprint} onClick={onAtlas}>Ver governança Atlas</Button>
          </div>
          <div className="hero-assurances">
            <span><CloudSlash size={17} /> Zero chamadas externas</span>
            <span><UserFocus size={17} /> Aprovação humana</span>
            <span><Archive size={17} /> 93 arquivos auditados</span>
          </div>
        </div>
        <div className="hero-diagram" aria-label="Amostra real do dataset com evidências">
          <div className="hero-diagram-head"><span>16.jpg</span><strong>Referência curada</strong></div>
          <div className="hero-diagram-body">
            <Image
              src="/samples/distillation-train.jpg"
              alt="P&ID do trem de destilação usado na demonstração"
              width={819}
              height={701}
              sizes="(max-width: 920px) 100vw, 46vw"
              priority
              unoptimized
            />
            <span className="hero-focus one">W-02</span>
            <span className="hero-focus two">P-03</span>
            <span className="hero-focus three">VA-13</span>
          </div>
          <div className="hero-diagram-foot"><span>31 evidências curadas</span><span>3 revisões abertas</span></div>
        </div>
      </div>

      <div className="overview-rail">
        <div><span>Dataset</span><strong>92 JPG + 1 PDF</strong><small>Material oficial recebido</small></div>
        <div><span>Motor</span><strong>OCR neural local</strong><small>Tesseract com ativos offline</small></div>
        <div><span>Governança</span><strong>7 invariantes</strong><small>Blueprint e Constituição ativos</small></div>
        <div><span>Execução</span><strong>CPU compatível</strong><small>Sem GPU obrigatória</small></div>
      </div>

      <div className="overview-story">
        <article className="story-main">
          <div><Brain size={23} /><span>Fluxo de decisão</span></div>
          <h2>A IA encontra. O Rastro mostra o caminho.</h2>
          <p>O motor de visão produz candidatos. Regras locais sugerem classe e grupo. O Red Team expõe o que não está claro. A decisão final continua humana.</p>
          <div className="flow-nodes">
            <span>Imagem local</span><i /><span>OCR neural</span><i /><span>Classificação</span><i /><span>Red Team</span><i /><span>Humano</span>
          </div>
        </article>
        <article className="story-privacy">
          <LockKey size={26} />
          <h3>Privacidade como arquitetura</h3>
          <p>Não existe chave de nuvem configurada. Imagens, recortes e correções permanecem no dispositivo.</p>
        </article>
        <article className="story-honesty">
          <Flask size={26} />
          <h3>Honestidade técnica</h3>
          <p>Resultados curados, resultados medidos e itens pendentes usam rótulos diferentes.</p>
        </article>
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
}: {
  queue: Detection[];
  selected: Detection | null;
  setSelected: (id: string) => void;
  resolve: (id: string, decision: "accepted" | "rejected") => void;
  onAnalysis: () => void;
}) {
  const reviewSelected = selected?.status === "review" ? selected : queue[0] ?? null;
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
              <dl>
                <div><dt>Leitura</dt><dd>{reviewSelected.label}</dd></div>
                <div><dt>Classe sugerida</dt><dd>{kindLabels[reviewSelected.kind]}</dd></div>
                <div><dt>Grupo</dt><dd>{reviewSelected.group}</dd></div>
                <div><dt>Fonte</dt><dd>{reviewSelected.source === "local-ocr" ? "OCR neural local" : "Referência curada"}</dd></div>
              </dl>
              <div className="decision-rationale"><Brain size={19} /><p>{reviewSelected.rationale}</p></div>
              <div className="redteam-finding"><Warning size={19} weight="fill" /><div><strong>Achado do Red Team</strong><p>A evidência deve ser confirmada visualmente antes de entrar no conjunto aceito.</p></div></div>
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

function MetricsView({ counts, detections }: { counts: { byKind: Record<DetectionKind, number>; accepted: number; review: number; total: number }; detections: Detection[] }) {
  const acceptedRate = counts.total ? Math.round((counts.accepted / counts.total) * 100) : 0;
  const averageConfidence = detections.length ? Math.round((detections.reduce((sum, item) => sum + item.confidence, 0) / detections.length) * 100) : 0;
  const distribution = Object.entries(counts.byKind) as Array<[DetectionKind, number]>;
  const max = Math.max(...distribution.map(([, value]) => value), 1);
  return (
    <section className="page metrics-page">
      <PageHeader title="Métricas com contexto" description="Valores medidos na sessão e uma matriz inicial claramente identificada como calibração." />
      <div className="metric-ledger">
        <div><span>Candidatos na sessão</span><strong>{counts.total}</strong><small>referência ou OCR local</small></div>
        <div><span>Confiança média</span><strong>{averageConfidence}%</strong><small>média dos candidatos exibidos</small></div>
        <div><span>Gate automático</span><strong>{acceptedRate}%</strong><small>acima de 78% de confiança</small></div>
        <div><span>Revisão pendente</span><strong>{counts.review}</strong><small>decisão humana obrigatória</small></div>
      </div>
      <div className="metrics-layout">
        <article className="distribution-panel">
          <div className="section-head"><div><h2>Distribuição por classe</h2><p>Contagem real da sessão atual</p></div><ChartBar size={22} /></div>
          <div className="distribution-chart">
            {distribution.map(([kind, value]) => (
              <div key={kind}>
                <span>{kindLabels[kind]}</span>
                <div className="bars"><i style={{ height: `${Math.max(8, (value / max) * 100)}%` }} /></div>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </article>
        <article className="confidence-panel">
          <div className="section-head"><div><h2>Gate de confiança</h2><p>Critério constitucional da demo</p></div><ShieldCheck size={22} /></div>
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
            <div><strong>{acceptedRate}%</strong><span>aceitas</span></div>
          </div>
          <p>{counts.review ? `${counts.review} ocorrências permanecem visíveis na fila humana.` : "Todas as ocorrências ultrapassaram o gate atual."}</p>
        </article>
        <article className="matrix-panel">
          <div className="section-head"><div><h2>Matriz de confusão inicial</h2><p>Base demonstrativa, não resultado oficial</p></div><Flask size={22} /></div>
          <div className="matrix-wrap">
            <div className="matrix-axis"><span>Real</span><span>Predito</span></div>
            <div className="matrix-grid" style={{ gridTemplateColumns: `84px repeat(${plannedConfusionMatrix.labels.length}, 1fr)` }}>
              <span />
              {plannedConfusionMatrix.labels.map((label) => <b key={`head-${label}`}>{label}</b>)}
              {plannedConfusionMatrix.values.map((row, rowIndex) => [
                <b key={`label-${rowIndex}`}>{plannedConfusionMatrix.labels[rowIndex]}</b>,
                ...row.map((value, columnIndex) => (
                  <span key={`${rowIndex}-${columnIndex}`} className={rowIndex === columnIndex ? "diagonal" : "off-diagonal"} style={{ opacity: 0.45 + value / 20 }}>
                    {value}
                  </span>
                )),
              ])}
            </div>
          </div>
          <p className="matrix-note"><Warning size={16} /> {plannedConfusionMatrix.note}</p>
        </article>
      </div>
    </section>
  );
}

function AtlasView({ audit, onAnalyze }: { audit: AuditEvent[]; onAnalyze: () => void }) {
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
            {atlasAgents.map((agent) => (
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
