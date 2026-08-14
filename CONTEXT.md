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

## Companion layer

**Companion Card**:
A local, inspectable description of user preferences, agent character, or interaction style that cannot grant tools or permissions.
_Avoid_: Agent configuration, permission preset

**Correction**:
A versioned, source-linked adjustment to a Character that preserves why the adjustment exists instead of silently rewriting its base description.
_Avoid_: Personality patch, hidden memory
