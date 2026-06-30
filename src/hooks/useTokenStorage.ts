import { useCallback, useEffect, useRef, useState } from 'react'

export type HistoryEntry = {
  id: string
  amount: number
  before: number
  after: number
  ts: number
}

const HISTORY_KEY = 'tokenHistory'
const DEFAULT_TOTAL = 39000

function readHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    return JSON.parse(raw) as HistoryEntry[]
  } catch {
    return []
  }
}

async function fetchInitialTotal(): Promise<number> {
  try {
    const resp = await fetch('/initialTotal.json', { cache: 'no-store' })
    if (!resp.ok) return DEFAULT_TOTAL
    const data = await resp.json()
    const n = Number(data?.initialTotal)
    return Number.isFinite(n) ? n : DEFAULT_TOTAL
  } catch {
    return DEFAULT_TOTAL
  }
}

function hasBridge() {
  return typeof window !== 'undefined' && !!window.tokenBridge
}

export function useTokenStorage() {
  // Initialize to DEFAULT and then immediately load from API/public file on mount.
  const [total, setTotal] = useState<number>(DEFAULT_TOTAL)
  const totalRef = useRef<number>(DEFAULT_TOTAL)

  const [history, setHistory] = useState<HistoryEntry[]>(() => readHistory())
  const historyRef = useRef<HistoryEntry[]>(readHistory())

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
    } catch {
      // ignore
    }
    historyRef.current = history
  }, [history])

  useEffect(() => {
    totalRef.current = total
  }, [total])

  const subtract = useCallback((amount: number) => {
    if (!isFinite(amount) || amount <= 0) return
    const before = totalRef.current
    let after = before - amount
    if (after < 0) after = 0

    const entry: HistoryEntry = {
      id: String(Date.now()),
      amount,
      before,
      after,
      ts: Date.now(),
    }

    totalRef.current = after
    setTotal(after)
    const nextHistory = [entry, ...historyRef.current]
    setHistory(nextHistory)

    // Persist to Electron store when available.
    ;(async () => {
      if (hasBridge()) {
        await window.tokenBridge!.setData({ total: after, history: nextHistory })
      }
    })()
  }, [])

  const set = useCallback((value: number) => {
    if (!isFinite(value) || value < 0) return
    const v = Math.max(0, Math.floor(value))
    totalRef.current = v
    setTotal(v)
    ;(async () => {
      if (hasBridge()) {
        await window.tokenBridge!.setData({ total: v, history: historyRef.current })
      }
    })()
  }, [])

  const reset = useCallback(() => {
    ;(async () => {
      const initial = await fetchInitialTotal()
      totalRef.current = initial
      setTotal(initial)
      setHistory([])
      historyRef.current = []
      if (hasBridge()) {
        await window.tokenBridge!.setData({ total: initial, history: [] })
      }
    })()
  }, [])

  // On mount: fetch initialTotal.json and, if the stored total equals the previously applied
  // initial value (or there's no stored total), apply the new file initial. This allows editing
  // `public/initialTotal.json` and having the change take effect after a reload when the user
  // hasn't changed the stored total.
  useEffect(() => {
    ;(async () => {
      if (hasBridge()) {
        const data = await window.tokenBridge!.getData()
        const loadedTotal = Number(data?.total)
        const loadedHistory = Array.isArray(data?.history) ? data.history : []
        const safeTotal = Number.isFinite(loadedTotal) ? loadedTotal : DEFAULT_TOTAL
        totalRef.current = safeTotal
        setTotal(safeTotal)
        setHistory(loadedHistory)
        historyRef.current = loadedHistory
        return
      }

      const initial = await fetchInitialTotal()
      totalRef.current = initial
      setTotal(initial)
      // Browser fallback for non-electron runs.
    })()
  }, [])

  return { total, history, subtract, set, reset }
}

export default useTokenStorage
