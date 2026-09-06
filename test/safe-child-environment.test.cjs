const test = require('node:test')
const assert = require('node:assert/strict')

const { sanitizedEnvironment } = require('../src/safe-child-environment.cjs')

test('third-party child environments keep runtime essentials and remove secrets', () => {
  const result = sanitizedEnvironment({
    Path: 'C:\\Windows',
    SystemRoot: 'C:\\Windows',
    USERPROFILE: 'C:\\Users\\person',
    DEEPSEEK_API_KEY: 'secret-one',
    npm_config_authToken: 'secret-two',
    CUSTOM_PASSWORD: 'secret-three',
    NODE_OPTIONS: '--require dangerous.js',
    HTTPS_PROXY: 'http://127.0.0.1:7890'
  })
  assert.equal(result.Path, 'C:\\Windows')
  assert.equal(result.SystemRoot, 'C:\\Windows')
  assert.equal(result.HTTPS_PROXY, 'http://127.0.0.1:7890')
  assert.equal(result.DEEPSEEK_API_KEY, undefined)
  assert.equal(result.npm_config_authToken, undefined)
  assert.equal(result.CUSTOM_PASSWORD, undefined)
  assert.equal(result.NODE_OPTIONS, undefined)
  assert.doesNotMatch(JSON.stringify(result), /secret-/)
})
