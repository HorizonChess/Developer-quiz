import { Link } from 'react-router-dom'
import { TOPICS } from '../data/topics.js'

export default function Home() {
  return (
    <div className="page home">
      <section className="hero">
        <p className="eyebrow">Interview practice</p>
        <h1>Get ready for your first developer job.</h1>
        <p className="lead">
          Short quizzes with real interview questions, clear explanations, and a fresh mix every time.
        </p>
      </section>

      <div className="stack">
        <Link to="/quiz/all" className="btn btn-primary btn-lg">Start a mixed quiz</Link>
        <Link to="/topics" className="btn btn-secondary btn-lg">Choose a topic</Link>
      </div>

      <section className="card">
        <h2 className="card-title">What you'll practice</h2>
        <ul className="chip-list">
          {TOPICS.map((t) => (
            <li key={t.id} className="chip" style={{ '--chip': t.color }}>{t.name}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
