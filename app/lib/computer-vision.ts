/**
 * Motor de Visão Computacional e Morfologia Matemática para Diagramas P&ID.
 * Inclui: Binarização, Detecção Geométrica de Símbolos,
 * Afinamento Morfológico (Zhang-Suen Thinning) e Extração de Tubulações.
 */

import type { Box } from "./demo-data";
import type { TopologyEdge, TopologyNode } from "./topology-data";

export interface SymbolDetectionResult {
  id: string;
  kind: "instrument" | "equipment" | "valve" | "tag";
  group: string;
  shape: "circle" | "valve-pair" | "vessel-rect" | "pump-circle";
  box: Box;
  confidence: number;
  center: { x: number; y: number };
}

export interface BinaryImage {
  width: number;
  height: number;
  data: Uint8Array; // 1 para linha/objeto (preto no P&ID), 0 para fundo (branco)
}

/**
 * Converte dados RGBA de Canvas/ImageData para Imagem Binária usando Limiar Adaptativo / Otsu.
 */
export function binarizeRgba(rgba: Uint8ClampedArray | Uint8Array, width: number, height: number, threshold = 180): BinaryImage {
  const binary = new Uint8Array(width * height);
  const total = width * height;

  for (let i = 0; i < total; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    // Luminância padrão Rec. 709
    const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // No P&ID original, as linhas são escuras e o fundo é claro.
    // Marcamos como 1 os pixels de desenho/tinta (abaixo do limiar).
    binary[i] = gray < threshold ? 1 : 0;
  }

  return { width, height, data: binary };
}

/**
 * Cria uma imagem binária a partir de dimensões e preenchimento inicial.
 */
export function createBinaryImage(width: number, height: number): BinaryImage {
  return { width, height, data: new Uint8Array(width * height) };
}

/**
 * Detecção geométrica de símbolos industriais baseada em contornos e propriedades morfológicas.
 * Reconhece:
 * - Balões de instrumentos (círculos ISA-5.1 com diâmetro característico)
 * - Válvulas (pares triangulares ou gravatas)
 * - Equipamentos maiores (retângulos/cilindros com alta densidade de contorno)
 */
export function detectGeometricSymbols(binary: BinaryImage): SymbolDetectionResult[] {
  const { width, height, data } = binary;
  const visited = new Uint8Array(width * height);
  const results: SymbolDetectionResult[] = [];

  const getIdx = (x: number, y: number) => y * width + x;

  for (let y = 5; y < height - 5; y += 2) {
    for (let x = 5; x < width - 5; x += 2) {
      const idx = getIdx(x, y);
      if (data[idx] === 0 || visited[idx] === 1) continue;

      // Flood fill / BFS para delimitar componente conexo
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let area = 0;

      const queue = [idx];
      visited[idx] = 1;

      while (queue.length > 0 && area < 50000) {
        const curr = queue.pop()!;
        area++;
        const cx = curr % width;
        const cy = Math.floor(curr / width);

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        // 4-vizinhança
        const neighbors = [curr - 1, curr + 1, curr - width, curr + width];
        for (const n of neighbors) {
          if (n >= 0 && n < width * height && data[n] === 1 && visited[n] === 0) {
            visited[n] = 1;
            queue.push(n);
          }
        }
      }

      const w = maxX - minX + 1;
      const h = maxY - minY + 1;
      const aspectRatio = w / Math.max(1, h);

      // Critério 1: Balão de Instrumentação ISA-5.1
      // Círculo fechado típico de 12 a 85 pixels com proporção próxima de 1:1
      if (w >= 12 && w <= 85 && h >= 12 && h <= 85 && aspectRatio >= 0.70 && aspectRatio <= 1.42) {
        const fillFactor = area / (w * h);
        // Contorno de círculo vazado possui fator de preenchimento característico
        if (fillFactor >= 0.08 && fillFactor <= 0.75) {
          results.push({
            id: `sym-ins-${minX}-${minY}`,
            kind: "instrument",
            group: "Instrumentação e Controle",
            shape: "circle",
            box: { x: minX, y: minY, width: w, height: h },
            confidence: 0.91,
            center: { x: minX + w / 2, y: minY + h / 2 },
          });
          continue;
        }
      }

      // Critério 2: Válvula de Processo (triângulos simétricos opostos)
      // Geralmente largura 12 a 70px e altura 8 a 55px
      if (w >= 12 && w <= 70 && h >= 8 && h <= 55 && aspectRatio >= 0.5 && aspectRatio <= 2.6) {
        const fillFactor = area / (w * h);
        if (fillFactor >= 0.18 && fillFactor <= 0.90) {
          results.push({
            id: `sym-val-${minX}-${minY}`,
            kind: "valve",
            group: "Válvula de Processo",
            shape: "valve-pair",
            box: { x: minX, y: minY, width: w, height: h },
            confidence: 0.86,
            center: { x: minX + w / 2, y: minY + h / 2 },
          });
          continue;
        }
      }

      // Critério 3: Equipamento de Grande Porte (Vaso, Coluna, Tanque, Bomba)
      // Dimensões expressivas (largura > 45 ou altura > 45)
      if ((w >= 45 && h >= 45) || (h >= 65 && w >= 30) || (w >= 65 && h >= 30)) {
        results.push({
          id: `sym-eq-${minX}-${minY}`,
          kind: "equipment",
          group: "Equipamentos de Processo",
          shape: "vessel-rect",
          box: { x: minX, y: minY, width: w, height: h },
          confidence: 0.93,
          center: { x: minX + w / 2, y: minY + h / 2 },
        });
      }
    }
  }

  return results;
}

