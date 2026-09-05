import type { Box, Detection, DetectionKind, DetectionStatus } from "./demo-data.ts";
import type { Worker } from "tesseract.js";
import { parseIsaTag } from "./isa51-rules.ts";
import { detectGeometricSymbols, binarizeRgba, type SymbolDetectionResult } from "./computer-vision.ts";
import { pidMLEngine } from "./ml-pid-engine.ts";

interface TsvWord {
  block: string;
  paragraph: string;
  line: string;
  left: number;
  top: number;
  width: number;
  height: number;
  confidence: number;
  text: string;
}

const equipmentPrefixes = new Set([
  "B", "C", "CR", "D", "E", "F", "G", "H", "K", "M", "MJ", "P", "R", "S", "T", "TK", "V", "VP", "W",
]);
const instrumentPrefixes = new Set([
  "AI", "DI", "DPIC", "FI", "FIC", "FQ", "FQR", "LI", "LIC", "LS", "PI", "PIC", "TI", "TIC",
]);
const valvePrefixes = new Set([
  "CV", "FC", "FCV", "FV", "HV", "LC", "LCV", "LV", "MOV", "NC", "NO", "PCV", "PRV", "PSV", "PV", "RO", "SOV", "TCV", "TV", "VA", "XV",
]);
const knownPrefixes = Array.from(new Set([...equipmentPrefixes, ...instrumentPrefixes, ...valvePrefixes])).sort(
  (left, right) => right.length - left.length,
);

const normalize = (value: string) =>
  value
    .toUpperCase()
    .replace(/[—–_]/g, "-")
    .replace(/[^A-Z0-9.\-/]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/-{2,}/g, "-");

export const canonicalizeTag = (rawValue: string) => {
  const value = normalize(rawValue).replace(/^([A-Z])\1(?=[-.]?\d)/, "$1");

  // Extrai prefixo de área opcional (ex: "20-", "300-", "XX-", "250-")
  const areaMatch = value.match(/^(\d{1,4}|XX)[-.]/);
  const areaPrefix = areaMatch ? areaMatch[0] : "";
  const coreValue = areaPrefix ? value.slice(areaPrefix.length) : value;

  for (const prefix of knownPrefixes) {
    if (!coreValue.startsWith(prefix)) continue;
    const rawSuffix = coreValue.slice(prefix.length).replace(/^[-.]/, "");

    // Se já for um padrão industrial válido com letras legítimas no sufixo (ex: P-01D, V-101L, 20-P-0201A), preserva intacto
    if (/^\d{1,6}(?:[A-Z]|\/[A-Z]|\.\d{1,2})?$/.test(rawSuffix)) {
      return `${areaPrefix}${prefix}-${rawSuffix}`;
    }

    // Se não for válido, tenta reparar confusões clássicas de OCR em dígitos (ex: BO2 -> B-02)
    const repairedSuffix = rawSuffix
      .replace(/[ODQ]/g, "0")
      .replace(/[IL]/g, "1");
    if (/^\d{1,6}(?:[A-Z]|\/[A-Z]|\.\d{1,2})?$/.test(repairedSuffix)) {
      return `${areaPrefix}${prefix}-${repairedSuffix}`;
    }
  }
  return value;
};

export const classify = (value: string): { kind: DetectionKind; group: string; rationale: string } => {
  const isa = parseIsaTag(value);
  return { kind: isa.kind, group: isa.group, rationale: isa.rationale };
};

const looksLikeTag = (value: string) => {
  if (value.length < 2 || value.length > 36) return false;
  if (/^(NOTE|FROM|TO|WATER|STEAM|REST|STUFF|EXISTING|SET|PSIG|EACH|REFLUX)$/.test(value)) return false;

  // 1. TAG industrial com prefixo de área (ex: 20-P-0201A, 20-PI-0201, 20-FV-0201, 20-P-0201A/B)
  if (/^(\d{1,4}|XX)[-.]?[A-Z]{1,6}[-.]?\d{1,6}(?:[A-Z]|\/[A-Z]|\.\d{1,2})?$/.test(value)) return true;

  // 2. TAG industrial clássica (ex: P-01, PIC-01, VA-13, B-02, W-01, P-0201A)
  if (/^[A-Z]{1,6}[-.]?\d{1,6}(?:[A-Z]|\/[A-Z]|\.\d{1,2})?$/.test(value)) return true;

  // 3. Linha de processo / tubulação (ex: 250-P01-20020404-B01C-HC, XX-CWS-20020415)
  if (/^(\d{2,4}|XX)[-.]?[A-Z0-9]{2,6}[-.]?\d{4,8}/.test(value)) return true;

  // 4. Códigos operacionais de malha (ex: START/STOP, ENABLE/DISABLE)
  if (/^(START\/STOP|ENABLE\/DISABLE|RUN\/STOP|AUTO\/MAN)$/.test(value)) return true;

  return false;
};

