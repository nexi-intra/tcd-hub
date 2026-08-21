import { useState, useEffect, useCallback, useRef } from 'react'
import { sessionKv } from '@/lib/sessionKvStore'

type SetValue<T> = T | ((current: T) => T)

// Drop-in replacement for @github/spark/hooks' useKV, backed by sessionStorage instead of the Spark KV service.
export function useKV<T>(key: string, initialValue: T): [T, (value: SetValue<T>) => void, () => void] {
  const [value, setValueState] = useState<T>(initialValue)
  const initialValueRef = useRef(initialValue)

  useEffect(() => {
    let cancelled = false

    sessionKv.get<T>(key).then((stored) => {
      if (cancelled) return
      if (stored !== undefined) {
        setValueState(stored)
      } else {
        sessionKv.set(key, initialValueRef.current)
      }
    })

    return () => {
      cancelled = true
    }
  }, [key])

  const setValue = useCallback((newValue: SetValue<T>) => {
    setValueState((current) => {
      const next = typeof newValue === 'function' ? (newValue as (current: T) => T)(current) : newValue
      sessionKv.set(key, next)
      return next
    })
  }, [key])

  const deleteValue = useCallback(() => {
    sessionKv.delete(key)
    setValueState(initialValueRef.current)
  }, [key])

  return [value, setValue, deleteValue]
}
