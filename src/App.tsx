import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import './App.css'
import { useTokenStorage } from './hooks/useTokenStorage'

const WINDOW_WIDTH = 300

function App() {
  const { total, history, subtract } = useTokenStorage()
  const [input, setInput] = useState<string>('')
  const [showHistory, setShowHistory] = useState<boolean>(false)
  const recentSubtractions = history.slice(0, 5)
  const cardRef = useRef<HTMLElement | null>(null)

  const handleSubtract = () => {
    const n = Number(input)
    if (!isFinite(n) || n <= 0) return
    subtract(n)
    setInput('')
  }

  // Resize the Electron window to exactly fit the card (plus a small margin for shadow).
  useLayoutEffect(() => {
    const el = cardRef.current
    if (!el) return

    const applySize = () => {
      const height = Math.ceil(el.getBoundingClientRect().height) + 24
      window.tokenBridge?.setSize?.(WINDOW_WIDTH, height)
    }

    applySize()
    const ro = new ResizeObserver(applySize)
    ro.observe(el)
    return () => ro.disconnect()
  }, [showHistory, history.length])

  // Listen for hide/show or other host-driven UI events if needed in future.
  useEffect(() => {
    document.body.classList.add('overlay-body')
    return () => document.body.classList.remove('overlay-body')
  }, [])

  return (
    <div className="app-root">
      <main className="counter-card" ref={cardRef}>
        <h1 className="label">Total Tokens</h1>
        <div className="total-display" aria-live="polite">{total.toLocaleString()}</div>

        <div className="controls">
          <input
            type="number"
            min="0"
            className="num-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Amount to subtract"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubtract() }}
          />
          <button className="btn" onClick={handleSubtract}>Subtract</button>
        </div>

        <button
          className="dropdown-btn"
          type="button"
          onClick={() => setShowHistory((s) => !s)}
          aria-expanded={showHistory}
        >
          {showHistory ? 'Hide Last 5' : 'Show Last 5'}
        </button>

        {showHistory ? (
          <section className="recent-wrap" aria-live="polite">
            {recentSubtractions.length === 0 ? (
              <p className="recent-empty">No subtractions yet.</p>
            ) : (
              <ul className="recent-list">
                {recentSubtractions.map((item) => (
                  <li key={item.id} className="recent-item">
                    <span className="recent-amount">-{item.amount.toLocaleString()}</span>
                    <span className="recent-after">{item.after.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </main>
    </div>
  )
}

export default App
