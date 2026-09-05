export type DetectionKind = "equipment" | "instrument" | "valve" | "tag";
export type DetectionStatus = "accepted" | "review" | "rejected";

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Detection {
  id: string;
  label: string;
  normalized: string;
  kind: DetectionKind;
  group: string;
  confidence: number;
  status: DetectionStatus;
  source: "curated-reference" | "local-ocr";
  box: Box;
  rationale: string;
  symbolId?: string;
}

export interface DiagramSample {
  id: string;
  title: string;
  fileName: string;
  image: string;
  width: number;
  height: number;
  profile: "clean" | "dense" | "low-resolution" | "reference";
  description: string;
  referenceReady: boolean;
}

export const samples: DiagramSample[] = [
  {
    id: "distillation-train",
    title: "Trem de destilação B-01",
    fileName: "16.jpg",
    image: "/samples/distillation-train.jpg",
    width: 819,
    height: 701,
    profile: "clean",
    description: "Amostra principal com TAGs, instrumentos, bombas, vasos e válvulas.",
    referenceReady: true,
  },
  {
    id: "reflux-pumps",
    title: "Bombas de refluxo TCS",
    fileName: "160.jpg",
    image: "/samples/reflux-pumps.jpg",
    width: 2556,
    height: 1413,
    profile: "dense",
    description: "Diagrama denso com redundância, instrumentação e linhas sobrepostas.",
    referenceReady: true,
  },
  {
    id: "petrochem-complex",
    title: "Unidade Petroquímica 5 (Ultra-Complexo)",
    fileName: "PID-501-A.jpg",
    image: "/samples/petrochem-complex.jpg",
    width: 1376,
    height: 768,
    profile: "dense",
    description: "Diagrama ultra-complexo com colunas de destilação C-101/102/103, compressores K-401, reatores R-201/202, bombas com selagem Plan 53A e dezenas de malhas cruzadas.",
    referenceReady: false,
  },
  {
    id: "fractionation-loop",
    title: "Loop de fracionamento T-10013",
    fileName: "151.jpg",
    image: "/samples/fractionation-loop.jpg",
    width: 2935,
    height: 1855,
    profile: "dense",
    description: "Documento colorido de grande formato para estresse do OCR local.",
    referenceReady: false,
  },
  {
    id: "pressure-vessel",
    title: "Vaso de pressão existente",
    fileName: "118.jpg",
    image: "/samples/pressure-vessel.jpg",
    width: 1206,
    height: 1381,
    profile: "low-resolution",
    description: "Caso com baixo contraste e poucos instrumentos legíveis.",
    referenceReady: false,
  },
  {
    id: "instrument-reference",
    title: "Referência de instrumentos",
    fileName: "127.jpg",
    image: "/samples/instrument-reference.jpg",
    width: 1294,
    height: 568,
    profile: "reference",
    description: "Prancha de símbolos para apoiar a futura rotulagem do dataset.",
    referenceReady: false,
  },
  {
    id: "pump-reference",
    title: "Referência de bombas",
    fileName: "135.jpg",
    image: "/samples/pump-reference.jpg",
    width: 651,
    height: 729,
    profile: "reference",
    description: "Catálogo visual de bombas centrífugas e configurações verticais.",
    referenceReady: false,
  },
];

const item = (
  id: string,
  label: string,
  kind: DetectionKind,
  group: string,
  confidence: number,
  box: Box,
  rationale: string,
): Detection => ({
  id,
  label,
  normalized: label.toUpperCase(),
  kind,
  group,
  confidence,
  status: confidence >= 0.78 ? "accepted" : "review",
  source: "curated-reference",
  box,
  rationale,
});

export const referenceDetections: Detection[] = [
  item("ins-dpic", "dPIC", "instrument", "Controle de pressão diferencial", 0.71, { x: 40, y: 35, width: 60, height: 30 }, "Bolha de instrumento com prefixo dPIC. O sufixo não está legível."),
  item("ins-pic01", "PIC 01", "instrument", "Controle de pressão", 0.94, { x: 230, y: 14, width: 65, height: 40 }, "Prefixo PIC e bolha de controle conectada ao topo da coluna."),
  item("ins-fi201", "FI 2.01", "instrument", "Indicação de vazão", 0.91, { x: 338, y: 34, width: 62, height: 39 }, "Prefixo FI reconhecido em uma bolha de instrumento."),
  item("ins-ti03", "TI 03", "instrument", "Indicação de temperatura", 0.89, { x: 89, y: 153, width: 62, height: 30 }, "Prefixo TI associado à linha de processo."),
  item("ins-ti201", "TI2 01", "instrument", "Indicação de temperatura", 0.79, { x: 499, y: 258, width: 62, height: 31 }, "Texto parcialmente comprimido. Normalização preserva a leitura original."),
  item("ins-pi203", "PI 2.03", "instrument", "Indicação de pressão", 0.86, { x: 541, y: 331, width: 65, height: 34 }, "Prefixo PI em bolha ligada ao conjunto VP-01."),
  item("ins-ls01", "LS 01", "instrument", "Chave de nível", 0.83, { x: 344, y: 311, width: 62, height: 31 }, "Prefixo LS localizado acima do vaso B-02."),
  item("ins-fqr04", "FQR 04", "instrument", "Registro de vazão", 0.76, { x: 205, y: 467, width: 72, height: 31 }, "Prefixo FQR legível, mas o caractere central pode sofrer confusão do OCR."),

  item("eq-w01", "W-01", "equipment", "Trocador de calor", 0.93, { x: 90, y: 190, width: 65, height: 90 }, "TAG adjacente a um trocador vertical."),
  item("eq-w02", "W-02", "equipment", "Coluna de processo", 0.96, { x: 178, y: 63, width: 136, height: 276 }, "TAG sobre a coluna principal com internos visíveis."),
  item("eq-w03", "W-03", "equipment", "Trocador de calor", 0.88, { x: 343, y: 213, width: 78, height: 76 }, "TAG próximo ao equipamento retangular na descarga intermediária."),
  item("eq-w04", "W-04", "equipment", "Trocador de calor", 0.92, { x: 575, y: 199, width: 118, height: 68 }, "TAG ligado ao trocador horizontal no lado direito."),
  item("eq-b01", "B-01", "equipment", "Vaso de fundo", 0.95, { x: 118, y: 256, width: 207, height: 104 }, "Vaso horizontal na base da coluna principal."),
  item("eq-b02", "B-02", "equipment", "Vaso separador", 0.89, { x: 425, y: 306, width: 58, height: 83 }, "Vaso vertical associado ao controle de nível LS 01."),
  item("eq-b03", "B-03", "equipment", "Vaso separador", 0.84, { x: 614, y: 410, width: 74, height: 96 }, "Vaso vertical abaixo do conjunto VP-01."),
  item("eq-b04", "B-04", "equipment", "Tanque de produto", 0.85, { x: 503, y: 650, width: 61, height: 48 }, "Primeiro tanque do banco de produtos."),
  item("eq-b05", "B-05", "equipment", "Tanque de produto", 0.82, { x: 573, y: 650, width: 61, height: 48 }, "Segundo tanque do banco de produtos."),
  item("eq-b06", "B-06", "equipment", "Tanque de produto", 0.81, { x: 640, y: 650, width: 61, height: 48 }, "Terceiro tanque do banco de produtos."),
  item("eq-b07", "B-07", "equipment", "Tanque de produto", 0.79, { x: 704, y: 650, width: 61, height: 48 }, "Quarto tanque do banco de produtos."),
  item("eq-b08", "B-08", "equipment", "Tanque de produto", 0.74, { x: 765, y: 650, width: 52, height: 48 }, "TAG está próximo da borda e requer confirmação humana."),
  item("eq-k01", "K-01", "equipment", "Vaso auxiliar", 0.87, { x: 263, y: 218, width: 61, height: 77 }, "Equipamento vertical conectado à saída lateral da coluna."),
  item("eq-p01", "P-01", "equipment", "Bomba", 0.88, { x: 156, y: 402, width: 75, height: 54 }, "Símbolo circular de bomba abaixo de B-01."),
  item("eq-p02", "P-02", "equipment", "Bomba", 0.86, { x: 309, y: 370, width: 75, height: 58 }, "Bomba na linha de destilado."),
  item("eq-p03", "P-03", "equipment", "Bomba", 0.84, { x: 422, y: 352, width: 75, height: 58 }, "Bomba posicionada abaixo de B-02."),
  item("eq-vp01", "VP-01", "equipment", "Bomba acionada", 0.81, { x: 600, y: 346, width: 83, height: 65 }, "Conjunto de bomba e acionamento na linha de água residual."),
  item("eq-mj1", "MJ-1", "equipment", "Misturador", 0.86, { x: 39, y: 545, width: 72, height: 106 }, "Primeiro misturador do conjunto inferior."),
  item("eq-mj2", "MJ-2", "equipment", "Misturador", 0.84, { x: 106, y: 545, width: 72, height: 106 }, "Segundo misturador do conjunto inferior."),
  item("eq-mj3", "MJ-3", "equipment", "Misturador", 0.83, { x: 172, y: 545, width: 72, height: 106 }, "Terceiro misturador do conjunto inferior."),

  item("val-va09", "VA-09", "valve", "Válvula de processo", 0.88, { x: 605, y: 184, width: 74, height: 42 }, "TAG adjacente à válvula na linha de vapor."),
  item("val-va25", "VA-25", "valve", "Válvula de processo", 0.82, { x: 43, y: 250, width: 72, height: 47 }, "TAG de válvula na entrada lateral esquerda."),
  item("val-va13", "VA-13", "valve", "Válvula de processo", 0.77, { x: 331, y: 422, width: 73, height: 49 }, "O texto toca a linha de processo e requer revisão."),
];

