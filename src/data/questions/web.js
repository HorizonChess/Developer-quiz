import { DOMAINS, RESOURCES, WORDS } from '../pools.js'

const STATUS_MEANINGS = [
  ['200', 'OK: the request succeeded and a result is returned'],
  ['201', 'Created: the request made a new resource on the server'],
  ['204', 'No Content: it worked, but the response body is empty'],
  ['301', 'Moved Permanently: the resource now lives at a new URL'],
  ['302', 'Found: the resource is at another URL for now'],
  ['304', 'Not Modified: your cached copy is still fine to use'],
  ['400', 'Bad Request: the server could not understand the request'],
  ['401', 'Unauthorized: you are not logged in or credentials are missing'],
  ['403', 'Forbidden: the server knows who you are but refuses access'],
  ['404', 'Not Found: the server has nothing at this URL path'],
  ['405', 'Method Not Allowed: this URL does not accept that method'],
  ['409', 'Conflict: the request clashes with the current state of data'],
  ['429', 'Too Many Requests: you hit the rate limit, slow down'],
  ['500', 'Internal Server Error: the server hit an unexpected bug'],
  ['502', 'Bad Gateway: a proxy got an invalid reply from upstream'],
  ['503', 'Service Unavailable: the server is overloaded or under maintenance'],
]

const STATUS_LABELS = {
  200: '200 OK',
  201: '201 Created',
  204: '204 No Content',
  302: '302 Found',
  304: '304 Not Modified',
  400: '400 Bad Request',
  401: '401 Unauthorized',
  403: '403 Forbidden',
  404: '404 Not Found',
  409: '409 Conflict',
  422: '422 Unprocessable Content',
  429: '429 Too Many Requests',
  500: '500 Internal Server Error',
  503: '503 Service Unavailable',
}

const STATUS_SCENARIOS = [
  { text: 'A logged-in user opens an admin-only page they have no rights to.', code: 403, wrong: [401, 404, 400], why: '403 means "I know who you are, but you may not do this". 401 would mean the server does not know who you are yet.' },
  { text: 'A request to a private API arrives with no login token at all.', code: 401, wrong: [403, 400, 404], why: '401 means you are not authenticated (not logged in). 403 is for a known user who lacks permission.' },
  { text: 'Signing up fails because that email address is already registered.', code: 409, wrong: [403, 404, 503], why: '409 Conflict means the request clashes with data that already exists, like a duplicate email.' },
  { text: 'The JSON is valid, but the age field is -5, which fails validation.', code: 422, wrong: [409, 404, 500], why: '422 means the server understood the request format, but the values inside break the rules. Many APIs also use 400 for this.' },
  { text: 'A client sends 500 requests in one minute and the limit is 100.', code: 429, wrong: [403, 503, 409], why: '429 Too Many Requests is the rate-limit response. It often comes with a Retry-After header.' },
  { text: 'The server is down for planned maintenance for the next ten minutes.', code: 503, wrong: [500, 404, 403], why: '503 means the service is temporarily unavailable (down or overloaded). 500 is for an unexpected bug.' },
  { text: 'A POST creates a new order and returns the saved order in the body.', code: 201, wrong: [204, 302, 409], why: '201 Created says a new resource was made. 204 would mean there is no body at all.' },
  { text: 'The request body is cut off, so the server cannot even parse the JSON.', code: 400, wrong: [401, 404, 409], why: '400 Bad Request means the request itself is malformed, so the server cannot make sense of it.' },
  { text: 'An unhandled exception is thrown in the server code while saving.', code: 500, wrong: [503, 400, 422], why: '500 Internal Server Error means something broke on the server side, usually a bug.' },
  { text: 'A user requests /products/999, but no product has that id.', code: 404, wrong: [400, 403, 409], why: '404 Not Found means nothing exists at that URL.' },
]

const ATTACKS = [
  {
    name: 'Cross-site scripting (XSS)',
    scenarios: [
      'A comment containing <script> tags is saved and then runs in every visitor\'s browser.',
      'A search page shows the search term in the page without escaping it, so a crafted link runs JavaScript.',
    ],
  },
  {
    name: 'Cross-site request forgery (CSRF)',
    scenarios: [
      'A malicious site makes a logged-in user\'s browser submit a hidden form to their bank, and their cookies are sent along.',
      'Visiting a forum post triggers a hidden request that changes the visitor\'s email on another site where they are logged in.',
    ],
  },
  {
    name: 'SQL injection (SQLi)',
    scenarios: [
      'Typing \' OR 1=1 -- into a login form logs the attacker in without a password.',
      'A product id from the URL is pasted straight into a query, letting an attacker read other tables.',
    ],
  },
  {
    name: 'Clickjacking (UI redressing)',
    scenarios: [
      'Your site is loaded in an invisible iframe on top of a fake button, so users click "Delete account" without knowing.',
    ],
  },
  {
    name: 'Brute-force password guessing',
    scenarios: [
      'A script tries thousands of common passwords against one account on the login form.',
    ],
  },
  {
    name: 'Man-in-the-middle (MITM) attack',
    scenarios: [
      'On public Wi-Fi, someone reads and changes the traffic of a site that still uses plain HTTP.',
    ],
  },
]

const ATTACK_EXPLANATIONS = {
  'Cross-site scripting (XSS)': 'XSS injects JavaScript into pages other people view. Escape output (React does this by default), avoid innerHTML with user data, and add a Content Security Policy.',
  'Cross-site request forgery (CSRF)': 'CSRF tricks a logged-in browser into sending a request it did not mean to. Defend with SameSite cookies and CSRF tokens.',
  'SQL injection (SQLi)': 'SQL injection happens when input becomes part of the query. Always use parameterized queries.',
  'Clickjacking (UI redressing)': 'Clickjacking hides your page under a decoy. Stop other sites from framing yours with the X-Frame-Options or CSP frame-ancestors header.',
  'Brute-force password guessing': 'Brute force guesses passwords over and over. Rate limiting, account lockouts and two-factor authentication slow it down.',
  'Man-in-the-middle (MITM) attack': 'A man-in-the-middle sits between you and the server and can read or change traffic. HTTPS (TLS) stops this by encrypting and verifying the connection.',
}

const COOKIE_FLAGS = [
  { flag: 'HttpOnly', goal: 'JavaScript in the page should not be able to read the session cookie' },
  { flag: 'Secure', goal: 'the cookie should only ever be sent over HTTPS' },
  { flag: 'SameSite=Strict', goal: 'the cookie should not be sent on requests coming from other sites' },
  { flag: 'Max-Age=3600', goal: 'the cookie should expire after one hour' },
  { flag: 'Path=/admin', goal: 'the cookie should only be sent for URLs under /admin' },
]

const WEB_VITALS = [
  { name: 'Largest Contentful Paint (LCP)', what: 'How long until the largest visible content element is painted' },
  { name: 'Cumulative Layout Shift (CLS)', what: 'How much visible content unexpectedly jumps around while loading' },
  { name: 'Interaction to Next Paint (INP)', what: 'How quickly the page visually responds after a click or key press' },
  { name: 'Time to First Byte (TTFB)', what: 'How long until the first byte of the server response arrives' },
  { name: 'First Contentful Paint (FCP)', what: 'How long until the first text or image appears on screen' },
]

const METHOD_CASES = [
  { action: 'load the list of orders', method: 'GET', why: 'GET reads data and should not change anything.' },
  { action: 'create a new order', method: 'POST', why: 'POST creates a new resource; the server usually picks its id.' },
  { action: 'replace a whole user profile with new data', method: 'PUT', why: 'PUT replaces the entire resource with what you send.' },
  { action: 'change only the email field of a user', method: 'PATCH', why: 'PATCH updates just the fields you send and leaves the rest.' },
  { action: 'remove a comment', method: 'DELETE', why: 'DELETE removes the resource at that URL.' },
]

