# Especificação Normativa Técnica: ANSI/ISA-5.1 e Heurísticas Industriais

- **Normas de Referência:** ANSI/ISA-5.1-1984 (R1992) / ISA-5.1-2009 (*Instrumentation Symbols and Identification*)
- **Módulo do Sistema:** `app/lib/isa51-rules.ts`
- **Classificação:** Engenharia de Instrumentação / Especificação de Domínio
- **Documento:** `docs/specs/ISA_51_NORMATIVE_SPEC.md`

---

## 1. Fundamentação e Gramática de TAGs Industriais

O sistema **IASTECH P&ID Lens** implementa um analisador léxico e sintático determinístico que decompõe e valida qualquer TAG de instrumentação segundo a tabela canônica de letras de identificação da norma **ANSI/ISA-5.1**.

### 1.1 Gramática Formal em Notação EBNF

$$\text{TAG} ::= \text{LETRAS\_ID} \quad [\text{"-"} \mid \text{"."} \mid \text{"\_"}] \quad \text{NUMERO\_MALHA} \quad [\text{SUFIXO}]$$

Onde:
$$\text{LETRAS\_ID} ::= \text{VARIAVEL\_MEDIDA} \quad [\text{MODIFICADOR\_VAR}] \quad \{\text{FUNCAO\_LEITURA} \mid \text{FUNCAO\_SAIDA}\} \quad [\text{MODIFICADOR\_FUNC}]$$

---

## 2. Tabela Canônica de Letras de Identificação (ISA-5.1 Tabela 1)

| Letra | Primeira Letra: Variável Medida ou Inicial | Modificador de Variável | Função de Leitura ou Passiva | Função de Saída | Modificador de Função |
|:---:|:---|:---|:---|:---|:---|
| **A** | Análise (Composition/Analysis) | — | Alarme (*Alarm*) | — | — |
| **B** | Queimador / Combustão (*Burner*) | — | Escolha do Usuário | Escolha do Usuário | Escolha do Usuário |
| **C** | Condutividade (*Conductivity*) | — | — | Controlador (*Controller*) | — |
| **D** | Densidade / Massa Específica | Diferencial (*Differential*) | — | — | — |
| **E** | Tensão Elétrica (*Voltage/EMF*) | — | Elemento Primário (*Sensor*) | — | — |
| **F** | Vazão / Fluxo (*Flow Rate*) | Razão / Fração (*Ratio*) | — | — | — |
| **G** | Medida Dimensional / Posição | — | Visor / Vidro (*Glass/Gauge*) | — | — |
| **H** | Comando Manual (*Hand*) | — | — | — | Alto (*High*) |
| **I** | Corrente Elétrica (*Current*) | — | Indicador (*Indicator*) | — | — |
| **J** | Potência Elétrica (*Power*) | Varredura (*Scan*) | — | — | — |
| **K** | Tempo / Programa (*Time*) | Taxa de Variação (*Rate of Change*) | — | Estação de Controle | — |
| **L** | Nível (*Level*) | — | Lâmpada Piloto (*Light*) | — | Baixo (*Low*) |
| **M** | Umidade (*Moisture/Humidity*) | Momentâneo (*Momentary*) | — | — | Médio / Intermediário (*Middle*) |
| **N** | Escolha do Usuário | — | Escolha do Usuário | Escolha do Usuário | Escolha do Usuário |
| **O** | Escolha do Usuário | — | Orifício de Restrição | — | — |
| **P** | Pressão / Vácuo (*Pressure/Vacuum*) | — | Ponto de Teste (*Point/Test*) | — | — |
| **Q** | Quantidade / Integrador (*Quantity*) | Integrador / Totalizador | — | — | — |
| **R** | Radiação (*Radiation*) | — | Registrador (*Recorder*) | — | — |
| **S** | Velocidade / Frequência (*Speed*) | Segurança (*Safety*) | — | Chave / Intertravamento (*Switch*) | — |
| **T** | Temperatura (*Temperature*) | — | — | Transmissor (*Transmitter*) | — |
| **U** | Multivariável (*Multivariable*) | — | Multifunção | Multifunção | Multifunção |
| **V** | Vibração / Análise Mecânica | — | — | Válvula / Atuador Final (*Valve*) | — |
| **W** | Peso / Força (*Weight/Force*) | — | Poço Termométrico (*Well*) | — | — |
| **X** | Não Classificado (*Unclassified*) | — | Não Classificado | Não Classificado | Não Classificado |
| **Y** | Evento / Estado / Lógica | — | — | Relé / Computação / Conversor (*Relay*) | — |
| **Z** | Posição / Dimensão (*Position*) | — | — | Elemento Final / Válvula de Acionamento | — |

---

## 3. Regras Sintáticas Especiais e Resolução de Ambiguidades

### 3.1 Chaves de Processo e Desarmes de Segurança (Switches: PSH, PSL, PSHH, PSLL)
- A letra `S` na segunda ou terceira posição atua como **Chave de Intertravamento / Desarme** (*Switch*).
- Quando seguida por um ou dois modificadores funcionais (`H`, `L`, `HH`, `LL`), a combinação denota um instrumento de disparo de alarme ou desarme de segurança:
  - `PSH`: Chave de Pressão Alta (*Pressure Switch High*) -> `kind: "instrument"`
  - `PSL`: Chave de Pressão Baixa (*Pressure Switch Low*) -> `kind: "instrument"`
  - `PSHH`: Chave de Pressão Muito Alta / Desarme (*Pressure Switch High-High / Trip*) -> `kind: "instrument"`
  - `LSHH`: Chave de Nível Muito Alto / Proteção contra Transbordamento -> `kind: "instrument"`
  - `TSH`: Chave de Temperatura Alta -> `kind: "instrument"`
