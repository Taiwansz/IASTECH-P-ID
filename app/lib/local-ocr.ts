import type { Detection, DetectionKind } from "./demo-data";

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

const equipmentPrefixes = new Set(["B", "E", "K", "MJ", "P", "T", "V", "VP", "W"]);
const instrumentPrefixes = new Set(["AI", "DI", "DPIC", "FI", "FIC", "FQ", "FQR", "LI", "LIC", "LS", "PI", "PIC", "TI", "TIC"]);
const valvePrefixes = new Set(["FC", "FV", "LC", "LV", "NC", "NO", "PCV", "PSV", "PV", "VA"]);
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

const canonicalizeTag = (rawValue: string) => {
  const value = normalize(rawValue).replace(/^([A-Z])\1(?=[-.]?\d)/, "$1");
  for (const prefix of knownPrefixes) {
    if (!value.startsWith(prefix)) continue;
    const suffix = value
      .slice(prefix.length)
      .replace(/^[-.]/, "")
      .replace(/[ODQ]/g, "0")
      .replace(/[IL]/g, "1");
    if (/^\d{1,4}(?:[A-Z]|\.\d{1,2})?$/.test(suffix)) return `${prefix}-${suffix}`;
  }
  return value;
};

const splitPrefix = (value: string) => value.match(/^([A-Z]{1,5})[-.]?(\d[0-9A-Z.]*)$/);

const classify = (value: string): { kind: DetectionKind; group: string } => {
  const match = splitPrefix(value);
  const prefix = match?.[1] ?? value.match(/^[A-Z]+/)?.[0] ?? "";
  if (valvePrefixes.has(prefix)) return { kind: "valve", group: "Válvula e elemento final" };
  if (instrumentPrefixes.has(prefix)) return { kind: "instrument", group: "Instrumentação e controle" };
  if (equipmentPrefixes.has(prefix)) return { kind: "equipment", group: "Equipamento de processo" };
  return { kind: "tag", group: "TAG não classificado" };
};

const looksLikeTag = (value: string) => {
  if (value.length < 2 || value.length > 16) return false;
  if (/^(NOTE|FROM|TO|WATER|STEAM|REST|STUFF|EXISTING|SET|PSIG)$/.test(value)) return false;
  return /^[A-Z]{1,5}[-.]?\d{1,4}(?:[A-Z]|\.\d{1,2})?$/.test(value);
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

export const detectionsFromTsv = (tsv: string): Detection[] => {
  const words = parseTsv(tsv);
  const candidates: Array<{ word: TsvWord; value: string; raw: string }> = [];

  words.forEach((word, index) => {
    const current = normalize(word.text);
    const next = words[index + 1];
    const sameLine = next && `${word.block}.${word.paragraph}.${word.line}` === `${next.block}.${next.paragraph}.${next.line}`;
    const joined = sameLine && /^[A-Z]{1,5}$/.test(current) ? `${current}-${normalize(next.text)}` : current;
    const raw = looksLikeTag(canonicalizeTag(joined)) ? joined : current;
    const value = canonicalizeTag(raw);
    if (looksLikeTag(value)) candidates.push({ word, value, raw });
  });

  const unique = new Map<string, Detection>();
  candidates.forEach(({ word, value, raw }, index) => {
    const classification = classify(value);
    const confidence = Math.max(0.18, Math.min(0.97, word.confidence / 100));
    const key = `${value}-${Math.round(word.left / 8)}-${Math.round(word.top / 8)}`;
    if (unique.has(key)) return;
    unique.set(key, {
      id: `ocr-${index}-${word.left}-${word.top}`,
      label: value,
      normalized: value,
      kind: classification.kind,
      group: classification.group,
      confidence,
      status: confidence >= 0.78 ? "accepted" : "review",
      source: "local-ocr",
      box: { x: word.left, y: word.top, width: Math.max(18, word.width), height: Math.max(14, word.height) },
      rationale: `Leitura neural local com confiança OCR de ${Math.round(confidence * 100)}%. ${raw !== value ? `Normalizada de ${raw} para ${value}. ` : ""}Classe sugerida pelo prefixo ${value.match(/^[A-Z]+/)?.[0] ?? "não identificado"}.`,
    });
  });

  return Array.from(unique.values()).sort((a, b) => b.confidence - a.confidence);
};

export const runLocalOcr = async (
  image: string | File,
  onProgress: (progress: number, status: string) => void,
): Promise<Detection[]> => {
  const { createWorker, PSM } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    workerPath: "/tesseract-worker.min.js",
    langPath: "/tessdata",
    corePath: "/tesseract-core",
    logger: (event) => {
      const progress = typeof event.progress === "number" ? event.progress : 0;
      const status = typeof event.status === "string" ? event.status : "Inicializando OCR local";
      onProgress(progress, status);
    },
  });

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      preserve_interword_spaces: "1",
    });
    const result = await worker.recognize(image, {}, { tsv: true });
    return detectionsFromTsv(result.data.tsv ?? "");
  } finally {
    await worker.terminate();
  }
};
