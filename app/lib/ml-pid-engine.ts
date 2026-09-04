/**
 * Motor de Machine Learning e Aprendizado Contínuo para Diagramas P&ID.
 * Classifica símbolos geométricos e TAGs em: equipamento, instrumento, válvula ou linha.
 * Suporta Aprendizado Ativo (Active Learning) local: aprende com as decisões de aceite/rejeição do usuário.
 */

import type { Box, DetectionKind } from "./demo-data.ts";
import { parseIsaTag } from "./isa51-rules.ts";

export interface FeatureVector {
  aspectRatio: number;      // width / height
  normalizedArea: number;   // (w * h) / (docW * docH)
  circularity: number;      // quão próximo de 1.0 é aspect ratio (para balões ISA)
  textLength: number;       // número de caracteres
  hasIsaPrefix: number;     // 1 se começa com letra ISA válida (P, T, F, L, V, etc)
  isValveTag: number;       // 1 se contém V, FV, PV, CV, HV, XV, PSV
  isPumpTag: number;        // 1 se contém P-, PMP, B-
  isVesselTag: number;      // 1 se contém T-, V-, D-, C-, E-
  isLineTag: number;        // 1 se possui padrão de tubulação (ex: 250-P01...)
  shapeFeature: number;     // 1: circle, 2: valve-pair, 3: vessel-rect, 0: unknown
}

export interface MLPrediction {
  kind: DetectionKind;
  group: string;
  confidence: number;
  isLearned: boolean;
  rationale: string;
  featureScores: Record<DetectionKind, number>;
}

export interface LearnedPattern {
  id: string;
  tag: string;
  kind: DetectionKind;
  features: FeatureVector;
  timestamp: number;
}

// Pesos pré-treinados do modelo linear/softmax ponderado para P&ID
const PRETRAINED_WEIGHTS: Record<DetectionKind, {
  bias: number;
  aspectRatio: number;
  normalizedArea: number;
  circularity: number;
  hasIsaPrefix: number;
  isValveTag: number;
  isPumpTag: number;
  isVesselTag: number;
  isLineTag: number;
  shapeCircle: number;
  shapeValve: number;
  shapeVessel: number;
}> = {
  instrument: {
    bias: 0.1,
    aspectRatio: -0.8,
    normalizedArea: -3.0,
    circularity: 2.8,
    hasIsaPrefix: 2.2,
    isValveTag: -1.5,
    isPumpTag: -2.5,
    isVesselTag: -2.5,
    isLineTag: -3.0,
    shapeCircle: 3.5,
    shapeValve: -2.0,
    shapeVessel: -2.5,
  },
  valve: {
    bias: 0.05,
    aspectRatio: 0.4,
    normalizedArea: -2.0,
    circularity: -0.5,
    hasIsaPrefix: 0.8,
    isValveTag: 3.6,
    isPumpTag: -2.0,
    isVesselTag: -2.0,
    isLineTag: -2.5,
    shapeCircle: -1.5,
    shapeValve: 3.8,
    shapeVessel: -2.0,
  },
  equipment: {
    bias: -0.2,
    aspectRatio: 0.2,
    normalizedArea: 4.5,
    circularity: -1.2,
    hasIsaPrefix: -0.5,
    isValveTag: -2.0,
    isPumpTag: 3.8,
    isVesselTag: 3.9,
    isLineTag: -2.0,
    shapeCircle: 0.2,
    shapeValve: -1.8,
    shapeVessel: 3.6,
  },
  tag: {
    bias: -0.1,
    aspectRatio: 2.5,
    normalizedArea: -1.5,
    circularity: -2.0,
    hasIsaPrefix: 0.4,
    isValveTag: -0.8,
    isPumpTag: -0.8,
    isVesselTag: -0.8,
    isLineTag: 4.2,
    shapeCircle: -2.0,
    shapeValve: -1.5,
    shapeVessel: -1.5,
  },
};

