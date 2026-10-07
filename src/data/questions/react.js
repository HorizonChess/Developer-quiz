import { PEOPLE } from '../pools.js'

const STATE_NAMES = ['count', 'score', 'clicks', 'likes', 'votes', 'stars']
const cap = (s) => s[0].toUpperCase() + s.slice(1)

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
        correct: 'React may reuse the wrong component, so state (like typed text) ends up on the wrong item',
        wrong: [
          'Nothing; index keys are always safe',
          'React throws an error and stops rendering',
          'The list renders twice',
          'The keys become strings and break sorting',
        ],
        explanation: 'Keys tell React which item is which. When items move, index keys shift too, so React matches old and new items wrongly. Use a stable id from your data, like key={item.id}.',
      }
    },
  },

  // ---------- Fixed questions ----------
  {
    id: 'react-props-state',
    type: 'multiple-choice',
    prompt: ['What is the difference between props and state?', 'Which statement about props and state is correct?'],
    options: [
      'Props are passed in by the parent and read-only; state is owned and updated by the component',
      'Props can be changed by the child; state cannot',
      'They are the same thing',
      'State is only for class components',
    ],
    answer: 0,
    explanation: 'Think of props as function arguments and state as the component\'s own memory. A component never changes its props; it changes its state with a setter like setCount.',
  },
  {
    id: 'react-virtual-dom',
    type: 'multiple-choice',
    prompt: 'What is the "virtual DOM" in React?',
    options: [
      'A lightweight copy of the UI that React compares to find the minimum real DOM changes',
      'A second browser window',
      'A database for components',
      'A CSS framework',
    ],
    answer: 0,
    explanation: 'React builds a description of the UI, compares it with the previous one ("diffing"), and only updates what changed in the real DOM. This process is called reconciliation.',
  },
  {
    id: 'react-controlled',
    type: 'multiple-choice',
    prompt: 'What is a "controlled component" in a React form?',
    options: [
      'An input whose value comes from React state and updates through onChange',
      'An input that cannot be edited',
      'A component controlled by Redux only',
      'An input that reads its value with document.getElementById',
    ],
    answer: 0,
    explanation: 'In a controlled input, value={text} and onChange={e => setText(e.target.value)} make React state the single source of truth. Uncontrolled inputs keep their own value in the DOM (read with a ref).',
  },
  {
    id: 'react-effect-cleanup',
    type: 'multiple-choice',
    prompt: ['When does the cleanup function returned from useEffect run?', 'Why would you return a function from useEffect?'],
    options: [
      'Before the effect runs again and when the component unmounts',
      'Only on the first render',
      'Every time the user clicks',
      'Never; returned functions are ignored',
    ],
    answer: 0,
    explanation: 'The cleanup undoes the effect, such as removing an event listener or clearing a timer. It runs before the next effect and when the component is removed, preventing memory leaks.',
  },
  {
    id: 'react-memo-callback',
    type: 'multiple-choice',
    prompt: 'What is the difference between useMemo and useCallback?',
    options: [
      'useMemo remembers a computed value; useCallback remembers a function',
      'useCallback is for API calls only',
      'useMemo is for class components',
      'They are identical',
    ],
    answer: 0,
    explanation: 'useMemo(() => compute(a), [a]) caches a value. useCallback(fn, [a]) caches the function itself, which helps when passing it to memoized children. Both only recompute when dependencies change.',
  },
  {
    id: 'react-useref',
    type: 'multiple-choice',
    prompt: 'Which is a good use of useRef?',
    options: [
      'Holding a DOM element or a value that should not trigger a re-render when it changes',
      'Storing values that should appear on screen',
      'Fetching data from an API',
      'Replacing all useState calls',
    ],
    answer: 0,
    explanation: 'A ref is a box (ref.current) that survives re-renders. Changing it does not re-render, so use it for DOM nodes, timer ids, or previous values. Use state for anything shown on screen.',
  },
  {
    id: 'react-lifting-state',
    type: 'multiple-choice',
    prompt: 'Two sibling components need the same data. What is the usual React solution?',
    options: [
      'Lift the state up to their closest common parent and pass it down as props',
      'Copy the state into both siblings',
      'Store it in a global variable',
      'Make the siblings read each other\'s DOM',
    ],
    answer: 0,
    explanation: 'Moving shared state to the nearest common parent ("lifting state up") keeps one source of truth. The parent passes the value and a setter down as props.',
  },
  {
    id: 'react-context',
    type: 'multiple-choice',
    prompt: ['What problem does React Context solve?', 'What is "prop drilling" and how can you avoid it?'],
    options: [
      'Passing data through many layers of components without threading props through each one',
      'Making components render faster',
      'Connecting React to a database',
      'Styling components',
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
      'Saves the component to local storage',
      'Makes the component render twice',
      'Turns it into a class component',
    ],
    answer: 0,
    explanation: 'React.memo compares the new props with the old ones (shallowly). If they are the same, React reuses the last result. Objects and functions created on every render will still look "new".',
  },
  {
    id: 'react-mutate-state',
    type: 'multiple-choice',
    prompt: 'Why does todos.push(newTodo) followed by setTodos(todos) not update the screen?',
    options: [
      'It is the same array object, so React sees no change and skips the re-render',
      'push is not allowed in React',
      'setTodos only accepts strings',
      'React needs a page reload first',
    ],
    answer: 0,
    explanation: 'React compares the old and new state by reference. Mutating the array keeps the same reference. Create a new array instead: setTodos([...todos, newTodo]).',
  },
  {
    id: 'react-fragment',
    type: 'multiple-choice',
    prompt: 'What is <></> (a Fragment) used for?',
    options: [
      'Returning several elements without adding an extra wrapper element to the DOM',
      'Commenting out JSX',
      'Creating an empty component that never renders',
      'Loading code lazily',
    ],
    answer: 0,
    explanation: 'A component must return one root. A Fragment groups children without adding a <div>, which keeps HTML clean and avoids breaking layouts like tables or flexbox.',
  },
  {
    id: 'react-rules-of-hooks',
    type: 'multiple-choice',
    prompt: ['Why can\'t you call a hook inside an if statement?', 'Which is one of the Rules of Hooks?'],
    options: [
      'React tracks hooks by their call order, which must be the same on every render',
      'Hooks are slower inside if statements',
      'if statements are not allowed in components',
      'It is fine; there is no such rule',
    ],
    answer: 0,
    explanation: 'React remembers hooks by the order they are called. If a condition skips one, every hook after it gets the wrong data. Call hooks at the top level, and put conditions inside them.',
  },
  {
    id: 'react-custom-hook',
    type: 'multiple-choice',
    prompt: 'What is a custom hook?',
    options: [
      'A function starting with "use" that reuses stateful logic by calling other hooks',
      'A hook you download from npm only',
      'A component that returns JSX',
      'A way to edit React\'s source code',
    ],
    answer: 0,
    explanation: 'Custom hooks like useFetch or useLocalStorage package logic that uses hooks so many components can share it. The "use" prefix lets React and linters check the rules of hooks.',
  },
  {
    id: 'react-strict-mode',
    type: 'multiple-choice',
    prompt: 'In development, your effect runs twice when the component mounts. Why?',
    options: [
      'Strict Mode mounts components twice on purpose to reveal missing cleanups',
      'There is a bug in React',
      'The browser is caching the page',
      'useEffect always runs twice in production too',
    ],
    answer: 0,
    explanation: 'React Strict Mode mounts, unmounts and remounts in development only. If your effect cleans up correctly, running it twice causes no problem. Production runs it once.',
  },
  {
    id: 'react-usereducer',
    type: 'multiple-choice',
    prompt: 'When is useReducer a better fit than useState?',
    options: [
      'When state has several related parts updated in many different ways',
      'When state is a single boolean',
      'When you need to fetch data',
      'Never; useReducer is deprecated',
    ],
    answer: 0,
    explanation: 'useReducer moves update logic into one function: reducer(state, action) returns the new state. It keeps complex updates (like a shopping cart) organized and easy to test.',
  },
  {
    id: 'react-jsx',
    type: 'multiple-choice',
    prompt: 'What does JSX turn into before it runs in the browser?',
    options: [
      'Plain JavaScript function calls that create React elements',
      'HTML files',
      'CSS',
      'It runs in the browser as-is',
    ],
    answer: 0,
    explanation: 'Browsers do not understand JSX. A build tool (like Vite with Babel or esbuild) turns <h1>Hi</h1> into a JavaScript call similar to jsx("h1", { children: "Hi" }).',
  },
  {
    id: 'react-stale-state',
    type: 'multiple-choice',
    prompt: 'You call setCount(count + 1) and then console.log(count) on the next line. What is logged?',
    options: [
      'The old value, because state updates apply on the next render',
      'The new value',
      'undefined',
      'An error',
    ],
    answer: 0,
    explanation: 'Setting state schedules a re-render; it does not change the variable you already have. The new value shows up the next time the component function runs.',
  },
]