const parseTsv = (tsv: string): TsvWord[] =>
  tsv
    .split("\n")
    .slice(1)
    .map((line) => line.split("\t"))
    .filter((columns) => columns.length >= 12 && columns[0] === "5" && columns[11]?.trim())
    .map((columns) => ({
      block: columns[2],
      paragraph: columns[3],
      line: columns[4],
      left: Number(columns[6]),
      top: Number(columns[7]),
      width: Number(columns[8]),
      height: Number(columns[9]),
      confidence: Math.max(0, Number(columns[10])),
      text: columns[11].trim(),
    }));

/**
 * Associa detecções geométricas de símbolos industriais (círculos ISA-5.1, pares de válvulas, equipamentos)
 * com as detecções de texto do OCR por proximidade espacial e compatibilidade funcional.
 */
export function associateSymbolsWithOcr(
  detections: Detection[],
  symbols: SymbolDetectionResult[],
): Detection[] {
  if (!symbols || symbols.length === 0) return detections;

  const usedSymbols = new Set<string>();

  const matchedDetections = detections.map((detection) => {
    const ocrCenterX = detection.box.x + detection.box.width / 2;
    const ocrCenterY = detection.box.y + detection.box.height / 2;

    let bestSymbol: SymbolDetectionResult | null = null;
    let minDistance = Infinity;

    for (const sym of symbols) {
      if (usedSymbols.has(sym.id)) continue;

      const dyWeight = sym.shape === "valve-pair" ? 2.8 : 1.0;
      const dx = ocrCenterX - sym.center.x;
      const dy = ocrCenterY - sym.center.y;
      const dist = Math.sqrt(dx * dx + (dy * dyWeight) * (dy * dyWeight));

      // Tolerância vertical anisotrópica para válvulas em manifolds empilhados
      if (sym.shape === "valve-pair") {
        const absDy = Math.abs(dy);
        if (absDy > 20) {
          const hasCloserInY = symbols.some(
            (other) =>
              other.id !== sym.id &&
              other.shape === "valve-pair" &&
              Math.abs(ocrCenterY - other.center.y) < absDy,
          );
          if (hasCloserInY) {
            continue;
          }
        }
      }

      // Caixa delimitadora expandida para tolerância de posicionamento do TAG
      const padding = 16;
      const isInside =
        ocrCenterX >= sym.box.x - padding &&
        ocrCenterX <= sym.box.x + sym.box.width + padding &&
        ocrCenterY >= sym.box.y - padding &&
        ocrCenterY <= sym.box.y + sym.box.height + padding;

      const maxDist =
        sym.shape === "circle"
          ? Math.max(50, Math.max(sym.box.width, sym.box.height) * 0.9)
          : sym.shape === "valve-pair"
            ? 65
            : Math.max(70, Math.max(sym.box.width, sym.box.height) * 0.75);

      if ((isInside || dist <= maxDist) && dist < minDistance) {
        const isCompatible =
          detection.kind === "tag" ||
          sym.kind === "tag" ||
          detection.kind === sym.kind;

        if (isCompatible) {
          minDistance = dist;
          bestSymbol = sym;
        }
      }
    }

    if (!bestSymbol) return detection;

    usedSymbols.add(bestSymbol.id);

    // Refinamento de classificação quando o OCR for genérico ("tag")
    const kind = detection.kind === "tag" && bestSymbol.kind !== "tag" ? bestSymbol.kind : detection.kind;
    const group =
      detection.group === "TAG Não Classificado" || detection.group === "TAG não classificado"
        ? bestSymbol.group
        : detection.group;

    // Fusão probabilística de confiança multimodal (OCR + Morfologia do Símbolo)
    const fusedConfidence = Math.min(
      0.98,
      Math.max(detection.confidence, (detection.confidence + bestSymbol.confidence) / 2 + 0.05),
    );
    const status: DetectionStatus = fusedConfidence >= 0.78 ? "accepted" : "review";

    const symbolRationale = ` Confirmado por símbolo geométrico ${bestSymbol.shape} (${bestSymbol.group}) com confiança visual de ${Math.round(bestSymbol.confidence * 100)}%.`;

    return {
      ...detection,
      kind,
      group,
      confidence: Number(fusedConfidence.toFixed(2)),
      status,
      symbolId: bestSymbol.id,
      rationale: `${detection.rationale}${symbolRationale}`,
    };
  });

  // Preserva e integra 100% dos símbolos visuais morfológicos não vinculados a palavras de texto
  const unattachedDetections: Detection[] = symbols
    .filter((sym) => !usedSymbols.has(sym.id))
    .map((sym) => {
      const feat = pidMLEngine.extractFeatures(sym.box, sym.group, 2500, 1500, sym.shape);
      const pred = pidMLEngine.predict(feat, sym.group);
      const label = "Símbolo sem TAG";
      return {
        id: `vis-${sym.id}`,
        label,
        normalized: label,
        kind: pred.kind,
        group: sym.group,
        confidence: Number(pred.confidence.toFixed(2)),
        status: "review" as const,
        source: "local-ocr" as const,
        box: sym.box,
        symbolId: sym.id,
        rationale: `Símbolo visual ${sym.shape} extraído diretamente do diagrama e classificado via ML local (${pred.rationale}). Aguardando confirmação do TAG na revisão.`,
      };
    });

  return [...matchedDetections, ...unattachedDetections];
}

