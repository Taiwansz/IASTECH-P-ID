# ADR-002: Topologia Semântica Curada e Política de Zero Alucinação de Linhas

- **Status:** Aceito
- **Data:** 2025-02-16
- **Decisores:** Equipe de Arquitetura IASTECH P&ID Lens
- **Classificação:** Integridade Semântica / Segurança de Processos

---

## 1. Contexto e Declaração do Problema

Em plantas de processo contínuo (refinarias, petroquímica, celulose, farmacêutica), os diagramas P&ID representam não apenas listas de equipamentos e instrumentos isolados, mas a interconexão hidráulica, pneumática e lógica dos circuitos industriais.

Modelos de visão computacional convencionais ou abordagens ingênuas de proximidade euclidiana (como conectar qualquer componente a outro se a distância for inferior a $N$ pixels) geram **arestas fantasmas**: tubulações inexistentes que conectam componentes que apenas cruzam linhas ou estão próximos geometricamente na folha de desenho.

Em sistemas de segurança industrial (SIS) e análise de HAZOP/LOPA, **alucinar uma interconexão de processo pode induzir a erros operacionais críticos**, desvios de fluido ou falhas em barreiras de segurança.

---

## 2. Direcionadores de Decisão

- **Rigor Ético e de Engenharia:** Jamais inventar linhas de processo ou sinal não comprovadas por algoritmos matemáticos determinísticos de rastreamento contínuo ou por validação de engenharia.
- **Transparência Epistêmica:** Diferenciar de forma explícita e visual para o usuário quando uma topologia é fruto de curadoria validada de engenharia versus quando é um diagrama sem rastreamento confirmado de linhas.
- **Prontidão Demonstrativa:** Apresentar a capacidade de análise topológica avançada (rotas de fluxo, impacto operacional a montante/jusante, malhas de controle) com dados reais e comprováveis sem comprometer a verdade dos fatos.

---

## 3. Alternativas Consideradas

### Alternativa A: Gerador Heurístico Baseado em Proximidade Euclidiana Cega
- Conectar nós vizinhos caso a distância centro-a-centro seja $< 220\text{ px}$.
- *Problema Crítico:* Gera centenas de conexões falsas (ex: conecta uma chave de pressão a um motor adjacente que pertencem a sistemas totalmente desacoplados). Cria alucinações visuais e invalida qualquer estudo de impacto de segurança.

### Alternativa B: Curadoria Verificada com Política de Zero-Hallucination [ESCOLHIDA]
- O dataset de referência curada (`16.jpg` - Coluna de Destilação) recebe uma malha topológica exata, com nós vinculados biunivocamente aos identificadores reais de detecção de OCR e símbolos.
- Amostras não curadas ou diagramas novos enviados pelo usuário recebem `{ nodes, edges: [], routes: [] }` até que um algoritmo certificado de rastreamento de linhas contínuas ou a validação de um engenheiro de processos no Human-in-the-Loop confirme os traçados.
- Na interface, um aviso explícito de integridade é exibido caso a topologia não seja verificada, evitando qualquer presunção incorreta de automação.

---

## 4. Decisão de Arquitetura

Adota-se a **Alternativa B**: A política de **Topologia Verificada e Zero Alucinação**.

1. **Separação Rígida de Relações:** Relações de processo (`process`), sinal pneumático/elétrico (`signal`) e instrumentação (`instrumentation`) são armazenadas em estruturas grafológicas imutáveis com direcionalidade explícita.
2. **Camada de Metadados de Status:** Todo relatório exportado (JSON e Markdown) inclui a propriedade `topology.status: "curated" | "unverified"`.
3. **Isolamento de Amostras de Teste:** O arquivo `app/lib/topology-data.ts` assegura que amostras não mapeadas fisicamente não recebam arestas arbitrárias.
4. **Auditoria de Operabilidade:** A interface exibe avisos permanentes de que a visualização de topologia é um auxílio computacional à tomada de decisão e não substitui uma caminhada de campo (walkdown) ou análise formal de HAZOP.

---

## 5. Consequências e Trade-Offs

### Consequências Positivas
- **Confiabilidade Absoluta:** O software não comete o erro clássico de demonstradores acadêmicos que desenham gráficos densos e aleatórios que não correspondem à física da planta.
- **Conformidade com Normas de Auditoria:** Facilita a aprovação perante equipes de auditoria técnica da IASTECH e UNIMAX, demonstrando maturidade industrial.

### Consequências Negativas / Mitigações
- *Desafio:* Para amostras não curadas, o grafo de fluxo não exibe linhas automáticas sem intervenção.
  - *Mitigação:* A interface disponibiliza a ferramenta de edição assistida e exibe mensagem amigável e esclarecedora explicando a política de segurança de dados.
