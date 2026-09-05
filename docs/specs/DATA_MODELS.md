# Modelos de Dados e Contratos de Interface (Data Models & Schemas)

- **Versão:** 1.0.0
- **Status:** Estável / Aprovado para Avaliação
- **Módulos:** `app/types/detection.ts`, `app/types/topology.ts`, `app/lib/evaluation.ts`, `app/lib/llm-fallback.ts`
- **Documento:** `docs/specs/DATA_MODELS.md`

---

## 1. Contrato Oficial de Saída do Hackathon: TAG / TYPE / CLASS

O formato oficial de saída exigido pela IASTECH / UNIMAX é padronizado como:

```typescript
export interface HackathonInventoryItem {
  tag: string;         // Identificador oficial (ex: "FV210", "M210", "LT210")
  type: string;        // Tipo primário (ex: "Valve", "Motor", "Level Sensor", "Tank")
  itemClass: string;   // Classe funcional hierárquica (ex: "Instrument", "Equipment")
  rationale?: string;  // Justificativa normativa segundo ANSI/ISA-5.1
  confidence: number;  // Confiança da predição calibrada [0.0 - 1.0]
  source: string;      // Origem da inferência ("local-normative", "local-ocr", "ollama", "cloud")
}
```

### 1.1 Exemplos de Serialização em Formato Tabela Textual
```text
TAG        | TYPE            | CLASS
-----------|-----------------|-----------
FV-210     | Valve           | Instrument
M-210      | Motor           | Equipment
LT-210     | Level Sensor    | Instrument
P-101A     | Pump            | Equipment
V-101      | Column/Vessel   | Equipment
PSHH-301   | Safety Switch   | Instrument
SDV-10     | Shutdown Valve  | Valve/Instrument
```

---

## 2. Modelo de Detecção e Geometria (Detection)

```typescript
export type DetectionKind = "tag" | "valve" | "instrument" | "equipment";

export type ComponentGroup =
  | "Equipamentos de Processo e Estocagem"
  | "Máquinas Rotativas e Bombas"
  | "Válvulas de Bloqueio e Segurança Industrial"
  | "Válvulas de Controle Proporcional"
  | "Instrumentação e Transmissores de Processo"
  | "Chaves e Dispositivos de Alarme / Intertravamento"
  | "Notas e Delimitações de Desenho"
  | "Elementos Não Identificados";

export interface BoundingBox {
  x: number;       // Posição horizontal superior esquerda (em pixels de imagem)
  y: number;       // Posição vertical superior esquerda (em pixels de imagem)
  width: number;   // Largura da região delimitadora
  height: number;  // Altura da região delimitadora
}

export interface Detection {
  id: string;                      // Identificador único (ex: "det-16-01")
  label: string;                   // Rótulo textual extraído ou atribuído (ex: "FV-210")
  kind: DetectionKind;             // Classe visual: "tag" | "valve" | "instrument" | "equipment"
  confidence: number;              // Confiança normalizada [0.00, 1.00]
  box: BoundingBox;                // Coordenadas espaciais na imagem
  group: ComponentGroup;           // Grupo funcional segundo a taxonomia de engenharia
  rationale?: string;              // Justificativa técnica ou decomposição ISA-5.1
  status?: "candidate" | "accepted" | "rejected"; // Estado no fluxo Human-in-the-Loop
  reviewReason?: string;           // Motivo caso o item necessite de confirmação humana
  isaStandard?: boolean;           // Indica conformidade estrita com a norma ISA-5.1
}
```

---

## 3. Modelo de Topologia de Planta e Grafos de Conectividade

