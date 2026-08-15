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
- Native selection of an existing project, or creation of a documented workspace under `Documents/Deep code Workspaces`.
- A one-click Project Brief that explains purpose, visible behavior, architecture, status, risks, and owner decisions for a non-programmer while separating confirmed facts from inference.
- Human-facing conversation plus an expandable Evidence Drawer for raw tool presenter data.
- Runtime inspection and redacted diagnostic export.
- Save, inspect, combine, import, and export local-first Companion Cards: a User Persona, an Agent Character, and an Interaction Style. Cards can make an agent relationship feel personal, but cannot grant tools, permissions, network access, or workspace access.
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

Deep code deliberately does **not** rewrite Harness tool permissions, approval rules, plugins, or agent configuration. A Companion Card is not a tool profile, a skill, a prompt-injection channel, or a relationship-memory system. See [the architecture](docs/ARCHITECTURE.md), [the primary-workbench decision](docs/adr/0001-deep-code-is-the-primary-workbench.md), [the beginner-protection roadmap](docs/BEGINNER_PROTECTION_ROADMAP.md), [the `colleague-skill` compatibility research](docs/research/colleague-skill-compatibility.md), and [Companion Card policy](docs/COMPANION_CARDS_POLICY.md).

## Project status

Early developer preview. The first direct DSH session slice is real, but live WebSocket downlinks for approvals, user questions, queue state, incremental chunks, and projections are not yet adapted. Use it with a local Harness checkout you trust and start with a non-sensitive workspace. Deep code must complete those Decision Gates before it can responsibly claim full Codex-like parity.

## License

[MIT](LICENSE). Copyright (c) 2026 Zhao Cai Lihua.
