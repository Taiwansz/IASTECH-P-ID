# Rastro — P&ID Lens | Apresentação Oficial (Slide Deck)
**Hackathon IASTECH + UNIMAX | Desafio de Extração Automatizada de P&IDs**
*Equipe ThLoop • Desenvolvido por Matheus Sousa dos Santos*

Arquivo PowerPoint (.pptx) gerado em: [`docs/IASTECH_PID_Lens_Presentation.pptx`](file:///C:/Users/stdma/IASTECH-P-ID/docs/IASTECH_PID_Lens_Presentation.pptx)

---

## Slide 1: Capa & Identificação
* **Título:** Rastro — P&ID Lens
* **Subtítulo:** Extração de Informações de Diagramas P&ID 100% Offline, Classificação Determinística ANSI/ISA-5.1 e Governança Auditável
* **Evento:** Hackathon IASTECH (em parceria com UNIMAX)
* **Equipe:** ThLoop (Matheus Sousa dos Santos)
* **Abordagem:** Local-First, Zero-API-Keys, Soberania de Dados Industriais

---

## Slide 2: O Desafio & Complexidade Real de P&IDs
* **Categoria:** Contexto & Dores de Engenharia
* **Fricção de Digitalização:**
  * Baixa resolução de escaneamento em plantas antigas.
  * Ruído analógico, manchas e traços degradados.
  * Textos e TAGs pequenos em espaços confinados.
* **Densidade & Sobreposição:**
  * Linhas de tubulação cruzando balões de instrumentos.
  * Manifolds verticais densos de válvulas com etiquetas deslocadas.
  * Risco de associação cruzada errada entre texto e símbolo físico.
* **Desvios Normativos & Segurança Industrial:**
  * Diagramas que fogem do padrão ANSI/ISA-5.1.
  * Notas de projeto (`NE-5`, `NOTA-01`) que são confundidas com instrumentos de processo.
  * Riscos inaceitáveis de vazamento de segredos industriais (IP) para nuvens públicas de LLM.

---

## Slide 3: Arquitetura 100% Offline-First (Zero Cloud & Zero API Keys)
* **Categoria:** Engenharia de Software & Segurança da Informação
* **Pipeline Local Autocontido:**
  1. **Entrada Local:** Imagens carregadas diretamente na memória do navegador ou CLI local.
  2. **Morfologia & Denoising:** Binarização adaptativa Otsu e afinamento morfológico Zhang-Suen.
  3. **Visão Local:** Detecção de balões ISA-5.1, pares de válvulas e corpos de equipamentos.
  4. **OCR Neural Local:** Tesseract.js com worker Singleton persistente via WebAssembly (Wasm).
  5. **Motor ML Local:** Classificador k-NN / Naive Bayes em memória com Active Learning.
  6. **Zero Fallbacks:** Supressão total de adivinhações e suposições heurísticas não comprovadas.
* **Proteção de Propriedade Intelectual (IP):**
  * Funciona em salas de controle isoladas da internet (*air-gapped*).
  * Sem custos de tokens, sem latência de rede e sem risco de violação de sigilo.

---

## Slide 4: Visão Computacional & Associação Espacial Anisotrópica
* **Categoria:** Visão Computacional & Morfologia Matemática
* **Métrica Anisotrópica para Manifolds de Válvulas:**
  $$\text{dist} = \sqrt{(\Delta X)^2 + (w_y \cdot \Delta Y)^2}, \quad w_y = 2.8$$
  * Penalização vertical severa que elimina a troca de etiquetas em manifolds empilhados (`VA-20`, `VA-19`, `VA-18`).
  * Tolerância vertical máxima $|\Delta Y| \le 18\text{px}$, amarrando a TAG estritamente à válvula na mesma linha horizontal.
* **Recorte Focalizado (ROI - `recognizeRoi`):**
  * Processamento em sub-regiões de canvas nativo com modo `PSM.SINGLE_LINE`.
  * Captura equipamentos isolados que falhariam em leituras de página inteira (ex: `MJ-1`).

---

## Slide 5: Classificação Determinística ANSI/ISA-5.1 e Formato Oficial
* **Categoria:** Normas Técnicas & Formato do Desafio
* **Tabela no Formato Exigido pelo Edital:**
  $$\text{Formato: } \mathbf{TAG / TYPE / CLASS} \quad (\text{ex: } FV210=\text{Valve/Instrument}, \, M210=\text{Motor/Equipment})$$
* **Exemplos Validados pelo Pipeline:**
  * `FV210`: Type = `Valve` | Class = `Instrument` $\rightarrow$ `FV210=Valve/Instrument`
  * `M210`: Type = `Motor` | Class = `Equipment` $\rightarrow$ `M210=Motor/Equipment`
  * `LT210`: Type = `Level Transmitter` | Class = `Instrument` $\rightarrow$ `LT210=Level Sensor/Instrument`
  * `PIC 01`: Type = `Pressure Controller` | Class = `Instrument`
  * `B-01`: Type = `Vessel` | Class = `Equipment`
  * `NE-5`: Type = `Drawing Note` | Class = `Annotation` (Isolado do processo)
* **Heurística de Fallback Não-ISA:**
  * Atribuição baseada em prefixos mecânicos (`M` = Motor, `P` = Bomba, `TK` = Tanque) e pistas morfológicas (círculo = Instrumento, gravata = Válvula).

---

## Slide 6: Avaliação de Desempenho & Matriz de Confusão Real (Peso 35%)
* **Categoria:** Critério 1 — Classificação Correta via Matriz de Confusão
* **Acurácia Global no Ground Truth:** **100.00%** (66/66 amostras)
* **Macro F1-Score:** **100.00%**

### Matriz de Confusão Multiclasse
| Real \ Previsto | Instrument | Valve | Equipment | Annotation | Total |
|---|:---:|:---:|:---:|:---:|:---:|
| **Instrument** | **22** | 0 | 0 | 0 | 22 |
| **Valve** | 0 | **15** | 0 | 0 | 15 |
| **Equipment** | 0 | 0 | **24** | 0 | 24 |
| **Annotation** | 0 | 0 | 0 | **5** | 5 |

### Métricas Detalhadas por Classe
| Classe | Precision | Recall | F1-Score |
|---|:---:|:---:|:---:|
| **Instrument** | 100.00% | 100.00% | **100.00%** |
| **Valve** | 100.00% | 100.00% | **100.00%** |
| **Equipment** | 100.00% | 100.00% | **100.00%** |
| **Annotation** | 100.00% | 100.00% | **100.00%** |

*Relatório oficial consolidado:* `docs/benchmark_results.json`.

---

## Slide 7: Apresentação de Resultados & DataViz Industrial (Peso 20%)
* **Categoria:** Critério 2 — Apresentação de Resultados / DataViz
* **Sincronização Vetorial Interativa:** Overlays clicáveis sobre o desenho original com zoom subpixel e pan arrastável.
* **Mapa de Calor de Confiança:** Gradiente visual calibrado (Alta, Moderada, Revisão).
* **Topologia e Grafo de Processo:** Mapeamento de rotas de fluxo (Alimentação, Fundo, Topo) e raio de impacto a montante/jusante (*blast-radius*).
* **Exportação Multiformato de Engenharia:**
  * **CSV:** Tabela oficial `TAG / TYPE / CLASS` com UTF-8 BOM.
  * **JSON:** Modelo completo com bounding boxes, metadados e malhas.
  * **GraphML:** Compatível com Cytoscape e Gephi.
  * **CAD DXF:** AutoCAD R2000 em camadas industriais.
  * **SVG:** Vetor escalável independente.
  * **Markdown:** Relatório técnico executivo completo.

---

## Slide 8: Criatividade & Diferenciais Técnicos (Peso 25%)
* **Categoria:** Critério 3 — Criatividade
1. **Drawing Quality Score (DQS):** Métrica algorítmica proprietária que quantifica a maturidade técnica da planta e estima horas economizadas.
2. **Aprendizado Ativo Contínuo no Navegador:** Algoritmo k-NN / Naive Bayes em memória que aprende novos padrões visuais com cada clique do usuário, sem retreinamentos em nuvem.
3. **Análise de Segurança de Processo (PSM):** Mapeamento automático de Elementos Críticos de Segurança (SCE) e nós hub de alta centralidade.
4. **Alinhamento Espacial Anisotrópico em Manifolds:** Solução inédita de física geométrica para válvulas empilhadas em espaço confinado.

---

## Slide 9: Apresentação da Solução & Governança Atlas (Peso 20%)
* **Categoria:** Critério 4 — Apresentação da Solução & Governança
* **Arquitetura Multiagente Atlas Console:**
  * **Atlas Orchestrator (L4):** Governança constitucional e orquestração.
  * **Vision Analyst (L2):** Reconhecimento local de contornos e OCR.
  * **Classification Reviewer ISA-5.1 (L1):** Aplicação estrita da norma.
  * **Topology Analyst (L1):** Construção e validação do grafo.
  * **Red Team Auditor (L1):** Detecção de incertezas e proteção contra alucinações.
* **Soberania Humana (*Human-in-the-Loop*):**
  * Gate de revisão aos 78% de confiança.
  * Edição inline na tela de análise.
  * Botão "Corrigir e Aceitar" para retificar e treinar a IA na mesma ação.
  * Botão "+ Adicionar TAG" para omissões de escaneamento.

---

## Slide 10: Limites Assumidos com Honestidade & Próximos Passos
* **Limites Atuais Assumidos:**
  * Amostras dinâmicas não inventam tubulações inexistentes (Zero Fallbacks).
  * O OCR depende de contraste mínimo e legibilidade básica do desenho.
  * A ferramenta é um copiloto de engenharia e não substitui estudos formais de HAZOP/LOPA.
* **Roadmap de Produção Industrial:**
  1. Integração de detector YOLOv11 local via WebGPU (`onnxruntime-web`).
  2. Extração direta de PDFs vetoriais com `pdfjs-dist` para plantas CAD nativas.
  3. Rastreamento físico contínuo de tubulações via algoritmo A* com afinamento morfológico.
