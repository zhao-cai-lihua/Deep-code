# Deep Code current handoff

Updated: 2026-09-08
Branch: `codex/v0.6.3-evidence-safety`
Current packaged release candidate: `0.6.3-rc.4` (published prerelease; awaiting bounded visual acceptance)
Current source version: `0.6.3-rc.4`

## Release delivery

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

## v0.6.3-rc.4 safety candidate

This candidate implements the security and evidence plan without adding a second Agent Loop:

- Engine admission is represented by one managed/shared trust state. Managed Harness uses `--no-open --port 0`, must be the child process Deep Code owns, and becomes ready only after the pinned checkout identity and the pinned checkout's actual `host.describe` marker agree with the normalized working directory. A compatible Harness already listening on 3080 remains `awaiting-user`; it cannot receive prompts or credentials until explicitly confirmed. Confirmation repeats both checkout and host checks so a changed `baseUrl + host marker + cwd + HEAD` cannot reuse an older decision.
- The compatible runtime allowlist currently contains only tag `dsh-v0.1.1-rc.2`, root package version `0.1.1-rc.2`, Git SHA `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`, and that commit's `host.describe.version` marker `0.0.1`. The upstream implementation explicitly labels `0.0.1` as a placeholder to be replaced by the CLI package version; it is neither treated nor displayed as the release version. Local inspection of that exact checkout confirmed the schema and CLI `--port 0` support. `0.1.2-rc.1` remains unapproved.
- Managed child processes receive only a small runtime/proxy environment allowlist. Unknown names containing Key, Token, Secret, Password, or Credential, `NODE_OPTIONS`, and unrelated application/cloud credentials are excluded; values are never diagnosed.
- Automatic runtime preparation clones the exact official tag into a revision-named directory and verifies repository identity, package identity, version, and exact HEAD both before executing repository scripts and after the build.
- Ecosystem discovery remains opt-in and read-only. Product Renderer, Preload, and Main expose no executable installation IPC; popularity is never treated as plugin compatibility.
- Memory IDs and resolved paths are revalidated on read/migration. Folder location is status truth, malformed or duplicate records are quarantined, reviewed state moves atomically, and high-confidence secret material is refused without echoing it. Memory remains outside Agent prompts.
- Local tasks use immutable numbered snapshots, retain the three latest schema-valid generations, migrate the legacy file without deleting it, and fall back from a corrupt newest generation. A stale crash `.tmp` cannot block future writes. A second Electron instance only focuses the first writer.
- `TaskRunSnapshot` is the sole task evidence projection. Admission means accepted/queued only; current-turn `turn/start`/matching `turn/end` decide lifecycle; the last in-window `request/header` decides model route; only structured permission events become permission facts; official diff presenter or independent same-worktree baseline evidence is required for confirmed file changes.
- The pinned Harness version returns `{ accepted: true }` from `session.prompt` and does not provide a `messageId`. Deep Code therefore records an accepted timestamp without inventing an ID; this proves admission, never completion.
- Session-scoped mux frames without the exact non-empty Session ID are dropped and counted anonymously. A terminal state is never inferred from idle/ready state, old model headers do not cross into a newer Turn, and permission-like text remains ordinary runtime context.
- Running tasks use stop-and-delete: cancel first, wait up to ten seconds for a same-task terminal snapshot, and keep the record with recovery guidance when stop is unconfirmed. Renderer refresh responses are gated by generation, visible task ID, and Session ID.

The rc.4 source changes no credential storage, Session behavior, or task execution authority. It adds one confirmation-time failure transition to Runtime Supervisor and extracts only the model-connection text projection from Renderer orchestration. Its uncompressed local test portable is `dist/Deep-code-Test-0.6.3-rc.4.exe`, 368,761,426 bytes, SHA-256 `196e8876c1bd69719c2d1b03dd89fcbd9322b3cafdf8213e539bcba7fcc8a5de`. The packaged `app.asar` contains the new `DeepCodeModelConnectionView`, and an isolated-profile startup exposed exactly one main process for eight seconds before being stopped. The real shared/fake-3080 protocol checks above exercised the rc.4 Runtime Supervisor source against the pinned official Harness without creating a Session.

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

