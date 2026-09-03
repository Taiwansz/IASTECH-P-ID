# Blueprint: Rastro — P&ID Lens

**ID:** THL-PID-BP-001  
**Version:** 1.1.0
**Status:** Approved for local demonstration  
**Owner:** Matheus Sousa dos Santos / Equipe ThLoop

## Purpose

Create a local-first proof of concept that extracts and organizes TAGs, instruments, equipment and groups from industrial P&ID images while preserving evidence, uncertainty and human decision authority.

## Product contract

The demo must:

1. Load only local files and bundled challenge samples.
2. Run OCR in the browser without an external inference endpoint.
3. Display every result on top of its visual evidence.
4. Separate measured detections from curated demonstration references.
5. Route uncertain detections to human review.
6. Preserve review decisions and audit events in local browser storage.
7. Continue to work when offline after dependencies and language assets are installed.
8. Never claim industrial production readiness or universal P&ID accuracy.
9. Present document, topology, flow, impact, control context and confidence as synchronized views of the same evidence.
10. Label every relationship map as curated demonstration data until a domain specialist validates it.

## Topology

| Component | Responsibility | Trust boundary |
|---|---|---|
| Local web client | Viewer, workflow, OCR orchestration, review and metrics | User device only |
| OCR worker | Neural text recognition and word coordinates | Browser Web Worker |
| Rules engine | TAG normalization, class suggestion and confidence gates | Deterministic local code |
| Reference layer | Curated sample detections for a reliable presentation path | Bundled local JSON |
| Semantic topology layer | Curated nodes, process paths, signal relations and impact neighborhoods | Bundled local TypeScript, demonstrative only |
| Atlas governance layer | Constitution, Blueprint, agent manifest, memory and audit | Browser local storage |

## Data flow

1. A local image is selected by the user.
2. The browser creates an object URL that never leaves the device.
3. The OCR worker reads the pixels and emits text, coordinates and confidence.
4. The rules engine normalizes candidate TAGs and assigns an explainable class suggestion.
5. Confidence gates send uncertain items to the review queue.
6. Human decisions are appended to the local audit trail and correction memory.
7. Export produces a local JSON file only after an explicit user action.
8. Selecting an item in the P&ID selects the same evidence in the topology, impact and control views.
9. A topology confirmation appends a human event without changing the source diagram or asserting plant behavior.

## Agent contracts

The runtime presents five bounded agents. They are product roles, not autonomous external services.

| Agent | Authority | Input | Output |
|---|---:|---|---|
| Atlas Orchestrator | L4 | Analysis request and Constitution | Ordered local workflow and audit events |
| Vision Analyst | L2 | Image pixels | OCR candidates and visual coordinates |
| Classification Reviewer | L1 | Candidate TAGs and evidence | Suggested class, group and rationale |
| Topology Analyst | L1 | Curated nodes and relations | Visual routes, neighborhoods and relationship rationale |
| Red Team Validator | L1 | Results and confidence | Findings, ambiguity flags and human review requests |

## Failure modes

| Failure | Product behavior |
|---|---|
| OCR worker cannot initialize | Show a contextual error and keep curated samples usable |
| Language asset is missing | Explain the offline asset problem without sending data externally |
| No TAG pattern is recognized | Return an honest empty state and record the outcome in the local audit trail |
| Low-resolution image | Lower confidence and recommend review |
| Browser storage is unavailable | Keep the session in memory and report that persistence is disabled |
| A document has no validated topology | Keep OCR available and offer the curated reference without inventing relationships |
| A selected item has no graph node | Preserve the evidence selection and report that no semantic relation is registered |

## Acceptance gates

- Blueprint gate: this document is Approved.
- Constitution gate: no external image transmission is permitted.
- Evidence gate: every displayed detection has a bounding box or is explicitly marked as reference data.
- Human gate: low-confidence corrections require an explicit reviewer decision.
- Honesty gate: metrics must identify whether they are live, curated or pending validation.
- Topology gate: impact and flow maps are relationship aids, never operating instructions.
- Synchronization gate: diagram and graph selection must reference the same detection ID when one exists.
- Accessibility gate: keyboard operation, reduced motion and readable contrast are required.

## Non-goals

- Automatic interpretation of every P&ID standard.
- Production-grade safety decisions.
- Cloud collaboration or SharePoint synchronization.
- Training a universal symbol detector from the raw dataset.
- Automatic line tracing, causal inference or safety consequence calculation.
