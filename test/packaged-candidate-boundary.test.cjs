const test = require('node:test')
const assert = require('node:assert/strict')
const { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { dirname, join } = require('node:path')
const asar = require('@electron/asar')

const {
  CANDIDATE_PARITY_FILES,
  PRODUCT_ENTRY_FILES,
  verifyPackagedCandidate
} = require('../scripts/verify-packaged-candidate.cjs')

function writeFixture(root, relativePath, content) {
  const target = join(root, relativePath)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, content, 'utf8')
}

async function packageFixture({ mutatePackaged } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'deep-code-packaged-gate-d-'))
  const sourceRoot = join(root, 'source')
  const packagedRoot = join(root, 'packaged')
  mkdirSync(sourceRoot, { recursive: true })
  mkdirSync(packagedRoot, { recursive: true })
  writeFixture(sourceRoot, 'package.json', JSON.stringify({ name: 'deep-code', version: 'test-version' }))
  writeFixture(packagedRoot, 'package.json', JSON.stringify({ name: 'deep-code', version: 'test-version' }))
  for (const relativePath of CANDIDATE_PARITY_FILES) {
    const content = `module:${relativePath}:trusted\n`
    writeFixture(sourceRoot, relativePath, content)
    writeFixture(packagedRoot, relativePath, content)
  }
  for (const relativePath of PRODUCT_ENTRY_FILES) {
    const content = `entry:${relativePath}:ordinary-product\n`
    writeFixture(sourceRoot, relativePath, content)
    writeFixture(packagedRoot, relativePath, content)
  }
  mutatePackaged?.({ root, sourceRoot, packagedRoot })
  const asarPath = join(root, 'app.asar')
  await asar.createPackage(packagedRoot, asarPath)
  return { root, sourceRoot, asarPath }
}

test('proves exact candidate module parity while ordinary packaged entrypoints remain closed', async t => {
  const fixture = await packageFixture()
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }))

  const receipt = verifyPackagedCandidate({
    sourceRoot: fixture.sourceRoot,
    asarPath: fixture.asarPath
  })

  assert.equal(receipt.version, 1)
  assert.equal(receipt.packageVersion, 'test-version')
  assert.equal(receipt.packagedCandidateParity, true)
  assert.equal(receipt.productAdmissionClosed, true)
  assert.equal(receipt.candidateFiles.length, CANDIDATE_PARITY_FILES.length)
  assert.ok(receipt.candidateFiles.every(file => /^[a-f0-9]{64}$/u.test(file.sha256)))
})

test('rejects a package that includes the paid Gate D smoke entrypoint', async t => {
  const fixture = await packageFixture({
    mutatePackaged({ packagedRoot }) {
      writeFixture(packagedRoot, 'scripts/dsh-015-gate-d-smoke.cjs', 'send-provider-prompt\n')
    }
  })
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }))

  assert.throws(() => verifyPackagedCandidate({
    sourceRoot: fixture.sourceRoot,
    asarPath: fixture.asarPath
  }), /Gate D smoke.*不应进入产品包/u)
})

test('rejects a packaged candidate module that differs from reviewed source', async t => {
  const fixture = await packageFixture({
    mutatePackaged({ packagedRoot }) {
      writeFixture(packagedRoot, 'src/candidate-gate-d-runner.cjs', 'module:tampered\n')
    }
  })
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }))

  assert.throws(() => verifyPackagedCandidate({
    sourceRoot: fixture.sourceRoot,
    asarPath: fixture.asarPath
  }), /candidate-gate-d-runner\.cjs.*与源码不一致/u)
})

test('rejects an ordinary packaged entrypoint that imports the Gate D runner', async t => {
  const fixture = await packageFixture({
    mutatePackaged({ packagedRoot }) {
      writeFixture(packagedRoot, 'src/main.cjs', "require('./candidate-gate-d-runner.cjs')\n")
    }
  })
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }))

  assert.throws(() => verifyPackagedCandidate({
    sourceRoot: fixture.sourceRoot,
    asarPath: fixture.asarPath
  }), /普通产品入口 src\/main\.cjs.*Gate D/u)
})

test('exposes one zero-token npm command for verifying the current packaged candidate', () => {
  const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'))
  assert.equal(
    packageJson.scripts['verify:package:candidate'],
    'node scripts/verify-packaged-candidate.cjs . dist/win-unpacked/resources/app.asar'
  )
})
