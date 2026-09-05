/**
 * Motor Semântico ANSI/ISA-5.1 para Análise e Validação de TAGs e Malhas de Instrumentação.
 */

export interface Isa51Validation {
  isValid: boolean;
  tag: string;
  kind: "instrument" | "equipment" | "valve" | "tag";
  group: string;
  variable?: string;
  variableModifier?: string;
  functionName?: string;
  functionModifier?: string;
  loopNumber?: string;
  prefix: string;
  suffix: string;
  rationale: string;
  isaStandard: boolean;
}

// 1ª Letra: Variável de Medição ou Inicializadora (ISA-5.1 Tabela 1)
export const MEASURED_VARIABLES: Record<string, string> = {
  A: "Análise / Qualidade físico-química",
  B: "Combustão / Queimador",
  C: "Condutividade",
  D: "Densidade / Peso específico",
  E: "Tensão elétrica",
  F: "Vazão (Flow)",
  G: "Calibre / Dimensão",
  H: "Operação manual (Hand)",
  I: "Corrente elétrica",
  J: "Potência elétrica",
  K: "Tempo / Programação",
  L: "Nível (Level)",
  M: "Umidade",
  N: "Definição do usuário",
  O: "Definição do usuário",
  P: "Pressão / Vácuo (Pressure)",
  Q: "Quantidade / Totalização",
  R: "Radiação",
  S: "Velocidade / Frequência",
  T: "Temperatura",
  U: "Multivariável",
  V: "Vibração / Análise mecânica",
  W: "Peso / Força (Weight)",
  X: "Não classificado",
  Y: "Evento / Estado",
  Z: "Posição / Deslocamento",
};

// Modificadores de variável (2ª letra imediata antes da função)
export const VARIABLE_MODIFIERS: Record<string, string> = {
  D: "Diferencial",
  F: "Razão / Proporção",
  J: "Varredura",
  Q: "Integração / Totalização",
  S: "Segurança",
  X: "Eixo X",
  Y: "Eixo Y",
  Z: "Eixo Z",
};

// Funções de Leitura e Saída (ISA-5.1)
export const FUNCTIONAL_LETTERS: Record<string, string> = {
  A: "Alarme",
  C: "Controlador",
  E: "Elemento Primário / Sensor",
  G: "Visor / Vidro",
  I: "Indicador",
  K: "Estação de controle",
  O: "Orifício / Restrição",
  P: "Ponto de teste",
  R: "Registrador",
  S: "Chave / Switch",
  T: "Transmissor",
  V: "Válvula / Elemento Final",
  W: "Poço termométrico",
  X: "Não classificado",
  Y: "Relé / Conversor / Computador",
  Z: "Atuador / Elemento Final",
};

// Modificadores de função (ISA-5.1 Tabela 1: H, L, M, HH, LL, D)
export const FUNCTION_MODIFIERS: Record<string, string> = {
  HH: "Muito Alta / Trip / Shutdown",
  LL: "Muito Baixa / Trip / Shutdown",
  H: "Alta",
  L: "Baixa",
  M: "Média",
  D: "Desvio / Diferencial",
};

// Prefixos padronizados de Equipamentos de Processo
export const EQUIPMENT_PREFIXES: Record<string, string> = {
  B: "Vaso de processo / Balão",
  C: "Coluna de fracionamento / destilação",
  CR: "Reator químico",
  D: "Secador / Tambor",
  E: "Trocador de calor / Resfriador",
  F: "Filtro / Separador de sólidos",
  G: "Gerador elétrico",
  H: "Fornalha / Aquecedor a fogo",
  K: "Compressor / Soprador / Vaso auxiliar",
  M: "Motor elétrico / Acionador",
  MJ: "Misturador / Agitador",
  P: "Bomba centrífuga / de deslocamento",
  R: "Reator / Autoclave",
  S: "Silo / Tremonha",
  T: "Tanque de armazenamento",
  TK: "Tanque de armazenamento",
  V: "Vaso de pressão horizontal/vertical",
  VP: "Conjunto motor-bomba",
  W: "Trocador de calor / Permutador",
};

