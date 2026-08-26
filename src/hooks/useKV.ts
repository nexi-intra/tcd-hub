import { useState, useEffect, useCallback, useRef } from 'react'

type SetValue<T> = T | ((current: T) => T)

// React hook over the app KV store (window.kv — shared folder in the desktop
// app, localStorage in the browser). Subscribes to changes so edits made by
// other clients/tabs show up live in open views.
export function useKV<T>(key: string, initialValue: T): [T, (value: SetValue<T>) => void, () => void] {
  const [value, setValueState] = useState<T>(initialValue)
  const initialValueRef = useRef(initialValue)

  useEffect(() => {
    let cancelled = false

    const load = () => {
      window.kv.get<T>(key).then((stored) => {
        if (cancelled) return
        if (stored !== undefined) {
          setValueState(stored)
        } else {
          window.kv.set(key, initialValueRef.current)
        }
      })
    }

    load()
    const unsubscribe = window.kv.subscribe((changedKeys) => {
      if (changedKeys.includes(key)) load()
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [key])

  const setValue = useCallback((newValue: SetValue<T>) => {
    setValueState((current) => {
      const next = typeof newValue === 'function' ? (newValue as (current: T) => T)(current) : newValue
      window.kv.set(key, next)
      return next
    })
  }, [key])

  const deleteValue = useCallback(() => {
    window.kv.delete(key)
    setValueState(initialValueRef.current)
  }, [key])

  return [value, setValue, deleteValue]
}
