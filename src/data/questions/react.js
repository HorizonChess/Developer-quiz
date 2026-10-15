import { PEOPLE } from '../pools.js'

const STATE_NAMES = ['count', 'score', 'clicks', 'likes', 'votes', 'stars']
const cap = (s) => s[0].toUpperCase() + s.slice(1)
const EMPTY = 'Nothing (empty)'

export default [
  // ---------- Templates ----------
  {
    id: 'react-batched-setstate',
    type: 'code-output',
    generate(r) {
      const name = r.pick(STATE_NAMES)
      const setter = `set${cap(name)}`
      const start = r.int(0, 10)
      const calls = r.int(2, 4)
      const step = r.int(1, 3)
      const updater = r.chance()
      const line = updater ? `${setter}((prev) => prev + ${step})` : `${setter}(${name} + ${step})`
      const correct = updater ? start + calls * step : start + step
      const other = updater ? start + step : start + calls * step
      return {
        prompt: `The button is clicked once. What is ${name} after the next render?`,
        code: `const [${name}, ${setter}] = useState(${start})\n\nfunction handleClick() {\n${Array(calls).fill(`  ${line}`).join('\n')}\n}`,
        correct: String(correct),
        wrong: [String(other), String(start), String(correct + step), String(start + (calls - 1) * step), String(start + calls), String(start + calls * step + 1)],
        explanation: updater
          ? `The updater form (prev) => prev + ${step} always receives the latest pending value, so the ${calls} updates stack up: ${start} + ${calls}×${step} = ${correct}.`
          : `Inside one click, ${name} is a fixed snapshot (${start}). Every call sets it to ${start} + ${step}, so the result is ${correct}. Use the updater form ${setter}(prev => prev + ${step}) to stack updates.`,
      }
    },
  },
  {
    id: 'react-effect-runs',
    type: 'multiple-choice',
    generate(r) {
      const rerenders = r.int(2, 5)
      const changes = r.int(1, rerenders - 1)
      const dep = r.pick(['userId', 'query', 'page', 'filter'])
      const variant = r.pick(['empty', 'none', 'dep'])
      const depsText = { empty: ', []', none: '', dep: `, [${dep}]` }[variant]
      const correct = { empty: 1, none: rerenders + 1, dep: changes + 1 }[variant]
      return {
        prompt: `The component renders once, then re-renders ${rerenders} more times. ${dep} changes in ${changes} of those re-renders. How many times does the effect run? (Ignore Strict Mode.)`,
        code: `useEffect(() => {\n  console.log('effect')\n}${depsText})`,
        correct: String(correct),
        wrong: [String(rerenders + 1), '1', String(changes + 1), String(rerenders), '0', String(changes)],
        explanation: {
          empty: 'An empty dependency array [] means "run once after the first render" and never again.',
          none: `With no dependency array, the effect runs after every render: 1 + ${rerenders} = ${rerenders + 1} times.`,
          dep: `The effect runs after the first render, and again only when ${dep} changes: 1 + ${changes} = ${changes + 1} times.`,
        }[variant] + ' (In development, Strict Mode runs effects one extra time on mount to help find bugs.)',
      }
    },
  },
  {
    id: 'react-state-object',
    type: 'code-output',
    generate(r) {
      const [oldName, newName] = r.sample(PEOPLE, 2)
      const age = r.int(18, 60)
      const spread = r.chance()
      const update = spread ? `setUser({ ...user, name: "${newName}" })` : `setUser({ name: "${newName}" })`
      return {
        prompt: 'After this update and the next render, what is user.age?',
        code: `const [user, setUser] = useState({ name: "${oldName}", age: ${age} })\n\n// later, in a click handler:\n${update}`,
        correct: spread ? String(age) : 'undefined',
        wrong: spread ? ['undefined', 'null', '0'] : [String(age), 'null', '0'],
        explanation: spread
          ? `{ ...user } copies all the old fields first, then name is replaced. age stays ${age}.`
          : 'useState does not merge objects. The new object only has name, so age is gone (undefined). Copy the old fields with { ...user, name } to keep them.',
      }
    },
  },
  {
    id: 'react-and-zero',
    type: 'code-output',
    generate(r) {
      const list = r.pick(['items', 'messages', 'todos', 'results'])
      const comp = r.pick(['List', 'Inbox', 'Todos', 'Results'])
      const count = r.chance(0.7) ? 0 : r.int(2, 5)
      return {
        prompt: `${list} has ${count} element(s). What does this render besides the <h2>?`,
        code: `<div>\n  <h2>Your ${list}</h2>\n  {${list}.length && <${comp} data={${list}} />}\n</div>`,
        correct: count === 0 ? 'The number 0' : `The <${comp}> component`,
        wrong: count === 0 ? ['Nothing', `The <${comp}> component`, 'The text "false"'] : ['Nothing', `The number ${count}`, 'The text "true"'],
        explanation: count === 0
          ? `0 && ... returns 0, and React renders numbers, so a stray "0" appears on the page. Use ${list}.length > 0 && ... to get a real true/false.`
          : `${count} is truthy, so && returns the component and it renders. But be careful: when the list is empty this would render "0". Prefer ${list}.length > 0 && ...`,
      }
    },
  },
  {
    id: 'react-index-key',
    type: 'multiple-choice',
    generate(r) {
      const thing = r.pick(['todo list', 'chat message list', 'shopping cart', 'list of form inputs'])
      const change = r.pick(['a new item is added to the top', 'items are sorted', 'an item in the middle is deleted'])
      return {
        prompt: `A ${thing} uses key={index}. What can go wrong when ${change}?`,
        correct: 'React can match items wrongly, so typed text shows on another item',
        wrong: [
          'React re-creates every item from scratch, so all typed text is lost',
          'React throws a duplicate key error and stops rendering the list',
          'Nothing breaks; index keys only cause a small performance warning',
          'React sorts the items by their key, so they show in the wrong order',
        ],
        explanation: 'Keys tell React which item is which. When items move, index keys shift too, so React matches old and new items wrongly. Use a stable id from your data, like key={item.id}.',
      }
    },
  },
  {
    id: 'react-mixed-updates',
    type: 'code-output',
    generate(r) {
      const name = r.pick(STATE_NAMES)
      const setter = `set${cap(name)}`
      const start = r.int(0, 5)
      const ops = Array.from({ length: r.int(2, 3) }, () => ({ kind: r.pick(['snap', 'fn', 'set']), k: r.int(1, 4) }))
      if (ops.every((o) => o.kind === ops[0].kind)) ops[0].kind = ops[0].kind === 'fn' ? 'snap' : 'fn'
      ops.forEach((o) => { if (o.kind === 'set') o.k = r.int(10, 30) })
      let value = start
      let naive = start
      for (const o of ops) {
        if (o.kind === 'snap') value = start + o.k
        if (o.kind === 'fn') value += o.k
        if (o.kind === 'set') value = o.k
        naive = o.kind === 'set' ? o.k : naive + o.k
      }
      const lines = ops.map((o) => ({ snap: `${setter}(${name} + ${o.k})`, fn: `${setter}((prev) => prev + ${o.k})`, set: `${setter}(${o.k})` })[o.kind])
      const log = r.chance(0.35)
      const correct = log ? start : value
      return {
        prompt: log
          ? `The button is clicked once. What does console.log print?`
          : `The button is clicked once. What is ${name} after the re-render?`,
        code: `const [${name}, ${setter}] = useState(${start})\n\nfunction handleClick() {\n${lines.map((l) => `  ${l}`).join('\n')}${log ? `\n  console.log(${name})` : ''}\n}`,
        correct: String(correct),
        wrong: [String(value), String(naive), String(start), String(correct + 1), String(correct + 2), String(Math.max(0, correct - 1))],
        explanation: log
          ? `Setting state does not change the ${name} variable you already have. During this click ${name} is a snapshot, so console.log prints ${start}. The new value appears on the next render.`
          : `React runs the queued updates in order. ${setter}(${name} + k) uses the snapshot ${start}, the updater (prev) => prev + k adds to the latest pending value, and ${setter}(n) replaces it. The result is ${value}.`,
      }
    },
  },
  {
    id: 'react-onclick-call',
    type: 'multiple-choice',
    generate(r) {
      const fn = r.pick(['handleDelete', 'handleSave', 'addItem', 'sendForm', 'toggleMenu'])
      const form = r.pick(['call', 'ref', 'arrow'])
      const attr = { call: `{${fn}()}`, ref: `{${fn}}`, arrow: `{() => ${fn}(item.id)}` }[form]
      const RUNS_RENDER = 'It runs during every render, not when the button is clicked'
      const RUNS_CLICK = 'It runs each time the button is clicked, and not before'
      const opts = [RUNS_RENDER, RUNS_CLICK, 'It runs once when the component mounts, then on every click', 'It runs on click, but only after the component re-renders']
      const correct = form === 'call' ? RUNS_RENDER : RUNS_CLICK
      return {
        prompt: `When does ${fn} run?`,
        code: `<button onClick=${attr}>Go</button>`,
        correct,
        wrong: opts.filter((o) => o !== correct),
        explanation: form === 'call'
          ? `${fn}() has parentheses, so it is called while JSX is built, on every render. onClick receives its return value. Pass the function itself: onClick={${fn}} or onClick={() => ${fn}(id)}.`
          : `onClick receives a function and React calls it when the button is clicked. ${form === 'arrow' ? 'The arrow function lets you pass an argument without calling the handler during render.' : 'Writing onClick={' + fn + '()} instead would call it during render.'}`,
      }
    },
  },
  {
    id: 'react-effect-order',
    type: 'code-output',
    generate(r) {
      const [parent, child] = r.pick([['App', 'Card'], ['Page', 'Sidebar'], ['Shop', 'Cart'], ['Feed', 'Post']])
      const seq = (a) => a.join(', ')
      const rP = `render ${parent}`
      const rC = `render ${child}`
      const eP = `effect ${parent}`
      const eC = `effect ${child}`
      return {
        prompt: 'What is logged when the app first mounts? (Ignore Strict Mode.)',
        code: `function ${child}() {\n  console.log('render ${child}')\n  useEffect(() => console.log('effect ${child}'), [])\n  return <p>Hi</p>\n}\n\nfunction ${parent}() {\n  console.log('render ${parent}')\n  useEffect(() => console.log('effect ${parent}'), [])\n  return <${child} />\n}`,
        correct: seq([rP, rC, eC, eP]),
        wrong: [seq([rP, rC, eP, eC]), seq([rP, eP, rC, eC]), seq([rC, rP, eC, eP])],
        explanation: `Rendering goes top-down (parent, then child). Effects run after everything is on screen, and children's effects run before their parent's, so ${child}'s effect logs first.`,
      }
    },
  },
  {
    id: 'react-cleanup-sequence',
    type: 'code-output',
    generate(r) {
      const [a, b] = r.sample(['general', 'music', 'travel', 'sports', 'news', 'games'], 2)
      const scenario = r.pick(['change', 'unmount', 'both'])
      const seq = (x) => x.join(', ')
      const story = {
        change: `It mounts with room = '${a}', then room changes to '${b}'.`,
        unmount: `It mounts with room = '${a}', then it is removed from the page.`,
        both: `It mounts with room = '${a}', room changes to '${b}', then it is removed.`,
      }[scenario]
      const correct = {
        change: [`join ${a}`, `leave ${a}`, `join ${b}`],
        unmount: [`join ${a}`, `leave ${a}`],
        both: [`join ${a}`, `leave ${a}`, `join ${b}`, `leave ${b}`],
      }[scenario]
      const wrong = {
        change: [[`join ${a}`, `join ${b}`, `leave ${a}`], [`join ${a}`, `leave ${b}`, `join ${b}`], [`join ${a}`, `join ${b}`]],
        unmount: [[`join ${a}`], [`leave ${a}`, `join ${a}`], [`join ${a}`, `leave ${a}`, `join ${a}`]],
        both: [[`join ${a}`, `join ${b}`, `leave ${b}`], [`join ${a}`, `leave ${b}`, `join ${b}`, `leave ${b}`], [`join ${a}`, `join ${b}`, `leave ${a}`, `leave ${b}`]],
      }[scenario]
      return {
        prompt: `${story} What is logged? (Ignore Strict Mode.)`,
        code: `useEffect(() => {\n  console.log('join ' + room)\n  return () => console.log('leave ' + room)\n}, [room])`,
        correct: seq(correct),
        wrong: wrong.map(seq),
        explanation: 'The cleanup runs before the effect runs again and when the component unmounts. Each cleanup remembers the room from its own render, so it leaves the old room before joining the new one.',
      }
    },
  },
  {
    id: 'react-key-reset',
    type: 'multiple-choice',
    generate(r) {
      const comp = r.pick(['Editor', 'ChatBox', 'CommentForm', 'NotesPanel'])
      const prop = r.pick(['draftId', 'contactId', 'postId', 'noteId'])
      const withKey = r.chance()
      const FRESH = `React mounts a brand new ${comp}, so its state starts fresh`
      const KEPT = `React keeps the same ${comp}, so its state stays as it was`
      const opts = [FRESH, KEPT, `React keeps the ${comp} but resets its state to the initial values`, `React copies the old state into the new ${comp} so nothing is lost`]
      const correct = withKey ? FRESH : KEPT
      return {
        prompt: `${prop} changes from 1 to 2. What happens to the text typed into ${comp} (kept in its useState)?`,
        code: withKey ? `<${comp} key={${prop}} ${prop}={${prop}} />` : `<${comp} ${prop}={${prop}} />`,
        correct,
        wrong: opts.filter((o) => o !== correct),
        explanation: withKey
          ? 'A different key tells React this is a different component, so it throws the old one away and starts a new one with fresh state. This is a handy way to reset a form.'
          : `Without a changing key, React sees the same component in the same place and keeps its state. Only the ${prop} prop changes, so the typed text stays.`,
      }
    },
  },
  {
    id: 'react-conditional-text',
    type: 'code-output',
    generate(r) {
      const person = r.pick(PEOPLE)
      const n = r.int(2, 9)
      const scenarios = [
        { data: "name = ''", jsx: "{name || 'Guest'}", correct: 'Guest', wrong: [EMPTY, 'false', 'undefined'], why: "'' is falsy, so || falls back to 'Guest'." },
        { data: `name = '${person}'`, jsx: "{name || 'Guest'}", correct: person, wrong: ['Guest', EMPTY, 'true'], why: `'${person}' is truthy, so || returns it and the fallback is not used.` },
        { data: 'score = 0', jsx: "{score && 'Top score!'}", correct: '0', wrong: [EMPTY, 'Top score!', 'false'], why: '0 is falsy, so && returns 0 itself, and React renders numbers. Use score > 0 && ... instead.' },
        { data: 'unread = 0', jsx: "{unread > 0 && 'New messages'}", correct: EMPTY, wrong: ['false', '0', 'New messages'], why: 'unread > 0 is false, and React renders nothing for false, null or undefined.' },
        { data: 'isLoggedIn = false', jsx: "{isLoggedIn ? 'Welcome back' : 'Please sign in'}", correct: 'Please sign in', wrong: ['Welcome back', EMPTY, 'false'], why: 'The ternary picks the second branch when the condition is false.' },
        { data: `unread = ${n}`, jsx: "{unread > 0 && 'New messages'}", correct: 'New messages', wrong: ['true', String(n), EMPTY], why: `${n} > 0 is true, so && returns the text on its right.` },
      ]
      const s = r.pick(scenarios)
      return {
        prompt: `Given ${s.data}, what text appears inside the <p>?`,
        code: `<p>${s.jsx}</p>`,
        correct: s.correct,
        wrong: s.wrong,
        explanation: s.why,
      }
    },
  },
  {
    id: 'react-array-update',
    type: 'multiple-choice',
    generate(r) {
      const [list, one] = r.pick([['todos', 'todo'], ['items', 'item'], ['cart', 'product'], ['tasks', 'task']])
      const setter = `set${cap(list)}`
      const op = r.pick(['add', 'remove', 'update'])
      const choices = {
        add: {
          goal: `add ${one} to the end`,
          correct: `${setter}([...${list}, ${one}])`,
          wrong: [`${list}.push(${one}); ${setter}(${list})`, `${setter}(${list}.push(${one}))`, `${list}[${list}.length] = ${one}; ${setter}(${list})`],
          why: `[...${list}, ${one}] builds a new array. push changes the old array in place (and returns a number), so React sees the same array and may skip the update.`,
        },
        remove: {
          goal: `remove the ${one} whose id is id`,
          correct: `${setter}(${list}.filter((x) => x.id !== id))`,
          wrong: [`${setter}(${list}.filter((x) => x.id === id))`, `${list}.splice(index, 1); ${setter}(${list})`, `${setter}(${list}.splice(index, 1))`],
          why: 'filter returns a new array that keeps every item except that one (=== would keep only that one). splice changes the original array and returns the removed items, not the rest.',
        },
        update: {
          goal: `mark the ${one} with this id as done`,
          correct: `${setter}(${list}.map((x) => (x.id === id ? { ...x, done: true } : x)))`,
          wrong: [`const t = ${list}.find((x) => x.id === id); t.done = true; ${setter}([...${list}])`, `${setter}(${list}.map((x) => { if (x.id === id) x.done = true; return x }))`, `${setter}(${list}.forEach((x) => { if (x.id === id) x.done = true }))`],
          why: 'map returns a new array, and { ...x, done: true } makes a new object for the changed item. The other versions change existing objects in place (forEach also returns undefined).',
        },
      }[op]
      return {
        prompt: `Which line correctly updates state to ${choices.goal}?`,
        correct: choices.correct,
        wrong: choices.wrong,
        explanation: choices.why + ' React only notices a change when it gets a new array or object.',
      }
    },
  },
  {
    id: 'react-memo-props',
    type: 'multiple-choice',
    generate(r) {
      const scenarios = [
        { prop: 'label="Save"', same: true, why: 'The string "Save" is equal to last time, so memo skips the render.' },
        { prop: 'count={3}', same: true, why: 'The number 3 is equal to last time, so memo skips the render.' },
        { prop: 'onSave={handleSave}', setup: '  const handleSave = useCallback(() => save(), [])\n', same: true, why: 'useCallback with [] returns the same function every render, so the prop does not change.' },
        { prop: "style={{ color: 'red' }}", same: false, why: '{{ color: \'red\' }} creates a new object on every render. memo compares by reference, so it looks like a new prop.' },
        { prop: 'onSave={() => save()}', same: false, why: 'The arrow function is created again on every render, so memo sees a new prop. Wrap it in useCallback to keep it the same.' },
        { prop: 'tags={[\'new\', \'sale\']}', same: false, why: 'The array literal creates a new array on every render, so memo sees a new prop.' },
      ]
      const s = r.pick(scenarios)
      const YES = 'Yes, because the prop is a new object or function each render'
      const NO = 'No, because React.memo sees the same prop values as before'
      const opts = [YES, NO, 'Yes, because React.memo only compares props in production builds', 'No, because a child never re-renders when only parent state changes']
      const correct = s.same ? NO : YES
      return {
        prompt: 'Parent re-renders because its own counter state changed. Does Child re-render?',
        code: `const Child = React.memo(function Child(props) {\n  return <p>child</p>\n})\n\nfunction Parent() {\n  const [n, setN] = useState(0)\n${s.setup ?? ''}  return <Child ${s.prop} />\n}`,
        correct,
        wrong: opts.filter((o) => o !== correct),
        explanation: s.why + ' Without React.memo, a child re-renders whenever its parent does.',
      }
    },
  },
  {
    id: 'react-ref-display',
    type: 'code-output',
    generate(r) {
      const clicks = r.int(2, 6)
      const withState = r.chance(0.4)
      const ref = r.pick(['clicks', 'presses', 'taps'])
      const handler = withState ? `() => {\n    ${ref}.current++\n    setTick((t) => t + 1)\n  }` : `() => {\n    ${ref}.current++\n  }`
      const correct = withState ? clicks : 0
      return {
        prompt: `The button is clicked ${clicks} times. What number does the button show?`,
        code: `const ${ref} = useRef(0)\n${withState ? 'const [tick, setTick] = useState(0)\n' : ''}\nreturn (\n  <button onClick={${handler}}>\n    {${ref}.current}\n  </button>\n)`,
        correct: String(correct),
        wrong: [String(withState ? 0 : clicks), String(clicks - 1), '1', String(clicks + 1)],
        explanation: withState
          ? `Changing a ref does not re-render, but setTick does. Each re-render reads the latest ${ref}.current, so it shows ${clicks}.`
          : `${ref}.current does go up to ${clicks}, but changing a ref never triggers a re-render. Nothing else re-renders, so the screen still shows 0. Use state for values you display.`,
      }
    },
  },
  {
    id: 'react-hook-rule-break',
    type: 'multiple-choice',
    generate(r) {
      const scenarios = [
        { code: "function Panel({ isOpen }) {\n  if (isOpen) {\n    const [tab, setTab] = useState('info')\n  }\n  // ...\n}", correct: 'The hook only runs sometimes, so the call order can change' },
        { code: 'function Ratings({ items }) {\n  for (const item of items) {\n    const [stars, setStars] = useState(0)\n  }\n  // ...\n}', correct: 'How many hooks run depends on items, so the order shifts' },
        { code: "function Profile({ user }) {\n  if (!user) return null\n  const [tab, setTab] = useState('posts')\n  // ...\n}", correct: 'The early return skips the hook on some renders' },
        { code: 'function Form() {\n  function handleClick() {\n    const [sent, setSent] = useState(false)\n  }\n  // ...\n}', correct: 'Hooks must be called at the top level, not in nested functions' },
      ]
      const s = r.pick(scenarios)
      return {
        prompt: r.pick(['What is wrong with this code?', 'This breaks a Rule of Hooks. Which one, and why?']),
        code: s.code,
        correct: s.correct,
        wrong: r.sample([
          'useState must be imported inside the component, not at the top',
          'State variable names must match the prop names of the component',
          'Nothing is wrong; React allows hooks anywhere inside a component',
          'The initial value must be passed as a function, not a plain value',
        ], 3),
        explanation: 'React identifies each hook by the order it is called in. Hooks must run in the same order on every render, so call them at the top level of the component, before any early return.',
      }
    },
  },
  {
    id: 'react-state-initializer',
    type: 'code-output',
    generate(r) {
      const fn = r.pick(['loadItems', 'readSettings', 'buildGrid', 'parseDraft'])
      const extra = r.int(2, 6)
      const form = r.pick(['call', 'lazy', 'ref'])
      const init = { call: `${fn}()`, lazy: `() => ${fn}()`, ref: fn }[form]
      const correct = form === 'call' ? extra + 1 : 1
      return {
        prompt: `The component renders once and then re-renders ${extra} more times. How many times is ${fn} called?`,
        code: `const [data, setData] = useState(${init})`,
        correct: String(correct),
        wrong: [String(form === 'call' ? 1 : extra + 1), String(extra), '0', '2'],
        explanation: form === 'call'
          ? `${fn}() is a normal function call, so it runs on every render, even though useState only uses the first result. Pass a function, useState(() => ${fn}()), to run it once.`
          : `useState was given a function, so React calls it only on the first render to get the initial value. On later renders it is ignored.`,
      }
    },
  },
  {
    id: 'react-object-is',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const [p1, p2] = r.sample(PEOPLE, 2)
      const a = r.int(1, 9)
      const b = r.int(10, 20)
      const scenarios = [
        {
          code: `const prev = { name: '${p1}', age: ${b} }\nconst next = { ...prev, name: '${p2}' }\nconsole.log(Object.is(prev, next), next.age)`,
          correct: `false ${b}`, wrong: [`true ${b}`, 'false undefined', 'true undefined'],
          why: `The spread creates a brand new object, so Object.is says false and React re-renders. age is copied over, so it is ${b}.`,
        },
        {
          code: `const prev = [${a}, ${b}]\nconst next = prev\nnext.push(${a + b})\nconsole.log(Object.is(prev, next), prev.length)`,
          correct: 'true 3', wrong: ['false 3', 'true 2', 'false 2'],
          why: 'next is the same array as prev, and push changed it in place. Object.is says true, so React would think nothing changed and skip the update.',
        },
        {
          code: `const prev = { user: { name: '${p1}' }, theme: 'light' }\nconst next = { ...prev, theme: 'dark' }\nconsole.log(Object.is(prev, next), Object.is(prev.user, next.user))`,
          correct: 'false true', wrong: ['false false', 'true true', 'true false'],
          why: 'Spread makes a shallow copy: the outer object is new, but user still points to the same inner object.',
        },
        {
          code: `const prev = [${a}, ${b}]\nconst next = prev.map((n) => n * 2)\nconsole.log(Object.is(prev, next), prev[0])`,
          correct: `false ${a}`, wrong: [`true ${a * 2}`, `false ${a * 2}`, `true ${a}`],
          why: `map returns a new array and leaves the original alone, so prev[0] is still ${a}. This is why map is safe for state updates.`,
        },
      ]
      const s = r.pick(scenarios)
      return {
        prompt: 'React uses Object.is to decide if state changed. What does this print?',
        code: s.code,
        correct: s.correct,
        wrong: s.wrong,
        explanation: s.why,
      }
    },
  },
  {
    id: 'react-reducer-output',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const start = r.int(0, 5)
      const actions = Array.from({ length: r.int(3, 4) }, () => {
        const kind = r.pick(['add', 'add', 'reset', 'ADD'])
        return kind === 'reset' ? { type: 'reset' } : { type: kind, amount: r.int(1, 5) }
      })
      let count = start
      let ignoringCase = start
      let ignoringReset = start
      for (const a of actions) {
        if (a.type === 'add') count += a.amount
        if (a.type === 'reset') count = 0
        if (a.type !== 'reset') ignoringCase += a.amount
        else ignoringCase = 0
        if (a.type === 'add') ignoringReset += a.amount
      }
      const literal = actions.map((a) => (a.amount ? `{ type: '${a.type}', amount: ${a.amount} }` : `{ type: '${a.type}' }`))
      return {
        prompt: 'A reducer is a plain function. What does this print?',
        code: `function reducer(state, action) {\n  switch (action.type) {\n    case 'add':\n      return { ...state, count: state.count + action.amount }\n    case 'reset':\n      return { ...state, count: 0 }\n    default:\n      return state\n  }\n}\n\nconst actions = [\n  ${literal.join(',\n  ')},\n]\nconst final = actions.reduce(reducer, { count: ${start} })\nconsole.log(final.count)`,
        correct: String(count),
        wrong: [String(ignoringCase), String(ignoringReset), String(start), String(count + 1), String(count + 2), '0', 'undefined'],
        explanation: `Each action goes through the reducer in order. 'add' adds the amount, 'reset' sets count to 0, and anything else (like 'ADD', since case matters) hits default and returns the state unchanged. The result is ${count}.`,
      }
    },
  },
  {
    id: 'react-items-left',
    type: 'code-output',
    generate(r) {
      const total = r.int(3, 6)
      const done = Array.from({ length: total }, () => r.chance())
      const left = done.filter((d) => !d).length
      const doneCount = total - left
      const names = r.sample(['milk', 'bread', 'eggs', 'rice', 'tea', 'soap', 'jam'], total)
      const rows = names.map((n, i) => `  { id: ${i + 1}, text: '${n}', done: ${done[i]} },`)
      return {
        prompt: 'What text does this component show?',
        code: `const todos = [\n${rows.join('\n')}\n]\n\nfunction Footer() {\n  const left = todos.filter((t) => !t.done).length\n  return <p>{left} left</p>\n}`,
        correct: `${left} left`,
        wrong: [`${doneCount} left`, `${total} left`, `${left + 1} left`, `${Math.max(0, left - 1)} left`, 'left'],
        explanation: `filter keeps the todos where done is false (${left} of them), and .length counts them. Computing "left" during render like this is better than storing it in separate state.`,
      }
    },
  },
  {
    id: 'react-stale-interval',
    type: 'code-output',
    generate(r) {
      const start = r.int(0, 5)
      const ticks = r.int(3, 6)
      const updater = r.chance()
      const call = updater ? 'setSeconds((s) => s + 1)' : 'setSeconds(seconds + 1)'
      const correct = updater ? start + ticks : start + 1
      return {
        prompt: `The interval has fired ${ticks} times. What does the screen show? (Ignore Strict Mode.)`,
        code: `const [seconds, setSeconds] = useState(${start})\n\nuseEffect(() => {\n  const id = setInterval(() => {\n    ${call}\n  }, 1000)\n  return () => clearInterval(id)\n}, [])\n\nreturn <p>{seconds}</p>`,
        correct: String(correct),
        wrong: [String(updater ? start + 1 : start + ticks), String(start), String(correct + 1), String(ticks)],
        explanation: updater
          ? `The updater (s) => s + 1 always gets the latest value, so each tick adds one: ${start} + ${ticks} = ${correct}.`
          : `The effect ran once (deps []), so the interval callback remembers seconds = ${start} forever. Every tick sets ${start} + 1, so it stays at ${correct}. Use setSeconds((s) => s + 1) instead.`,
      }
    },
  },
  {
    id: 'react-default-prop',
    type: 'code-output',
    generate(r) {
      const [comp, prop, def] = r.pick([['Badge', 'label', 'New'], ['Avatar', 'name', 'Guest'], ['Title', 'text', 'Untitled'], ['Tag', 'color', 'gray']])
      const given = r.pick(['Sale', 'Hot', 'Admin', 'Blue'])
      const scenarios = [
        { use: `<${comp} />`, correct: def, why: `No ${prop} was passed, so it is undefined and the default '${def}' is used.` },
        { use: `<${comp} ${prop}={undefined} />`, correct: def, why: `Defaults apply when the value is undefined, so '${def}' is used.` },
        { use: `<${comp} ${prop}="${given}" />`, correct: given, why: `A value was passed, so the default is ignored.` },
        { use: `<${comp} ${prop}="" />`, correct: EMPTY, why: `'' is not undefined, so the default is not used. An empty string renders nothing.` },
      ]
      const s = r.pick(scenarios)
      return {
        prompt: `What does ${s.use} render inside the <span>?`,
        code: `function ${comp}({ ${prop} = '${def}' }) {\n  return <span>{${prop}}</span>\n}`,
        correct: s.correct,
        wrong: [def, given, EMPTY, 'undefined'],
        explanation: s.why + ' A default value in destructuring only kicks in for undefined.',
      }
    },
  },
  {
    id: 'react-render-count',
    type: 'code-output',
    generate(r) {
      const clicks = r.int(1, 4)
      const sets = r.int(2, 4)
      const lines = Array.from({ length: sets }, (_, i) => (i % 2 === 0 ? '    setA((x) => x + 1)' : '    setB((x) => x + 1)'))
      const correct = 1 + clicks
      return {
        prompt: `The button is clicked ${clicks} time(s). How many times is "render" logged in total, including the first render? (Ignore Strict Mode.)`,
        code: `function Counter() {\n  console.log('render')\n  const [a, setA] = useState(0)\n  const [b, setB] = useState(0)\n\n  function handleClick() {\n${lines.join('\n')}\n  }\n\n  return <button onClick={handleClick}>{a + b}</button>\n}`,
        correct: String(correct),
        wrong: [String(1 + clicks * sets), String(clicks), String(clicks * sets), String(2 + clicks), String(1 + clicks * 2), String(3 + clicks)],
        explanation: `React batches all state updates made in the same event handler into one re-render. So the first render logs once, and each of the ${clicks} click(s) logs once more: ${correct}.`,
      }
    },
  },
  {
    id: 'react-route-param',
    type: 'code-output',
    generate(r) {
      const param = r.pick(['userId', 'postId', 'orderId'])
      const n = r.int(10, 98)
      const convert = r.chance(0.4)
      const expr = convert ? `Number(${param}) + 1` : `${param} + 1`
      return {
        prompt: `The browser is at /items/${n}. What does the page show?`,
        code: `// <Route path="/items/:${param}" element={<Item />} />\n\nfunction Item() {\n  const { ${param} } = useParams()\n  return <p>{${expr}}</p>\n}`,
        correct: convert ? String(n + 1) : `${n}1`,
        wrong: [convert ? `${n}1` : String(n + 1), 'NaN', String(n), 'undefined'],
        explanation: convert
          ? `URL params are strings ('${n}'), so Number() turns it into ${n} first, then + 1 gives ${n + 1}.`
          : `URL params are always strings. '${n}' + 1 joins them as text, giving ${n}1. Convert with Number(${param}) first.`,
      }
    },
  },

  // ---------- Fixed questions ----------
  {
    id: 'react-props-state',
    type: 'multiple-choice',
    prompt: ['What is the difference between props and state?', 'Which statement about props and state is correct?'],
    options: [
      'Props come from the parent and are read-only; state is owned locally',
      'Props are owned by the component; state is passed down by the parent',
      'Both come from the parent, but only state can be changed by the child',
      'Props are for function components; state works only in class components',
    ],
    answer: 0,
    explanation: 'Think of props as function arguments and state as the component\'s own memory. A component never changes its props; it changes its state with a setter like setCount.',
  },
  {
    id: 'react-virtual-dom',
    type: 'multiple-choice',
    prompt: 'What is the "virtual DOM" in React?',
    options: [
      'A description of the UI in memory that React diffs to find changes',
      'A hidden copy of the real DOM that the browser renders off-screen',
      'A faster DOM engine that React installs in place of the browser one',
      'A cache of HTML strings that React sends to the server on each change',
    ],
    answer: 0,
    explanation: 'React builds a description of the UI, compares it with the previous one ("diffing"), and only updates what changed in the real DOM. This process is called reconciliation.',
  },
  {
    id: 'react-controlled',
    type: 'multiple-choice',
    prompt: 'What is a "controlled component" in a React form?',
    options: [
      'An input whose value comes from state and updates through onChange',
      'An input that keeps its own value in the DOM, read later with a ref',
      'An input that React locks so the user cannot type into it',
      'An input whose value the browser validates before React receives it',
    ],
    answer: 0,
    explanation: 'In a controlled input, value={text} and onChange={e => setText(e.target.value)} make React state the single source of truth. Uncontrolled inputs keep their own value in the DOM (read with a ref).',
  },
  {
    id: 'react-effect-cleanup',
    type: 'multiple-choice',
    prompt: ['When does the cleanup function returned from useEffect run?', 'You return a function from useEffect. When does React call it?'],
    options: [
      'Before the effect runs again, and when the component unmounts',
      'Only when the component unmounts, not between effect runs',
      'Right after the effect runs, before the browser paints the screen',
      'Before every render, even when the dependencies stay the same',
    ],
    answer: 0,
    explanation: 'The cleanup undoes the effect, such as removing an event listener or clearing a timer. It runs before the next effect and when the component is removed, preventing memory leaks.',
  },
  {
    id: 'react-memo-callback',
    type: 'multiple-choice',
    prompt: 'What is the difference between useMemo and useCallback?',
    options: [
      'useMemo caches a computed value; useCallback caches the function itself',
      'useMemo caches a function; useCallback caches the value it returns',
      'useMemo runs on every render; useCallback runs only when dependencies change',
      'useMemo is for expensive math; useCallback is for API requests and timers',
    ],
    answer: 0,
    explanation: 'useMemo(() => compute(a), [a]) caches a value. useCallback(fn, [a]) caches the function itself, which helps when passing it to memoized children. Both only recompute when dependencies change.',
  },
  {
    id: 'react-useref',
    type: 'multiple-choice',
    prompt: 'Which is a good use of useRef?',
    options: [
      'Keeping a timer id or a DOM node without causing a re-render',
      'Storing a value that should update on screen when it changes',
      'Sharing a value between siblings without passing any props',
      'Holding form input that should re-render on each keystroke',
    ],
    answer: 0,
    explanation: 'A ref is a box (ref.current) that survives re-renders. Changing it does not re-render, so use it for DOM nodes, timer ids, or previous values. Use state for anything shown on screen.',
  },
  {
    id: 'react-lifting-state',
    type: 'multiple-choice',
    prompt: 'Two sibling components need the same data. What is the usual React solution?',
    options: [
      'Move the state to their closest common parent and pass it down',
      'Keep a copy of the state in each sibling and sync them with effects',
      'Have one sibling pass the data to the other one through a ref',
      'Put the state in the sibling that renders first and export it',
    ],
    answer: 0,
    explanation: 'Moving shared state to the nearest common parent ("lifting state up") keeps one source of truth. The parent passes the value and a setter down as props.',
  },
  {
    id: 'react-context',
    type: 'multiple-choice',
    prompt: ['What problem does React Context solve?', 'What is "prop drilling", and what React feature helps avoid it?'],
    options: [
      'Giving deeply nested components a value without passing props down',
      'Making components re-render less often by caching their props automatically',
      'Sharing state between separate browser tabs that run the same app',
      'Replacing useState so that every value lives in one global store',
    ],
    answer: 0,
    explanation: '"Prop drilling" is passing props through components that don\'t need them just to reach a deep child. Context lets any child read a value (like the theme or current user) directly.',
  },
  {
    id: 'react-memo',
    type: 'multiple-choice',
    prompt: 'What does wrapping a component in React.memo do?',
    options: [
      'Skips re-rendering it when its props have not changed',
      'Caches its output in local storage between page visits',
      'Skips re-rendering it even when its own state changes',
      'Memoizes every function inside it, like wrapping each in useCallback',
    ],
    answer: 0,
    explanation: 'React.memo compares the new props with the old ones (shallowly). If they are the same, React reuses the last result. Objects and functions created on every render will still look "new".',
  },
  {
    id: 'react-mutate-state',
    type: 'multiple-choice',
    prompt: 'Why does todos.push(newTodo) followed by setTodos(todos) not update the screen?',
    options: [
      'The array reference is unchanged, so React assumes nothing changed',
      'push is asynchronous, so the new item arrives after the render',
      'setTodos must be called before push for React to notice the change',
      'React only re-renders when the new array length is passed to the setter',
    ],
    answer: 0,
    explanation: 'React compares the old and new state by reference. Mutating the array keeps the same reference. Create a new array instead: setTodos([...todos, newTodo]).',
  },
  {
    id: 'react-fragment',
    type: 'multiple-choice',
    prompt: 'What is <></> (a Fragment) used for?',
    options: [
      'Grouping several elements without adding an extra node to the DOM',
      'Rendering children into a different DOM node outside the parent',
      'Wrapping children so they skip re-renders when props are unchanged',
      'Marking a part of the tree that should load lazily with Suspense',
    ],
    answer: 0,
    explanation: 'A component must return one root. A Fragment groups children without adding a <div>, which keeps HTML clean and avoids breaking layouts like tables or flexbox.',
  },
  {
    id: 'react-rules-of-hooks',
    type: 'multiple-choice',
    prompt: ['Why can\'t you call a hook inside an if statement?', 'What is the reason behind the rule "only call hooks at the top level"?'],
    options: [
      'React tracks hooks by call order, which must match on every render',
      'Hooks inside an if run only once and are then cached for good',
      'An if statement makes the hook run on the server instead of the client',
      'Conditional hooks work, but React logs a warning about slower renders',
    ],
    answer: 0,
    explanation: 'React remembers hooks by the order they are called. If a condition skips one, every hook after it gets the wrong data. Call hooks at the top level, and put conditions inside them.',
  },
  {
    id: 'react-custom-hook',
    type: 'multiple-choice',
    prompt: 'What is a custom hook?',
    options: [
      'A function whose name starts with "use" and that calls other hooks',
      'A component that returns JSX and is shared between several pages',
      'A hook added to React by installing a plugin package from npm',
      'A function that shares one state value between every component using it',
    ],
    answer: 0,
    explanation: 'Custom hooks like useFetch or useLocalStorage package logic that uses hooks so many components can share it. Each component that calls one gets its own separate state. The "use" prefix lets linters check the rules of hooks.',
  },
  {
    id: 'react-strict-mode',
    type: 'multiple-choice',
    prompt: 'In development, your effect runs twice when the component mounts. Why?',
    options: [
      'Strict Mode mounts it twice in development to reveal bad cleanups',
      'The effect has no dependency array, so React runs it twice on mount',
      'Vite hot reloading mounts every component twice when the page loads',
      'React runs effects twice in production too, to warm up its cache',
    ],
    answer: 0,
    explanation: 'React Strict Mode mounts, unmounts and remounts in development only. If your effect cleans up correctly, running it twice causes no problem. Production runs it once.',
  },
  {
    id: 'react-usereducer',
    type: 'multiple-choice',
    prompt: 'When is useReducer a better fit than useState?',
    options: [
      'When related state values change together in many different ways',
      'When the state is a single boolean that toggles on a click',
      'When the state must be shared across components without using props',
      'When the state needs to survive a page reload or a browser refresh',
    ],
    answer: 0,
    explanation: 'useReducer moves update logic into one function: reducer(state, action) returns the new state. It keeps complex updates (like a shopping cart) organized and easy to test.',
  },
  {
    id: 'react-jsx',
    type: 'multiple-choice',
    prompt: 'What does JSX turn into before it runs in the browser?',
    options: [
      'Plain JavaScript function calls that build React elements',
      'HTML strings that the browser parses and inserts into the page',
      'Template literals that React fills in on the server at runtime',
      'Nothing; modern browsers read JSX natively, just like HTML',
    ],
    answer: 0,
    explanation: 'Browsers do not understand JSX. A build tool (like Vite with Babel or esbuild) turns <h1>Hi</h1> into a JavaScript call similar to jsx("h1", { children: "Hi" }).',
  },
  {
    id: 'react-stale-state',
    type: 'multiple-choice',
    prompt: 'You call setCount(count + 1) and then console.log(count) on the next line. What is logged?',
    options: [
      'The old value, because the update is applied on the next render',
      'The new value, because setCount updates the variable right away',
      'undefined, because count is cleared while the update is pending',
      'The new value, but only when the component is inside StrictMode',
    ],
    answer: 0,
    explanation: 'Setting state schedules a re-render; it does not change the variable you already have. The new value shows up the next time the component function runs.',
  },
  {
    id: 'react-keys-purpose',
    type: 'multiple-choice',
    prompt: ['Why does React ask for a key on each item in a list?', 'What is the key prop for when rendering a list?'],
    options: [
      'It lets React tell items apart when the list changes',
      'It sets the HTML id attribute so CSS can style each item',
      'It lets each child read its own position through props.key',
      'It makes React sort the items by key before rendering them',
    ],
    answer: 0,
    explanation: 'Keys are like name tags. When the list changes, React uses them to match each old item with its new version, so state and DOM nodes stay with the right item. The key is not passed to the child as a prop.',
  },
  {
    id: 'react-value-no-onchange',
    type: 'code-output',
    prompt: 'The user clicks this input and types "x". What happens?',
    code: "const [name, setName] = useState('Maya')\n\nreturn <input value={name} />",
    options: [
      'The text stays "Maya"; the input acts as read-only',
      'The text becomes "Mayax" and name updates as well',
      'The text becomes "Mayax", but name stays "Maya"',
      'React throws an error and the input is removed',
    ],
    answer: 0,
    explanation: 'With value but no onChange, React keeps forcing the input back to the state value, so typing does nothing (React also warns in the console). Add onChange to update state, or use defaultValue for an uncontrolled input.',
  },
  {
    id: 'react-portal',
    type: 'multiple-choice',
    prompt: ['What is createPortal used for?', 'Why would you render a modal with a portal?'],
    options: [
      'Rendering children into a different DOM node, like a modal container',
      'Loading a component from another app over the network at runtime',
      'Sending state from a child up to a parent without callback props',
      'Rendering a component on the server and streaming it to the browser',
    ],
    answer: 0,
    explanation: 'createPortal(child, domNode) puts the child somewhere else in the DOM (for example at the end of <body>) so it is not clipped by parent CSS like overflow: hidden. It still behaves like a normal child in React.',
  },
  {
    id: 'react-error-boundary',
    type: 'multiple-choice',
    prompt: ['Which error does a React error boundary NOT catch?', 'An error boundary wraps part of your app. Which error will it miss?'],
    options: [
      'An error thrown inside an onClick event handler',
      'An error thrown while a child component is rendering',
      'An error thrown in a child class component\'s lifecycle method',
      'An error thrown while rendering a deeply nested grandchild',
    ],
    answer: 0,
    explanation: 'Error boundaries catch errors that happen while React renders the components below them. Errors in event handlers or in async code (like setTimeout) happen outside rendering, so handle those with try/catch.',
  },
  {
    id: 'react-lazy-suspense',
    type: 'multiple-choice',
    prompt: 'What do React.lazy and <Suspense> do together?',
    options: [
      'Load a component\'s code only when needed and show a fallback meanwhile',
      'Delay rendering a component until the browser is idle, without a fallback',
      'Cache a component\'s output so later renders skip the work entirely',
      'Catch errors in a component and show a fallback message instead',
    ],
    answer: 0,
    explanation: 'React.lazy(() => import(\'./Chart\')) splits that component into its own file, downloaded the first time it renders. <Suspense fallback={<Spinner />}> shows the fallback while it loads.',
  },
  {
    id: 'react-server-components',
    type: 'multiple-choice',
    prompt: 'In a framework like Next.js, what can a Server Component NOT do?',
    options: [
      'Use useState or attach onClick event handlers',
      'Read data from a database or the file system',
      'Render other components passed as children',
      'Fetch data with async/await before rendering',
    ],
    answer: 0,
    explanation: 'Server Components run only on the server and send finished HTML-like output to the browser. They can read databases directly, but they have no state or event handlers, because they never run in the browser.',
  },
  {
    id: 'react-use-client',
    type: 'multiple-choice',
    prompt: 'What does the "use client" line at the top of a file mean in Next.js?',
    options: [
      'The file\'s components also run in the browser, so hooks work',
      'The file is skipped on the server and rendered only in the browser',
      'The components in it may query the database directly from the browser',
      'The file is loaded lazily the first time a user clicks on it',
    ],
    answer: 0,
    explanation: '"use client" marks a Client Component: it is still pre-rendered to HTML on the server, but its code is also sent to the browser so state, effects and event handlers work there.',
  },
  {
    id: 'react-hydration',
    type: 'multiple-choice',
    prompt: 'What is "hydration" in React?',
    options: [
      'Attaching React and event handlers to HTML the server already rendered',
      'Re-rendering the whole page in the browser and discarding the server HTML',
      'Fetching fresh data for every component right after the page loads',
      'Saving component state to storage so it survives a page refresh',
    ],
    answer: 0,
    explanation: 'With server rendering, the browser first gets plain HTML so the page shows fast. Hydration is React "waking up" that HTML in the browser: it reuses the existing elements and attaches state and click handlers.',
  },
  {
    id: 'react-hydration-mismatch',
    type: 'multiple-choice',
    prompt: 'This component is rendered on the server and then hydrated. Why does React warn about a mismatch?',
    code: 'function Clock() {\n  return <p>{new Date().toLocaleTimeString()}</p>\n}',
    options: [
      'The server and the browser render a different time',
      'toLocaleTimeString is not allowed inside JSX curly braces',
      'The component has no state, so React cannot hydrate it',
      'Dates must be converted to a string before React renders them',
    ],
    answer: 0,
    explanation: 'Hydration expects the browser\'s first render to match the server HTML exactly. The clock reads a different time in each place. Show such values after mount (in an effect) instead.',
  },
  {
    id: 'react-router-link',
    type: 'multiple-choice',
    prompt: 'In React Router, why use <Link to="/about"> instead of <a href="/about">?',
    options: [
      'It changes the URL without a full page reload, so state is kept',
      'It preloads every route in the app as soon as it is rendered',
      'It opens the page in a new tab so the current app keeps running',
      'It is required for search engines to find the page at all',
    ],
    answer: 0,
    explanation: 'A plain <a> makes the browser load a whole new page, which restarts the app and loses state. <Link> updates the URL and lets React Router swap the right components in place.',
  },
  {
    id: 'react-rtl-findby',
    type: 'multiple-choice',
    prompt: 'In React Testing Library, which query fits text that appears only after data loads?',
    options: [
      'findByText, which returns a promise and waits for it',
      'getByText, which keeps retrying until the text shows up',
      'queryByText, which waits and then returns null on timeout',
      'getAllByText, which waits for every matching element',
    ],
    answer: 0,
    explanation: 'findBy... queries return a promise that keeps checking until the element appears (or times out), so you write await screen.findByText(\'Done\'). getBy and queryBy check only once, right away.',
  },
  {
    id: 'react-rtl-queryby',
    type: 'multiple-choice',
    prompt: 'You want to check that an error message is NOT on the screen. Which query fits best?',
    options: [
      'queryByText, because it returns null instead of throwing',
      'getByText, because it returns false when nothing matches',
      'findByText, because it resolves to null after a short wait',
      'getAllByText, because it returns an empty array when missing',
    ],
    answer: 0,
    explanation: 'getBy and getAllBy throw an error when nothing matches, and findBy rejects. queryBy returns null, so expect(screen.queryByText(\'Error\')).toBeNull() works.',
  },
  {
    id: 'react-rtl-byrole',
    type: 'multiple-choice',
    prompt: 'React Testing Library suggests getByRole over getByTestId in most cases. Why?',
    options: [
      'It finds elements the way users and screen readers do',
      'It is faster because it skips rendering child components',
      'It reads component state directly instead of the DOM',
      'Test ids are stripped out by React in development builds',
    ],
    answer: 0,
    explanation: 'Tests should use the app like a person would. getByRole(\'button\', { name: \'Save\' }) finds what users see and hear, and it also checks your HTML is accessible. Test ids are a last resort.',
  },
  {
    id: 'react-profiler',
    type: 'multiple-choice',
    prompt: 'The app feels slow when typing in a search box. What is a good first step?',
    options: [
      'Use the React DevTools Profiler to see what re-renders',
      'Wrap every component in React.memo and every function in useCallback',
      'Move all of the app state into Context so fewer components need props',
      'Switch the input to uncontrolled and read its value with a ref',
    ],
    answer: 0,
    explanation: 'Measure before you optimize. The Profiler shows which components render on each keystroke and how long they take, so you fix the real cause instead of guessing.',
  },
  {
    id: 'react-fetch-race',
    type: 'multiple-choice',
    prompt: 'An effect fetches a profile whenever userId changes. A slow old response sometimes overwrites a newer one. What is the usual fix?',
    options: [
      'In the cleanup, set an ignore flag or abort the old request',
      'Remove userId from the dependency array so it runs only once',
      'Fetch twice and keep whichever response happens to arrive first',
      'Make the effect callback async so React awaits the response',
    ],
    answer: 0,
    explanation: 'When userId changes, React runs the old effect\'s cleanup first. Setting ignore = true there (or calling controller.abort()) means the stale response is thrown away when it finally arrives.',
  },
  {
    id: 'react-effect-missing-deps',
    type: 'code-output',
    prompt: ['What has been logged after query changes to "cats"? (Ignore Strict Mode.)', 'The user types and query becomes "cats". What is in the console?'],
    code: "const [query, setQuery] = useState('cat')\n\nuseEffect(() => {\n  console.log('search ' + query)\n}, [])\n\n// later, the user types and query becomes 'cats'",
    options: [
      'search cat',
      'search cat, search cats',
      'search cats',
      'Nothing',
    ],
    answer: 0,
    explanation: 'With an empty array, the effect only runs after the first render, when query was "cat". It uses query but does not list it as a dependency, so it misses the change. Add [query] to fix it.',
  },
  {
    id: 'react-effect-loop',
    type: 'code-output',
    prompt: 'What happens when this component mounts?',
    code: 'const [count, setCount] = useState(0)\n\nuseEffect(() => {\n  setCount(count + 1)\n})',
    options: [
      'count keeps growing in an endless render loop',
      'count becomes 1 and then the effect stops',
      'React ignores setState calls made inside effects',
      'count stays 0 because effects cannot set state',
    ],
    answer: 0,
    explanation: 'With no dependency array, the effect runs after every render. It sets state, which causes a render, which runs the effect again, forever (React eventually warns "Maximum update depth exceeded").',
  },
  {
    id: 'react-setstate-in-render',
    type: 'code-output',
    prompt: 'What happens when this component renders?',
    code: 'function Counter() {\n  const [count, setCount] = useState(0)\n  setCount(count + 1)\n  return <p>{count}</p>\n}',
    options: [
      'React throws a "Too many re-renders" error',
      'It shows 1 and stops after one update',
      'It shows 0 because the update is ignored',
      'It shows 0, then 1, then stays at 1',
    ],
    answer: 0,
    explanation: 'Calling a setter directly in the component body asks for another render during every render, so it never ends and React stops with an error. Set state in event handlers or effects instead.',
  },
  {
    id: 'react-derived-state',
    type: 'multiple-choice',
    prompt: 'You have firstName and lastName in state. How should you get fullName?',
    options: [
      'Compute it during render from firstName and lastName directly',
      'Store it in its own state and update it in an effect',
      'Keep it in a ref so it never causes an extra render',
      'Store it in state too and set all three together',
    ],
    answer: 0,
    explanation: 'If a value can be calculated from existing props or state, just calculate it: const fullName = firstName + \' \' + lastName. Extra state can get out of sync and the effect adds a wasted render.',
  },
  {
    id: 'react-props-children',
    type: 'multiple-choice',
    prompt: 'In <Card><h2>Hi</h2></Card>, how does Card get the <h2>?',
    options: [
      'Through props.children, which holds what is between the tags',
      'Through props.content, which React fills with the inner JSX',
      'By calling useChildren() inside Card to read nested elements',
      'It cannot; Card must receive the <h2> as a named prop',
    ],
    answer: 0,
    explanation: 'Anything you put between a component\'s opening and closing tags arrives as the children prop. Card can place it anywhere: return <div className="card">{children}</div>.',
  },
  {
    id: 'react-child-to-parent',
    type: 'multiple-choice',
    prompt: ['How does a child component send data back up to its parent?', 'A child form needs to tell its parent what was submitted. How?'],
    options: [
      'The parent passes a callback function as a prop, and the child calls it',
      'The child changes its own props, and the parent reads the new values',
      'The child returns the data from its render along with its JSX',
      'The child stores it in useState, and the parent reads that state',
    ],
    answer: 0,
    explanation: 'Data flows down in React. To go up, the parent passes a callback such as onSubmit={handleSubmit}, and the child calls onSubmit(data). The parent can then update its own state.',
  },
  {
    id: 'react-layout-effect',
    type: 'multiple-choice',
    prompt: 'What is the difference between useLayoutEffect and useEffect?',
    options: [
      'useLayoutEffect runs before paint; useEffect usually runs after it',
      'useLayoutEffect runs only on the server; useEffect runs only in the browser',
      'useLayoutEffect runs after the browser paints; useEffect runs before',
      'useLayoutEffect runs once on mount; useEffect runs after every render',
    ],
    answer: 0,
    explanation: 'useLayoutEffect runs right after React updates the DOM but before the screen is painted, which is useful for measuring elements without a visible flicker. Most of the time useEffect is the right choice.',
  },
  {
    id: 'react-context-rerender',
    type: 'multiple-choice',
    prompt: 'A component reads AppContext with useContext but only uses user. Does it re-render when theme changes?',
    code: 'const [user, setUser] = useState(null)\nconst [theme, setTheme] = useState(\'light\')\n\nreturn (\n  <AppContext.Provider value={{ user, theme }}>\n    <Page />\n  </AppContext.Provider>\n)',
    options: [
      'Yes, every consumer re-renders whenever the value object changes',
      'No, React tracks which fields of the value each consumer reads',
      'No, context consumers re-render only when their own props change',
      'Yes, but only if the consumer is a direct child of the Provider',
    ],
    answer: 0,
    explanation: 'When the Provider gets a new value (here a new object), every component that calls useContext(AppContext) re-renders, whatever field it uses. Splitting into smaller contexts avoids this.',
  },
  {
    id: 'react-component-capital',
    type: 'multiple-choice',
    prompt: 'Why does this not show the profile component?',
    code: 'function profileCard() {\n  return <div>Profile</div>\n}\n\n// elsewhere:\n<profileCard />',
    options: [
      'Lowercase JSX tags are treated as plain HTML tags',
      'Components must be arrow functions to be used as JSX tags',
      'The component must be exported before any JSX can render it',
      'Self-closing tags only work for built-in elements like <img>',
    ],
    answer: 0,
    explanation: 'JSX treats <div> or <profileCard> (lowercase) as a plain HTML tag name. Component names must start with a capital letter, like ProfileCard, so React knows to call your function.',
  },
  {
    id: 'react-pure-render',
    type: 'multiple-choice',
    prompt: 'Why should a component not change outside variables (like a global counter) while rendering?',
    options: [
      'React may render it many times, so renders must have no side effects',
      'Global variables are frozen by React and throw an error when you change them',
      'React runs components in a web worker that cannot see global variables',
      'Changing globals is fine there; React only forbids changing the props',
    ],
    answer: 0,
    explanation: 'Rendering should be like a math formula: same inputs, same output. React can render a component extra times (Strict Mode does on purpose), so changing outside values gives unpredictable results.',
  },
  {
    id: 'react-auto-batching',
    type: 'multiple-choice',
    prompt: 'Since React 18, what happens to two setState calls inside a setTimeout callback?',
    options: [
      'They are batched into one single re-render, just like in event handlers',
      'Each one causes its own re-render, because timeouts are not batched',
      'Only the last call is applied, and the first one is thrown away',
      'They are applied synchronously, so the DOM updates between them',
    ],
    answer: 0,
    explanation: 'React 18 added automatic batching: updates in timeouts, promises and native events are grouped into one render, just like in React event handlers. Before React 18, each one caused its own render.',
  },
  {
    id: 'react-form-submit',
    type: 'multiple-choice',
    prompt: 'Submitting this form reloads the whole page. What is missing?',
    code: 'function handleSubmit(e) {\n  save(text)\n}\n\nreturn <form onSubmit={handleSubmit}>...</form>',
    options: [
      'Calling e.preventDefault() to stop the browser\'s default form submit',
      'Calling e.stopPropagation() so the event never reaches the page',
      'Returning false from handleSubmit to cancel the submit event',
      'Using onClick on the button instead of onSubmit on the form',
    ],
    answer: 0,
    explanation: 'By default, a browser sends the form and loads a new page. e.preventDefault() cancels that so React can handle it. Returning false does not work in React handlers.',
  },
  {
    id: 'react-effect-vs-handler',
    type: 'multiple-choice',
    prompt: 'When the user clicks "Buy", the app should send a POST request. Where should that code go?',
    options: [
      'In the click handler, since a user action causes it',
      'In a useEffect that watches a "clicked" state flag',
      'In the component body, so it runs on the next render',
      'In a useMemo, so the request is cached between renders',
    ],
    answer: 0,
    explanation: 'Code that happens because of a specific user action belongs in that event handler. Effects are for staying in sync with something outside React (like a chat connection) whenever the component is on screen.',
  },
  {
    id: 'react-nested-update',
    type: 'multiple-choice',
    prompt: 'State is { user: { name, address: { city } } }. Which approach updates city without mutating state?',
    options: [
      'Spread a new copy of every object on the path down to city',
      'Spread a new copy of the top level only, then change city on it',
      'Assign the new city to state.user.address.city, then call setState',
      'Spread just the address object, since that is where city lives',
    ],
    answer: 0,
    explanation: 'Spread only copies one level. To change city you need new objects for state, user and address: { ...state, user: { ...state.user, address: { ...state.user.address, city } } }.',
  },
  {
    id: 'react-async-effect',
    type: 'multiple-choice',
    prompt: 'Why is passing an async function directly to useEffect a problem?',
    code: 'useEffect(async () => {\n  const res = await fetch(url)\n  setData(await res.json())\n}, [url])',
    options: [
      'It returns a promise, but React expects a cleanup function or nothing',
      'await is not allowed anywhere inside a React component file',
      'React runs async effects on the server, where fetch is unavailable',
      'The effect runs twice, because each promise resolves two times',
    ],
    answer: 0,
    explanation: 'An async function always returns a promise. React treats what the effect returns as its cleanup, so a promise breaks that. Define an async function inside the effect and call it.',
  },
  {
    id: 'react-usememo-overuse',
    type: 'multiple-choice',
    prompt: 'Should you wrap every calculation in useMemo?',
    options: [
      'No; it has its own cost and helps only with slow work',
      'Yes; React skips rendering components whose values are memoized',
      'No; useMemo was deprecated in favor of useCallback in React 18',
      'Yes; it is free and makes every render faster',
    ],
    answer: 0,
    explanation: 'useMemo has to store values and compare dependencies, which is not free. It pays off for slow calculations or keeping a value stable for a memoized child, not for simple math.',
  },
]