// Prefixos padronizados de Válvulas industriais
export const VALVE_PREFIXES: Record<string, string> = {
  AOV: "Válvula com atuador pneumático (Air Operated Valve)",
  BDV: "Válvula de despressurização / alívio rápido (Blowdown Valve)",
  CV: "Válvula de retenção (Check Valve)",
  ESDV: "Válvula de parada de emergência (Emergency Shutdown Valve)",
  FCV: "Válvula de controle de vazão",
  FV: "Válvula de controle de vazão",
  GOV: "Válvula com atuador a gás (Gas Operated Valve)",
  HV: "Válvula manual de bloqueio",
  LCV: "Válvula de controle de nível",
  LV: "Válvula de controle de nível",
  MOV: "Válvula motorizada",
  NC: "Válvula normalmente fechada",
  NO: "Válvula normalmente aberta",
  PCV: "Válvula de controle de pressão",
  PRV: "Válvula reguladora de pressão",
  PSV: "Válvula de segurança e alívio (PSV)",
  PV: "Válvula de controle de pressão",
  PVRV: "Válvula de alívio de pressão e vácuo (Pressure/Vacuum Relief Valve)",
  RO: "Orifício de restrição",
  SDV: "Válvula de corte / desligamento de segurança (Shutdown Valve)",
  SOV: "Válvula solenoide",
  TCV: "Válvula de controle de temperatura",
  TSV: "Válvula de segurança térmica (Thermal Safety Valve)",
  TV: "Válvula de controle de temperatura",
  VA: "Válvula de processo manual/bloqueio",
  XV: "Válvula de corte / intertravamento (Shutoff)",
};

// Padrões e prefixos de anotações de desenho e notas de engenharia
export const DRAWING_NOTE_PATTERNS = /^(NE|NOTA|NOTE|REV|DWG|DETAIL|DET|SEC|SKID|AREA|PACKAGE|SPEC)[-.]?\d*/i;

export const DRAWING_NOTE_PREFIXES = [
  "NE",
  "NOTA",
  "NOTE",
  "REV",
  "DWG",
  "DETAIL",
  "DET",
  "SEC",
  "SKID",
  "AREA",
  "PACKAGE",
  "SPEC",
] as const;

/**
 * Normaliza e analisa sintaticamente um TAG segundo a norma ISA-5.1 e convenções industriais.
 */
