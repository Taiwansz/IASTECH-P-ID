# ADR-001: Local-first inference

**Status:** Accepted  
**Decision owner:** Matheus Sousa dos Santos

## Context

The supplied P&ID material should not be exposed to an external AI provider. The target computer may also have limited memory and no dedicated GPU.

## Decision

Use browser-based Tesseract OCR, deterministic normalization and curated reference samples. Keep a disabled adapter boundary for future private inference, but do not ship a configured network provider.

## Consequences

- No API key is required.
- The first live OCR run can take longer on a low-power computer.
- Symbol classification remains a proof of concept until a labeled training set exists.
- The presentation path remains reliable through bundled reference results and local caching.
- Privacy can be demonstrated as an architectural property, not a promise.

