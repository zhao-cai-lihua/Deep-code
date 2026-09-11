# Deep Code current handoff

Updated: 2026-09-11
Branch: `main`
Current packaged stable release: `0.6.3`
Current packaged prerelease: `0.7.0-rc.1`
Current source version: `0.7.0-rc.1`

Post-stable development baseline: PR #8 merged at `65fb75fcb7b9d4b058e10add30aa1d30760f238f`, PR #9 merged at `1258c5138b1b2b88070ce04b702ca6208320b053`, PR #10 merged at `ac72768e6939f1ad2b72183fd6660ba5585f72bb`, and PR #11 merged at `8ad48f3698e5569732dfb062511cbda990b7ca07`. Model Services, conversation, compact task evidence/receipt presentation, and projection-integrity corrections are on `main`; this is not yet a stable v0.7.0 release.

The current `main` applies the zero-token task-state fixture verdict to the existing Evidence view without changing Engine, Session, Provider, model routing, permission, or file-change truth.

PR #11 closed the fixed-point `v0.6.3...main` Standards/Spec review findings without changing execution truth. The v0.7.0-rc.1 source preparation is merged on `main` through PR #12.

## Release delivery

- v0.7.0-rc.1 promotes the merged Evidence Gate presentation milestone to a prerelease for bounded, zero-token manual acceptance: https://github.com/zhao-cai-lihua/Deep-code/releases/tag/v0.7.0-rc.1. PR #12 merged at `901563870722e323bac14221d27f05be74584acf`; PR regression run `34572725323`, main regression run `34572856103`, and Windows release run `34572876143` all passed 275 tests. It is not stable until the four UI checks in `docs/releases/v0.7.0-rc.1.md` pass.
- `Deep.code.0.7.0-rc.1.exe`: 100,567,775 bytes; GitHub SHA-256 `68809b199a32251d9a7b829ebff3afa25380b8dd5da2d7fde8939d45e276d9a8`.
- `Deep.code.Setup.0.7.0-rc.1.exe`: 100,791,174 bytes; GitHub SHA-256 `5bc8c88adaa23dc68f4696a6b580defcdafc00273fec63c8212331bbe9b4f8c5`.
- `SHA256SUMS.txt`: 190 bytes; GitHub SHA-256 `57a1c793dea8942dc260aae27e22aaf29d2fa7e7d4908a92c20430295b05835e`.
- v0.7.0-rc.1 preparation `npm test` passed all 275 tests and `npm run package:test:win` produced `dist/Deep-code-Test-0.7.0-rc.1.exe`, 368,793,608 bytes, local SHA-256 `e340ed94021340b3a16a2c61cbf25f867daa7e50401f615cc0f8f413aee1baf9`. The tag release must rebuild compressed installer and portable assets from the merged preparation commit.
- v0.6.3 was merged through non-draft PR #7 at commit `4f39c49b4473b4cdafa0e36a72adbabe6def3645` and published as a non-draft, non-prerelease stable release on 2026-09-10: https://github.com/zhao-cai-lihua/Deep-code/releases/tag/v0.6.3. PR workflow run `34448582136`, main workflow run `34448711490`, and Windows release workflow run `34448811058` all completed successfully. The release run repeated 259 tests, tag/version validation, compressed Windows packaging, checksum generation, and asset publication.
- `Deep.code.0.6.3.exe`: 100,565,316 bytes; GitHub SHA-256 `7e72d02a09a0fdd72217a5cb992a57cd0dd0dfcba2ccff58b20eaea73bf774ee`.
- `Deep.code.Setup.0.6.3.exe`: 100,788,726 bytes; GitHub SHA-256 `287f0959323dd15373ae0dae01782d203350ee99ba3116ffe1b0668668c7ca3a`.
- `SHA256SUMS.txt`: 180 bytes; GitHub SHA-256 `5949c476b03c038138cffc0c8f7ba9607747ecd335dd6df730b516149c7b0e08`.
- Stable v0.6.3 contains no `src/` or `test/` change after the manually accepted rc.6 tag. The version-only release preparation and merge commit are the only later source-history steps.
- 砚星 completed the final zero-token rc.6 acceptance on 2026-09-10. Task A and Task B retained separate unsent drafts, and returning to a task restored only that task's draft. This closes the last manual release gate without a Provider call or token cost.
- v0.6.3-rc.6 was published as a non-draft prerelease on 2026-09-09: https://github.com/zhao-cai-lihua/Deep-code/releases/tag/v0.6.3-rc.6. Release workflow run `34357772354` completed successfully after 259 tests, tag/version validation, Windows installer/portable packaging, checksum generation, and asset publication.
- `Deep.code.0.6.3-rc.6.exe`: 100,565,188 bytes; GitHub SHA-256 `58a0fa73ad48b95f7008157ecf4936aef0a246a032a3ab59df0f750cde6fdfc8`.
- `Deep.code.Setup.0.6.3-rc.6.exe`: 100,788,623 bytes; GitHub SHA-256 `d71360ed75b874ec7948d5bb3630890e88f9dd5edc4c157bfa709ccdfee18f47`.
- `SHA256SUMS.txt`: 190 bytes; GitHub SHA-256 `3c6c59a5cf75afcd99642a0155b2ab299660863c27b0ce13ec96ab49b209279e`.
- rc.6 is the narrow acceptance correction after rc.5. It gives each task and the blank new-task surface an isolated in-memory composer draft, clears only the successfully submitted scope, and separates a yellow “stop still awaiting Harness confirmation” state from a terminally confirmed interruption. It does not change Engine, Provider, credential, model-route, Session, permission, or file-operation behavior.
- v0.6.3-rc.5 was published as a non-draft prerelease on 2026-09-09: https://github.com/zhao-cai-lihua/Deep-code/releases/tag/v0.6.3-rc.5. Release workflow run `34321559334` completed successfully after 251 tests, tag/version validation, Windows installer/portable packaging, checksum generation, and asset publication.
- `Deep.code.0.6.3-rc.5.exe`: 100,564,496 bytes; GitHub SHA-256 `17b21e20d26c02da9adf403038c8b90b21861665f4f4d6bfe90e138cda9b22b7`.
- `Deep.code.Setup.0.6.3-rc.5.exe`: 100,787,900 bytes; GitHub SHA-256 `6fee638d3f5b889f6f58665a6b8376a31c3738f82c80f5ad0d122a342ba33e46`.
- `SHA256SUMS.txt`: 190 bytes; GitHub SHA-256 `b457a3a8a64685d05d01fcd42314f1f478fa84dcf1726fac5c8bbede1987c47a`.
- rc.5 closes four final evidence and interaction races found by a cumulative `v0.6.2...rc.4` Spec/Standards review: exact prompt-admission correlation, direct task-selection refresh ordering, a second send-target check immediately before `session.prompt`, and truthful timeout cancellation wording. It does not change Provider credentials, model routing, Harness permissions, or execution authority.
- v0.6.3-rc.4 was published as a non-draft prerelease on 2026-09-08: https://github.com/zhao-cai-lihua/Deep-code/releases/tag/v0.6.3-rc.4. Release workflow run `34230071185` completed successfully after 246 tests, tag/version validation, Windows installer/portable packaging, checksum generation, and asset publication.
- `Deep.code.0.6.3-rc.4.exe`: 100,563,534 bytes; GitHub SHA-256 `da5faebc2f8e5c4046e82d903d014df5510c7a494af0b475853452633e935146`.
- `Deep.code.Setup.0.6.3-rc.4.exe`: 100,786,939 bytes; GitHub SHA-256 `3d6daf6ae69780942ba673bb7af6d02add8f97404f38443f507759a00ba3ede8`.
- `SHA256SUMS.txt`: 190 bytes; GitHub SHA-256 `416de26cfc2cd317b97fbcf05680e5cafdef1b2ae36f2d6f7931096b6a9a62a3`.
- v0.6.3-rc.4 invalidates a shared Engine candidate when its confirmation-time runtime or Host recheck fails. Instead of leaving the UI in a stale `awaiting-user` state, Runtime Supervisor clears the candidate, enters `incompatible`, preserves null URL/trust, and requires a fresh Engine check. It also moves model-connection display lines into a browser/Node-compatible projection with a real behavior test for saved credential plus historical verification.
- Zero-token local protocol acceptance on 2026-09-08 used the pinned official checkout. A real shared Harness remained unusable before confirmation, then bound exact `user-confirmed-shared` facts and was not stopped by Deep Code. A fake HTTP-200 service on 3080 was not adopted; Deep Code started an owned managed Engine on random port `1527`, reached `managed-process / ready`, and stopped it cleanly. Port 3080 was free after both checks.
- Packaged rc.3 single-instance acceptance used an isolated user-data directory. The second launcher exited within six seconds and exactly one main `Deep code.exe` remained. The first instance was then stopped. No real task store, Session, Provider, credential, or workspace was touched.
- v0.6.3-rc.3 was published as a non-draft prerelease on 2026-09-08: https://github.com/zhao-cai-lihua/Deep-code/releases/tag/v0.6.3-rc.3. Release workflow run `34223988024` completed successfully after 245 tests, tag/version validation, Windows installer/portable packaging, checksum generation, and asset publication.
- `Deep.code.0.6.3-rc.3.exe`: 100,563,236 bytes; GitHub SHA-256 `c2ed757bc03d544c3f362ee2d261a608bbffe977e25323441cd68541f6c4b94a`.
- `Deep.code.Setup.0.6.3-rc.3.exe`: 100,786,644 bytes; GitHub SHA-256 `2c4f8c2b4e0d2a700902b18ae798c07c1e17c0840f49c6b5307b4b55c59d6a0f`.
- `SHA256SUMS.txt`: 190 bytes; GitHub SHA-256 `36f41b6768b4fdb75a6dde756c702316ef0b1174496651256cdefe64306fb364`.
- v0.6.3-rc.3 fixes temporal model-state projection without changing Harness credential storage or making a Provider request. A saved credential and a real-call verification receipt are rendered as separate facts; an older failed Turn no longer claims the currently saved credential is invalid when a newer attributable pass exists.
- 砚星 confirmed rc.2 now admits the correct pinned Engine and displays runtime release `0.1.1-rc.2`. During model-service acceptance, the same API Key passed after being entered again, while an older task failure and the settings connection panel still presented stale or incomplete status. Read-only source/runtime inspection found no evidence of an Engine credential cache: both current credentials were reported by Harness as file-backed, and the pinned upstream adapters resolve credentials per request. rc.3 therefore repairs evidence projection instead of adding an unproven Engine restart or automatic credential rewrite.