```typescript
export interface TopologyNode {
  id: string;               // ID do nó (compatível com Detection.id ou identificador físico)
  tag: string;              // TAG do componente (ex: "C-101", "P-101A")
  type: "equipment" | "valve" | "instrument" | "line_junction";
  x: number;                // Posição normalizada para renderização em canvas SVG
  y: number;                // Posição normalizada para renderização em canvas SVG
  status: "nominal" | "warning" | "critical" | "offline";
  serviceFluid?: string;    // Fluido de processo (ex: "HC / Nafta", "Vapor de Média", "Água de Resfriamento")
  designPressure?: string;  // Pressão de projeto (ex: "18.5 kgf/cm²")
  designTemp?: string;      // Temperatura de projeto (ex: "210 °C")
}

export interface TopologyEdge {
  id: string;               // ID da aresta (ex: "e16-01")
  source: string;           // ID do nó de origem
  target: string;           // ID do nó de destino
  relationType: "process" | "signal" | "instrumentation"; // Tipo físico da linha
  lineCode?: string;        // Código de tubulação (ex: "04\"-HC-1010-B1")
  verified: boolean;        // Indica se a conexão é curada/verificada
}

export interface FlowRoute {
  id: string;               // Identificador da rota operacional (ex: "route-dest-01")
  name: string;             // Nome descritivo (ex: "Alimentação Crua -> Coluna C-101")
  nodes: string[];          // Sequência ordenada de nós componentes
  flowRateNominal: string;  // Vazão operacional nominal (ex: "145.0 m³/h")
}

export interface TopologyGraph {
  status: "curated" | "unverified"; // Garantia contra alucinações
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  routes: FlowRoute[];
}
```

---

## 4. Modelos de Avaliação Metrológica e Auditoria (Audit & Metrics)

```typescript
export interface ConfusionMatrix {
  truePositives: Record<DetectionKind, number>;
  falsePositives: Record<DetectionKind, number>;
  falseNegatives: Record<DetectionKind, number>;
  precision: Record<DetectionKind, number>;
  recall: Record<DetectionKind, number>;
  f1Score: Record<DetectionKind, number>;
  overallAccuracy: number;
  macroF1: number;
  totalEvaluated: number;
  note: string;
}

export interface SafetyMetrics {
  totalCriticalSafeguards: number;      // Chaves de segurança, PSVs, SDVs
  unverifiedSafeguards: number;         // Elementos sem validação física
  safeguardCoveragePercent: number;     // Índice de conformidade
  psmScore: number;                     // Pontuação de Gerenciamento de Segurança de Processos (PSM)
  dqsScore: number;                     // Pontuação de Qualidade de Dados (Data Quality Score)
  complianceRate: number;               // Conformidade normativa ISA-5.1
}

export interface AuditEntry {
  id: string;               // UUID do evento de auditoria
  timestamp: string;        // Timestamp ISO 8601 (ex: "2025-02-23T14:32:00.123Z")
  actor: "system" | "engineer" | "ai_evaluator";
  action: string;           // Ação executada (ex: "DETECTION_EDIT", "TAG_ADDED", "OCR_RUN")
  targetTag?: string;       // TAG afetado
  details: string;          // Descrição do evento auditado
  previousValue?: string;   // Valor anterior para rastreabilidade de mudanças
  newValue?: string;        // Novo valor adotado
}
```

---

## 5. Configuração do Motor de Inferência (LLMConfig)

```typescript
export type AIProvider = "local" | "ollama" | "openai" | "gemini";

export interface LLMConfig {
  provider: AIProvider;
  ollamaUrl: string;          // Padrão: "http://localhost:11434"
  ollamaModel: string;        // Padrão: "llama3.2:latest"
  openaiApiKey?: string;      // Salvo exclusivamente em localStorage
  openaiModel: string;        // Padrão: "gpt-4o-mini"
  geminiApiKey?: string;      // Salvo exclusivamente em localStorage
  geminiModel: string;        // Padrão: "gemini-2.5-flash"
  timeoutMs: number;          // Padrão: 8000ms
  autoFallbackToNormative: boolean; // Padrão: true (Garante zero paralisação do operador)
}
```
