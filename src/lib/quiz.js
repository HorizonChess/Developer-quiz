import { QUESTION_BANK } from '../data/questions/index.js'
import { makeRandom } from './random.js'

const random = makeRandom()
export const shuffle = random.shuffle

// Turns a bank entry into a concrete question. Templates are run to get a
// fresh variant; fixed questions just pick one of their phrasings.
export function materialize(def, r = random) {
  if (def.generate) {
    const g = def.generate(r)
    const wrong = [...new Set(g.wrong.map(String))].filter((w) => w !== g.correct).slice(0, 3)
    return {
      id: def.id,
      topic: def.topic,
      type: def.type,
      prompt: g.prompt,
      code: g.code,
      options: [g.correct, ...wrong],
      answer: 0,
      explanation: g.explanation,
      check: g.check ?? def.check,
    }
  }
  const prompt = Array.isArray(def.prompt) ? r.pick(def.prompt) : def.prompt
  return { ...def, prompt }
}

// Remembers which questions were asked recently (on this device only), so
// the next quiz prefers ones you haven't seen. Storage can be unavailable
// (private browsing), so failures are ignored.
const RECENT_KEY = 'quiz.recentQuestionIds'
const RECENT_LIMIT = 120

function loadRecent() {
  try {
    const ids = JSON.parse(localStorage.getItem(RECENT_KEY))
    return Array.isArray(ids) ? ids : []
  } catch {
    return []
  }
}

function saveRecent(ids) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, RECENT_LIMIT)))
  } catch {
    // Not saved; the quiz still works.
  }
}

function poolFor(topicId) {
  return topicId === 'all' ? QUESTION_BANK : QUESTION_BANK.filter((q) => q.topic === topicId)
}

// Builds a quiz for a topic ('all' mixes every topic).
// Unseen questions come first; if you've seen them all, the ones seen
// longest ago come next. Answer options are shuffled so the right answer moves.
export function buildQuiz(topicId, count = 10) {
  const recent = loadRecent() // newest first
  const pool = poolFor(topicId)
  const fresh = shuffle(pool.filter((q) => !recent.includes(q.id)))
  const seen = pool
    .filter((q) => recent.includes(q.id))
    .sort((a, b) => recent.indexOf(b.id) - recent.indexOf(a.id))
  const chosen = shuffle([...fresh, ...seen].slice(0, count))

  const chosenIds = chosen.map((q) => q.id)
  saveRecent([...chosenIds, ...recent.filter((id) => !chosenIds.includes(id))])

  return chosen.map((def) => {
    const q = materialize(def)
    const order = shuffle(q.options.map((_, i) => i))
    return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) }
  })
}

export function countQuestions(topicId) {
  return poolFor(topicId).length
}
