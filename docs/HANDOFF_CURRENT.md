# Deep Code current handoff

Updated: 2026-09-06
Branch: `codex/release-line-endings`  
Current packaged release candidate: `0.6.1-rc.3`
Current source version: `0.6.2` (release preparation; rc.3 product behavior unchanged)

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
- Beta.14 manual evidence confirmed that selecting DeepSeek repaired the stale route and reached a real request header. Its then-saved credential was rejected at the Provider boundary with `AUTH` / HTTP 401; Git state and runtime-context text were unrelated, and Harness recorded zero LLM milliseconds and zero token usage for the rejected request.
- All beta.15 acceptance checks passed after the same DeepSeek API Key was cleared and added again. This is consistent with a stale credential/adapter state being invalidated, but the exact cache owner is not proven and Deep Code still does not inspect or infer key contents.
- The model-dialog focus regression remained intermittent in beta.15. Beta.16 removes the Windows/Chromium native select popups from that dialog; a local packaged-app check switched focus to Explorer and back, then successfully selected a model and `Max` through app-owned controls.
- 砚星 manually accepted beta.16's focus-switch behavior. The affected native model and effort selects are retired.
- 砚星 manually accepted beta.17's attributable model-verification receipt: the selected route, terminal result, and persisted Provider history remain aligned.
- 砚星 confirmed all rc.3 acceptance checks passed, including Provider confirmation reset after selection changes, Key edits, and timeout. Do not ask for those checks again for this unchanged implementation.

Do not ask the user to recreate fake Providers or a no-`HEAD` repository merely to repeat these checks.

## Automated baseline

- `npm test`: 197 passed, 0 failed for v0.6.2, including LF and CRLF removal-handler contracts. The unmodified contract failed under CRLF in a focused local reproduction, matching the v0.6.1 Windows release job (196 passed, 1 failed). Only the test extraction was faulty; no runtime change was needed. PR and main-branch Windows tests now run before release.
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
- Model and reasoning-effort selection now use app-owned accessible radio-button groups rather than native select popups. Harness still supplies every displayed route and effort; Deep Code owns only the interaction surface.
- A dedicated connection-test task persists its requested Provider/model/effort. Only a terminal Harness turn whose `request/header` route matches that request can produce a persisted model-verification receipt; ordinary messages, catalog presence, credential presence, empty Session defaults, and route mismatches cannot.
- Retrying a dedicated connection test preserves its original explicit route instead of silently falling back to the current Session default.
- The matching Provider card shows the latest persisted receipt as historical evidence with its recorded time and an explicit warning that it proves only that past request, not permanent credential validity.
- Terminal Provider failures are projected into safe beginner-facing categories (authentication, quota, rate limit, unavailable model, network, or unknown) without exposing credential fragments. Runtime-context summaries remain readable by default; verbatim system and Skill payloads require a second explicit disclosure.
- Terminal tasks now receive one derived next-action projection. Its Renderer accepts only allowlisted action IDs; it cannot submit a prompt or invent execution state. Authentication routes to Model Services, network/wait failures may offer explicit retry, risky completed work opens the receipt first, and successful model verification can continue to a new task.
- The rc.1 portable artifact was launched in the real Windows desktop. A completed model-verification task displayed the next-action panel and `查看完整回执` navigated to the Harness-backed receipt without starting Engine or making a model request.
- Credential presence is now consistently labeled `已保存，尚未验证`, never `模型已准备好`. Saving a new Provider requires a second in-dialog click naming the exact Provider; changing the Provider or Key invalidates that confirmation. Deep Code still does not infer provider identity from secret text.
- The add-Provider confirmation is now owned by a tested Renderer state module instead of ad-hoc variables in `shell.js`. It accepts only Provider identity, never the API Key; changing Provider, editing the Key, expiry, and explicit reset all invalidate the pending confirmation.
- The rc.2 portable artifact was inspected in the real Windows desktop. It projected an existing authentication failure to Model Services without retry, displayed all four active Provider credentials as saved-but-unverified, named the selected dormant Provider in the add dialog, and was closed after restoring Engine to stopped. No credential was written and no model request was made.
- The rc.3 uncompressed test portable was built in an isolated candidate directory. Its packaged `app.asar` contains the new Provider provisioning state module and the updated Renderer files, and the unpacked packaged app remained running through an eight-second isolated-profile startup smoke test. No Engine or model task was started.
- Test-only portable packaging uses `compression=store`: a controlled comparison showed default NSIS compression remained silent past the stop threshold, while the uncompressed test artifact completed in about 26 seconds. Formal release packaging remains compressed.

## Current decisions

1. Provider identity comes from explicit Harness route selection, never API-key inference.
2. Catalog presence, Profile active state, credential configured state, and real-call verification are separate facts.
3. A task keeps its launch workspace; changing the new-task workspace never silently migrates an existing task.
4. Memory MVP is local and reviewable: Markdown is canonical, indexes are rebuildable, candidates do not affect replies before confirmation, and raw private transcripts are excluded by default.
5. Skills describe reusable procedures; they are not a substitute for durable project memory.

## Code health

- The execution boundary is reasonably clean: DSH Adapter, task outcome, work-receipt policy, model-service projection, task guidance, stores, and live-session handling are separate CommonJS modules with focused tests.
- The regression suite is fast and broad, and `pnpm audit --prod --audit-level high` currently reports no known production dependency vulnerabilities.
- The Renderer orchestration file is not clean enough for long-term growth: `src/renderer/shell.js` is about 2,304 lines and owns too many unrelated dialogs, pages, renderers, and event handlers. The first post-rc extraction moved Provider provisioning confirmation into `provider-provisioning-flow.cjs`; this improves ownership and testing but intentionally does not chase a smaller total line count. `src/main.cjs` is about 851 lines and should also continue losing domain logic to tested modules.
- Do not perform a broad refactor during v0.6.1 release hardening. After release, extract Model Services UI state and task conversation rendering first, preserving the existing IPC and Harness authority seams.

## Next bounded work

1. Complete v0.6.2 release delivery from the accepted rc.3 implementation; verify both Windows assets and their source revision. Preserve the unsuccessful v0.6.1 tag; do not rewrite it.
2. Add no retroactive receipt for pre-beta.17 verification tasks: they did not persist the structured requested route, so title or prompt inference would create false evidence.
3. Keep automatic memory extraction, automatic memory injection, automatic model routing, and companion-card prompt injection out of scope until the core task loop is stable.
4. After rc.3 acceptance, publish the unchanged product source as v0.6.2 Setup and portable artifacts with the cross-checkout test fix; do not add new product scope during release hardening.

## Known uncertainty

The earlier native-confirmation nesting was one confirmed focus trigger, but beta.15 showed that a native select popup could still become inert intermittently even after that nesting was removed. Beta.16 eliminates native selects only for the affected model/effort dialog. Provider and credential dialogs still use native selects; migrate those only if the same symptom is observed there, rather than rewriting every form speculatively.

## Privacy

This handoff contains project facts only. Do not paste API keys, raw private conversations, third-party personal material, or speculative personality claims into this file.
