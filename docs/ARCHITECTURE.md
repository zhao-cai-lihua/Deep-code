# Deep code architecture

## Product shape

Deep code is the primary human-facing desktop Workbench above the official DeepSeek Harness Engine. Users do not leave Deep code to perform a task; the DSH UI is not opened or embedded. Harness remains the only execution truth.

```text
Deep code Workbench
  |-- Task conversation and project navigation
  |-- Explanation Layer
  |     |-- Project Brief
  |     |-- readable activity and errors
  |     `-- expandable Evidence Drawer
  |-- first-run setup and recovery
  |-- local Companion Cards
  `-- DSH Adapter
        |-- session.create / prompt / history / cancel
        |-- normalized durable events
        `-- next: live Decision Gates and streaming
              `-- official DeepSeek Harness Engine
```

## Ownership

| Concern | Owner | Rule |
| --- | --- | --- |
| Tasks, navigation, human explanations, visible action feedback | Deep code | Every action must show working, success, or failure in the user's current context. |
| Sessions, model calls, tools, approvals, sandbox, modes, plugins | DSH Engine | Deep code reads and presents upstream truth; it never duplicates the decision logic. |
| Protocol and event vocabulary changes | DSH Adapter | Normalize once behind a version-aware seam. Renderer code must not call raw DSH endpoints. |
| Technical support for an explanation | Evidence Drawer | Preserve tool presenters and durable events; do not expose private reasoning traces. |
| Persona and interaction texture | Companion Cards | No tool, shell, sandbox, approval, model route, or system-policy authority. |

## Current vertical slice

Deep code can locate/start a local Engine, bind a selected workspace to a real DSH session, send prompts, poll durable history, display user and assistant messages, retain tool events as evidence, and cancel an active turn. The fixed Project Brief task asks the Agent to explain a repository for a non-programmer and distinguish confirmed facts from inference.

Live WebSocket downlinks for approvals, questions, queue state, incremental chunks, and projections are not complete yet. Until adapted, Deep code must describe that limitation rather than pretend an approval is a normal local confirmation.

## Delivery order

1. Reliable first run, workspace selection, and Engine recovery.
2. Complete DSH Adapter: streaming, Decision Gates, errors, model/mode/permission visibility, resume.
3. Explanation Layer: project map, change impact, error recovery, and continuous brief.
4. Companion Cards with Correction, provenance, preview, and versioning.
5. Relationship experiments only after the workbench is independently useful.