export const refluxPumpsDetections: Detection[] = [
  // --- EQUIPAMENTOS PRINCIPAIS & BOMBAS ---
  item("rp-p0201b", "20-P-0201B", "equipment", "Bomba vertical enclausurada de refluxo TCS (Superior)", 0.99, { x: 825, y: 50, width: 85, height: 260 }, "Bomba vertical de refluxo da coluna TCS B, conjunto motor elétrico, acoplamento e carcaça."),
  item("rp-p0201a", "20-P-0201A", "equipment", "Bomba vertical enclausurada de refluxo TCS (Inferior)", 0.99, { x: 825, y: 700, width: 85, height: 260 }, "Bomba vertical de refluxo da coluna TCS A, conjunto motor elétrico, acoplamento e carcaça."),
  item("rp-tag-p0201b", "20-P-0201B-TAG", "tag", "TAG de identificação da Bomba 20-P-0201B", 0.96, { x: 760, y: 275, width: 68, height: 18 }, "Identificador no desenho técnico para a bomba superior B."),
  item("rp-tag-p0201a", "20-P-0201A-TAG", "tag", "TAG de identificação da Bomba 20-P-0201A", 0.96, { x: 760, y: 925, width: 68, height: 18 }, "Identificador no desenho técnico para a bomba inferior A."),
  item("rp-v0201b", "20-V-0201", "equipment", "Vaso separador de selagem mecânica (Seal Flush Pot B)", 0.95, { x: 800, y: 475, width: 42, height: 82 }, "Vaso separador vertical para sistema de selagem mecânica com dreno, pressostato e termostato."),
  item("rp-v0201a", "20-V-0201A", "equipment", "Vaso separador de selagem mecânica (Seal Flush Pot A)", 0.95, { x: 800, y: 1125, width: 42, height: 82 }, "Vaso separador vertical para sistema de selagem mecânica da bomba A."),
  item("rp-st0201b", "20-ST-0201B", "equipment", "Filtro de sucção tipo cesto (Strainer B)", 0.94, { x: 470, y: 360, width: 35, height: 35 }, "Filtro de cesto tipo Y para proteção da sucção da bomba 20-P-0201B."),
  item("rp-st0201a", "20-ST-0201A", "equipment", "Filtro de sucção tipo cesto (Strainer A)", 0.94, { x: 470, y: 1010, width: 35, height: 35 }, "Filtro de cesto tipo Y para proteção da sucção da bomba 20-P-0201A."),
  item("rp-nozzle-b", "20-P-0201B-NOZZLE", "equipment", "Bocal de sucção/descarga da Bomba B", 0.93, { x: 800, y: 355, width: 42, height: 42 }, "Caixa de conexões de processo e flange de acoplamento da bomba B."),
  item("rp-nozzle-a", "20-P-0201A-NOZZLE", "equipment", "Bocal de sucção/descarga da Bomba A", 0.93, { x: 800, y: 1005, width: 42, height: 42 }, "Caixa de conexões de processo e flange de acoplamento da bomba A."),

  // --- LINHA DE SUCÇÃO B (SUPERIOR, y ≈ 375) ---
  item("rp-red300-b", "300X250-B", "tag", "Redução excêntrica de sucção 300x250 B", 0.91, { x: 215, y: 325, width: 22, height: 32 }, "Transição de diâmetro de 300mm para 250mm na chegada da tubulação de sucção B."),
  item("rp-spec-b", "A01C/B01C-B", "tag", "Mudança de classe de tubulação A01C/B01C", 0.92, { x: 280, y: 325, width: 25, height: 30 }, "Limite de bateria e transição de especificação metalúrgica de tubulação A01C para B01C."),
  item("rp-pv01", "20-PV-0201", "valve", "Válvula manual de bloqueio de sucção B #1", 0.94, { x: 300, y: 360, width: 36, height: 30 }, "Válvula de bloqueio manual de gaveta na entrada da sucção B."),
  item("rp-dr01", "20-DR-0201", "valve", "Dreno de purga da sucção B #1", 0.91, { x: 335, y: 405, width: 26, height: 35 }, "Válvula de dreno com bujão de proteção para purga de linha."),
  item("rp-pv02", "20-PV-0202", "valve", "Válvula manual de isolamento de sucção B #2", 0.94, { x: 375, y: 360, width: 36, height: 30 }, "Segunda válvula de duplo bloqueio na sucção da bomba 20-P-0201B."),
  item("rp-pi0240a", "20-PI-0240A", "instrument", "Manômetro indicador de pressão de sucção B #1", 0.96, { x: 395, y: 265, width: 48, height: 48 }, "Medição local de pressão na sucção com escala analógica."),
  item("rp-root-pi0240a", "20-PV-0240A-ROOT", "valve", "Válvula de raiz do manômetro 20-PI-0240A", 0.93, { x: 405, y: 335, width: 28, height: 26 }, "Válvula de isolamento da tomada de pressão de sucção A."),
  item("rp-man-pi0240a-l", "20-PV-0240A-M1", "valve", "Válvula de calibração do manômetro 20-PI-0240A (Esq)", 0.89, { x: 370, y: 295, width: 30, height: 25 }, "Bloqueio do manifold de calibração lateral do manômetro."),
  item("rp-man-pi0240a-r", "20-PV-0240A-M2", "valve", "Válvula de calibração do manômetro 20-PI-0240A (Dir)", 0.89, { x: 430, y: 295, width: 30, height: 25 }, "Bloqueio do manifold de calibração lateral do manômetro."),
  item("rp-dr02", "20-DR-0202", "valve", "Dreno central da linha de sucção B", 0.91, { x: 435, y: 405, width: 26, height: 35 }, "Dreno intermediário para drenagem completa da tubulação."),
  item("rp-pi0240b", "20-PI-0240B", "instrument", "Manômetro indicador de pressão de sucção B #2", 0.96, { x: 535, y: 265, width: 48, height: 48 }, "Segundo manômetro de pressão montado pós-filtro na sucção B."),
  item("rp-root-pi0240b", "20-PV-0240B-ROOT", "valve", "Válvula de raiz do manômetro 20-PI-0240B", 0.93, { x: 545, y: 335, width: 28, height: 26 }, "Válvula de isolamento da tomada de pressão de sucção B."),
  item("rp-man-pi0240b-l", "20-PV-0240B-M1", "valve", "Válvula de calibração do manômetro 20-PI-0240B (Esq)", 0.89, { x: 510, y: 295, width: 30, height: 25 }, "Bloqueio do manifold do manômetro 20-PI-0240B."),
  item("rp-man-pi0240b-r", "20-PV-0240B-M2", "valve", "Válvula de calibração do manômetro 20-PI-0240B (Dir)", 0.89, { x: 570, y: 295, width: 30, height: 25 }, "Bloqueio do manifold do manômetro 20-PI-0240B."),
  item("rp-dr-diag-b", "20-DR-0203-DIAG", "valve", "Válvula de purga inclinada com terminal plugue B", 0.88, { x: 530, y: 410, width: 35, height: 35 }, "Purga angular para remoção de particulados finos antes da bomba."),
  item("rp-pv03", "20-PV-0203", "valve", "Válvula manual de sucção B a montante do filtro", 0.94, { x: 585, y: 360, width: 36, height: 30 }, "Válvula de bloqueio antes da entrada do filtro 20-ST-0201B."),
  item("rp-dr03", "20-DR-0203", "valve", "Dreno de carcaça pós-filtro B", 0.91, { x: 620, y: 405, width: 26, height: 35 }, "Ponto de dreno inferior para manutenção e limpeza do elemento filtrante."),
  item("rp-pv04-b", "20-PV-0204B", "valve", "Válvula manual de bloqueio final de sucção B", 0.94, { x: 660, y: 360, width: 36, height: 30 }, "Bloqueio final de conexão direta ao bocal de sucção da bomba B."),
  item("rp-l250-06", "250-P01-20020406-B01C-HC", "tag", "Linha de sucção superior 250mm B", 0.95, { x: 680, y: 345, width: 155, height: 18 }, "Linha de sucção principal da bomba 20-P-0201B (diâmetro nominal 250mm)."),
  item("rp-red250-b", "250X...-B", "tag", "Redutor concêntrico de sucção B", 0.89, { x: 770, y: 365, width: 25, height: 22 }, "Redução de linha para compatibilização ao bocal de entrada da bomba."),

  // --- LINHA DE SUCÇÃO A (INFERIOR, y ≈ 1025) ---
  item("rp-red300-a", "300X250-A", "tag", "Redução excêntrica de sucção 300x250 A", 0.91, { x: 215, y: 975, width: 22, height: 32 }, "Transição de diâmetro de 300mm para 250mm na sucção A."),
  item("rp-spec-a", "A01C/B01C-A", "tag", "Mudança de classe de tubulação A01C/B01C A", 0.92, { x: 280, y: 975, width: 25, height: 30 }, "Limite de bateria e transição de metalurgia A01C para B01C."),
  item("rp-pv04", "20-PV-0204", "valve", "Válvula manual de bloqueio de sucção A #1", 0.94, { x: 300, y: 1010, width: 36, height: 30 }, "Válvula de bloqueio manual na entrada da sucção A."),
  item("rp-dr04", "20-DR-0204", "valve", "Dreno de purga da sucção A #1", 0.91, { x: 335, y: 1055, width: 26, height: 35 }, "Válvula de dreno com bujão de proteção para purga da linha A."),
  item("rp-pv05", "20-PV-0205", "valve", "Válvula manual de isolamento de sucção A #2", 0.94, { x: 375, y: 1010, width: 36, height: 30 }, "Segunda válvula de duplo bloqueio na sucção da bomba 20-P-0201A."),
  item("rp-pi0230a", "20-PI-0230A", "instrument", "Manômetro indicador de pressão de sucção A #1", 0.96, { x: 395, y: 915, width: 48, height: 48 }, "Medição local de pressão analógica na sucção da bomba A."),
  item("rp-root-pi0230a", "20-PV-0230A-ROOT", "valve", "Válvula de raiz do manômetro 20-PI-0230A", 0.93, { x: 405, y: 985, width: 28, height: 26 }, "Válvula de tomada de pressão de sucção A."),
  item("rp-man-pi0230a-l", "20-PV-0230A-M1", "valve", "Válvula de calibração do manômetro 20-PI-0230A (Esq)", 0.89, { x: 370, y: 945, width: 30, height: 25 }, "Bloqueio do manifold de calibração do manômetro 20-PI-0230A."),
  item("rp-man-pi0230a-r", "20-PV-0230A-M2", "valve", "Válvula de calibração do manômetro 20-PI-0230A (Dir)", 0.89, { x: 430, y: 945, width: 30, height: 25 }, "Bloqueio do manifold de calibração do manômetro 20-PI-0230A."),
  item("rp-dr05", "20-DR-0205", "valve", "Dreno central da linha de sucção A", 0.91, { x: 435, y: 1055, width: 26, height: 35 }, "Dreno intermediário da tubulação de sucção A."),
  item("rp-pi0230b", "20-PI-0230B", "instrument", "Manômetro indicador de pressão de sucção A #2", 0.96, { x: 535, y: 915, width: 48, height: 48 }, "Segundo manômetro pós-filtro na sucção A."),
  item("rp-root-pi0230b", "20-PV-0230B-ROOT", "valve", "Válvula de raiz do manômetro 20-PI-0230B", 0.93, { x: 545, y: 985, width: 28, height: 26 }, "Válvula de tomada de pressão de sucção A #2."),
  item("rp-man-pi0230b-l", "20-PV-0230B-M1", "valve", "Válvula de calibração do manômetro 20-PI-0230B (Esq)", 0.89, { x: 510, y: 945, width: 30, height: 25 }, "Bloqueio de calibração do manômetro 20-PI-0230B."),
  item("rp-man-pi0230b-r", "20-PV-0230B-M2", "valve", "Válvula de calibração do manômetro 20-PI-0230B (Dir)", 0.89, { x: 570, y: 945, width: 30, height: 25 }, "Bloqueio de calibração do manômetro 20-PI-0230B."),
  item("rp-dr-diag-a", "20-DR-0206-DIAG", "valve", "Válvula de purga inclinada com terminal plugue A", 0.88, { x: 530, y: 1060, width: 35, height: 35 }, "Purga angular para remoção de resíduos antes da bomba A."),
  item("rp-pv06", "20-PV-0206", "valve", "Válvula manual de sucção A a montante do filtro", 0.94, { x: 585, y: 1010, width: 36, height: 30 }, "Válvula de bloqueio antes do filtro 20-ST-0201A."),
  item("rp-dr06", "20-DR-0206", "valve", "Dreno de carcaça pós-filtro A", 0.91, { x: 620, y: 1055, width: 26, height: 35 }, "Dreno de carcaça para substituição do cesto filtrante A."),
  item("rp-pv07-a", "20-PV-0207A", "valve", "Válvula manual de bloqueio final de sucção A", 0.94, { x: 660, y: 1010, width: 36, height: 30 }, "Bloqueio final para acoplamento na bomba 20-P-0201A."),
  item("rp-l250-04", "250-P01-20020404-B01C-HC", "tag", "Linha de sucção inferior 250mm A", 0.95, { x: 680, y: 995, width: 155, height: 18 }, "Linha de sucção principal da bomba 20-P-0201A (diâmetro 250mm)."),
  item("rp-red250-a", "250X...-A", "tag", "Redutor concêntrico de sucção A", 0.89, { x: 770, y: 1015, width: 25, height: 22 }, "Redução de diâmetro na entrada da bomba A."),

  // --- ÁGUA DE RESFRIAMENTO (CWS / CWR) ---
  item("rp-lcws15", "XX-CWS-20020415-A01A-CC", "tag", "Água de resfriamento - Alimentação B", 0.93, { x: 590, y: 135, width: 180, height: 20 }, "Tubulação de suprimento de água de refrigeração para bomba B."),
  item("rp-cws-hex-b", "CWS-HEX-B", "instrument", "Entrada de utilidades CWS B", 0.91, { x: 560, y: 130, width: 35, height: 35 }, "Símbolo hexagonal de conexão de água de refrigeração B."),
  item("rp-ga-b", "XX-GA-B", "valve", "Válvula gaveta de bloqueio CWS B", 0.9, { x: 780, y: 135, width: 30, height: 25 }, "Bloqueio manual da água de resfriamento da bomba B."),
  item("rp-lcwr17", "XX-CWR-20020417-A01A-CC", "tag", "Água de resfriamento - Retorno B", 0.93, { x: 1250, y: 135, width: 180, height: 20 }, "Linha de retorno de água de refrigeração de selos B."),
  item("rp-lcws14", "XX-CWS-20020414-A01A-CC", "tag", "Água de resfriamento - Alimentação A", 0.93, { x: 590, y: 785, width: 180, height: 20 }, "Tubulação de suprimento de água de refrigeração para bomba A."),
  item("rp-cws-hex-a", "CWS-HEX-A", "instrument", "Entrada de utilidades CWS A", 0.91, { x: 560, y: 780, width: 35, height: 35 }, "Símbolo hexagonal de conexão de água de refrigeração A."),
  item("rp-ga-a", "XX-GA-A", "valve", "Válvula gaveta de bloqueio CWS A", 0.9, { x: 780, y: 785, width: 30, height: 25 }, "Bloqueio manual da água de resfriamento da bomba A."),
  item("rp-lcwr16", "XX-CWR-20020416-A01A-CC", "tag", "Água de resfriamento - Retorno A", 0.93, { x: 1250, y: 785, width: 180, height: 20 }, "Linha de retorno de água de refrigeração de selos A."),

  // --- LÓGICA DE CONTROLE E INTERTRAVAMENTO ISA-5.2 (ESTAÇÃO B) ---
  item("rp-hs0247b", "20-HS-0247B", "instrument", "Chave local de comando START/STOP Bomba B", 0.95, { x: 470, y: 520, width: 44, height: 42 }, "Botoeira de comando local para partida e parada da bomba 20-P-0201B."),
  item("rp-hs0247a", "20-HS-0247A", "instrument", "Chave remota no console START/STOP Bomba B", 0.95, { x: 470, y: 580, width: 44, height: 42 }, "Chave de software montada na tela do DCS para comando remoto da bomba B."),
  item("rp-hs0248", "20-HS-0248", "instrument", "Chave de permissivo ENABLE/DISABLE B", 0.94, { x: 470, y: 645, width: 44, height: 42 }, "Chave seletora de habilitação operacional para liberação de malha B."),
  item("rp-xl0249", "20-XL-0249", "instrument", "Sinalizador de status RUN/STOP Bomba B", 0.94, { x: 470, y: 705, width: 44, height: 42 }, "Indicação luminosa no painel do status operacional de marcha da bomba B."),
  item("rp-st-diamond-b", "20-ST-LOGIC-B", "instrument", "Losango de permissivo lógico de partida (ST) B", 0.93, { x: 690, y: 520, width: 40, height: 40 }, "Símbolo de lógica ISA-5.2 verificando condições de selagem e vazão."),
  item("rp-square-cross-b", "20-IL-LOGIC-B", "instrument", "Caixa de intertravamento de segurança B", 0.92, { x: 640, y: 580, width: 40, height: 40 }, "Módulo de travamento de emergência com shutdown automático."),
  item("rp-black-diamond-b", "20-AND-LOGIC-B", "instrument", "Porta lógica AND com travamento B", 0.93, { x: 735, y: 580, width: 42, height: 42 }, "Lógica booleana exigindo todos os permissivos ativos para manter a bomba em operação."),
  item("rp-psh0245", "20-PSH-0245", "instrument", "Pressostato de alta pressão do vaso de selo B", 0.95, { x: 815, y: 645, width: 44, height: 44 }, "Chaveamento elétrico por alta pressão na câmara de selo mecânico."),
  item("rp-pah0245", "20-PAH-0245", "instrument", "Alarme sonoro/visual de alta pressão B", 0.74, { x: 755, y: 645, width: 44, height: 44 }, "Alarme de alta pressão de selo mecânico exibido no supervisório."),
  item("rp-dr-pot-b", "20-PV-POT-B", "valve", "Válvula de dreno do vaso de selagem B", 0.92, { x: 815, y: 585, width: 30, height: 35 }, "Válvula manual inferior para drenagem e amostragem de óleo de selo B."),
  item("rp-ve0245", "20-VE-0245", "instrument", "Sensor de vibração e deslocamento de eixo B", 0.94, { x: 875, y: 485, width: 44, height: 44 }, "Sensor de proximidade montado no mancal da bomba B."),
  item("rp-vt0245", "20-VT-0245", "instrument", "Transmissor inteligente de vibração 20-VT-0245", 0.95, { x: 955, y: 485, width: 44, height: 44 }, "Transmissor eletrônico de vibração acoplado ao conversor TRG MCC."),
  item("rp-vi0245", "20-VI-0245", "instrument", "Indicador de vibração no painel 20-VI-0245", 0.93, { x: 1070, y: 485, width: 44, height: 44 }, "Indicação contínua de vibração em milímetros por segundo."),
  item("rp-tsh0245", "20-TSH-0245", "instrument", "Termostato de alta temperatura do mancal B", 0.94, { x: 920, y: 540, width: 44, height: 44 }, "Proteção térmica contra superaquecimento no enrolamento e mancal."),
  item("rp-tah0245", "20-TAH-0245", "instrument", "Alarme de alta temperatura do motor B", 0.93, { x: 995, y: 540, width: 44, height: 44 }, "Alarme de alarme térmico no painel de controle."),
  item("rp-se0245", "20-SE-0245", "instrument", "Sensor de rotação/velocidade do rotor B #1", 0.92, { x: 885, y: 645, width: 44, height: 44 }, "Pickup magnético de medição de rotação do rotor."),
  item("rp-se0246", "20-SE-0246", "instrument", "Sensor de rotação/velocidade do rotor B #2", 0.92, { x: 945, y: 645, width: 44, height: 44 }, "Segundo pickup magnético para medição redundante de velocidade."),
  item("rp-st0245-trans", "20-ST-0245", "instrument", "Transmissor tacométrico de velocidade B", 0.93, { x: 1005, y: 705, width: 44, height: 44 }, "Transmissor de sinal de frequência para medição de RPM."),
  item("rp-si0245", "20-SI-0245", "instrument", "Indicador de RPM no painel central 20-SI-0245", 0.93, { x: 1070, y: 705, width: 44, height: 44 }, "Indicador digital de rotação da bomba 20-P-0201B."),

  // --- LÓGICA DE CONTROLE E INTERTRAVAMENTO ISA-5.2 (ESTAÇÃO A) ---
  item("rp-hs0237b", "20-HS-0237B", "instrument", "Chave local de comando START/STOP Bomba A", 0.95, { x: 470, y: 1170, width: 44, height: 42 }, "Botoeira de comando local para partida e parada da bomba 20-P-0201A."),
  item("rp-hs0237a", "20-HS-0237A", "instrument", "Chave remota no console START/STOP Bomba A", 0.95, { x: 470, y: 1230, width: 44, height: 42 }, "Chave de software no console do DCS para acionamento de A."),
  item("rp-hs0238", "20-HS-0238", "instrument", "Chave de permissivo ENABLE/DISABLE A", 0.94, { x: 470, y: 1295, width: 44, height: 42 }, "Chave seletora de habilitação operacional da bomba A."),
  item("rp-xl0239", "20-XL-0239", "instrument", "Sinalizador de status RUN/STOP Bomba A", 0.94, { x: 470, y: 1355, width: 44, height: 42 }, "Sinaleiro piloto indicando estado em operação da bomba A."),
  item("rp-st-diamond-a", "20-ST-LOGIC-A", "instrument", "Losango de permissivo lógico de partida (ST) A", 0.93, { x: 690, y: 1170, width: 40, height: 40 }, "Permissivo lógico ISA-5.2 de partida para bomba A."),
  item("rp-square-cross-a", "20-IL-LOGIC-A", "instrument", "Caixa de intertravamento de segurança A", 0.92, { x: 640, y: 1230, width: 40, height: 40 }, "Módulo de parada de emergência e interlock da bomba A."),
  item("rp-black-diamond-a", "20-AND-LOGIC-A", "instrument", "Porta lógica AND com travamento A", 0.93, { x: 735, y: 1230, width: 42, height: 42 }, "Porta lógica AND de confirmação de segurança para marcha de A."),
  item("rp-psh0235", "20-PSH-0235", "instrument", "Pressostato de alta pressão do vaso de selo A", 0.95, { x: 815, y: 1295, width: 44, height: 44 }, "Chaveamento por sobrepressão no selo mecânico da bomba A."),
  item("rp-pah0235", "20-PAH-0235", "instrument", "Alarme sonoro/visual de alta pressão A", 0.74, { x: 755, y: 1295, width: 44, height: 44 }, "Alarme de alta pressão no painel de supervisão."),
  item("rp-dr-pot-a", "20-PV-POT-A", "valve", "Válvula de dreno do vaso de selagem A", 0.92, { x: 815, y: 1235, width: 30, height: 35 }, "Válvula de purga inferior do vaso de selo da bomba A."),
  item("rp-ve0235", "20-VE-0235", "instrument", "Sensor de vibração e deslocamento de eixo A", 0.94, { x: 875, y: 1135, width: 44, height: 44 }, "Sensor de vibração contínua do mancal da bomba A."),
  item("rp-vt0235", "20-VT-0235", "instrument", "Transmissor inteligente de vibração 20-VT-0235", 0.95, { x: 955, y: 1135, width: 44, height: 44 }, "Transmissor eletrônico de vibração da bomba A."),
  item("rp-vi0235", "20-VI-0235", "instrument", "Indicador de vibração no painel 20-VI-0235", 0.93, { x: 1070, y: 1135, width: 44, height: 44 }, "Display analógico/digital de vibração do mancal A."),
  item("rp-tsh0235", "20-TSH-0235", "instrument", "Termostato de alta temperatura do mancal A", 0.94, { x: 920, y: 1190, width: 44, height: 44 }, "Termostato com desarme automático por temperatura excessiva."),
  item("rp-tah0235", "20-TAH-0235", "instrument", "Alarme de alta temperatura do motor A", 0.93, { x: 995, y: 1190, width: 44, height: 44 }, "Alarme de alta temperatura no enrolamento elétrico."),
  item("rp-se0235", "20-SE-0235", "instrument", "Sensor de rotação/velocidade do rotor A #1", 0.92, { x: 885, y: 1295, width: 44, height: 44 }, "Sensor magnético de pulso de velocidade para bomba A."),
  item("rp-se0236", "20-SE-0236", "instrument", "Sensor de rotação/velocidade do rotor A #2", 0.92, { x: 945, y: 1295, width: 44, height: 44 }, "Segundo sensor magnético de velocidade da bomba A."),
  item("rp-st0235-trans", "20-ST-0235", "instrument", "Transmissor tacométrico de velocidade A", 0.93, { x: 1005, y: 1355, width: 44, height: 44 }, "Transmissor eletrônico de velocidade de rotação."),
  item("rp-si0235", "20-SI-0235", "instrument", "Indicador de RPM no painel central 20-SI-0235", 0.93, { x: 1070, y: 1355, width: 44, height: 44 }, "Indicador de velocidade angular em tempo real."),

  // --- DESCARGA E VÁLVULAS DE CONTROLE B (SUPERIOR, y ≈ 400) ---
  item("rp-check-b", "20-CK-0241", "valve", "Válvula de retenção da descarga B (Check Valve 200)", 0.95, { x: 1515, y: 375, width: 32, height: 28 }, "Válvula de retenção tipo portinhola para proteção contra fluxo reverso."),
  item("rp-dr-disc-b1", "20-DR-0241-1", "valve", "Dreno da descarga B antes da válvula de controle", 0.91, { x: 1560, y: 430, width: 26, height: 35 }, "Dreno de despressurização e purga do trecho de medição de vazão."),
  item("rp-fv0201b", "20-FV-0242", "valve", "Válvula de controle modulante de vazão de descarga B (200 FC PV)", 0.98, { x: 1590, y: 220, width: 70, height: 195 }, "Válvula globo com atuador pneumático diafragma, posicionador e ação falha-fechada (Fail Closed)."),
  item("rp-sol-b", "20-SOV-0242", "valve", "Solenoide de comando pneumático de 3 vias [S]", 0.94, { x: 1600, y: 240, width: 25, height: 35 }, "Válvula solenoide de três vias para comando de emergência e venteio de ar."),
  item("rp-xv0242-tag", "20-XV-0242", "instrument", "Identificação de válvula de segurança automatizada", 0.94, { x: 1665, y: 410, width: 45, height: 45 }, "TAG de malha no painel identificando a válvula 20-FV-0242."),
  item("rp-zso0242", "20-ZSO-0242", "instrument", "Chave fim de curso status aberto (Open Switch)", 0.96, { x: 1465, y: 345, width: 45, height: 45 }, "Indicação eletrônica de válvula totalmente aberta no sistema de intertravamento."),
  item("rp-zsc0242", "20-ZSC-0242", "instrument", "Chave fim de curso status fechado (Closed Switch)", 0.96, { x: 1515, y: 345, width: 45, height: 45 }, "Indicação eletrônica de válvula totalmente fechada."),
  item("rp-hs0242b", "20-HS-0242B", "instrument", "Chave manual de comando da válvula FV-0242", 0.93, { x: 1540, y: 110, width: 45, height: 40 }, "Comando manual de abertura da válvula de controle B."),
  item("rp-hs0242a", "20-HS-0242A", "instrument", "Chave seletora remota da válvula FV-0242", 0.93, { x: 1540, y: 155, width: 45, height: 40 }, "Chave seletora de controle automático no DCS."),
  item("rp-zlo0242", "20-ZLO-0242", "instrument", "Sinaleiro piloto status válvula aberta B", 0.92, { x: 1675, y: 110, width: 45, height: 40 }, "Luz indicadora de abertura completa da válvula FV-0242."),
  item("rp-zlc0242", "20-ZLC-0242", "instrument", "Sinaleiro piloto status válvula fechada B", 0.92, { x: 1675, y: 155, width: 45, height: 40 }, "Luz indicadora de fechamento completo da válvula FV-0242."),
  item("rp-il-diamond-b", "20-IL-FV0242", "instrument", "Intertravamento de segurança da válvula FV-0242", 0.93, { x: 1605, y: 190, width: 45, height: 45 }, "Lógica de shutdown que desenergiza o solenoide para fechamento de emergência."),
  item("rp-ti0241", "20-TI-0241", "instrument", "Termômetro indicador na descarga B", 0.96, { x: 1260, y: 330, width: 46, height: 46 }, "Medição local bimetálica de temperatura da corrente de descarga TCS."),
  item("rp-fe0241", "20-FE-0241", "instrument", "Elemento primário de vazão vortex B", 0.96, { x: 1330, y: 375, width: 48, height: 48 }, "Medidor de vazão tipo carretel gerador de vórtices em linha."),
  item("rp-ft0241", "20-FT-0241", "instrument", "Transmissor inteligente de vazão 20-FT-0241", 0.97, { x: 1330, y: 460, width: 48, height: 48 }, "Transmissor microprocessado com protocolo HART e sinal 4-20mA."),
  item("rp-ffic0241", "20-FFIC-0241", "instrument", "Controlador indicador de vazão no DCS", 0.95, { x: 1330, y: 540, width: 50, height: 50 }, "Malha digital PID de controle de refluxo acoplada à FV-0242."),
  item("rp-pv-disc-b1", "20-PV-0241-B1", "valve", "Válvula manual de bloqueio pós-FV-0242 #1", 0.94, { x: 1685, y: 375, width: 36, height: 30 }, "Primeiro bloqueio manual para manutenção da válvula de controle."),
  item("rp-dr-disc-b2", "20-DR-0241-2", "valve", "Dreno intermediário de descarga B", 0.91, { x: 1735, y: 430, width: 26, height: 35 }, "Dreno com bujão roscado para alívio hidrostático."),
  item("rp-pv-disc-b2", "20-PV-0241-B2", "valve", "Válvula manual de bloqueio final pós-FV-0242 #2", 0.94, { x: 1785, y: 375, width: 36, height: 30 }, "Segundo bloqueio manual na linha de descarga superior."),
  item("rp-l200-08", "200-P01-20020408-B01C-HC", "tag", "Coletor de descarga superior 200mm B", 0.96, { x: 1820, y: 375, width: 180, height: 20 }, "Tubulação de descarga principal de 200mm enviando refluxo à coluna."),

  // --- DESCARGA E VÁLVULAS DE CONTROLE A (INFERIOR, y ≈ 1050) ---
  item("rp-check-a", "20-CK-0231", "valve", "Válvula de retenção da descarga A (Check Valve 200)", 0.95, { x: 1515, y: 1025, width: 32, height: 28 }, "Válvula de retenção de descarga da bomba A."),
  item("rp-dr-disc-a1", "20-DR-0231-1", "valve", "Dreno da descarga A antes da válvula de controle", 0.91, { x: 1560, y: 1080, width: 26, height: 35 }, "Dreno para alívio do trecho de medição da bomba A."),
  item("rp-fv0201a", "20-FV-0232", "valve", "Válvula de controle modulante de vazão de descarga A (200 FC PV)", 0.98, { x: 1590, y: 870, width: 70, height: 195 }, "Válvula globo com atuador pneumático diafragma, posicionador e ação falha-fechada (Fail Closed) da bomba A."),
  item("rp-sol-a", "20-SOV-0232", "valve", "Solenoide de comando pneumático de 3 vias A [S]", 0.94, { x: 1600, y: 890, width: 25, height: 35 }, "Válvula solenoide de três vias de emergência A."),
  item("rp-xv0232-tag", "20-XV-0232", "instrument", "Identificação de válvula de segurança automatizada A", 0.94, { x: 1665, y: 1060, width: 45, height: 45 }, "TAG de malha identificando a válvula 20-FV-0232."),
  item("rp-zso0232", "20-ZSO-0232", "instrument", "Chave fim de curso status aberto A (Open Switch)", 0.96, { x: 1465, y: 995, width: 45, height: 45 }, "Indicação eletrônica de válvula FV-0232 totalmente aberta."),
  item("rp-zsc0232", "20-ZSC-0232", "instrument", "Chave fim de curso status fechado A (Closed Switch)", 0.96, { x: 1515, y: 995, width: 45, height: 45 }, "Indicação eletrônica de válvula FV-0232 totalmente fechada."),
  item("rp-hs0232b", "20-HS-0232B", "instrument", "Chave manual de comando da válvula FV-0232", 0.93, { x: 1540, y: 760, width: 45, height: 40 }, "Comando manual de abertura da válvula de controle A."),
  item("rp-hs0232a", "20-HS-0232A", "instrument", "Chave seletora remota da válvula FV-0232", 0.93, { x: 1540, y: 805, width: 45, height: 40 }, "Chave seletora de controle automático no DCS A."),
  item("rp-zlo0232", "20-ZLO-0232", "instrument", "Sinaleiro piloto status válvula aberta A", 0.92, { x: 1675, y: 760, width: 45, height: 40 }, "Luz indicadora de abertura completa da válvula FV-0232."),
  item("rp-zlc0232", "20-ZLC-0232", "instrument", "Sinaleiro piloto status válvula fechada A", 0.92, { x: 1675, y: 805, width: 45, height: 40 }, "Luz indicadora de fechamento completo da válvula FV-0232."),
  item("rp-il-diamond-a", "20-IL-FV0232", "instrument", "Intertravamento de segurança da válvula FV-0232", 0.93, { x: 1605, y: 840, width: 45, height: 45 }, "Lógica de shutdown da válvula de descarga A."),
  item("rp-ti0231", "20-TI-0231", "instrument", "Termômetro indicador na descarga A", 0.96, { x: 1260, y: 980, width: 46, height: 46 }, "Medição local bimetálica de temperatura da corrente de descarga A."),
  item("rp-fe0231", "20-FE-0231", "instrument", "Elemento primário de vazão vortex A", 0.96, { x: 1330, y: 1025, width: 48, height: 48 }, "Medidor de vazão tipo carretel gerador de vórtices em linha A."),
  item("rp-ft0231", "20-FT-0231", "instrument", "Transmissor inteligente de vazão 20-FT-0231", 0.97, { x: 1330, y: 1110, width: 48, height: 48 }, "Transmissor inteligente de vazão da linha A."),
  item("rp-ffic0231", "20-FFIC-0231", "instrument", "Controlador indicador de vazão no DCS A", 0.95, { x: 1330, y: 1190, width: 50, height: 50 }, "Malha digital PID de controle acoplada à FV-0232."),
  item("rp-pv-disc-a1", "20-PV-0231-A1", "valve", "Válvula manual de bloqueio pós-FV-0232 #1", 0.94, { x: 1685, y: 1025, width: 36, height: 30 }, "Primeiro bloqueio manual pós-válvula de controle A."),
  item("rp-dr-disc-a2", "20-DR-0231-2", "valve", "Dreno intermediário de descarga A", 0.91, { x: 1735, y: 1080, width: 26, height: 35 }, "Dreno intermediário de alívio da linha A."),
  item("rp-pv-disc-a2", "20-PV-0231-A2", "valve", "Válvula manual de bloqueio final pós-FV-0232 #2", 0.94, { x: 1785, y: 1025, width: 36, height: 30 }, "Segundo bloqueio manual na linha de descarga inferior."),
  item("rp-l200-07", "200-P01-20020407-B01C-HC", "tag", "Coletor de descarga inferior 200mm A", 0.96, { x: 1820, y: 1025, width: 180, height: 20 }, "Tubulação de descarga principal de 200mm enviando produto ao reator RX #1."),

  // --- MANIFOLDS SUPERIORES E RECIRCULAÇÃO ---
  item("rp-ti0243", "20-TI-0243", "instrument", "Termômetro indicador na recirculação superior", 0.93, { x: 1845, y: 165, width: 45, height: 45 }, "Medição de temperatura na corrente de recirculação superior."),
  item("rp-pi0243a", "20-PI-0243A", "instrument", "Manômetro indicador de topo A", 0.95, { x: 1960, y: 90, width: 48, height: 48 }, "Indicação local de pressão na linha de recirculação superior A."),
  item("rp-pi0243b", "20-PI-0243B", "instrument", "Manômetro indicador de topo B", 0.95, { x: 2140, y: 90, width: 48, height: 48 }, "Indicação local de pressão na linha de recirculação superior B."),
  item("rp-ro0243", "20-RO-0243", "instrument", "Placa de orifício de restrição de recirculação 20-RO-0243", 0.92, { x: 2050, y: 240, width: 45, height: 45 }, "Placa calibrada para garantia de vazão mínima contínua na bomba B."),
  item("rp-ti0233", "20-TI-0233", "instrument", "Termômetro indicador na recirculação inferior", 0.93, { x: 1845, y: 815, width: 45, height: 45 }, "Medição de temperatura na corrente de recirculação inferior."),
  item("rp-pi0233a", "20-PI-0233A", "instrument", "Manômetro indicador inferior A", 0.95, { x: 1960, y: 740, width: 48, height: 48 }, "Indicação local de pressão na linha de recirculação inferior A."),
  item("rp-pi0233b", "20-PI-0233B", "instrument", "Manômetro indicador inferior B", 0.95, { x: 2140, y: 740, width: 48, height: 48 }, "Indicação local de pressão na linha de recirculação inferior B."),
  item("rp-ro0233", "20-RO-0233", "instrument", "Placa de orifício de restrição inferior 20-RO-0233", 0.92, { x: 2050, y: 890, width: 45, height: 45 }, "Placa calibrada para garantia de vazão mínima contínua na bomba A."),
];

