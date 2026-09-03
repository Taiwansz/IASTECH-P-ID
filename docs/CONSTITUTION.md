# Project Constitution

**ID:** THL-PID-CONST-001  
**Version:** 1.1.0
**Status:** Ratified for the demo

This Constitution adapts the governing ideas of Atlas to the P&ID analysis domain.

## Invariants

### Local data sovereignty

Industrial diagrams, crops, OCR text and reviewer decisions must not be transmitted to an external service. Network inference is disabled by default and no API key is required.

### Evidence before assertion

A classification without visible evidence cannot be presented as a detection. The interface must let the reviewer locate the source region.

### Honest confidence

Confidence is displayed as produced or derived. It cannot be raised to make the demo look better. Curated reference results must be labeled as such.

### Human sovereignty

The system suggests. Matheus or another authorized reviewer decides. No low-confidence item is silently promoted to an accepted result.

### Append-only memory

Review and correction events are appended to the local audit trail. The demo may clear its own local memory only through an explicit user action.

### Reversible execution

Runtime actions are local and reversible. File export and local memory reset require direct user intent.

### Topology is not causality

Visual connections may expose curated relationships and neighborhoods, but they cannot be presented as verified plant behavior, shutdown logic or a safety conclusion. Operational interpretation requires a qualified human.

## Quality policy

- Privacy violations block analysis.
- Missing evidence blocks acceptance.
- Confidence below 0.78 enters review.
- Confidence below 0.55 receives a critical ambiguity flag.
- Empty results are valid and must not be replaced by invented detections.
- The UI must distinguish reference metrics from measured live metrics.
- Curated topology must stay visually distinct from OCR measurements.
- Impact confirmation records review scope only. It does not authorize an operational action.

## Authority

The Constitution has precedence over visual polish, demo timing and agent recommendations.