const BIG_O_CASES = [
  { op: 'Reading arr[i] from an array by its index', o: 'O(1)', why: 'The position is computed directly, so the array size does not matter.' },
  { op: 'Looking up a key in a Map or plain object (on average)', o: 'O(1)', why: 'Hash tables jump straight to the key, so lookups stay constant on average.' },
  { op: 'Binary search in a sorted array', o: 'O(log n)', why: 'Each step halves what is left, so doubling the array adds only one step.' },
  { op: 'Finding the largest number in an unsorted array', o: 'O(n)', why: 'You must look at every item once, so work grows with the length.' },
  { op: 'Comparing every item with every other item using two nested loops', o: 'O(n²)', why: 'For each of n items you loop over n items again: n × n steps.' },
  { op: 'Sorting an array with merge sort', o: 'O(n log n)', why: 'Merge sort splits the array log n times and does n work at each level.' },
]
const BIG_O_ALL = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)']

const GIT_CASES = [
  { need: 'download new commits from the remote without changing your files', cmd: 'git fetch', why: 'git fetch only downloads; your branch stays as it is until you merge.' },
  { need: 'download new commits and merge them into your current branch', cmd: 'git pull', why: 'git pull is git fetch followed by git merge (or rebase).' },
  { need: 'move your commits on top of the latest main to keep history straight', cmd: 'git rebase', why: 'Rebase replays your commits onto a new base, giving a straight line of history.' },
  { need: 'undo a pushed commit by adding a new commit that reverses it', cmd: 'git revert', why: 'git revert makes a new opposite commit, so shared history is not rewritten.' },
  { need: 'set aside uncommitted changes so you can switch branches quickly', cmd: 'git stash', why: 'git stash saves your work in progress and cleans the working folder.' },
  { need: 'see which files are changed and which are staged for commit', cmd: 'git status', why: 'git status lists modified, staged and untracked files.' },
  { need: 'copy one specific commit from another branch onto your branch', cmd: 'git cherry-pick', why: 'git cherry-pick applies the changes of a single chosen commit.' },
]
const GIT_ALL = ['git fetch', 'git pull', 'git rebase', 'git revert', 'git stash', 'git status', 'git cherry-pick', 'git merge']

const HEADERS = [
  { name: 'Content-Type', what: 'says what format the body is in, such as JSON' },
  { name: 'Authorization', what: 'carries credentials, such as a bearer token, for the request' },
  { name: 'Location', what: 'gives the URL to go to after a redirect' },
  { name: 'ETag', what: 'gives a version id so a cached copy can be revalidated' },
  { name: 'Set-Cookie', what: 'asks the browser to store a cookie for this site' },
  { name: 'Access-Control-Allow-Origin', what: 'says which other origins may read this response' },
  { name: 'Retry-After', what: 'says how long to wait before trying the request again' },
  { name: 'Cache-Control', what: 'says whether and for how long a response may be cached' },
]

