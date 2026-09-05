# Rastro P&ID Lens — Documentation Index

> **Base de Conhecimento Definitiva da Solução Rastro P&ID Lens**  
> *Desenvolvido para o Hackathon IASTECH (em parceria com UNIMAX) — Desafio de Extração Automatizada de P&IDs.*

Este índice centraliza e organiza toda a documentação de engenharia, arquitetura, decisões normativas, benchmarks de acurácia e guias de avaliação do projeto.

---

## Governança & Fundamentos

| Documento | Descrição | Status |
|---|---|---|
| [Constituição do Sistema](CONSTITUTION.md) | Princípios e invariantes inegociáveis de engenharia industrial | Concluído |
| [Blueprint de Engenharia](BLUEPRINT.md) | Especificação técnica completa de arquitetura e pipeline | Concluído |
| [Manifesto de Agentes](AGENT_MANIFEST.md) | Contratos operacionais e divisão de tarefas da equipe multiagente | Concluído |
| [Glossário Técnico Industrial](GLOSSARY.md) | Termos canônicos de automação, ISA-5.1 e visão computacional | Concluído |
| [Roadmap Estratégico](ROADMAP.md) | Evolução do projeto: Hackathon MVP -> Planta Piloto -> DCS/SCADA Enterprise | Concluído |

---

## Decisões Arquiteturais (ADRs)

Os **Architecture Decision Records (ADRs)** registram formalmente o contexto, as alternativas ponderadas e a justificativa de cada decisão arquitetural crítica.

| ADR | Título | Decisão | Status |
|---|---|---|---|
| [ADR-001](adr/ADR-001-LOCAL-FIRST-SOVEREIGNTY.md) | Arquitetura 100% Offline Local-First & Air-Gapped | Eliminação de dependência de nuvem e zero vazamento de IP industrial | Aprovado |
| [ADR-002](adr/ADR-002-CURATED-TOPOLOGY-ZERO-HALLUCINATION.md) | Topologia Curada vs Supressão de Grafos Fantasmas | Fim de inferências heurísticas arbitrárias por raio de proximidade | Aprovado |
| [ADR-003](adr/ADR-003-ANISOTROPIC-MANIFOLD-ASSOCIATION.md) | Métrica Espacial Anisotrópica para Manifolds Verticais | Ponderação vertical $w_y = 2.8$ para evitar inversão de válvulas empilhadas | Aprovado |
| [ADR-004](adr/ADR-004-ZERO-FALLBACK-POLICY.md) | Política Estrita de Zero-Fallbacks e Eliminação de Alucinações | Retorno fiel da evidência real sem inventar TAGs sintéticos inexistentes | Aprovado |
| [ADR-005](adr/ADR-005-ISA-51-DETERMINISTIC-PARSER.md) | Decomposição Determinística Estrita ANSI/ISA-5.1 | Parser formal de 4 camadas para derivação do formato TAG/TYPE/CLASS | Aprovado |

---

## Especificações do Desafio & Normas

| Documento | Descrição | Status |
|---|---|---|
| [Especificação do Desafio IASTECH](specs/CHALLENGE_SPECIFICATION.md) | Requisitos do edital, pesos de avaliação (35/20/25/20) e critérios | Concluído |
| [Norma Técnica ANSI/ISA-5.1](specs/ISA_51_NORMATIVE_SPEC.md) | Tabela oficial de letras de identificação, modificadores e regras de loop | Concluído |
| [Modelos de Dados & Contratos](specs/DATA_MODELS.md) | Tipos TypeScript, contratos JSON e formato TAG/TYPE/CLASS | Concluído |

---

## Guias Técnicos & Quickstarts

| Guia | Público-Alvo | Objetivo |
|---|---|---|
| [Guia Rápido do Avaliador IASTECH](guides/EVALUATOR_QUICKSTART.md) | Jurados & Avaliadores IASTECH | Avaliação passo a passo da solução em menos de 3 minutos |
| [Visão Geral de Arquitetura](guides/ARCHITECTURE_OVERVIEW.md) | Engenheiros de Automação & Devs | Fluxo de dados, OCR Neural Wasm, k-NN e contingência |

---

## Entregáveis de Avaliação do Hackathon

| Entregável | Localização | Formato / Descrição |
|---|---|---|
| **Matriz de Confusão & Benchmark (35%)** | [`docs/benchmark_results.json`](benchmark_results.json) | 66 componentes curados com 100% de acurácia |
| **Apresentação Oficial (Slide Deck)** | [`docs/IASTECH_PID_Lens_Presentation.pptx`](IASTECH_PID_Lens_Presentation.pptx) | PowerPoint profissional gerado com roteiro |
| **Apresentação de Slides Rastro (HTML)** | [`rastro_presentation.html`](../rastro_presentation.html) | Apresentação editorial interativa em arquivo único HTML (16:9) |
| **Roteiro dos Slides (Markdown)** | [`docs/SLIDES.md`](SLIDES.md) | Conteúdo detalhado slide a slide da apresentação |
| **Dashboard Standalone da Solução** | [`hackathon_iastech_solution.html`](../hackathon_iastech_solution.html) | Dashboard executivo interativo em arquivo único HTML |