- v0.6.3-rc.2 was published as a non-draft prerelease on 2026-09-08: https://github.com/zhao-cai-lihua/Deep-code/releases/tag/v0.6.3-rc.2. Release workflow run `34200311540` completed successfully after 244 tests, tag/version validation, Windows installer/portable packaging, checksum generation, and asset publication.
- `Deep.code.0.6.3-rc.2.exe`: 100,562,944 bytes; GitHub SHA-256 `2efa08ace30dfe1e538c75286f0a925d0b24c794bb8b0c894981ba12540c399a`.
- `Deep.code.Setup.0.6.3-rc.2.exe`: 100,786,359 bytes; GitHub SHA-256 `f8c85b89a35e7b75b913ebfccdff0e420128f1272c97be65f7225025bc976053`.
- `SHA256SUMS.txt`: 190 bytes; GitHub SHA-256 `78448d65d2130a9f6aa030d3b6cc0f3bfb970527302f98a2fde68b032044cd31`.
- v0.6.3-rc.1 is blocked from acceptance. Both its local test portable and published installer correctly inspected the pinned runtime release and Git SHA, but then incorrectly compared upstream's hard-coded `host.describe.version: "0.0.1"` placeholder with root release version `0.1.1-rc.2`. This failed closed before Session creation; it did not modify a task, workspace, Provider, or credential. Use rc.2 or later.
- The rc.1 GitHub release remains reproducible but its title and release body now explicitly direct testers to rc.2. Its tag and assets were not deleted or rewritten.
- v0.6.3-rc.1 was published as a non-draft prerelease on 2026-09-08: https://github.com/zhao-cai-lihua/Deep-code/releases/tag/v0.6.3-rc.1. Release workflow run `34188241039` passed dependency installation, 243 tests, tag/version validation, installer/portable packaging, checksum generation, and asset publication.
- `Deep.code.0.6.3-rc.1.exe`: 100,562,861 bytes; GitHub SHA-256 `2520f53514b1a5f3145882e153418e13027064341049fd26b2472034f00eb927`.
- `Deep.code.Setup.0.6.3-rc.1.exe`: 100,786,276 bytes; GitHub SHA-256 `5260beaf914d7ec2fad7e1af9add2d53c3c97df6d649df1c13eb487f1388c8ba`.
- `SHA256SUMS.txt`: 190 bytes; GitHub SHA-256 `86bbaa330ceff819e3b4f837341c757af586b07ae31bca62e00566973119e482`.
- v0.6.2 remains reproducible at https://github.com/zhao-cai-lihua/Deep-code/releases/tag/v0.6.2, but on 2026-09-08 it was marked **prerelease/test-only** and given a safety warning. Its tag and assets were not deleted or rewritten.
- Tag source: `889a57981d7478f24f9e52a02b63eb6625bd8a98`; PRs #4 and #5 merged. Runtime `src/` is unchanged from accepted rc.3.
- Clean Windows release run `34036307913`: 197 tests passed, Setup and portable built and published. Both asset URLs resolve. No new real-provider calls were made during release preparation.
- `Deep.code.Setup.0.6.2.exe`: 100,779,810 bytes; GitHub SHA-256 `12b4163f0d547395e7169a9ea8e6bf84f3b430ffeb6b621f936f6e8206d6045e`.
- `Deep.code.0.6.2.exe`: 100,556,397 bytes; GitHub SHA-256 `a21c6c0a4a300ef4aaf66bde6dfe6f173a5499a49fece1b6e808491e4dac91c0`.
- Checksums above are GitHub asset digests, not a claimed local download verification. Packaged rc.3 was manually accepted; published v0.6.2 was not separately installed over the user's application. No commercial signing certificate is configured.
- The unsuccessful v0.6.1 tag remains intact. Its release was blocked by a test's LF-only source extractor; the fix and LF/CRLF regression are included in v0.6.2.
- `docs/FEI_REVIEW_PACKET_2026-09-06.md` is the bounded external review entry for v0.6.2. It points to the fixed release commit, trust boundaries, high-risk files, reproducible commands, known debt, and evidence requirements without copying private conversations or duplicating the whole repository into Markdown.

