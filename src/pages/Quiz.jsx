import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getTopic } from '../data/topics.js'
import { buildQuiz } from '../lib/quiz.js'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function Quiz() {
  const { topicId } = useParams()
  const navigate = useNavigate()
  const topic = topicId === 'all' ? { name: 'Mixed quiz' } : getTopic(topicId)

  // The question list is built once when the screen opens.
  const [questions] = useState(() => buildQuiz(topicId))
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null) // index of the chosen option, or null
  const [results, setResults] = useState([]) // one entry per answered question
  const feedbackRef = useRef(null)

  // After answering, scroll the explanation into view (it can be below the fold on phones).
  useEffect(() => {
    if (selected !== null) feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selected])

  // Each new question starts at the top of the screen.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [index])

  if (!topic || questions.length === 0) {
    return (
      <div className="page empty">
        <h1 className="page-title">No questions yet</h1>
        <p className="muted">This topic doesn't have questions yet. Try another one.</p>
        <Link to="/topics" className="btn btn-primary">Back to topics</Link>
      </div>
    )
  }

  const question = questions[index]
  const answered = selected !== null
  const isLast = index === questions.length - 1
  const progress = ((index + (answered ? 1 : 0)) / questions.length) * 100

  function choose(i) {
    if (answered) return
    setSelected(i)
    setResults((r) => [
      ...r,
      { id: question.id, prompt: question.prompt, code: question.code, correct: i === question.answer,
        correctAnswer: question.options[question.answer] },
    ])
  }

  function next() {
    if (isLast) {
      // `replace` so the back button skips the finished quiz.
      navigate('/results', { replace: true, state: { topicId, topicName: topic.name, results } })
      return
    }
    setIndex(index + 1)
    setSelected(null)
  }

  function optionClass(i) {
    if (!answered) return 'option'
    if (i === question.answer) return 'option correct'
    if (i === selected) return 'option wrong'
    return 'option dimmed'
  }

  return (
    <div className="page quiz">
      <div className="quiz-top">
        <span className="quiz-topic">{topic.name}</span>
        <span className="quiz-counter">{index + 1} / {questions.length}</span>
      </div>
      <div className="progress" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin="0" aria-valuemax="100">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
      </div>

      <section className="card question" key={question.id}>
        {question.type === 'code-output' && <span className="tag">Code output</span>}
        <h1 className="question-prompt">{question.prompt}</h1>
        {question.code && <pre className="code"><code>{question.code}</code></pre>}
      </section>

      <ul className="options">
        {question.options.map((opt, i) => (
          <li key={i}>
            <button className={optionClass(i)} onClick={() => choose(i)} disabled={answered}>
              <span className="option-letter">{LETTERS[i]}</span>
              <span className="option-text">{opt}</span>
            </button>
          </li>
        ))}
      </ul>

      {answered && (
        <section ref={feedbackRef} className={`feedback ${selected === question.answer ? 'is-correct' : 'is-wrong'}`} aria-live="polite">
          <strong>{selected === question.answer ? 'Correct!' : 'Not quite.'}</strong>
          <p>{question.explanation}</p>
        </section>
      )}

      <div className="bottom-bar">
        <button className="btn btn-primary btn-lg" onClick={next} disabled={!answered}>
          {isLast ? 'See results' : 'Next question'}
        </button>
      </div>
    </div>
  )
}
