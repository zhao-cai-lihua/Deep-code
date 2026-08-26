# Deep code architecture

## Product shape

Deep code is the primary human-facing desktop Workbench above the official DeepSeek Harness Engine. Users do not leave Deep code to perform a task; the DSH UI is not opened or embedded. Harness remains the only execution truth.

```text
Deep code Workbench
  |-- Task conversation and project navigation
  |-- Explanation Layer
  |     |-- Project Brief
  |     |-- readable final answers and errors
  |     |-- Task Outcome Projection
  |     |-- Current Run Projection
  |     `-- expandable Run Details / Evidence Drawer
  |-- first-run setup and recovery
  |-- task-scoped image drafts and explicit attachment send
  |-- opt-in, read-only Ecosystem Discover
  |-- local Companion Cards
  `-- DSH Adapter
        |-- session.create / prompt / history / cancel
        |-- Conversation Projection
        |     |-- human messages vs injected runtime context
        |     |-- normalized official Tool Cards
        |     `-- permissions, changed files, activity, duration, evidence
        |-- Model Connection Snapshot
        |-- fixed, write-only credential actions
        |-- visible model-validation task
        |-- mux-stream Activity, incremental answer draft, queue and Decision Gates
        `-- next: remaining projections and multi-session monitoring
              `-- official DeepSeek Harness Engine
```

## Ownership

| Concern | Owner | Rule |
| --- | --- | --- |
| Tasks, navigation, human explanations, visible action feedback | Deep code | Every action must show working, success, or failure in the user's current context. |
| Sessions, model calls, tools, approvals, sandbox, modes, plugins | DSH Engine | Deep code reads and presents upstream truth; it never duplicates the decision logic. |
| Protocol and event vocabulary changes | DSH Adapter | Normalize once behind a version-aware seam. Renderer code must not call raw DSH endpoints. |
| Current task phase, effective model, active items, and evidence counts | Run Projection | Present one compact, read-only interface to every UI surface. Show unknown usage as unknown; never estimate token or money without an upstream fact. |
| Conversation transcript and run explanations | Conversation Projection | Classify `user/message` by its official `source`; keep human prompts and final answers in the transcript, move injected context into Run Details, and prefer official wrapped tool presenters over tool-name guesses. |
| Answer formatting | Safe Answer Markdown | Render a constrained Markdown subset with authored HTML disabled. Never create remote image requests, and route only explicit `http`/`https` links through the desktop host. |
| Long-answer reading behavior | Reading Runtime | Preserve the reader's position when they scroll upward, follow incremental output only near the bottom, expose an explicit jump-to-latest action, format elapsed time, and route deliberate copy actions through the desktop host. |
| Presenter-specific evidence | Tool Card | Normalize official diff, terminal, read, search, and web presenters behind one stable card contract. The Renderer consumes that contract and never parses Harness wire shapes. |
| Provider catalog and credential presence | DSH Adapter | Expose one human-facing Model Connection Snapshot. Credential reads are status-only; secret values never cross this seam. |
| DeepSeek credential changes | DSH Adapter | Accept a new value only for the fixed DeepSeek credential reference, pass it directly to the official Credentials RPC, scrub submitted values from errors, and return only saved/cleared status. The Renderer never knows raw credential RPC names or references. |
| Real model validation | Ordinary Engine Task | Create a visible task through the normal Workbench flow. It may consume tokens and must never be presented as a consequence-free background ping. |
| Live activity, draft answers, approvals, and questions | DSH Live Session | Consume the official downlink-only mux WebSocket, keep wire correlation private, expose only `text-delta` as an explicitly unfinished draft, normalize activity and waits once, and answer only through the official `/api/respond` carrier. Reasoning deltas never enter the conversation. Turn end replaces transient working phases; a durable idle snapshot clears them if the terminal frame was missed. Harness history remains the durable truth. |
| Optional in-process tools, Skill providers, observers, and LLM adapters | Harness bundle | Add a bundle only when the capability must run inside Harness. Installation is executable-code trust, not ordinary UI customization. |
| Technical support for an explanation | Run Details / Evidence Drawer | Show duration, permission facts, file changes, and operations first; preserve raw tool presenters and durable context one disclosure deeper. Never expose private reasoning traces. |
| Human completion summary | Task Outcome Projection | Project only terminal Engine state, confirmed changed files, explicit test/check/build commands, failed tools, and missing-verification warnings. Never infer success from assistant prose; link every summary back to Run Details evidence. |
| Unsent image selection | Image Draft Store | Keep selected image bytes in main-process memory under one Task scope, return only metadata, opaque draft ids, and a scoped `deep-code-image:` URL to the Renderer. The main process serves preview bytes on demand with no-store caching; it never returns source paths or base64 through IPC. Clear only after the official prompt is accepted. |
| Sent image ownership | DSH attachment seam | Submit image content only through official `session.prompt`; Harness validates and durably commits the attachment before logging the user message. Deep code projects the resulting immutable attachment facts instead of inventing a second media store. |
| Community discovery | Ecosystem Catalog | Disabled by default. When explicitly enabled, fetch only public GitHub `dsh-plugin` topic metadata, label stars as popularity rather than trust, and offer source inspection only. Never install, import, execute, activate, or modify profiles from discovery results. |
| Persona and interaction texture | Companion Cards | Current UI is an unapplied local experiment. When application is later implemented, it still receives no tool, shell, sandbox, approval, model-route, or system-policy authority. |

## Current vertical slice

Deep code can locate/start a local Engine, show a Model Connection Snapshot, write or clear the fixed DeepSeek credential through the official write-only seam, create an explicit visible validation task, bind a selected workspace to a real DSH session, send prompts, poll durable history, project human messages separately from injected runtime context, render safe structured Markdown, present official diff/terminal/read/search/web evidence as normalized Tool Cards, summarize terminal outcomes without trusting assistant self-report, and cancel an active turn. It also consumes the official mux stream for human-readable activity, unfinished answer text, queue counts, one-shot approvals, plan reviews, and structured user questions. Long answers preserve a reader who has scrolled upward, provide answer/code copy actions, and show elapsed time. Wire RPC ids and approval ids stay behind the DSH Live Session seam; the Renderer sends only a human action or structured answer.

The credential dialog is deliberately write-only: it always opens blank, never retrieves the previous secret, stores no Renderer-side copy, and reports “saved” separately from “validated.” Environment-provided or otherwise non-writable credentials are shown as status, not silently overridden.

The first live downlink slice deliberately excludes private analysis text. It translates only durable or host-owned facts such as turn boundaries, tool calls/results, pending approvals, pending questions and queue counts. Only `text-delta` becomes an explicitly unfinished answer; the durable history replaces it after commit. Durable history consumes the official `{ for, view }` presenter wrapper and normalizes diff, terminal, read, search, and web shapes behind one Tool Card interface; raw evidence remains available underneath. Remaining presenter types and projections, syntax highlighting, and multi-session background monitoring are not complete yet.

## Delivery order

1. Reliable first run, workspace selection, and Engine recovery.
2. Complete DSH Adapter: streaming, Decision Gates, errors, model/mode/permission visibility, resume.
3. Explanation Layer: project map, change impact, error recovery, and continuous brief.
4. Companion Cards with Correction, provenance, preview, and versioning.
5. Relationship experiments only after the workbench is independently useful.

Deep code itself remains an independent desktop product rather than a Harness plugin. See the [official plugin development boundary research](research/official-harness-plugin-development.md) for the pinned upstream contracts and adoption phases.
