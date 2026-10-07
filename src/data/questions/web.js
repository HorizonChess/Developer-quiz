import { DOMAINS } from '../pools.js'

const STATUS_MEANINGS = [
  ['200', 'OK: the request succeeded'],
  ['201', 'Created: a new resource was made'],
  ['204', 'No Content: success, with an empty body'],
  ['301', 'Moved Permanently: the resource has a new URL'],
  ['304', 'Not Modified: use your cached copy'],
  ['400', 'Bad Request: the request is malformed or invalid'],
  ['401', 'Unauthorized: you need to log in'],
  ['403', 'Forbidden: logged in, but not allowed'],
  ['404', 'Not Found: nothing exists at this URL'],
  ['405', 'Method Not Allowed: wrong HTTP method for this URL'],
  ['429', 'Too Many Requests: you are being rate limited'],
  ['500', 'Internal Server Error: the server hit a bug'],
  ['502', 'Bad Gateway: a proxy got a bad answer from the server behind it'],
  ['503', 'Service Unavailable: the server is overloaded or down for maintenance'],
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
    name: 'SQL injection',
    scenarios: [
      'Typing \' OR 1=1 -- into a login form logs the attacker in without a password.',
      'A product id from the URL is pasted straight into a query, letting an attacker read other tables.',
    ],
  },
  {
    name: 'Clickjacking',
    scenarios: [
      'Your site is loaded in an invisible iframe on top of a fake button, so users click "Delete account" without knowing.',
    ],
  },
  {
    name: 'Brute-force attack',
    scenarios: [
      'A script tries thousands of common passwords against one account on the login form.',
    ],
  },
]

const COOKIE_FLAGS = [
  { flag: 'HttpOnly', goal: 'JavaScript in the page should not be able to read the session cookie' },
  { flag: 'Secure', goal: 'the cookie should only ever be sent over HTTPS' },
  { flag: 'SameSite=Strict', goal: 'the cookie should not be sent on requests coming from other sites' },
  { flag: 'Max-Age=3600', goal: 'the cookie should expire after one hour' },
]

