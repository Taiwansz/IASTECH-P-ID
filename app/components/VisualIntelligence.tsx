"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import { ArrowRight } from "@phosphor-icons/react/ArrowRight";
import { CheckCircle } from "@phosphor-icons/react/CheckCircle";
import { Circuitry } from "@phosphor-icons/react/Circuitry";
import { Crosshair } from "@phosphor-icons/react/Crosshair";
import { Eye } from "@phosphor-icons/react/Eye";
import { FileImage } from "@phosphor-icons/react/FileImage";
import { FlowArrow } from "@phosphor-icons/react/FlowArrow";
import { Graph } from "@phosphor-icons/react/Graph";
import { LockKey } from "@phosphor-icons/react/LockKey";
import { Path } from "@phosphor-icons/react/Path";
import { SquaresFour } from "@phosphor-icons/react/SquaresFour";
import { Target } from "@phosphor-icons/react/Target";
import { TreeStructure } from "@phosphor-icons/react/TreeStructure";
import { Warning } from "@phosphor-icons/react/Warning";
import { samples, type Detection, type DiagramSample } from "../lib/demo-data";
import {
  controlContexts,
  flowRoutes,
  getImpactNeighborhood,
  topologyEdges,
  topologyNodeById,
  topologyNodes,
  type TopologyNode,
} from "../lib/topology-data";

export type AnalysisMode = "document" | "topology" | "impact" | "control";

interface AuditRecord {
  id: string;
  time: string;
  agent: string;
  action: string;
  status: string;
}

const modeItems = [
  { id: "document" as const, label: "Documento", icon: Crosshair },
  { id: "topology" as const, label: "Topologia e fluxo", icon: Graph },
  { id: "impact" as const, label: "Impacto", icon: TreeStructure },
  { id: "control" as const, label: "Malhas", icon: Circuitry },
];