export const associateGeometricSymbols = associateSymbolsWithOcr;

export const detectionsFromTsv = (
  tsv: string,
  geometricSymbols?: SymbolDetectionResult[],
): Detection[] => {
  const words = parseTsv(tsv);
  const candidates: Array<{ box: Box; confidence: number; value: string; raw: string }> = [];

  let skipNext = false;
  for (let index = 0; index < words.length; index++) {
    if (skipNext) {
      skipNext = false;
      continue;
    }

    const word = words[index];
    const next = words[index + 1];
    const current = normalize(word.text);
    const sameLine =
      Boolean(next && `${word.block}.${word.paragraph}.${word.line}` === `${next.block}.${next.paragraph}.${next.line}`);

    let isCompound = false;
    let joined = current;

    if (sameLine && next) {
      const nextNorm = normalize(next.text);
      const candidateJoined1 = `${current.replace(/-$/, "")}-${nextNorm.replace(/^-/, "")}`;
      const candidateJoined2 = `${current}${nextNorm}`;
      if (looksLikeTag(canonicalizeTag(candidateJoined1))) {
        joined = candidateJoined1;
        isCompound = true;
      } else if (looksLikeTag(canonicalizeTag(candidateJoined2))) {
        joined = candidateJoined2;
        isCompound = true;
      }
    }

    const raw = looksLikeTag(canonicalizeTag(joined)) ? joined : current;
    const value = canonicalizeTag(raw);

    if (looksLikeTag(value)) {
      let box: Box;
      let conf = word.confidence;

      if (isCompound && next) {
        const left = Math.min(word.left, next.left);
        const top = Math.min(word.top, next.top);
        const width = Math.max(word.left + word.width, next.left + next.width) - left;
        const height = Math.max(word.top + word.height, next.top + next.height) - top;

        box = {
          x: left,
          y: top,
          width: Math.max(18, width),
          height: Math.max(14, height),
        };
        conf = (word.confidence + next.confidence) / 2;
        skipNext = true;
      } else {
        box = {
          x: word.left,
          y: word.top,
          width: Math.max(18, word.width),
          height: Math.max(14, word.height),
        };
      }

      candidates.push({ box, confidence: conf, value, raw });
    }
  }

  const unique = new Map<string, Detection>();
  candidates.forEach(({ box, confidence: rawConf, value, raw }, index) => {
    const isa = parseIsaTag(value);
    const features = pidMLEngine.extractFeatures(box, value, 2500, 1500);
    const mlPred = pidMLEngine.predict(features, value);
    const ocrConf = Math.max(0.18, Math.min(0.97, rawConf / 100));
    const confidence = Number(Math.max(0.18, Math.min(0.98, ocrConf * 0.65 + mlPred.confidence * 0.35)).toFixed(2));
    const status = ocrConf >= 0.78 && confidence >= 0.78 ? "accepted" : "review";
    const key = `${value}-${Math.round(box.x / 8)}-${Math.round(box.y / 8)}`;
    if (unique.has(key)) return;

    const normText = raw !== value ? `Normalizada de ${raw} para ${value}. ` : "";
    const mlNotice = mlPred.isLearned ? " [Reforçado por modelo ML treinado localmente]" : "";
    const finalKind = isa.kind !== "tag" ? isa.kind : mlPred.kind;
    const finalGroup = isa.kind !== "tag" ? isa.group : (mlPred.group || isa.group);
    unique.set(key, {
      id: `ocr-${index}-${box.x}-${box.y}`,
      label: value,
      normalized: value,
      kind: finalKind,
      group: finalGroup,
      confidence,
      status,
      source: "local-ocr",
      box,
      rationale: `Leitura neural local (OCR ${Math.round(ocrConf * 100)}% + Validação ML ${Math.round(mlPred.confidence * 100)}%). ${normText}${isa.rationale}${mlNotice}`,
    });
  });

  const detections = Array.from(unique.values()).sort((a, b) => b.confidence - a.confidence);

  if (geometricSymbols && geometricSymbols.length > 0) {
    return associateSymbolsWithOcr(detections, geometricSymbols);
  }

  return detections;
};