export const fractionationLoopDetections: Detection[] = [
  item("fl-t10013", "T-10013", "equipment", "Coluna de fracionamento", 0.96, { x: 550, y: 300, width: 320, height: 850 }, "Coluna principal de destilação fracionada."),
  item("fl-e1001", "E-1001", "equipment", "Reboiler de fundo de coluna", 0.92, { x: 420, y: 1100, width: 220, height: 160 }, "Trocador de calor / refervedor tipo Kettle."),
  item("fl-e1002", "E-1002", "equipment", "Condensador de topo", 0.94, { x: 1050, y: 220, width: 240, height: 150 }, "Condensador total da corrente de topo."),
  item("fl-d1001", "D-1001", "equipment", "Tambor acumulador de refluxo", 0.91, { x: 1450, y: 380, width: 180, height: 240 }, "Vaso acumulador de refluxo de topo."),
  item("fl-p1001a", "P-1001A", "equipment", "Bomba de refluxo de topo", 0.9, { x: 1750, y: 650, width: 140, height: 100 }, "Bomba de refluxo de destilado."),
  item("fl-p1001b", "P-1001B", "equipment", "Bomba de refluxo reserva", 0.88, { x: 1750, y: 820, width: 140, height: 100 }, "Bomba de refluxo reserva."),
  item("fl-fcv1001", "FCV-1001", "valve", "Válvula de controle de alimentação", 0.89, { x: 320, y: 580, width: 90, height: 65 }, "Controle de vazão de carga."),
  item("fl-pcv1001", "PCV-1001", "valve", "Válvula de controle de pressão de topo", 0.91, { x: 1250, y: 180, width: 95, height: 70 }, "Válvula de controle de pressão do vaso."),
  item("fl-lcv1001", "LCV-1001", "valve", "Válvula de controle de nível de fundo", 0.87, { x: 780, y: 1250, width: 90, height: 65 }, "Controle de saída de produto de fundo."),
  item("fl-tcv1001", "TCV-1001", "valve", "Válvula de controle de temperatura", 0.86, { x: 260, y: 1120, width: 90, height: 65 }, "Controle de vapor para o reboiler."),
  item("fl-ti1001", "TI-1001", "instrument", "Indicação de temperatura de topo", 0.93, { x: 920, y: 260, width: 85, height: 65 }, "Sensor de temperatura no vapor de topo."),
  item("fl-tic1001", "TIC-1001", "instrument", "Controlador indicador de temperatura", 0.95, { x: 420, y: 980, width: 90, height: 70 }, "Controle de temperatura no fundo."),
  item("fl-pi1001", "PI-1001", "instrument", "Indicação de pressão de topo", 0.89, { x: 850, y: 180, width: 85, height: 65 }, "Medição de pressão na saída da coluna."),
  item("fl-pic1001", "PIC-1001", "instrument", "Controlador de pressão de topo", 0.94, { x: 1120, y: 120, width: 90, height: 70 }, "Malha de pressão com PCV-1001."),
  item("fl-fi1001", "FI-1001", "instrument", "Indicação de vazão de carga", 0.88, { x: 210, y: 580, width: 85, height: 65 }, "Medição de vazão de alimentação."),
];