- **Regra de ouro:** O analisador não trata o `S` como "Segurança" quando ele estiver seguido por modificadores de nível de alarme (`H`, `L`, `HH`, `LL`), assegurando a correta identificação como instrumento de chaveamento.

### 3.2 Diferenciação entre Controladores e Válvulas Finais de Controle
- Instrumentos como `FC` (Controlador de Vazão) e `LC` (Controlador de Nível) residem em módulos de software no DCS/SDCD ou em controladores dedicados de painel. Eles **NÃO são válvulas físicas**.
- Válvulas de controle recebem a letra `V` de atuação final: `FV` (Válvula de Controle de Vazão), `LV` (Válvula de Nível), `PV` (Válvula de Pressão), `TV` (Válvula de Temperatura).
- O motor normativo assegura que `FC` e `LC` sejam estritamente categorizados como `kind: "instrument"`, enquanto `FV`, `LV`, `PV` e `TV` são categorizados como `kind: "valve"`.

### 3.3 Válvulas Industriais Críticas de Bloqueio e Segurança
Para suportar plantas industriais complexas (petroquímica, óleo e gás, siderurgia), o sistema reconhece nativamente os acrônimos universais de válvulas especiais:
- `SDV`: *Shutdown Valve* (Válvula de Parada de Emergência) -> `kind: "valve"`, `group: "Válvulas de Bloqueio e Segurança Industrial"`
- `ESDV`: *Emergency Shutdown Valve* (Válvula de Desarme de Emergência) -> `kind: "valve"`
- `BDV`: *Blowdown Valve* (Válvula de Despressurização Rápida para Tocha/Flare) -> `kind: "valve"`
- `TSV`: *Thermal Safety Valve* (Válvula de Segurança Térmica) -> `kind: "valve"`
- `PVRV`: *Pressure Vacuum Relief Valve* (Válvula de Alívio de Pressão e Vácuo para Tanques) -> `kind: "valve"`
- `PSV` / `PRV`: *Pressure Safety/Relief Valve* (Válvula de Segurança contra Sobrepressão) -> `kind: "valve"`

---

## 4. Filtragem de Notas de Desenho e Delimitações de Engenharia

Em desenhos P&ID de engenharia detalhada, existem dezenas de marcações que não representam malhas operacionais de controle nem equipamentos físicos. O analisador implementa um filtro com a seguinte expressão regular:

```typescript
const DRAWING_NOTE_PATTERNS = /^(NE|NOTA|NOTE|REV|DWG|DETAIL|DET|SEC|SKID|AREA|PACKAGE|SPEC)[-.]?\d*/i;
```

Quando um identificador casa com esse padrão:
- **Classificação:** `kind: "tag"`
- **Grupo:** `"Notas e Delimitações de Desenho"`
- **Normativo:** `isaStandard: false`
- **Exclusão:** Os itens são isolados da lista de instrumentos e não participam do algoritmo de fechamento de malhas de processo (`detectControlLoops`).

---

## 5. Dicionário de Prefixos de Equipamentos Mecânicos e Térmicos

| Prefixo | Categoria de Equipamento | Descrição Funcional |
|:---:|:---|:---|
| **V**, **TK**, **T** | Vaso / Tanque / Coluna | Vasos de separação, reatores, colunas fracionadoras, tanques atmosféricos |
| **P**, **B** | Bomba (*Pump*) | Bombas centrífugas, bombas de deslocamento positivo, bombas dosadoras |
| **C**, **CP**, **K** | Compressor / Soprador | Compressores alternativos, centrífugos, compressores de parafuso |
| **E**, **HX**, **HE** | Permutador de Calor (*Heat Exchanger*) | Trocadores casco-e-tubo, refervedores, condensadores de topo |
| **F**, **FUR** | Forno / Aquecedor (*Furnace/Heater*) | Fornos de craqueamento, aquecedores a gás, caldeiras de processo |
| **M**, **MOT** | Motor Elétrico | Motores de indução para acionamento mecânico |
| **AG**, **MIX** | Agitador / Misturador | Agitadores mecânicos de vasos de processo |
| **FL**, **FLR** | Tocha / Queimador (*Flare*) | Sistemas de queima e alívio de emergência |

---

## 6. Algoritmo de Decodificação de Malhas de Controle Fechadas

Uma malha de controle fechada no padrão ISA-5.1 (*Feedback Control Loop*) requer:
1. **Elemento de Medição / Transmissor:** TAG contendo a variável inicial e a letra `T` (ex: `LT-210`, `PT-101`, `TT-305`).
2. **Elemento de Controle:** TAG contendo a mesma numeração de malha e a letra `C` (ex: `LC-210`, `PC-101`, `TC-305`) ou integrado ao DCS.
3. **Elemento Final de Atuação:** TAG com a mesma numeração de malha e a letra `V` (ex: `LV-210`, `PV-101`, `TV-305`).

O sistema calcula o índice de fechamento de malha e classifica o laço como:
- `[CONFORME] Malha Fechada Completa`: Quando sensor, controlador e atuador estão presentes e conectados.
- `[REVISÃO] Malha Aberta / Incompleta`: Quando detecta-se medição ou atuação isolada sem elemento correspondente na mesma malha.
