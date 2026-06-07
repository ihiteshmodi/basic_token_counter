import React from 'react'
import { useTokenStorage } from '../hooks/useTokenStorage'
import './HistoryPanel.css'

function fmt(ts: number) {
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return String(ts)
  }
}

export default function HistoryPanel() {
  const { history } = useTokenStorage()

  if (!history || history.length === 0) {
    return (
      <div className="history-root">
        <h2>History</h2>
        <div className="empty">No operations yet</div>
      </div>
    )
  }

  return (
    <div className="history-root">
      <h2>History</h2>
      <ul className="history-list">
        {history.map((h) => (
          <li key={h.id} className="history-item">
            <div className="hist-main">
              <span className="hist-amount">-{h.amount.toLocaleString()}</span>
              <span className="hist-before">{h.before.toLocaleString()} →</span>
              <span className="hist-after">{h.after.toLocaleString()}</span>
            </div>
            <div className="hist-time">{fmt(h.ts)}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
