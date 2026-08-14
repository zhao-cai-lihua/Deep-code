# Deep code architecture

## Product shape

Deep code is a narrow **Desktop Host** for DeepSeek Harness. The official Harness remains the agent runtime and source of truth for sessions, tools, approvals, plugins, and execution. Deep code owns only the beginner-facing shell around it.

```text
Deep code desktop shell
  |-- first-run and runtime health
  |-- safe-workspace and redacted-diagnostics helpers
  |-- companion-card library (local, inspectable)
  `-- future DSH Adapter (one normalized event stream)
          `-- official DeepSeek Harness runtime
```

## The seams

| Concern | Owner | Rule |
| --- | --- | --- |
| Agent loop, model calls, sessions, tool approvals | Official DeepSeek Harness | Deep code must not fork or silently override these. |
| Choosing and starting a local runtime | Deep code Host | Validate it is an official checkout; attach to an existing local web runtime where possible. |
| Runtime events and a future whale/status indicator | DSH Adapter | Normalize once, then render. No invented "thinking" state. |
| Companion-card library | Deep code | Local User Persona, Agent Character, and Interaction Style cards; user review and fixed safe schema. |
| Applying a reviewed card stack to Harness | Future adapter slice | Only on a new session, compiled through an upstream-supported preset/profile seam; never as a tool-permission patch. |

## Delivery slices

### v0.2: reliable host and local companion-card library

Runtime inspection, attach/start/stop behavior, safe workspaces, diagnostics, and local Companion Card management. A card stack combines a User Persona (how the user prefers to collaborate), an Agent Character (a user-selected expressive starting point), and an Interaction Style (research, teaching, play, or other session texture). Tool Profile stays outside the stack.

### v0.3: official configuration adapter

Compile a reviewed card stack into an upstream-supported per-agent preset/profile for a **new** Harness session. Show the exact generated text and offer rollback. This is where we verify DSH version compatibility before writing any configuration.

### v0.4: controlled interchange

Optional one-way, visibly lossy import drafts from SillyTavern CCv2/CCv3. Dynamic lore, regex, post-history instructions, extensions, assets, system prompts, and all permission-adjacent fields remain excluded unless a later reviewed model can represent them safely.

### Later, only after the adapter is real

Status whale, richer task/workspace UI, character/persona layers, relationship experiments, and a community catalogue. These must consume normalized real data; they cannot be a second agent runtime.