- `npm test`: **246 passed, 0 failed** for the current v0.6.3-rc.4 source on 2026-09-08. This adds user-visible model-connection rendering behavior and a strict shared-candidate invalidation assertion to the existing Engine trust, environment, Memory, immutable store, Session evidence, lifecycle, and race coverage.
- Model-state and conversation-projection focus suite: **80 passed, 0 failed**. The suite proves an authentication failure is phrased as a historical Turn fact and the settings connection snapshot can display a newer passed receipt.
- `npm run package:test:win`: passed for rc.4 and produced the local artifact recorded above. Packaged-source inspection found the new model-connection projection, and isolated startup remained healthy for eight seconds. This does not substitute for the final visual composition check or a Provider call.
- GitHub Windows release run `34223988024`: passed 245 tests, tag/version validation, compressed Setup and portable packaging, checksum generation, and prerelease asset publication.
- GitHub Windows release run `34230071185`: passed 246 tests, tag/version validation, compressed Setup and portable packaging, checksum generation, and rc.4 prerelease asset publication.
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
- The Renderer orchestration file remains too broad: `src/renderer/shell.js` is about 2,316 lines and owns unrelated dialogs, pages, renderers, and event handlers. `src/main.cjs` is about 956 lines. New high-risk semantics were extracted into tested modules (`engine-trust`, `task-run-snapshot`, `task-lifecycle`, `workbench-refresh-gate`, `single-instance`, and baseline projection) instead of being added as more ad-hoc Renderer state.
- Do not perform a broad refactor before v0.6.3 acceptance. After stable release, extract Model Services UI state and task conversation rendering while preserving IPC and Harness authority seams.

## Next bounded work

1. Package and publish v0.6.3-rc.4. Human acceptance for the model-state patch remains read-only: open “运行时与设置” and confirm that a Provider with an existing passed receipt shows both `凭据已保存` and `最近一次真实验证通过`, with the historical boundary. Do not re-enter a Key or spend tokens merely for this check.
2. The feature branch and earlier RC releases remain reproducible. Do not tag or publish `v0.6.3` stable until rc.4 and the remaining user-visible safety matrix are accepted.
3. After RC acceptance, merge the reviewed branch and publish v0.6.3 stable without broad UI or routing changes. Then begin the next Evidence Gate iteration only for gaps observed against real upstream events.
4. Do not retroactively create receipts for tasks that did not persist a structured requested route. Keep automatic memory extraction/injection, automatic model routing, companion-card prompt injection, and ecosystem execution out of scope until the core task loop is stable.

## Human acceptance still required for v0.6.3-rc.4

1. In “运行时与设置”, an already verified Provider shows credential presence and the latest attributable verification as separate facts. An older authentication failure, if opened, is explicitly scoped to that failed Turn. This check must not require another model call.
2. Ecosystem projects remain browsable but have no executable install path.
3. Existing workspaces and local tasks survive the upgrade.
4. One ordinary low-cost task visibly progresses from accepted/queued through running to the real Harness terminal state. A read-only task must not claim file changes.
5. Rapidly switch between two tasks while one refresh is delayed; the old task must not overwrite or receive a message intended for the visible task.
6. Stop-and-delete a running low-cost task. Delete occurs only after a terminal event; if confirmation is absent, the task and recovery guidance remain.

Managed Engine version, hostile 3080 refusal, real shared Engine protocol behavior, and packaged single-instance behavior now have direct local runtime evidence. Repeat them only after the corresponding Engine/single-instance code changes.

## Known uncertainty

The earlier native-confirmation nesting was one confirmed focus trigger, but beta.15 showed that a native select popup could still become inert intermittently even after that nesting was removed. Beta.16 eliminates native selects only for the affected model/effort dialog. Provider and credential dialogs still use native selects; migrate those only if the same symptom is observed there, rather than rewriting every form speculatively.

## Privacy

This handoff contains project facts only. Do not paste API keys, raw private conversations, third-party personal material, or speculative personality claims into this file.