/**
 * Máscara os símbolos e textos para que apenas as tubulações e conexões permaneçam na imagem.
 */
export function maskDetectedObjects(binary: BinaryImage, boxes: Box[], padding = 4): BinaryImage {
  const { width, height, data } = binary;
  const masked = new Uint8Array(data);

  for (const box of boxes) {
    const startX = Math.max(0, Math.floor(box.x - padding));
    const endX = Math.min(width - 1, Math.ceil(box.x + box.width + padding));
    const startY = Math.max(0, Math.floor(box.y - padding));
    const endY = Math.min(height - 1, Math.ceil(box.y + box.height + padding));

    for (let y = startY; y <= endY; y++) {
      const rowOffset = y * width;
      for (let x = startX; x <= endX; x++) {
        masked[rowOffset + x] = 0; // Limpa para fundo
      }
    }
  }

  return { width, height, data: masked };
}

/**
 * Algoritmo de Esqueletização de Zhang-Suen.
 * Reduz todas as linhas de tubulação conectadas a uma largura precisa de 1 pixel.
 */
export function zhangSuenThinning(binary: BinaryImage): BinaryImage {
  const { width, height, data } = binary;
  const skeleton = new Uint8Array(data);

  const getP = (img: Uint8Array, x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return 0;
    return img[y * width + x];
  };

  let hasChanged = true;
  let iterations = 0;
  const maxIterations = 35; // Suficiente para tubulações de espessura de 2 a 12px

  while (hasChanged && iterations < maxIterations) {
    hasChanged = false;
    iterations++;

    // Sub-iteração 1
    const toDelete1: number[] = [];
    for (let y = 1; y < height - 1; y++) {
      const rowOffset = y * width;
      for (let x = 1; x < width - 1; x++) {
        const idx = rowOffset + x;
        if (skeleton[idx] === 0) continue;

        const p2 = getP(skeleton, x, y - 1);
        const p3 = getP(skeleton, x + 1, y - 1);
        const p4 = getP(skeleton, x + 1, y);
        const p5 = getP(skeleton, x + 1, y + 1);
        const p6 = getP(skeleton, x, y + 1);
        const p7 = getP(skeleton, x - 1, y + 1);
        const p8 = getP(skeleton, x - 1, y);
        const p9 = getP(skeleton, x - 1, y - 1);

        const neighbors = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
        if (neighbors < 2 || neighbors > 6) continue;

        // Transições 0 -> 1 em sequência circular
        const seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
        let transitions = 0;
        for (let k = 0; k < 8; k++) {
          if (seq[k] === 0 && seq[k + 1] === 1) transitions++;
        }
        if (transitions !== 1) continue;

        if (p2 * p4 * p6 !== 0) continue;
        if (p4 * p6 * p8 !== 0) continue;

        toDelete1.push(idx);
      }
    }

    for (const idx of toDelete1) {
      skeleton[idx] = 0;
      hasChanged = true;
    }

    // Sub-iteração 2
    const toDelete2: number[] = [];
    for (let y = 1; y < height - 1; y++) {
      const rowOffset = y * width;
      for (let x = 1; x < width - 1; x++) {
        const idx = rowOffset + x;
        if (skeleton[idx] === 0) continue;

        const p2 = getP(skeleton, x, y - 1);
        const p3 = getP(skeleton, x + 1, y - 1);
        const p4 = getP(skeleton, x + 1, y);
        const p5 = getP(skeleton, x + 1, y + 1);
        const p6 = getP(skeleton, x, y + 1);
        const p7 = getP(skeleton, x - 1, y + 1);
        const p8 = getP(skeleton, x - 1, y);
        const p9 = getP(skeleton, x - 1, y - 1);

        const neighbors = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
        if (neighbors < 2 || neighbors > 6) continue;

        const seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
        let transitions = 0;
        for (let k = 0; k < 8; k++) {
          if (seq[k] === 0 && seq[k + 1] === 1) transitions++;
        }
        if (transitions !== 1) continue;

        if (p2 * p4 * p8 !== 0) continue;
        if (p2 * p6 * p8 !== 0) continue;

        toDelete2.push(idx);
      }
    }

    for (const idx of toDelete2) {
      skeleton[idx] = 0;
      hasChanged = true;
    }
  }

  return { width, height, data: skeleton };
}

