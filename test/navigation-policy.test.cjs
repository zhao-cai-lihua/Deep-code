const test = require('node:test')
const assert = require('node:assert/strict')
const { pathToFileURL } = require('node:url')

const { isAllowedAppNavigation } = require('../src/navigation-policy.cjs')

test('the privileged window may navigate only to its exact local app page', () => {
  const appPage = 'C:\\app\\renderer\\index.html'
  assert.equal(isAllowedAppNavigation(pathToFileURL(appPage).href, appPage), true)
  assert.equal(isAllowedAppNavigation(`${pathToFileURL(appPage).href}#section`, appPage), true)
  assert.equal(isAllowedAppNavigation('file:///C:/Users/person/Desktop/other.html', appPage), false)
  assert.equal(isAllowedAppNavigation('http://127.0.0.1:4321/', appPage), false)
  assert.equal(isAllowedAppNavigation('https://example.com/', appPage), false)
})
