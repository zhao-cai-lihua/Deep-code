const test = require('node:test')
const assert = require('node:assert/strict')

const { ImageDraftStore } = require('../src/image-draft-store.cjs')

function store(files = {}) {
  let nextId = 0
  return new ImageDraftStore({
    readFile: async (path) => Buffer.from(files[path] || ''),
    inspectImage: () => ({ width: 640, height: 480 }),
    createId: () => `image-${++nextId}`,
    maxImageBytes: 10,
    maxImagesPerScope: 3,
    maxScopeBytes: 20
  })
}

test('keeps unsent image drafts isolated by task scope and hides local paths', async () => {
  const drafts = store({ 'C:\\private\\one.png': 'png', 'C:\\private\\two.jpg': 'jpg' })
  await drafts.addFiles('task-a', ['C:\\private\\one.png'])
  await drafts.addFiles('task-b', ['C:\\private\\two.jpg'])

  assert.equal(drafts.list('task-a')[0].name, 'one.png')
  assert.match(drafts.list('task-a')[0].previewUrl, /^deep-code-image:\/\/draft\//)
  assert.doesNotMatch(drafts.list('task-a')[0].previewUrl, /^data:/)
  assert.equal(drafts.list('task-b')[0].name, 'two.jpg')
  assert.doesNotMatch(JSON.stringify(drafts.list('task-a')), /private/)
  assert.deepEqual(drafts.list('new-task'), [])
})

test('resolves prompt images without consuming them until the caller confirms send', async () => {
  const drafts = store({ 'C:\\one.png': 'png' })
  const [draft] = await drafts.addFiles('new-task', ['C:\\one.png'])

  assert.deepEqual(drafts.resolve('new-task', [draft.id]), [{
    type: 'image', mediaType: 'image/png', data: Buffer.from('png').toString('base64'), name: 'one.png'
  }])
  assert.equal(drafts.list('new-task').length, 1)
  assert.equal(drafts.preview('new-task', draft.id).data.toString(), 'png')
  drafts.remove('new-task', draft.id)
  assert.deepEqual(drafts.list('new-task'), [])
})

test('moves new-task drafts to the created task and enforces an atomic intake limit', async () => {
  const drafts = store({ 'C:\\one.png': '1', 'C:\\two.png': '22', 'C:\\large.png': '01234567890' })
  const items = await drafts.addFiles('new-task', ['C:\\one.png', 'C:\\two.png'])
  drafts.moveScope('new-task', 'task-1')
  assert.deepEqual(drafts.list('new-task'), [])
  assert.deepEqual(drafts.list('task-1').map((item) => item.id), items.map((item) => item.id))

  await assert.rejects(() => drafts.addFiles('task-1', ['C:\\large.png']), /超过 10 B/)
  assert.equal(drafts.list('task-1').length, 2)
})

test('rejects unsupported files before reading them into a prompt', async () => {
  const drafts = store({ 'C:\\notes.txt': 'text' })
  await assert.rejects(() => drafts.addFiles('task-a', ['C:\\notes.txt']), /只支持 PNG、JPEG、WebP 或 GIF/)
})
