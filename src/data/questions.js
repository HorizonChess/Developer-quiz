// Placeholder question bank. Step 2 replaces this with a large bank plus
// templates that vary names and values so questions don't repeat exactly.
//
// Every question has the same shape:
//   type:        'multiple-choice' or 'code-output' (what does this code print?)
//   prompt:      the question text
//   code:        optional code snippet shown under the prompt
//   options:     the possible answers
//   answer:      index of the correct option (0 = first)
//   explanation: shown after answering
export const QUESTIONS = [
  {
    id: 'js-1',
    topic: 'javascript',
    type: 'code-output',
    prompt: 'What does this code print?',
    code: "console.log(typeof null)",
    options: ['"null"', '"object"', '"undefined"', '"number"'],
    answer: 1,
    explanation:
      'typeof null returns "object". This is a long-standing bug from the first version of JavaScript that was kept so old websites would not break.',
  },
  {
    id: 'js-2',
    topic: 'javascript',
    type: 'multiple-choice',
    prompt: 'What is the main difference between == and ===?',
    options: [
      'There is no difference',
      '=== also compares types; == converts types before comparing',
      '== is faster than ===',
      '=== only works with numbers',
    ],
    answer: 1,
    explanation:
      '== performs type coercion (e.g. 1 == "1" is true), while === requires the same type and value (1 === "1" is false). Prefer === to avoid surprises.',
  },
  {
    id: 'css-1',
    topic: 'html-css',
    type: 'multiple-choice',
    prompt: 'With box-sizing: border-box, what does the width property include?',
    options: ['Content only', 'Content and padding', 'Content, padding and border', 'Content, padding, border and margin'],
    answer: 2,
    explanation:
      'border-box makes width include content, padding and border. Margin is always outside the box, so it is never included.',
  },
  {
    id: 'react-1',
    topic: 'react',
    type: 'multiple-choice',
    prompt: 'Why does React ask for a "key" prop when rendering a list?',
    options: [
      'To style each item',
      'To help React tell items apart when the list changes',
      'To make items clickable',
      'Keys are required by HTML',
    ],
    answer: 1,
    explanation:
      'Keys give each item a stable identity, so React can match old and new items and update only what changed. Use a unique id, not the array index, when the list can reorder.',
  },
  {
    id: 'node-1',
    topic: 'node',
    type: 'code-output',
    prompt: 'In Node.js, in what order are the letters printed?',
    code: "console.log('A')\nsetTimeout(() => console.log('B'), 0)\nPromise.resolve().then(() => console.log('C'))\nconsole.log('D')",
    options: ['A B C D', 'A D B C', 'A D C B', 'A C D B'],
    answer: 2,
    explanation:
      'Synchronous code runs first (A, D). Then microtasks like promise callbacks run (C), and only then timer callbacks (B).',
  },
  {
    id: 'sql-1',
    topic: 'sql',
    type: 'multiple-choice',
    prompt: 'Which JOIN returns only the rows that have a match in both tables?',
    options: ['LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL OUTER JOIN'],
    answer: 2,
    explanation:
      'INNER JOIN keeps only matching rows. LEFT/RIGHT JOIN also keep unmatched rows from one side, and FULL OUTER JOIN keeps unmatched rows from both.',
  },
  {
    id: 'web-1',
    topic: 'web',
    type: 'multiple-choice',
    prompt: 'Which HTTP status code means "Not Found"?',
    options: ['200', '301', '404', '500'],
    answer: 2,
    explanation:
      '404 means the server could not find the requested resource. 200 is OK, 301 is a permanent redirect, and 500 is a server error.',
  },
]
