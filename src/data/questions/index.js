// The question bank: one file per topic.
//
// There are two kinds of entries:
//
// 1. Fixed questions, written out in full:
//      { id, type, prompt, code?, options, answer, explanation }
//    `prompt` can be a list of phrasings; one is picked at random.
//    `answer` is the index of the correct option (0 = first).
//
// 2. Templates, which build a fresh variant every time:
//      { id, type, generate(r) }
//    generate gets a random kit (see src/lib/random.js) and returns
//      { prompt, code?, correct, wrong: [...], explanation }
//    Only 3 wrong answers are shown; extras are backups in case two match.
//
// `type` is 'multiple-choice' or 'code-output' ("what does this code print?").
// Optional `check` is only used by the tests, which run the code for real
// and make sure the "correct" answer is what actually happens:
//   'node'                     run the code with Node and compare the output
//   { sql, query, format }     (from generate) run the query in SQLite
import javascript from './javascript.js'
import htmlCss from './htmlCss.js'
import react from './react.js'
import node from './node.js'
import sql from './sql.js'
import web from './web.js'

const BY_TOPIC = {
  javascript,
  'html-css': htmlCss,
  react,
  node,
  sql,
  web,
}

export const QUESTION_BANK = Object.entries(BY_TOPIC).flatMap(([topic, list]) =>
  list.map((q) => ({ ...q, topic })),
)
