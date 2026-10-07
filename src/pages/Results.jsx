import { Link, Navigate, useLocation } from 'react-router-dom'

function messageFor(pct) {
  if (pct === 100) return 'Perfect score. Great work!'
  if (pct >= 80) return 'Strong result. You know this well.'
  if (pct >= 50) return 'Good progress. Review the misses below.'
  return 'Keep practicing. Every miss is something new learned.'
}

export default function Results() {
  const { state } = useLocation()
  // Opening /results directly (no quiz just finished) goes back home.
  if (!state?.results) return <Navigate to="/" replace />

  const { topicId, topicName, results } = state
  const correct = results.filter((r) => r.correct).length
  const pct = Math.round((correct / results.length) * 100)
  const missed = results.filter((r) => !r.correct)

  return (
    <div className="page results">
      <section className="card score-card">
        <div className="score-ring" style={{ '--pct': pct }}>
          <span className="score-pct">{pct}%</span>
        </div>
        <h1 className="page-title">{correct} of {results.length} correct</h1>
        <p className="muted">{topicName}</p>
        <p>{messageFor(pct)}</p>
      </section>

      {missed.length > 0 && (
        <section className="card">
          <h2 className="card-title">Review these</h2>
          <ul className="review-list">
            {missed.map((r) => (
              <li key={r.id}>
                <p className="review-prompt">{r.prompt}</p>
                {r.code && <pre className="code small"><code>{r.code}</code></pre>}
                <p className="review-answer">Answer: <strong>{r.correctAnswer}</strong></p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="stack">
        <Link to={`/quiz/${topicId}`} className="btn btn-primary btn-lg">Try again</Link>
        <Link to="/topics" className="btn btn-secondary btn-lg">Pick another topic</Link>
      </div>
    </div>
  )
}
