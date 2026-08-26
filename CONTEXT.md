# Deep code

Deep code is the human-facing desktop product above a local agent engine. This language keeps product interaction, execution truth, and explanatory interpretation separate.

## Product

**Workbench**:
The only normal user-facing surface for starting, following, and continuing work.
_Avoid_: Launcher, host setup, handoff screen

**Task**:
A user intention and its continuing conversation, bound to one Engine Session when execution begins.
_Avoid_: Local draft, prompt record

**Project Brief**:
A beginner-facing explanation of a project's purpose, visible behavior, structure, state, risks, and owner decisions, with facts separated from inference.
_Avoid_: Repository summary, code dump

**Evidence Drawer**:
The expandable technical record supporting a human-facing explanation.
_Avoid_: Debug log, reasoning trace

## Execution

**Engine**:
The hidden official DeepSeek Harness runtime that owns sessions, tools, approvals, permissions, models, and execution truth.
_Avoid_: Official Harness window, backend UI

**Engine Session**:
The durable Harness session bound to a Deep code Task.
_Avoid_: Local task, chat cache

**Decision Gate**:
A real Engine approval or user question translated into consequences and choices without changing its authority.
_Avoid_: Deep code permission, friendly confirmation

**Live Session**:
The transient, generation-scoped view of one Engine Session's official mux stream: observable activity and still-answerable Decision Gates. Disconnect clears it; Harness replay restores truth.
_Avoid_: Local event log, approval cache, hidden reasoning stream

**Agent Activity**:
A human-readable projection of real Engine events such as turn boundaries and tool calls. It never infers thoughts and never renders private analysis.
_Avoid_: Chain of thought, fake progress animation

**Conversation Projection**:
The DSH Adapter output that separates human-authored prompts and final answers from injected runtime context, then translates official tool presenters into permission, file-change, activity, duration, and evidence facts.
_Avoid_: Chat filter, regex cleanup, second execution log

**Tool Card**:
An expandable, normalized projection of one official Harness tool presenter. It shows the useful diff, command result, file excerpt, search result, or web evidence while keeping the original presenter as auditable evidence.
_Avoid_: Raw log line, guessed tool summary, permission decision

**Safe Answer Markdown**:
The constrained rendering contract for model answers: useful text structure is preserved, authored HTML cannot execute, remote images do not load, and outbound links pass through the desktop host's `http`/`https` allowlist.
_Avoid_: Browser page, unrestricted HTML, ambient network content

**Run Details**:
The default-collapsed human summary below a response: elapsed time, confirmed permissions, changed files, and tool outcomes. Exact runtime context and raw presenter evidence sit one disclosure deeper.
_Avoid_: Thinking, chain of thought, debug dump

**Model Connection Snapshot**:
A human-facing summary of the Engine's active providers, available model catalog, credential presence, and provider failures. Its read path never contains a credential value and does not prove a model call succeeded.
_Avoid_: API Key record, provider settings mirror

**Credential Action**:
A fixed, write-only request to save or clear the DeepSeek credential through the Engine's official Credentials store. It returns status, never the secret or an app-side copy.
_Avoid_: Credential editor, secret settings mirror

**Model Validation Task**:
An explicit, visible Engine Task that performs a minimal real model call after warning that tokens may be used.
_Avoid_: Hidden ping, free connection check

## Companion layer

**Companion Card**:
A local, inspectable description of user preferences, agent character, or interaction style that cannot grant tools or permissions. In the current version it is saved and previewed but not applied to Agent replies.
_Avoid_: Agent configuration, permission preset

**Correction**:
A versioned, source-linked adjustment to a Character that preserves why the adjustment exists instead of silently rewriting its base description.
_Avoid_: Personality patch, hidden memory
