import { QUESTIONS } from '../data/questions.js'

// Fisher–Yates shuffle: a standard, fair way to randomize an array.
// Returns a new array and leaves the original untouched.
export function shuffle(items) {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Builds a quiz for a topic ('all' mixes every topic).
// Answer options are shuffled too, so the right answer moves around.
export function buildQuiz(topicId, count = 10) {
  const pool = topicId === 'all' ? QUESTIONS : QUESTIONS.filter((q) => q.topic === topicId)
  return shuffle(pool)
    .slice(0, count)
    .map((q) => {
      const order = shuffle(q.options.map((_, i) => i))
      return {
        ...q,
        options: order.map((i) => q.options[i]),
        answer: order.indexOf(q.answer),
      }
    })
}

export function countQuestions(topicId) {
  return topicId === 'all' ? QUESTIONS.length : QUESTIONS.filter((q) => q.topic === topicId).length
}
