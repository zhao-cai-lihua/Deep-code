# DSH routing and ecosystem discovery research

Research date: 2026-08-25 (Asia/Shanghai)

Scope: first-party source and repository inspection for `yjh051108/dsh-routing-suite`, DeepSeek Harness plugin contracts, and the community directories that could inform an opt-in Deep Code discovery panel. This note separates **source facts**, **maintainer claims**, and **hypotheses**. It does not install or execute any third-party plugin and does not change product code.

## Executive decision

`dsh-routing-suite` is an interesting, measurable prompt/presentation experiment, not evidence that DeepSeek V4 has a documented “reasoning switch” or that a hidden chain of thought can be safely activated. Its current pinned commit is `21a7260d961571c77a11705d2b0e6cf7015cc48b` (2026-08-25 07:56:39 +08:00), and its repository is MIT licensed. The code uses DSH profile-bundle and agent-preset seams, injects prompt/persona sections and progressive tool presentation, and runs probes against the official API with `thinking.enabled`, `reasoning_effort=max`, and `max_tokens=1024`. Those settings are experimental conditions, not a proof of a model-internal mode.

There is no official DeepSeek Harness marketplace or official quality ranking in the sources checked. The official discovery instruction is the GitHub `dsh-plugin` topic. Independent catalogs now exist, including DSH Directory, DSH Market, DeepSeekPlugin, dsh.pub, and several curated GitHub lists. They are useful as **untrusted, attributable metadata sources**, not as installation authorities.

Deep Code should add an optional, read-only **Ecosystem Discover** panel, initially backed by a small, pinned catalog-source adapter. It should show source URL, repository commit/branch checked, manifest evidence, license, permissions, maintenance signals, and “not a security audit” prominently. It must never auto-install, run a package, silently edit a DSH profile, or combine stars into a trust score. A first MVP can consume a manually reviewed JSON snapshot or GitHub topic results and open the upstream repository for the user; a live scraper/API integration should wait until a source publishes a stable machine-readable contract and terms permitting this use.

## 1. `dsh-routing-suite`: pinned source and license

### Source identity

The repository was cloned read-only on 2026-08-25. The default branch resolved to:

```text
commit 21a7260d961571c77a11705d2b0e6cf7015cc48b
date   2026-08-25T07:56:39+08:00
message Merge pull request #62 from yjh051108/refactor/flat-submodules
```

