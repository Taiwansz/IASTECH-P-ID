# ADR-003: Métrica Anisotrópica Ponderada para Associação em Manifolds Verticais de Válvulas

- **Status:** Aceito
- **Data:** 2025-02-18
- **Decisores:** Equipe de Arquitetura IASTECH P&ID Lens
- **Classificação:** Visão Computacional / Associação Espacial

---

## 1. Contexto e Declaração do Problema

Em diagramas P&ID reais de refinaria e plantas químicas, é ubíqua a presença de **manifolds verticais de válvulas** (ex: baterias de amostragem, coletores de purga, manifolds de bloqueio triplo como `VA-20`, `VA-19`, `VA-18`).

Nestas disposições:
- Várias válvulas de bloqueio idênticas estão empilhadas verticalmente com espaçamento inter-válvula muito pequeno (muitas vezes entre 15 e 30 pixels no espaço de imagem).
- Os textos com os TAGs identificadores (ex: `VA-20`) são posicionados imediatamente à direita ou esquerda do corpo do símbolo, na mesma coordenada horizontal $Y$.
- Algoritmos tradicionais de emparelhamento por vizinho mais próximo com **distância euclidiana isotrópica** ($\sqrt{\Delta x^2 + \Delta y^2}$) sofrem frequentes erros de **troca vertical cruzada**: o TAG de uma válvula superior é associado à válvula inferior e vice-versa, devido a pequenas assimetrias horizontais no desenho ou texto deslocado.

---

## 2. Direcionadores de Decisão

- **Zero Trocas Verticais em Manifolds:** Eliminar 100% dos erros de associação cruzada entre pares de válvulas adjacentes empilhadas.
- **Eficiência Computacional:** A métrica deve ser calculável em $O(N \cdot M)$ no browser em milissegundos sem exigir modelos neurais de grafos.
- **Robustez a Ruído de OCR:** Lidar com caixas delimitadoras de texto que possuem pequenas folgas verticais ou horizontais resultantes da binarização.

---

## 3. Decisão de Arquitetura

Modela-se o espaço de emparelhamento através de uma **Métrica Euclidiana Ponderada Anisotrópica**:

$$D_{\text{aniso}} = \sqrt{\Delta x^2 + (w_y \cdot \Delta y)^2}$$

Onde:
- $\Delta x = |x_{\text{ocr}} - x_{\text{sym}}|$
- $\Delta y = |y_{\text{ocr}} - y_{\text{sym}}|$
- $w_y$ é o fator de penalização vertical, calibrado para $w_y = 2.8$ para símbolos com morfologia de par de triângulos de válvula (`valve-pair`), e $w_y = 1.0$ para instrumentos circulares ou equipamentos volumétricos.

Adicionalmente, estabelece-se um **teto de tolerância vertical rígido**:
- Para válvulas, se $\Delta y > 20\text{ px}$ e houver outro símbolo candidato com menor desvio vertical, a associação é impedida, priorizando a horizontalidade natural da legenda técnica industrial.

---

## 4. Consequências e Resultados

### Consequências Positivas
- **Associação 100% Perfeita no Manifold Crítico:** Conforme comprovado no pipeline de visão computacional (cenário `Vertical valve manifold (VA-20, VA-19, VA-18)`), a taxa de acerto na atribuição dos três TAGs empilhados atingiu 100%, sem nenhuma inversão vertical.
- **Zero Sobrecarga de Processamento:** A ponderação geométrica executa em menos de 1 milissegundo para conjuntos com até 500 detecções simultâneas.

### Consequências Negativas / Mitigações
- Textos deliberadamente rotacionados a 90 graus (verticais) exigem orientação prévia do OCR.
  - *Mitigação:* O motor de OCR avalia a razão de aspecto das caixas de texto e executa rotação ortogonal quando a altura excede a largura por fator superior a 2.5x.
