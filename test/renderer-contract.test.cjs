const test = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')

const root = join(__dirname, '..')
const html = readFileSync(join(root, 'src', 'renderer', 'index.html'), 'utf8')
const shell = readFileSync(join(root, 'src', 'renderer', 'shell.js'), 'utf8')
const styles = readFileSync(join(root, 'src', 'renderer', 'shell.css'), 'utf8')
const preload = readFileSync(join(root, 'src', 'preload.cjs'), 'utf8')
const main = readFileSync(join(root, 'src', 'main.cjs'), 'utf8')

test('Deep code is the only user-facing workbench instead of a link to the Harness UI', () => {
  assert.doesNotMatch(html, /open-harness|打开官方 Harness|在官方 Harness 中继续/)
  assert.doesNotMatch(shell, /openHarness/)
  assert.doesNotMatch(preload, /openHarness|host:open-harness/)
})

test('workspace creation uses an in-app form and never depends on window.prompt', () => {
  assert.match(html, /<dialog id="workspace-dialog"/)
  assert.match(html, /id="workspace-dialog-name"/)
  assert.doesNotMatch(shell, /window\.prompt/)
})

test('workspace protection shows the active path and distinguishes opening the form from creating files', () => {
  assert.match(html, /id="settings-workspace-path"/)
  assert.match(html, /id="open-workspace"/)
  assert.match(html, /id="sidebar-open-workspace"/)
  assert.match(shell, /位置：\$\{normalized\}/)
  assert.match(html, /下一步才会真正创建/)
  assert.match(preload, /openWorkspace/)
})

test('first-run actions expose visible and accessible progress state', () => {
  assert.match(html, /id="setup-progress"[^>]*aria-live="polite"/)
  assert.match(shell, /runVisibleAction/)
  assert.match(shell, /aria-busy/)
})

test('model connection is presented as a normalized human-facing snapshot', () => {
  assert.match(html, /id="model-status-label"/)
  assert.match(html, /id="model-status-message"/)
  assert.match(html, /id="model-catalog-summary"/)
  assert.match(html, /id="check-model-connection"/)
  assert.match(html, /id="setup-check-model"/)
  assert.match(preload, /modelConnection/)
  assert.match(shell, /modelConnection/)
  assert.doesNotMatch(shell, /llm\.providers|llm\.models|credentials\.describe|settings\.describe/)
})

test('model service manager separates configuration facts from real verification', () => {
  assert.match(html, /id="page-model-services"/)
  assert.match(html, /Provider、模型目录、凭据、真实验证和当前任务/)
  assert.match(preload, /model-services:snapshot/)
  assert.match(main, /projectModelServices/)
  assert.match(shell, /provider\.verification/)
  assert.match(shell, /读取这些状态不会调用模型/)
  assert.match(shell, /createVisibleConnectionTest/)
  assert.doesNotMatch(shell, /credential\.configured[^\n]{0,100}真实调用成功/)
})

test('connection verification binds an explicit Harness route and never trusts an empty session default', () => {
  assert.match(shell, /验证这个服务/)
  assert.match(shell, /openProviderVerification/)
  assert.match(shell, /createConnectionTest\(routing\)/)
  assert.match(preload, /createConnectionTest: \(routing\)/)
  assert.match(main, /create-connection-test'[\s\S]*manualSelection\?\.provider[\s\S]*manualSelection\?\.model/)
  assert.match(main, /launchTask\(thread, \{ routing \}\)/)
  assert.match(main, /kind: 'launch-failed'/)
  assert.match(main, /Session 默认路线不作为本轮采用证据/)
  const verificationFunction = shell.match(/async function createVisibleConnectionTest[\s\S]*?\n}/)?.[0] || ''
  assert.doesNotMatch(verificationFunction, /window\.confirm/)
})

test('credential configuration is write-only and real verification stays a visible task', () => {
  assert.match(html, /<dialog id="credential-dialog"/)
  assert.match(html, /id="model-api-key"[^>]*type="password"/)
  assert.match(html, /id="configure-model-credential"/)
  assert.match(html, /id="clear-model-credential"/)
  assert.match(html, /id="verify-model-connection"/)
  assert.match(html, /id="credential-provider-choice"/)
  assert.match(preload, /saveModelCredential/)
  assert.match(preload, /clearModelCredential/)
  assert.match(preload, /createConnectionTest/)
  assert.doesNotMatch(shell, /localStorage\.(?:setItem|getItem)\([^)]*(?:model|credential|api.?key)/i)
  assert.doesNotMatch(shell, /sessionStorage/)
  assert.doesNotMatch(shell, /credentials\.set|credentials\.unset|DEEPSEEK_API_KEY/)
})

