# ADR-004: Política de Zero Fallbacks e Honestidade de Evidências

- **Status:** Aceito
- **Data:** 2025-02-20
- **Decisores:** Equipe de Arquitetura IASTECH P&ID Lens
- **Classificação:** Governança de IA / Confiabilidade Metrológica

---

## 1. Contexto e Declaração do Problema

Sistemas prototípicos de IA frequentemente recorrem a "fallbacks cosméticos":
1. Quando a IA ou OCR falha em ler um texto em uma caixa, geram nomes fictícios sintetizados como `EQ-CIR-01` ou `VALV-AUTOGEN-3`.
2. Quando uma imagem desconhecida é carregada, o sistema reutiliza detecções salvas de outra imagem para que a tela não pareça vazia.
3. Para inflar métricas de precisão, atribuem pisos mínimos artificiais de confiança (como `Math.max(0.60, conf)`).

Em engenharia de automação para a IASTECH e UNIMAX, essas práticas são **inaceitáveis e perigosas**. Um operador que confia em um TAG sintetizado pode emitir uma Ordem de Serviço ou manobra em um equipamento fantasma.

---

## 2. Direcionadores de Decisão

- **Tolerância Zero a Dados Falsos:** Se o modelo de OCR não detectar caracteres legíveis, o componente deve ser mantido como geometria visual sem invenção de TAG.
- **Calibração Real de Confiança:** A pontuação de confiança deve refletir a certeza matemática real do modelo OCR e do classificador geométrico, sem pisos forçados ou maquiagem estatística.
- **Isolamento de Amostras de Referência:** Detecções curadas pertencem exclusivamente aos seus respectivos arquivos de imagem de teste. Novas imagens iniciam com estado limpo até que o OCR seja disparado.

---

## 3. Decisão de Arquitetura

Adota-se a **Política Rígida de Zero-Fallback**:

1. **Eliminação de TAGs Autogerados:** O arquivo `app/lib/local-ocr.ts` foi refatorado para que símbolos sem texto associado recebam o rótulo formal `"Símbolo sem TAG"`, preservando o tipo geométrico (`valve`, `instrument`, `equipment`) e grupo, sem criar siglas arbitrárias.
2. **Eliminação de Detecções Fantasmas:** A função `getDetectionsForSample` em `app/lib/demo-data.ts` retorna estritamente `sampleDetectionsMap[sampleId] ?? []`. A amostra não curada `petrochem-complex` inicia limpa, aguardando o clique do usuário em *"Executar OCR Local"*.
3. **Calibração Neutra:** O cálculo de `calibratedConfidence` em `app/lib/ml-pid-engine.ts` baseia-se exclusivamente na distância euclidiana aos centróides dos vetores de características e na pontuação do OCR, sem aditivos lineares artificiais.
4. **Tratamento de Interface Resiliente:** A interface gráfica em `app/components/PIDLensApp.tsx` lida de forma elegante com conjuntos com zero detecções, exibindo orientações claras de execução em vez de crashes ou dados antigos reciclados.

---

## 4. Consequências e Resultados

### Consequências Positivas
- **Aderência aos Padrões Industriais:** O sistema atua como ferramenta de instrumentação séria, apta a ser submetida a auditorias de integridade da IASTECH.
- **Transparência com o Engenheiro:** O avaliador sabe com exatidão o que o motor de visão leu por conta própria versus o que exige revisão humana no painel *Human-in-the-Loop*.

### Consequências Negativas / Mitigações
- Imagens com baixíssimo contraste exigirão o clique em *"Adicionar TAG"* pelo engenheiro ou ajuste de thresholding.
  - *Mitigação:* Implementou-se no painel de evidências a ferramenta de edição inline e adição manual de TAGs com retreinamento ativo do motor k-NN.
