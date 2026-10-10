import { DOMAINS, LABELS, PEOPLE, RESOURCES } from '../pools.js'

const STATUS_SCENARIOS = [
  { code: '201 Created', when: 'a new {s} was created successfully' },
  { code: '204 No Content', when: 'a {s} was deleted and there is nothing to send back' },
  { code: '400 Bad Request', when: 'the request body for a new {s} is missing a required field' },
  { code: '401 Unauthorized', when: 'someone asks for a {s} without being logged in' },
  { code: '403 Forbidden', when: 'a logged-in user tries to edit a {s} that belongs to someone else' },
  { code: '404 Not Found', when: 'the client asks for a {s} id that does not exist' },
  { code: '409 Conflict', when: 'a new {s} is rejected because one with the same unique name already exists' },
  { code: '429 Too Many Requests', when: 'one client is requesting {p} hundreds of times per second' },
  { code: '500 Internal Server Error', when: 'the server crashes with a bug while loading a {s}' },
]

const EVENT_NAMES = ['login', 'order', 'message', 'upload', 'signup']
const ACCENTED_WORDS = ['café', 'naïve', 'jalapeño', 'über', 'crème', 'Zoë', 'piñata', 'résumé', 'hi👋', 'ok👍']
const FN_NAMES = ['loadUser', 'fetchOrder', 'readConfig', 'saveItem', 'getPrices']
const SCRIPT_NAMES = [
  { name: 'dev', cmd: 'nodemon server.js' },
  { name: 'lint', cmd: 'eslint .' },
  { name: 'build', cmd: 'vite build' },
  { name: 'seed', cmd: 'node scripts/seed.js' },
  { name: 'format', cmd: 'prettier --write .' },
]

