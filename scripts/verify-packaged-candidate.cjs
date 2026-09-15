const { createHash } = require('node:crypto')
const { readFileSync } = require('node:fs')
const { join, resolve, sep } = require('node:path')
const asar = require('@electron/asar')

const CANDIDATE_PARITY_FILES = Object.freeze([
  'src/safe-child-environment.cjs',
  'src/harness-capability-gate.cjs',
  'src/typert-managed-connection.cjs',
  'src/dsh-adapter-v2.cjs',
  'src/candidate-prompt-evidence.cjs',
  'src/candidate-session-lab.cjs',
  'src/candidate-gate-d-runner.cjs',
  'src/runtime-supervisor.cjs'
])

const PRODUCT_ENTRY_FILES = Object.freeze([
  'src/main.cjs',
  'src/preload.cjs',
  'src/renderer/shell.js'
])

const FORBIDDEN_PRODUCT_ENTRY_PATTERNS = Object.freeze([
  /candidate-gate-d-runner/iu,
  /CandidateGateDRunner/u,
  /dsh-015-gate-d-smoke/iu
])

const FORBIDDEN_PACKAGED_FILES = Object.freeze([
  'scripts/dsh-015-gate-d-smoke.cjs'
])

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function parsePackage(buffer, label) {
  try {
    const value = JSON.parse(buffer.toString('utf8'))
    if (value?.name !== 'deep-code' || typeof value.version !== 'string' || !value.version) {
      throw new Error('identity')
    }
    return value
  } catch {
    throw new Error(`${label} package.json 不是预期的 Deep Code 包身份。`)
  }
}

function verifyPackagedCandidate({ sourceRoot, asarPath } = {}) {
  const exactSourceRoot = resolve(sourceRoot || '')
  const exactAsarPath = resolve(asarPath || '')
  if (!sourceRoot || !asarPath) throw new Error('打包候选验证缺少源码目录或 app.asar。')
  const packagedPath = relativePath => relativePath.split('/').join(sep)
  const readPackaged = relativePath => {
    try {
      return asar.extractFile(exactAsarPath, packagedPath(relativePath))
    } catch {
      throw new Error(`打包产物缺少 ${relativePath}。`)
    }
  }
  const sourcePackage = parsePackage(readFileSync(join(exactSourceRoot, 'package.json')), '源码')
  const packagedPackage = parsePackage(readPackaged('package.json'), '打包产物')
  if (sourcePackage.version !== packagedPackage.version) {
    throw new Error(`打包版本 ${packagedPackage.version} 与源码版本 ${sourcePackage.version} 不一致。`)
  }
  for (const relativePath of FORBIDDEN_PACKAGED_FILES) {
    try {
      asar.statFile(exactAsarPath, packagedPath(relativePath))
      throw new Error(`Gate D smoke 验收入口 ${relativePath} 不应进入产品包。`)
    } catch (error) {
      if (error instanceof Error && /不应进入产品包/u.test(error.message)) throw error
    }
  }

  const candidateFiles = CANDIDATE_PARITY_FILES.map(relativePath => {
    const source = readFileSync(join(exactSourceRoot, relativePath))
    const packaged = readPackaged(relativePath)
    const sourceHash = sha256(source)
    const packagedHash = sha256(packaged)
    if (sourceHash !== packagedHash) {
      throw new Error(`打包候选模块 ${relativePath} 与源码不一致。`)
    }
    return { path: relativePath, sha256: sourceHash }
  })

  for (const relativePath of PRODUCT_ENTRY_FILES) {
    const packaged = readPackaged(relativePath).toString('utf8')
    const forbidden = FORBIDDEN_PRODUCT_ENTRY_PATTERNS.find(pattern => pattern.test(packaged))
    if (forbidden) throw new Error(`普通产品入口 ${relativePath} 暴露了 Gate D 执行入口。`)
  }

  return Object.freeze({
    version: 1,
    packageVersion: sourcePackage.version,
    packagedCandidateParity: true,
    productAdmissionClosed: true,
    candidateFiles: Object.freeze(candidateFiles.map(file => Object.freeze(file)))
  })
}

if (require.main === module) {
  try {
    const receipt = verifyPackagedCandidate({
      sourceRoot: process.argv[2],
      asarPath: process.argv[3]
    })
    process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`)
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  }
}

module.exports = { CANDIDATE_PARITY_FILES, PRODUCT_ENTRY_FILES, verifyPackagedCandidate }