export function parseIsaTag(rawTag: string): Isa51Validation {
  const normalized = rawTag
    .toUpperCase()
    .trim()
    .replace(/[—–_]/g, "-")
    .replace(/[^A-Z0-9.\-/]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/-{2,}/g, "-");

  // Extrai prefixo de área opcional (ex: "20-", "300-", "XX-")
  const areaMatch = normalized.match(/^(\d{1,4}|XX)[-.]/);
  const areaPrefix = areaMatch ? areaMatch[0] : "";
  const core = areaPrefix ? normalized.slice(areaPrefix.length) : normalized;

  // Regex para decomposição do TAG central: [PREFIXO][- ou .]?[NUMERO/SUFIXO]
  const match = core.match(/^([A-Z]{1,8})[-.]?(\d[0-9A-Z./]*)$/) ?? core.match(/^([A-Z]{1,8})[-.]([A-Z0-9./]+)$/);
  const prefix = match ? match[1] : (core.match(/^[A-Z]+/)?.[0] ?? "");
  const suffix = match ? match[2] : (core.match(/\d.*$/)?.[0] ?? "");
  const fullTag = suffix ? `${areaPrefix}${prefix}-${suffix}` : `${areaPrefix}${core}`;

  // 1. Verifica se é anotação de engenharia / notas de desenho (ex: NE-5, NOTA-01, REV-A, DWG-100, SKID-01)
  const isDrawingNote =
    DRAWING_NOTE_PATTERNS.test(core) &&
    DRAWING_NOTE_PREFIXES.some((p) => p.toUpperCase() === prefix.toUpperCase());

  if (isDrawingNote) {
    return {
      isValid: true,
      tag: fullTag,
      kind: "tag",
      group: "Notas e Delimitações de Desenho",
      prefix: `${areaPrefix}${prefix}`,
      suffix,
      rationale: `Identificado como anotação ou nota de engenharia de desenho (${fullTag}). Não participa de malhas de processo.`,
      isaStandard: false,
    };
  }

  // 2. Verifica se é Válvula específica
  if (VALVE_PREFIXES[prefix]) {
    return {
      isValid: true,
      tag: fullTag,
      kind: "valve",
      group: "Válvulas e Elementos Finais",
      loopNumber: suffix,
      prefix: `${areaPrefix}${prefix}`,
      suffix,
      rationale: `${VALVE_PREFIXES[prefix]} identificada pelo código de serviço ${prefix}${areaPrefix ? ` na Área ${areaPrefix.replace(/[-.]/, '')}` : ""}.`,
      isaStandard: true,
    };
  }

  // 2. Verifica se é Instrumento ISA-5.1 (variável + modificador de variável? + funções + modificador de função?)
  if (prefix.length >= 2) {
    const firstChar = prefix[0];
    const variableDesc = MEASURED_VARIABLES[firstChar];

    if (variableDesc) {
      const body = prefix.slice(1);

      // A. Extrai Modificador de Função (se houver no final de body)
      let fnModifierKey: string | undefined;
      let rem = body;

      if (body.length >= 3 && (body.endsWith("HH") || body.endsWith("LL"))) {
        fnModifierKey = body.slice(-2);
        rem = body.slice(0, -2);
      } else if (
        body.length >= 2 &&
        (body.endsWith("H") || body.endsWith("L") || body.endsWith("M") || body.endsWith("D"))
      ) {
        fnModifierKey = body.slice(-1);
        rem = body.slice(0, -1);
      }

      // B. Extrai Modificador de Variável opcional (no início de rem)
      // Regra ISA-5.1: Deve ser sucedido por pelo menos uma letra funcional (rem.length >= 2).
      // Se rem[0] === 'S' (Segurança): NÃO deve ser tratado como modificador de segurança
      // quando for o elemento Chave / Switch seguido de modificador funcional (ex: PSH, PSL, PSHH, etc., onde rem já é 'S' com length 1).
      // Mesmo com rem.length >= 2, 'S' só é modificador de segurança se seguido de elemento primário ('E'), dispositivo ('D') ou válvula ('V').
      let varModifierKey: string | undefined;
      let functionalPart = rem;

      if (rem.length >= 2 && VARIABLE_MODIFIERS[rem[0]]) {
        if (rem[0] !== "S" || ["E", "D", "V"].includes(rem[1])) {
          varModifierKey = rem[0];
          functionalPart = rem.slice(1);
        }
      }

      // C. Funções de leitura e saída
      const functionalLetters = functionalPart.split("");
      const allFunctionsValid =
        functionalLetters.length > 0 &&
        functionalLetters.every((l) => Boolean(FUNCTIONAL_LETTERS[l]));

      if (allFunctionsValid) {
        const varModifierDesc = varModifierKey ? VARIABLE_MODIFIERS[varModifierKey] : undefined;
        const fnModifierDesc = fnModifierKey ? FUNCTION_MODIFIERS[fnModifierKey] : undefined;
        const functionsDesc = functionalLetters.map((l) => FUNCTIONAL_LETTERS[l]);

        const fnNameBase = functionsDesc.join(" + ");
        const functionName = fnModifierDesc ? `${fnNameBase} (${fnModifierDesc})` : fnNameBase;

        const fnDescText = functionsDesc.join(" e ");
        const fnModText = fnModifierDesc ? ` (${fnModifierDesc})` : "";
        const varModText = varModifierDesc ? ` (${varModifierDesc})` : "";
        const fullDesc = `${fnDescText}${fnModText} de ${variableDesc}${varModText}`;

        return {
          isValid: true,
          tag: fullTag,
          kind: "instrument",
          group: "Instrumentação e Controle (ISA-5.1)",
          variable: variableDesc,
          variableModifier: varModifierDesc,
          functionName,
          functionModifier: fnModifierDesc,
          loopNumber: suffix,
          prefix: `${areaPrefix}${prefix}`,
          suffix,
          rationale: `Instrumento ISA-5.1: ${fullDesc}${areaPrefix ? ` na Área ${areaPrefix.replace(/[-.]/, "")}` : ""}. Laço ${suffix || "geral"}.`,
          isaStandard: true,
        };
      }
    }
  }

  // 3. Verifica se é Equipamento de Processo
  if (EQUIPMENT_PREFIXES[prefix]) {
    return {
      isValid: true,
      tag: fullTag,
      kind: "equipment",
      group: "Equipamentos de Processo",
      prefix: `${areaPrefix}${prefix}`,
      suffix,
      rationale: `${EQUIPMENT_PREFIXES[prefix]} identificado pelo prefixo de engenharia ${prefix}${areaPrefix ? ` na Área ${areaPrefix.replace(/[-.]/, '')}` : ""}.`,
      isaStandard: false,
    };
  }

  // 4. Fallback para TAG Genérico
  return {
    isValid: prefix.length >= 1 && suffix.length >= 1,
    tag: fullTag,
    kind: "tag",
    group: "TAG Não Classificado",
    prefix: `${areaPrefix}${prefix}`,
    suffix,
    rationale: `Código alfanumérico com prefixo ${areaPrefix}${prefix || "indefinido"}. Requer validação por especialista.`,
    isaStandard: false,
  };
}

/**
 * Verifica se um conjunto de instrumentos forma uma malha de controle fechada (Closed Control Loop)
 */