Primary source: [repository](https://github.com/yjh051108/dsh-routing-suite) and its [commit](https://github.com/yjh051108/dsh-routing-suite/commit/21a7260d961571c77a11705d2b0e6cf7015cc48b) (accessed 2026-08-25).

The repository root `LICENSE` is MIT, copyright `2026 yjh051108`. The `preset/` directory also contains its own license/notice material and credits experimental inputs from other repositories. MIT applies to this repository's code under its stated terms; it does not grant rights to third-party data, model outputs, private conversations, or upstream code that the project credits or packages.

Primary source: [root LICENSE at the pinned commit](https://github.com/yjh051108/dsh-routing-suite/blob/21a7260d961571c77a11705d2b0e6cf7015cc48b/LICENSE) and [preset notice](https://github.com/yjh051108/dsh-routing-suite/blob/21a7260d961571c77a11705d2b0e6cf7015cc48b/preset/NOTICE) (accessed 2026-08-25).

The suite currently contains two materially different parts:

1. `injector/`: a runtime plugin/injection layer derived from DSH/Cordis lifecycle seams.
2. `preset/`: agent presets, prompt/persona sections, router JavaScript, tool presentation, and experiments.

The README describes the installation as `dsh plugin --profile web add .\injector`, copying presets under `~/.dsh/.agent-presets/`, then restarting DSH and choosing a preset. That is a real mutation of a user's DSH installation/profile; a Deep Code catalog must not treat “listed” as “safe to install.”

Primary source: [pinned README](https://github.com/yjh051108/dsh-routing-suite/blob/21a7260d961571c77a11705d2b0e6cf7015cc48b/README.md) and [installer](https://github.com/yjh051108/dsh-routing-suite/blob/21a7260d961571c77a11705d2b0e6cf7015cc48b/install.ps1) (accessed 2026-08-25).

## 2. What the source actually does

The current `router-standard` preset declares an `agent.cordis.yml` composition and a `preset.yml`. It mounts a router bootstrap module, a Windows Git Bash seam, PowerShell and filesystem tools, jobs, skills, goals, plan mode, compaction, delegation tools, web, ask-user and todo tools. The composition comments explicitly distinguish host-plane registries (for example, subagents and model routing) from agent-plane presentation and warn that per-session realms are required for some services.

Primary source: [pinned `router-standard/agent.cordis.yml`](https://github.com/yjh051108/dsh-routing-suite/blob/21a7260d961571c77a11705d2b0e6cf7015cc48b/preset/router-standard/agent.cordis.yml) (accessed 2026-08-25).

The preset's current description says “self-routed progressive tool disclosure,” with a session bootstrap, staged tool visibility, and prompt/persona routing. The implementation does not replace the Harness execution truth; it modifies what is presented to the model and when, and mounts code through DSH's plugin/preset composition points.

The source also records several previous integration failures and repairs: first-turn messages were captured at `agent/inbox/claimed`; the near-field guide was moved to `agent/pre-step`; and the README states that the old path could create a second model request per user message, producing a 2x API-call cost spike. The repaired path claims to put the guide in the same request. This is both a useful engineering warning and a reason Deep Code must model “extra request” as an explicit cost/usage event.

Primary source: [pinned preset README, integration section](https://github.com/yjh051108/dsh-routing-suite/blob/21a7260d961571c77a11705d2b0e6cf7015cc48b/preset/README.md) and [pinned suite README, v0.3.0 changes](https://github.com/yjh051108/dsh-routing-suite/blob/21a7260d961571c77a11705d2b0e6cf7015cc48b/README.md) (accessed 2026-08-25).

## 3. “router standard”, “Flash/Max”, and `we need` / chain-of-thought claims

### What is directly in the repository

The suite README claims measured behavior bands and a model-matched persona: “Pro” and “Flash” are labels used by the project, and the current preset README states that its probes used the official API with `reasoning_effort=max`. The experiments file says probes used `thinking.enabled`, `reasoning_effort=max`, and `max_tokens=1024`, and classified sanitized first-line markers such as `We`, `we`, and `let me`.

Primary sources: [pinned experiments](https://github.com/yjh051108/dsh-routing-suite/blob/21a7260d961571c77a11705d2b0e6cf7015cc48b/preset/docs/experiments.md), [pinned preset README](https://github.com/yjh051108/dsh-routing-suite/blob/21a7260d961571c77a11705d2b0e6cf7015cc48b/preset/README.md), and [pinned suite README](https://github.com/yjh051108/dsh-routing-suite/blob/21a7260d961571c77a11705d2b0e6cf7015cc48b/README.md) (accessed 2026-08-25).

The source has a preset named `router-standard` and a separate `router-spec`. “Router Standard” is therefore a project/preset name and behavior configuration, not an official DeepSeek model mode established by the DSH repository.

The repository's current `preset/README.md` describes a historical v0.3 line as task-aware classification into `spec`, `react`, and `weak`, and a newer development line as strict workflow/progressive disclosure. The code and documents have evolved quickly, so the marketing summary, historical experiment tables, and current router code should not be treated as one stable API.

### What is not established

I found no source in this repository that proves any of the following:

- an official DeepSeek model parameter named “Flash Max”;
- a DSH contract named “router standard mode” that activates hidden model cognition;
- a supported DSH switch named “we need” or “I need/we need”;
- retrieval or exposure of private chain-of-thought as a product feature;
- a causal model-internal explanation for why the first tokens `We need` or `Let me` correlate with a measured trajectory.

The experiments classify sanitized output markers and report task scores/trajectory observations. They do not expose a model's private reasoning trace as an auditable ground truth. In fact, the repository's own apology explicitly retracts earlier strong explanations (“officially designed dual modes,” “router trained badly,” and “self-routing impossible” as an absolute), says the theory was over-inferred from observations, and labels the deeper mechanism a hypothesis. That self-correction is important evidence against repeating the stronger internet claim.

Primary source: [pinned apology/correction](https://github.com/yjh051108/dsh-routing-suite/blob/21a7260d961571c77a11705d2b0e6cf7015cc48b/preset/docs/apology.md) (accessed 2026-08-25).

### Responsible interpretation

The strongest defensible interpretation is:

> Under a particular model, API setting, prompt/persona position, tool catalog, task mix, and evaluation protocol, the project observed repeatable differences in output trajectory and task scores. Its router is an external prompt/presentation policy that attempts to place a request in a measured behavior region. The underlying mechanism and generalization beyond the tested matrix remain hypotheses.

This could still be useful. A deterministic, opt-in routing policy may improve task fit for a particular provider/model. But Deep Code must present it as “experimental task-mode guidance,” expose the selected route and prompt policy, and allow the user to disable it. It must not promise “restored intelligence,” “chain-of-thought activation,” or universal parity with Codex.

### Cost implications

The repaired `agent/pre-step` path claims no extra round trip; the old implementation is explicitly documented as having added one API call per user message. Any future Deep Code adaptation must enforce a hard invariant: routing metadata is injected into an existing request, never implemented as a hidden classifier-model call. If a classifier or verification call is added later, it must be visible as a separate model call with a budget estimate and an opt-in setting.

## 4. DSH plugin/ecosystem discovery sources

### Official discovery mechanism

The official DeepSeek Harness README says the project is in developer preview with compatibility-breaking changes, and instructs plugin authors to add the `dsh-plugin` GitHub topic for discoverability. It does not announce an official marketplace, ranking service, or public plugin catalog API.

Primary source: [official DeepSeek Harness README](https://github.com/deepseek-ai/deepseek-harness/blob/master/README.md) (accessed 2026-08-25), especially the community/support section.

The official architecture and publishing documentation define the installable seam: a bundle is an npm package whose `package.json` declares `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`; a profile has a `dsh.profile.bundles` list and layers are composed in order. `dsh plugin --profile <name> add <package>` installs a dependency and may add the bundle to that profile's layer list.

Primary sources: [official architecture](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md), [official bundle README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/bundle/README.md), and [official publish guide](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md) (accessed 2026-08-25).

### Independent directories and lists observed

These are community projects, not DeepSeek-owned official registries:

| Source | What it claims/does | Evidence and limits | API/feed status checked |
|---|---|---|---|
| [DSH Directory](https://dsh.directory/) / [source repository](https://github.com/alexchenzl/dsh-plugin-directory) | Community catalog. The repository uses issue submissions and automated static checks; accepted records are exported snapshots. | The repository explicitly says checks do not run install commands or plugins, and listing is not a security audit, endorsement, compatibility guarantee, or ownership proof. | Public HTML pages and sitemap observed. No documented public JSON API/feed was found in the repository/site materials checked. |
| [DSH Market](https://www.dshplugin.io/) / [source repository](https://github.com/tjsdyy/dshplugin) | Searchable marketplace with categories, source links and copyable install commands. | Site says data is community-maintained; source repository is small and dynamic. Listing still does not establish safety. | Public HTML/sitemap observed. No documented stable public catalog API/manifest was found in the checked repository/page. |
| [DeepSeekPlugin](https://deepseekplugin.org/en) | Large catalog with detail pages, GitHub README links, repository signals and install evidence; instant public submission is advertised. | The page says public repositories are parsed and published automatically, with no manual review queue; this is high discovery value but weak trust. | Public HTML observed. No documented stable feed/API was found in checked materials. |
| [dsh.pub](https://dsh.pub/en/) | Registry-like browse page with plugin names and categories. | Public metadata only; upstream source and installation still require review. | Public HTML observed; no documented feed/API found. |
| [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) | CC0 curated GitHub list with a large community contribution surface. | A list is editorial/community metadata, not a runtime verification service. Staleness and inclusion quality vary. | Git repository is machine-readable, but list format/semantics are not an official DSH registry contract. |
| [dsh-ecosystem](https://github.com/zoahdev/dsh-ecosystem) | A living map with quality signals, bug radar, gap radar and weekly editions. | Useful research/triage material; its own stats and signals are project claims and should be pinned to commits before use. | Git repository is machine-readable; no official DSH feed contract. |

The directory landscape is fragmented and changes rapidly. Counts shown on websites are snapshots and can disagree within a day. Deep Code should display the source's “checked at” time and never imply that one directory is canonical.

### Machine-readable source decision

For a safe first implementation, use one of these two options:

1. **Pinned reviewed snapshot (recommended MVP):** a small JSON file maintained in Deep Code or fetched from a reviewed repository release. Each item includes upstream URL, exact commit, package path, manifest evidence, license, category, source timestamp and reviewer notes. Refresh is explicit and reviewable.
2. **GitHub topic metadata adapter (later):** query GitHub's public repository/topic API or a user-supplied export, then treat every result as an unverified candidate. This is closer to the official discovery mechanism but brings rate limits, token/privacy considerations, API drift and noisy topic matches.

Do not scrape several websites into one “star score.” None of the checked sites provides a documented cross-directory trust contract, and robots/content-signal policies may restrict automated AI input or full-content collection. A link-out or user-triggered fetch is safer than background crawling.

## 5. Security, supply chain, and ranking limits

### Installing a DSH bundle is code execution

The official bundle contract makes a package's patch file part of the boot composition. A package can mount JavaScript modules, tools, UI, model providers, storage, permissions, or other runtime changes. Installation can invoke npm/pnpm and modify a profile. A directory's static manifest check proves only that a package has the expected shape; it does not prove behavior.

The DSH Directory repository is unusually explicit: it does not execute submitted install commands or plugin code. This is a good boundary and a design Deep Code should preserve. “Bundle detected” should be rendered as “manifest shape observed,” not “verified safe.”

Primary sources: [DSH Directory trust/safety rules](https://github.com/alexchenzl/dsh-plugin-directory/blob/91689d0bb62fcb61fb7bf64b13d430631bd2592b/README.md), [official bundle contract](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md), and [official profile architecture](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md) (accessed 2026-08-25). The DSH Directory repository was read at commit `91689d0bb62fcb61fb7bf64b13d430631bd2592b`.

### Stars are a signal, not a quality metric

Stars can indicate visibility or community interest, but they are not evidence of:

- current compatibility with the user's DSH version;
- successful installation on Windows;
- absence of malicious or privacy-invasive behavior;
- test coverage or maintenance quality;
- license compatibility with the user's project;
- model quality or task outcome;
- safe permission scope.

Stars are also affected by launch timing, social promotion, mirrors, forks, and unrelated repository content. Deep Code should show stars/forks independently with their timestamp, never turn them into a single “trust” percentage, and never sort a default recommendation solely by stars.

### Auditable recommendation signals

The minimum review card should expose separate fields:

- source repository and exact checked commit;
- package path and whether `dsh.bundle.patch` is present;
- declared runtime/package dependencies;
- license and license-file URL;
- last commit/release date and open issue/PR activity;
- install command copied from upstream, marked as a mutation;
- requested profile and likely layer targets;
- whether a static contract check passed, and what it did **not** check;
- whether Deep Code or a user has manually tested installation, with OS/DSH version;
- reported permissions/capabilities, derived from source inspection only when actually performed;
- upstream and directory timestamps.

Recommendation sorting should be a transparent filter/sort, for example “Windows + MIT + bundle manifest present + updated in last 90 days,” not a hidden trust score. Any editorial “recommended” badge must have a versioned rule file and a reason visible to the user.

## 6. Deep Code adoption boundary

### Adopt now

- Add an opt-in, read-only **Ecosystem Discover** panel.
- Show official discovery guidance (`dsh-plugin` topic) and clearly label community catalogs as independent.
- Start with a pinned reviewed JSON snapshot or a user-triggered GitHub metadata search.
- Show source URL, checked commit, manifest evidence, license, activity date, and “not a security audit.”
- Offer “open upstream page” and “copy install command,” but require an explicit user confirmation before any future install integration.
- Add a source selector and a per-source refresh timestamp.
- Keep catalog operations outside the Agent's execution session; browsing the catalog should not consume model tokens.
- Allow the user to disable ecosystem discovery completely and keep it off by default for sensitive/offline workspaces.

### Adapt later, with explicit contracts

- Add a typed catalog-source adapter interface: `list/search`, `getEntry`, `sourceMetadata`, `checkedAt`, `evidence`, `terms`, and `refreshPolicy`.
- Add a static package evidence checker for `package.json`/`dsh.bundle.patch` without executing the package.
- Add an optional local clone/archive inspection mode that runs only in a separate read-only temporary directory and never imports/executes third-party modules.
- Add compatibility checks against the installed DSH version/profile contract once the official version is pinned and the check is deterministic.
- Add user-confirmed installation through the official `dsh plugin` command only after a backup/diff preview and clear profile target; this is a separate feature from discovery.
- If a source publishes a stable API/feed with permission for programmatic use, add it as a provider with caching, backoff, provenance and kill switch.

### Do not adopt

- No automatic plugin installation, update, activation, or “one click” execution from a listing.
- No background crawling of all directories or sending their pages to an LLM.
- No combined trust score, “safe” badge, or star-only default ranking.
- No silent injection of routing presets, persona text, provider credentials, permissions, or profile patches.
- No claim that `router-standard`, `Flash Max`, `We need`, or similar labels unlock private chain-of-thought or guarantee Codex-level performance.
- No direct use of a third-party directory as a security or compatibility authority.

## 7. Contained MVP proposal

### Name and user flow

Panel: **生态发现 / Ecosystem Discover**.

Default: disabled until the user turns on “允许查看社区生态（仅只读）.”

When enabled:

1. Deep Code loads a pinned catalog snapshot or user-triggered GitHub topic results.
2. It renders cards grouped by capability: UI, tool, skill, memory, model/provider, workflow, runtime.
3. Each card shows `社区来源`, repository, checked commit/date, license, stars/forks (signals only), DSH bundle evidence, and a yellow “未做安全审计” label.
4. “查看源代码” opens the upstream page.
5. “复制安装命令” copies text only and states that running it changes a DSH profile.
6. There is no “安装” button in MVP.
7. A “为什么看到它” popover explains the exact filter/sort rule and source timestamp.

### Small schema

```json
{
  "source": {
    "id": "github-topic",
    "label": "GitHub dsh-plugin topic",
    "url": "https://github.com/topics/dsh-plugin",
    "checkedAt": "2026-08-25T00:00:00Z",
    "contract": "candidate metadata; not a security review"
  },
  "entries": [
    {
      "id": "owner/repo#package/path",
      "repository": "https://github.com/owner/repo",
      "packagePath": ".",
      "checkedCommit": "<40-char-sha>",
      "name": "example",
      "description": "Upstream one-line description",
      "category": "tools",
      "license": "MIT",
      "bundle": { "declared": true, "patchPath": "./cordis.patch.yml" },
      "signals": { "stars": 0, "forks": 0, "lastUpdated": "2026-08-25" },
      "installCommand": "dsh plugin --profile web add ...",
      "evidence": ["manifest-shape-only"],
      "warnings": ["untrusted third-party code"]
    }
  ]
}
```

### Acceptance criteria

- Turning the feature off makes no network request and removes catalog data from the view.
- Catalog refresh never starts Engine and never calls a model.
- No package code is imported, installed, or executed.
- Every card links to the exact upstream repository and records checked timestamp/commit.
- Sorting can be explained in one visible sentence.
- Missing license, missing commit, missing manifest, or stale data is shown as unknown—not inferred as safe.
- Automated tests cover source disablement, schema validation, provenance display, and the no-install/no-exec boundary.

## 8. Relevance to Deep Code's model-routing direction

The routing-suite experiment is worth borrowing at the level of method, not mythology:

- Keep a small, explicit policy layer between task classification and Harness request assembly.
- Test prompt/presentation variants against a fixed task matrix and report variance.
- Preserve a control condition and record model/provider/setting/tool surface.
- Keep routing in the same request when possible; never hide a second classifier call.
- Treat “improvement” as model/task/setting-specific and reversible.
- Make the active policy visible in the Evidence Drawer.

The first safe Deep Code experiment would be **disabled by default** and would use a compact, deterministic task-mode hint (for example, `explain`, `plan`, `implement`, `debug`) only if the pinned Harness seam allows it without replacing the system contract. It should be evaluated on a small local task matrix and removed if it increases token usage, causes extra calls, destabilizes Windows, or reduces verification quality. Do not import the third-party injector wholesale into the desktop app.

## Sources consulted (all accessed 2026-08-25)

- [DeepSeek Harness official repository](https://github.com/deepseek-ai/deepseek-harness)
- [DeepSeek Harness official architecture](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md)
- [DeepSeek Harness official bundle README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/bundle/README.md)
- [DeepSeek Harness official plugin publishing guide](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md)
- [dsh-routing-suite pinned commit](https://github.com/yjh051108/dsh-routing-suite/commit/21a7260d961571c77a11705d2b0e6cf7015cc48b)
- [dsh-routing-suite pinned README](https://github.com/yjh051108/dsh-routing-suite/blob/21a7260d961571c77a11705d2b0e6cf7015cc48b/README.md)
- [dsh-router-standard pinned README](https://github.com/yjh051108/dsh-routing-suite/blob/21a7260d961571c77a11705d2b0e6cf7015cc48b/preset/README.md)
- [dsh-router-standard experiments](https://github.com/yjh051108/dsh-routing-suite/blob/21a7260d961571c77a11705d2b0e6cf7015cc48b/preset/docs/experiments.md)
- [dsh-router-standard correction/apology](https://github.com/yjh051108/dsh-routing-suite/blob/21a7260d961571c77a11705d2b0e6cf7015cc48b/preset/docs/apology.md)
- [DSH Directory website](https://dsh.directory/)
- [DSH Directory source repository at pinned commit](https://github.com/alexchenzl/dsh-plugin-directory/tree/91689d0bb62fcb61fb7bf64b13d430631bd2592b)
- [DSH Market website](https://www.dshplugin.io/)
- [DSH Market source repository](https://github.com/tjsdyy/dshplugin)
- [DeepSeekPlugin directory](https://deepseekplugin.org/en)
- [dsh.pub registry](https://dsh.pub/en/)
- [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)
- [dsh-ecosystem living map](https://github.com/zoahdev/dsh-ecosystem)
