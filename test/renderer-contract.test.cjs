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

test('credential configuration is write-only and real verification stays a visible task', () => {
  assert.match(html, /<dialog id="credential-dialog"/)
  assert.match(html, /id="model-api-key"[^>]*type="password"/)
  assert.match(html, /id="configure-model-credential"/)
  assert.match(html, /id="clear-model-credential"/)
  assert.match(html, /id="verify-model-connection"/)
  assert.match(preload, /saveDeepSeekCredential/)
  assert.match(preload, /clearDeepSeekCredential/)
  assert.match(preload, /createConnectionTest/)
  assert.doesNotMatch(shell, /localStorage\.(?:setItem|getItem)\([^)]*(?:model|credential|api.?key)/i)
  assert.doesNotMatch(shell, /sessionStorage/)
  assert.doesNotMatch(shell, /credentials\.set|credentials\.unset|DEEPSEEK_API_KEY/)
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

test('completed tasks show a human result card before technical evidence', () => {
  assert.match(html, /id="task-outcome"/)
  assert.match(html, /id="task-outcome-sections"/)
  assert.match(html, /查看运行详情与证据/)
  assert.match(shell, /renderTaskOutcome\(thread\)/)
  assert.match(shell, /state === 'passed' \? '通过' : state === 'failed' \? '未通过' : '未确认'/)
  assert.match(main, /projectTaskOutcome\(thread\)/)
  assert.doesNotMatch(shell, /Everything is probably perfect/)
})

test('the context panel shows verified run state, effective model, evidence, and explicit unavailable usage', () => {
  assert.match(html, /id="current-run-context"/)
  assert.match(html, /id="current-run-model"/)
  assert.match(shell, /Session 当前模型：/)
  assert.match(shell, /toolCount[\s\S]*changedFileCount/)
  assert.match(shell, /run\.usage\?\.available/)
  assert.doesNotMatch(shell, /estimatedCost|estimateTokens/)
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

test('ecosystem discovery is opt-in, read-only, and never offers installation', () => {
  assert.match(html, /id="page-ecosystem"/)
  assert.match(html, /id="ecosystem-enabled"/)
  assert.match(html, /热度.*不是官方商店|社区热度与来源证据/)
  assert.match(preload, /ecosystem:set-enabled/)
  assert.match(main, /EcosystemCatalog/)
  assert.match(shell, /查看上游源代码/)
  assert.doesNotMatch(html + shell, /一键安装|自动安装插件|installEcosystem|dsh plugin --profile/)
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

test('new task opens a blank top-level workspace instead of following the previous task to the bottom', () => {
  assert.match(shell, /selectTask\(''\)/)
  assert.match(shell, /forceFollowNextRender = false\s+mainPanel\.scrollTop = 0\s+renderWorkbench\(\)/)
})

test('an admitted first prompt is not repeated above the conversation and reconnect does not resend it', () => {
  assert.match(shell, /activeTaskPrompt\.classList\.toggle\('hidden', hasHumanMessage\)/)
  assert.match(shell, /retryTaskButton\.classList\.remove\('hidden'\)/)
  assert.match(shell, /canRetry[\s\S]*重新连接任务[\s\S]*重新发送任务/)
  assert.match(main, /retryDisposition\(agent\) === 'reconnect'/)
  assert.match(main, /createSession\(\{ baseUrl: runtime\.url, cwd: settings\.workspacePath, sessionId: thread\.sessionId \}\)/)
})

test('companion cards are labeled as an unapplied experiment', () => {
  assert.match(html, /卡组草稿（未应用）/)
  assert.match(html, /尚未把它们交给 Agent/)
  assert.match(html, /选择一张卡不等于生效/)
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
