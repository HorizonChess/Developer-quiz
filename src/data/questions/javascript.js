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

  {
    id: 'js-call-apply-bind',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const name = r.pick(PEOPLE)
      const g = r.pick(['Hi', 'Hello', 'Hey', 'Welcome'])
      const m = r.pick(['!', '?', '.'])
      const fn = `const user = { name: "${name}" }\nfunction greet(greeting, mark) {\n  return greeting + ", " + this.name + mark\n}\n`
      const good = `${g}, ${name}${m}`
      const variants = [
        { code: `${fn}console.log(greet.call(user, "${g}", "${m}"))`, correct: good,
          wrong: [`${g}, undefined${m}`, `${g}, ${name}undefined`, 'TypeError'],
          why: `call runs the function right away with "this" set to its first argument (user). The other arguments are passed one by one.` },
        { code: `${fn}console.log(greet.apply(user, ["${g}", "${m}"]))`, correct: good,
          wrong: [`${g}, undefined${m}`, `${g},${m}, ${name}undefined`, 'TypeError'],
          why: `apply works like call, but takes the arguments as one array. "this" is user, so this.name is ${name}.` },
        { code: `${fn}const hello = greet.bind(user, "${g}")\nconsole.log(hello("${m}"))`, correct: good,
          wrong: [`${g}, undefined${m}`, '[Function: bound greet]', `${m}, ${name}${g}`],
          why: `bind does not call the function. It returns a new function with "this" locked to user and "${g}" filled in as the first argument. Calling it adds "${m}".` },
        { code: `"use strict"\nconst user = {\n  name: "${name}",\n  greet() {\n    return "${g}, " + this.name\n  },\n}\nconst greet = user.greet\nconsole.log(greet())`, correct: 'TypeError',
          wrong: [`${g}, ${name}`, `${g}, undefined`, 'undefined'],
          why: `Copying a method into a variable loses its object. greet() is a plain call, so in strict mode "this" is undefined and reading this.name throws a TypeError. Use user.greet.bind(user) to keep it.` },
      ]
      const v = r.pick(variants)
      return { prompt: 'What does this code print?', code: v.code, correct: v.correct, wrong: v.wrong, explanation: v.why }
    },
  },
  {
    id: 'js-spread-merge',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const color = r.pick(['red', 'blue', 'green', 'black'])
      const [s1, s2] = r.sample([10, 12, 14, 16, 18, 20], 2)
      const optionsLast = r.chance()
      const order = optionsLast ? '...defaults, ...options' : '...options, ...defaults'
      const size = optionsLast ? s2 : s1
      const other = optionsLast ? s1 : s2
      return {
        prompt: 'What does this code print?',
        code: `const defaults = { color: "${color}", size: ${s1} }\nconst options = { size: ${s2} }\nconst merged = { ${order} }\nconsole.log(merged.color, merged.size)`,
        correct: `${color} ${size}`,
        wrong: [`${color} ${other}`, `undefined ${size}`, `undefined ${other}`],
        explanation: `Spreading copies each object's properties in order. When two objects have the same key, the one spread later wins, so size is ${size}. color only exists in defaults, so it is kept.`,
      }
    },
  },
  {
    id: 'js-nullish-optional',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const n = r.int(2, 9)
      const name = r.pick(PEOPLE)
      const variants = [
        { code: `const count = 0\nconsole.log(count ?? ${n}, count || ${n})`, correct: `0 ${n}`,
          wrong: [`${n} ${n}`, '0 0', `${n} 0`],
          why: `?? only falls back when the left side is null or undefined, so 0 is kept. || falls back for any falsy value, and 0 is falsy, so it gives ${n}.` },
        { code: `const count = null\nconsole.log(count ?? ${n}, count || ${n})`, correct: `${n} ${n}`,
          wrong: [`null ${n}`, `${n} null`, 'null null'],
          why: `null is both "nullish" and falsy, so ?? and || both fall back to ${n}.` },
        { code: `const user = { name: "${name}" }\nconsole.log(user.address?.city, user.name?.length)`, correct: `undefined ${name.length}`,
          wrong: ['TypeError', `null ${name.length}`, 'undefined undefined'],
          why: `?. stops and returns undefined when the value before it is null or undefined, instead of throwing. user.address is missing, so the result is undefined. user.name exists, so its length is ${name.length}.` },
        { code: `const user = null\nconsole.log(user?.name ?? "${name}")`, correct: name,
          wrong: ['TypeError', 'undefined', 'null'],
          why: `user?.name gives undefined because user is null (no error). Then ?? replaces undefined with "${name}".` },
        { code: `const settings = { volume: 0 }\nconsole.log(settings.volume || ${n}, settings.volume ?? ${n})`, correct: `${n} 0`,
          wrong: ['0 0', `${n} ${n}`, `0 ${n}`],
          why: `|| treats 0 as "missing" because 0 is falsy, so it gives ${n}. ?? only replaces null or undefined, so it keeps 0. That is why ?? is safer for numbers.` },
      ]
      const v = r.pick(variants)
      return { prompt: 'What does this code print?', code: v.code, correct: v.correct, wrong: v.wrong, explanation: v.why }
    },
  },
  {
    id: 'js-loose-equality',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const cases = [
        { e: 'null == undefined', v: true, why: 'null and undefined are loosely equal to each other' },
        { e: 'null == 0', v: false, why: 'null is only loosely equal to undefined, not to 0' },
        { e: '"" == 0', v: true, why: 'the empty string converts to the number 0' },
        { e: '"0" == false', v: true, why: 'both sides convert to the number 0' },
        { e: '"1" == 1', v: true, why: '"1" converts to the number 1' },
        { e: '[] == false', v: true, why: '[] becomes "" and then 0, and false becomes 0' },
        { e: 'NaN == NaN', v: false, why: 'NaN is never equal to anything, even itself' },
        { e: 'null === undefined', v: false, why: '=== never converts types, and they are different types' },
        { e: '"1" === 1', v: false, why: '=== needs the same type, and a string is not a number' },
        { e: '"abc" == 0', v: false, why: '"abc" converts to NaN, which equals nothing' },
      ]
      const [a, b] = r.sample(cases, 2)
      const combos = [[true, true], [true, false], [false, true], [false, false]].map((c) => c.join(' '))
      const correct = `${a.v} ${b.v}`
      return {
        prompt: 'What does this code print?',
        code: `console.log(${a.e}, ${b.e})`,
        correct,
        wrong: combos.filter((c) => c !== correct),
        explanation: `${a.e} is ${a.v} because ${a.why}. ${b.e} is ${b.v} because ${b.why}. == converts types before comparing; === does not.`,
      }
    },
  },
  {
    id: 'js-typeof-values',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const values = [
        { code: 'Symbol("id")', type: 'symbol', mistake: 'string' },
        { code: '10n', type: 'bigint', mistake: 'number' },
        { code: 'NaN', type: 'number', mistake: 'NaN' },
        { code: '[]', type: 'object', mistake: 'array' },
        { code: 'null', type: 'object', mistake: 'null' },
        { code: '(() => 1)', type: 'function', mistake: 'object' },
        { code: 'new Date()', type: 'object', mistake: 'date' },
        { code: '"5"', type: 'string', mistake: 'number' },
        { code: 'class {}', type: 'function', mistake: 'class' },
      ]
      const [a, b] = r.sample(values, 2)
      return {
        prompt: 'What does this code print?',
        code: `console.log(typeof ${a.code}, typeof ${b.code})`,
        correct: `${a.type} ${b.type}`,
        wrong: [`${a.mistake} ${b.type}`, `${a.type} ${b.mistake}`, `${a.mistake} ${b.mistake}`],
        explanation: `typeof ${a.code} is "${a.type}" and typeof ${b.code} is "${b.type}". Remember: arrays, dates and null all give "object", NaN is a "number", and classes are functions underneath.`,
      }
    },
  },
  {
    id: 'js-generator-next',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const [a, b, c] = r.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 3)
      const gen = `function* gen() {\n  yield ${a}\n  yield ${b}\n  yield ${c}\n}\n`
      const variants = [
        { code: `${gen}const g = gen()\nconsole.log(g.next().value, g.next().value)`, correct: `${a} ${b}`,
          wrong: [`${a} ${a}`, `${b} ${c}`, `${c} ${c}`],
          why: `Each call to next() resumes the generator until the next yield. The first call gives ${a}, the second gives ${b}.` },
        { code: `${gen}const g = gen()\ng.next()\ng.next()\ng.next()\nconsole.log(g.next().done)`, correct: 'true',
          wrong: ['false', 'undefined', 'TypeError'],
          why: `There are three yields. After three next() calls, the fourth one finds nothing left, so it returns { value: undefined, done: true }.` },
        { code: `${gen}const out = []\nfor (const n of gen()) out.push(n * 2)\nconsole.log(out.join(","))`, correct: `${a * 2},${b * 2},${c * 2}`,
          wrong: [`${a},${b},${c}`, `${a * 2}`, `${c * 2}`],
          why: `for...of calls next() for you until the generator is done, so it gets every yielded value: ${a}, ${b} and ${c}, each doubled.` },
      ]
      const v = r.pick(variants)
      return { prompt: 'What does this code print?', code: v.code, correct: v.correct, wrong: v.wrong, explanation: v.why }
    },
  },
  {
    id: 'js-map-set',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const base = r.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], r.int(3, 4))
      const ids = r.shuffle([...base, ...r.sample(base, 2)])
      const word = r.pick(['banana', 'letter', 'coffee', 'hello', 'apple', 'bubble', 'tomato'])
      const unique = new Set(word).size
      const n = r.int(1, 9)
      const variants = [
        { code: `const ids = [${ids.join(', ')}]\nconsole.log(new Set(ids).size)`, correct: String(base.length),
          wrong: [String(ids.length), String(base.length + 1), String(base.length - 1)],
          why: `A Set keeps only one copy of each value. The array has ${ids.length} items but only ${base.length} different numbers.` },
        { code: `const m = new Map()\nm.set("1", "text")\nm.set(1, "number")\nconsole.log(m.size, m.get(1))`, correct: '2 number',
          wrong: ['1 number', '1 text', '2 text'],
          why: `Unlike object keys, Map keys keep their type. The string "1" and the number 1 are two different keys, so the Map has 2 entries.` },
        { code: `const s = new Set()\ns.add({ id: ${n} })\ns.add({ id: ${n} })\nconsole.log(s.size)`, correct: '2',
          wrong: ['1', '0', 'undefined'],
          why: `Objects are compared by reference, not by contents. The two { id: ${n} } objects look the same but are different objects, so the Set keeps both.` },
        { code: `const letters = new Set("${word}")\nconsole.log(letters.size)`, correct: String(unique),
          wrong: [String(word.length), String(unique + 1), String(unique - 1), String(unique + 2), '1'],
          why: `A string is iterable, so new Set("${word}") adds each letter. Repeated letters are stored once, leaving ${unique} unique letters.` },
      ]
      const v = r.pick(variants)
      return { prompt: 'What does this code print?', code: v.code, correct: v.correct, wrong: v.wrong, explanation: v.why }
    },
  },
  {
    id: 'js-splice-slice',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const arr = r.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 6)
      const s = r.int(1, 2)
      const x = s + r.int(1, 2)
      const useSplice = r.chance()
      const sliced = arr.slice(s, x)
      const spliced = arr.slice(s, s + x)
      const part = useSplice ? spliced : sliced
      const otherPart = useSplice ? sliced : spliced
      const len = useSplice ? arr.length - x : arr.length
      const otherLen = useSplice ? arr.length : arr.length - sliced.length
      return {
        prompt: 'What does this code print?',
        code: `const arr = [${arr.join(', ')}]\nconst part = arr.${useSplice ? 'splice' : 'slice'}(${s}, ${x})\nconsole.log(part.join(","), arr.length)`,
        correct: `${part.join(',')} ${len}`,
        wrong: [`${part.join(',')} ${otherLen}`, `${otherPart.join(',')} ${len}`, `${otherPart.join(',')} ${otherLen}`],
        explanation: useSplice
          ? `splice(start, count) removes ${x} items starting at index ${s} and returns them. It changes the original array, which now has ${len} items.`
          : `slice(start, end) copies items from index ${s} up to (not including) index ${x}. It does not change the original array, which still has ${len} items.`,
      }
    },
  },
  {
    id: 'js-function-hoisting',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const fn = r.pick(['double', 'twice', 'scale', 'grow'])
      const k = r.int(2, 4)
      const x = r.int(2, 9)
      const res = String(k * x)
      const kind = r.pick(['declaration', 'var', 'const'])
      const body = `(n) {\n  return n * ${k}\n}`
      const code = {
        declaration: `console.log(${fn}(${x}))\n\nfunction ${fn}${body}`,
        var: `console.log(${fn}(${x}))\n\nvar ${fn} = function ${body}`,
        const: `console.log(${fn}(${x}))\n\nconst ${fn} = function ${body}`,
      }[kind]
      const correct = { declaration: res, var: 'TypeError', const: 'ReferenceError' }[kind]
      return {
        prompt: 'What does this code print?',
        code,
        correct,
        wrong: [res, 'TypeError', 'ReferenceError', 'undefined'],
        explanation: {
          declaration: `Function declarations are hoisted with their body, so you can call them before the line where they are written.`,
          var: `Only the var declaration is hoisted, not the function assigned to it. At the call, ${fn} is undefined, and calling undefined throws a TypeError.`,
          const: `const is hoisted but stays in the "temporal dead zone" until its line runs. Using ${fn} before that throws a ReferenceError.`,
        }[kind],
      }
    },
  },
  {
    id: 'js-currying-output',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const [x, y, z] = r.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 3)
      const k = r.int(2, 5)
      const variants = [
        { code: `const add = (a) => (b) => (c) => a + b + c\nconsole.log(add(${x})(${y})(${z}))`, correct: String(x + y + z),
          wrong: [String(x + y), String(x * y * z), 'TypeError', 'NaN'],
          why: `add(${x}) returns a function, calling it with ${y} returns another function, and calling that with ${z} finally adds all three: ${x + y + z}.` },
        { code: `const multiply = (a) => (b) => a * b\nconst times${k} = multiply(${k})\nconsole.log(typeof times${k}, times${k}(${x}))`, correct: `function ${k * x}`,
          wrong: [`number ${k * x}`, `function NaN`, `number ${k}`, `function ${k + x}`],
          why: `multiply(${k}) does not multiply yet. It returns a function that remembers a = ${k}, so typeof says "function". Calling it with ${x} gives ${k * x}.` },
      ]
      const v = r.pick(variants)
      return { prompt: 'What does this code print?', code: v.code, correct: v.correct, wrong: v.wrong, explanation: v.why }
    },
  },
  {
    id: 'js-recursion',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1))
      const sum = (n) => (n * (n + 1)) / 2
      const n = r.int(3, 6)
      const asc = range(n).map((i) => i + 1)
      const kind = r.pick(['fact', 'sum', 'logAfter', 'logBefore'])
      if (kind === 'fact' || kind === 'sum') {
        const isFact = kind === 'fact'
        return {
          prompt: 'What does this code print?',
          code: isFact
            ? `function f(n) {\n  if (n <= 1) return 1\n  return n * f(n - 1)\n}\nconsole.log(f(${n}))`
            : `function f(n) {\n  if (n === 0) return 0\n  return n + f(n - 1)\n}\nconsole.log(f(${n}))`,
          correct: String(isFact ? fact(n) : sum(n)),
          wrong: isFact
            ? [String(fact(n - 1)), String(fact(n + 1)), String(n * n), String(sum(n)), String(n)]
            : [String(sum(n - 1)), String(sum(n + 1)), String(n * (n + 1)), String(n)],
          explanation: isFact
            ? `f calls itself with a smaller number until it reaches the base case (n <= 1). Multiplying on the way back gives ${asc.join(' * ')} = ${fact(n)}.`
            : `f calls itself with a smaller number until it reaches the base case (n === 0). Adding on the way back gives ${asc.join(' + ')} = ${sum(n)}.`,
        }
      }
      const after = kind === 'logAfter'
      const desc = [...asc].reverse()
      return {
        prompt: 'What does this code print?',
        code: after
          ? `function count(n) {\n  if (n === 0) return\n  count(n - 1)\n  console.log(n)\n}\ncount(${n})`
          : `function count(n) {\n  if (n === 0) return\n  console.log(n)\n  count(n - 1)\n}\ncount(${n})`,
        correct: (after ? asc : desc).join(' '),
        wrong: [(after ? desc : asc).join(' '), [0, ...asc].join(' '), [...desc, 0].join(' ')],
        explanation: after
          ? `The log comes after the recursive call, so each call waits until the smaller ones finish. The deepest call (1) prints first.`
          : `The log comes before the recursive call, so ${n} prints first, then the function calls itself with ${n - 1}, and so on. It stops at 0 without printing it.`,
      }
    },
  },
  {
    id: 'js-fizzbuzz',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const start = r.int(1, 27)
      const end = start + 3
      const run = (from, rules) =>
        range(4).map((k) => {
          const i = from + k
          const hit = rules.find(([d]) => i % d === 0)
          return hit ? hit[1] : String(i)
        }).join(' ')
      const rules = [[15, 'FizzBuzz'], [3, 'Fizz'], [5, 'Buzz']]
      const correct = run(start, rules)
      return {
        prompt: r.pick(['What does this FizzBuzz loop print?', 'What does this code print?']),
        code: `for (let i = ${start}; i <= ${end}; i++) {\n  if (i % 15 === 0) console.log("FizzBuzz")\n  else if (i % 3 === 0) console.log("Fizz")\n  else if (i % 5 === 0) console.log("Buzz")\n  else console.log(i)\n}`,
        correct,
        wrong: [
          run(start, [[15, 'FizzBuzz'], [3, 'Buzz'], [5, 'Fizz']]),
          run(start + 1, rules),
          run(start - 1, rules),
          range(4).map((k) => start + k).join(' '),
        ],
        explanation: `Multiples of 3 print "Fizz", multiples of 5 print "Buzz", and multiples of both (15) print "FizzBuzz". The loop runs from ${start} to ${end}, including both ends.`,
      }
    },
  },
  {
    id: 'js-class-getter',
    type: 'code-output',
    check: 'node',
    generate(r) {
      const [w, w2] = r.sample([2, 3, 4, 5, 6, 7, 8, 9], 2)
      const h = r.int(2, 9)
      const cls = r.pick(['Rect', 'Box', 'Panel'])
      const head = `class ${cls} {\n  constructor(width, height) {\n    this.width = width\n    this.height = height\n  }\n  get area() {\n    return this.width * this.height\n  }\n}\nconst r = new ${cls}(${w}, ${h})\n`
      if (r.chance()) {
        return {
          prompt: 'What does this code print?',
          code: `${head}r.width = ${w2}\nconsole.log(r.area)`,
          correct: String(w2 * h),
          wrong: [String(w * h), 'undefined', 'TypeError'],
          explanation: `A getter runs its code every time you read the property, so r.area uses the current width (${w2}). Notice it is read without (), like a normal property.`,
        }
      }
      return {
        prompt: 'What does this code print?',
        code: `${head}console.log(r.area())`,
        correct: 'TypeError',
        wrong: [String(w * h), 'undefined', 'NaN'],
        explanation: `r.area already runs the getter and gives a number (${w * h}). Adding () tries to call that number as a function, which throws a TypeError. Read getters without ().`,
      }
    },
  },
  {
    id: 'js-pick-array-method',
    type: 'multiple-choice',
    generate(r) {
      const tasks = [
        { task: 'turn every price into the price with tax added', correct: 'map()', wrong: ['filter()', 'forEach()', 'reduce()'],
          why: 'map makes a new array of the same length, with each item transformed by your callback.' },
        { task: 'keep only the users who are active', correct: 'filter()', wrong: ['map()', 'find()', 'some()'],
          why: 'filter returns a new array with only the items where the callback returns true.' },
        { task: 'get the first order over $100', correct: 'find()', wrong: ['filter()', 'some()', 'findIndex()'],
          why: 'find returns the first matching item itself. filter would return an array of all matches, and findIndex returns the position.' },
        { task: 'check whether any item is out of stock', correct: 'some()', wrong: ['every()', 'filter()', 'includes()'],
          why: 'some returns true as soon as one item passes the test. includes only checks for an exact value, not a condition.' },
        { task: 'check that every form field is filled in', correct: 'every()', wrong: ['some()', 'filter()', 'find()'],
          why: 'every returns true only if the test passes for all items, and stops at the first failure.' },
        { task: 'add up all the cart totals into one number', correct: 'reduce()', wrong: ['map()', 'forEach()', 'concat()'],
          why: 'reduce walks the array while carrying an accumulator (a running total), and returns that single value.' },
        { task: 'find the position of the first negative number', correct: 'findIndex()', wrong: ['indexOf()', 'find()', 'some()'],
          why: 'findIndex returns the index of the first item that passes a test. indexOf only searches for an exact value.' },
        { task: 'turn [[1, 2], [3]] into [1, 2, 3]', correct: 'flat()', wrong: ['join()', 'splice()', 'concat()'],
          why: 'flat removes one level of nesting by default, joining inner arrays into one array.' },
      ]
      const t = r.pick(tasks)
      return {
        prompt: r.pick([`You need to ${t.task}. Which array method fits best?`, `Which array method would you use to ${t.task}?`]),
        correct: t.correct,
        wrong: t.wrong,
        explanation: t.why,
      }
    },
  },
  {
    id: 'js-mutating-methods',
    type: 'multiple-choice',
    generate(r) {
      const mutating = ['push()', 'pop()', 'shift()', 'unshift()', 'splice()', 'sort()', 'reverse()', 'fill()']
      const safe = ['slice()', 'concat()', 'map()', 'filter()', 'toSorted()', 'toReversed()', 'join()']
      const askMutating = r.chance()
      const correct = r.pick(askMutating ? mutating : safe)
      return {
        prompt: askMutating
          ? r.pick(['Which array method changes the original array?', 'Which of these array methods mutates the array it is called on?'])
          : r.pick(['Which array method leaves the original array unchanged?', 'Which of these array methods does NOT mutate the array?']),
        correct,
        wrong: r.sample(askMutating ? safe : mutating, 3),
        explanation: `${correct} ${askMutating ? 'changes the array in place' : 'returns a new value and leaves the array alone'}. Methods that mutate: push, pop, shift, unshift, splice, sort, reverse, fill. Safe ones: slice, concat, map, filter, toSorted, toReversed, join.`,
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
      '=== compares value and type; == converts types first',
      '== compares value and type; === converts types first',
      '=== compares objects by contents; == compares references',
      '=== is a faster == that skips the type check',
    ],
    answer: 0,
    explanation: '== does "type coercion" (converts types), so 1 == "1" is true. === needs the same type and value, so 1 === "1" is false. Both compare objects by reference.',
  },
  {
    id: 'js-closure-def',
    type: 'multiple-choice',
    prompt: ['What is a closure in JavaScript?', 'An interviewer asks you to define a closure. Which answer is best?'],
    options: [
      'A function that keeps access to variables from where it was created',
      'A function that runs immediately as soon as it is defined',
      'An inner function that gets a copy of outer values each time it is called',
      'A function whose local variables are deleted once it returns',
    ],
    answer: 0,
    explanation: 'A closure is a function plus the variables around it when it was created. Even after the outer function returns, the inner function can still read and change those same variables (not copies).',
  },
  {
    id: 'js-var-let-const',
    type: 'multiple-choice',
    prompt: 'Which statement about var, let and const is correct?',
    options: [
      'let and const are block-scoped; var is function-scoped',
      'var and let are block-scoped; const is function-scoped',
      'const is block-scoped; var and let are function-scoped',
      'All three are block-scoped, but only var is hoisted',
    ],
    answer: 0,
    explanation: 'let and const only exist inside the nearest { } block. var ignores blocks and belongs to the whole function. All three are hoisted, but let and const cannot be used before their line.',
  },
  {
    id: 'js-null-undefined',
    type: 'multiple-choice',
    prompt: 'What is the difference between null and undefined?',
    options: [
      'undefined means never assigned; null is an intentional empty value',
      'null means never assigned; undefined is an intentional empty value',
      'They are the same value, so null === undefined is true',
      'undefined is for missing variables; null is for missing functions',
    ],
    answer: 0,
    explanation: 'JavaScript gives you undefined automatically (missing variables, missing properties). Developers use null on purpose to say "empty". null == undefined is true, but null === undefined is false.',
  },
  {
    id: 'js-arrow-this',
    type: 'multiple-choice',
    prompt: ['How is "this" different inside an arrow function?', 'Why might an arrow function be a bad choice for an object method that uses "this"?'],
    options: [
      'It takes "this" from the surrounding code where it was written',
      'It sets "this" to whichever object called it, like a regular method',
      'It always points "this" at the global object, even in methods',
      'It points "this" at the arrow function itself, like a class',
    ],
    answer: 0,
    explanation: 'Regular functions get "this" from how they are called. Arrow functions have no "this" of their own and use the one from where they are written, which is great for callbacks but wrong for object methods.',
  },
  {
    id: 'js-promise-states',
    type: 'multiple-choice',
    prompt: 'What are the three states of a Promise?',
    options: ['pending, fulfilled, rejected', 'idle, pending, settled', 'pending, executing, completed', 'initialized, running, finished'],
    answer: 0,
    explanation: 'A promise starts "pending", then becomes either "fulfilled" (it has a value) or "rejected" (it has an error). "Settled" just means it is no longer pending. Once settled it never changes again.',
  },
  {
    id: 'js-promise-all',
    type: 'multiple-choice',
    prompt: 'What does Promise.all do if one of the promises rejects?',
    options: [
      'It rejects right away with that first error',
      'It waits for all, then resolves with only the successes',
      'It resolves anyway, with undefined where the failure was',
      'It retries the failed promise once before giving up',
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
      'forEach returns a new array; map returns undefined',
      'map changes the original array; forEach makes a copy',
      'map stops at the first falsy result; forEach does not',
    ],
    answer: 0,
    explanation: 'map builds and returns a new array from your callback results. forEach just runs the callback for each item and returns nothing. Neither changes the original array by itself.',
  },
  {
    id: 'js-shallow-deep',
    type: 'multiple-choice',
    prompt: 'You copy an object with { ...original }. What happens to nested objects inside it?',
    options: [
      'The copy and the original share the same nested objects',
      'Nested objects are copied too, so the two are independent',
      'Nested objects are left out and must be copied separately',
      'Nested objects are frozen in the copy so they cannot change',
    ],
    answer: 0,
    explanation: 'Spread makes a shallow copy: only the top level is new. Nested objects are still the same references. Use structuredClone() for a deep copy.',
  },
  {
    id: 'js-debounce',
    type: 'multiple-choice',
    prompt: ['What does "debouncing" a function mean?', 'A search box calls the server on every keystroke. Which technique waits until the user stops typing?'],
    options: [
      'Waiting for a pause in calls, then running the function once',
      'Running the function at most once per fixed time window',
      'Running it on every call, but caching the last result',
      'Queueing every call and running them one after another',
    ],
    answer: 0,
    explanation: 'Debounce waits for a pause (for example 300 ms without typing) and then runs once. Throttle is the related idea of running at most once per time window.',
  },
  {
    id: 'js-prototype',
    type: 'multiple-choice',
    prompt: 'How does inheritance work in JavaScript under the hood?',
    options: [
      'Objects look up missing properties on a linked prototype object',
      'Each new object receives its own copy of every class method',
      'Child objects merge in their parent with Object.assign',
      'Classes are compiled into separate objects for each subclass',
    ],
    answer: 0,
    explanation: 'Every object has a hidden link to a prototype. If a property is not found on the object, JavaScript checks the prototype, then its prototype, and so on (the "prototype chain"). class syntax is built on top of this.',
  },
  {
    id: 'js-strict-mode',
    type: 'multiple-choice',
    prompt: ['What does "use strict" change in a JavaScript file?', 'Which is one real effect of adding "use strict" at the top of a script?'],
    options: [
      'Assigning to an undeclared variable throws instead of making a global',
      'It checks types at runtime, so passing a wrong type throws',
      'It makes every variable block-scoped, even ones declared with var',
      'It turns off hoisting, so functions must be declared before use',
    ],
    answer: 0,
    explanation: 'Strict mode turns some silent mistakes into errors. For example, x = 5 without let or const throws a ReferenceError instead of quietly creating a global. It does not add types or change scoping.',
  },
  {
    id: 'js-event-bubbling',
    type: 'multiple-choice',
    prompt: ['A button is inside a div, and both have click listeners. What happens by default when the button is clicked?', 'What does "event bubbling" mean?'],
    options: [
      'The button listener runs first, then the div listener',
      'The div listener runs first, then the button listener',
      'Only the button listener runs, since it is the target',
      'Only the div listener runs, since it was added to the parent',
    ],
    answer: 0,
    explanation: 'By default events "bubble": they start at the clicked element and travel up through its parents, running each listener on the way. Listeners added with { capture: true } run on the way down instead.',
  },
  {
    id: 'js-event-delegation',
    type: 'multiple-choice',
    prompt: ['What is event delegation?', 'A list has 500 items that each need a click handler. Which technique avoids adding 500 listeners?'],
    options: [
      'One listener on the parent checks event.target to handle child clicks',
      'Each child forwards its clicks to the parent using dispatchEvent',
      'The browser copies a single listener onto every matching child',
      'A listener on window runs before the children and cancels their events',
    ],
    answer: 0,
    explanation: 'Because events bubble up, one listener on a parent sees clicks from all of its children. event.target tells you which child was clicked. It also works for items added later.',
  },
  {
    id: 'js-prevent-stop',
    type: 'multiple-choice',
    prompt: 'What is the difference between event.preventDefault() and event.stopPropagation()?',
    options: [
      'preventDefault cancels the browser action; stopPropagation stops bubbling to parents',
      'stopPropagation cancels the browser action; preventDefault stops bubbling to parents',
      'preventDefault removes the listener; stopPropagation cancels the browser action',
      'Both cancel the browser action, but only stopPropagation works on forms',
    ],
    answer: 0,
    explanation: 'preventDefault stops the built-in behavior, like a link navigating or a form submitting. stopPropagation stops the event from bubbling up to parent elements. They are independent of each other.',
  },
  {
    id: 'js-weakmap',
    type: 'multiple-choice',
    prompt: 'Why would you use a WeakMap instead of a Map?',
    options: [
      'Its object keys can still be garbage collected when unused elsewhere',
      'It is faster because it compares keys by value, not reference',
      'It accepts string and number keys, which a Map does not allow',
      'Its entries expire automatically after a short period of time',
    ],
    answer: 0,
    explanation: 'WeakMap keys must be objects. If nothing else references a key object, it can be garbage collected (freed from memory) along with its entry. That makes WeakMap good for storing extra data about objects without memory leaks.',
  },
  {
    id: 'js-map-vs-object',
    type: 'multiple-choice',
    prompt: 'When is a Map a better choice than a plain object?',
    options: [
      'When keys are not strings, or entries are added and removed often',
      'When keys are only strings and must stay sorted alphabetically',
      'When you need to save the data directly with JSON.stringify',
      'When you want the entries to inherit methods from a prototype',
    ],
    answer: 0,
    explanation: 'A Map can use any value as a key (objects, numbers), keeps insertion order, has .size, and is built for frequent adds and deletes. Plain objects turn keys into strings, and JSON.stringify turns a Map into {}.',
  },
  {
    id: 'js-symbol',
    type: 'multiple-choice',
    prompt: 'What is a Symbol mainly used for?',
    options: [
      'Creating unique property keys that cannot clash with other keys',
      'Storing short strings more efficiently than normal string values',
      'Making a property truly private so outside code cannot read it',
      'Defining constant values that cannot be reassigned later on',
    ],
    answer: 0,
    explanation: 'Every Symbol() is unique, even with the same description, so it makes a property key no other code will accidentally reuse. Symbol keys are skipped by for...in and JSON.stringify, but they are not truly private.',
  },
  {
    id: 'js-bigint-why',
    type: 'multiple-choice',
    prompt: 'Why does JavaScript have the BigInt type?',
    options: [
      'Normal numbers cannot exactly store integers beyond 2^53 - 1',
      'Normal numbers cannot store decimals, so BigInt adds them',
      'Normal numbers overflow to negative values after 2^31',
      'BigInt makes math faster by using whole CPU registers',
    ],
    answer: 0,
    explanation: 'Numbers are 64-bit floating point, so integers are only exact up to Number.MAX_SAFE_INTEGER (2^53 - 1, about 9 quadrillion). BigInt (written like 10n) stores whole numbers of any size exactly. It cannot hold decimals.',
  },
  {
    id: 'js-generator-def',
    type: 'multiple-choice',
    prompt: 'What does the yield keyword do inside a generator function?',
    options: [
      'Pauses the function and hands a value to the caller of next()',
      'Returns a value and ends the function, just like return does',
      'Waits for a promise to resolve before continuing, like await',
      'Runs the rest of the function later on a background thread',
    ],
    answer: 0,
    explanation: 'A generator (function*) can pause at each yield and send out a value. Calling .next() resumes it until the next yield. This lets you produce values one at a time.',
  },
  {
    id: 'js-for-in-of',
    type: 'multiple-choice',
    prompt: 'What is the difference between for...in and for...of?',
    options: [
      'for...in loops over keys; for...of loops over iterable values',
      'for...of loops over keys; for...in loops over iterable values',
      'for...in works only on arrays; for...of works only on objects',
      'They both give values, but for...in also includes inherited ones',
    ],
    answer: 0,
    explanation: 'for...in gives property names (for arrays, the indexes as strings). for...of gives the values of anything iterable: arrays, strings, Maps, Sets. Plain objects are not iterable, so for...of on them throws.',
  },
  {
    id: 'js-memoization',
    type: 'multiple-choice',
    prompt: ['What is memoization?', 'A slow function is often called with the same arguments. Which technique helps most?'],
    options: [
      'Caching results by their arguments so repeat calls skip the work',
      'Delaying calls until the caller stops triggering them for a while',
      'Splitting a function into smaller ones that each take one argument',
      'Running the function for all arguments in parallel at once',
    ],
    answer: 0,
    explanation: 'Memoization stores each result in a cache, keyed by the arguments. The next call with the same arguments returns the saved result instead of recalculating. It is only safe for pure functions.',
  },
  {
    id: 'js-currying-def',
    type: 'multiple-choice',
    prompt: 'What is currying?',
    options: [
      'Turning f(a, b) into f(a)(b), one argument per call',
      'Calling a function from inside itself until a base case',
      'Locking "this" inside a function so it cannot change',
      'Chaining functions so each output feeds the next one',
    ],
    answer: 0,
    explanation: 'A curried function takes one argument and returns another function waiting for the next one. add(2)(3) is the curried form of add(2, 3). The other options describe recursion, bind and composition.',
  },
  {
    id: 'js-hoisting-def',
    type: 'multiple-choice',
    prompt: 'What does "hoisting" mean in JavaScript?',
    options: [
      'Declarations are set up before the code in their scope runs',
      'Variables are moved to global scope so every function can use them',
      'Assignments run first, so values are ready before earlier lines',
      'Function calls are moved to the top of the file automatically',
    ],
    answer: 0,
    explanation: 'Before running a scope, JavaScript registers its declarations. var starts as undefined, function declarations are ready to call, and let/const exist but cannot be used until their line. Values are not moved, only declarations.',
  },
  {
    id: 'js-iife',
    type: 'multiple-choice',
    prompt: 'What is an IIFE, like (function () { ... })()?',
    options: [
      'A function that is defined and called at once, in one expression',
      'A function that remembers outer variables after its parent returns',
      'A function that runs only once, the first time it is imported',
      'A function that runs automatically when the page finishes loading',
    ],
    answer: 0,
    explanation: 'IIFE means Immediately Invoked Function Expression. The parentheses make the function an expression, and the trailing () calls it right away. It was used to create a private scope before let, const and modules.',
  },
  {
    id: 'js-pure-function',
    type: 'multiple-choice',
    prompt: ['Which describes a pure function?', 'What makes a function "pure"?'],
    options: [
      'Same inputs give the same output, with no side effects',
      'It takes no arguments and returns the same value each time',
      'It cannot return undefined and cannot throw an error',
      'It only uses const variables, so nothing is reassigned',
    ],
    answer: 0,
    explanation: 'A pure function\'s result depends only on its arguments, and it does not change anything outside itself (no editing globals, no network calls, no logging). Pure functions are easy to test and safe to memoize.',
  },
  {
    id: 'js-bind-return',
    type: 'multiple-choice',
    prompt: 'What does fn.bind(obj) return?',
    options: [
      'A new function whose "this" is locked to obj',
      'The result of calling fn right away with "this" as obj',
      'Nothing; it changes fn itself so "this" is always obj',
      'A copy of obj with fn attached to it as a method',
    ],
    answer: 0,
    explanation: 'bind does not call the function. It returns a new function with "this" locked to obj (and optionally some arguments filled in). call and apply are the ones that run it immediately.',
  },
  {
    id: 'js-async-error',
    type: 'multiple-choice',
    prompt: 'How do you handle a rejected promise when using await?',
    options: [
      'Wrap the await call inside a try/catch block',
      'Pass an error callback as the second argument to await',
      'Check whether the awaited value is an instance of Error',
      'Add a catch block after the async function definition',
    ],
    answer: 0,
    explanation: 'When an awaited promise rejects, await throws the error at that line, so a normal try/catch catches it. Without one, the async function\'s own promise rejects. You can also call .catch() on the promise the async function returns.',
  },
  {
    id: 'js-settimeout-zero',
    type: 'multiple-choice',
    prompt: 'What does setTimeout(fn, 0) actually do?',
    options: [
      'Runs fn after the current code and promise callbacks finish',
      'Runs fn immediately, before the next line of code executes',
      'Runs fn after the current line, but before promise callbacks',
      'Runs fn on a separate thread, alongside the current code',
    ],
    answer: 0,
    explanation: '0 ms only means "as soon as possible". The callback waits in the timer queue until the current code is done and all microtasks (promise callbacks) have run. JavaScript runs it on the same single thread.',
  },
  {
    id: 'js-higher-order',
    type: 'multiple-choice',
    prompt: 'What is a higher-order function?',
    options: [
      'A function that takes or returns another function',
      'A function defined at the top level of a module',
      'A function that calls itself until a base case',
      'A function that runs first because it is hoisted',
    ],
    answer: 0,
    explanation: 'Functions are values in JavaScript, so they can be passed around. map, filter and setTimeout are higher-order because they take a callback. A function that returns a function, like a counter factory, is too.',
  },
  {
    id: 'js-then-returns',
    type: 'multiple-choice',
    prompt: 'What does promise.then(callback) return?',
    options: [
      'A new promise that settles with the callback\'s result',
      'The same promise, so every then shares one value',
      'The callback\'s return value directly, without a promise',
      'Nothing; then only registers the callback for later',
    ],
    answer: 0,
    explanation: 'then always returns a new promise. If the callback returns a value, the new promise fulfills with it; if it throws, the new promise rejects. That is what makes chaining .then().then() work.',
  },
  {
    id: 'js-spread-vs-rest',
    type: 'multiple-choice',
    prompt: 'Spread and rest both use "...". What is the difference?',
    options: [
      'Spread expands items out; rest gathers remaining items into an array',
      'Rest expands items out; spread gathers remaining items into an array',
      'Spread works only with arrays; rest works only with objects',
      'Spread makes a deep copy; rest makes a shallow copy',
    ],
    answer: 0,
    explanation: 'Spread unpacks: Math.max(...nums) or [...a, ...b]. Rest packs: function f(first, ...others) or const { id, ...other } = obj. Same dots, opposite jobs. Both copy only one level deep.',
  },
  {
    id: 'js-is-array',
    type: 'multiple-choice',
    prompt: 'Which check reliably tells you a value is an array?',
    options: ['Array.isArray(value)', 'value.isArray()', 'typeof value === "array"', 'value instanceof Object'],
    answer: 0,
    explanation: 'typeof returns "object" for arrays, instanceof Object is also true for plain objects, and arrays have no isArray method of their own. Array.isArray is built for exactly this check.',
  },
  {
    id: 'js-unique-values',
    type: 'multiple-choice',
    prompt: ['Which expression gives a new array of the unique values in arr?', 'How can you remove duplicates from an array in one line?'],
    options: ['[...new Set(arr)]', 'new Set(arr)', 'Object.values(new Set(arr))', 'Array.of(new Set(arr))'],
    answer: 0,
    explanation: 'A Set keeps one copy of each value, and spreading it with [...] turns it back into an array. new Set(arr) alone is a Set, not an array. Array.of wraps the whole Set as a single item, and Object.values finds no keys on a Set.',
  },
  {
    id: 'js-new-keyword',
    type: 'multiple-choice',
    prompt: 'What does the new keyword do when calling a constructor?',
    options: [
      'Creates an object, links its prototype, and runs the constructor on it',
      'Copies the constructor function so every object gets its own private version',
      'Calls the constructor normally, but stops it from using this',
      'Creates an object and copies every prototype method into it',
    ],
    answer: 0,
    explanation: 'new makes an empty object, links it to Constructor.prototype, runs the constructor with "this" pointing at the new object, and returns it. Methods stay on the prototype and are shared, not copied.',
  },
  {
    id: 'js-try-finally',
    type: 'code-output',
    check: 'node',
    prompt: 'What does this code print?',
    code: 'function check() {\n  try {\n    return "try"\n  } finally {\n    console.log("finally")\n  }\n}\nconsole.log(check())',
    options: ['finally try', 'try finally', 'try', 'finally'],
    answer: 0,
    explanation: 'A finally block always runs, even when try returns. The return value "try" is saved, finally logs first, and then check() hands back "try" to be printed.',
  },
  {
    id: 'js-json-stringify',
    type: 'code-output',
    check: 'node',
    prompt: 'What does this code print?',
    code: 'const data = { a: undefined, b: () => 1, c: null, d: NaN }\nconsole.log(JSON.stringify(data))',
    options: ['{"c":null,"d":null}', '{"a":undefined,"c":null,"d":NaN}', '{"a":null,"b":null,"c":null,"d":null}', '{"c":null,"d":NaN}'],
    answer: 0,
    explanation: 'JSON has no undefined or functions, so JSON.stringify leaves those properties out. NaN is not valid JSON either, so it becomes null.',
  },
  {
    id: 'js-object-freeze',
    type: 'code-output',
    check: 'node',
    prompt: 'What does this code print?',
    code: 'const settings = Object.freeze({ level: 1, inner: { level: 1 } })\nsettings.level = 2\nsettings.inner.level = 2\nconsole.log(settings.level, settings.inner.level)',
    options: ['1 2', '2 2', '1 1', 'TypeError'],
    answer: 0,
    explanation: 'Object.freeze is shallow: the top-level properties cannot change (outside strict mode the change is silently ignored), but nested objects are not frozen. inner.level can still be changed.',
  },
  {
    id: 'js-filter-boolean',
    type: 'code-output',
    check: 'node',
    prompt: 'What does this code print?',
    code: 'const values = [0, "hi", "", null, 42, undefined, "0"]\nconsole.log(values.filter(Boolean).length)',
    options: ['3', '2', '4', '7'],
    answer: 0,
    explanation: 'filter(Boolean) keeps only truthy values. 0, "", null and undefined are falsy and get removed. "hi", 42 and "0" (a non-empty string) are kept, so 3 remain.',
  },
  {
    id: 'js-template-literal',
    type: 'code-output',
    check: 'node',
    prompt: 'What does this code print?',
    code: 'const items = [1, 2, 3]\nconst user = { name: "Ava" }\nconsole.log(`${items} ${user}`)',
    options: ['1,2,3 [object Object]', '[1, 2, 3] { name: "Ava" }', '1 2 3 [object Object]', '1,2,3 Ava'],
    answer: 0,
    explanation: 'A template literal turns each ${} value into a string. Arrays become their items joined with commas, and plain objects become "[object Object]". Use JSON.stringify(user) to see the contents.',
  },
  {
    id: 'js-bigint-mix',
    type: 'code-output',
    check: 'node',
    prompt: 'What does this code print?',
    code: 'console.log(5n + 2n)\nconsole.log(5n + 2)',
    options: ['7n TypeError', '7n 7n', '7 7', '7n 7'],
    answer: 0,
    explanation: 'BigInt values (written with n) can be added together, and console.log shows them with the n. Mixing a BigInt with a normal number throws a TypeError; convert one side first, like 5n + BigInt(2).',
  },
]
