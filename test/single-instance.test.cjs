const test = require('node:test')
const assert = require('node:assert/strict')
const { acquireSingleInstance } = require('../src/single-instance.cjs')

test('quits a second process before it can become another task-store writer', () => {
  let quit = 0
  const app = { requestSingleInstanceLock: () => false, quit: () => { quit += 1 }, on: () => { throw new Error('must not subscribe') } }
  assert.equal(acquireSingleInstance({ app }), false)
  assert.equal(quit, 1)
})

test('focuses the existing window when a second launch is attempted', () => {
  let secondInstance
  let restored = 0
  let focused = 0
  const window = { isDestroyed: () => false, isMinimized: () => true, restore: () => { restored += 1 }, focus: () => { focused += 1 } }
  const app = { requestSingleInstanceLock: () => true, quit: () => {}, on: (name, callback) => { if (name === 'second-instance') secondInstance = callback } }
  assert.equal(acquireSingleInstance({ app, getWindow: () => window }), true)
  secondInstance()
  assert.equal(restored, 1)
  assert.equal(focused, 1)
})
