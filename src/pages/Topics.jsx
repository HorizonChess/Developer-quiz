import { Link } from 'react-router-dom'
import { TOPICS } from '../data/topics.js'
import { countQuestions } from '../lib/quiz.js'

export default function Topics() {
  return (
    <div className="page">
      <h1 className="page-title">Pick a topic</h1>
      <p className="muted">Each quiz shuffles its questions and answers.</p>

      <ul className="topic-list">
        {TOPICS.map((t) => {
          const count = countQuestions(t.id)
          return (
            <li key={t.id}>
              <Link to={`/quiz/${t.id}`} className="topic-card" style={{ '--accent': t.color }}>
                <span className="topic-icon">{t.icon}</span>
                <span className="topic-text">
                  <span className="topic-name">{t.name}</span>
                  <span className="topic-blurb">{t.blurb}</span>
                </span>
                <span className="topic-count">{count} Q</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
