// Checks every question in the bank. Run with: npm test
//
// Besides checking the shape of each question, this runs the code in
// "what does this code print?" questions (with Node, or SQLite for SQL)
// and makes sure the answer marked correct is what really happens.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { DatabaseSync } from 'node:sqlite'
import { QUESTION_BANK } from '../src/data/questions/index.js'
import { TOPICS } from '../src/data/topics.js'
import { materialize } from '../src/lib/quiz.js'
import { makeRandom, seeded } from '../src/lib/random.js'

const run = promisify(execFile)
const SHAPE_SEEDS = 60 // variants generated per template for the shape checks
const CHECK_SEEDS = 6 // variants per template whose code is actually run

function variants(def, seeds) {
  if (def.generate) return Array.from({ length: seeds }, (_, s) => materialize(def, makeRandom(seeded(s + 1))))
  const prompts = Array.isArray(def.prompt) ? def.prompt : [def.prompt]
  return prompts.map((prompt) => materialize({ ...def, prompt }))
}

test('ids are unique and every topic has a full bank', () => {
  const ids = QUESTION_BANK.map((q) => q.id)
  assert.equal(new Set(ids).size, ids.length, 'duplicate question id')
  for (const t of TOPICS) {
    const count = QUESTION_BANK.filter((q) => q.topic === t.id).length
    assert.ok(count >= 20, `${t.id} has only ${count} questions`)
  }
})

test('every variant is a well-formed question', () => {
  for (const def of QUESTION_BANK) {
    for (const q of variants(def, SHAPE_SEEDS)) {
      const where = `${def.id}: ${q.code ?? q.prompt}`
      assert.ok(['multiple-choice', 'code-output'].includes(q.type), `${where} bad type`)
      assert.ok(typeof q.prompt === 'string' && q.prompt.length > 0, `${where} empty prompt`)
      assert.equal(q.options.length, 4, `${where} needs 4 options, got ${JSON.stringify(q.options)}`)
      for (const o of q.options) assert.ok(typeof o === 'string' && o.trim().length > 0, `${where} empty option`)
      assert.equal(new Set(q.options).size, 4, `${where} repeated option ${JSON.stringify(q.options)}`)
      assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4, `${where} bad answer index`)
      assert.ok(q.explanation?.length > 0, `${where} missing explanation`)
    }
  }
})

test('templates really vary', () => {
  for (const def of QUESTION_BANK.filter((d) => d.generate)) {
    const distinct = new Set(variants(def, SHAPE_SEEDS).map((q) => `${q.prompt}|${q.code}|${q.options[q.answer]}`))
    assert.ok(distinct.size >= 3, `${def.id} only produced ${distinct.size} different variants`)
  }
})

async function nodeOutput(code) {
  try {
    const { stdout } = await run(process.execPath, ['-e', code], { timeout: 10000 })
    return stdout.trim().split('\n').join(' ')
  } catch (err) {
    if (err.stdout === undefined) throw err
    const name = /^(\w*Error)\b/m.exec(err.stderr)?.[1]
    return [err.stdout.trim().split('\n').join(' '), name].filter(Boolean).join(' ')
  }
}

function sqlOutput({ sql, query, format }) {
  const db = new DatabaseSync(':memory:')
  db.exec(sql)
  const rows = db.prepare(query).all()
  db.close()
  if (format === 'count') return String(rows.length)
  if (format === 'column') return rows.map((row) => Object.values(row)[0]).join(' ')
  return Object.values(rows[0]).map(String).join(' ') // 'first' row
}

test('code questions print what the correct answer says', async () => {
  const jobs = QUESTION_BANK.filter((d) => d.check || d.generate).flatMap((def) =>
    variants(def, CHECK_SEEDS).filter((q) => q.check).map((q) => ({ def, q })),
  )
  assert.ok(jobs.length > 50, 'expected many checked questions')
  const failures = []
  for (let i = 0; i < jobs.length; i += 16) {
    await Promise.all(
      jobs.slice(i, i + 16).map(async ({ def, q }) => {
        const actual = q.check === 'node' ? await nodeOutput(q.code) : sqlOutput(q.check)
        const expected = q.options[q.answer]
        if (actual !== expected) failures.push(`${def.id}\n${q.code}\n  expected: ${expected}\n  actual:   ${actual}`)
      }),
    )
  }
  assert.deepEqual(failures, [], `\n${failures.join('\n\n')}`)
})