let globalWorker: Worker | null = null;

export async function getTesseractWorker(
  onProgress?: (progress: number, status: string) => void,
): Promise<Worker> {
  if (globalWorker) {
    return globalWorker;
  }
  const { createWorker } = await import("tesseract.js");
  const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";
  const workerOptions = isBrowser
    ? {
        workerPath: "/tesseract-worker.min.js",
        langPath: "/tessdata",
        corePath: "/tesseract-core",
        logger: (event: { progress?: number; status?: string }) => {
          if (onProgress) {
            const progress = typeof event.progress === "number" ? event.progress : 0;
            const status = typeof event.status === "string" ? event.status : "Inicializando OCR local";
            onProgress(progress, status);
          }
        },
      }
    : {
        logger: (event: { progress?: number; status?: string }) => {
          if (onProgress) {
            const progress = typeof event.progress === "number" ? event.progress : 0;
            const status = typeof event.status === "string" ? event.status : "Inicializando OCR local";
            onProgress(progress, status);
          }
        },
      };
  globalWorker = await createWorker("eng", 1, workerOptions);
  return globalWorker;
}

export async function terminateTesseractWorker(): Promise<void> {
  if (globalWorker) {
    try {
      await globalWorker.terminate();
    } catch {
      // Ignora erro ao encerrar worker
    } finally {
      globalWorker = null;
    }
  }
}

