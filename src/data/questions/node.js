import { LABELS, PEOPLE, RESOURCES } from '../pools.js'

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

  // ---------- Fixed questions ----------
  {
    id: 'node-what-is',
    type: 'multiple-choice',
    prompt: ['What is Node.js?', 'How would you describe Node.js in one sentence?'],
    options: [
      'A runtime that runs JavaScript outside the browser, built on Chrome\'s V8 engine',
      'A JavaScript framework for building UIs',
      'A database',
      'A new programming language',
    ],
    answer: 0,
    explanation: 'Node takes the V8 engine from Chrome and adds things browsers don\'t have, like reading files and opening network ports, so you can write servers in JavaScript.',
  },
  {
    id: 'node-single-thread',
    type: 'multiple-choice',
    prompt: 'Node.js runs your JavaScript on a single thread. How can it handle thousands of connections?',
    options: [
      'It uses non-blocking I/O: slow work like network and disk happens in the background, and callbacks run when ready',
      'It secretly starts a new thread for every request',
      'It can only handle one connection at a time',
      'It buffers requests and handles them once per minute',
    ],
    answer: 0,
    explanation: 'While waiting on a database or file, Node does not sit idle; it handles other requests. The event loop runs each callback when its result arrives. Heavy CPU work, however, does block it.',
  },
  {
    id: 'node-block-loop',
    type: 'multiple-choice',
    prompt: 'What happens if a request handler runs a CPU-heavy loop for 5 seconds?',
    options: [
      'All other requests wait, because the event loop is blocked',
      'Only that request is slow; others are unaffected',
      'Node automatically moves it to another thread',
      'The loop is skipped',
    ],
    answer: 0,
    explanation: 'Your JavaScript runs on one thread, so a long calculation freezes the whole server. Move heavy work to worker threads, a job queue, or another service.',
  },
  {
    id: 'node-dev-deps',
    type: 'multiple-choice',
    prompt: 'What is the difference between dependencies and devDependencies in package.json?',
    options: [
      'dependencies are needed to run the app; devDependencies are only needed while developing (tests, build tools)',
      'devDependencies are newer versions',
      'dependencies are installed globally',
      'There is no difference',
    ],
    answer: 0,
    explanation: 'Packages like express go in dependencies. Tools like a test runner or linter go in devDependencies, so production installs can skip them.',
  },
  {
    id: 'node-lockfile',
    type: 'multiple-choice',
    prompt: 'Why should package-lock.json be committed to git?',
    options: [
      'It records the exact installed versions, so everyone and every server gets the same ones',
      'It stores your npm password',
      'It makes the app run faster',
      'It is required for git to work',
    ],
    answer: 0,
    explanation: 'package.json allows ranges like ^1.2.0. The lockfile pins the exact versions that were installed. npm ci installs exactly what the lockfile says.',
  },
  {
    id: 'node-middleware',
    type: 'multiple-choice',
    prompt: 'In Express, what is middleware?',
    options: [
      'A function that runs during a request and can change it, respond, or call next() to continue',
      'A database layer',
      'A frontend framework',
      'The code that runs when the server shuts down',
    ],
    answer: 0,
    explanation: 'Middleware has the signature (req, res, next). It is used for logging, parsing JSON bodies, checking login, and handling errors.',
  },
  {
    id: 'node-env-vars',
    type: 'multiple-choice',
    prompt: 'Where should a database password for a Node app be kept?',
    options: [
      'In an environment variable (read with process.env), not in the code',
      'Hard-coded in server.js',
      'In the frontend code',
      'In the README',
    ],
    answer: 0,
    explanation: 'Secrets in code end up in git history and can leak. Environment variables (often from a .env file that is not committed) keep them out of the codebase.',
  },
  {
    id: 'node-cors',
    type: 'multiple-choice',
    prompt: ['Your React app at localhost:5173 calls your API at localhost:3000 and gets a CORS error. What does that mean?', 'What is CORS?'],
    options: [
      'The browser blocked the response because the API did not allow that origin in its CORS headers',
      'The API server is down',
      'The JSON is invalid',
      'The request was too large',
    ],
    answer: 0,
    explanation: 'Browsers block reading responses from a different origin unless the server sends headers like Access-Control-Allow-Origin. Fix it on the server (for example with the cors middleware).',
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
      'Proving who the user is on each request, using a signed token the server can verify',
      'Encrypting the database',
      'Compressing JSON responses',
      'Storing images',
    ],
    answer: 0,
    explanation: 'After login the server signs a token with user info. The client sends it back (usually in an Authorization header) and the server checks the signature. The contents are only encoded, not secret.',
  },
  {
    id: 'node-async-errors',
    type: 'multiple-choice',
    prompt: 'An await inside a route handler throws and nothing catches it. What is the safest fix?',
    options: [
      'Wrap the code in try/catch (or use error-handling middleware) and send a proper error response',
      'Ignore it; Node will retry',
      'Restart the server every hour',
      'Use var instead of const',
    ],
    answer: 0,
    explanation: 'Unhandled promise rejections can leave the request hanging or crash the process. Catch the error, log it, and respond with a 500 status.',
  },
  {
    id: 'node-streams',
    type: 'multiple-choice',
    prompt: 'Why use streams to send a 2 GB file instead of fs.readFile?',
    options: [
      'Streams send the file in small chunks, so the whole file never has to fit in memory',
      'Streams compress the file automatically',
      'readFile cannot read big files at all',
      'Streams are synchronous and simpler',
    ],
    answer: 0,
    explanation: 'readFile loads everything into memory first. fs.createReadStream(file).pipe(res) sends chunks as they are read, using little memory.',
  },
  {
    id: 'node-modules',
    type: 'multiple-choice',
    prompt: 'What is the difference between require() and import?',
    options: [
      'require is CommonJS (older, loads at runtime); import is ES modules (the modern standard)',
      'import only works in browsers',
      'require is faster, so import is deprecated',
      'They are the same syntax',
    ],
    answer: 0,
    explanation: 'Node started with CommonJS (require / module.exports). ES modules (import / export) are the JavaScript standard and work in both Node and browsers. Set "type": "module" to use them in Node.',
  },
  {
    id: 'node-rest-vs-graphql',
    type: 'multiple-choice',
    prompt: 'What is one key difference between REST and GraphQL?',
    options: [
      'In GraphQL the client asks for exactly the fields it needs from one endpoint',
      'GraphQL only works with SQL databases',
      'REST cannot return JSON',
      'GraphQL does not use HTTP',
    ],
    answer: 0,
    explanation: 'REST has many endpoints with fixed responses. GraphQL has one endpoint and a query language, which avoids getting too much or too little data.',
  },
]
