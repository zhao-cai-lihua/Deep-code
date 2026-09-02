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
  |     |     `-- versioned Work Receipt Map projection
  |     |-- Current Run Projection
  |     `-- expandable Run Details / Evidence Drawer
  |-- first-run setup and recovery
  |-- task-scoped image drafts and explicit attachment send
  |-- opt-in Ecosystem Discover and guarded official-profile install
  `-- DSH Adapter
        |-- session.create / prompt / history / cancel
        |-- Conversation Projection
        |     |-- human messages vs injected runtime context
        |     |-- normalized official Tool Cards
        |     `-- permissions, changed files, activity, duration, evidence
        |-- Model Connection Snapshot
        |-- Explicit Model Selection Adapter
        |     |-- session-scoped advertised directory
        |     |-- preserve Harness defaults when no user choice exists
        |     |-- validate only advertised model / effort ids
        |     `-- requested selection vs Harness-effective route
        |-- Harness-declared, write-only simple API Key actions
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
| Explicit model choice | Model Router | A local, deterministic Module validates an explicit user selection against the detached Session directory. With no selection it returns no route change and preserves the Harness-owned model and effort. It performs no I/O, task-role inference, or model call. |
| Cross-provider model knowledge | Model Capability Registry | Merge Adapter-declared capabilities, exact user overrides, versioned curated family profiles, provider descriptions, and later eval evidence in that trust order. Unknown models remain manually selectable but are not silently promoted by name. |
| Actual model selection | DSH Model Adapter | Load `session.models`, submit complete selections through `session.selectModel`, and read the effective Session route back from Harness. An absent advisory catalog row never makes a still-routable current selection unusable. |
| Simple API-key provider setup | DSH Adapter | Derive the provider list from the current Harness directory, accept only the small reviewed catalog whose settings expose a simple API-key profile, create that profile through the official Settings RPC, and pass the submitted value directly to the official Credentials RPC. Submitted values are scrubbed from errors and never returned to the Renderer. OAuth and complex provider authentication remain outside this Interface. |
| Real model validation | Ordinary Engine Task | Create a visible task through the normal Workbench flow. It may consume tokens and must never be presented as a consequence-free background ping. |
| Live activity, draft answers, approvals, and questions | DSH Live Session | Consume the official downlink-only mux WebSocket, keep wire correlation private, expose only `text-delta` as an explicitly unfinished draft, normalize activity and waits once, and answer only through the official `/api/respond` carrier. Reasoning deltas never enter the conversation. An unresolved Decision Gate pauses Renderer polling so the form remains interactive; after five minutes it ends the turn without inventing an answer and records an explicit recovery. Harness history remains the durable truth. |
| Optional in-process tools, Skill providers, observers, and LLM adapters | Harness bundle | Add a bundle only when the capability must run inside Harness. Installation is executable-code trust, not ordinary UI customization. |
| Technical support for an explanation | Run Details / Evidence Drawer | Show duration, permission facts, file changes, and operations first; preserve raw tool presenters and durable context one disclosure deeper. Never expose private reasoning traces. |
| Human completion summary | Task Outcome + Recovery Projection | Project only terminal Engine state, confirmed changed files, explicit test/check/build commands, failed tools, and missing-verification warnings. Explain cause, impact, safety state, and the next human action. Never infer success from assistant prose; link every summary back to Run Details evidence. |
| Beginner change-risk explanation | Work Receipt Policy | Deterministically classify confirmed paths and operations for dependency, automation, permission, persistence, deletion, and unusually broad changes. Return human risk explanations, verification gaps, and rollback uncertainty through one small Interface. It never reads files, runs tools, or changes Harness state. |
| Visual work receipt | Outcome Map Projection | Convert that same completion summary into a small versioned graph IR containing result, confirmed changes, verification, open cautions, and next action. The map is a visual projection, not a second execution truth. An optional future Archify Adapter may enrich the explanation but cannot replace Harness evidence. |
| Unsent image selection | Image Draft Store | Keep selected image bytes in main-process memory under one Task scope, return only metadata, opaque draft ids, and a scoped `deep-code-image:` URL to the Renderer. The main process serves preview bytes on demand with no-store caching; it never returns source paths or base64 through IPC. Clear only after the official prompt is accepted. |
| Sent image ownership | DSH attachment seam | Submit image content only through official `session.prompt`; Harness validates and durably commits the attachment before logging the user message. Deep code projects the resulting immutable attachment facts instead of inventing a second media store. |
| Community discovery and install | Ecosystem Catalog + Plugin Installer | Disabled by default. Remote command text is inert. Before installation, read the root manifest and patch through GitHub's API, require `dsh.bundle.patch`, pin a 40-character commit, issue a one-use token, disclose out-of-sandbox build risk, and require confirmation. Only the main process invokes the official CLI with fixed argv and `shell:false`, targeting the official `web` profile used by the managed Engine. |

## Current vertical slice

Deep code can locate/start a local Engine, show a Model Connection Snapshot, configure reviewed simple API-key providers through the official Settings and Credentials seams, create an explicit visible validation task, bind a selected workspace to a real DSH session, send prompts, poll durable history, project human messages separately from injected runtime context, render safe structured Markdown, present official diff/terminal/read/search/web evidence as normalized Tool Cards, summarize terminal outcomes without trusting assistant self-report, and cancel an active turn. Before a text prompt, its local Model Router validates only an explicit user choice against the advertised Session directory; without one, Harness keeps ownership of the current model and effort. It also consumes the official mux stream for human-readable activity, unfinished answer text, queue counts, one-shot approvals, plan reviews, and structured user questions. Long answers preserve a reader who has scrolled upward, provide answer/code copy actions, and show elapsed time. Wire RPC ids and approval ids stay behind the DSH Live Session seam; the Renderer sends only a human action or structured answer.

The credential dialog is deliberately write-only: it always opens blank, never retrieves the previous secret, stores no Renderer-side copy, and reports “saved” separately from “validated.” Environment-provided or otherwise non-writable credentials are shown as status, not silently overridden.

The first live downlink slice deliberately excludes private analysis text. It translates only durable or host-owned facts such as turn boundaries, tool calls/results, pending approvals, pending questions and queue counts. Only `text-delta` becomes an explicitly unfinished answer; the durable history replaces it after commit. Durable history consumes the official `{ for, view }` presenter wrapper and normalizes diff, terminal, read, search, and web shapes behind one Tool Card interface; raw evidence remains available underneath. Remaining presenter types and projections, syntax highlighting, and multi-session background monitoring are not complete yet.

## Delivery order

1. Reliable first run, workspace selection, and Engine recovery.
2. Complete DSH Adapter: streaming, Decision Gates, errors, model/mode/permission visibility, resume.
3. Explanation Layer: project map, change impact, error recovery, and continuous brief.
4. Recoverable extension management: installed list, explicit restart state, uninstall, and profile rollback evidence.
5. Optional interaction-style experiments only after the workbench is independently useful and without adding execution authority.

Deep code itself remains an independent desktop product rather than a Harness plugin. See the [official plugin development boundary research](research/official-harness-plugin-development.md) for the pinned upstream contracts and adoption phases.
