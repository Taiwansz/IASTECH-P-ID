# Changelog

Todas as alterações notáveis deste projeto são documentadas neste arquivo.

O formato baseia-se em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/), e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [1.0.0] - 2025-02-23 - Submissão Oficial Hackathon IASTECH / UNIMAX

### Adicionado
- **Motor Normativo Determinístico ANSI/ISA-5.1:** Analisador léxico e sintático com suporte completo a variáveis de processo, funções de leitura/saída, modificadores funcionais (`H`, `L`, `HH`, `LL`) e identificação precisa de chaves de desarme (`PSHH`, `PSLL`, `LSHH`).
- **Suporte a Válvulas Críticas Industriais:** Reconhecimento nativo de acrônimos industriais para válvulas de alívio e segurança: `SDV`, `ESDV`, `BDV`, `TSV`, `PVRV`, `PSV`, `AOV`, `GOV`.
- **Filtro de Anotações de Engenharia:** Detecção e isolamento de notas de desenho (`NE-5`, `NOTA-01`, `REV-A`, `DWG-100`, `SKID-01`), impedindo poluição de malhas fechadas de processo.
- **Associação Espacial Anisotrópica:** Métrica euclidiana ponderada verticalmente ($w_y = 2.8$ para válvulas), eliminando 100% dos erros de inversão de TAGs em manifolds verticais compactos (`VA-20`, `VA-19`, `VA-18`).
- **Função ROI Focalizada (`recognizeRoi`):** Recorte dinâmico no canvas e OCR de linha única para áreas de alta densidade simbólica.
- **Painel de Human-in-the-Loop:** Edição inline de TAGs, alteração de classes, adição manual de componentes e retreinamento ativo em tempo real do classificador local k-NN.
- **Adaptador Multi-Provedor com Contingência Automática:** Suporte a Mini-IA Local heurística, Ollama Local (`llama3.2:latest`) e APIs opcionais na nuvem com chave restrita ao `localStorage`, ativando contingência determinística transparente em caso de falha de conexão.
- **Dashboard Autocontido (`hackathon_iastech_solution.html`):** Aplicação executiva em arquivo único HTML sem dependência de Node.js, com visualizador interativo, matriz de confusão e decodificador ISA-5.1.
- **Documentação Corporativa Atlas:** Arquitetura formal em `docs/` (`INDEX.md`, `GLOSSARY.md`, `ROADMAP.md`, `docs/adr/`, `docs/specs/`, `docs/guides/`).
- **Slide Deck e Materiais de Apresentação:** Slides executivos em PowerPoint (`docs/IASTECH_PID_Lens_Presentation.pptx`) e Markdown (`docs/SLIDES.md`).
- **Suíte de Testes Automatizados:** 60 testes cobrindo conformidade normativa, manifolds espaciais, contingência, auditoria e métricas de confusão.

### Modificado
- **Eliminação Total de Emojis:** Padronização visual em toda a interface gráfica e documentação, substituindo emojis por ícones profissionais Phosphor e notações de engenharia (`[CONFORME]`, `[REVISÃO]`).
- **Padrão Singleton no OCR Wasm:** Persistência do worker Tesseract.js em memória, reduzindo latência de inferência de 2,5s para milissegundos.
- **Resolução de SSR Hydration no Next.js:** Inicialização assíncrona desacoplada no ciclo de vida de montagem (`useEffect`), garantindo paridade total entre HTML do servidor e renderização no cliente.

### Removido
- **Política Estrita de Zero-Fallbacks:** Remoção de TAGs sintéticos arbitrários (`EQ-CIR-01`, rótulos gerados) e de arestas heurísticas falsas por proximidade ingênua.