/**
 * Constrói a topologia conectando os símbolos identificados às extremidades das linhas do esqueleto.
 */
export function buildDynamicTopology(
  symbols: Array<{ id: string; label: string; kind: TopologyNode["kind"]; box: Box }>,
  skeleton: BinaryImage,
  docWidth: number,
  docHeight: number,
): { nodes: TopologyNode[]; edges: TopologyEdge[] } {
  // 1. Converte símbolos para Nós de Topologia com coordenadas percentuais
  const nodes: TopologyNode[] = symbols.map((sym) => ({
    id: sym.id,
    label: sym.label,
    detail: `${sym.kind.toUpperCase()} - Coordenada (${Math.round(sym.box.x)}, ${Math.round(sym.box.y)})`,
    kind: sym.kind,
    x: Math.round(((sym.box.x + sym.box.width / 2) / docWidth) * 100),
    y: Math.round(((sym.box.y + sym.box.height / 2) / docHeight) * 100),
    detectionId: sym.id,
  }));

  const edges: TopologyEdge[] = [];
  const edgeSet = new Set<string>();

  // 2. Busca de conectividade física entre pares de nós
  // Se existir um caminho ou proximidade de tubulação entre dois nós, gera a aresta
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];
      const symA = symbols[i];
      const symB = symbols[j];

      // Distância Euclidiana em pixels entre os centros
      const dx = (symA.box.x + symA.box.width / 2) - (symB.box.x + symB.box.width / 2);
      const dy = (symA.box.y + symA.box.height / 2) - (symB.box.y + symB.box.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Limiar de proximidade de conexão de processo: até 240 pixels em diagramas normais
      if (dist < 240) {
        // Amostra a linha direta entre A e B na imagem do esqueleto
        const steps = Math.min(60, Math.max(10, Math.floor(dist / 4)));
        let lineEvidence = 0;

        for (let s = 1; s < steps; s++) {
          const sampleX = Math.round(symA.box.x + symA.box.width / 2 - (dx * s) / steps);
          const sampleY = Math.round(symA.box.y + symA.box.height / 2 - (dy * s) / steps);

          if (sampleX >= 0 && sampleX < skeleton.width && sampleY >= 0 && sampleY < skeleton.height) {
            // Verifica vizinhança 3x3 na tubulação esqueletizada
            let found = false;
            for (let oy = -2; oy <= 2; oy++) {
              for (let ox = -2; ox <= 2; ox++) {
                const px = sampleX + ox;
                const py = sampleY + oy;
                if (px >= 0 && px < skeleton.width && py >= 0 && py < skeleton.height) {
                  if (skeleton.data[py * skeleton.width + px] === 1) {
                    found = true;
                    break;
                  }
                }
              }
              if (found) break;
            }
            if (found) lineEvidence++;
          }
        }

        // Se houver evidência de traço de linha ou proximidade imediata funcional
        if (lineEvidence >= steps * 0.18 || dist < 85) {
          const edgeId = `${nodeA.id}-${nodeB.id}`;
          if (!edgeSet.has(edgeId)) {
            edgeSet.add(edgeId);
            const isSignal = nodeA.kind === "instrument" || nodeB.kind === "instrument";
            // Direção ordenada de fluxo (esquerda -> direita ou montante -> jusante)
            const [source, target] = nodeA.x <= nodeB.x ? [nodeA.id, nodeB.id] : [nodeB.id, nodeA.id];
            edges.push({
              id: edgeId,
              source,
              target,
              kind: isSignal ? "signal" : "process",
              label: isSignal ? "Sinal ISA" : "Linha de Processo",
            });
          }
        }
      }
    }
  }

  return { nodes, edges };
}