export const pressureVesselDetections: Detection[] = [
  item("pv-v201", "V-201", "equipment", "Vaso de pressão horizontal", 0.95, { x: 280, y: 480, width: 380, height: 260 }, "Vaso de pressão existente para separação."),
  item("pv-v202", "V-202", "equipment", "Vaso acumulador de dreno", 0.88, { x: 780, y: 750, width: 180, height: 210 }, "Vaso de retenção e dreno."),
  item("pv-psv201", "PSV-201", "valve", "Válvula de segurança e alívio", 0.92, { x: 420, y: 320, width: 90, height: 75 }, "Válvula de alívio e segurança estalipada."),
  item("pv-xv201", "XV-201", "valve", "Válvula de corte de emergência", 0.89, { x: 160, y: 530, width: 85, height: 65 }, "Válvula automatizada de shutoff na entrada."),
  item("pv-va201", "VA-201", "valve", "Válvula de bloqueio manual", 0.84, { x: 500, y: 800, width: 75, height: 55 }, "Válvula manual de purga de dreno."),
  item("pv-pi201", "PI-201", "instrument", "Manômetro de pressão interna", 0.91, { x: 560, y: 390, width: 80, height: 65 }, "Indicação local de pressão do vaso."),
  item("pv-ti201", "TI-201", "instrument", "Termômetro bimetálico", 0.86, { x: 320, y: 420, width: 80, height: 65 }, "Indicação de temperatura de operação."),
  item("pv-li201", "LI-201", "instrument", "Visor de nível tipo vidro", 0.83, { x: 680, y: 540, width: 75, height: 70 }, "Indicação visual de nível de líquido."),
];

