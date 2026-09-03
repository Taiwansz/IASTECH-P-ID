# ADR-002: Curated semantic topology

**Status:** Accepted
**Scope:** Local demonstration

## Context

The demo needs to show how engineers could move from isolated P&ID detections to flow tracing, impact review and control context. The provided dataset does not contain a validated graph, line connectivity labels or operating logic.

## Decision

The reference diagram receives a bundled, curated semantic topology. Nodes link to existing detection IDs when evidence exists. Process and signal relations are stored separately. Flow routes, impact neighborhoods and control contexts are calculated only from this local curated structure.

The interface always identifies this layer as demonstrative and requests specialist confirmation. Other documents keep OCR functionality but do not receive fabricated topology.

## Atlas authority

- Atlas Orchestrator may activate a view and append audit events.
- Topology Analyst may expose registered relations at L1.
- Red Team Validator must keep the non-operational warning visible.
- Human Review Gate may confirm review scope, never equipment operation.

## Consequences

- The 15-minute demonstration remains reliable and interactive without an external API.
- Diagram, graph and audit can share stable evidence identifiers.
- The product does not claim automatic line tracing or safety analysis.
- Future validated annotations can replace the curated layer without changing the view contracts.
