# Deep Code current handoff

Updated: 2026-09-04
Branch: `codex/v0.6.1-ui-clarity`  
Current packaged test build: `0.6.1-beta.14`
Current source version: `0.6.1-beta.14`

## Product truth

Deep Code is the beginner-facing desktop Workbench above the official local DeepSeek Harness Engine. Harness owns sessions, tools, permissions, providers, models, and execution truth. Deep Code normalizes and explains those facts; it must not create a second execution state.

## Human acceptance completed

砚星 confirmed these behaviors in the packaged application:

- GLM Provider selection no longer jumps to Anthropic; the configured GLM route can make a real model call.
- Erroneously created Anthropic, MiniMax, and MiniMax-CN Provider Profiles can be removed.
- Selecting a new workspace opens a blank new-task surface and new tasks use that workspace.
- An old task exposes its bound project and can switch the new-task workspace back to that project.
- The beta.9 Memory Inbox lifecycle passed manual acceptance: create, persist, confirm, reject, delete, and open-folder behavior are usable.
- The beta.10 retrieval preview passed manual acceptance: scope filtering held, preview caused no model call, and no task was created or changed.
- The beta.11 selection and exact-context preview passed manual acceptance, including deselection and stale-query invalidation; memory remains disconnected from Harness prompts.
- The beta.12 Model Service Manager passed its general manual checks, but its generic connection-test action exposed a route-attribution defect: a failed preflight could later display an empty Session's default Claude route. Beta.13 replaces that generic action with explicit per-Provider verification.
- Beta.13 correctly stopped attributing an unsubmitted Session default as a successful verification, but manual GLM and DeepSeek tests revealed that an unroutable stale Session default prevented even an explicit replacement route from being selected. Ordinary tasks were blocked by the same cause. Beta.14 follows the official Harness contract: an explicit advertised selection may repair the Session through `session.selectModel` before prompting.

Do not ask the user to recreate fake Providers or a no-`HEAD` repository merely to repeat these checks.

## Automated baseline

- `npm test`: 175 passed, 0 failed for beta.14.
- Provider selection preserves the exact Harness route and verifies the same route after writing.
- Provider removal clears its CredentialRef, unsets only its exact Profile, and verifies it is no longer active.
- Provider removal confirmation no longer nests native `window.confirm` inside an HTML modal; it uses a ten-second in-dialog second click.
- A missing Git `HEAD` is labeled as workspace/Git evidence and explicitly separated from model connectivity.
- Each task remains bound to the workspace captured when its Engine Session began.
- Candidate memories require provenance, remain outside Engine prompts, and move cleanly into confirmed or rejected storage only after review.
- The local Memory Inbox exposes explicit create, confirm, reject, delete, and open-folder actions without exposing Store paths through its Renderer interface.
- Retrieval preview uses deterministic local matching, enforces global/current-project scope, explains matched terms, and reports that it neither called a model nor changed a prompt.
- Selected retrieval matches are revalidated against current Store state and project scope before a bounded, exact context preview is composed; the preview remains disconnected from Harness.
- The Model Service Manager projects Provider activation, catalog presence, credential state, attributable verification, and current-task routing as separate facts.
- A connection-test task requires an explicit Provider and model, launches with that exact manual route, preserves launch failure as failure, and never treats an unsubmitted Session's default route as evidence that a model was used.
- A stale unroutable current route blocks preserving that default, but does not block an explicit replacement from the Harness catalog; Harness remains responsible for accepting or rejecting the replacement through `session.selectModel`.
- Connection verification no longer nests a Windows native confirmation over the HTML model dialog. Its token/call warning lives in the same dialog, avoiding the reproduced modal-focus failure that could leave model and effort selectors inert until the app regained focus.
- Test-only portable packaging uses `compression=store`: a controlled comparison showed default NSIS compression remained silent past the stop threshold, while the uncompressed test artifact completed in about 26 seconds. Formal release packaging remains compressed.

## Current decisions

1. Provider identity comes from explicit Harness route selection, never API-key inference.
2. Catalog presence, Profile active state, credential configured state, and real-call verification are separate facts.
3. A task keeps its launch workspace; changing the new-task workspace never silently migrates an existing task.
4. Memory MVP is local and reviewable: Markdown is canonical, indexes are rebuildable, candidates do not affect replies before confirmation, and raw private transcripts are excluded by default.
5. Skills describe reusable procedures; they are not a substitute for durable project memory.

## Next bounded work

1. Manually verify beta.14 by selecting a real GLM or DeepSeek model and sending one ordinary message; an obsolete unroutable Session default must not prevent the explicit replacement.
2. From the same Provider card choose `验证这个服务…`, select a model and effort, and confirm that the dedicated task completes on that exact route without a second native confirmation dialog.
3. After any deliberate or incidental task failure, reopen the model-and-effort dialog and confirm both selectors remain interactive without switching windows.
4. Persist a bounded verification receipt only when a dedicated connection-test task has terminal Harness evidence and an attributable effective route.
5. Keep automatic memory extraction and automatic memory injection out of scope.

## Known uncertainty

The beta.7 temporary unclickable Provider dialog and beta.13 model-selector focus loss shared the same structural trigger: a Windows native confirmation invoked from an HTML modal flow. Both paths now remove that nesting and lock the absence with renderer contract tests. Native confirmations still exist in unrelated non-modal actions; migrate them only if their own focus failure is observed.

## Privacy

This handoff contains project facts only. Do not paste API keys, raw private conversations, third-party personal material, or speculative personality claims into this file.
