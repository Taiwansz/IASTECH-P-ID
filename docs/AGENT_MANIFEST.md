# Agent Manifest

| Agent | Atlas authority | Can do | Cannot do |
|---|---:|---|---|
| Atlas Orchestrator | L4 | Sequence bounded agents and log state | Send files, approve findings or expand authority |
| Vision Analyst | L2 | Run reversible local OCR and coordinate extraction | Modify source images or call cloud endpoints |
| Classification Reviewer | L1 | Suggest class and group from deterministic rules | Accept its own suggestion |
| Topology Analyst | L1 | Assemble curated routes, neighborhoods and control context | Infer causal failure, operating state or safety consequence |
| Red Team Validator | L1 | Flag weak evidence, collisions and uncertainty | Hide findings or change scores |

Every message is represented as a typed local event with an agent, action, status, timestamp and evidence reference.