## v0.6.3 accepted safety baseline

This candidate implements the security and evidence plan without adding a second Agent Loop:

- Engine admission is represented by one managed/shared trust state. Managed Harness uses `--no-open --port 0`, must be the child process Deep Code owns, and becomes ready only after the pinned checkout identity and the pinned checkout's actual `host.describe` marker agree with the normalized working directory. A compatible Harness already listening on 3080 remains `awaiting-user`; it cannot receive prompts or credentials until explicitly confirmed. Confirmation repeats both checkout and host checks so a changed `baseUrl + host marker + cwd + HEAD` cannot reuse an older decision.
- The compatible runtime allowlist currently contains only tag `dsh-v0.1.1-rc.2`, root package version `0.1.1-rc.2`, Git SHA `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`, and that commit's `host.describe.version` marker `0.0.1`. The upstream implementation explicitly labels `0.0.1` as a placeholder to be replaced by the CLI package version; it is neither treated nor displayed as the release version. Local inspection of that exact checkout confirmed the schema and CLI `--port 0` support. `0.1.2-rc.1` remains unapproved.
- Managed child processes receive only a small runtime/proxy environment allowlist. Unknown names containing Key, Token, Secret, Password, or Credential, `NODE_OPTIONS`, and unrelated application/cloud credentials are excluded; values are never diagnosed.
- Automatic runtime preparation clones the exact official tag into a revision-named directory and verifies repository identity, package identity, version, and exact HEAD both before executing repository scripts and after the build.
- Ecosystem discovery remains opt-in and read-only. Product Renderer, Preload, and Main expose no executable installation IPC; popularity is never treated as plugin compatibility.
- Memory IDs and resolved paths are revalidated on read/migration. Folder location is status truth, malformed or duplicate records are quarantined, reviewed state moves atomically, and high-confidence secret material is refused without echoing it. Memory remains outside Agent prompts.
- Local tasks use immutable numbered snapshots, retain the three latest schema-valid generations, migrate the legacy file without deleting it, and fall back from a corrupt newest generation. A stale crash `.tmp` cannot block future writes. A second Electron instance only focuses the first writer.
- `TaskRunSnapshot` is the sole task evidence projection. Admission means accepted/queued only; current-turn `turn/start`/matching `turn/end` decide lifecycle; the last in-window `request/header` decides model route; only structured permission events become permission facts; official diff presenter or independent same-worktree baseline evidence is required for confirmed file changes.
- The pinned Harness version returns `{ accepted: true }` from `session.prompt`, while its durable `user/message.source.rpcId` records the exact JSON-RPC request id. Deep Code now retains that locally generated request id as admission evidence and opens a Turn window only when the same id appears in durable history. Until then the request remains queued; it cannot inherit an older Turn's route, tools, file changes, or terminal state.
- Session-scoped mux frames without the exact non-empty Session ID are dropped and counted anonymously. A terminal state is never inferred from idle/ready state, old model headers do not cross into a newer Turn, and permission-like text remains ordinary runtime context.
- Running tasks use stop-and-delete: cancel first, wait up to ten seconds for a same-task terminal snapshot, and keep the record with recovery guidance when stop is unconfirmed. Renderer refresh responses are gated by generation, visible task ID, and Session ID.