export default [
  // ---------- Templates ----------
  {
    id: 'web-status-meaning',
    type: 'multiple-choice',
    generate(r) {
      const [target, ...others] = r.sample(STATUS_MEANINGS, 4)
      return {
        prompt: `What does HTTP status ${target[0]} mean?`,
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
      const same = [`${base}${path}`, `${base}/other/page?x=1`, `${base}:443${path}`]
      const different = [
        `http://${host}${path}`,
        `${base}:8080${path}`,
        `https://www.${sub}${path}`,
        `https://${host}.evil.com${path}`,
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
        explanation: {
          'Cross-site scripting (XSS)': 'XSS injects JavaScript into pages other people view. Escape output (React does this by default), avoid innerHTML with user data, and add a Content Security Policy.',
          'Cross-site request forgery (CSRF)': 'CSRF tricks a logged-in browser into sending a request it did not mean to. Defend with SameSite cookies and CSRF tokens.',
          'SQL injection': 'SQL injection happens when input becomes part of the query. Always use parameterized queries.',
          Clickjacking: 'Clickjacking hides your page under a decoy. Stop other sites from framing yours with the X-Frame-Options or CSP frame-ancestors header.',
          'Brute-force attack': 'Brute force guesses passwords over and over. Rate limiting, account lockouts and two-factor authentication slow it down.',
        }[target.name],
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
        explanation: 'HttpOnly hides a cookie from document.cookie (helps against XSS). Secure sends it only over HTTPS. SameSite limits sending it from other sites (helps against CSRF). Max-Age or Expires sets its lifetime.',
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

  // ---------- Fixed questions ----------
  {
    id: 'web-type-url',
    type: 'multiple-choice',
    prompt: ['What happens first when you type a URL into the browser and press Enter?', 'In the classic "what happens when you type a URL" question, which step comes first?'],
    options: [
      'A DNS lookup turns the domain name into an IP address',
      'The browser renders the HTML',
      'The server runs the JavaScript',
      'The CSS is downloaded',
    ],
    answer: 0,
    explanation: 'The usual order: DNS lookup, open a TCP connection, TLS handshake (for HTTPS), send the HTTP request, get the response, then parse HTML, load CSS/JS and render.',
  },
  {
    id: 'web-dns',
    type: 'multiple-choice',
    prompt: 'What does DNS do?',
    options: [
      'Translates domain names like example.com into IP addresses',
      'Encrypts web traffic',
      'Stores website files',
      'Speeds up JavaScript',
    ],
    answer: 0,
    explanation: 'DNS is like the internet\'s phone book. Computers connect by IP address, and DNS finds the address for a name.',
  },
  {
    id: 'web-https',
    type: 'multiple-choice',
    prompt: 'What does HTTPS add on top of HTTP?',
    options: [
      'Encryption and proof of the server\'s identity, using TLS',
      'Faster page loads only',
      'A different port and nothing else',
      'Automatic login',
    ],
    answer: 0,
    explanation: 'TLS encrypts data so others on the network cannot read or change it, and the certificate proves you are talking to the real site.',
  },
  {
    id: 'web-get-post',
    type: 'multiple-choice',
    prompt: 'Which is a key difference between GET and POST?',
    options: [
      'GET reads data and puts parameters in the URL; POST sends data in the request body to create or change something',
      'POST is always encrypted and GET is not',
      'GET can only return HTML',
      'POST requests cannot have a response',
    ],
    answer: 0,
    explanation: 'GET should be safe (no side effects) and can be cached or bookmarked. POST carries a body and is used for actions. Over HTTPS both are encrypted.',
  },
  {
    id: 'web-authn-authz',
    type: 'multiple-choice',
    prompt: 'What is the difference between authentication and authorization?',
    options: [
      'Authentication checks who you are; authorization checks what you are allowed to do',
      'They mean the same thing',
      'Authorization happens before authentication',
      'Authentication is only for admins',
    ],
    answer: 0,
    explanation: 'Logging in with a password is authentication. Checking that you may delete a post is authorization. 401 relates to the first, 403 to the second.',
  },
  {
    id: 'web-password-hash',
    type: 'multiple-choice',
    prompt: 'How should a server store user passwords?',
    options: [
      'Hashed with a slow, salted algorithm like bcrypt or Argon2',
      'In plain text so support can read them',
      'Encrypted with a key stored next to the database',
      'Hashed with plain MD5',
    ],
    answer: 0,
    explanation: 'Hashing is one-way, so even the server cannot read the password. A salt stops precomputed attacks, and slow algorithms make guessing expensive. MD5 is far too fast.',
  },
  {
    id: 'web-cache-control',
    type: 'multiple-choice',
    prompt: 'What does the response header Cache-Control: max-age=3600 tell the browser?',
    options: [
      'It may reuse this response for one hour without asking the server again',
      'The page expires in 3600 days',
      'Never cache this response',
      'Delete the cookie after an hour',
    ],
    answer: 0,
    explanation: 'max-age is in seconds. Within that time the browser serves its copy. Use no-store for things that must never be cached, like private data.',
  },
  {
    id: 'web-cdn',
    type: 'multiple-choice',
    prompt: 'What is a CDN (Content Delivery Network) used for?',
    options: [
      'Serving files from servers close to the user, so they load faster',
      'Writing CSS',
      'Hosting the database',
      'Checking passwords',
    ],
    answer: 0,
    explanation: 'A CDN keeps copies of static files (images, JS, CSS) in many locations worldwide, which cuts the distance data travels and takes load off your server.',
  },
  {
    id: 'web-csp',
    type: 'multiple-choice',
    prompt: 'What is a Content Security Policy (CSP)?',
    options: [
      'A header telling the browser which sources of scripts, styles and images are allowed',
      'A privacy policy page',
      'A firewall on the server',
      'A rule for password length',
    ],
    answer: 0,
    explanation: 'CSP limits where code can come from. Even if an attacker injects a <script>, the browser refuses to run it if it is not from an allowed source. It is a strong defense against XSS.',
  },
  {
    id: 'web-tcp-udp',
    type: 'multiple-choice',
    prompt: 'Which is true about TCP and UDP?',
    options: [
      'TCP guarantees ordered delivery; UDP is faster but packets can be lost',
      'UDP guarantees delivery; TCP does not',
      'They are the same protocol',
      'Websites only use UDP',
    ],
    answer: 0,
    explanation: 'TCP checks that everything arrives, in order, which suits web pages and files. UDP skips those checks, which suits video calls and games where speed matters more.',
  },
  {
    id: 'web-websocket',
    type: 'multiple-choice',
    prompt: 'A chat app needs the server to push new messages instantly. What fits best?',
    options: [
      'WebSockets, which keep a two-way connection open',
      'Reloading the page every second',
      'Sending an email for each message',
      'A larger HTTP cache',
    ],
    answer: 0,
    explanation: 'Normal HTTP is request then response. A WebSocket stays open so either side can send at any time. Server-Sent Events are a simpler one-way option.',
  },
  {
    id: 'web-rendering',
    type: 'multiple-choice',
    prompt: 'Why is it common to put <script> tags at the end of <body> (or use defer)?',
    options: [
      'A normal script blocks HTML parsing, so the page appears later',
      'Scripts cannot run in <head>',
      'It makes the script more secure',
      'Browsers ignore scripts in <head>',
    ],
    answer: 0,
    explanation: 'When the parser meets a plain <script>, it stops to download and run it. Putting it last or using defer lets the page show content first.',
  },
  {
    id: 'web-load-balancer',
    type: 'multiple-choice',
    prompt: 'What does a load balancer do?',
    options: [
      'Spreads incoming requests across several servers',
      'Compresses images',
      'Balances CSS layouts',
      'Stores sessions in the browser',
    ],
    answer: 0,
    explanation: 'With several copies of your server behind a load balancer, more users can be served, and if one server fails the others keep working.',
  },
  {
    id: 'web-http2',
    type: 'multiple-choice',
    prompt: 'What is a major improvement in HTTP/2 over HTTP/1.1?',
    options: [
      'Many requests can share one connection at the same time (multiplexing)',
      'It removes the need for HTTPS',
      'It only supports JSON',
      'It replaces DNS',
    ],
    answer: 0,
    explanation: 'HTTP/1.1 handled one request at a time per connection, so browsers opened several. HTTP/2 sends many requests in parallel over one connection, and compresses headers.',
  },
  {
    id: 'web-jwt-storage',
    type: 'multiple-choice',
    prompt: 'Why do many teams prefer an HttpOnly cookie over localStorage for storing a login token?',
    options: [
      'JavaScript cannot read an HttpOnly cookie, so an XSS bug cannot steal the token',
      'localStorage is deleted every minute',
      'Cookies can store more data',
      'localStorage does not work on phones',
    ],
    answer: 0,
    explanation: 'Anything in localStorage can be read by any script on the page, including injected ones. HttpOnly cookies are hidden from scripts, though you then need CSRF protection.',
  },
  {
    id: 'web-rest-stateless',
    type: 'multiple-choice',
    prompt: 'What does it mean that HTTP (and REST) is "stateless"?',
    options: [
      'Each request carries everything needed; the server does not rely on memory of earlier requests',
      'The server has no database',
      'Responses cannot change',
      'Cookies are not allowed',
    ],
    answer: 0,
    explanation: 'Every request stands alone, so any server can answer it. That is why login state travels with each request in a cookie or token.',
  },
]
