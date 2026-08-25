import { useState, useEffect, useCallback, useRef } from 'react'
import { localKv } from '@/lib/localKvStore'

type SetValue<T> = T | ((current: T) => T)

// React hook over the local persistent KV store (localStorage-backed).
export function useKV<T>(key: string, initialValue: T): [T, (value: SetValue<T>) => void, () => void] {
  const [value, setValueState] = useState<T>(initialValue)
  const initialValueRef = useRef(initialValue)

  useEffect(() => {
    let cancelled = false

    localKv.get<T>(key).then((stored) => {
      if (cancelled) return
      if (stored !== undefined) {
        setValueState(stored)
      } else {
        localKv.set(key, initialValueRef.current)
      }
    })

    return () => {
      cancelled = true
    }
  }, [key])

  const setValue = useCallback((newValue: SetValue<T>) => {
    setValueState((current) => {
      const next = typeof newValue === 'function' ? (newValue as (current: T) => T)(current) : newValue
      localKv.set(key, next)
      return next
    })
  }, [key])

  const deleteValue = useCallback(() => {
    localKv.delete(key)
    setValueState(initialValueRef.current)
  }, [key])

  return [value, setValue, deleteValue]
}