export const instrumentReferenceDetections: Detection[] = [
  item("ir-pic10", "PIC-10", "instrument", "Controlador indicador de pressão", 0.95, { x: 120, y: 180, width: 90, height: 70 }, "Símbolo de controle de pressão montado em painel."),
  item("ir-tic20", "TIC-20", "instrument", "Controlador indicador de temperatura", 0.94, { x: 260, y: 180, width: 90, height: 70 }, "Símbolo de controle de temperatura."),
  item("ir-lic30", "LIC-30", "instrument", "Controlador indicador de nível", 0.93, { x: 400, y: 180, width: 90, height: 70 }, "Símbolo de controle de nível."),
  item("ir-fic40", "FIC-40", "instrument", "Controlador indicador de vazão", 0.96, { x: 540, y: 180, width: 90, height: 70 }, "Símbolo de controle de vazão."),
  item("ir-ai50", "AI-50", "instrument", "Indicador de análise físico-química", 0.9, { x: 680, y: 180, width: 90, height: 70 }, "Analisador em linha."),
  item("ir-pv10", "PV-10", "valve", "Válvula de controle de pressão", 0.91, { x: 840, y: 220, width: 85, height: 60 }, "Elemento final de controle pneumático."),
  item("ir-tv20", "TV-20", "valve", "Válvula de controle de temperatura", 0.89, { x: 980, y: 220, width: 85, height: 60 }, "Válvula globo modulante."),
  item("ir-pi11", "PI-11", "instrument", "Manômetro local", 0.88, { x: 1120, y: 180, width: 80, height: 65 }, "Medição de campo montada na tubulação."),
];

