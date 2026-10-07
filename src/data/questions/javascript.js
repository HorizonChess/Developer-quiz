import { FN_NAMES, LABELS, LOOP_VARS, PEOPLE, SUFFIXES, VAR_NAMES, WORDS } from '../pools.js'

const range = (n) => Array.from({ length: n }, (_, i) => i)

export default [
  // ---------- Templates (a new variant every time) ----------
  {
    id: 'js-loop-closure',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const v = r.pick(LOOP_VARS)
      const n = r.int(2, 4)
      const keyword = r.pick(['var', 'let'])
      const repeated = Array(n).fill(n).join(' ')
      const counting = range(n).join(' ')
      const correct = keyword === 'var' ? repeated : counting
      return {
        prompt: 'What does this code print?',
        code: `for (${keyword} ${v} = 0; ${v} < ${n}; ${v}++) {\n  setTimeout(() => console.log(${v}), 0)\n}`,
        correct,
        wrong: [keyword === 'var' ? counting : repeated, Array(n).fill(n - 1).join(' '), range(n + 1).join(' ')],
        explanation:
          keyword === 'var'
            ? `var is function-scoped, so all ${n} callbacks share one ${v}. By the time the timers run, the loop has finished and ${v} is ${n}. Using let would print ${counting}.`
            : `let is block-scoped, so each loop iteration gets its own copy of ${v}. Each callback remembers its own value. With var, all callbacks would share one variable and print ${repeated}.`,
      }
    },
  },
  {
    id: 'js-counter-closure',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const fn = r.pick(FN_NAMES)
      const [a, b] = r.sample(['a', 'b', 'c', 'x', 'y'], 2)
      const start = r.int(0, 10)
      const step = r.int(1, 5)
      const calls = r.int(1, 3)
      const aVal = start + (calls + 1) * step
      const bVal = start + step
      const before = Array(calls).fill(`${a}()`).join('\n')
      return {
        prompt: 'What does this code print?',
        code: `function ${fn}(start, step) {\n  let current = start\n  return () => (current += step)\n}\n\nconst ${a} = ${fn}(${start}, ${step})\nconst ${b} = ${fn}(${start}, ${step})\n${before}\nconsole.log(${a}(), ${b}())`,
        correct: `${aVal} ${bVal}`,
        wrong: [`${aVal} ${aVal + step}`, `${aVal - step} ${bVal}`, `${bVal} ${bVal}`, `${start} ${start}`],
        explanation: `Each call to ${fn} creates a new closure with its own "current" variable. ${a} was called ${calls + 1} time(s) in total, so it reaches ${aVal}. ${b} is separate and was called once, so it is ${bVal}.`,
      }
    },
  },
  {
    id: 'js-hoisting',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const name = r.pick(VAR_NAMES)
      const value = r.int(1, 99)
      const keyword = r.pick(['var', 'let', 'const'])
      const isVar = keyword === 'var'
      return {
        prompt: 'What does this code print?',
        code: `console.log(${name})\n${keyword} ${name} = ${value}`,
        correct: isVar ? 'undefined' : 'ReferenceError',
        wrong: isVar ? ['ReferenceError', String(value), 'null'] : ['undefined', String(value), 'null'],
        explanation: isVar
          ? `var declarations are "hoisted": JavaScript moves the declaration (not the value) to the top. So ${name} exists but is still undefined when it is logged.`
          : `${keyword} is hoisted too, but it sits in the "temporal dead zone" until its line runs. Reading it earlier throws a ReferenceError. With var you would get undefined.`,
      }
    },
  },
  {
    id: 'js-coercion',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const a = r.int(2, 9)
      const b = r.int(2, 9)
      const s = r.pick(SUFFIXES)
      const variants = [
        {
          code: `console.log(${a} + ${b} + "${s}")`,
          correct: `${a + b}${s}`,
          wrong: [`${a}${b}${s}`, 'NaN', String(a + b)],
          why: `JavaScript reads + from left to right. ${a} + ${b} is number math (${a + b}), then adding a string joins them: "${a + b}${s}".`,
        },
        {
          code: `console.log("${s}" + ${a} + ${b})`,
          correct: `${s}${a}${b}`,
          wrong: [`${s}${a + b}`, 'NaN', `${a + b}${s}`],
          why: `The first + joins a string and a number, giving a string. Every + after that also joins strings, so you get "${s}${a}${b}", not ${a + b}.`,
        },
        {
          code: `console.log("${a}" - ${b})`,
          correct: String(a - b),
          wrong: [`${a}${b}`, 'NaN', `${a}-${b}`],
          why: `Unlike +, the - operator only works with numbers, so JavaScript converts "${a}" to ${a} and gives ${a - b}.`,
        },
        {
          code: `console.log("${a}" * "${b}")`,
          correct: String(a * b),
          wrong: ['NaN', `${a}${b}`, String(a + b), `"${a * b}"`],
          why: `* only works with numbers, so both strings are converted to numbers: ${a} * ${b} = ${a * b}.`,
        },
        {
          code: `console.log("${s}" - ${a})`,
          correct: 'NaN',
          wrong: [`${s}${a}`, `${s}-${a}`, String(-a)],
          why: `- converts both sides to numbers. "${s}" is not a number, so it becomes NaN ("Not a Number"), and any math with NaN gives NaN.`,
        },
      ]
      const v = r.pick(variants)
      return { prompt: 'What does this code print?', code: v.code, correct: v.correct, wrong: v.wrong, explanation: v.why }
    },
  },
  {
    id: 'js-array-methods',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const nums = r.sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15], 5)
      const list = `[${nums.join(', ')}]`
      const t = r.int(3, Math.min(8, Math.max(...nums) - 1)) // at least one number is bigger than t
      const k = r.int(2, 3)
      const variants = [
        () => {
          const res = nums.filter((x) => x > t).length
          return { code: `const nums = ${list}\nconsole.log(nums.filter(n => n > ${t}).length)`, correct: String(res),
            wrong: [String(res + 1), String(Math.max(res - 1, 0) === res ? res + 2 : Math.max(res - 1, 0)), String(nums.length), String(nums.length - res)],
            why: `filter keeps only items where the test is true. ${res} of the numbers are greater than ${t}.` }
        },
        () => {
          const res = nums.reduce((acc, x) => acc + x, 0)
          return { code: `const nums = ${list}\nconsole.log(nums.reduce((sum, n) => sum + n, 0))`, correct: String(res),
            wrong: [String(res - nums[0]), String(res + nums[0]), nums.join('')],
            why: `reduce walks the array, carrying a running total that starts at 0. Adding every number gives ${res}.` }
        },
        () => {
          const res = nums.find((x) => x > t)
          const later = nums.filter((x) => x > t)
          return { code: `const nums = ${list}\nconsole.log(nums.find(n => n > ${t}))`, correct: String(res),
            wrong: [later.length > 1 ? String(later[later.length - 1]) : 'true', String(nums.indexOf(res)), `${later.join(',')}`, 'undefined'],
            why: res === undefined
              ? `find returns undefined when no item passes the test.`
              : `find returns the first item that passes the test (not all of them, and not its index). ${res} is the first number greater than ${t}.` }
        },
        () => {
          const res = nums.map((x) => x * k).indexOf(nums[2] * k)
          return { code: `const nums = ${list}\nconsole.log(nums.map(n => n * ${k}).indexOf(${nums[2] * k}))`, correct: String(res),
            wrong: ['-1', String(nums[2]), String(res + 1), '0', String(nums[2] * k)],
            why: `map creates a new array with each number times ${k}. ${nums[2] * k} is at index ${res} (indexes start at 0).` }
        },
        () => {
          const missing = 11
          return { code: `const nums = ${list}\nconsole.log(nums.indexOf(${missing}))`, correct: '-1',
            wrong: ['undefined', 'null', String(nums.length)],
            why: `indexOf returns -1 when the value is not in the array. ${missing} is not in the list.` }
        },
      ]
      const v = r.pick(variants)()
      return { prompt: 'What does this code print?', code: v.code, correct: v.correct, wrong: v.wrong, explanation: v.why }
    },
  },
  {
    id: 'js-default-sort',
    type: 'code-output',
    check: 'node',
    generate(r) {
      let nums
      do {
        nums = [...r.sample([2, 3, 4, 5, 7, 8, 9], 2), ...r.sample([10, 12, 25, 31, 100], 2)]
        nums = r.shuffle(nums)
      } while ([...nums].sort().join() === [...nums].sort((x, y) => x - y).join())
      const sorted = [...nums].sort()
      const numeric = [...nums].sort((x, y) => x - y)
      return {
        prompt: 'What does this code print?',
        code: `const nums = [${nums.join(', ')}]\nconsole.log(nums.sort().join(','))`,
        correct: sorted.join(','),
        wrong: [numeric.join(','), [...numeric].reverse().join(','), nums.join(','), [...sorted].reverse().join(','), [...nums].reverse().join(',')],
        explanation: `Without a compare function, sort() converts items to strings and sorts them alphabetically, so "1..." comes before "2...". To sort numbers use nums.sort((a, b) => a - b), which gives ${numeric.join(',')}.`,
      }
    },
  },
  {
    id: 'js-object-reference',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const [first, second] = r.sample(PEOPLE, 2)
      const copy = r.pick(['reference', 'spread'])
      const line = copy === 'reference' ? 'const b = a' : 'const b = { ...a }'
      return {
        prompt: 'What does this code print?',
        code: `const a = { name: "${first}" }\n${line}\nb.name = "${second}"\nconsole.log(a.name)`,
        correct: copy === 'reference' ? second : first,
        wrong: [copy === 'reference' ? first : second, 'undefined', 'TypeError'],
        explanation:
          copy === 'reference'
            ? `Objects are stored by reference. "const b = a" does not copy the object; both variables point to the same one, so changing b.name changes a.name too.`
            : `{ ...a } creates a new object with copies of a's properties (a "shallow copy"), so changing b does not affect a.`,
      }
    },
  },
  {
    id: 'js-truthy-falsy',
    type: 'multiple-choice',
    generate(r) {
      const falsy = ['0', '""', 'null', 'undefined', 'NaN', 'false']
      const truthy = ['"0"', '"false"', '[]', '{}', '-1', '" "', 'Infinity']
      const askFalsy = r.chance()
      const correct = r.pick(askFalsy ? falsy : truthy)
      return {
        prompt: `Which of these values is ${askFalsy ? 'falsy' : 'truthy'}?`,
        correct,
        wrong: r.sample(askFalsy ? truthy : falsy, 3),
        explanation: `JavaScript has only a few falsy values: false, 0, "" (empty string), null, undefined and NaN. Everything else is truthy, including "0", "false", [] and {}.`,
      }
    },
  },
  {
    id: 'js-destructuring-defaults',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const [p, q] = r.sample(['width', 'height', 'size', 'speed', 'limit', 'retries'], 2)
      const given = r.int(1, 20)
      const d1 = r.int(21, 40)
      const d2 = r.int(41, 60)
      return {
        prompt: 'What does this code print?',
        code: `const { ${p} = ${d1}, ${q} = ${d2} } = { ${p}: ${given} }\nconsole.log(${p}, ${q})`,
        correct: `${given} ${d2}`,
        wrong: [`${d1} ${d2}`, `${given} undefined`, `${given} ${d1}`],
        explanation: `A default value is only used when the property is missing (undefined). ${p} exists, so it is ${given}. ${q} is missing, so it takes its default, ${d2}.`,
      }
    },
  },
  {
    id: 'js-rest-params',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const n = r.int(3, 6)
      const args = r.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], n)
      return {
        prompt: 'What does this code print?',
        code: `function show(first, ...rest) {\n  console.log(first, rest.length)\n}\nshow(${args.join(', ')})`,
        correct: `${args[0]} ${n - 1}`,
        wrong: [`${args[0]} ${n}`, `${args[0]} 1`, `${args[n - 1]} ${n - 1}`],
        explanation: `The "rest parameter" ...rest collects all remaining arguments into an array. The first argument goes to "first", so rest gets the other ${n - 1}.`,
      }
    },
  },
  {
    id: 'js-string-methods',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const word = r.pick(WORDS)
      const start = r.int(1, 2)
      const end = r.int(start + 2, word.length)
      const letter = word[end - 1]
      const idx = word.indexOf(letter)
      const variants = [
        { code: `console.log("${word}".slice(${start}, ${end}))`, correct: word.slice(start, end),
          wrong: [word.slice(start, end + 1), word.slice(start - 1, end), word.slice(start + 1, end), word.slice(0, end), word.slice(start), word.slice(start, end - 1), word.slice(start + 1)],
          why: `slice(start, end) includes the start index but stops before the end index. Indexes start at 0.` },
        { code: `console.log("${word}".split("").reverse().join(""))`, correct: [...word].reverse().join(''),
          wrong: [word, [...word].reverse().join(','), word.toUpperCase()],
          why: `split("") turns the string into an array of letters, reverse() flips the array, and join("") glues it back into a string.` },
        { code: `console.log("${word}".indexOf("${letter}"))`, correct: String(idx),
          wrong: [String(idx + 1), '-1', String(idx - 1), String(word.length)],
          why: `indexOf returns the position of the first match, counting from 0.` },
        { code: `console.log("${word}".at(-1), "${word}".length)`, correct: `${word.at(-1)} ${word.length}`,
          wrong: [`${word[0]} ${word.length}`, `${word.at(-1)} ${word.length - 1}`, `undefined ${word.length}`],
          why: `at(-1) counts from the end, so it returns the last character. length is the number of characters.` },
      ]
      const v = r.pick(variants)
      return { prompt: 'What does this code print?', code: v.code, correct: v.correct, wrong: v.wrong, explanation: v.why }
    },
  },
  {
    id: 'js-event-loop',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const kinds = r.shuffle(['sync', 'sync', 'promise', 'timeout', r.pick(['sync', 'promise', 'timeout'])])
      const labels = r.sample(LABELS, kinds.length)
      const lines = kinds.map((kind, i) => {
        const log = `console.log("${labels[i]}")`
        if (kind === 'sync') return log
        if (kind === 'promise') return `Promise.resolve().then(() => ${log})`
        return `setTimeout(() => ${log}, 0)`
      })
      const order = ['sync', 'promise', 'timeout'].flatMap((k) => labels.filter((_, i) => kinds[i] === k))
      const asWritten = labels.join(' ')
      const groupedAs = (groups) => groups.flatMap((k) => labels.filter((_, i) => kinds[i] === k)).join(' ')
      return {
        prompt: 'In what order are the words printed?',
        code: lines.join('\n'),
        correct: order.join(' '),
        wrong: [asWritten, groupedAs(['sync', 'timeout', 'promise']), groupedAs(['promise', 'sync', 'timeout']), [...order].reverse().join(' ')],
        explanation: 'First all normal (synchronous) code runs. Then the "microtask" queue runs, which holds promise callbacks. Only after that do timer callbacks run, even with a 0 ms delay.',
      }
    },
  },
  {
    id: 'js-async-await-order',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const [a, b, c, d] = r.sample(LABELS, 4)
      return {
        prompt: 'In what order are the words printed?',
        code: `async function run() {\n  console.log("${b}")\n  await null\n  console.log("${d}")\n}\n\nconsole.log("${a}")\nrun()\nconsole.log("${c}")`,
        correct: `${a} ${b} ${c} ${d}`,
        wrong: [`${a} ${b} ${d} ${c}`, `${a} ${c} ${b} ${d}`, `${b} ${d} ${a} ${c}`],
        explanation: `An async function runs normally until its first await. At that point it pauses and the rest of the program continues ("${c}"). The code after await resumes later as a microtask.`,
      }
    },
  },
  {
    id: 'js-const-mutation',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const items = r.sample(WORDS, 2)
      const extra = r.pick(WORDS.filter((w) => !items.includes(w)))
      return {
        prompt: 'What does this code print?',
        code: `const list = ["${items[0]}", "${items[1]}"]\nlist.push("${extra}")\nconsole.log(list.length)`,
        correct: '3',
        wrong: ['2', 'TypeError', '1'],
        explanation: 'const stops you from reassigning the variable (list = ...), but the array itself can still be changed. push adds an item, so the length becomes 3.',
      }
    },
  },

  // ---------- Fixed questions ----------
  {
    id: 'js-typeof-null',
    type: 'code-output',
    check: 'node',
    prompt: 'What does this code print?',
    code: 'console.log(typeof null, typeof [], typeof undefined)',
    options: ['object object undefined', 'null array undefined', 'null object undefined', 'object array undefined'],
    answer: 0,
    explanation: 'typeof null is "object" (an old bug kept so websites would not break), and arrays are objects too. Use Array.isArray() to check for arrays.',
  },
  {
    id: 'js-float',
    type: 'code-output',
    check: 'node',
    prompt: 'What does this code print?',
    code: 'console.log(0.1 + 0.2 === 0.3)',
    options: ['false', 'true', 'undefined', 'TypeError'],
    answer: 0,
    explanation: 'Computers store decimals in binary, so 0.1 + 0.2 is actually 0.30000000000000004. Compare decimals with a small tolerance, or work in whole numbers (like cents).',
  },
  {
    id: 'js-nan',
    type: 'code-output',
    check: 'node',
    prompt: 'What does this code print?',
    code: 'console.log(NaN === NaN, Number.isNaN(NaN))',
    options: ['false true', 'true true', 'false false', 'true false'],
    answer: 0,
    explanation: 'NaN is the only value in JavaScript that is not equal to itself. To check for it, use Number.isNaN().',
  },
  {
    id: 'js-equality',
    type: 'multiple-choice',
    prompt: ['What is the difference between == and ===?', 'Why do most style guides recommend === over ==?'],
    options: [
      '=== compares value and type; == converts types before comparing',
      'There is no difference',
      '== is faster, so === is only for strings',
      '=== compares objects by their contents',
    ],
    answer: 0,
    explanation: '== does "type coercion", so 1 == "1" is true. === needs the same type and value, so 1 === "1" is false. === avoids surprises.',
  },
  {
    id: 'js-closure-def',
    type: 'multiple-choice',
    prompt: ['What is a closure in JavaScript?', 'An interviewer asks you to define a closure. Which answer is best?'],
    options: [
      'A function that remembers the variables from the place where it was created',
      'A function that runs immediately after it is defined',
      'A way to close a browser window',
      'A function with no parameters',
    ],
    answer: 0,
    explanation: 'A closure is a function plus the variables around it when it was created. Even after the outer function returns, the inner function can still use those variables.',
  },
  {
    id: 'js-var-let-const',
    type: 'multiple-choice',
    prompt: 'Which statement about var, let and const is correct?',
    options: [
      'let and const are block-scoped; var is function-scoped',
      'All three are block-scoped',
      'const values can never change, even inside objects',
      'var cannot be reassigned',
    ],
    answer: 0,
    explanation: 'let and const only exist inside the nearest { } block. var ignores blocks and belongs to the whole function. const blocks reassignment, but objects it points to can still change.',
  },
  {
    id: 'js-null-undefined',
    type: 'multiple-choice',
    prompt: 'What is the difference between null and undefined?',
    options: [
      'undefined means a value was never set; null is an intentional "no value"',
      'They are exactly the same',
      'null is a string and undefined is a number',
      'undefined is only used for functions',
    ],
    answer: 0,
    explanation: 'JavaScript gives you undefined automatically (missing variables, missing properties). Developers use null on purpose to say "empty".',
  },
  {
    id: 'js-arrow-this',
    type: 'multiple-choice',
    prompt: ['How is "this" different inside an arrow function?', 'Why might an arrow function be a bad choice for an object method that uses "this"?'],
    options: [
      'Arrow functions do not have their own "this"; they use the "this" of the surrounding code',
      'Arrow functions always set "this" to the window object',
      'Arrow functions make "this" refer to the function itself',
      'There is no difference',
    ],
    answer: 0,
    explanation: 'Regular functions get "this" from how they are called. Arrow functions take "this" from where they are written, which is great for callbacks but wrong for object methods.',
  },
  {
    id: 'js-promise-states',
    type: 'multiple-choice',
    prompt: 'What are the three states of a Promise?',
    options: ['pending, fulfilled, rejected', 'waiting, done, failed', 'open, resolved, closed', 'start, running, stopped'],
    answer: 0,
    explanation: 'A promise starts "pending", then becomes either "fulfilled" (it has a value) or "rejected" (it has an error). Once settled it never changes again.',
  },
  {
    id: 'js-promise-all',
    type: 'multiple-choice',
    prompt: 'What does Promise.all do if one of the promises rejects?',
    options: [
      'It rejects right away with that error',
      'It waits and returns only the successful results',
      'It retries the failed promise',
      'It ignores the error and resolves with undefined in its place',
    ],
    answer: 0,
    explanation: 'Promise.all fails fast: one rejection rejects the whole thing. If you want every result, success or failure, use Promise.allSettled.',
  },
  {
    id: 'js-map-foreach',
    type: 'multiple-choice',
    prompt: 'What is the main difference between map() and forEach()?',
    options: [
      'map returns a new array; forEach returns undefined',
      'forEach is the only one that loops',
      'map changes the original array',
      'forEach can be chained, map cannot',
    ],
    answer: 0,
    explanation: 'map builds and returns a new array from your callback results. forEach just runs the callback for each item and returns nothing.',
  },
  {
    id: 'js-shallow-deep',
    type: 'multiple-choice',
    prompt: 'You copy an object with { ...original }. What happens to nested objects inside it?',
    options: [
      'They are shared between the copy and the original',
      'They are deeply copied too',
      'They are removed from the copy',
      'They become strings',
    ],
    answer: 0,
    explanation: 'Spread makes a shallow copy: only the top level is new. Nested objects are still the same references. Use structuredClone() for a deep copy.',
  },
  {
    id: 'js-debounce',
    type: 'multiple-choice',
    prompt: ['What does "debouncing" a function mean?', 'A search box calls the server on every keystroke. Which technique waits until the user stops typing?'],
    options: [
      'Waiting until calls stop for a set time, then running the function once',
      'Running the function at most once per second, no matter what',
      'Running the function twice to make sure it worked',
      'Caching the function result forever',
    ],
    answer: 0,
    explanation: 'Debounce waits for a pause (for example 300 ms without typing) and then runs once. Throttle is the related idea of running at most once per time window.',
  },
  {
    id: 'js-prototype',
    type: 'multiple-choice',
    prompt: 'How does inheritance work in JavaScript under the hood?',
    options: [
      'Objects link to a prototype object and look up missing properties there',
      'Classes copy all their methods into every object',
      'JavaScript does not support inheritance',
      'Through multiple inheritance like C++',
    ],
    answer: 0,
    explanation: 'Every object has a hidden link to a prototype. If a property is not found on the object, JavaScript checks the prototype, then its prototype, and so on (the "prototype chain"). class syntax is built on top of this.',
  },
]
