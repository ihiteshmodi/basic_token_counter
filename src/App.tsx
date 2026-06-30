import { useState } from 'react'
import './App.css'
import { useTokenStorage } from './hooks/useTokenStorage'

function App() {
  const { total, history, subtract } = useTokenStorage()
  const [input, setInput] = useState<string>('')
  const recentSubtractions = history.slice(0, 5)

  const handleSubtract = () => {
    const n = Number(input)
    if (!isFinite(n) || n <= 0) return
    subtract(n)
    setInput('')
  }

  return (
    <div className="app-root">
      <main className="counter-card">
        <h1 className="label">Total Tokens</h1>
        <div className="total-display" aria-live="polite">{total.toLocaleString()}</div>

        <div className="controls">
          <input
            type="number"
            min="0"
            className="num-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter amount to subtract"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubtract() }}
          />
          <button className="btn" onClick={handleSubtract}>Subtract</button>
        </div>

        <section className="recent-wrap" aria-live="polite">
          <h2 className="recent-title">Last 5 Subtractions</h2>
          {recentSubtractions.length === 0 ? (
            <p className="recent-empty">No subtractions yet.</p>
          ) : (
            <ul className="recent-list">
              {recentSubtractions.map((item) => (
                <li key={item.id} className="recent-item">
                  <span className="recent-amount">-{item.amount.toLocaleString()}</span>
                  <span className="recent-after">Remaining: {item.after.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
