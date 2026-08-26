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
- Write-only DeepSeek API Key setup through the official Harness Credentials store. Deep code never loads the previous value, keeps no app-side copy, and separates “credential saved” from “model call verified.”
- An explicit real-connection check that creates a visible, ordinary task, warns that a small number of tokens may be used, and never runs as a hidden background probe.
- Live Agent Activity from the official Harness mux stream, translated into task/tool progress without exposing private analysis or inventing a second execution history.
- A compact Current Run panel backed by one Run Projection: it shows the Session's current selected model, the latest Turn's active/waiting/completed state and confirmed tool/file evidence, and explicitly says when Harness has not provided token or cost usage.
- Task-scoped image drafts and the official `deepseek-v4-flash-vision-exp` route. Images leave the composer only after Harness accepts the prompt; failed submissions remain recoverable.
- In-workbench Decision Gates for one-shot tool approvals, plan reviews, and structured user questions. Deep code forwards the user's exact decision to Harness and never auto-approves on behalf of a Companion Card.
- Native selection of an existing project, or creation of a documented workspace under `Documents/Deep code Workspaces`.
- A one-click Project Brief that explains purpose, visible behavior, architecture, status, risks, and owner decisions for a non-programmer while separating confirmed facts from inference.
- Human-facing conversation that no longer mistakes Harness runtime injections for the user's words. Final answers stay readable; elapsed time, permission facts, changed files, tool outcomes, and exact evidence live in a default-collapsed Run Details drawer.
- Safe, structured Markdown for final answers, including headings, lists, quotes, code blocks, and tables. Model-authored HTML stays inert, remote images become visible placeholders instead of loading silently, and only explicit `http`/`https` links can leave the app.
- Expandable Tool Cards for the official Harness diff, terminal, file-read, search, and web presenters. Every presenter is normalized once by the DSH Adapter, so the interface can explain what happened without teaching the Renderer the Harness wire format.
- Runtime inspection and redacted diagnostic export.
- Save, inspect, combine, import, and export local-first Companion Card drafts: a User Persona, an Agent Character, and an Interaction Style. The current version does **not** apply them to Agent replies yet; the UI labels this plainly. Future application still cannot grant tools, permissions, network access, or workspace access.
- Preview the exact task and model-visible card text without changing Harness permissions.

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

Deep code deliberately does **not** rewrite Harness tool permissions, approval rules, plugins, or agent configuration. A Companion Card is not a tool profile, a skill, a prompt-injection channel, or a relationship-memory system. See [the architecture](docs/ARCHITECTURE.md), [the primary-workbench decision](docs/adr/0001-deep-code-is-the-primary-workbench.md), [the beginner-protection roadmap](docs/BEGINNER_PROTECTION_ROADMAP.md), [the official Harness plugin boundary research](docs/research/official-harness-plugin-development.md), [the community usability audit](docs/research/dsh-community-usability-audit.md), [the `colleague-skill` compatibility research](docs/research/colleague-skill-compatibility.md), and [Companion Card policy](docs/COMPANION_CARDS_POLICY.md).

## Project status

Early developer preview. Direct DSH sessions, WebSocket mux activity, queue state, incremental answer drafts, approvals, user questions, source-aware conversation projection, image prompts, safe Markdown, the first five presenter-specific Tool Cards, terminal outcome reconciliation, and the Current Run projection are real. Remaining presenter types, full Turn/Item history, authoritative usage/cost data, mode controls, syntax highlighting, and multi-session monitoring are not complete. Use it with a local Harness checkout you trust and start with a non-sensitive workspace. Deep code does not claim full Codex parity.

## License

[MIT](LICENSE). Copyright (c) 2026 Zhao Cai Lihua.