The rc.5 source changes no credential storage, Provider routing, Session authority, or Harness execution behavior. Direct task selection now uses the same monotonic generation and `{taskId, sessionId}` guard as background refreshes. Sending checks that identity once before asynchronous route preparation and again immediately before `session.prompt`. A five-minute Decision Gate timeout may prove that Harness accepted a cancellation request, but only matching terminal evidence may claim the Turn stopped. The cumulative review is recorded in `docs/V0.6.3_FINAL_REVIEW_2026-09-09.md`.

The rc.6 acceptance patch adds a Renderer-only `ComposerDraftState`: typing in Task A is saved only for A, Task B starts with B's own draft, returning to A restores A, and a successful send clears only the submitted scope. Drafts remain in memory and never become Harness input before submission. The timeout receipt now has a third `pending` presentation state. Without terminal evidence it says “停止仍待 Harness 确认”; with a later matching terminal it replaces stale unconfirmed copy with the proven terminal result.

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

- Projection-integrity focused suite: **59 passed, 0 failed** on 2026-09-11. Behavior tests prove that a technical Evidence Map link opens both disclosure layers, a completed Turn with a failed tool receives one non-contradictory Run Projection summary, the View cannot override a supplied `run.trace` with conflicting raw fields, an unconfirmed stop remains unknown, and later matching terminal evidence supersedes a stale recovery marker.
- Projection-integrity full `npm test`: **275 passed, 0 failed** on 2026-09-11. Both follow-up review axes confirmed their P1 findings closed and found no new scope or standards defect in the narrow correction.
- Projection-integrity `npm run package:test:win` completed and produced `dist/Deep-code-Test-0.6.3.exe`, 368,793,483 bytes, local SHA-256 `436056f1772c4ee940d477cb7af044061c40e74785e7d491c5e762b3d6212d03`. This is an uncompressed local test artifact, not a v0.7.0 release asset.
- Compact Evidence `npm test`: **270 passed, 0 failed** on 2026-09-10. A permanent zero-token matrix renders ten states through the real Evidence view: completed with change, completed without change, changed but unverified, verification failed, waiting for the user, cancellation not yet terminal, confirmed interruption, credential failure, network failure, and non-Git workspace.
- The merged view keeps every tool card collapsed by default, hides an empty file-change section, and gives success, active, warning/unknown, and failure states distinct summary tones. Interface tests also prove that the new supporting-evidence disclosure belongs to one task rather than leaking across task switches.
- PR #10 regression workflow run `34477492520` completed successfully with the same 270-test suite before merge at `ac72768e6939f1ad2b72183fd6660ba5585f72bb`.
- `npm run package:test:win` completed and produced `dist/Deep-code-Test-0.6.3.exe`, 368,792,439 bytes, local SHA-256 `383ad7de18b0819a57402e7877345baaf686a86ce17e213f75f8f44dc21d0adf`. An isolated packaged-app CDP check reached a complete `Deep code` page, found the compact trace and supporting-evidence anchors, confirmed the repeated body task title is hidden, and verified the tool hint. Engine, Session, Provider, credential, and model calls were not used.
- The throwaway comparison is preserved outside `main` at branch `codex/prototype-task-evidence-density`, commit `0afaa1e`. Its three variants established the product verdict: conversation keeps a continuous one-line rhythm, Receipt remains conclusion-first, and Trace becomes a layered evidence ledger. Prototype code is not included in `main` or the stable package.
- PR #9 task evidence view focus suite plus Renderer contract: **47 passed, 0 failed** on 2026-09-10. Four new interface-level behavior tests cover all supported tool cards, structured permission and file facts, baseline/context disclosure, receipt sections, evidence-map delegation, allowlisted guidance delegation, stale-content clearing, and distinct pending/error labels.
- PR #9 full `npm test`: **269 passed, 0 failed**. The new view receives already-projected `runDetails`, `outcome`, and `guidance`; the tests do not manufacture execution truth from Assistant text.
- PR #9 regression workflow run `34470348278` completed successfully with the same 269-test suite before merge.
- PR #9 `npm run package:test:win` completed and produced an earlier `dist/Deep-code-Test-0.6.3.exe`, 368,785,785 bytes, local SHA-256 `88d26ea51023d6e46ded5d20e71ad5b82accdf2e910c5680e554f4dfc7368091`. An isolated packaged-app CDP probe reached a complete `Deep code` page, loaded `DeepCodeTaskEvidenceView`, and found the trace, receipt, and guidance anchors. All four isolated packaged processes were stopped; Engine and Provider were not used.
- Post-stable Renderer seam baseline `npm test`: **265 passed, 0 failed** on 2026-09-10. Six new behavior tests cover Model Services projection rendering, credential/catalog gating, offline truthfulness, final and live conversation rendering, copy feedback, image metadata, and user/assistant distinction.
- PR #8 regression workflow run `34451299886` completed successfully with the same 265-test suite before merge.
- Post-stable `npm run package:test:win` passed and produced `dist/Deep-code-Test-0.6.3.exe`, 368,782,040 bytes, local SHA-256 `816e52892711eb775d705f40d1651825f7dbe20c3ba1f338463fabebca56ccce`. Packaged `app.asar` contains both new Renderer modules.
- An isolated packaged-app CDP smoke probe reached `document.readyState === "complete"`, title `Deep code`, loaded `DeepCodeModelServicesView` and `DeepCodeConversationMessageView`, and found both the model list and conversation feed DOM anchors. All isolated smoke processes were stopped. This probe did not start Engine, create a Session, read a Provider credential, or make a model call.
- Stable preparation `npm test`: **259 passed, 0 failed** on 2026-09-10. `git diff --name-only v0.6.3-rc.6 -- src test` is empty, confirming that the stable preparation adds no runtime or test change after the accepted candidate.
- Stable preparation `npm run package:test:win` passed and produced `dist/Deep-code-Test-0.6.3.exe`, 368,771,132 bytes, local SHA-256 `f8374d34d4263c898f425cba5607dbbc6acf415e36dae8e6803911d69000a5cc`. Packaged `app.asar` reports version `0.6.3` and contains Composer Draft State, TaskRunSnapshot, Outcome, Guidance, and Workbench projection modules. This local uncompressed test artifact is not a release asset.
- `npm test`: **259 passed, 0 failed** for the current v0.6.3-rc.6 source on 2026-09-09. New behavior tests prove task/new-task text-draft isolation, successful-send clearing, stale-selection capture, pending timeout presentation, later terminal supersession, terminal-aware guidance, and structured-terminal precedence over temporary recovery state.
- `npm run package:test:win` passed for rc.6 and produced `dist/Deep-code-Test-0.6.3-rc.6.exe`, 368,771,147 bytes, SHA-256 `8ff274bcee420733026c7a239193f50a8ccb129a6ae610587650f329faca6e77`. Packaged `app.asar` contains Composer Draft State plus the updated outcome, guidance, and online Engine-state projections.
- Model-state and conversation-projection focus suite: **80 passed, 0 failed**. The suite proves an authentication failure is phrased as a historical Turn fact and the settings connection snapshot can display a newer passed receipt.
- `npm run package:test:win` passed for rc.5 and produced `dist/Deep-code-Test-0.6.3-rc.5.exe`, 368,766,528 bytes, SHA-256 `020fc87f7d10b33f667b30c0c4c60ff2a3ebd8e077b233e691c893876ec3702c`. Packaged `app.asar` inspection found the new admission, refresh, target, and timeout-projection modules. No user process was stopped. This does not substitute for final UI acceptance or a Provider call.
- GitHub Windows release run `34223988024`: passed 245 tests, tag/version validation, compressed Setup and portable packaging, checksum generation, and prerelease asset publication.
- GitHub Windows release run `34230071185`: passed 246 tests, tag/version validation, compressed Setup and portable packaging, checksum generation, and rc.4 prerelease asset publication.
- GitHub Windows release run `34321559334`: passed 251 tests, tag/version validation, compressed Setup and portable packaging, checksum generation, and rc.5 prerelease asset publication.
- GitHub Windows release run `34357772354`: passed 259 tests, tag/version validation, compressed Setup and portable packaging, checksum generation, and rc.6 prerelease asset publication.
- `pnpm audit --prod --audit-level high`: no known production dependency vulnerabilities on 2026-09-08.
- `git diff --check`: passed. Line-ending notices are Git's configured LF-to-CRLF conversion warning, not whitespace errors.
- Release workflow now requires the Git tag to equal `v` plus the package version, marks hyphenated versions such as `-rc.1` as prerelease, and publishes a generated `SHA256SUMS.txt` beside installer and portable assets.
- Historical v0.6.2 baseline: 197 tests passed, including LF and CRLF removal-handler contracts. The unmodified contract failed under CRLF in a focused local reproduction, matching the v0.6.1 Windows release job (196 passed, 1 failed). Only the test extraction was faulty; no runtime change was needed.
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
- Credential presence is labeled `凭据已保存` and displayed separately from `最近一次真实验证`; neither is called `模型已准备好`. Saving a new Provider requires a second in-dialog click naming the exact Provider; changing the Provider or Key invalidates that confirmation. Deep Code still does not infer provider identity from secret text.
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
- The regression suite is fast and broad, and the current production dependency audit reports no known vulnerabilities.
- The first post-stable Renderer decomposition is complete. `model-services-view.cjs` exposes one `render(snapshot)` interface and only displays already-projected Provider/catalog/credential/verification/current-route facts. `conversation-message-view.cjs` exposes one `render(message)` interface and owns message DOM, Markdown, copy feedback, attachment metadata, and live-draft presentation without deciding Session or terminal state.
- The second decomposition adds `task-evidence-view.cjs` with one `render(thread)` interface. It owns trace cards, structured fact lists, technical disclosure, visual receipt, and next-action presentation. Evidence-map and guidance buttons only delegate inert IDs back to the workbench; the module cannot retry, select a model, start Engine, or alter a task.
- Compact Evidence now makes Trace a three-level surface: a truthful state/count summary, visible confirmed file changes plus collapsed operation rows, then one supporting disclosure for permissions, Git baseline, runtime context, and raw evidence. Failed tool output is no longer expanded merely because it failed; the red summary and row remain visible while exact output stays one click away. The task title is shown only in the sticky Workbench header, while its project path and explicit project-switch action remain below.
- `src/renderer/shell.js` is now 1,924 newline-delimited lines, down from 2,323 in the v0.6.3 source. The line count is secondary evidence; the meaningful change is that Model Services, conversation, and task evidence presentation now have behavior-tested interfaces. `src/main.cjs` remains about 956 lines.
- A post-merge fixed-point review caught and closed two projection-boundary defects before any v0.7.0 candidate release. `task-evidence-view.cjs` now renders the single `run.trace` projection and owns disclosure reveal behavior; `run-projection.cjs` owns the Trace state, counts, and supporting-evidence label. Outcome Map navigation can no longer scroll to evidence that remains hidden. While tightening that seam, a pre-existing inconsistency was also closed: an unconfirmed cancellation no longer appears as a failed Turn, and a later matching terminal supersedes stale recovery state.
- Main, Preload, DSH Adapter, `TaskRunSnapshot`, IPC contracts, Provider storage, model routing, and Harness authority were not changed by this decomposition.