export const pumpReferenceDetections: Detection[] = [
  item("pr-p01a", "P-01A", "equipment", "Bomba centrífuga horizontal", 0.94, { x: 100, y: 220, width: 95, height: 75 }, "Símbolo de bomba centrífuga sucção axial."),
  item("pr-p01b", "P-01B", "equipment", "Bomba centrífuga horizontal reserva", 0.92, { x: 240, y: 220, width: 95, height: 75 }, "Bomba centrífuga na configuração reserva."),
  item("pr-p02", "P-02", "equipment", "Bomba de deslocamento positivo", 0.88, { x: 380, y: 220, width: 95, height: 75 }, "Bomba de engrenagem/dosadora."),
  item("pr-m01", "M-01", "equipment", "Motor elétrico trifásico", 0.91, { x: 100, y: 380, width: 85, height: 65 }, "Motor elétrico acionador."),
  item("pr-m02", "M-02", "equipment", "Motor elétrico trifásico reserva", 0.89, { x: 240, y: 380, width: 85, height: 65 }, "Motor elétrico acionador."),
  item("pr-cv01", "CV-01", "valve", "Válvula de retenção", 0.87, { x: 200, y: 150, width: 75, height: 50 }, "Retenção na linha de descarga."),
  item("pr-cv02", "CV-02", "valve", "Válvula de retenção reserva", 0.85, { x: 340, y: 150, width: 75, height: 50 }, "Retenção na linha de descarga reserva."),
  item("pr-pi01", "PI-01", "instrument", "Manômetro local de descarga", 0.86, { x: 200, y: 80, width: 70, height: 55 }, "Indicação de pressão de recalque."),
];

