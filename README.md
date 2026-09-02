# Deep code

**Deep code** is a beginner-friendly desktop Agent Workbench powered by the official [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) developer preview. Harness stays hidden as the execution Engine; Deep code is the human-facing product for projects, tasks, explanations, setup, and recovery.

It is an independent community client, **not** an official DeepSeek product. It does not fork the upstream Agent Loop or permission system.

## Download for Windows

Normal users do **not** need to clone the repository or run pnpm. Open [GitHub Releases](https://github.com/zhao-cai-lihua/Deep-code/releases/latest), then download one of these files:

- `Deep.code.Setup.x.y.z.exe` — recommended installer; GitHub normalizes spaces in the built filename to dots.
- `Deep.code.x.y.z.exe` — portable app; no installation required.

The GitHub web page cannot browse arbitrary local folders. Run the downloaded Deep code desktop app; its first-run guide opens the native Windows folder picker, can detect an existing official Harness, or can prepare one under `Documents/Deep code Runtime`.

## What works now

- A Codex-inspired task Workbench that directly creates real DSH sessions, sends prompts, reads durable history, supports follow-up messages, and cancels an active turn without opening the official Harness UI.
- A first-run desktop guide whose detection, install, and workspace buttons always show working, success, or failure state.
- Automatic detection or preparation of the official Engine, while keeping its path in a recovery-only settings area.
- A Model Connection panel that distinguishes Engine status, active providers, available models, missing credentials, and provider failures without reading or displaying API Key values.
- Write-only API Key setup for providers whose active Harness settings explicitly declare a simple `apiKeyEnv`. Deep code never guesses credential names, loads previous values, or keeps an app-side copy; OAuth and complex authentication remain with their provider-specific setup.
- An explicit real-connection check that creates a visible, ordinary task, warns that a small number of tokens may be used, and never runs as a hidden background probe.
- Live Agent Activity from the official Harness mux stream, translated into task/tool progress without exposing private analysis or inventing a second execution history.
- A fixed left task rail backed by one Run Projection: workspace controls, current selected model, active/waiting/completed state, plain-language outcome, and confirmed tool/file evidence stay in view while the conversation scrolls. Missing token or cost usage is stated rather than estimated.
- Explicit model and reasoning-effort controls backed by the current Harness catalog. With no manual choice Deep code preserves the Session model and effort; it never infers a task role or silently raises cost. The sidebar distinguishes the requested selection from the model/effort confirmed by the latest `request/header`.
- Task-scoped image drafts sent through the current or explicitly selected Harness model. Deep code does not silently switch models for images; unsupported-image failures keep drafts recoverable and explain how to choose a compatible model.
- In-workbench Decision Gates for one-shot tool approvals, plan reviews, and structured user questions. Deep code forwards the user's exact decision to Harness and never invents approval.
- Stable Decision Gates stay at the bottom of the relevant conversation instead of being rebuilt by background polling. A five-minute unanswered wait stops that turn, records that it was waiting for the user, and offers an explicit recovery path.
- Native selection of an existing project, or creation of a documented workspace under `Documents/Deep code Workspaces`.
- A one-click Project Brief that explains purpose, visible behavior, architecture, status, risks, and owner decisions for a non-programmer while separating confirmed facts from inference.
- Separate Conversation and Trace views over the same Harness evidence. Conversation no longer mistakes runtime injections for the user's words or lets Tool Cards split the final answer; Trace holds elapsed time, permission facts, changed files, tool outcomes, and exact evidence.
- Safe, structured Markdown for final answers, including headings, lists, quotes, code blocks, and tables. Model-authored HTML stays inert, remote images become visible placeholders instead of loading silently, and only explicit `http`/`https` links can leave the app.
- Expandable Tool Cards for the official Harness diff, terminal, file-read, search, and web presenters. Every presenter is normalized once by the DSH Adapter, so the interface can explain what happened without teaching the Renderer the Harness wire format.
- Runtime inspection and redacted diagnostic export.
- Opt-in ecosystem discovery with real, guarded installation: Deep code statically verifies a root `dsh.bundle.patch`, pins the exact Git commit, explains that Git preparation code may run outside the Agent sandbox, asks again, and then delegates installation to the official DSH CLI in the official `web` profile used by the managed Engine.
- Preview an exact task-only handoff note without changing Harness permissions. The earlier unapplied Companion Card experiment has been removed from the product and runtime bridge; upgrades do not delete existing local card JSON, so no user-authored draft is destroyed.

## Developer setup

The following steps are for contributors building from source. Regular users should install a file from Releases.

1. Git, Node.js, and pnpm installed on Windows.
2. An official Harness checkout prepared according to its upstream documentation.
3. Install the desktop host dependencies:

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm start
```

To create a Windows installer and portable executable:

```powershell
pnpm package:win
```

## Product boundary

Deep code deliberately does **not** rewrite Harness tool permissions, approval rules, or the Agent Loop. Its optional plugin installer delegates to the official profile mechanism and never treats catalog text as a command. See [the architecture](docs/ARCHITECTURE.md), [the primary-workbench decision](docs/adr/0001-deep-code-is-the-primary-workbench.md), [the beginner-protection roadmap](docs/BEGINNER_PROTECTION_ROADMAP.md), [the official Harness plugin boundary research](docs/research/official-harness-plugin-development.md), [the DSH Desktop UI and ecosystem audit](docs/research/dsh-desktop-ui-ecosystem-audit-2026-08-27.md), and [the community usability audit](docs/research/dsh-community-usability-audit.md). The archived [Companion Card policy](docs/COMPANION_CARDS_POLICY.md) remains as design history, not a current feature promise.

## Project status

Early developer preview. Direct DSH sessions, WebSocket mux activity, queue state, incremental answer drafts, approvals, user questions, source-aware Conversation/Trace projections, image prompts, safe Markdown, the first five presenter-specific Tool Cards, terminal outcome reconciliation, explicit Session model selection, and the current Run/Outcome projections are real. Deep code can add simple API-key providers only when the current Harness provider directory exposes a supported profile and writable settings; custom OpenAI-compatible endpoints, OAuth providers, editable capability profiles, remaining presenter types, a full official-style Turn/Item timeline, authoritative usage/cost data, syntax highlighting, and multi-session monitoring are not complete. With no explicit model choice, Deep code preserves the Harness model and effort instead of routing automatically. Use it with a local Harness checkout you trust and start with a non-sensitive workspace. Deep code does not claim full Codex parity.

## License

[MIT](LICENSE). Copyright (c) 2026 Zhao Cai Lihua.
