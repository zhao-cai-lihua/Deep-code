# Deep Code current handoff

Updated: 2026-09-03  
Branch: `codex/v0.6.1-ui-clarity`  
Current local test build: `0.6.1-beta.8`

## Product truth

Deep Code is the beginner-facing desktop Workbench above the official local DeepSeek Harness Engine. Harness owns sessions, tools, permissions, providers, models, and execution truth. Deep Code normalizes and explains those facts; it must not create a second execution state.

## Human acceptance completed

砚星 confirmed these behaviors in the packaged application:

- GLM Provider selection no longer jumps to Anthropic; the configured GLM route can make a real model call.
- Erroneously created Anthropic, MiniMax, and MiniMax-CN Provider Profiles can be removed.
- Selecting a new workspace opens a blank new-task surface and new tasks use that workspace.
- An old task exposes its bound project and can switch the new-task workspace back to that project.

Do not ask the user to recreate fake Providers or a no-`HEAD` repository merely to repeat these checks.

## Automated baseline

- `npm test`: 161 passed, 0 failed on the current branch (beta.8 plus the memory Store slice).
- Provider selection preserves the exact Harness route and verifies the same route after writing.
- Provider removal clears its CredentialRef, unsets only its exact Profile, and verifies it is no longer active.
- Provider removal confirmation no longer nests native `window.confirm` inside an HTML modal; it uses a ten-second in-dialog second click.
- A missing Git `HEAD` is labeled as workspace/Git evidence and explicitly separated from model connectivity.
- Each task remains bound to the workspace captured when its Engine Session began.
- Candidate memories require provenance, remain outside Engine prompts, and move cleanly into confirmed or rejected storage only after review.

## Current decisions

1. Provider identity comes from explicit Harness route selection, never API-key inference.
2. Catalog presence, Profile active state, credential configured state, and real-call verification are separate facts.
3. A task keeps its launch workspace; changing the new-task workspace never silently migrates an existing task.
4. Memory MVP is local and reviewable: Markdown is canonical, indexes are rebuildable, candidates do not affect replies before confirmation, and raw private transcripts are excluded by default.
5. Skills describe reusable procedures; they are not a substitute for durable project memory.

## Next bounded work

1. Add a user-visible memory inbox over the tested local Store; keep candidate creation explicit and do not connect candidates to Engine prompts.
2. Add review, rejection, deletion, and scope controls before any confirmed memory can influence a new task.
3. Build a dedicated Model Service Manager that distinguishes catalog, saved, verified, and failed states.
4. Add a model-routing failure recovery card separate from Git/work-receipt evidence.
5. Package a new test build only when the next user-visible slice is ready.

## Known uncertainty

The beta.7 temporary unclickable Provider dialog was consistent with nested native/HTML modal focus contention, but the exact Windows timing was not reproduced headlessly. Beta.8 removes the structural precondition and locks that absence with a renderer contract test. If it recurs, capture the exact button state and whether `Esc`, mouse, or keyboard focus still works.

## Privacy

This handoff contains project facts only. Do not paste API keys, raw private conversations, third-party personal material, or speculative personality claims into this file.