export const runLocalOcr = async (
  image: string | File,
  onProgress: (progress: number, status: string) => void,
): Promise<Detection[]> => {
  let geometricSymbols: SymbolDetectionResult[] = [];

  // 1. Extração morfológica e geométrica rápida via Canvas (quando em navegador)
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    try {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      const url = typeof image === "string" ? image : URL.createObjectURL(image);
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = url;
      });

      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        const canvas = document.createElement("canvas");
        const maxDim = 1800;
        const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
        const sw = Math.round(img.naturalWidth * scale);
        const sh = Math.round(img.naturalHeight * scale);
        canvas.width = sw;
        canvas.height = sh;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, sw, sh);
          const imgData = ctx.getImageData(0, 0, sw, sh);
          const binary = binarizeRgba(imgData.data, sw, sh);
          const rawSymbols = detectGeometricSymbols(binary);
          geometricSymbols = rawSymbols.map((s) => ({
            ...s,
            box: {
              x: Math.round(s.box.x / scale),
              y: Math.round(s.box.y / scale),
              width: Math.round(s.box.width / scale),
              height: Math.round(s.box.height / scale),
            },
            center: {
              x: Math.round(s.center.x / scale),
              y: Math.round(s.center.y / scale),
            },
          }));
        }
      }

      if (typeof image !== "string") {
        URL.revokeObjectURL(url);
      }
    } catch {
      // Degradação elegante caso o canvas local não suporte a imagem
    }
  }

  // 2. Execução do OCR neural Tesseract com worker Singleton persistente
  try {
    const { PSM } = await import("tesseract.js");
    const worker = await getTesseractWorker(onProgress);

    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      preserve_interword_spaces: "1",
    });
    const result = await worker.recognize(image, {}, { tsv: true });
    const detections = detectionsFromTsv(result.data.tsv ?? "", geometricSymbols);
    if (detections.length > 0) return detections;
  } catch (ocrError) {
    console.warn("OCR worker notice:", ocrError);
    await terminateTesseractWorker();
  }

  // Fallback inteligente: se o OCR não detectou texto ou houve erro,
  // utiliza os símbolos geométricos preservados como formas visuais sem TAG inventado!
  if (geometricSymbols.length > 0) {
    return geometricSymbols.map((sym, i) => {
      const feat = pidMLEngine.extractFeatures(sym.box, sym.group, 2500, 1500, sym.shape);
      const pred = pidMLEngine.predict(feat, sym.group);
      const label = "Símbolo sem TAG";
      return {
        id: `ml-sym-${i}-${sym.box.x}-${sym.box.y}`,
        label,
        normalized: label,
        kind: pred.kind,
        group: sym.group,
        confidence: Number(pred.confidence.toFixed(2)),
        status: pred.confidence >= 0.78 ? "accepted" : "review",
        source: "local-ocr",
        box: sym.box,
        symbolId: sym.id,
        rationale: `Detectado pelo motor visual e classificado via ML (${sym.shape}). ${pred.rationale}`,
      };
    });
  }

  return [];
};

/**
 * Execução rápida de OCR focalizado em recortes de imagem (ROI) selecionados manualmente pelo usuário.
 * Recorta a região no Canvas (se em ambiente de browser) ou utiliza o Tesseract com modo PSM.SINGLE_LINE.
 */
export async function recognizeRoi(
  image: string | File,
  box: Box,
): Promise<{ text: string; confidence: number }> {
  try {
    const { PSM } = await import("tesseract.js");
    const worker = await getTesseractWorker();

    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
      preserve_interword_spaces: "1",
    });

    let targetImage: string | File | HTMLCanvasElement = image;

    if (typeof window !== "undefined" && typeof document !== "undefined") {
      try {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        const url = typeof image === "string" ? image : URL.createObjectURL(image);
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Erro ao carregar imagem para recorte de ROI"));
          img.src = url;
        });

        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          const canvas = document.createElement("canvas");
          const cropX = Math.max(0, Math.round(box.x));
          const cropY = Math.max(0, Math.round(box.y));
          const cropW = Math.max(1, Math.min(img.naturalWidth - cropX, Math.round(box.width)));
          const cropH = Math.max(1, Math.min(img.naturalHeight - cropY, Math.round(box.height)));
          canvas.width = cropW;
          canvas.height = cropH;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(
              img,
              cropX,
              cropY,
              cropW,
              cropH,
              0,
              0,
              cropW,
              cropH,
            );
            targetImage = canvas;
          }
        }

        if (typeof image !== "string") {
          URL.revokeObjectURL(url);
        }
      } catch {
        // Degradação elegante caso a manipulação via canvas falhe
      }
    }

    const recognizeOptions =
      targetImage === image
        ? {
            rectangle: {
              left: Math.max(0, Math.round(box.x)),
              top: Math.max(0, Math.round(box.y)),
              width: Math.max(1, Math.round(box.width)),
              height: Math.max(1, Math.round(box.height)),
            },
          }
        : {};

    const result = await worker.recognize(targetImage, recognizeOptions);
    const rawText = result?.data?.text ? result.data.text.trim() : "";
    const confidence =
      typeof result?.data?.confidence === "number"
        ? Math.max(0, Math.min(1, result.data.confidence / 100))
        : 0;

    return {
      text: rawText,
      confidence: Number(confidence.toFixed(2)),
    };
  } catch (error) {
    console.warn("ROI recognition fallback notice:", error);
    return { text: "", confidence: 0 };
  }
}