## Next bounded work

1. v0.6.3 is stable and complete. Do not repeat accepted Engine, Provider, focus, Memory, workspace, model-receipt, or task-draft checks unless the corresponding implementation changes.
2. The zero-token fixture step and projection-integrity correction are merged. Do not add another parallel status surface: conversation already provides the continuous task narrative, Receipt provides conclusions, and Trace provides exact evidence. Publish v0.7.0-rc.1 only after version/tag checks, full tests, packaging, and PR CI; then wait for the four low-cost checks in its release notes before preparing stable v0.7.0.
3. Add no automatic Harness upgrade merely because upstream publishes a newer Developer Preview. A new compatibility entry requires pinned source inspection, protocol fixtures, isolated startup, packaging, and bounded manual acceptance.
4. Do not retroactively create receipts for tasks that did not persist a structured requested route. Keep automatic memory extraction/injection, automatic model routing, companion-card prompt injection, and ecosystem execution out of scope until the core task loop is stable.

## Human acceptance for v0.6.3-rc.6

1. **Accepted 2026-09-10:** the zero-token draft-isolation check passed. Task A's unsent sentence did not appear in Task B; B retained its own sentence; returning to A restored only A's draft.
2. Non-blocking future observation: if an unanswered Decision Gate naturally reaches five minutes, the receipt must be yellow and say “停止仍待 Harness 确认” until terminal evidence arrives. After a confirmed interruption it may turn red and say “这一轮已停止”, but the old “尚未确认” sentence must disappear. Do not create a paid task only for this check.

The stop-and-delete lifecycle does not need another dedicated manual reproduction for rc.6. Its same-Turn terminal deletion, wrong-Turn refusal, ten-second unconfirmed retention, and cancel-rejection paths remain covered by behavior tests and were not changed.

Managed Engine version, hostile 3080 refusal, real shared Engine protocol behavior, and packaged single-instance behavior now have direct local runtime evidence. Repeat them only after the corresponding Engine/single-instance code changes.

## Known uncertainty

The earlier native-confirmation nesting was one confirmed focus trigger, but beta.15 showed that a native select popup could still become inert intermittently even after that nesting was removed. Beta.16 eliminates native selects only for the affected model/effort dialog. Provider and credential dialogs still use native selects; migrate those only if the same symptom is observed there, rather than rewriting every form speculatively.

## Privacy

This handoff contains project facts only. Do not paste API keys, raw private conversations, third-party personal material, or speculative personality claims into this file.
