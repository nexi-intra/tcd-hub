const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { createStore } = require('./store.cjs')

function temporaryStore(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tcd-hub-store-test-'))
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  return { directory, store: createStore(directory) }
}

test('missing keys return undefined', (t) => {
  const { store } = temporaryStore(t)
  assert.equal(store.get('missing'), undefined)
})

test('values survive encrypted writes and reads', (t) => {
  const { store } = temporaryStore(t)
  const value = [{ id: '1', name: 'Vagt' }]

  store.set('shift-roles', value)

  assert.deepEqual(store.get('shift-roles'), value)
})

test('an existing unreadable file throws instead of returning undefined', (t) => {
  const { directory, store } = temporaryStore(t)
  fs.writeFileSync(path.join(directory, 'users.json'), '{not valid json')

  assert.throws(() => store.get('users'))
})

test('repeated writes replace the value without leaving temp files', (t) => {
  const { directory, store } = temporaryStore(t)

  store.set('projects', [{ id: 'old' }])
  store.set('projects', [{ id: 'new' }])

  assert.deepEqual(store.get('projects'), [{ id: 'new' }])
  assert.deepEqual(fs.readdirSync(directory), ['projects.json'])
})