test('model services can be created from the Harness provider directory without exposing wire details to the Renderer', () => {
  assert.match(html, /id="add-model-provider"/)
  assert.match(html, /id="provider-dialog"/)
  assert.match(html, /id="provider-api-key"[^>]*type="password"/)
  assert.match(preload, /addModelProvider/)
  assert.match(main, /dshAdapter\.provisionCatalogProvider/)
  assert.match(shell, /desktopHost\.addModelProvider/)
  assert.doesNotMatch(shell, /settings\.mutate|credentials\.set|OPENAI_API_KEY|ANTHROPIC_API_KEY/)
})

test('provider selection remains stable and success echoes the exact provisioned Harness route', () => {
  assert.match(shell, /providerChoice\.addEventListener\('change', updateProviderChoiceDescription\)/)
  assert.doesNotMatch(shell, /providerChoice\.addEventListener\('change', renderProviderChoices\)/)
  assert.match(shell, /const previousProvider = providerChoice\.value[\s\S]*providerChoice\.value = previousProvider/)
  assert.match(main, /const provisioned = await dshAdapter\.provisionCatalogProvider[\s\S]*return \{ provisioned, snapshot \}/)
  assert.match(main, /active\.credential\?\.ref !== provisioned\.credentialRef/)
  assert.match(shell, /result\.provisioned\.name[\s\S]*result\.provisioned\.provider/)
})

test('managed catalog providers can be removed as a profile instead of only clearing their credential', () => {
  assert.match(html, /id="remove-model-provider"/)
  assert.match(preload, /removeModelProvider/)
  assert.match(main, /host:remove-model-provider[\s\S]*removeCatalogProvider/)
  assert.match(shell, /desktopHost\.removeModelProvider/)
  assert.match(shell, /清除.*凭据并移除 Provider Profile/)
  const removalHandler = shell.match(/removeModelProviderButton\.addEventListener\('click',[\s\S]*?\n\}\)\nclearModelCredentialButton/ )?.[0] || ''
  assert.doesNotMatch(removalHandler, /window\.confirm/)
  assert.match(removalHandler, /再次点击确认移除/)
})