export function AnalysisModeTabs({
  mode,
  onChange,
  heatmap,
  onHeatmap,
}: {
  mode: AnalysisMode;
  onChange: (mode: AnalysisMode) => void;
  heatmap: boolean;
  onHeatmap: () => void;
}) {
  return (
    <div className="analysis-mode-bar">
      <div className="analysis-mode-tabs" role="tablist" aria-label="Modo de investigação">
        {modeItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={mode === id}
            className={mode === id ? "active" : ""}
            onClick={() => onChange(id)}
          >
            <Icon size={17} weight={mode === id ? "fill" : "regular"} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <button className={`heatmap-toggle ${heatmap ? "active" : ""}`} onClick={onHeatmap} aria-pressed={heatmap}>
        <Eye size={16} />
        Mapa de confiança
      </button>
      {heatmap && (
        <div className="confidence-legend" aria-label="Legenda de confiança">
          <span className="high">Alta</span><span className="moderate">Moderada</span><span className="review">Revisão</span>
        </div>
      )}
    </div>
  );
}

const confidenceClass = (confidence?: number) => {
  if (confidence === undefined) return "confidence-unmapped";
  if (confidence >= 0.88) return "confidence-high";
  if (confidence >= 0.78) return "confidence-moderate";
  return "confidence-review";
};

function DiagramEvidence({
  sample,
  detections,
  selectedDetection,
  onSelect,
  highlightedDetectionIds,
  heatmap,
  compact = false,
}: {
  sample: DiagramSample;
  detections: Detection[];
  selectedDetection: string | null;
  onSelect: (id: string) => void;
  highlightedDetectionIds?: string[];
  heatmap: boolean;
  compact?: boolean;
}) {
  const highlightSet = new Set(highlightedDetectionIds ?? []);
  const hasHighlight = highlightSet.size > 0;

  return (
    <div className={`synced-diagram ${compact ? "compact" : ""}`}>
      <div className="synced-diagram-canvas">
        <Image
          src={sample.image}
          alt={`Diagrama P&ID ${sample.title}`}
          width={sample.width}
          height={sample.height}
          sizes="(max-width: 1024px) 100vw, 52vw"
          unoptimized
        />
        {heatmap && (
          <div className="confidence-heat-layer" aria-hidden="true">
            {detections.map((item) => (
              <span
                key={`heat-${item.id}`}
                className={confidenceClass(item.confidence)}
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
        <div className="detection-layer" aria-label="Evidências sincronizadas">
          {detections.map((item) => (
            <button
              key={item.id}
              className={`detection-box kind-${item.kind} ${item.id === selectedDetection ? "selected" : ""} ${item.status === "review" ? "review" : ""} ${hasHighlight && !highlightSet.has(item.id) ? "route-dim" : ""} ${highlightSet.has(item.id) ? "route-highlight" : ""}`}
              style={{
                left: `${(item.box.x / sample.width) * 100}%`,
                top: `${(item.box.y / sample.height) * 100}%`,
                width: `${(item.box.width / sample.width) * 100}%`,
                height: `${(item.box.height / sample.height) * 100}%`,
              }}
              onClick={() => onSelect(item.id)}
              aria-label={`Selecionar ${item.label}`}
            >
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function edgePath(source: TopologyNode, target: TopologyNode) {
  const sx = source.x * 10;
  const sy = source.y * 6;
  const tx = target.x * 10;
  const ty = target.y * 6;
  const mid = (sx + tx) / 2;
  return `M ${sx} ${sy} C ${mid} ${sy}, ${mid} ${ty}, ${tx} ${ty}`;
}

export function TopologyGraph({
  detections,
  selectedNodeId,
  onSelectNode,
  routeNodeIds = [],
  routeEdgeIds = [],
  upstreamIds = [],
  downstreamIds = [],
  controlNodeIds = [],
}: {
  detections: Detection[];
  selectedNodeId: string;
  onSelectNode: (node: TopologyNode) => void;
  routeNodeIds?: string[];
  routeEdgeIds?: string[];
  upstreamIds?: string[];
  downstreamIds?: string[];
  controlNodeIds?: string[];
}) {
  const confidenceByDetection = new Map(detections.map((item) => [item.id, item.confidence]));
  const routeNodes = new Set(routeNodeIds);
  const routeEdges = new Set(routeEdgeIds);
  const upstream = new Set(upstreamIds);
  const downstream = new Set(downstreamIds);
  const control = new Set(controlNodeIds);
  const hasFocus = routeNodes.size > 0 || upstream.size > 0 || downstream.size > 0 || control.size > 0;

  return (
    <div className="topology-graph">
      <svg viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <marker id="process-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
          <marker id="signal-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
        </defs>
        {topologyEdges.map((edge) => {
          const source = topologyNodeById(edge.source);
          const target = topologyNodeById(edge.target);
          if (!source || !target) return null;
          const inImpact = (upstream.has(edge.source) && (upstream.has(edge.target) || edge.target === selectedNodeId))
            || (downstream.has(edge.target) && (downstream.has(edge.source) || edge.source === selectedNodeId));
          return (
            <path
              key={edge.id}
              d={edgePath(source, target)}
              className={`${edge.kind} ${routeEdges.has(edge.id) ? "route" : ""} ${inImpact ? "impact" : ""} ${hasFocus && !routeEdges.has(edge.id) && !inImpact && edge.kind === "process" ? "dim" : ""}`}
              markerEnd={`url(#${edge.kind}-arrow)`}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>

      {topologyNodes.map((node) => {
        const confidence = node.detectionId ? confidenceByDetection.get(node.detectionId) : undefined;
        const isFocused = routeNodes.has(node.id) || upstream.has(node.id) || downstream.has(node.id) || control.has(node.id) || node.id === selectedNodeId;
        const nodeStyle = { left: `${node.x}%`, top: `${node.y}%` } as CSSProperties;
        return (
          <button
            key={node.id}
            className={`topology-node kind-${node.kind} ${confidenceClass(confidence)} ${node.id === selectedNodeId ? "selected" : ""} ${routeNodes.has(node.id) ? "route" : ""} ${upstream.has(node.id) ? "upstream" : ""} ${downstream.has(node.id) ? "downstream" : ""} ${control.has(node.id) ? "control" : ""} ${hasFocus && !isFocused ? "dim" : ""}`}
            style={nodeStyle}
            onClick={() => onSelectNode(node)}
            aria-label={`${node.label}, ${node.detail}`}
          >
            <strong>{node.label}</strong>
            <span>{node.detail}</span>
          </button>
        );
      })}
    </div>
  );
}

export function TopologyWorkspace({
  sample,
  detections,
  selectedDetection,
  selectedNodeId,
  routeId,
  heatmap,
  onSelectDetection,
  onSelectNode,
  onRoute,
}: {
  sample: DiagramSample;
  detections: Detection[];
  selectedDetection: string | null;
  selectedNodeId: string;
  routeId: string;
  heatmap: boolean;
  onSelectDetection: (id: string) => void;
  onSelectNode: (node: TopologyNode) => void;
  onRoute: (id: string) => void;
}) {
  const route = flowRoutes.find((item) => item.id === routeId) ?? flowRoutes[0];
  const routeDetectionIds = topologyNodes
    .filter((node) => route.nodeIds.includes(node.id) && node.detectionId)
    .map((node) => node.detectionId as string);

  return (
    <div className="intelligence-workspace">
      <div className="intelligence-command">
        <div>
          <FlowArrow size={19} />
          <span><strong>Traçado de fluxo</strong><small>Relações curadas da referência 16.jpg</small></span>
        </div>
        <div className="route-selector" role="group" aria-label="Selecionar rota de processo">
          {flowRoutes.map((item) => (
            <button key={item.id} className={item.id === route.id ? "active" : ""} onClick={() => onRoute(item.id)}>{item.name}</button>
          ))}
        </div>
      </div>

      <div className="topology-dual">
        <article className="sync-panel">
          <div className="intelligence-panel-head">
            <span><FileImage size={17} /> Documento</span>
            <strong>{sample.fileName}</strong>
          </div>
          <DiagramEvidence
            sample={sample}
            detections={detections}
            selectedDetection={selectedDetection}
            onSelect={onSelectDetection}
            highlightedDetectionIds={routeDetectionIds}
            heatmap={heatmap}
            compact
          />
        </article>
        <article className="sync-panel graph-panel">
          <div className="intelligence-panel-head">
            <span><Graph size={17} /> Topologia</span>
            <strong>Camada demonstrativa</strong>
          </div>
          <TopologyGraph
            detections={detections}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
            routeNodeIds={route.nodeIds}
            routeEdgeIds={route.edgeIds}
          />
        </article>
      </div>

      <div className="route-ledger">
        <span><Path size={19} /></span>
        <div><strong>{route.name}</strong><p>{route.purpose}</p></div>
        <dl>
          <div><dt>Nós</dt><dd>{route.nodeIds.length}</dd></div>
          <div><dt>Conexões</dt><dd>{route.edgeIds.length}</dd></div>
          <div><dt>Validação</dt><dd>Especialista</dd></div>
        </dl>
      </div>
    </div>
  );
}

export function ImpactWorkspace({
  detections,
  selectedNodeId,
  onSelectNode,
  onConfirm,
  onLocate,
}: {
  detections: Detection[];
  selectedNodeId: string;
  onSelectNode: (node: TopologyNode) => void;
  onConfirm: (node: TopologyNode) => void;
  onLocate: (detectionId: string) => void;
}) {
  const selectedNode = topologyNodeById(selectedNodeId) ?? topologyNodeById("p03")!;
  const impact = useMemo(() => getImpactNeighborhood(selectedNode.id), [selectedNode.id]);
  const upstreamNodes = impact.upstream.map(topologyNodeById).filter(Boolean) as TopologyNode[];
  const downstreamNodes = impact.downstream.map(topologyNodeById).filter(Boolean) as TopologyNode[];

  return (
    <div className="impact-workspace">
      <article className="impact-map-panel">
        <div className="intelligence-panel-head">
          <span><TreeStructure size={17} /> Vizinhança de impacto</span>
          <strong>Seleção: {selectedNode.label}</strong>
        </div>
        <TopologyGraph
          detections={detections}
          selectedNodeId={selectedNode.id}
          onSelectNode={onSelectNode}
          upstreamIds={impact.upstream}
          downstreamIds={impact.downstream}
        />
        <div className="impact-legend">
          <span className="upstream">Montante relacionado</span>
          <span className="selected">Item selecionado</span>
          <span className="downstream">Jusante relacionado</span>
        </div>
      </article>

      <aside className="impact-inspector">
        <div className="impact-target">
          <Target size={23} />
          <div><span>Escopo selecionado</span><strong>{selectedNode.label}</strong><small>{selectedNode.detail}</small></div>
        </div>
        <div className="impact-counts">
          <div><strong>{upstreamNodes.length}</strong><span>a montante</span></div>
          <div><strong>{downstreamNodes.length}</strong><span>a jusante</span></div>
        </div>
        <div className="impact-relations">
          <section><h3>Montante relacionado</h3><p>{upstreamNodes.map((node) => node.label).join(", ") || "Nenhum nó registrado"}</p></section>
          <section><h3>Jusante relacionado</h3><p>{downstreamNodes.map((node) => node.label).join(", ") || "Nenhum nó registrado"}</p></section>
        </div>
        <div className="redteam-map-warning">
          <Warning size={19} weight="fill" />
          <p><strong>Limite constitucional</strong>Este mapa mostra relações curadas. Não calcula falha, risco ou consequência operacional.</p>
        </div>
        <div className="impact-actions">
          {selectedNode.detectionId && <button onClick={() => onLocate(selectedNode.detectionId!)}><Crosshair size={16} /> Localizar no P&amp;ID</button>}
          <button className="primary" onClick={() => onConfirm(selectedNode)}><CheckCircle size={16} /> Confirmar escopo</button>
        </div>
      </aside>
    </div>
  );
}

export function ControlWorkspace({
  detections,
  selectedNodeId,
  onSelectNode,
  onLocate,
}: {
  detections: Detection[];
  selectedNodeId: string;
  onSelectNode: (node: TopologyNode) => void;
  onLocate: (detectionId: string) => void;
}) {
  const [contextId, setContextId] = useState(controlContexts[0].id);
  const context = controlContexts.find((item) => item.id === contextId) ?? controlContexts[0];
  const contextNodeIds = context.steps.map((step) => step.nodeId);

  return (
    <div className="control-workspace">
      <div className="control-selector" role="tablist" aria-label="Contextos de controle">
        {controlContexts.map((item) => (
          <button key={item.id} className={item.id === context.id ? "active" : ""} onClick={() => setContextId(item.id)}>
            <Circuitry size={18} />
            <span><strong>{item.name}</strong><small>{item.type === "control" ? "Controle sugerido" : "Monitoramento"}</small></span>
          </button>
        ))}
      </div>

      <div className="control-layout">
        <article className="control-graph-panel">
          <div className="intelligence-panel-head">
            <span><Graph size={17} /> Contexto no processo</span>
            <strong>Curadoria local</strong>
          </div>
          <TopologyGraph
            detections={detections}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
            controlNodeIds={contextNodeIds}
          />
        </article>
        <article className="control-detail">
          <span className="control-type">{context.type === "control" ? "Relação de controle" : "Relação de monitoramento"}</span>
          <h2>{context.name}</h2>
          <p>{context.summary}</p>
          <div className="control-chain">
            {context.steps.map((step, index) => {
              const node = topologyNodeById(step.nodeId)!;
              return (
                <div key={step.nodeId}>
                  <button onClick={() => onSelectNode(node)} className={selectedNodeId === node.id ? "active" : ""}>
                    <span>{step.role}</span><strong>{node.label}</strong><small>{step.detail}</small>
                  </button>
                  {index < context.steps.length - 1 && <ArrowRight size={17} aria-hidden="true" />}
                </div>
              );
            })}
          </div>
          <div className="control-warning"><Warning size={18} /><p>{context.warning}</p></div>
          <div className="control-locate-actions">
            {context.steps.map((step) => topologyNodeById(step.nodeId)).filter((node) => node?.detectionId).map((node) => (
              <button key={node!.id} onClick={() => onLocate(node!.detectionId!)}><Crosshair size={15} /> {node!.label}</button>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}

export function TopologyUnavailable({ onRestore }: { onRestore: () => void }) {
  return (
    <div className="topology-unavailable">
      <LockKey size={34} />
      <h2>Topologia ainda não validada para este documento</h2>
      <p>O OCR local continua disponível. Relações semânticas não são inventadas sem uma curadoria aprovada.</p>
      <button onClick={onRestore}><FileImage size={17} /> Carregar referência 16.jpg</button>
    </div>
  );
}

export function DocumentLibrary({ onOpen }: { onOpen: (id: string) => void }) {
  const [profile, setProfile] = useState<DiagramSample["profile"] | "all">("all");
  const visible = samples.filter((item) => profile === "all" || item.profile === profile);
  const filters: Array<{ id: DiagramSample["profile"] | "all"; label: string }> = [
    { id: "all", label: "Todos" },
    { id: "clean", label: "Caso limpo" },
    { id: "dense", label: "Alta densidade" },
    { id: "low-resolution", label: "Baixa resolução" },
    { id: "reference", label: "Referências" },
  ];

  return (
    <section className="page documents-page" aria-labelledby="documents-title">
      <header className="page-header">
        <div><h1 id="documents-title">Biblioteca do dataset</h1><p>Uma leitura visual dos documentos reais embalados na demonstração local.</p></div>
        <div className="dataset-summary"><strong>6</strong><span>exemplares locais de 93 arquivos recebidos</span></div>
      </header>
      <div className="document-library-toolbar">
        <div className="library-filters" role="group" aria-label="Filtrar biblioteca">
          {filters.map((item) => <button key={item.id} className={profile === item.id ? "active" : ""} onClick={() => setProfile(item.id)}>{item.label}</button>)}
        </div>
        <span><LockKey size={16} /> Nenhum documento sai do dispositivo</span>
      </div>
      <div className="document-mosaic">
        {visible.map((item) => (
          <article key={item.id} className={item.referenceReady ? "featured" : ""}>
            <div className="document-thumb">
              <Image src={item.image} alt={`Miniatura de ${item.title}`} width={item.width} height={item.height} sizes="(max-width: 760px) 100vw, 34vw" unoptimized />
            </div>
            <div className="document-card-copy">
              <div><span>{item.fileName}</span><strong>{item.title}</strong></div>
              <p>{item.description}</p>
              <dl>
                <div><dt>Dimensão</dt><dd>{item.width} x {item.height}</dd></div>
                <div><dt>Perfil</dt><dd>{item.profile === "dense" ? "Alta densidade" : item.profile === "low-resolution" ? "Baixa resolução" : item.profile === "reference" ? "Referência" : "Caso limpo"}</dd></div>
                <div><dt>Estado</dt><dd>{item.referenceReady ? "Curadoria disponível" : "OCR sob demanda"}</dd></div>
              </dl>
              <button onClick={() => onOpen(item.id)}>Abrir na análise <ArrowRight size={16} /></button>
            </div>
          </article>
        ))}
      </div>
      {!visible.length && <div className="library-empty"><SquaresFour size={30} /><p>Nenhum exemplar atende a este filtro.</p></div>}
    </section>
  );
}

export function AuditTimeline({ audit }: { audit: AuditRecord[] }) {
  return (
    <div className="audit-timeline" aria-label="Linha do tempo de auditoria local">
      {audit.slice(0, 12).map((event) => (
        <article key={event.id} className={event.status}>
          <div className="timeline-marker">{event.status === "attention" || event.status === "blocked" ? <Warning size={15} /> : <CheckCircle size={15} />}</div>
          <time>{event.time}</time>
          <div><strong>{event.agent}</strong><p>{event.action}</p></div>
        </article>
      ))}
    </div>
  );
}
