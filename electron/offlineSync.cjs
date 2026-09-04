// Kombinerer en netværks-store (det delte drev) med en lokal spejl-store, så
// appen kan blive ved med at læse data, selv når netværksstien er
// utilgængelig. Ingen Electron-imports — almindeligt Node-modul, testbart
// isoleret ligesom store.cjs.
//
// Skrivninger (set/update/delete) rammer STADIG kun netværksstien i denne
// fase — de fejler som i dag hvis forbindelsen er nede (offline skrive-kø er
// en senere fase). Ved succes spejles resultatet til den lokale cache, så den
// altid er nogenlunde frisk, den dag forbindelsen forsvinder.

/**
 * @param {ReturnType<import('./store.cjs').createStore>} networkStore
 * @param {ReturnType<import('./store.cjs').createStore>} localStore
 */
function createResilientStore(networkStore, localStore) {
  /** Best-effort, ikke-blokerende spejling — må aldrig kunne vælte hovedoperationen. */
  function mirrorToLocal(key, value) {
    setImmediate(() => {
      try {
        localStore.set(key, value)
      } catch (err) {
        console.error(`TCD Hub: kunne ikke spejle "${key}" til lokal cache:`, err)
      }
    })
  }

  function get(key, options) {
    if (!networkStore.isConnected()) {
      // Watcheren har allerede opdaget at netværksstien er utilgængelig — stol
      // IKKE på networkStore.get()'s resultat (et fuldt drev-udfald kan
      // fejlagtigt se ud som "nøglen findes ikke"). Server fra lokal cache.
      return localStore.get(key)
    }
    try {
      const value = networkStore.get(key, options)
      if (value !== undefined) mirrorToLocal(key, value)
      return value
    } catch (err) {
      console.error(`TCD Hub: kunne ikke læse "${key}" fra delt lager, bruger lokal cache:`, err)
      return localStore.get(key)
    }
  }

  function set(key, value) {
    networkStore.set(key, value)
    mirrorToLocal(key, value)
  }

  function del(key) {
    networkStore.delete(key)
    setImmediate(() => {
      try {
        localStore.delete(key)
      } catch (err) {
        console.error(`TCD Hub: kunne ikke slette "${key}" fra lokal cache:`, err)
      }
    })
  }

  function keys() {
    if (!networkStore.isConnected()) return localStore.keys()
    try {
      return networkStore.keys()
    } catch (err) {
      console.error('TCD Hub: kunne ikke liste nøgler fra delt lager, bruger lokal cache:', err)
      return localStore.keys()
    }
  }

  function update(key, operation) {
    const result = networkStore.update(key, operation)
    mirrorToLocal(key, result)
    return result
  }

  function watch(onChange, onConnectionChange, intervalMs) {
    return networkStore.watch(onChange, onConnectionChange, intervalMs)
  }

  function isConnected() {
    return networkStore.isConnected()
  }

  function dumpAll() {
    return networkStore.dumpAll()
  }

  return {
    get,
    set,
    delete: del,
    keys,
    update,
    watch,
    isConnected,
    dumpAll,
    get dataDir() {
      return networkStore.dataDir
    },
  }
}

module.exports = { createResilientStore }