const STORAGE_KEY = "rastro_learned_pid_patterns";

export class PidMLEngine {
  private learnedPatterns: LearnedPattern[] = [];

  constructor() {
    this.loadLearnedPatterns();
  }

  private loadLearnedPatterns(): void {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.learnedPatterns = JSON.parse(raw);
      }
    } catch {
      this.learnedPatterns = [];
    }
  }

  private persistLearnedPatterns(): void {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.learnedPatterns.slice(-200)));
    } catch {
      // Quota exceeded
    }
  }

  /**
   * Extrai vetor de características invariantes de um candidato.
   */
  public extractFeatures(
    box: Box,
    text: string,
    docWidth: number,
    docHeight: number,
    shape: "circle" | "valve-pair" | "vessel-rect" | "pump-circle" | "none" = "none",
  ): FeatureVector {
    const w = Math.max(1, box.width);
    const h = Math.max(1, box.height);
    const docArea = Math.max(1000, docWidth * docHeight);
    const aspectRatio = w / h;
    const normalizedArea = (w * h) / docArea;
    const circularity = Math.max(0, 1 - Math.abs(1 - aspectRatio));

    const cleanText = text.trim().toUpperCase();
    const hasIsaPrefix = /^[A-Z]{2,4}/.test(cleanText) ? 1 : 0;
    const isValveTag = /(?:[A-Z]V|VALV|PSV|XV|HV|CV|FV|PV|TV|LV)-?[0-9]+/i.test(cleanText) || /^V-[0-9]+/i.test(cleanText) ? 1 : 0;
    const isPumpTag = /(?:PMP|BOMBA|P-[0-9]+|P[0-9]{3,}|VP-[0-9]+)/i.test(cleanText) ? 1 : 0;
    const isVesselTag = /(?:VESSEL|VASO|TK-[0-9]+|TANQUE|T-[0-9]{3,}|D-[0-9]{3,}|E-[0-9]{3,}|V-[0-9]{3,})/i.test(cleanText) ? 1 : 0;
    const isLineTag = /[0-9]{2,3}-[A-Z0-9]+-[0-9]+/i.test(cleanText) || /^[0-9]{2,3}\"/.test(cleanText) ? 1 : 0;

    let shapeFeature = 0;
    if (shape === "circle" || shape === "pump-circle") shapeFeature = 1;
    else if (shape === "valve-pair") shapeFeature = 2;
    else if (shape === "vessel-rect") shapeFeature = 3;

    return {
      aspectRatio,
      normalizedArea,
      circularity,
      textLength: cleanText.length,
      hasIsaPrefix,
      isValveTag,
      isPumpTag,
      isVesselTag,
      isLineTag,
      shapeFeature,
    };
  }

  /**
   * Classifica o candidato através da combinação do modelo estatístico pré-treinado
   * com os padrões aprendidos do usuário (Active Learning via k-NN).
   */
  public predict(features: FeatureVector, text: string): MLPrediction {
    const cleanText = text.trim();
    const isa = parseIsaTag(cleanText);

    // 1. Cálculo dos logits pré-treinados
    const rawScores: Record<DetectionKind, number> = {
      instrument: 0,
      valve: 0,
      equipment: 0,
      tag: 0,
    };

    const kinds: DetectionKind[] = ["instrument", "valve", "equipment", "tag"];
    for (const kind of kinds) {
      const w = PRETRAINED_WEIGHTS[kind];
      let score = w.bias;
      score += features.aspectRatio * w.aspectRatio;
      score += features.normalizedArea * 100 * w.normalizedArea;
      score += features.circularity * w.circularity;
      score += features.hasIsaPrefix * w.hasIsaPrefix;
      score += features.isValveTag * w.isValveTag;
      score += features.isPumpTag * w.isPumpTag;
      score += features.isVesselTag * w.isVesselTag;
      score += features.isLineTag * w.isLineTag;

      if (features.shapeFeature === 1) score += w.shapeCircle;
      else if (features.shapeFeature === 2) score += w.shapeValve;
      else if (features.shapeFeature === 3) score += w.shapeVessel;

      rawScores[kind] = score;
    }

    // Softmax normalizado
    const expScores = kinds.map((k) => Math.exp(Math.max(-10, Math.min(10, rawScores[k]))));
    const sumExp = expScores.reduce((a, b) => a + b, 0);
    const probs: Record<DetectionKind, number> = {
      instrument: expScores[0] / sumExp,
      valve: expScores[1] / sumExp,
      equipment: expScores[2] / sumExp,
      tag: expScores[3] / sumExp,
    };

    // 2. Consulta à memória de Aprendizado Ativo (k-NN)
    let learnedBoostKind: DetectionKind | null = null;
    let isExactLearned = false;
    let minDistance = Infinity;

    if (this.learnedPatterns.length > 0) {
      for (const sample of this.learnedPatterns) {
        if (sample.tag === cleanText) {
          isExactLearned = true;
          learnedBoostKind = sample.kind;
          break;
        }

        // Distância euclidiana ponderada no espaço de features
        const d =
          Math.pow(features.circularity - sample.features.circularity, 2) * 2.0 +
          Math.pow(features.isValveTag - sample.features.isValveTag, 2) * 3.0 +
          Math.pow(features.isPumpTag - sample.features.isPumpTag, 2) * 3.0 +
          Math.pow(features.isLineTag - sample.features.isLineTag, 2) * 3.0;

        if (d < minDistance) {
          minDistance = d;
          learnedBoostKind = sample.kind;
        }
      }
    }

    // Se houver padrão memorizado pelo usuário
    let isLearned = false;
    if (isExactLearned && learnedBoostKind) {
      isLearned = true;
      probs[learnedBoostKind] += 3.0;
      const newSum = kinds.reduce((acc, k) => acc + probs[k], 0);
      for (const k of kinds) probs[k] /= newSum;
    } else if (learnedBoostKind && minDistance < 0.8) {
      isLearned = true;
      probs[learnedBoostKind] += 1.2;
      const newSum = kinds.reduce((acc, k) => acc + probs[k], 0);
      for (const k of kinds) probs[k] /= newSum;
    }

    // 3. Escolhe a classe de maior probabilidade (ArgMax)
    let bestKind: DetectionKind = kinds[0];
    let highestProb = -1;

    for (const kind of kinds) {
      if (probs[kind] > highestProb) {
        highestProb = probs[kind];
        bestKind = kind;
      }
    }

    // Calibra a confiança (mínimo 0.60, máximo 0.98)
    const calibratedConfidence = Math.min(0.98, Math.max(0.60, Number(highestProb.toFixed(2))));

    const learnedText = isLearned ? " [Reforçado por modelo ML treinado localmente]" : "";
    const rationale = `Classificado pelo modelo ML como ${bestKind.toUpperCase()} (${Math.round(calibratedConfidence * 100)}%). ${isa.rationale}${learnedText}`;

    return {
      kind: bestKind,
      group: isa.group,
      confidence: calibratedConfidence,
      isLearned,
      rationale,
      featureScores: probs,
    };
  }

  /**
   * Treina o modelo adicionando uma nova amostra confirmada pelo engenheiro humano.
   */
  public trainSample(tag: string, box: Box, docWidth: number, docHeight: number, targetKind: DetectionKind): void {
    const features = this.extractFeatures(box, tag, docWidth, docHeight);
    this.learnedPatterns.push({
      id: `pattern-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tag: tag.trim(),
      kind: targetKind,
      features,
      timestamp: Date.now(),
    });
    this.persistLearnedPatterns();
  }

  public getLearnedPatternsCount(): number {
    return this.learnedPatterns.length;
  }

  public clearLearnedPatterns(): void {
    this.learnedPatterns = [];
    this.persistLearnedPatterns();
  }
}

export const pidMLEngine = new PidMLEngine();