// Every ordering of a list (used to build wrong answers for ordering questions).
const permutations = (items) =>
  items.length <= 1 ? [items] : items.flatMap((x, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((p) => [x, ...p]))

export default [
  // ---------- Templates ----------
  {
    id: 'node-event-loop',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const kinds = r.shuffle(['sync', 'sync', 'tick', 'promise', 'timeout'])
      const labels = r.sample(LABELS, kinds.length)
      const lines = kinds.map((kind, i) => {
        const log = `console.log("${labels[i]}")`
        if (kind === 'sync') return log
        if (kind === 'tick') return `process.nextTick(() => ${log})`
        if (kind === 'promise') return `Promise.resolve().then(() => ${log})`
        return `setTimeout(() => ${log}, 0)`
      })
      const ordered = (groups) => groups.flatMap((k) => labels.filter((_, i) => kinds[i] === k)).join(' ')
      return {
        prompt: 'This file is run with node. In what order are the words printed?',
        code: lines.join('\n'),
        correct: ordered(['sync', 'tick', 'promise', 'timeout']),
        wrong: [
          ordered(['sync', 'promise', 'tick', 'timeout']),
          ordered(['sync', 'timeout', 'tick', 'promise']),
          labels.join(' '),
          ordered(['tick', 'sync', 'promise', 'timeout']),
        ],
        explanation: 'Synchronous code runs first. Then Node empties the process.nextTick queue, then the promise (microtask) queue. Timers like setTimeout(..., 0) run last, in a later turn of the event loop.',
      }
    },
  },
  {
    id: 'node-readfile-order',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const [a, b, c] = r.sample(LABELS, 3)
      return {
        prompt: 'In what order are the words printed?',
        code: `const fs = require("fs")\n\nconsole.log("${a}")\nfs.readFile("notes.txt", () => console.log("${b}"))\nconsole.log("${c}")`,
        correct: `${a} ${c} ${b}`,
        wrong: [`${a} ${b} ${c}`, `${b} ${a} ${c}`, `${c} ${a} ${b}`],
        explanation: 'fs.readFile is asynchronous. Node starts reading the file in the background and keeps going, so the last console.log runs first. The callback runs when the read finishes. (fs.readFileSync would block and print in written order, but it freezes a server while it waits.)',
      }
    },
  },
  {
    id: 'node-rest-method',
    type: 'multiple-choice',
    generate(r) {
      const { plural, singular } = r.pick(RESOURCES)
      const id = r.int(2, 99)
      const actions = [
        { what: `create a new ${singular}`, req: `POST /${plural}` },
        { what: `get the ${singular} with id ${id}`, req: `GET /${plural}/${id}` },
        { what: `replace the whole ${singular} with id ${id}`, req: `PUT /${plural}/${id}` },
        { what: `change only one field of the ${singular} with id ${id}`, req: `PATCH /${plural}/${id}` },
        { what: `delete the ${singular} with id ${id}`, req: `DELETE /${plural}/${id}` },
        { what: `list all ${plural}`, req: `GET /${plural}` },
      ]
      const target = r.pick(actions)
      const bad = [`POST /${plural}/delete/${id}`, `GET /create-${singular}`, `POST /${plural}/${id}`, `GET /${plural}?id=${id}&action=update`]
      return {
        prompt: `In a REST API, which request should ${target.what}?`,
        correct: target.req,
        wrong: r.shuffle([...actions.filter((a) => a.req !== target.req).map((a) => a.req), ...bad]),
        explanation: 'REST uses nouns in the URL (/' + plural + ') and the HTTP method as the verb: GET reads, POST creates, PUT replaces, PATCH partly updates, DELETE removes.',
      }
    },
  },
  {
    id: 'node-status-scenario',
    type: 'multiple-choice',
    generate(r) {
      const { plural, singular } = r.pick(RESOURCES)
      const [target, ...others] = r.sample(STATUS_SCENARIOS, 4)
      return {
        prompt: `Your API should respond when ${target.when.replace('{s}', singular).replace('{p}', plural)}. Which status code fits best?`,
        correct: target.code,
        wrong: others.map((o) => o.code),
        explanation: 'Status codes are grouped: 2xx success, 4xx the client did something wrong, 5xx the server failed. 401 means "who are you?" (not logged in); 403 means "I know you, but you can\'t do this".',
      }
    },
  },
  {
    id: 'node-express-middleware',
    type: 'code-output',
    generate(r) {
      const [lg, la, lp, lu, le] = r.sample(LABELS, 5)
      const entries = r.shuffle([
        { label: lg, kind: 'use', code: `app.use((req, res, next) => {\n  console.log("${lg}"); next()\n})` },
        { label: la, kind: 'use', prefix: '/admin', code: `app.use("/admin", (req, res, next) => {\n  console.log("${la}"); next()\n})` },
        { label: lp, kind: 'get', path: '/products', code: `app.get("/products", (req, res) => {\n  console.log("${lp}"); res.send("ok")\n})` },
        { label: lu, kind: 'get', path: '/admin/users', code: `app.get("/admin/users", (req, res) => {\n  console.log("${lu}"); res.send("ok")\n})` },
      ])
      // A trailing middleware placed after the routes is never reached once a route responds.
      entries.push({ label: le, kind: 'use', code: `app.use((req, res, next) => {\n  console.log("${le}"); next()\n})` })
      const path = r.pick(['/products', '/admin/users'])
      const printed = []
      const matching = []
      let stopped = false
      for (const e of entries) {
        const matches = e.kind === 'get' ? e.path === path : !e.prefix || path.startsWith(e.prefix)
        if (!matches) continue
        matching.push(e.label)
        if (!stopped) printed.push(e.label)
        if (e.kind === 'get') stopped = true
      }
      return {
        prompt: `A browser requests GET ${path}. What does the server log?`,
        code: entries.map((e) => e.code).join('\n'),
        correct: printed.join(' '),
        wrong: [matching.join(' '), entries.map((e) => e.label).join(' '), printed.slice(-1).join(' '), [...printed].reverse().join(' '), [...printed, le].join(' ')],
        explanation: 'Express runs middleware and routes in the order they were added. app.use("/admin") only matches paths starting with /admin. Calling next() passes control on; a route that sends a response without calling next() ends the chain, so anything after it is skipped.',
      }
    },
  },
  {
    id: 'node-json-stringify',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const name = r.pick(PEOPLE)
      const age = r.int(18, 70)
      const dropped = r.pick([
        { code: 'password: undefined', why: 'undefined values' },
        { code: 'greet() { return "hi" }', why: 'functions' },
      ])
      return {
        prompt: 'What does this code print?',
        code: `const user = { name: "${name}", age: ${age}, ${dropped.code} }\nconsole.log(JSON.stringify(user))`,
        correct: `{"name":"${name}","age":${age}}`,
        wrong: [
          `{"name":"${name}","age":"${age}"}`,
          `{name:"${name}",age:${age}}`,
          dropped.why === 'functions' ? `{"name":"${name}","age":${age},"greet":{}}` : `{"name":"${name}","age":${age},"password":null}`,
          `{"name":"${name}","age":${age},"password":"undefined"}`,
        ],
        explanation: `JSON keys always use double quotes, numbers stay numbers, and ${dropped.why} are left out because JSON has no way to represent them.`,
      }
    },
  },
  {
    id: 'node-semver',
    type: 'multiple-choice',
    generate(r) {
      const major = r.int(1, 5)
      const minor = r.int(2, 9)
      const patch = r.int(1, 9)
      const caret = r.chance()
      const range = `${caret ? '^' : '~'}${major}.${minor}.${patch}`
      const ok = caret ? `${major}.${minor + r.int(1, 5)}.0` : `${major}.${minor}.${patch + r.int(1, 9)}`
      const notOk = [
        `${major + 1}.0.0`,
        `${major}.${minor}.${patch - 1}`,
        caret ? `${major - 1}.${minor}.${patch}` : `${major}.${minor + 1}.0`,
        `${major}.${minor - 1}.${patch + 1}`,
      ]
      return {
        prompt: `package.json lists "${range}" for a dependency. Which version can npm install?`,
        correct: ok,
        wrong: notOk,
        explanation: caret
          ? `^ (caret) allows newer minor and patch versions but keeps the major version: >= ${major}.${minor}.${patch} and < ${major + 1}.0.0. A new major version may contain breaking changes.`
          : `~ (tilde) only allows newer patch versions: >= ${major}.${minor}.${patch} and < ${major}.${minor + 1}.0.`,
      }
    },
  },
  {
    id: 'node-microtask-order',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const [a, b, c, d] = r.sample(LABELS, 4)
      const L = (x) => `console.log("${x}")`
      const scenario = r.pick([
        {
          code: `Promise.resolve()\n  .then(() => ${L(a)})\n  .then(() => ${L(b)})\nPromise.resolve().then(() => ${L(c)})\n${L(d)}`,
          order: [d, a, c, b],
          why: `The synchronous log runs first. Each .then waits for the one before it, so "${b}" is only queued after "${a}" has run, and by then "${c}" is already waiting in the queue.`,
        },
        {
          code: `setImmediate(() => ${L(a)})\nprocess.nextTick(() => ${L(b)})\nPromise.resolve().then(() => ${L(c)})\n${L(d)}`,
          order: [d, b, c, a],
          why: 'Synchronous code runs first, then the nextTick queue, then promise callbacks. setImmediate waits for a later turn of the event loop, so it comes last.',
        },
        {
          code: `setTimeout(() => ${L(a)}, 0)\nPromise.resolve().then(() => ${L(b)})\n${L(c)}\n${L(d)}`,
          order: [c, d, b, a],
          why: 'Both synchronous logs run first. Promise callbacks (microtasks) run as soon as the current code finishes, before any timer, even one with a 0 ms delay.',
        },
      ])
      const written = scenario.code.match(/"(\w+)"/g).map((s) => s.slice(1, -1))
      const others = permutations(scenario.order).filter((p) => p.join(' ') !== scenario.order.join(' ') && p.join(' ') !== written.join(' '))
      return {
        prompt: r.pick(['In what order are the words printed?', 'What does this code print, in order?']),
        code: scenario.code,
        correct: scenario.order.join(' '),
        wrong: [written.join(' '), ...r.sample(others, 4).map((p) => p.join(' '))],
        explanation: scenario.why,
      }
    },
  },
  {
    id: 'node-emitter-order',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const ev = r.pick(EVENT_NAMES)
      const [a, b, c, d] = r.sample(LABELS, 4)
      const head = 'const EventEmitter = require("events")\nconst bus = new EventEmitter()\n'
      const scenario = r.pick([
        {
          body: `bus.on("${ev}", () => console.log("${a}"))\nbus.on("${ev}", () => console.log("${b}"))\nconsole.log("${c}")\nbus.emit("${ev}")\nconsole.log("${d}")`,
          correct: [c, a, b, d],
          wrong: [[c, d, a, b], [a, b, c, d], [c, b, a, d], [c, d]],
          why: 'emit() is synchronous: it calls every listener right away, in the order they were added, before the next line runs.',
        },
        {
          body: `console.log("${c}")\nbus.emit("${ev}")\nbus.on("${ev}", () => console.log("${a}"))\nbus.emit("${ev}")\nconsole.log("${b}")`,
          correct: [c, a, b],
          wrong: [[c, a, a, b], [c, b, a], [c, b], [a, c, a, b]],
          why: 'An event emitted before anyone listens is simply lost; EventEmitter does not store it. Only the second emit has a listener, and it runs immediately.',
        },
        {
          body: `bus.once("${ev}", () => console.log("${a}"))\nbus.on("${ev}", () => console.log("${b}"))\nbus.emit("${ev}")\nbus.emit("${ev}")\nconsole.log("${c}")`,
          correct: [a, b, b, c],
          wrong: [[a, b, a, b, c], [c, a, b, b], [a, b, c], [b, a, b, c]],
          why: 'A listener added with once() runs the first time only and is then removed. Listeners added with on() run every time the event is emitted.',
        },
      ])
      return {
        prompt: 'What does this code print?',
        code: head + scenario.body,
        correct: scenario.correct.join(' '),
        wrong: scenario.wrong.map((w) => w.join(' ')),
        explanation: scenario.why,
      }
    },
  },
  {
    id: 'node-buffer-length',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const word = r.pick(ACCENTED_WORDS)
      const chars = word.length
      const bytes = new TextEncoder().encode(word).length
      const form = r.pick(['Buffer.byteLength(word)', 'Buffer.from(word).length'])
      return {
        prompt: 'What does this code print?',
        code: `const word = "${word}"\nconsole.log(word.length, ${form})`,
        correct: `${chars} ${bytes}`,
        wrong: [`${chars} ${chars}`, `${bytes} ${chars}`, `${bytes} ${bytes}`, `${chars} ${chars * 2}`],
        explanation: 'string.length counts UTF-16 code units (roughly characters), while a Buffer counts bytes. In UTF-8, letters like é take 2 bytes and emoji take 4, so the byte count is bigger. This matters for things like Content-Length headers.',
      }
    },
  },
  {
    id: 'node-path-helpers',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const root = r.pick(['srv', 'app', 'home'])
      const dir = r.pick(['src', 'lib', 'public', 'data'])
      const sub = r.pick(['images', 'utils', 'docs'])
      const file = r.pick(['report', 'index', 'config', 'notes'])
      const ext = r.pick(['json', 'js', 'txt', 'md'])
      const ext2 = r.pick(['backup', 'min', 'test', 'old'])
      const scenario = r.pick([
        {
          call: `path.join("/${root}", "${dir}", "..", "${file}.${ext}")`,
          correct: `/${root}/${file}.${ext}`,
          wrong: [`/${root}/${dir}/../${file}.${ext}`, `/${root}/${dir}/${file}.${ext}`, `/${file}.${ext}`],
          why: 'path.join glues the parts with / and then cleans up the result: ".." removes the folder before it.',
        },
        {
          call: `path.extname("${file}.${ext2}.${ext}")`,
          correct: `.${ext}`,
          wrong: [`.${ext2}.${ext}`, ext, `.${ext2}`],
          why: 'path.extname returns only the last extension, including its dot.',
        },
        {
          call: `path.basename("/${root}/${dir}/${file}.${ext}", ".${ext}")`,
          correct: file,
          wrong: [`${file}.${ext}`, dir, `/${root}/${dir}`],
          why: 'path.basename returns the last part of a path. If you pass the extension as the second argument, it is cut off too.',
        },
        {
          call: `path.join("${dir}", "./${sub}", "${file}.${ext}")`,
          correct: `${dir}/${sub}/${file}.${ext}`,
          wrong: [`${dir}/./${sub}/${file}.${ext}`, `/${dir}/${sub}/${file}.${ext}`, `${dir}${sub}${file}.${ext}`],
          why: 'path.join adds the / separators and drops "." (which means "this folder"). It does not add a leading / if the first part had none.',
        },
      ])
      return {
        prompt: 'What does this code print on Linux or macOS?',
        code: `const path = require("path")\nconsole.log(${scenario.call})`,
        correct: scenario.correct,
        wrong: scenario.wrong,
        explanation: `${scenario.why} Using the path module instead of gluing strings by hand also handles Windows backslashes for you.`,
      }
    },
  },
  {
    id: 'node-url-parts',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const domain = r.pick(DOMAINS)
      const port = r.pick([3000, 4000, 8080, 5000])
      const { plural } = r.pick(RESOURCES)
      const id = r.int(2, 99)
      const page = r.int(2, 9)
      const sort = r.pick(['name', 'date', 'price'])
      const props = [
        { expr: 'url.hostname', correct: domain, wrong: [`${domain}:${port}`, `https://${domain}`, `/${plural}/${id}`] },
        { expr: 'url.host', correct: `${domain}:${port}`, wrong: [domain, `https://${domain}:${port}`, `${domain}:${port}/${plural}`] },
        { expr: 'url.pathname', correct: `/${plural}/${id}`, wrong: [`/${plural}/${id}?page=${page}&sort=${sort}`, `${plural}/${id}`, `/${plural}`] },
        { expr: 'url.search', correct: `?page=${page}&sort=${sort}`, wrong: [`page=${page}&sort=${sort}`, `?page=${page}`, `/${plural}/${id}?page=${page}&sort=${sort}`] },
        { expr: 'url.searchParams.get("page")', correct: String(page), wrong: [`page=${page}`, `?page=${page}`, 'undefined'] },
        { expr: 'url.searchParams.get("limit")', correct: 'null', wrong: ['undefined', '0', '""'] },
      ]
      const p = r.pick(props)
      return {
        prompt: 'What does this code print?',
        code: `const url = new URL("https://${domain}:${port}/${plural}/${id}?page=${page}&sort=${sort}")\nconsole.log(${p.expr})`,
        correct: p.correct,
        wrong: p.wrong,
        explanation: 'The URL class splits an address into parts: hostname is just the domain, host adds the port, pathname is the path without the query, and search is the query string with its "?". searchParams.get returns the value as a string, or null if it is missing.',
      }
    },
  },
  {
    id: 'node-exports-vs-module-exports',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const [k1, k2] = r.sample(['port', 'limit', 'retries', 'timeout'], 2)
      const v1 = r.int(2, 9)
      const v2 = r.int(10, 99)
      const both = `{"${k1}":${v1},"${k2}":${v2}}`
      const only1 = `{"${k1}":${v1}}`
      const only2 = `{"${k2}":${v2}}`
      const scenario = r.pick([
        { body: `exports.${k1} = ${v1}\n  exports.${k2} = ${v2}`, correct: both, why: 'Adding properties to exports works, because exports points at the same object as module.exports.' },
        { body: `exports = { ${k1}: ${v1} }`, correct: '{}', why: 'Assigning exports = {...} only changes the local variable. module.exports still points at the original empty object, and that is what gets returned.' },
        { body: `module.exports = { ${k1}: ${v1} }\n  exports.${k2} = ${v2}`, correct: only1, why: `After module.exports is replaced, exports still points at the old object, so ${k2} is added to an object nobody returns.` },
        { body: `exports.${k1} = ${v1}\n  module.exports = { ${k2}: ${v2} }`, correct: only2, why: `${k1} went onto the original object, but module.exports was then replaced, and only module.exports is returned.` },
      ])
      return {
        prompt: 'Node wraps every CommonJS file like the load() function below. What does this code print?',
        code: `function load(file) {\n  const module = { exports: {} }\n  file(module.exports, module)\n  return module.exports // what require() gives back\n}\n\nconst result = load((exports, module) => {\n  ${scenario.body}\n})\nconsole.log(JSON.stringify(result))`,
        correct: scenario.correct,
        wrong: r.shuffle([both, only1, only2, '{}', 'undefined'].filter((w) => w !== scenario.correct)),
        explanation: `require() returns module.exports. ${scenario.why} Rule of thumb: either add properties to exports, or replace module.exports, not both.`,
      }
    },
  },
  {
    id: 'node-json-parse-result',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const inputs = [
        { src: `'{"id": 5}'`, text: '{"id": 5}' },
        { src: `"{'id': 5}"`, text: "{'id': 5}" },
        { src: `'[1, 2,]'`, text: '[1, 2,]' },
        { src: `'"5"'`, text: '"5"' },
        { src: `'5'`, text: '5' },
        { src: `'{id: 5}'`, text: '{id: 5}' },
        { src: `'null'`, text: 'null' },
        { src: `'true'`, text: 'true' },
      ]
      const input = r.pick(inputs)
      let correct
      try {
        correct = typeof JSON.parse(input.text)
      } catch {
        correct = 'SyntaxError'
      }
      const tempting = correct === 'SyntaxError' ? 'object' : 'SyntaxError'
      const rest = ['object', 'string', 'number', 'boolean', 'SyntaxError', 'undefined'].filter((w) => w !== correct && w !== tempting)
      return {
        prompt: 'What does this code print?',
        code: `try {\n  const data = JSON.parse(${input.src})\n  console.log(typeof data)\n} catch (err) {\n  console.log(err.name)\n}`,
        correct,
        wrong: [tempting, ...r.shuffle(rest)],
        explanation: 'JSON is stricter than JavaScript: keys and strings need double quotes, and trailing commas are not allowed. Invalid text makes JSON.parse throw a SyntaxError, so wrap it in try/catch. Plain values like "5", 5, true or null are valid JSON too (typeof null is "object").',
      }
    },
  },
  {
    id: 'node-promisify',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const fn = r.pick(['add', 'sum', 'combine'])
      const x = r.int(2, 9)
      const y = r.int(2, 9)
      const label = r.pick(LABELS)
      const fails = r.chance()
      const msg = r.pick(['offline', 'timeout', 'denied'])
      const err = fails ? `new Error("${msg}")` : 'null'
      const result = fails ? msg : String(x + y)
      return {
        prompt: 'What does this code print?',
        code: `const util = require("util")\n\nfunction ${fn}(a, b, callback) {\n  setTimeout(() => callback(${err}, a + b), 10)\n}\n\nconst ${fn}Async = util.promisify(${fn})\n${fn}Async(${x}, ${y})\n  .then((result) => console.log(result))\n  .catch((err) => console.log(err.message))\nconsole.log("${label}")`,
        correct: `${label} ${result}`,
        wrong: [`${result} ${label}`, `${label} undefined`, fails ? `${label} ${x + y}` : `${label} null`, label],
        explanation: 'util.promisify turns a Node-style callback function (callback(error, result)) into one that returns a promise. If the first callback argument is an error, the promise rejects; otherwise it resolves with the result. The last line runs first because the callback is async.',
      }
    },
  },
  {
    id: 'node-async-try-catch',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const fn = r.pick(FN_NAMES)
      const head = `process.on("unhandledRejection", () => console.log("unhandled"))\n\nasync function ${fn}() {\n  throw new Error("boom")\n}\n\n`
      const scenario = r.pick([
        {
          body: `try {\n  ${fn}()\n} catch (err) {\n  console.log("caught")\n}\nconsole.log("after")`,
          correct: 'after unhandled',
          wrong: ['caught after', 'after caught', 'after'],
          why: `Without await, ${fn}() just returns a rejected promise, so nothing is thrown inside the try block. The rejection is never handled.`,
        },
        {
          body: `async function main() {\n  try {\n    await ${fn}()\n  } catch (err) {\n    console.log("caught")\n  }\n}\nmain()\nconsole.log("after")`,
          correct: 'after caught',
          wrong: ['caught after', 'after unhandled', 'after'],
          why: 'await turns the rejection into a thrown error, so try/catch catches it. main() pauses at await, which lets "after" print first.',
        },
        {
          body: `${fn}().catch(() => console.log("caught"))\nconsole.log("after")`,
          correct: 'after caught',
          wrong: ['caught after', 'after unhandled', 'unhandled after'],
          why: '.catch() handles the rejected promise. Its callback runs after the current synchronous code, so "after" prints first.',
        },
      ])
      return {
        prompt: 'What does this code print?',
        code: head + scenario.body,
        correct: scenario.correct,
        wrong: scenario.wrong,
        explanation: `An async function never throws directly; it returns a promise that rejects. ${scenario.why}`,
      }
    },
  },
  {
    id: 'node-route-params-query',
    type: 'code-output',
    generate(r) {
      const { plural } = r.pick(RESOURCES)
      const id = r.int(2, 99)
      const sort = r.pick(['name', 'date', 'price'])
      const withQuery = r.chance(0.7)
      return {
        prompt: `A client requests GET /${plural}/${id}${withQuery ? `?sort=${sort}` : ''}. What JSON does the server send?`,
        code: `app.get("/${plural}/:id", (req, res) => {\n  res.json({ id: req.params.id, sort: req.query.sort })\n})`,
        correct: withQuery ? `{"id":"${id}","sort":"${sort}"}` : `{"id":"${id}"}`,
        wrong: withQuery
          ? [`{"id":${id},"sort":"${sort}"}`, `{"id":"${id}?sort=${sort}"}`, `{"id":"${id}"}`]
          : [`{"id":"${id}","sort":null}`, `{"id":${id}}`, `{"id":"${id}","sort":"undefined"}`],
        explanation: 'req.params holds the named parts of the path (:id) and req.query holds the ?key=value pairs. Both are always strings, so id is "' + id + '", not a number. A missing query value is undefined, and JSON leaves undefined fields out.',
      }
    },
  },
  {
    id: 'node-promise-all-order',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const labels = r.sample(LABELS, 3)
      let delays = r.sample([10, 20, 30, 40, 50], 3)
      if (delays[0] < delays[1] && delays[1] < delays[2]) delays = [...delays].reverse()
      const byDelay = labels.map((l, i) => [l, delays[i]]).sort((p, q) => p[1] - q[1]).map((p) => p[0])
      const calls = labels.map((l, i) => `wait(${delays[i]}, "${l}")`).join(', ')
      return {
        prompt: 'What does this code print?',
        code: `const wait = (ms, label) =>\n  new Promise((resolve) => setTimeout(() => {\n    console.log(label)\n    resolve(label)\n  }, ms))\n\nPromise.all([${calls}])\n  .then((results) => console.log(results.join("-")))`,
        correct: `${byDelay.join(' ')} ${labels.join('-')}`,
        wrong: [`${labels.join(' ')} ${labels.join('-')}`, `${byDelay.join(' ')} ${byDelay.join('-')}`, `${labels.join(' ')} ${byDelay.join('-')}`, labels.join('-')],
        explanation: 'All three timers start at once, so they finish (and log) in order of their delay. Promise.all still gives back the results in the same order as the input array, not the order they finished.',
      }
    },
  },
  {
    id: 'node-pagination',
    type: 'multiple-choice',
    generate(r) {
      const { plural } = r.pick(RESOURCES)
      const limit = r.pick([10, 20, 25, 50])
      const page = r.int(2, 6)
      const useOffset = r.chance(0.3)
      const start = (page - 1) * limit + 1
      const range = (a, b) => `${plural} ${a} to ${b}`
      return {
        prompt: useOffset
          ? `GET /${plural}?offset=${start - 1}&limit=${limit} skips the first ${start - 1} items. Which ${plural} come back?`
          : `GET /${plural}?page=${page}&limit=${limit} counts pages from 1. Which ${plural} come back?`,
        correct: range(start, start + limit - 1),
        wrong: [range(start + limit, start + 2 * limit - 1), range(start - 1, start + limit - 2), range(start - limit, start - 1), range(page, page + limit)],
        explanation: useOffset
          ? `offset says how many items to skip, limit how many to return. Skipping ${start - 1} means the first item returned is number ${start}.`
          : `Page 1 is items 1 to ${limit}, page 2 is ${limit + 1} to ${2 * limit}, and so on. Paginating keeps responses small instead of sending thousands of rows at once.`,
      }
    },
  },
  {
    id: 'node-npm-run-script',
    type: 'multiple-choice',
    generate(r) {
      const { name, cmd } = r.pick(SCRIPT_NAMES)
      return {
        prompt: r.pick([
          `package.json has "scripts": { "${name}": "${cmd}" }. How do you run it?`,
          `Which command runs the "${name}" script defined in package.json?`,
        ]),
        correct: `npm run ${name}`,
        wrong: [`npm install ${name}`, ...r.sample([`npm ${name}`, `npx ${name}`, `node ${name}`], 3)],
        explanation: `Custom scripts run with npm run <name>. Only a few built-in names like start and test have shortcuts (npm start, npm test). npx ${name} would look for a package binary called ${name} instead.`,
      }
    },
  },
  {
    id: 'node-safe-method',
    type: 'multiple-choice',
    generate(r) {
      const correct = r.pick(['GET', 'HEAD', 'OPTIONS'])
      return {
        prompt: r.pick([
          'Which HTTP method is "safe", meaning it should only read data and never change it?',
          'Which HTTP method should never change data on the server?',
        ]),
        correct,
        wrong: r.shuffle(['POST', 'PUT', 'DELETE', 'PATCH']),
        explanation: 'Safe methods (GET, HEAD, OPTIONS) only read. That is why browsers, caches and crawlers feel free to repeat them. Never make a GET route that deletes or changes data.',
      }
    },
  },

  // ---------- Fixed questions ----------
  {
    id: 'node-what-is',
    type: 'multiple-choice',
    prompt: ['What is Node.js?', 'How would you describe Node.js in one sentence?'],
    options: [
      'A runtime that runs JavaScript outside the browser, built on V8',
      'A JavaScript framework, like React, for building server-rendered user interfaces',
      'A compiler that turns JavaScript files into native machine code programs',
      'A new language based on JavaScript that adds types and file access',
    ],
    answer: 0,
    explanation: 'Node takes the V8 engine from Chrome and adds things browsers don\'t have, like reading files and opening network ports, so you can write servers in JavaScript. A runtime is a program that runs your code.',
  },
  {
    id: 'node-single-thread',
    type: 'multiple-choice',
    prompt: 'Node.js runs your JavaScript on a single thread. How can it handle thousands of connections?',
    options: [
      'Slow I/O runs in the background and callbacks run when results arrive',
      'Node quietly starts a new operating system thread for each incoming request',
      'Each connection gets its own copy of the V8 engine to run in',
      'Requests are queued and each one finishes fully before the next starts',
    ],
    answer: 0,
    explanation: 'While waiting on a database or file, Node does not sit idle; it handles other requests. The event loop runs each callback when its result arrives. Heavy CPU work, however, does block it.',
  },
  {
    id: 'node-block-loop',
    type: 'multiple-choice',
    prompt: 'What happens if a request handler runs a CPU-heavy loop for 5 seconds?',
    options: [
      'Every other request waits, because the single event loop is busy',
      'Only that request slows down; the other requests keep being served normally',
      'Node detects the long loop and moves it onto a worker thread',
      'Node pauses the loop after a timeout and serves other requests first',
    ],
    answer: 0,
    explanation: 'Your JavaScript runs on one thread, so a long calculation freezes the whole server. Move heavy work to worker threads, a job queue, or another service.',
  },
  {
    id: 'node-dev-deps',
    type: 'multiple-choice',
    prompt: 'What is the difference between dependencies and devDependencies in package.json?',
    options: [
      'dependencies are needed at runtime; devDependencies only for tests and builds',
      'devDependencies are installed globally; dependencies go inside the project folder',
      'dependencies are pinned to exact versions; devDependencies can use version ranges',
      'devDependencies hold beta versions of the packages listed in dependencies',
    ],
    answer: 0,
    explanation: 'Packages like express go in dependencies. Tools like a test runner or linter go in devDependencies, so production installs can skip them.',
  },
  {
    id: 'node-lockfile',
    type: 'multiple-choice',
    prompt: 'Why should package-lock.json be committed to git?',
    options: [
      'It records exact installed versions, so every machine installs the same ones',
      'It stores your npm login token so installs on CI can authenticate',
      'It caches the downloaded packages so later installs work without internet access',
      'It lists which package scripts npm is allowed to run during install',
    ],
    answer: 0,
    explanation: 'package.json allows ranges like ^1.2.0. The lockfile pins the exact versions that were installed. npm ci installs exactly what the lockfile says.',
  },
  {
    id: 'node-middleware',
    type: 'multiple-choice',
    prompt: 'In Express, what is middleware?',
    options: [
      'A (req, res, next) function that can respond or call next() to continue',
      'A layer between Express and the database that runs every single SQL query',
      'A function that runs once at startup to configure the Express app',
      'A route handler that only runs after the response has been sent',
    ],
    answer: 0,
    explanation: 'Middleware has the signature (req, res, next). It is used for logging, parsing JSON bodies, checking login, and handling errors.',
  },
  {
    id: 'node-env-vars',
    type: 'multiple-choice',
    prompt: 'Where should a database password for a Node app be kept?',
    options: [
      'In an environment variable read through process.env, kept out of git',
      'In a config.js file committed to git so everyone on the team has it',
      'In package.json under a "secrets" field so npm keeps it private',
      'In the frontend bundle, minified so nobody can easily read it',
    ],
    answer: 0,
    explanation: 'Secrets in code end up in git history and can leak. Environment variables (often from a .env file that is not committed) keep them out of the codebase.',
  },
  {
    id: 'node-cors',
    type: 'multiple-choice',
    prompt: [
      'Your React app at localhost:5173 calls your API at localhost:3000 and gets a CORS error. What does that mean?',
      'Your frontend gets a CORS error when calling your own API on another port. What is going on?',
    ],
    options: [
      'The browser blocked the response because the API did not allow that origin',
      'The API server rejected the request because the port numbers are different',
      'The browser blocked it because localhost requests must use HTTPS to work',
      'The server failed because it cannot parse JSON sent from another site',
    ],
    answer: 0,
    explanation: 'An origin is protocol + domain + port, so a different port counts as another origin. Browsers block reading the response unless the server sends headers like Access-Control-Allow-Origin. Fix it on the server (for example with the cors middleware).',
  },
  {
    id: 'node-idempotent',
    type: 'multiple-choice',
    prompt: 'Which HTTP method is NOT idempotent (repeating it can create more changes)?',
    options: ['POST', 'GET', 'PUT', 'DELETE'],
    answer: 0,
    explanation: '"Idempotent" means doing it twice has the same effect as once. Two identical PUTs leave the same result, but two POSTs may create two records.',
  },
  {
    id: 'node-jwt',
    type: 'multiple-choice',
    prompt: 'What is a JWT (JSON Web Token) commonly used for?',
    options: [
      'Proving who the user is on each request with a signed token',
      'Encrypting user passwords before they are saved in the database',
      'Hiding user data from the client, since the token payload is encrypted',
      'Storing the session on the server so the client stays logged in',
    ],
    answer: 0,
    explanation: 'After login the server signs a token with user info. The client sends it back (usually in an Authorization header) and the server checks the signature. The contents are only encoded, not secret.',
  },
  {
    id: 'node-async-errors',
    type: 'multiple-choice',
    prompt: 'An await inside an Express route handler throws and nothing catches it. What is the safest fix?',
    options: [
      'Catch it with try/catch or pass it to next(err), then respond',
      'Nothing; Node retries the failed handler until the await finally succeeds',
      'Add a .then() after the await so the error is ignored safely',
      'Restart the server with a cron job whenever the process crashes',
    ],
    answer: 0,
    explanation: 'Unhandled promise rejections can leave the request hanging or crash the process. Catch the error, log it, and respond with a 500 status (or pass it to error-handling middleware with next(err)).',
  },
  {
    id: 'node-streams',
    type: 'multiple-choice',
    prompt: 'Why use streams to send a 2 GB file instead of fs.readFile?',
    options: [
      'Chunks are sent as they are read, so memory use stays small',
      'Streams compress the data automatically, so the transfer is much faster',
      'Streams run on a separate thread, so the event loop is not involved',
      'Streams read the file synchronously, which is simpler and more predictable',
    ],
    answer: 0,
    explanation: 'readFile loads everything into memory first. fs.createReadStream(file).pipe(res) sends chunks as they are read, using little memory.',
  },
  {
    id: 'node-modules',
    type: 'multiple-choice',
    prompt: 'What is the difference between require() and import?',
    options: [
      'require is CommonJS and loads at runtime; import is the ES module standard',
      'import only works in browsers, so Node code always needs require instead',
      'require is deprecated in Node and throws an error in new versions',
      'They are aliases; Node rewrites every import into a require call internally',
    ],
    answer: 0,
    explanation: 'Node started with CommonJS (require / module.exports). ES modules (import / export) are the JavaScript standard and work in both Node and browsers. Set "type": "module" to use them in Node.',
  },
  {
    id: 'node-rest-vs-graphql',
    type: 'multiple-choice',
    prompt: 'What is one key difference between REST and GraphQL?',
    options: [
      'GraphQL lets the client ask one endpoint for exactly the fields it needs',
      'GraphQL only works with graph databases, while REST works with any database',
      'REST responses are always XML, while GraphQL is designed to return JSON',
      'GraphQL replaces HTTP with its own protocol, so it needs no web server',
    ],
    answer: 0,
    explanation: 'REST has many endpoints with fixed responses. GraphQL has one endpoint and a query language, which avoids getting too much or too little data.',
  },
  {
    id: 'node-event-loop-what',
    type: 'multiple-choice',
    prompt: ['What is the event loop in Node.js?', 'Can you explain the event loop in simple terms?'],
    options: [
      'A loop that picks finished tasks from queues and runs their callbacks',
      'A thread pool that runs each callback on a free CPU core in parallel',
      'A timer that checks every second whether new requests have arrived',
      'A queue that runs incoming requests one at a time until each fully finishes',
    ],
    answer: 0,
    explanation: 'Node starts slow work (timers, network, files) and moves on. When something finishes, its callback is put in a queue, and the event loop keeps taking callbacks from the queues and running them on the main thread.',
  },
  {
    id: 'node-libuv-threadpool',
    type: 'multiple-choice',
    prompt: 'Node uses libuv\'s thread pool (4 threads by default) for some work. Which work?',
    options: [
      'File system calls, DNS lookups, crypto hashing and zlib compression',
      'Running your JavaScript callbacks on several CPU cores at once',
      'Handling each incoming TCP connection on a thread of its own',
      'Running Express middleware in parallel threads so requests finish sooner',
    ],
    answer: 0,
    explanation: 'Your JavaScript runs on one main thread. libuv is the C library under Node that hands blocking tasks like fs.readFile, dns.lookup, crypto.pbkdf2 and zlib to a small pool of helper threads. Network sockets use the operating system\'s non-blocking APIs instead.',
  },
  {
    id: 'node-worker-vs-cluster',
    type: 'multiple-choice',
    prompt: ['What is the difference between worker_threads and cluster?', 'How do worker_threads and the cluster module differ?'],
    options: [
      'Workers are threads in one process; cluster forks processes sharing a port',
      'Workers run on other machines; cluster runs extra copies on this machine',
      'Cluster starts threads that share memory; workers start separate processes',
      'They are the same feature; cluster is the older, deprecated name for it',
    ],
    answer: 0,
    explanation: 'worker_threads start extra threads inside one Node process, good for CPU-heavy tasks like resizing images. cluster forks several Node processes that share one server port, so a server can use every CPU core.',
  },
  {
    id: 'node-backpressure',
    type: 'multiple-choice',
    prompt: 'In Node streams, what is backpressure?',
    options: [
      'Pausing the reading side when the writing side cannot keep up',
      'An error thrown when a stream receives more data than its limit',
      'Compressing chunks automatically when the network connection gets slow',
      'Retrying a write when the destination stream has returned an error',
    ],
    answer: 0,
    explanation: 'If data comes in faster than it can be written, it piles up in memory. write() returns false when the buffer is full, and you wait for the "drain" event before writing more. pipe() handles this for you.',
  },
  {
    id: 'node-stream-types',
    type: 'multiple-choice',
    prompt: 'Which list gives the four basic kinds of streams in Node?',
    options: [
      'Readable, Writable, Duplex and Transform',
      'Input, Output, Buffer and Pipe',
      'Readable, Writable, Asynchronous and Synchronous',
      'File, Network, Memory and Process',
    ],
    answer: 0,
    explanation: 'Readable streams give data (fs.createReadStream), Writable streams take it (res in a server), Duplex do both (a TCP socket), and Transform change data as it passes through (zlib.createGzip).',
  },
  {
    id: 'node-error-middleware',
    type: 'multiple-choice',
    prompt: ['How does Express know a middleware function is an error handler?', 'What is the signature of Express error-handling middleware?'],
    options: [
      'It has exactly four parameters, (err, req, res, next), in order',
      'It is registered with app.error() rather than with app.use()',
      'Its first parameter is named error, and Express checks that name',
      'It is added before every route so it can catch their errors',
    ],
    answer: 0,
    explanation: 'Express counts the function\'s parameters. A function with four, (err, req, res, next), is only called when something calls next(err) or throws. Add it after your routes.',
  },
  {
    id: 'node-next-err',
    type: 'multiple-choice',
    prompt: 'Inside Express middleware, what does calling next(err) with an error do?',
    options: [
      'Skips normal handlers and goes straight to error-handling middleware',
      'Runs the current middleware once more before moving on to the next',
      'Crashes the process so a process manager can restart it cleanly',
      'Logs the error but still continues with the next normal middleware anyway',
    ],
    answer: 0,
    explanation: 'Passing anything to next() tells Express something went wrong. It skips ordinary routes and middleware and goes to the first error handler (err, req, res, next), or its built-in one that sends a 500.',
  },
  {
    id: 'node-params-vs-query',
    type: 'multiple-choice',
    prompt: 'In GET /users/42?sort=name, when should a value be a path parameter rather than a query string?',
    options: [
      'Path parameters identify the resource; query strings filter, sort, or paginate',
      'Path parameters are for numbers, and query strings are for text values',
      'Query strings identify the resource; path parameters hold the optional settings',
      'Path parameters are kept private, while query strings show up in logs',
    ],
    answer: 0,
    explanation: '/users/42 points at one specific user, so 42 is a path parameter (req.params.id). ?sort=name changes how results are shown, so it is a query string (req.query.sort).',
  },
  {
    id: 'node-rest-nouns',
    type: 'multiple-choice',
    prompt: 'Which endpoint best follows REST naming for the orders of user 42?',
    options: ['GET /users/42/orders', 'GET /getUserOrders?id=42', 'GET /user/42/getOrders', 'POST /orders/fetchForUser/42'],
    answer: 0,
    explanation: 'REST URLs name resources with plural nouns and let the HTTP method be the verb. Words like get or fetch in the path repeat what GET already says.',
  },
  {
    id: 'node-api-versioning',
    type: 'multiple-choice',
    prompt: 'Why do many APIs put a version in the URL, like /v1/users?',
    options: [
      'So breaking changes can ship in v2 without breaking existing clients',
      'So browsers know which version of HTTP the API server is able to support',
      'So the server can cache v1 responses longer than the newer ones',
      'So npm can match the API to the version in package.json',
    ],
    answer: 0,
    explanation: 'A breaking change (renaming a field, changing a format) would break apps already using the API. Releasing it as /v2 lets old clients keep using /v1 until they upgrade.',
  },
  {
    id: 'node-sessions-vs-jwt',
    type: 'multiple-choice',
    prompt: ['What is the main difference between session cookies and JWTs?', 'Sessions vs JWT: where is the login state kept?'],
    options: [
      'Sessions keep the state on the server; a JWT carries signed data itself',
      'Sessions only work over HTTPS, while JWTs also work over plain HTTP',
      'A JWT is encrypted so nobody can read it, while sessions are not',
      'Sessions are kept in localStorage, while JWTs can only be sent as cookies',
    ],
    answer: 0,
    explanation: 'With sessions, the cookie holds a random id and the server looks up the user in its store. A JWT holds the user data plus a signature, so the server can check it without a lookup, but it is harder to cancel before it expires.',
  },
  {
    id: 'node-bcrypt',
    type: 'multiple-choice',
    prompt: 'Why store passwords with bcrypt instead of a fast hash like SHA-256?',
    options: [
      'bcrypt is slow on purpose and salted, so guessing is expensive',
      'bcrypt encrypts the passwords so the server can decrypt them at login',
      'SHA-256 output is too long to fit in most database columns',
      'bcrypt hashes are shorter, which saves space and speeds up lookups',
    ],
    answer: 0,
    explanation: 'A hash is one-way: you can check a password against it but not reverse it. bcrypt adds a random salt (so equal passwords get different hashes) and is slow on purpose, so attackers can try far fewer guesses per second.',
  },
  {
    id: 'node-rate-limiting',
    type: 'multiple-choice',
    prompt: 'What does rate limiting middleware (like express-rate-limit) do?',
    options: [
      'Caps how many requests one client can make in a time window',
      'Limits the size of request bodies so large uploads get rejected',
      'Slows every response down evenly so the server never gets overloaded',
      'Queues all requests and answers them at a fixed rate per second',
    ],
    answer: 0,
    explanation: 'For example, 100 requests per 15 minutes per IP address. Extra requests get 429 Too Many Requests. It protects login forms from password guessing and the server from floods of traffic.',
  },
  {
    id: 'node-cors-preflight',
    type: 'multiple-choice',
    prompt: 'When does a browser send a CORS preflight OPTIONS request first?',
    options: [
      'Before cross-origin requests that use PUT, DELETE or custom headers',
      'Before every request, including same-origin ones, to check the server',
      'Only after a cross-origin request fails, to ask for permission again',
      'Only when the request comes from Node code rather than a browser',
    ],
    answer: 0,
    explanation: 'Simple GET or form POST requests go straight through. Other cross-origin requests, like PUT, DELETE, or ones with a JSON Content-Type or an Authorization header, make the browser first ask with OPTIONS whether they are allowed.',
  },
  {
    id: 'node-npx',
    type: 'multiple-choice',
    prompt: ['What is the difference between npm and npx?', 'What does npx do that npm install does not?'],
    options: [
      'npx runs a package\'s command, downloading it temporarily if needed',
      'npx is a faster npm that installs all packages in parallel',
      'npx installs packages globally, while npm only installs them locally',
      'npx publishes packages, while npm is only used for installing them',
    ],
    answer: 0,
    explanation: 'npm installs and manages packages. npx executes a package\'s command, for example npx create-vite, using a local copy if there is one or a temporary download otherwise.',
  },
  {
    id: 'node-esm-dirname',
    type: 'multiple-choice',
    prompt: 'In a file using ES modules ("type": "module"), why is __dirname not defined?',
    options: [
      'It comes from the CommonJS wrapper; ES modules use import.meta',
      'It was removed from Node for security reasons in recent versions',
      'It only exists when the app is started with npm start',
      'ES modules run in a browser-like sandbox with no file paths',
    ],
    answer: 0,
    explanation: 'CommonJS wraps each file in a function that receives require, module, exports, __filename and __dirname. ES modules have no wrapper; use import.meta.dirname (newer Node) or fileURLToPath(import.meta.url).',
  },
  {
    id: 'node-graceful-shutdown',
    type: 'multiple-choice',
    prompt: 'Your server gets a SIGTERM signal during a deploy. What does a graceful shutdown do?',
    options: [
      'Stops new connections, finishes current requests, then closes and exits',
      'Calls process.exit() right away so the new version can start faster',
      'Ignores the signal and keeps running until requests stop arriving',
      'Rejects all current requests with a 503 error and then restarts the process',
    ],
    answer: 0,
    explanation: 'Call server.close() so no new connections are accepted, let in-flight requests finish, then close database connections and exit, usually with a timeout so a stuck request cannot block forever.',
  },
  {
    id: 'node-logging',
    type: 'multiple-choice',
    prompt: 'Why use a logger like pino or winston instead of console.log in production?',
    options: [
      'It adds log levels and structured JSON that log tools can filter',
      'console.log is turned off automatically when NODE_ENV is production',
      'Loggers send each line to the browser console to help debugging',
      'console.log can only print strings, not objects or error stacks',
    ],
    answer: 0,
    explanation: 'Loggers let you set levels (debug, info, warn, error) and turn noisy ones off, and write JSON lines with fields like a request id that log search tools can index.',
  },
  {
    id: 'node-testing-api',
    type: 'multiple-choice',
    prompt: 'What is a common way to write automated tests for an Express API endpoint?',
    options: [
      'Send requests to the app with supertest and check responses',
      'Open the browser and check the JSON by hand after each change',
      'Call the route handler directly without passing it req or res',
      'Deploy to production and watch the logs for any new errors',
    ],
    answer: 0,
    explanation: 'supertest(app).get("/users").expect(200) makes a real HTTP request to your app in memory, so a test checks routing, middleware and status codes together. Test runners like Jest, Vitest or node:test run them.',
  },
  {
    id: 'node-websockets',
    type: 'multiple-choice',
    prompt: 'When is a WebSocket a better choice than polling the server every few seconds?',
    options: [
      'When the server must push frequent updates, like chat or live scores',
      'When the client only loads data once, like a static settings page',
      'When responses are large files that the browser should cache for later',
      'When the app must work without keeping a connection to the server',
    ],
    answer: 0,
    explanation: 'Polling sends a new request again and again, even when nothing changed. A WebSocket keeps one connection open in both directions, so the server can send updates the moment they happen.',
  },
  {
    id: 'node-cache-aside',
    type: 'multiple-choice',
    prompt: 'Your API caches results in Redis (cache-aside). What should happen on a cache miss?',
    options: [
      'Read from the database, save the result in Redis, then return it',
      'Return a 404, since the data must already be in the cache',
      'Redis queries the database by itself and fills in the missing key',
      'Return null to the client and fill the cache in a nightly job',
    ],
    answer: 0,
    explanation: 'A cache miss means the key is not in Redis yet. The app loads the data from the database, stores it in Redis (usually with an expiry), and returns it. The next request is a fast cache hit.',
  },
  {
    id: 'node-cache-ttl',
    type: 'multiple-choice',
    prompt: 'Why give cached values in Redis an expiry time (TTL)?',
    options: [
      'So stale data expires by itself instead of being served forever',
      'So Redis can store more keys than the server has memory for',
      'So the cached values are encrypted once the time limit passes',
      'So Redis writes the keys back to the database right when they expire',
    ],
    answer: 0,
    explanation: 'TTL means "time to live". When the data changes in the database, the cached copy is out of date; an expiry makes sure it gets refreshed after a while even if nothing deletes it.',
  },
  {
    id: 'node-npm-ci',
    type: 'multiple-choice',
    prompt: 'How is npm ci different from npm install?',
    options: [
      'It installs exactly what the lockfile lists, after removing node_modules',
      'It updates every package to the newest version package.json allows',
      'It only installs devDependencies, which a CI server needs for tests',
      'It installs packages globally so every project on the machine shares them',
    ],
    answer: 0,
    explanation: 'npm ci ("clean install") deletes node_modules and installs the exact versions from package-lock.json, failing if it does not match package.json. That makes CI and deploy builds repeatable.',
  },
  {
    id: 'node-unhandled-rejection',
    type: 'multiple-choice',
    prompt: 'In modern Node (v15 and later), what happens by default on an unhandled promise rejection?',
    options: [
      'Node prints the error and exits the process with a failure code',
      'Node prints a warning, ignores the error, and keeps the process running',
      'Node retries the rejected promise once before it gives up on it',
      'Node turns the rejection into undefined and resolves the promise instead',
    ],
    answer: 0,
    explanation: 'Older Node versions only printed a warning, which is why many people still believe that. Since v15 an unhandled rejection crashes the process, so always add .catch() or try/catch around await.',
  },
  {
    id: 'node-body-undefined',
    type: 'multiple-choice',
    prompt: 'req.body is undefined in your Express POST route. What is the most likely cause?',
    options: [
      'The express.json() middleware was not added before this route',
      'POST requests cannot carry a body, so data must go in the URL',
      'The route should read the data from req.params instead of req.body',
      'The client must send the data as a query string for Express',
    ],
    answer: 0,
    explanation: 'Express does not read request bodies by default. app.use(express.json()) parses JSON bodies and fills req.body; it must be added before the routes that need it.',
  },
  {
    id: 'node-globals',
    type: 'multiple-choice',
    prompt: 'Which of these is NOT available as a global in Node.js?',
    options: ['window', 'process', 'Buffer', 'setImmediate'],
    answer: 0,
    explanation: 'window belongs to browsers. Node has its own globals like process (info about the running program), Buffer (binary data) and setImmediate. The cross-platform name for the global object is globalThis.',
  },
  {
    id: 'node-require-cache',
    type: 'code-output',
    check: 'node',
    prompt: 'This code writes a tiny module to a temp file and requires it twice. What does it print?',
    code: 'const fs = require("fs")\nconst os = require("os")\nconst path = require("path")\n\nconst file = path.join(os.tmpdir(), "counter-" + process.pid + ".js")\nfs.writeFileSync(file, "let n = 0; module.exports = () => ++n")\n\nconst a = require(file)\nconst b = require(file)\nconsole.log(a(), b(), a === b)\nfs.unlinkSync(file)',
    options: ['1 2 true', '1 1 false', '1 1 true', '2 2 true'],
    answer: 0,
    explanation: 'Node runs a module only the first time it is required and caches module.exports. The second require returns the same function, so both share the same counter n.',
  },
  {
    id: 'node-argv',
    type: 'code-output',
    prompt: 'You start the app with: node server.js --port 8080. What does this line print?',
    code: 'console.log(process.argv.slice(2))',
    options: ["[ '--port', '8080' ]", "[ 'server.js', '--port', '8080' ]", "{ port: '8080' }", "[ '--port', 8080 ]"],
    answer: 0,
    explanation: 'process.argv starts with the path to node and the path to the script, so slice(2) leaves just your arguments. They are always strings.',
  },
  {
    id: 'node-promise-all-reject',
    type: 'code-output',
    check: 'node',
    prompt: 'What does this code print?',
    code: 'const ok = (value) => Promise.resolve(value)\nconst fail = (msg) => Promise.reject(new Error(msg))\n\nPromise.all([ok(1), fail("db down"), ok(3)])\n  .then((values) => console.log("values", values.length))\n  .catch((err) => console.log("caught", err.message))',
    options: ['caught db down', 'values 3', 'values 2', 'values 2 caught db down'],
    answer: 0,
    explanation: 'Promise.all rejects as soon as any promise rejects, so .then is skipped and .catch gets that error. Use Promise.allSettled when you want every result, failures included.',
  },
  {
    id: 'node-all-settled',
    type: 'code-output',
    check: 'node',
    prompt: 'What does this code print?',
    code: 'Promise.allSettled([\n  Promise.resolve(1),\n  Promise.reject(new Error("x")),\n  Promise.resolve(3),\n]).then((results) => console.log(results.map((r) => r.status).join(",")))',
    options: ['fulfilled,rejected,fulfilled', 'resolved,rejected,resolved', 'fulfilled,fulfilled', 'rejected'],
    answer: 0,
    explanation: 'allSettled waits for every promise and never rejects. Each result is { status: "fulfilled", value } or { status: "rejected", reason }.',
  },
  {
    id: 'node-env-string',
    type: 'code-output',
    check: 'node',
    prompt: ['What does this code print?', 'What gets logged here?'],
    code: 'process.env.PORT = 3000\nconsole.log(typeof process.env.PORT, process.env.PORT + 1)',
    options: ['string 30001', 'number 3001', 'string 3001', 'number 30001'],
    answer: 0,
    explanation: 'Environment variables are always strings; Node converts the number to "3000". Adding 1 to a string joins them. Use Number(process.env.PORT) when you need a number.',
  },
  {
    id: 'node-json-date',
    type: 'code-output',
    check: 'node',
    prompt: 'A date is saved as JSON and read back. What does this print?',
    code: 'const saved = JSON.stringify({ createdAt: new Date(0) })\nconst loaded = JSON.parse(saved)\nconsole.log(typeof loaded.createdAt, loaded.createdAt)',
    options: ['string 1970-01-01T00:00:00.000Z', 'object 1970-01-01T00:00:00.000Z', 'number 0', 'object {}'],
    answer: 0,
    explanation: 'JSON has no date type. JSON.stringify turns a Date into an ISO string, and JSON.parse leaves it as a string. Convert it back with new Date(value).',
  },
  {
    id: 'node-async-return',
    type: 'code-output',
    check: 'node',
    prompt: 'What does this code print?',
    code: 'async function getPort() {\n  return 3000\n}\n\nconsole.log(getPort())',
    options: ['Promise { 3000 }', '3000', 'undefined', 'Promise { <pending> }'],
    answer: 0,
    explanation: 'An async function always returns a promise. Here it is already resolved, so Node shows Promise { 3000 }. To get the number itself, use await getPort() or .then().',
  },
  {
    id: 'node-typeof-globals',
    type: 'code-output',
    check: 'node',
    prompt: 'This file is run with node. What does it print?',
    code: 'console.log(typeof require, typeof window, typeof process)',
    options: ['function undefined object', 'function object object', 'undefined undefined object', 'function undefined function'],
    answer: 0,
    explanation: 'In a CommonJS file require is a function and process is an object, but window only exists in browsers, so its typeof is "undefined" (typeof never throws for missing names).',
  },
]