test('adding a model provider uses the real Engine readiness seam', () => {
  assert.match(main, /host:add-model-provider[\s\S]*?await ensureEngineReady\(\)/)
  assert.doesNotMatch(main, /ensureRuntimeReady\(/)
})

test('Decision Gates use human actions while the Renderer stays outside the Harness wire protocol', () => {
  assert.match(html, /id="decision-gates"[^>]*aria-live="polite"/)
  assert.match(html, /id="activity-timeline"/)
  assert.match(preload, /respondToInteraction/)
  assert.match(shell, /只允许这一次/)
  assert.match(shell, /提交回答/)
  assert.doesNotMatch(shell, /api\/respond|approvalId|rpcId|allowed-once|question\/requested/)
  assert.doesNotMatch(preload, /api\/events\.mux|api\/respond|allowed-once/)
})

test('an unanswered Decision Gate pauses snapshot polling so selected options and typed answers remain stable', () => {
  assert.match(shell, /thread\.agent\?\.live\?\.interactions\?\.length[\s\S]*return/)
  assert.match(shell, /等待你的回答时暂停自动刷新/)
})

test('Decision Gate activity refreshes its idle timeout and recovery stays visible in the conversation', () => {
  assert.match(preload, /workbench:touch-interaction/)
  assert.match(main, /liveSession\.touchInteraction/)
  assert.match(shell, /form\.addEventListener\('input', touchIdleWindow\)/)
  assert.match(html, /id="task-recovery"/)
  assert.match(shell, /recovery\.nextAction/)
})

test('recovery guidance appears at the latest edge of the conversation instead of only in the sidebar', () => {
  const feedIndex = html.indexOf('id="conversation-feed"')
  const decisionIndex = html.indexOf('id="decision-gates"')
  const recoveryIndex = html.indexOf('id="task-recovery"')
  const composerIndex = html.indexOf('id="task-composer"')
  assert.ok(feedIndex >= 0 && decisionIndex >= 0 && recoveryIndex >= 0 && composerIndex >= 0)
  assert.ok(feedIndex < decisionIndex)
  assert.ok(decisionIndex < recoveryIndex)
  assert.ok(recoveryIndex < composerIndex)
})

test('a running task exposes a stop control beside the composer', () => {
  assert.match(html, /id="composer-stop"/)
  assert.match(shell, /composerStopButton\.addEventListener\('click', stopActiveTask\)/)
  assert.match(shell, /composerStopButton\.classList\.toggle\('hidden', thread\.engineState !== 'running'\)/)
})

test('conversation separates the final answer from collapsible run evidence', () => {
  assert.match(html, /id="run-details"/)
  assert.match(html, /id="permission-facts"/)
  assert.match(html, /id="changed-files"/)
  assert.match(html, /完整运行上下文与技术证据/)
  assert.match(shell, /appendResponseText/)
  assert.match(shell, /不作为你的发言显示/)
  assert.match(html, /markdown-it\.umd\.min\.js/)
  assert.match(html, /markdown-runtime\.js/)
  assert.match(preload, /openExternal/)
  assert.match(html, /id="tool-cards"/)
  assert.match(shell, /renderDiffCard/)
  assert.match(shell, /renderTerminalCard/)
  assert.match(shell, /renderReadCard/)
  assert.match(shell, /renderSearchCard/)
  assert.match(shell, /renderWebCard/)
  assert.match(shell, /live-draft/)
  assert.match(shell, /尚未定稿；Harness 提交后会由正式任务记录替换/)
  assert.match(styles, /live-draft-pulse/)
  assert.match(html, /id="jump-latest"/)
  assert.match(html, /reading-runtime\.js/)
  assert.match(shell, /deepCodeReading\.capture/)
  assert.match(shell, /deepCodeReading\.restore/)
  assert.match(shell, /复制回答/)
  assert.match(shell, /复制代码/)
  assert.match(preload, /copyText/)
  assert.match(main, /host:copy-text/)
  assert.doesNotMatch(shell, /navigator\.clipboard|document\.execCommand/)
})

test('each task owns its disclosure state and task switches close shared dialogs', () => {
  assert.match(html, /task-view-state\.cjs/)
  assert.match(shell, /captureTaskViewState\(lastRenderedThreadId\)/)
  assert.match(shell, /restoreTaskViewState\(selectedThreadId\)/)
  assert.match(shell, /dataset\.cardId/)
  assert.match(shell, /selectedThreadId !== lastRenderedThreadId && handoffDialog\.open/)
})

test('Engine startup explains that only model tasks consume model tokens', () => {
  assert.match(html, /启动只会运行本机 Engine，不会调用模型，也不消耗模型 token/)
  assert.match(html, /发送任务或创建真实验证任务才会调用模型/)
})

test('completed tasks show a compact human result in the fixed sidebar with evidence in trace', () => {
  assert.match(html, /id="task-outcome"/)
  assert.match(html, /id="task-outcome-sections"/)
  assert.match(html, /id="sidebar-run-panel"/)
  assert.match(html, /data-task-view="trace"/)
  assert.match(shell, /setTaskView\('trace'\)/)
  assert.match(shell, /renderTaskOutcome\(thread\)/)
  assert.match(shell, /state === 'passed' \? '通过' : state === 'failed' \? '未通过' : '未确认'/)
  assert.match(main, /projectTaskOutcome\(thread\)/)
  assert.doesNotMatch(shell, /Everything is probably perfect/)
})

test('completed work has a Harness-backed visual receipt without introducing a second execution truth', () => {
  assert.match(html, /data-task-view="receipt"/)
  assert.match(html, /id="outcome-map"/)
  assert.match(shell, /renderOutcomeMap\(outcome\?\.map\)/)
  assert.match(shell, /setTaskView\('trace'\)/)
  assert.match(main, /projectTaskOutcome\(thread\)/)
})

test('work receipts translate high-impact changes and rollback uncertainty for beginners', () => {
  assert.match(shell, /需要你留意的高影响改动/)
  assert.match(shell, /任务与改动归属/)
  assert.match(shell, /recoveryAssessment/)
  assert.match(shell, /任务开始前的本地 Git 基线/)
  assert.match(shell, /没有可用的 Git HEAD（与模型连接无关）/)
  assert.match(html, /改动归属来自任务开始前的本地 Git 基线/)
})

test('the sidebar run panel shows verified run state, effective model, evidence, and explicit unavailable usage', () => {
  assert.match(html, /id="current-run-context"/)
  assert.match(html, /id="current-run-model"/)
  assert.match(shell, /本轮实际采用/)
  assert.match(shell, /Session 已选择/)
  assert.match(shell, /toolCount[\s\S]*changedFileCount/)
  assert.match(shell, /run\.usage\?\.available/)
  assert.doesNotMatch(shell, /estimatedCost|estimateTokens/)
})

test('the composer exposes explicit model selection while Harness remains selection truth', () => {
  assert.doesNotMatch(html, /id="work-mode"|目标 Goal|规划 Plan|执行 Build|验收 Verify/)
  assert.match(html, /id="model-route-dialog"/)
  assert.match(html, /id="model-choice"/)
  assert.match(html, /id="effort-choice"/)
  assert.match(html, /沿用 Harness 当前设置/)
  assert.match(shell, /modelRoutingCatalog/)
  assert.match(preload, /workbench:model-catalog/)
  assert.match(main, /chooseModelRoute/)
  assert.match(main, /dshAdapter\.modelDirectory/)
  assert.match(main, /dshAdapter\.selectModel/)
  assert.doesNotMatch(main + shell, /inferRole|strongestEffort|scoreModel|自动选择/)
  assert.doesNotMatch(shell, /gpt-5\.6-sol|gpt-5\.6-luna|deepseek-v4-pro/)
})

test('image drafts stay task-scoped and send only through the desktop host', () => {
  assert.match(html, /id="image-draft-rail"/)
  assert.match(html, /id="add-images"/)
  assert.match(html, /img-src 'self' deep-code-image:/)
  assert.match(shell, /function composerScope\(\)/)
  assert.match(shell, /if \(!prompt && !imageDrafts\.length\)/)
  assert.match(shell, /desktopHost\.pickImages\(composerScope\(\)\)/)
  assert.match(shell, /desktopHost\.removeImage\(composerScope\(\), draft\.id\)/)
  assert.match(preload, /workbench:pick-images/)
  assert.match(main, /ImageDraftStore/)
  assert.match(main, /protocol\.registerSchemesAsPrivileged/)
  assert.match(main, /protocol\.handle\('deep-code-image'/)
  assert.doesNotMatch(shell, /FileReader|arrayBuffer\(|readAsDataURL/)
})

test('ecosystem discovery stays opt-in and gates real installation behind static checks and confirmation', () => {
  assert.match(html, /id="page-ecosystem"/)
  assert.match(html, /id="ecosystem-enabled"/)
  assert.match(html, /热度不是信任评分/)
  assert.match(preload, /ecosystem:set-enabled/)
  assert.match(preload, /ecosystem:prepare-install/)
  assert.match(preload, /ecosystem:install/)
  assert.match(main, /EcosystemCatalog/)
  assert.match(shell, /查看上游源代码/)
  assert.match(shell, /检查并安装/)
  assert.match(shell, /window\.confirm/)
  assert.doesNotMatch(html + shell, /一键安装|自动安装插件/)
})

test('projects and Skills have a read-only control center backed by Harness truth', () => {
  assert.match(html, /id="page-control-center"/)
  assert.match(html, /id="control-project"/)
  assert.match(html, /id="control-skill-list"/)
  assert.match(preload, /control-center:snapshot/)
  assert.match(main, /dshAdapter\.listSkills/)
  assert.match(shell, /refreshControlCenter/)
  assert.doesNotMatch(html + shell, /一键启用 Skill|安装全部 Skills/)
})

test('local memory is reviewable and remains disconnected from Engine prompts', () => {
  assert.match(html, /id="page-memory"/)
  assert.match(html, /候选记忆不会进入任务提示词/)
  assert.match(html, /id="memory-candidate-list"/)
  assert.match(html, /id="memory-confirmed-list"/)
  assert.match(preload, /memory:snapshot/)
  assert.match(preload, /memory:review/)
  assert.match(main, /new MemoryCandidateStore/)
  assert.match(main, /enginePromptConnected: false/)
  assert.match(main, /sourceRefs: \['user:manual'\]/)
  assert.match(main, /sensitivity: 'private'/)
  assert.match(main, /candidates: memoryStore\.list\('candidate'\)\.map\(present\)/)
  assert.match(shell, /reviewMemoryCandidate\(record\.id, 'confirmed'\)/)
  assert.match(shell, /reviewMemoryCandidate\(record\.id, 'rejected'\)/)
  assert.doesNotMatch(main, /buildProjectBriefPrompt\([^)]*memory|dshAdapter\.prompt\([^)]*memory/)
})

test('memory retrieval previews scope and match evidence without changing a task', () => {
  assert.match(html, /id="memory-preview-query"/)
  assert.match(html, /id="memory-preview-results"/)
  assert.match(preload, /memory:preview/)
  assert.match(main, /previewMemoryRetrieval/)
  assert.match(shell, /preview\.modelCalled|没有调用模型/)
  assert.match(shell, /preview\.estimatedCharacters/)
  assert.doesNotMatch(shell, /sendMessage\([^)]*memoryPreview|createTask\([^)]*memoryPreview/)
})

test('selected memory context is revalidated and shown exactly before any future handoff', () => {
  assert.match(html, /id="compose-memory-preview"/)
  assert.match(html, /id="memory-context-text"/)
  assert.match(html, /尚未发送/)
  assert.match(preload, /memory:compose-preview/)
  assert.match(main, /composeMemoryContext/)
  assert.match(shell, /selectedMemoryIds/)
  assert.match(shell, /result\.characterCount/)
  assert.match(shell, /没有发送给 Engine/)
  assert.doesNotMatch(main, /memory:compose-preview[\s\S]{0,500}dshAdapter\.prompt/)
})

test('new task opens a blank top-level workspace instead of following the previous task to the bottom', () => {
  assert.match(shell, /selectTask\(''\)/)
  assert.match(shell, /forceFollowNextRender = false\s+mainPanel\.scrollTop = 0\s+renderWorkbench\(\)/)
})

test('an admitted first prompt is not repeated above the conversation and reconnect does not resend it', () => {
  assert.match(shell, /activeTaskPrompt\.classList\.toggle\('hidden', hasHumanMessage\)/)
  assert.match(shell, /retryTaskButton\.classList\.remove\('hidden'\)/)
  assert.match(shell, /canRetry[\s\S]*重新连接任务[\s\S]*重新发送任务/)
  assert.match(main, /retryDisposition\(agent\) === 'reconnect'/)
  assert.match(main, /createSession\(\{ baseUrl: runtime\.url, cwd: thread\.workspacePath \|\| settings\.workspacePath, sessionId: thread\.sessionId \}\)/)
})

test('the unapplied companion-card experiment is absent from the product and runtime bridge', () => {
  assert.doesNotMatch(html, /角色与协作卡|卡组草稿|page-cards/)
  assert.doesNotMatch(shell, /cardSnapshot|refreshCards|setActiveCard/)
  assert.doesNotMatch(preload + main, /cards:snapshot|cards:set-active|ReplyModeStore|CompanionCardStore/)
})

test('workspace creation and selection are available in the fixed left sidebar', () => {
  assert.match(html, /id="sidebar-create-workspace"/)
  assert.match(html, /id="sidebar-select-workspace"/)
  assert.match(shell, /sidebarCreateWorkspace\.addEventListener/)
  assert.match(shell, /sidebarSelectWorkspace\.addEventListener/)
  assert.match(shell, /async function selectWorkspace\(\)[\s\S]*selectTask\(''\)[\s\S]*旧任务仍留在各自启动时的项目中/)
})

test('an old task exposes its bound project and can explicitly make it the new-task workspace', () => {
  assert.match(html, /id="use-task-workspace"/)
  assert.match(preload, /useTaskWorkspace/)
  assert.match(main, /host:use-task-workspace/)
  assert.match(shell, /thread\.workspacePath[\s\S]*useTaskWorkspaceButton/)
  assert.match(shell, /desktopHost\.useTaskWorkspace/)
})

test('MVP visual identity stays local, themeable, and respectful of reduced motion', () => {
  assert.match(html, /assets\/deep-code-whale\.png/)
  assert.match(html, /id="theme-toggle"/)
  assert.match(shell, /deep-code-theme/)
  assert.match(styles, /prefers-reduced-motion:\s*reduce/)
  assert.match(styles, /@keyframes page-enter/)
  assert.match(styles, /@keyframes disclosure-enter/)
  assert.doesNotMatch(html + shell, /three\.js|webgl|vertex shader/i)
})