export const sampleDetectionsMap: Record<string, Detection[]> = {
  "distillation-train": referenceDetections,
  "16.jpg": referenceDetections,
  "reflux-pumps": refluxPumpsDetections,
  "160.jpg": refluxPumpsDetections,
  "petrochem-complex": [],
  "PID-501-A.jpg": [],
  "fractionation-loop": fractionationLoopDetections,
  "151.jpg": fractionationLoopDetections,
  "pressure-vessel": pressureVesselDetections,
  "118.jpg": pressureVesselDetections,
  "instrument-reference": instrumentReferenceDetections,
  "127.jpg": instrumentReferenceDetections,
  "pump-reference": pumpReferenceDetections,
  "135.jpg": pumpReferenceDetections,
};

export function getDetectionsForSample(sampleId: string): Detection[] {
  return sampleDetectionsMap[sampleId] ?? [];
}

export const atlasAgents = [
  { id: "orchestrator", name: "Atlas Orchestrator", authority: "L4", role: "Coordena o Blueprint e a sequência local", state: "ready" },
  { id: "vision", name: "Vision Analyst", authority: "L2", role: "Executa OCR e localiza evidências", state: "ready" },
  { id: "reviewer", name: "Classification Reviewer", authority: "L1", role: "Sugere classe, grupo e justificativa", state: "ready" },
  { id: "topology", name: "Topology Analyst", authority: "L1", role: "Expõe rotas e relações curadas", state: "ready" },
  { id: "redteam", name: "Red Team Validator", authority: "L1", role: "Expõe incertezas e falhas de evidência", state: "attention" },
];

export const initialAudit = [
  { id: "audit-1", time: "SEED 01", agent: "Atlas Orchestrator", action: "Blueprint THL-PID-BP-001 validado", status: "passed" },
  { id: "audit-2", time: "SEED 02", agent: "Constitution Engine", action: "Política local-only aplicada", status: "passed" },
  { id: "audit-3", time: "SEED 03", agent: "Vision Analyst", action: "Amostra de referência carregada", status: "passed" },
  { id: "audit-4", time: "SEED 04", agent: "Topology Analyst", action: "Topologia demonstrativa da referência carregada", status: "passed" },
  { id: "audit-5", time: "SEED 05", agent: "Red Team Validator", action: "3 ocorrências encaminhadas para revisão", status: "attention" },
];

export const plannedConfusionMatrix = {
  labels: ["TAG", "Equipamento", "Instrumento"],
  values: [
    [12, 1, 1],
    [1, 10, 0],
    [1, 0, 6],
  ],
  note: "Calibração demonstrativa em 32 ocorrências selecionadas. A validação oficial depende de rotulagem por especialista.",
};
