# Deep Code current handoff

Updated: 2026-09-03  
Branch: `codex/v0.6.1-ui-clarity`  
Current local test build: `0.6.1-beta.10`

## Product truth

Deep Code is the beginner-facing desktop Workbench above the official local DeepSeek Harness Engine. Harness owns sessions, tools, permissions, providers, models, and execution truth. Deep Code normalizes and explains those facts; it must not create a second execution state.

## Human acceptance completed

砚星 confirmed these behaviors in the packaged application:

- GLM Provider selection no longer jumps to Anthropic; the configured GLM route can make a real model call.
- Erroneously created Anthropic, MiniMax, and MiniMax-CN Provider Profiles can be removed.
- Selecting a new workspace opens a blank new-task surface and new tasks use that workspace.
- An old task exposes its bound project and can switch the new-task workspace back to that project.
- The beta.9 Memory Inbox lifecycle passed manual acceptance: create, persist, confirm, reject, delete, and open-folder behavior are usable.

Do not ask the user to recreate fake Providers or a no-`HEAD` repository merely to repeat these checks.

## Automated baseline

- `npm test`: 167 passed, 0 failed for beta.10.
- Provider selection preserves the exact Harness route and verifies the same route after writing.
- Provider removal clears its CredentialRef, unsets only its exact Profile, and verifies it is no longer active.
- Provider removal confirmation no longer nests native `window.confirm` inside an HTML modal; it uses a ten-second in-dialog second click.
- A missing Git `HEAD` is labeled as workspace/Git evidence and explicitly separated from model connectivity.
- Each task remains bound to the workspace captured when its Engine Session began.
- Candidate memories require provenance, remain outside Engine prompts, and move cleanly into confirmed or rejected storage only after review.
- The local Memory Inbox exposes explicit create, confirm, reject, delete, and open-folder actions without exposing Store paths through its Renderer interface.
- Retrieval preview uses deterministic local matching, enforces global/current-project scope, explains matched terms, and reports that it neither called a model nor changed a prompt.

## Current decisions

1. Provider identity comes from explicit Harness route selection, never API-key inference.
2. Catalog presence, Profile active state, credential configured state, and real-call verification are separate facts.
3. A task keeps its launch workspace; changing the new-task workspace never silently migrates an existing task.
4. Memory MVP is local and reviewable: Markdown is canonical, indexes are rebuildable, candidates do not affect replies before confirmation, and raw private transcripts are excluded by default.
5. Skills describe reusable procedures; they are not a substitute for durable project memory.

## Next bounded work

1. Manually verify beta.10 retrieval preview: global memories may match across projects, current-project memories must not cross projects, and no task should be created or changed.
2. Add explicit per-match selection and a final prompt-impact preview before considering an opt-in task handoff.
3. Build a dedicated Model Service Manager that distinguishes catalog, saved, verified, and failed states.
4. Add a model-routing failure recovery card separate from Git/work-receipt evidence.
5. Keep automatic memory extraction out of scope until manual candidate review is proven useful.

## Known uncertainty

The beta.7 temporary unclickable Provider dialog was consistent with nested native/HTML modal focus contention, but the exact Windows timing was not reproduced headlessly. Beta.8 removes the structural precondition and locks that absence with a renderer contract test. If it recurs, capture the exact button state and whether `Esc`, mouse, or keyboard focus still works.

## Privacy

This handoff contains project facts only. Do not paste API keys, raw private conversations, third-party personal material, or speculative personality claims into this file.
