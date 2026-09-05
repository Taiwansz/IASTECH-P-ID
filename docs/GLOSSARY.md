# Glossário Técnico & Terminologia Industrial — Rastro P&ID Lens

> **Definições canônicas de instrumentação industrial, normas ANSI/ISA-5.1 e visão computacional aplicadas à extração automatizada de diagramas P&ID.**

---

## A

### ANSI/ISA-5.1-2009 (R2013)
Norma internacional do *International Society of Automation* (ISA) que rege os símbolos de instrumentação e identificação de malhas de processo através de códigos alfanuméricos padronizados (TAGs).

### Anisotropic Distance Metric (Métrica Anisotrópica)
Métrica ponderada de distância espacial utilizada para associar textos de OCR a símbolos geométricos em manifolds verticais densos:
$$\text{dist} = \sqrt{(\Delta X)^2 + (w_y \cdot \Delta Y)^2}, \quad w_y = 2.8$$
Penaliza severamente desvios verticais para impedir a troca cruzada de TAGs entre válvulas empilhadas (`VA-20`, `VA-19`, `VA-18`).

### Active Learning (Aprendizado Ativo)
Mecanismo no qual o modelo de Machine Learning geométrico local solicita a validação humana para detecções com baixa confiança e incorpora instantaneamente o feedback do engenheiro ao classificador k-NN sem necessidade de retreino em nuvem.

### Alarme Industrial (Alarm)
Função de leitura passiva em malhas ISA-5.1 designada pela letra funcional **A** (ex: `PAH` = Alarme de Pressão Alta, `PAL` = Alarme de Pressão Baixa, `PAHH` = Alarme de Pressão Muito Alta / Crítico).

---

## B

### BPCS (Basic Process Control System)
Sistema de Controle Básico de Processo responsável pela regulação contínua das variáveis de processo (ex: malhas modulantes de controle de vazão `FCV-101`, controle de nível `LCV-201`, pressão `PCV-301`). Não confundir com sistemas instrumentados de segurança (SIS).

### Balloon (Balão de Instrumentação)
Elemento gráfico circular, hexagonal ou quadrado que circunda a identificação alfanumérica de um instrumento no desenho P&ID. Linhas internas horizontais indicam localização física (montado no campo, painel principal ou sistema compartilhado/DCS).

---

## C

### Canonical Tag (TAG Canônico)
Forma normalizada e padronizada de uma identificação industrial de acordo com a ISA-5.1, formatada como `[Prefix]-[LoopNumber][Suffix]` (ex: `PIC-01`, `W-01`, `FV-210`).

### Confusion Matrix (Matriz de Confusão)
Tabela de contingência 4x4 que cruza as classes reais de Ground Truth (*Instrument*, *Equipment*, *Valve*, *Annotation*) contra as predições geradas pelo pipeline automatizado, permitindo o cálculo rigoroso de Acurácia Global, Precisão, Recall e Macro F1-Score (Peso de 35% no Hackathon IASTECH).

---

## D

### DQS (Drawing Quality Score)
Métrica composta de qualidade do diagrama que avalia o nível de ruído, resolução, legibilidade de texto, densidade de conexões e conformidade de sintaxe normativa em uma escala de 0 a 100 pontos.

### Drawing Note (Nota de Desenho)
Anotações textuais de engenharia em pranchas P&ID que delimitam escopos, remissões a outras folhas ou especificações mecânicas (ex: `NE-5`, `NOTA-01`, `REV-B`, `DWG-100`, `SKID-02`). Não participam do balanço de massa nem de malhas de controle fechadas.

---

## E

### Elemento Final de Controle (Final Control Element)
Dispositivo físico atuador manipulado pelo controlador de processo para alterar a vazão de fluido (tipicamente válvulas de controle `FV`, `LV`, `PV`, `TV` ou acionamentos de motor `M`).

### Equipment (Equipamento de Processo)
Corpos mecânicos e vasos de processo que realizam transformação, armazenamento ou transferência de calor e massa (ex: Torres de Destilação `B-01`, Trocadores de Calor `W-01`, Bombas centrífugas `P-01`, Tanques de armazenamento `TK-01`).

---

## F

### Fail-Safe / Contingência Local
Princípio arquitetural que garante a continuidade da operação sem paralisação caso um serviço secundário (como um daemon local Ollama ou API de LLM) falhe ou esteja desconectado. A regra determinística local assume instantaneamente a inferência.

### Formato Oficial do Desafio (TAG / TYPE / CLASS)
Especificação formal de extração requerida pela banca da IASTECH:
$$\text{TAG}=\text{TYPE}/\text{CLASS}$$
Exemplos:
- `FV210=Valve/Instrument`
- `M210=Motor/Equipment`
- `LT210=Transmitter/Instrument`
- `NE-5=Drawing Note/Annotation`

---

## H

### HAZOP (Hazard and Operability Study)
Estudo estruturado e sistemático de identificação de perigos operacionais em plantas industriais. O pipeline de governança do Rastro P&ID Lens exporta relatórios compatíveis com as sessões preliminares de HAZOP e análise LOPA.

---

## I

### Instrument (Instrumento de Processo)
Dispositivo que mede, monitora, indica, transmite ou controla variáveis físicas de processo (pressão, temperatura, vazão, nível, vibração, condutividade).

---

## K

### k-NN Espacial (k-Nearest Neighbors)
Classificador de aprendizado de máquina geométrico que categoriza candidatos desconhecidos avaliando os $k$ vizinhos mais próximos em um espaço de características invariantes à escala (proporção de aspecto, razão de preenchimento, densidade de contorno e proximidade de tubulação).

---

## L

### Loop Number (Número de Malha)
Número sequencial que identifica todos os instrumentos pertencentes à mesma malha de controle funcional (ex: em `PIC-101`, `PT-101` e `PV-101`, o número da malha é `101`).

---

## S

### SIS (Safety Instrumented System)
Sistema Instrumentado de Segurança dedicado a levar o processo a um estado seguro quando limites operacionais são violados. Utiliza válvulas de corte rápido (`SDV`, `ESDV`, `BDV`) e chaves de desarme (`PSHH`, `LSHH`).

---

## V

### Valve (Válvula de Processo)
Dispositivo mecânico para reter, direcionar ou modular o fluxo de fluido na tubulação (válvulas manuais de bloqueio `VA`, retenção `NRV`, alívio de segurança `PSV`, ou segurança térmica `TSV`).