export function detectControlLoops(detections: Array<{ id: string; label: string; kind: string }>) {
  const loops = new Map<string, { transmitter?: string; controller?: string; valve?: string; indicators: string[] }>();

  for (const item of detections) {
    const parsed = parseIsaTag(item.label);
    if (parsed.kind !== "instrument" && parsed.kind !== "valve") continue;
    if (!parsed.loopNumber) continue;

    const loopKey = `${parsed.prefix[0]}-${parsed.loopNumber}`;
    if (!loops.has(loopKey)) {
      loops.set(loopKey, { indicators: [] });
    }
    const current = loops.get(loopKey)!;

    if (parsed.prefix.endsWith("T")) current.transmitter = item.label;
    else if (parsed.prefix.endsWith("C") || parsed.prefix.includes("IC")) current.controller = item.label;
    else if (parsed.prefix.endsWith("V") || parsed.kind === "valve") current.valve = item.label;
    else if (parsed.prefix.endsWith("I")) current.indicators.push(item.label);
  }

  return Array.from(loops.entries()).map(([loopId, data]) => ({
    loopId,
    variable: MEASURED_VARIABLES[loopId[0]] ?? "Processo",
    isComplete: Boolean(data.controller && data.valve),
    ...data,
  }));
}

export interface TagTypeClassResult {
  tag: string;
  type: string;
  class: "Instrument" | "Equipment" | "Valve" | "Annotation";
  componentClass: "Instrument" | "Equipment" | "Valve" | "Annotation";
  formatted: string;
  isStandard: boolean;
}

/**
 * Deriva a formatação oficial do desafio: TAG / TYPE / CLASS (ex: FV210=Valve/Instrument, M210=Motor/Equipment).
 */
export function formatTagTypeClass(rawTag: string): TagTypeClassResult {
  const parsed = parseIsaTag(rawTag);
  const cleanTag = rawTag.trim();
  const upper = cleanTag.toUpperCase();

  if (parsed.group === "Notas e Delimitações de Desenho") {
    return {
      tag: cleanTag,
      type: "Drawing Note",
      class: "Annotation",
      componentClass: "Annotation",
      formatted: `${cleanTag}=Drawing Note/Annotation`,
      isStandard: false,
    };
  }

  if (parsed.kind === "valve") {
    const isControlValve = parsed.prefix.endsWith("V") || ["CV", "MOV", "SOV", "AOV", "SDV", "ESDV"].includes(parsed.prefix);
    const componentClass = isControlValve ? "Instrument" : "Valve";
    return {
      tag: cleanTag,
      type: "Valve",
      class: componentClass,
      componentClass,
      formatted: `${cleanTag}=Valve/${componentClass}`,
      isStandard: parsed.isValid,
    };
  }

  if (parsed.kind === "instrument") {
    let typeName = "Instrument";
    if (parsed.prefix.endsWith("V")) typeName = "Valve";
    else if (parsed.prefix.endsWith("T")) typeName = "Transmitter";
    else if (parsed.prefix.endsWith("C") || parsed.prefix.includes("IC")) typeName = "Controller";
    else if (parsed.prefix.endsWith("I")) typeName = "Indicator";
    else if (parsed.prefix.endsWith("S")) typeName = "Switch";
    else if (parsed.prefix.endsWith("A")) typeName = "Alarm";
    else if (parsed.prefix.endsWith("E")) typeName = "Sensor";

    return {
      tag: cleanTag,
      type: typeName,
      class: "Instrument",
      componentClass: "Instrument",
      formatted: `${cleanTag}=${typeName}/Instrument`,
      isStandard: parsed.isValid,
    };
  }

  if (parsed.kind === "equipment") {
    let typeName = "Equipment";
    if (upper.startsWith("M") || upper.includes("-M")) typeName = "Motor";
    else if (upper.startsWith("P") || upper.includes("-P")) typeName = "Pump";
    else if (upper.startsWith("B") || upper.startsWith("V") || upper.startsWith("TK") || upper.includes("-V")) typeName = "Vessel";
    else if (upper.startsWith("W") || upper.startsWith("E")) typeName = "Heat Exchanger";
    else if (upper.startsWith("C") || upper.startsWith("T")) typeName = "Column";
    else if (upper.startsWith("K")) typeName = "Compressor";

    return {
      tag: cleanTag,
      type: typeName,
      class: "Equipment",
      componentClass: "Equipment",
      formatted: `${cleanTag}=${typeName}/Equipment`,
      isStandard: parsed.isValid,
    };
  }

  // Fallback para não classificados
  if (upper.startsWith("M") && /\d/.test(upper)) {
    return { tag: cleanTag, type: "Motor", class: "Equipment", componentClass: "Equipment", formatted: `${cleanTag}=Motor/Equipment`, isStandard: false };
  }
  if (upper.startsWith("P") && /\d/.test(upper)) {
    return { tag: cleanTag, type: "Pump", class: "Equipment", componentClass: "Equipment", formatted: `${cleanTag}=Pump/Equipment`, isStandard: false };
  }

  return {
    tag: cleanTag,
    type: "Unknown",
    class: "Annotation",
    componentClass: "Annotation",
    formatted: `${cleanTag}=Unknown/Annotation`,
    isStandard: false,
  };
}