export default [
  // ---------- Templates ----------
  {
    id: 'web-status-meaning',
    type: 'multiple-choice',
    generate(r) {
      const [target, ...others] = r.sample(STATUS_MEANINGS, 4)
      return {
        prompt: r.pick([`What does HTTP status ${target[0]} mean?`, `A server answers with status ${target[0]}. What is it telling you?`]),
        correct: target[1],
        wrong: others.map((o) => o[1]),
        explanation: `The first digit gives the family: 2xx success, 3xx redirect or cache, 4xx the client made a mistake, 5xx the server failed. ${target[0]} is "${target[1]}".`,
      }
    },
  },
  {
    id: 'web-same-origin',
    type: 'multiple-choice',
    generate(r) {
      const host = r.pick(DOMAINS)
      const base = `https://${host}`
      const path = r.pick(['/dashboard', '/login', '/api/items', '/settings'])
      const sub = host.split('.').slice(1).join('.')
      const askSame = r.chance(0.6)
      const same = [`${base}${path}`, `${base}/other?x=1`, `${base}:443${path}`]
      const different = [
        `http://${host}${path}`,
        `${base}:8080${path}`,
        `https://www.${sub}${path}`,
        `https://${host}.evil.com`,
        `https://admin.${sub}${path}`,
      ]
      return {
        prompt: `A page is loaded from ${base}/. Which URL is ${askSame ? 'the SAME origin' : 'a DIFFERENT origin'}?`,
        correct: r.pick(askSame ? same : different),
        wrong: r.sample(askSame ? different : same, 3),
        explanation: 'An origin is scheme + host + port. All three must match. The path and query string do not matter, and https uses port 443 by default, so ":443" changes nothing. http vs https, another subdomain, or another port all make it a different origin.',
      }
    },
  },
  {
    id: 'web-attack-scenario',
    type: 'multiple-choice',
    generate(r) {
      const [target, ...others] = r.sample(ATTACKS, 4)
      return {
        prompt: `Which attack is this? ${r.pick(target.scenarios)}`,
        correct: target.name,
        wrong: others.map((o) => o.name),
        explanation: ATTACK_EXPLANATIONS[target.name],
      }
    },
  },
  {
    id: 'web-cookie-flags',
    type: 'multiple-choice',
    generate(r) {
      const [target, ...others] = r.shuffle(COOKIE_FLAGS)
      return {
        prompt: `Which cookie attribute should you set if ${target.goal}?`,
        correct: target.flag,
        wrong: others.map((o) => o.flag),
        explanation: 'HttpOnly hides a cookie from document.cookie (helps against XSS). Secure sends it only over HTTPS. SameSite limits sending it from other sites (helps against CSRF). Max-Age sets its lifetime, and Path limits which URLs get it.',
      }
    },
  },
  {
    id: 'web-storage-choice',
    type: 'multiple-choice',
    generate(r) {
      const cases = [
        { need: 'a dark-mode setting that should still be there next week', answer: 'localStorage' },
        { need: 'a half-filled form that should be cleared when the tab is closed', answer: 'sessionStorage' },
        { need: 'a login session the server must receive automatically with every request', answer: 'A cookie' },
        { need: 'a value that is only needed until the user refreshes the page', answer: 'A JavaScript variable' },
      ]
      const c = r.pick(cases)
      const all = ['localStorage', 'sessionStorage', 'A cookie', 'A JavaScript variable']
      return {
        prompt: `Where in the browser should you store ${c.need}?`,
        correct: c.answer,
        wrong: all.filter((a) => a !== c.answer),
        explanation: 'localStorage lasts until it is cleared. sessionStorage is wiped when the tab closes. Cookies are sent to the server with each request. A plain variable is lost on refresh.',
      }
    },
  },
  {
    id: 'web-status-scenario',
    type: 'multiple-choice',
    generate(r) {
      const s = r.pick(STATUS_SCENARIOS)
      return {
        prompt: r.pick([`Which status code should the API return? ${s.text}`, `${s.text} Which HTTP status fits best?`]),
        correct: STATUS_LABELS[s.code],
        wrong: s.wrong.map((c) => STATUS_LABELS[c]),
        explanation: s.why,
      }
    },
  },
  {
    id: 'web-vitals-meaning',
    type: 'multiple-choice',
    generate(r) {
      const [target, ...others] = r.sample(WEB_VITALS, 4)
      const askName = r.chance()
      return {
        prompt: askName
          ? `Which performance metric measures this: "${target.what.toLowerCase()}"?`
          : `What does ${target.name} measure?`,
        correct: askName ? target.name : target.what,
        wrong: others.map((o) => (askName ? o.name : o.what)),
        explanation: 'Core Web Vitals are Google\'s main user-experience metrics: LCP (loading speed), CLS (visual stability) and INP (responsiveness). TTFB and FCP are earlier loading milestones.',
      }
    },
  },
  {
    id: 'web-http-method',
    type: 'multiple-choice',
    generate(r) {
      const c = r.pick(METHOD_CASES)
      const resource = r.pick(RESOURCES)
      return {
        prompt: r.pick([
          `In a REST API, which HTTP method should you use to ${c.action}?`,
          `You are designing a REST endpoint to ${c.action}. Which method fits?`,
        ]).replace('orders', resource.plural).replace('order', resource.singular),
        correct: c.method,
        wrong: METHOD_CASES.filter((m) => m.method !== c.method).map((m) => m.method),
        explanation: `${c.why} The usual mapping is GET read, POST create, PUT replace, PATCH partial update, DELETE remove.`,
      }
    },
  },
  {
    id: 'web-big-o',
    type: 'multiple-choice',
    generate(r) {
      const c = r.pick(BIG_O_CASES)
      return {
        prompt: r.pick([`What is the time complexity of this? ${c.op}`, `In Big-O terms, how does this scale? ${c.op}`]),
        correct: c.o,
        wrong: r.shuffle(BIG_O_ALL.filter((o) => o !== c.o)),
        explanation: `${c.why} Big-O describes how the work grows as the input size n grows.`,
      }
    },
  },
  {
    id: 'web-git-command',
    type: 'multiple-choice',
    generate(r) {
      const c = r.pick(GIT_CASES)
      return {
        prompt: r.pick([`Which Git command do you use to ${c.need}?`, `You want to ${c.need}. Which command fits?`]),
        correct: c.cmd,
        wrong: r.shuffle(GIT_ALL.filter((g) => g !== c.cmd)),
        explanation: c.why,
      }
    },
  },
  {
    id: 'web-header-purpose',
    type: 'multiple-choice',
    generate(r) {
      const [target, ...others] = r.sample(HEADERS, 4)
      return {
        prompt: r.pick([`Which HTTP header ${target.what}?`, `You need a header that ${target.what}. Which one is it?`]),
        correct: target.name,
        wrong: others.map((o) => o.name),
        explanation: `${target.name} ${target.what}. Headers are key-value pairs sent before the body of a request or response.`,
      }
    },
  },
  {
    id: 'web-url-part',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const host = r.pick(DOMAINS)
      const port = r.pick(['8080', '3000', '8443'])
      const res = r.pick(RESOURCES)
      const href = `https://${host}:${port}/${res.plural}/${r.int(2, 99)}?sort=${r.pick(['asc', 'new', 'top'])}#${r.pick(['reviews', 'top', 'details'])}`
      const u = new URL(href)
      const tempting = {
        host: [u.hostname, u.origin, `${u.hostname}${u.pathname}`],
        hostname: [u.host, u.origin, `https://${u.hostname}`],
        port: [`:${u.port}`, '443', 'undefined'],
        pathname: [u.pathname + u.search, u.pathname + u.search + u.hash, u.pathname.slice(1)],
        search: [u.search.slice(1), u.search + u.hash, 'sort'],
        hash: [u.hash.slice(1), u.search + u.hash, 'undefined'],
        origin: [`https://${u.hostname}`, u.origin + u.pathname, u.host],
      }
      const prop = r.pick(Object.keys(tempting))
      return {
        prompt: 'What does this code print?',
        code: `const url = new URL('${href}')\nconsole.log(url.${prop})`,
        correct: u[prop],
        wrong: tempting[prop],
        explanation: 'A URL splits into parts: origin (scheme + host + port), host (hostname + port), hostname, port, pathname (the path), search (the "?..." part) and hash (the "#..." part). search and hash keep their leading ? and #.',
      }
    },
  },
  {
    id: 'web-search-params',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const key = r.pick(['tag', 'color', 'size'])
      const vals = { tag: ['js', 'css'], color: ['red', 'blue'], size: ['s', 'm'] }[key]
      const query = `?${key}=${vals[0]}&${key}=${vals[1]}&page=2`
      const cases = [
        { expr: `params.get('${key}')`, correct: vals[0], wrong: [vals[1], `${vals[0]},${vals[1]}`, 'undefined'], why: 'get() returns only the first value for a key that appears more than once. Use getAll() for every value.' },
        { expr: `params.getAll('${key}').length`, correct: '2', wrong: ['1', '3', 'undefined'], why: `getAll() returns an array of every value for that key, here ${vals[0]} and ${vals[1]}.` },
        { expr: 'params.get(\'missing\')', correct: 'null', wrong: ['undefined', 'false', 'TypeError'], why: 'get() returns null, not undefined, when the key is not in the query string.' },
        { expr: 'typeof params.get(\'page\')', correct: 'string', wrong: ['number', 'object', 'undefined'], why: 'Everything in a query string is text. Convert with Number() if you need a number.' },
        { expr: `params.has('${key}')`, correct: 'true', wrong: ['false', '2', vals[0]], why: 'has() tells you whether the key appears at all, returning true or false.' },
      ]
      const c = r.pick(cases)
      return {
        prompt: 'What does this code print?',
        code: `const params = new URLSearchParams('${query}')\nconsole.log(${c.expr})`,
        correct: c.correct,
        wrong: c.wrong,
        explanation: `URLSearchParams reads a query string. ${c.why}`,
      }
    },
  },
  {
    id: 'web-origin-compare',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const host = r.pick(DOMAINS)
      const candidates = [
        `https://${host}/account?tab=2`,
        `https://${host}:443/help`,
        `https://${host}/`,
        `http://${host}/cart`,
        `https://${host}:8443/cart`,
        `https://www.${host}/cart`,
      ]
      const [a, b] = r.sample(candidates, 2)
      const page = new URL(`https://${host}/cart`)
      const res = [a, b].map((u) => new URL(u).origin === page.origin)
      const combos = ['true true', 'true false', 'false true', 'false false']
      const correct = res.join(' ')
      return {
        prompt: 'What does this code print?',
        code: `const page = new URL('https://${host}/cart')\nconst sameOrigin = (u) => new URL(u).origin === page.origin\n\nconsole.log(sameOrigin('${a}'))\nconsole.log(sameOrigin('${b}'))`,
        correct,
        wrong: combos.filter((c) => c !== correct),
        explanation: 'origin is scheme + host + port. The path and query do not count, and :443 is the default for https, so it changes nothing. http instead of https, another port, or a www. subdomain gives a different origin.',
      }
    },
  },
  {
    id: 'web-base64',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const w = r.pick(WORDS)
      const encode = r.chance()
      const enc = btoa(w)
      return encode
        ? {
            prompt: 'btoa() turns text into Base64. What does this print?',
            code: `console.log(btoa('${w}'))`,
            correct: enc,
            wrong: [enc.replace(/=+$/, ''), btoa(w.toUpperCase()), w, btoa(`${w}s`)],
            explanation: `Base64 turns bytes into letters, digits, + and /, with = as padding at the end. btoa('${w}') is ${enc}. It is an encoding, not encryption: anyone can decode it.`,
          }
        : {
            prompt: 'atob() decodes Base64. What does this print?',
            code: `const encoded = btoa('${w}')\nconsole.log(atob(encoded))`,
            correct: w,
            wrong: [enc, w.toUpperCase(), [...w].reverse().join(''), 'undefined'],
            explanation: 'atob() reverses btoa(), so you get the original text back. Base64 needs no key, which is why it must never be used to hide secrets.',
          }
    },
  },
  {
    id: 'web-cookie-parse',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const pairs = r.sample([['theme', 'dark'], ['lang', 'en'], ['sid', 'a1b2'], ['cart', '3'], ['tz', 'UTC']], 3)
      const cookie = pairs.map(([k, v]) => `${k}=${v}`).join('; ')
      const buggy = r.chance(0.4)
      const sep = buggy ? ';' : '; '
      const [key, value] = r.pick(pairs.slice(1))
      const jar = Object.fromEntries(cookie.split(sep).map((p) => p.split('=')))
      const correct = String(jar[key])
      const other = pairs.find(([k]) => k !== key)[1]
      return {
        prompt: 'document.cookie gives one string like this. What does this code print?',
        code: `const cookie = '${cookie}'\nconst jar = Object.fromEntries(cookie.split('${sep}').map((pair) => pair.split('=')))\nconsole.log(jar.${key})`,
        correct,
        wrong: [value, 'undefined', `${key}=${value}`, other, 'null'],
        explanation: buggy
          ? `Splitting on ';' alone leaves a space at the start of every later key, so the key is " ${key}", not "${key}", and jar.${key} is undefined. Split on '; ' (or trim each part).`
          : `Cookies are "name=value" pairs joined by "; ". Splitting on that, then on "=", gives an object where jar.${key} is "${value}".`,
      }
    },
  },
  {
    id: 'web-relative-url',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const host = r.pick(DOMAINS)
      const o = `https://${host}`
      const base = `${o}/docs/guide/intro.html`
      const cases = [
        { rel: 'setup.html', wrong: [`${o}/setup.html`, `${o}/docs/guide/intro.html/setup.html`, `${o}/docs/setup.html`], why: 'A plain name replaces the last part of the path (the file name), keeping the folder.' },
        { rel: '../api.html', wrong: [`${o}/docs/guide/api.html`, `${o}/api.html`, `${o}/docs/guide/../api.html`], why: '"../" goes up one folder from /docs/guide/ to /docs/.' },
        { rel: '/pricing', wrong: [`${o}/docs/guide/pricing`, `${o}/docs/pricing`, `${o}/docs/guide/intro.html/pricing`], why: 'A leading "/" starts from the root of the site.' },
        { rel: '?page=2', wrong: [`${o}/?page=2`, `${o}/docs/guide/?page=2`, `${o}/docs/guide/intro.html/?page=2`], why: 'A link starting with "?" keeps the whole path and only replaces the query string.' },
      ]
      const c = r.pick(cases)
      return {
        prompt: 'A link on a page is resolved against the page URL. What does this print?',
        code: `const page = '${base}'\nconsole.log(new URL('${c.rel}', page).href)`,
        correct: new URL(c.rel, base).href,
        wrong: c.wrong,
        explanation: `${c.why} The browser resolves links in <a href> and <img src> the same way.`,
      }
    },
  },
  {
    id: 'web-status-family',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const kind = (s) => (s >= 500 ? 'server' : s >= 400 ? 'client' : s >= 300 ? 'redirect' : s >= 200 ? 'success' : 'info')
      const status = r.pick([200, 201, 204, 301, 304, 404, 401, 429, 500, 503])
      const ok = status >= 200 && status < 300
      const correct = `${kind(status)} ${ok}`
      const all = ['server', 'client', 'redirect', 'success'].flatMap((k) => [`${k} true`, `${k} false`])
      return {
        prompt: 'What does this code print?',
        code: `function kind(status) {\n  if (status >= 500) return 'server'\n  if (status >= 400) return 'client'\n  if (status >= 300) return 'redirect'\n  if (status >= 200) return 'success'\n  return 'info'\n}\nconst isOk = (status) => status >= 200 && status < 300\n\nconsole.log(kind(${status}), isOk(${status}))`,
        correct,
        wrong: [`${kind(status)} ${!ok}`, ...r.shuffle(all.filter((a) => a !== correct))],
        explanation: `${status} is in the ${String(status)[0]}xx family. fetch's response.ok works like isOk here: it is true only for 200-299, so redirects and errors give false.`,
      }
    },
  },
  {
    id: 'web-loop-count',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const n = r.pick([4, 5, 6, 8, 10])
      const kinds = [
        { body: `for (let i = 0; i < n; i++) {\n  for (let j = 0; j < n; j++) steps++\n}`, run: () => n * n, why: 'Two nested loops over n run n × n times: O(n²).' },
        { body: 'for (let i = 0; i < n; i++) steps++\nfor (let j = 0; j < n; j++) steps++', run: () => 2 * n, why: 'Two loops one after the other run n + n times. That is still O(n), not O(n²).' },
        { body: `for (let i = 0; i < n; i++) {\n  for (let j = 0; j < i; j++) steps++\n}`, run: () => (n * (n - 1)) / 2, why: 'The inner loop runs 0, 1, 2 ... n-1 times, which adds up to n(n-1)/2. That is still O(n²).' },
        {
          body: 'for (let i = n; i > 1; i = Math.floor(i / 2)) steps++',
          run: () => {
            let s = 0
            for (let i = n; i > 1; i = Math.floor(i / 2)) s++
            return s
          },
          why: 'Halving i each time takes about log₂(n) steps. This is O(log n), like binary search.',
        },
      ]
      const k = r.pick(kinds)
      const correct = String(k.run())
      return {
        prompt: 'How many steps are counted? What does this print?',
        code: `const n = ${n}\nlet steps = 0\n${k.body}\nconsole.log(steps)`,
        correct,
        wrong: [n * n, 2 * n, n, (n * (n - 1)) / 2, (n * (n + 1)) / 2, n - 1].map(String),
        explanation: k.why,
      }
    },
  },
  {
    id: 'web-retry-backoff',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const base = r.pick([100, 200, 250, 500])
      const tries = r.pick([3, 4])
      const seq = (f) => Array.from({ length: tries }, (_, a) => f(a)).join(' ')
      return {
        prompt: 'A client retries a failed request with exponential backoff. What does this print?',
        code: `const base = ${base}\nconst delays = []\nfor (let attempt = 0; attempt < ${tries}; attempt++) {\n  delays.push(base * 2 ** attempt)\n}\nconsole.log(delays.join(' '))`,
        correct: seq((a) => base * 2 ** a),
        wrong: [seq((a) => base * (a + 1)), seq((a) => base * 2 ** (a + 1)), seq((a) => base * (a + 1) ** 2)],
        explanation: `Exponential backoff doubles the wait after each failure (2 ** 0 is 1, so the first wait is ${base}). It gives an overloaded server, or one returning 429/503, time to recover.`,
      }
    },
  },
  {
    id: 'web-cache-fresh',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const maxAge = r.pick([60, 120, 300])
      const ages = r.sample([0, maxAge / 2, maxAge - 10, maxAge, maxAge + 5, maxAge * 2], 3)
      const label = (a) => (a < maxAge ? 'fresh' : 'stale')
      const correct = ages.map(label).join(' ')
      const flip = (i) => ages.map((a, j) => (i === j ? (label(a) === 'fresh' ? 'stale' : 'fresh') : label(a))).join(' ')
      return {
        prompt: `A response had Cache-Control: max-age=${maxAge}. What does this print?`,
        code: `const maxAge = ${maxAge} // seconds\nconst ages = [${ages.join(', ')}]\nconsole.log(ages.map((age) => (age < maxAge ? 'fresh' : 'stale')).join(' '))`,
        correct,
        wrong: [flip(0), flip(1), flip(2), 'fresh fresh fresh', 'stale stale stale'],
        explanation: `A cached response is fresh while its age is below max-age (${maxAge} seconds here). After that it is stale and the browser must ask the server again, often getting a quick 304.`,
      }
    },
  },

  // ---------- Fixed questions ----------
  {
    id: 'web-type-url',
    type: 'multiple-choice',
    prompt: ['What happens first when you type a URL into the browser and press Enter?', 'In the classic "what happens when you type a URL" question, which step comes first?'],
    options: [
      'A DNS lookup finds the IP address for the domain',
      'The browser sends the HTTP request to the server',
      'The TLS handshake sets up an encrypted connection',
      'The browser parses the HTML and finds linked files',
    ],
    answer: 0,
    explanation: 'The usual order: DNS lookup, open a TCP connection, TLS handshake (for HTTPS), send the HTTP request, get the response, then parse HTML, load CSS/JS and render.',
  },
  {
    id: 'web-dns',
    type: 'multiple-choice',
    prompt: ['What does DNS do?', 'What is the job of DNS on the web?'],
    options: [
      'It turns domain names like example.com into IP addresses',
      'It encrypts traffic between the browser and the web server',
      'It gives each device on a network its own IP address',
      'It keeps copies of website files on servers near users',
    ],
    answer: 0,
    explanation: 'DNS is like the internet\'s phone book. Computers connect by IP address, and DNS finds the address for a name. Handing out IP addresses is DHCP, and caching files near users is a CDN.',
  },
  {
    id: 'web-https',
    type: 'multiple-choice',
    prompt: 'What does HTTPS add on top of HTTP?',
    options: [
      'TLS encryption plus a certificate proving the server identity',
      'Compression of every response so pages load faster',
      'Hiding which websites you visit from your internet provider',
      'Encryption of the data stored in the server database',
    ],
    answer: 0,
    explanation: 'TLS encrypts data so others on the network cannot read or change it, and the certificate proves you are talking to the real site. It protects data in transit, not data stored on the server.',
  },
  {
    id: 'web-get-post',
    type: 'multiple-choice',
    prompt: 'Which is a key difference between GET and POST?',
    options: [
      'GET reads with URL parameters; POST sends a body to change data',
      'POST is encrypted on the wire, while GET is sent as plain text',
      'GET sends a JSON body, while POST may only send form fields',
      'POST responses get cached by browsers, while GET responses do not',
    ],
    answer: 0,
    explanation: 'GET should be safe (no side effects) and can be cached or bookmarked. POST carries a body and is used for actions. Over HTTPS both are encrypted.',
  },
  {
    id: 'web-authn-authz',
    type: 'multiple-choice',
    prompt: 'What is the difference between authentication and authorization?',
    options: [
      'Authentication checks who you are; authorization checks what you may do',
      'Authorization checks who you are; authentication checks what you may do',
      'Authentication encrypts the password; authorization stores it in the database',
      'Authentication runs in the browser; authorization runs on the server',
    ],
    answer: 0,
    explanation: 'Logging in with a password is authentication. Checking that you may delete a post is authorization. 401 relates to the first, 403 to the second.',
  },
  {
    id: 'web-password-hash',
    type: 'multiple-choice',
    prompt: 'How should a server store user passwords?',
    options: [
      'Hashed with a slow, salted algorithm such as bcrypt or Argon2',
      'Encrypted with AES, with the key kept on the same server',
      'Hashed once with SHA-256 so checking logins stays fast',
      'Base64 encoded so the real password is not visible in the database',
    ],
    answer: 0,
    explanation: 'Hashing is one-way, so even the server cannot read the password. A salt (random extra data) stops precomputed attacks, and slow algorithms make guessing expensive. Fast hashes like SHA-256 are easy to brute-force.',
  },
  {
    id: 'web-cache-control',
    type: 'multiple-choice',
    prompt: 'What does the response header Cache-Control: max-age=3600 tell the browser?',
    options: [
      'It may reuse this response for an hour without asking again',
      'It must check with the server before each reuse of this response',
      'The server will keep this response in its own cache for an hour',
      'It may reuse this response for 3600 minutes before it goes stale',
    ],
    answer: 0,
    explanation: 'max-age is in seconds, so 3600 is one hour. Within that time the browser serves its copy. "Check with the server every time" is what no-cache means.',
  },
  {
    id: 'web-cdn',
    type: 'multiple-choice',
    prompt: 'What is a CDN (Content Delivery Network) used for?',
    options: [
      'Serving copies of static files from servers near each user',
      'Translating domain names into the IP address of your server',
      'Spreading requests evenly across app servers in one data center',
      'Copying the main database so each region can read it faster',
    ],
    answer: 0,
    explanation: 'A CDN keeps copies of static files (images, JS, CSS) in many locations worldwide, which cuts the distance data travels and takes load off your server.',
  },
  {
    id: 'web-csp',
    type: 'multiple-choice',
    prompt: 'What is a Content Security Policy (CSP)?',
    options: [
      'A response header listing which script, style and image sources are allowed',
      'A browser rule that blocks all requests to other origins by default',
      'A server firewall setting that filters out malicious incoming request bodies',
      'A response header telling the browser which other origins may read your API',
    ],
    answer: 0,
    explanation: 'CSP limits where code can come from. Even if an attacker injects a <script>, the browser refuses to run it if it is not from an allowed source. Letting other origins read your API is CORS, a different thing.',
  },
  {
    id: 'web-tcp-udp',
    type: 'multiple-choice',
    prompt: 'Which is true about TCP and UDP?',
    options: [
      'TCP resends lost packets and keeps order; UDP does neither',
      'UDP resends lost packets and keeps order; TCP does neither',
      'TCP carries web pages, while UDP is reserved for email',
      'Both guarantee delivery, but UDP encrypts packets by default',
    ],
    answer: 0,
    explanation: 'TCP checks that everything arrives, in order, which suits web pages and files. UDP skips those checks, which suits video calls and games where speed matters more.',
  },
  {
    id: 'web-websocket',
    type: 'multiple-choice',
    prompt: 'A chat app needs the server to push new messages instantly. What fits best?',
    options: [
      'A WebSocket connection that stays open in both directions',
      'Polling the server with a fetch request every few seconds',
      'A longer Cache-Control max-age so new messages arrive sooner',
      'A service worker that reads new messages from the database',
    ],
    answer: 0,
    explanation: 'Normal HTTP is request then response. A WebSocket stays open so either side can send at any time. Polling works but adds delay and wasted requests. Server-Sent Events are a simpler one-way option.',
  },
  {
    id: 'web-rendering',
    type: 'multiple-choice',
    prompt: 'Why is it common to put <script> tags at the end of <body> (or use defer)?',
    options: [
      'A plain script pauses HTML parsing until it downloads and runs',
      'Scripts in the head cannot use the document or window objects',
      'Browsers download scripts in the head only after all the images',
      'Scripts at the end of body run in a safer, sandboxed context',
    ],
    answer: 0,
    explanation: 'When the parser meets a plain <script>, it stops to download and run it. Putting it last or using defer lets the page show content first, and the elements exist by the time the script runs.',
  },
  {
    id: 'web-load-balancer',
    type: 'multiple-choice',
    prompt: 'What does a load balancer do?',
    options: [
      'It spreads incoming requests across several backend servers',
      'It caches static files in many regions close to users',
      'It splits one large request into smaller parallel requests',
      'It limits how many requests each user may send per minute',
    ],
    answer: 0,
    explanation: 'With several copies of your server behind a load balancer, more users can be served, and if one server fails the others keep working. Caching near users is a CDN; limiting requests is rate limiting.',
  },
  {
    id: 'web-http2',
    type: 'multiple-choice',
    prompt: 'What is a major improvement in HTTP/2 over HTTP/1.1?',
    options: [
      'Many requests can share one connection at once (multiplexing)',
      'It runs over UDP instead of TCP to set up connections faster',
      'It removes headers, so every request is smaller and faster',
      'It replaces JSON API bodies with a faster binary data format',
    ],
    answer: 0,
    explanation: 'HTTP/1.1 handled one request at a time per connection, so browsers opened several. HTTP/2 sends many requests in parallel over one connection, and compresses (not removes) headers. Running over UDP is HTTP/3.',
  },
  {
    id: 'web-jwt-storage',
    type: 'multiple-choice',
    prompt: 'Why do many teams prefer an HttpOnly cookie over localStorage for storing a login token?',
    options: [
      'Scripts cannot read HttpOnly cookies, so XSS cannot steal the token',
      'Browsers encrypt cookies on disk, while localStorage is plain text',
      'localStorage is shared with every other site the user visits',
      'HttpOnly cookies cannot be sent by a CSRF attack from another site',
    ],
    answer: 0,
    explanation: 'Anything in localStorage can be read by any script on the page, including injected ones. HttpOnly cookies are hidden from scripts, but they are still sent automatically, so you also need CSRF protection.',
  },
  {
    id: 'web-rest-stateless',
    type: 'multiple-choice',
    prompt: 'What does it mean that HTTP (and REST) is "stateless"?',
    options: [
      'Each request carries all it needs, without relying on earlier ones',
      'The server stores no data at all, so it cannot use a database',
      'Responses must stay identical for the same URL so they can be cached',
      'The connection closes after each response, so cookies cannot be used',
    ],
    answer: 0,
    explanation: 'Every request stands alone, so any server can answer it. That is why login state travels with each request in a cookie or token. The server can still store data in a database.',
  },
  {
    id: 'web-301-302',
    type: 'multiple-choice',
    prompt: ['What is the difference between a 301 and a 302 redirect?', 'You moved a page to a new URL for good. Why pick 301 over 302?'],
    options: [
      '301 is a permanent move; 302 is a temporary one',
      '301 is a temporary move; 302 is a permanent one',
      '301 redirects GET requests; 302 redirects POST requests',
      '301 is sent by the browser; 302 is sent by the server',
    ],
    answer: 0,
    explanation: 'Browsers and search engines remember a 301 and update to the new URL. A 302 says "for now, go there", so they keep using the old URL.',
  },
  {
    id: 'web-etag',
    type: 'multiple-choice',
    prompt: 'The browser sends If-None-Match with the ETag of its cached file, and the file has not changed. What does the server reply?',
    options: [
      '304 Not Modified with an empty body',
      '200 OK with the full file again',
      '204 No Content with a new ETag',
      '302 Found pointing to the cached copy',
    ],
    answer: 0,
    explanation: 'An ETag is a version id for a response. If it still matches, the server answers 304 with no body, and the browser uses its cached copy. This saves bandwidth.',
  },
  {
    id: 'web-content-type-accept',
    type: 'multiple-choice',
    prompt: 'What is the difference between the Content-Type and Accept headers?',
    options: [
      'Content-Type describes the body sent; Accept lists formats wanted back',
      'Accept describes the body sent; Content-Type lists formats wanted back',
      'Content-Type sets the character set; Accept sets the response language',
      'Content-Type sets compression; Accept lists the compression the client supports',
    ],
    answer: 0,
    explanation: 'Content-Type: application/json says "my body is JSON". Accept: application/json says "please answer in JSON". Language and compression have their own headers (Accept-Language, Accept-Encoding).',
  },
  {
    id: 'web-cors',
    type: 'multiple-choice',
    prompt: ['What is CORS?', 'What does CORS (Cross-Origin Resource Sharing) do?'],
    options: [
      'Headers that let a server allow other origins to read responses',
      'A browser setting that blocks every request to another domain',
      'A server firewall that rejects requests from unknown websites',
      'A header that encrypts responses sent between different origins',
    ],
    answer: 0,
    explanation: 'By default the same-origin policy stops a page from reading responses from another origin. CORS lets the server relax that, with headers like Access-Control-Allow-Origin.',
  },
  {
    id: 'web-cors-postman',
    type: 'multiple-choice',
    prompt: 'Your API works in Postman and curl, but the browser shows a CORS error. Why?',
    options: [
      'The browser enforces CORS; Postman and curl do not check it',
      'The browser sends no cookies, so the API rejects the request',
      'A CORS error means the server crashed on the browser request',
      'Browsers require HTTPS, while Postman upgrades requests by itself',
    ],
    answer: 0,
    explanation: 'CORS is a browser safety rule. Tools like curl and Postman are not browsers, so they ignore it. The fix is on the server: send the right Access-Control-Allow-Origin header.',
  },
  {
    id: 'web-cors-preflight',
    type: 'multiple-choice',
    prompt: 'Before a cross-origin PUT request with a JSON body, the browser sends an extra request first. What is it?',
    options: [
      'An OPTIONS preflight asking if that method and headers are allowed',
      'A HEAD request checking that the resource exists before uploading',
      'A GET request fetching a fresh CSRF token to send with the PUT',
      'A second TLS handshake to confirm the other origin is trusted',
    ],
    answer: 0,
    explanation: 'For "non-simple" requests (methods like PUT or DELETE, or a JSON content type) the browser first asks with OPTIONS. Only if the server allows it does the real request go out.',
  },
  {
    id: 'web-csrf-defense',
    type: 'multiple-choice',
    prompt: 'Which measure best protects a form against CSRF?',
    options: [
      'A SameSite cookie plus a secret CSRF token in the form',
      'Escaping all user input before showing it on the page',
      'Hashing passwords with bcrypt before saving them to the database',
      'Switching the form from GET to POST so the data is hidden',
    ],
    answer: 0,
    explanation: 'CSRF works because the browser sends your cookies automatically. A token the attacker cannot know, plus SameSite cookies, stops forged requests. POST alone does not help: hidden forms can POST too.',
  },
  {
    id: 'web-xss-defense',
    type: 'multiple-choice',
    prompt: 'A page shows each user\'s display name from the database. What best prevents stored XSS?',
    options: [
      'Escape the name as text before putting it into HTML',
      'Check that the visitor is logged in before showing names',
      'Serve the page over HTTPS so the name cannot be changed',
      'Keep the name in an HttpOnly cookie instead of the database',
    ],
    answer: 0,
    explanation: 'Escaping turns < and > into harmless text, so a name like <script> is shown, not run. React escapes by default; innerHTML and dangerouslySetInnerHTML do not.',
  },
  {
    id: 'web-sqli-fix',
    type: 'multiple-choice',
    prompt: 'What is the right fix for SQL injection in a login query?',
    options: [
      'Use parameterized queries so input is kept apart from the SQL',
      'Escape quotes in the browser with JavaScript before submitting',
      'Hash the username first, then put it into the query string',
      'Hide database error messages so attackers cannot see the SQL',
    ],
    answer: 0,
    explanation: 'With parameters (placeholders like ? or $1) the database treats input only as data, never as SQL code. Client-side checks can be skipped by an attacker, and hiding errors only makes attacks harder to see.',
  },
  {
    id: 'web-oauth-oidc',
    type: 'multiple-choice',
    prompt: ['How do OAuth 2.0 and OpenID Connect differ?', 'What does OpenID Connect add to OAuth 2.0?'],
    options: [
      'OAuth grants access to resources; OpenID Connect adds user identity',
      'OpenID Connect grants access to resources; OAuth adds user identity',
      'OAuth is meant for mobile apps; OpenID Connect is meant for websites',
      'OAuth stores user passwords for apps; OpenID Connect encrypts them',
    ],
    answer: 0,
    explanation: 'OAuth 2.0 is about authorization: giving an app an access token to call an API for you. OpenID Connect is a layer on top that adds login (authentication) with an ID token describing the user.',
  },
  {
    id: 'web-session-vs-jwt',
    type: 'multiple-choice',
    prompt: 'What is a key difference between server sessions and stateless tokens like JWTs?',
    options: [
      'A session lives on the server; a JWT carries its own signed data',
      'A JWT is encrypted so nobody can read it; sessions are plain text',
      'A JWT can be cancelled instantly; a session lasts until it expires',
      'Sessions end when the tab closes; a JWT lasts until it is deleted',
    ],
    answer: 0,
    explanation: 'With sessions the server stores your login and the cookie holds only an id. A JWT holds the data itself, signed so it cannot be changed. JWTs are usually signed, not encrypted, so anyone can read them, and they are hard to revoke early.',
  },
  {
    id: 'web-hash-vs-encrypt',
    type: 'multiple-choice',
    prompt: 'What is the difference between hashing and encryption?',
    options: [
      'Hashing is one-way; encryption can be reversed with the right key',
      'Encryption is one-way; hashing can be reversed with the right key',
      'Hashing compresses data to save space; encryption hides it from others',
      'Hashing needs a secret key; encryption works without a key',
    ],
    answer: 0,
    explanation: 'A hash cannot be turned back into the input, which suits passwords. Encrypted data can be decrypted by whoever has the key, which suits data you need to read again.',
  },
  {
    id: 'web-critical-rendering-path',
    type: 'multiple-choice',
    prompt: ['In what order does the browser turn HTML and CSS into pixels?', 'Which order describes the critical rendering path?'],
    options: [
      'Build DOM and CSSOM, then render tree, layout, paint',
      'Build DOM, paint, then layout, then build the CSSOM',
      'Layout first, then build DOM, CSSOM and render tree',
      'Build render tree, then DOM and CSSOM, layout, paint',
    ],
    answer: 0,
    explanation: 'The DOM comes from HTML and the CSSOM from CSS. Together they make the render tree (visible elements with styles). Layout works out sizes and positions, and paint draws the pixels.',
  },
  {
    id: 'web-reflow',
    type: 'multiple-choice',
    prompt: 'Which change usually forces the browser to recalculate layout (a reflow)?',
    options: [
      'Changing an element\'s width or font size',
      'Changing an element\'s background color',
      'Fading an element\'s opacity with a transition',
      'Moving an element with transform: translateX()',
    ],
    answer: 0,
    explanation: 'Size changes can move everything around them, so layout runs again. Color only needs a repaint, and opacity and transform can be handled by the GPU without layout, which is why they animate smoothly.',
  },
  {
    id: 'web-lazy-loading',
    type: 'multiple-choice',
    prompt: 'What does loading="lazy" on an <img> do?',
    options: [
      'Waits to download the image until it is near the viewport',
      'Downloads a blurry version first, then swaps in the sharp one',
      'Loads the image only after every script on the page has run',
      'Keeps the image out of the cache so memory use stays low',
    ],
    answer: 0,
    explanation: 'Lazy loading skips images far below the screen until the user scrolls close to them. That speeds up the first load. Do not lazy-load the main image at the top, or LCP gets worse.',
  },
  {
    id: 'web-service-worker',
    type: 'multiple-choice',
    prompt: ['What is a service worker mainly used for?', 'Why does a PWA (Progressive Web App) register a service worker?'],
    options: [
      'Intercepting network requests to enable offline caching and push',
      'Running heavy calculations in a background thread for the page',
      'Rendering React components on the server before sending HTML',
      'Keeping a WebSocket open so the server can reach the page',
    ],
    answer: 0,
    explanation: 'A service worker is a script that sits between the page and the network. It can answer requests from a cache (so the app works offline) and receive push notifications. Background calculation is what a Web Worker does.',
  },
  {
    id: 'web-sse-vs-websocket',
    type: 'multiple-choice',
    prompt: 'How do Server-Sent Events (SSE) differ from WebSockets?',
    options: [
      'SSE is one-way, server to client, over normal HTTP',
      'SSE is two-way, while WebSockets only send from the server',
      'SSE uses UDP for speed, while WebSockets use TCP',
      'SSE needs a browser plugin, while WebSockets are built in',
    ],
    answer: 0,
    explanation: 'SSE (EventSource) streams updates from the server over a normal HTTP response and reconnects on its own. WebSockets are two-way. SSE suits live feeds and notifications.',
  },
  {
    id: 'web-rest-vs-graphql',
    type: 'multiple-choice',
    prompt: 'What is a common reason to choose GraphQL over REST?',
    options: [
      'Clients can ask for exactly the fields they need in one request',
      'GraphQL responses get cached by browsers and CDNs with no extra work',
      'GraphQL needs no server code, since queries run in the database',
      'GraphQL replaces HTTP, so requests skip most network overhead',
    ],
    answer: 0,
    explanation: 'With REST you may call several endpoints and get extra fields you do not need. GraphQL uses one endpoint where the client describes the exact data it wants. Caching is actually easier with REST.',
  },
  {
    id: 'web-merge-vs-rebase',
    type: 'multiple-choice',
    prompt: 'What is the difference between git merge and git rebase?',
    options: [
      'Merge joins histories with a merge commit; rebase replays commits on top',
      'Rebase joins histories with a merge commit; merge replays commits on top',
      'Merge deletes the other branch afterwards; rebase keeps both branches',
      'Merge works only on local branches; rebase works on remote branches',
    ],
    answer: 0,
    explanation: 'Merge keeps history as it happened and ties branches together with a merge commit. Rebase rewrites your commits on top of another branch for a straight line. Do not rebase commits others already pulled.',
  },
  {
    id: 'web-alt-text',
    type: 'multiple-choice',
    prompt: 'Why should an <img> have a meaningful alt attribute?',
    options: [
      'Screen readers read it aloud, and it shows if the image fails',
      'Browsers use it to compress the image so it loads faster',
      'Browsers use it to reserve the image size before it downloads',
      'It adds a tooltip on hover, which is its main use for visitors',
    ],
    answer: 0,
    explanation: 'alt describes the image for people who cannot see it and for when it fails to load. Purely decorative images should use alt="". Reserving space is done with width and height, and tooltips come from title.',
  },
  {
    id: 'web-button-vs-div',
    type: 'multiple-choice',
    prompt: 'Why use a <button> instead of a clickable <div> for actions?',
    options: [
      'A button can be focused and used with a keyboard and screen reader',
      'A div cannot have click event listeners in modern browsers',
      'A button loads faster, because browsers cache native elements',
      'A div with onclick is blocked by the Content Security Policy',
    ],
    answer: 0,
    explanation: 'A <button> gets keyboard focus, works with Enter and Space, and is announced as a button. A <div> can be clicked with a mouse but needs extra work (tabindex, role, key handlers) to be accessible.',
  },
  {
    id: 'web-tcp-handshake',
    type: 'multiple-choice',
    prompt: 'What is the TCP three-way handshake?',
    options: [
      'SYN, SYN-ACK and ACK messages that open a connection',
      'Client hello, server hello and finished messages for encryption',
      'A DNS query, a DNS answer and an ACK to find the server',
      'A GET, a 200 OK and an ACK that complete one HTTP request',
    ],
    answer: 0,
    explanation: 'Before any HTTP is sent, the client sends SYN, the server replies SYN-ACK, and the client confirms with ACK. Hello messages belong to the TLS handshake, which comes after.',
  },
  {
    id: 'web-http3',
    type: 'multiple-choice',
    prompt: 'What is special about HTTP/3?',
    options: [
      'It runs over QUIC, which is built on UDP instead of TCP',
      'It turns off encryption so new connections start faster',
      'It is the first version to send many requests over one connection',
      'It replaces HTML with a binary format that browsers parse faster',
    ],
    answer: 0,
    explanation: 'HTTP/3 uses QUIC, a protocol on top of UDP with encryption built in. A lost packet no longer holds up every other request, which helps on bad mobile networks. Multiplexing already came with HTTP/2.',
  },
  {
    id: 'web-idempotent',
    type: 'multiple-choice',
    prompt: 'Which HTTP method is meant to be idempotent, so sending it twice has the same effect as once?',
    options: [
      'PUT, which replaces the resource with the same data',
      'POST, which creates the resource from the same data',
      'PATCH, which by definition cannot apply a change twice',
      'CONNECT, which reuses the same tunnel for every request',
    ],
    answer: 0,
    explanation: 'Idempotent means repeating the request does not change the result further. PUT the same profile twice and you get the same profile. POST twice and you may create two orders. GET and DELETE are idempotent too.',
  },
  {
    id: 'web-cookie-vs-localstorage',
    type: 'multiple-choice',
    prompt: 'What is a key difference between cookies and localStorage?',
    options: [
      'Cookies are sent with requests; localStorage stays in the browser',
      'localStorage is sent to the server with requests; cookies stay in the browser',
      'Cookies can hold megabytes of data; localStorage holds only a few kilobytes',
      'localStorage is cleared when the tab closes; cookies last until deleted',
    ],
    answer: 0,
    explanation: 'Cookies (about 4 KB each) travel with every matching request. localStorage (around 5 MB) is only read by JavaScript and stays until cleared. Clearing on tab close is sessionStorage.',
  },
  {
    id: 'web-async-defer',
    type: 'multiple-choice',
    prompt: 'What is the difference between async and defer on a <script> tag?',
    options: [
      'Defer runs scripts in order after parsing; async runs each when ready',
      'Async runs scripts in order after parsing; defer runs each when ready',
      'Defer pauses HTML parsing until the script downloads; async does not',
      'Async works for inline scripts only; defer works for external ones',
    ],
    answer: 0,
    explanation: 'Both download without blocking the parser. defer waits until the HTML is parsed and keeps the script order. async runs as soon as it arrives, in any order, which suits independent scripts like analytics.',
  },
  {
    id: 'web-hsts',
    type: 'multiple-choice',
    prompt: 'What does the Strict-Transport-Security (HSTS) header do?',
    options: [
      'Makes the browser use HTTPS for this site on future visits',
      'Encrypts cookies so other sites cannot read their values',
      'Stops other sites from showing this site inside an iframe',
      'Requires every script on the page to load from HTTPS sources',
    ],
    answer: 0,
    explanation: 'After seeing HSTS, the browser switches http:// links to https:// for that site, even if the user types http. That blocks downgrade attacks. Framing is controlled by X-Frame-Options or CSP.',
  },
  {
    id: 'web-encode-uri-component',
    type: 'code-output',
    check: 'node',
    prompt: 'You put user input into a query string. What does this print?',
    code: 'console.log(encodeURIComponent(\'a b&c=d\'))',
    options: ['a%20b%26c%3Dd', 'a+b&c=d', 'a%20b&c=d', 'a+b%26c%3Dd'],
    answer: 0,
    explanation: 'encodeURIComponent escapes characters that have a meaning in URLs, like space (%20), & (%26) and = (%3D). Without it, "&c=d" would look like a second parameter.',
  },
  {
    id: 'web-search-params-string',
    type: 'code-output',
    check: 'node',
    prompt: 'What does this print?',
    code: 'const params = new URLSearchParams({ q: \'red shoes\', page: 1 })\nconsole.log(params.toString())',
    options: ['q=red+shoes&page=1', 'q=red%20shoes&page=1', 'q=red shoes&page=1', '?q=red+shoes&page=1'],
    answer: 0,
    explanation: 'URLSearchParams uses form encoding, where a space becomes "+". toString() does not add the leading "?" and turns the number 1 into the text "1".',
  },
  {
    id: 'web-json-undefined',
    type: 'code-output',
    check: 'node',
    prompt: 'What does this send as the request body?',
    code: 'const body = JSON.stringify({ id: 1, note: undefined, tags: [undefined] })\nconsole.log(body)',
    options: ['{"id":1,"tags":[null]}', '{"id":1,"note":undefined,"tags":[undefined]}', '{"id":1,"note":null,"tags":[null]}', '{"id":1,"tags":[]}'],
    answer: 0,
    explanation: 'JSON has no undefined. JSON.stringify drops object properties that are undefined, and turns undefined inside an array into null so the positions stay the same.',
  },
  {
    id: 'web-json-date',
    type: 'code-output',
    check: 'node',
    prompt: 'A date goes to the server as JSON and comes back. What does this print?',
    code: 'const sent = JSON.stringify({ createdAt: new Date(0) })\nconst received = JSON.parse(sent)\nconsole.log(typeof received.createdAt)',
    options: ['string', 'object', 'number', 'undefined'],
    answer: 0,
    explanation: 'JSON has no date type. JSON.stringify turns a Date into an ISO string like "1970-01-01T00:00:00.000Z", and JSON.parse leaves it as a string. Use new Date(value) to get a Date back.',
  },
  {
    id: 'web-json-string-number',
    type: 'code-output',
    check: 'node',
    prompt: 'An API returns a count as a string. What does this print?',
    code: 'const data = JSON.parse(\'{ "count": "5" }\')\nconsole.log(data.count + 1)',
    options: ['51', '6', 'NaN', '"5"1'],
    answer: 0,
    explanation: 'The quotes make "5" a string in JSON. With + and a string, JavaScript joins text, so "5" + 1 is "51". Convert with Number(data.count) first.',
  },
  {
    id: 'web-url-normalize',
    type: 'code-output',
    check: 'node',
    prompt: 'What does this print?',
    code: 'const url = new URL(\'HTTPS://Shop.Example.COM:443/Cart\')\nconsole.log(url.href)',
    options: ['https://shop.example.com/Cart', 'https://shop.example.com:443/Cart', 'https://shop.example.com/cart', 'HTTPS://Shop.Example.COM:443/Cart'],
    answer: 0,
    explanation: 'Scheme and host names are not case-sensitive, so they are lowercased. Port 443 is the default for https, so it is dropped. The path is case-sensitive, so /Cart stays as it is.',
  },
  {
    id: 'web-escape-html',
    type: 'code-output',
    check: 'node',
    prompt: 'This helper protects against XSS. What does it print?',
    code: 'const escapeHtml = (s) =>\n  s.replace(/&/g, \'&amp;\').replace(/</g, \'&lt;\').replace(/>/g, \'&gt;\')\n\nconsole.log(escapeHtml(\'<b>Tom & Jerry</b>\'))',
    options: ['&lt;b&gt;Tom &amp; Jerry&lt;/b&gt;', '<b>Tom & Jerry</b>', '&lt;b&gt;Tom & Jerry&lt;/b&gt;', '&lt;b&gt;Tom &amp;amp; Jerry&lt;/b&gt;'],
    answer: 0,
    explanation: 'Every <, > and & becomes an HTML entity, so the browser shows the text instead of treating it as tags. & is replaced first so the & inside &lt; is not escaped again.',
  },
  {
    id: 'web-search-params-set',
    type: 'code-output',
    check: 'node',
    prompt: 'What does this print?',
    code: 'const url = new URL(\'https://api.example.com/items?page=1&sort=new\')\nurl.searchParams.set(\'page\', \'2\')\nurl.searchParams.append(\'sort\', \'old\')\nconsole.log(url.search)',
    options: ['?page=2&sort=new&sort=old', '?page=1&sort=new&page=2&sort=old', '?page=2&sort=old', '?page=2&sort=new,old'],
    answer: 0,
    explanation: 'set() replaces the existing value of a key. append() adds another entry with the same key, so sort now appears twice.',
  },
]
