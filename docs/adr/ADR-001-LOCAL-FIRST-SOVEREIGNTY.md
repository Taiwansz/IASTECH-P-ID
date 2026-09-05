# ADR-001: Arquitetura Local-First e Soberania de Dados Industriais

- **Status:** Aceito
- **Data:** 2025-02-15
- **Decisores:** Equipe de Arquitetura IASTECH P&ID Lens
- **Classificação:** Arquitetura Central / Segurança Industrial

---

## 1. Contexto e Declaração do Problema

Diagramas de Tubulação e Instrumentação (P&ID) são ativos críticos protegidos por segredo industrial, propriedade intelectual e normas de conformidade física em plantas químicas, petroquímicas, farmacêuticas e nucleares. 

O envio desses diagramas para serviços de inteligência artificial em nuvem pública (APIs corporativas externas) gera severos riscos de:
1. Violação de sigilo industrial e vazamento de propriedade intelectual confidencial.
2. Inviabilidade operacional em ambientes industriais restritos (estações de controle em salas de supervisório isoladas, air-gapped networks, zonas de DMZ sem acesso à internet).
3. Dependência de latência de rede e indisponibilidade de provedores externos de nuvem durante operações de manutenção de rotina.

Além disso, a bancada de avaliação técnica e as estações de campo da engenharia frequentemente dispõem de hardware convencional sem placas aceleradoras dedicadas (GPUs corporativas de alto custo).

---

## 2. Direcionadores de Decisão

- **Soberania de Dados:** Zero bytes de dados de diagramas industriais podem transitar por servidores públicos externos sem aprovação explícita de segurança.
- **Operação Desconectada (Air-Gapped):** O sistema deve ser 100% funcional sem conexão com a internet ou necessidade de chaves de API pagas.
- **Portabilidade de Execução:** Funcionamento instantâneo em desktops Windows/Linux através de navegadores modernos padrão e scripts executáveis simples (`demo.bat`).
- **Resiliência e Desempenho:** Execução rápida com consumo moderado de memória RAM (< 1.5 GB de heap de processo).

---

## 3. Alternativas Consideradas

### Alternativa A: Processamento 100% em Nuvem (Cloud VLM / GPT-4 Vision API)
- *Vantagens:* Capacidade multimodal de leitura de texto e símbolos sem necessidade de desenvolvimento de pipeline local.
- *Desvantagens:* Inadmissível em ambientes de alta confidencialidade industrial; custo contínuo recorrente de chamadas de API; latência de 3 a 10 segundos por imagem; falha total se não houver internet.

### Alternativa B: Modelo VLM Local Pesado (ex: LLaVA 13B / Qwen-VL-7B local em PyTorch)
- *Vantagens:* Processamento on-premises com compreensão semântica avançada.
- *Desvantagens:* Exige GPU dedicada com mínimo de 8GB a 16GB de VRAM; tempo de inicialização de vários minutos; instalação complexa de CUDA/PyTorch que inviabiliza uma execução de demonstração de 5 minutos por avaliadores.

### Alternativa C: Arquitetura Local-First Híbrida (Tesseract WebAssembly + Classificador Heurístico / k-NN Local + Adaptador Opcional para Ollama/APIs) - [ESCOLHIDA]
- *Vantagens:* Execução 100% no cliente ou servidor local; inferência em WebAssembly compilado sem drivers nativos; zero dependência externa; adaptador plugável caso o usuário deseje conectar um daemon Ollama já instalado localmente (`llama3.2:latest`) ou chave privada de API.
- *Desvantagens:* Requer tratamento de pré-processamento de imagem e pós-processamento determinístico robusto baseado na norma ANSI/ISA-5.1.

---

## 4. Decisão de Arquitetura

Adota-se a **Alternativa C**: Uma arquitetura estritamente **Local-First Sovereign**.

1. **Pipeline de OCR Local:** Utilização de Tesseract.js compilado em WebAssembly com worker singleton persistente, pré-processamento por thresholding adaptativo e binarização Otsu direta no canvas HTML5.
2. **Motor de Extração Determinístico:** Decodificador de conformidade com a norma ANSI/ISA-5.1 executado em TypeScript puro, com tempo de execução inferior a 2 milissegundos por TAG.
3. **Classificador de Formas k-NN Local:** Mecanismo leve de aprendizado com extração geométrica (razão de aspecto, circularidade, momentos espaciais e densidade) executado no navegador sem GPU.
4. **Camada de Contingência Plural:** Interface com adaptador multi-provedor (Mini-IA Local, Ollama Local via `http://localhost:11434`, e APIs externas opcionais), com chave salva exclusivamente no `localStorage` do navegador do cliente e contingência determinística automática sem bloqueio da interface.

---

## 5. Consequências e Trade-Offs

### Consequências Positivas
- **Conformidade de Segurança:** Demonstração inequívoca de privacidade como propriedade arquitetural do sistema, não uma promessa política.
- **Zero Configuração:** O avaliador técnico pode descompactar o repositório, executar `demo.bat` e obter a análise completa em menos de 10 segundos sem cadastrar cartões de crédito ou chaves de API.
- **Determinismo Estrito:** Análises repetidas sobre o mesmo diagrama geram exatamente a mesma tabela `TAG / TYPE / CLASS`, sem variabilidade estocástica de modelos generativos de linguagem.

### Consequências Negativas / Mitigações
- *Desafio:* A primeira inicialização do worker WebAssembly de OCR consome de 1 a 2 segundos para carregar o modelo treinado de caracteres.
  - *Mitigação:* Implementação do padrão Singleton no ciclo de vida do worker e carregamento sob demanda com feedback visual na barra de status.
- *Desafio:* Diagramas de baixíssima resolução necessitam de assistência na extração de texto ruidoso.
  - *Mitigação:* Mecanismo de Human-in-the-Loop na interface com correção assistida e retreinamento do classificador local k-NN em tempo real.
