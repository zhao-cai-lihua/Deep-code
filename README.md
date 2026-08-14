# Deep code

**Deep code** is a beginner-friendly, local-first desktop host around the official [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) developer preview. It makes first launch, runtime checks, safe workspaces, diagnostics, and later reply-mode management easier to understand without forking the upstream agent loop.

It is an independent community desktop host, **not** an official DeepSeek client and not a replacement for DeepSeek Harness.

## Download for Windows

Normal users do **not** need to clone the repository or run pnpm. Open [GitHub Releases](https://github.com/zhao-cai-lihua/Deep-code/releases/latest), then download one of these files:

- `Deep.code.Setup.x.y.z.exe` — recommended installer; GitHub normalizes spaces in the built filename to dots.
- `Deep.code.x.y.z.exe` — portable app; no installation required.

The GitHub web page cannot browse arbitrary local folders. Run the downloaded Deep code desktop app; its first-run guide opens the native Windows folder picker, can detect an existing official Harness, or can prepare one under `Documents/Deep code Runtime`.

## What works now

- A Codex-inspired desktop workbench with a local task sidebar, task intent canvas, and a clear handoff into the official Harness window.
- A first-run desktop guide that detects or prepares the official Runtime and initializes a documented workspace.
- Select an official `deepseek-harness` checkout and launch its documented `pnpm dsh web` command.
- Connect to an already-running local Harness rather than starting a competing copy, then open it in a separate work window without replacing the Deep code workbench.
- Explain missing runtime pieces, create a safe workspace under `Documents/DSH Workspaces`, and export a redacted diagnostic report.
- Save, inspect, combine, import, and export local-first Companion Cards: a User Persona, an Agent Character, and an Interaction Style. Cards can make an agent relationship feel personal, but cannot grant tools, permissions, network access, or workspace access.
- Preview the exact task and model-visible card text intended for a future new-session handoff, without sending it or changing Harness permissions.

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

Deep code deliberately does **not** rewrite Harness tool permissions, approval rules, plugins, or agent configuration. A Companion Card is not a tool profile, a skill, a prompt-injection channel, or a relationship-memory system. See [the architecture](docs/ARCHITECTURE.md) and [Companion Card policy](docs/COMPANION_CARDS_POLICY.md).

## Project status

Early developer preview. The workbench currently stores task intent locally; it is not yet a replacement chat/session client for Harness. Use it with a local Harness checkout you trust. Before making it the default work surface, test it on a non-sensitive workspace and keep upstream Harness updated intentionally.

## License

[MIT](LICENSE). Copyright (c) 2026 Zhao Cai Lihua.
