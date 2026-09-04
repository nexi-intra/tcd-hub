const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { createStore } = require('./store.cjs')
const { createResilientStore } = require('./offlineSync.cjs')

function temporaryLocalStore(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tcd-hub-offline-test-'))
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  return createStore(directory)
}

/** Minimal stub af en netværks-store — lader tests styre isConnected()/fejl helt præcist uden rigtig fil-I/O. */
function fakeNetworkStore(overrides = {}) {
  return {
    get: () => undefined,
    set: () => {},
    delete: () => {},
    keys: () => [],
    update: (key, op) => op.items ?? [],
    watch: () => () => {},
    isConnected: () => true,
    dumpAll: () => ({}),
    dataDir: '/fake/network/dir',
    ...overrides,
  }
}

function flushMicrotasks() {
  return new Promise((resolve) => setImmediate(resolve))
}

test('get() mirrors a successful network read to the local cache', async (t) => {
  const local = temporaryLocalStore(t)
  const network = fakeNetworkStore({ get: () => [{ id: '1' }] })
  const resilient = createResilientStore(network, local)

  assert.deepEqual(resilient.get('projects'), [{ id: '1' }])
  await flushMicrotasks()
  assert.deepEqual(local.get('projects'), [{ id: '1' }])
})

test('get() falls back to local cache when the network read throws', async (t) => {
  const local = temporaryLocalStore(t)
  local.set('users', { a: 1 })
  const network = fakeNetworkStore({
    get: () => { throw new Error('ENOTCONN') },
  })
  const resilient = createResilientStore(network, local)

  assert.deepEqual(resilient.get('users'), { a: 1 })
})

test('get() ignores a misleading "undefined" from the network once isConnected() is false', async (t) => {
  // Simulerer det farligste tilfælde: et fuldt drev-udfald rapporteres som
  // ENOENT (samme kode som "nøglen findes ikke"), så networkStore.get()
  // returnerer undefined UDEN at kaste. isConnected() (sat af watcheren) er
  // den eneste pålidelige kilde til at vide at dette ikke er en reel
  // "findes ikke"-situation.
  const local = temporaryLocalStore(t)
  local.set('guides', [{ id: 'g1' }])
  const network = fakeNetworkStore({
    isConnected: () => false,
    get: () => { throw new Error('should not be called while disconnected') },
  })
  const resilient = createResilientStore(network, local)

  assert.deepEqual(resilient.get('guides'), [{ id: 'g1' }])
})

test('set() mirrors the written value to the local cache', async (t) => {
  const local = temporaryLocalStore(t)
  let written
  const network = fakeNetworkStore({ set: (key, value) => { written = value } })
  const resilient = createResilientStore(network, local)

  resilient.set('vacation-entries', [{ id: 'v1' }])
  assert.deepEqual(written, [{ id: 'v1' }])

  await flushMicrotasks()
  assert.deepEqual(local.get('vacation-entries'), [{ id: 'v1' }])
})

test('set() still throws when the network write fails, without touching local cache', (t) => {
  const local = temporaryLocalStore(t)
  const network = fakeNetworkStore({ set: () => { throw new Error('network gone') } })
  const resilient = createResilientStore(network, local)

  assert.throws(() => resilient.set('emails', [{ id: 'e1' }]))
  assert.equal(local.get('emails'), undefined)
})

test('update() mirrors the resulting array to the local cache', async (t) => {
  const local = temporaryLocalStore(t)
  const network = fakeNetworkStore({ update: (_key, op) => op.items })
  const resilient = createResilientStore(network, local)

  const result = resilient.update('notes', { op: 'append', items: [{ id: 'n1' }] })
  assert.deepEqual(result, [{ id: 'n1' }])

  await flushMicrotasks()
  assert.deepEqual(local.get('notes'), [{ id: 'n1' }])
})

test('keys() falls back to local cache when disconnected', (t) => {
  const local = temporaryLocalStore(t)
  local.set('shift-roles', [{ id: 'r1' }])
  const network = fakeNetworkStore({ isConnected: () => false, keys: () => { throw new Error('should not be called') } })
  const resilient = createResilientStore(network, local)

  assert.deepEqual(resilient.keys(), ['shift-roles'])
})

test('dataDir and dumpAll delegate to the network store', (t) => {
  const local = temporaryLocalStore(t)
  const network = fakeNetworkStore({ dataDir: '/shared/tcd-hub', dumpAll: () => ({ users: {} }) })
  const resilient = createResilientStore(network, local)

  assert.equal(resilient.dataDir, '/shared/tcd-hub')
  assert.deepEqual(resilient.dumpAll(), { users: {} })
})
