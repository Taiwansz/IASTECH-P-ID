/**
 * Motor Semântico ANSI/ISA-5.1 para Análise e Validação de TAGs e Malhas de Instrumentação.
 */

export interface Isa51Validation {
  isValid: boolean;
  tag: string;
  kind: "instrument" | "equipment" | "valve" | "tag";
  group: string;
  variable?: string;
  functionName?: string;
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
  CV: "Válvula de retenção (Check Valve)",
  FC: "Válvula de controle de vazão",
  FCV: "Válvula de controle de vazão",
  FV: "Válvula de controle de vazão",
  HV: "Válvula manual de bloqueio",
  LC: "Válvula de controle de nível",
  LCV: "Válvula de controle de nível",
  LV: "Válvula de controle de nível",
  MOV: "Válvula motorizada",
  NC: "Válvula normalmente fechada",
  NO: "Válvula normalmente aberta",
  PCV: "Válvula de controle de pressão",
  PRV: "Válvula reguladora de pressão",
  PSV: "Válvula de segurança e alívio (PSV)",
  PV: "Válvula de controle de pressão",
  RO: "Orifício de restrição",
  SOV: "Válvula solenoide",
  TCV: "Válvula de controle de temperatura",
  TV: "Válvula de controle de temperatura",
  VA: "Válvula de processo manual/bloqueio",
  XV: "Válvula de corte / intertravamento (Shutoff)",
};

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
  const match = core.match(/^([A-Z]{1,6})[-.]?(\d[0-9A-Z./]*)$/);
  const prefix = match ? match[1] : (core.match(/^[A-Z]+/)?.[0] ?? "");
  const suffix = match ? match[2] : (core.match(/\d.*$/)?.[0] ?? "");
  const fullTag = suffix ? `${areaPrefix}${prefix}-${suffix}` : `${areaPrefix}${core}`;

  // 1. Verifica se é Válvula específica
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

  // 2. Verifica se é Instrumento ISA-5.1 (variável + função)
  if (prefix.length >= 2) {
    const firstChar = prefix[0];
    const rest = prefix.slice(1);
    const hasModifier = rest.length > 1 && VARIABLE_MODIFIERS[rest[0]];
    const modifier = hasModifier ? VARIABLE_MODIFIERS[rest[0]] : undefined;
    const functionalLetters = hasModifier ? rest.slice(1) : rest;

    const variableDesc = MEASURED_VARIABLES[firstChar];
    const functionsDesc = functionalLetters
      .split("")
      .map((letter) => FUNCTIONAL_LETTERS[letter])
      .filter(Boolean);

    if (variableDesc && functionsDesc.length > 0) {
      const fullDesc = `${functionsDesc.join(" e ")} de ${variableDesc}${modifier ? ` (${modifier})` : ""}`;
      return {
        isValid: true,
        tag: fullTag,
        kind: "instrument",
        group: "Instrumentação e Controle (ISA-5.1)",
        variable: variableDesc,
        functionName: functionsDesc.join(" + "),
        loopNumber: suffix,
        prefix: `${areaPrefix}${prefix}`,
        suffix,
        rationale: `Instrumento ISA-5.1: ${fullDesc}${areaPrefix ? ` na Área ${areaPrefix.replace(/[-.]/, '')}` : ""}. Laço ${suffix || "geral"}.`,
        isaStandard: true,
      };
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
