import { CLASS_NAMES, ID_NAMES } from '../pools.js'

// Specificity is counted as (ids, classes/attributes/pseudo-classes, elements).
const SELECTORS = [
  { sel: 'p', s: [0, 0, 1] },
  { sel: 'ul li a', s: [0, 0, 3] },
  { sel: 'div p', s: [0, 0, 2] },
  { sel: '.C', s: [0, 1, 0] },
  { sel: '.C p', s: [0, 1, 1] },
  { sel: 'a:hover', s: [0, 1, 1] },
  { sel: '.C .D', s: [0, 2, 0] },
  { sel: 'nav > a.D', s: [0, 1, 2] },
  { sel: '.C.D a', s: [0, 2, 1] },
  { sel: '#I', s: [1, 0, 0] },
  { sel: '#I p', s: [1, 0, 1] },
  { sel: '#I .C', s: [1, 1, 0] },
]
const score = ([a, b, c]) => a * 100 + b * 10 + c

export default [
  // ---------- Templates ----------
  {
    id: 'css-box-model',
    type: 'multiple-choice',
    generate(r) {
      const width = r.pick([100, 150, 200, 240, 300])
      const padding = r.pick([5, 10, 12, 16, 20])
      const border = r.int(1, 4)
      const margin = r.pick([8, 10, 15, 20])
      const sizing = r.pick(['content-box', 'border-box'])
      const includeMargin = r.chance(0.35)
      const box = sizing === 'content-box' ? width + 2 * padding + 2 * border : width
      const correct = box + (includeMargin ? 2 * margin : 0)
      const other = sizing === 'content-box' ? width : width + 2 * padding + 2 * border
      return {
        prompt: includeMargin
          ? 'How much horizontal space does this element take up, including its margin?'
          : 'How wide is this element on screen (border edge to border edge)?',
        code: `.box {\n  box-sizing: ${sizing};\n  width: ${width}px;\n  padding: ${padding}px;\n  border: ${border}px solid;\n  margin: ${margin}px;\n}`,
        correct: `${correct}px`,
        wrong: [`${other + (includeMargin ? 2 * margin : 0)}px`, `${includeMargin ? box : box + 2 * margin}px`, `${width + padding + border}px`, `${width + 2 * padding}px`],
        explanation:
          (sizing === 'content-box'
            ? `With content-box (the default), width is only the content. Padding and border are added on both sides: ${width} + 2×${padding} + 2×${border} = ${box}px.`
            : `With border-box, width already includes padding and border, so the box is exactly ${width}px.`) +
          (includeMargin ? ` Margin sits outside the border and adds 2×${margin}px, for ${correct}px.` : ' Margin is outside the border, so it does not count here.'),
      }
    },
  },
  {
    id: 'css-specificity',
    type: 'multiple-choice',
    generate(r) {
      const [C, D] = r.sample(CLASS_NAMES, 2)
      const I = r.pick(ID_NAMES)
      let picked
      do {
        picked = r.sample(SELECTORS, 4)
      } while (new Set(picked.map((x) => score(x.s))).size < 4)
      const fill = (sel) => sel.replace('C', C).replace('D', D).replace('I', I)
      const [best, ...rest] = [...picked].sort((x, y) => score(y.s) - score(x.s))
      return {
        prompt: 'Which selector has the highest specificity?',
        correct: fill(best.sel),
        wrong: rest.map((x) => fill(x.sel)),
        explanation: `When rules clash, the more specific selector wins. Specificity is compared as (ids, classes, elements): an id beats any number of classes, and a class (or :hover, or [attr]) beats any number of elements. "${fill(best.sel)}" scores (${best.s.join(', ')}), the highest here.`,
      }
    },
  },
  {
    id: 'css-rem-em',
    type: 'multiple-choice',
    generate(r) {
      const root = r.pick([16, 16, 18, 20])
      const parent = r.pick([12, 14, 20, 24, 32].filter((p) => p !== root))
      const factor = r.pick([0.5, 1.5, 2, 2.5, 3])
      const unit = r.pick(['em', 'rem'])
      const correct = factor * (unit === 'em' ? parent : root)
      const other = factor * (unit === 'em' ? root : parent)
      return {
        prompt: `The root font-size is ${root}px and the parent's font-size is ${parent}px. What is the child's font-size in pixels?`,
        code: `.child {\n  font-size: ${factor}${unit};\n}`,
        correct: `${correct}px`,
        wrong: [`${other}px`, `${factor * 16 === correct ? correct + 4 : factor * 16}px`, `${factor}px`, `${parent}px`, `${correct / 2}px`, `${correct * 2}px`],
        explanation: `rem is relative to the root (html) font-size; em on font-size is relative to the parent. ${factor}${unit} = ${factor} × ${unit === 'em' ? parent : root}px = ${correct}px.`,
      }
    },
  },
  {
    id: 'css-flex-grow',
    type: 'multiple-choice',
    generate(r) {
      let grows, width
      do {
        grows = [r.int(1, 3), r.int(1, 3), r.int(1, 3)]
        width = r.pick([300, 360, 480, 600, 720, 900])
      } while (width % grows.reduce((a, b) => a + b) !== 0 || new Set(grows).size === 1)
      const sum = grows.reduce((a, b) => a + b)
      const target = r.int(0, 2)
      const correct = (width / sum) * grows[target]
      const names = ['first', 'second', 'third']
      return {
        prompt: `The container is ${width}px wide. How wide is the ${names[target]} item?`,
        code: `.row { display: flex; }\n.a { flex: ${grows[0]}; }\n.b { flex: ${grows[1]}; }\n.c { flex: ${grows[2]}; }`,
        correct: `${correct}px`,
        wrong: [`${width / 3}px`, `${grows[target] * 100}px`, `${(width / sum) * (grows[target] + 1)}px`, `${width / sum}px`, ...grows.map((g) => `${(width / sum) * g}px`), `${width / 2}px`, `${width - correct}px`],
        explanation: `flex: N is short for flex-grow: N with a starting size (flex-basis) of 0, so all the space is shared by the grow values. The grow values add up to ${sum}, so each unit is ${width}/${sum} = ${width / sum}px. The ${names[target]} item has ${grows[target]}, so it gets ${correct}px.`,
      }
    },
  },
  {
    id: 'css-grid-columns',
    type: 'multiple-choice',
    generate(r) {
      let cols, gap, width
      do {
        cols = r.int(2, 5)
        gap = r.pick([8, 10, 12, 16, 20, 24])
        width = r.pick([600, 640, 720, 800, 960, 1000])
      } while ((width - (cols - 1) * gap) % cols !== 0)
      const correct = (width - (cols - 1) * gap) / cols
      return {
        prompt: `The grid container is ${width}px wide. How wide is each column?`,
        code: `.grid {\n  display: grid;\n  grid-template-columns: repeat(${cols}, 1fr);\n  gap: ${gap}px;\n}`,
        correct: `${correct}px`,
        wrong: [`${Math.round(width / cols)}px`, `${Math.round((width - cols * gap) / cols)}px`, `${correct - gap}px`, `${correct + gap}px`],
        explanation: `${cols} columns have ${cols - 1} gaps between them. (${width} - ${cols - 1}×${gap}) / ${cols} = ${correct}px. The fr unit shares out the space left after gaps.`,
      }
    },
  },
  {
    id: 'html-inline-block',
    type: 'multiple-choice',
    generate(r) {
      const inline = ['<span>', '<a>', '<strong>', '<em>', '<code>', '<label>', '<img>']
      const block = ['<div>', '<p>', '<section>', '<h1>', '<ul>', '<article>', '<header>', '<form>']
      const askInline = r.chance()
      return {
        prompt: `Which element is ${askInline ? 'inline' : 'block-level'} by default?`,
        correct: r.pick(askInline ? inline : block),
        wrong: r.sample(askInline ? block : inline, 3),
        explanation: 'Block elements (div, p, section, headings, lists) start on a new line and take the full width. Inline elements (span, a, strong, em, img) sit inside a line of text. CSS display can change either.',
      }
    },
  },

  // ---------- Fixed questions ----------
  {
    id: 'html-semantic',
    type: 'multiple-choice',
    prompt: ['Why use semantic HTML like <nav>, <main> and <article> instead of only <div>?', 'What is the main benefit of semantic HTML?'],
    options: [
      'It describes meaning, which helps screen readers, SEO and other developers',
      'It makes pages load faster',
      'It is required for CSS to work',
      'Browsers refuse to render too many divs',
    ],
    answer: 0,
    explanation: 'Semantic tags say what content is. Screen readers can jump to <nav> or <main>, search engines understand the page better, and code is easier to read.',
  },
  {
    id: 'html-alt',
    type: 'multiple-choice',
    prompt: 'What is the alt attribute on an <img> for?',
    options: [
      'Text that describes the image for screen readers and when it fails to load',
      'An alternative image URL',
      'The tooltip shown on hover',
      'The image file size',
    ],
    answer: 0,
    explanation: 'alt text is read aloud by screen readers and shown if the image fails. Purely decorative images should use alt="" so screen readers skip them.',
  },
  {
    id: 'css-position',
    type: 'multiple-choice',
    prompt: 'An element has position: absolute. What is it positioned relative to?',
    options: [
      'Its nearest ancestor that has a position other than static',
      'Always the browser window',
      'Its previous sibling',
      'Where it would normally be in the page',
    ],
    answer: 0,
    explanation: 'absolute looks up the tree for the nearest "positioned" ancestor (relative, absolute, fixed or sticky). If none exists it uses the page. That is why parents often get position: relative.',
  },
  {
    id: 'css-position-sticky',
    type: 'multiple-choice',
    prompt: 'What does position: sticky do?',
    options: [
      'Acts like relative until you scroll past a threshold, then sticks like fixed',
      'Fixes the element to the window forever',
      'Prevents the element from being selected',
      'Makes the element follow the mouse',
    ],
    answer: 0,
    explanation: 'A sticky element scrolls normally until it reaches its top (or other) offset, then it stays in place within its parent. Common for table headers and nav bars.',
  },
  {
    id: 'css-display-visibility',
    type: 'multiple-choice',
    prompt: 'What is the difference between display: none and visibility: hidden?',
    options: [
      'display: none removes the element from the layout; visibility: hidden hides it but keeps its space',
      'They are identical',
      'visibility: hidden removes it from the HTML',
      'display: none only works on images',
    ],
    answer: 0,
    explanation: 'With display: none the element takes no space, as if it were not there. visibility: hidden makes it invisible but leaves an empty gap.',
  },
  {
    id: 'css-zindex',
    type: 'multiple-choice',
    prompt: 'You set z-index: 999 on an element but it still appears behind another. What is a likely reason?',
    options: [
      'It is not positioned, or it is inside a stacking context that is lower',
      'z-index only accepts values up to 100',
      'z-index only works on images',
      'You must also set opacity: 1',
    ],
    answer: 0,
    explanation: 'z-index needs a positioned element (or a flex/grid item). Also, a parent with things like transform or opacity creates a "stacking context", and children cannot escape above it.',
  },
  {
    id: 'css-mobile-first',
    type: 'multiple-choice',
    prompt: ['What does "mobile-first" CSS mean?', 'In mobile-first CSS, which kind of media query do you mostly write?'],
    options: [
      'Write base styles for small screens, then add min-width media queries for bigger screens',
      'Write desktop styles, then hide things on mobile',
      'Build a separate website for phones',
      'Only test on phones',
    ],
    answer: 0,
    explanation: 'Mobile-first starts with the simplest layout and enhances it with @media (min-width: ...) as the screen grows. It usually leads to less CSS.',
  },
  {
    id: 'html-viewport',
    type: 'multiple-choice',
    prompt: 'What does <meta name="viewport" content="width=device-width, initial-scale=1"> do?',
    options: [
      'Tells mobile browsers to use the device width instead of a zoomed-out desktop width',
      'Makes the page full screen',
      'Blocks zooming on all devices',
      'Sets the default font size',
    ],
    answer: 0,
    explanation: 'Without it, phones pretend to be about 980px wide and shrink the page. With it, your responsive CSS works as expected.',
  },
  {
    id: 'css-flex-axes',
    type: 'multiple-choice',
    prompt: 'In a flex container with flex-direction: row, what does justify-content control?',
    options: [
      'Alignment along the main (horizontal) axis',
      'Alignment along the vertical axis',
      'The order of items',
      'The size of the text',
    ],
    answer: 0,
    explanation: 'justify-content works on the main axis (row = horizontal). align-items works on the cross axis (vertical for a row). Switch to column and they swap.',
  },
  {
    id: 'css-flex-vs-grid',
    type: 'multiple-choice',
    prompt: 'When is CSS Grid usually a better choice than Flexbox?',
    options: [
      'For two-dimensional layouts with rows and columns',
      'For centering a single item',
      'For lining up buttons in one row',
      'Never, Grid is deprecated',
    ],
    answer: 0,
    explanation: 'Flexbox is great in one direction (a row or a column). Grid controls rows and columns at the same time, which suits page layouts and card grids.',
  },
  {
    id: 'html-script-defer',
    type: 'multiple-choice',
    prompt: 'What is the difference between <script defer> and <script async>?',
    options: [
      'defer runs after the HTML is parsed, in order; async runs as soon as it downloads, in any order',
      'They are the same',
      'async runs before the HTML is parsed',
      'defer stops the script from running',
    ],
    answer: 0,
    explanation: 'Both download without blocking the page. defer waits until parsing is done and keeps script order. async runs whenever it is ready, so it suits independent scripts like analytics.',
  },
  {
    id: 'css-pseudo',
    type: 'multiple-choice',
    prompt: 'What is the difference between :hover and ::before?',
    options: [
      ':hover is a pseudo-class (a state); ::before is a pseudo-element (a generated part)',
      'They are the same thing with different syntax',
      '::before only works on links',
      ':hover creates new content',
    ],
    answer: 0,
    explanation: 'Pseudo-classes (one colon) select an element in a state, like :hover or :focus. Pseudo-elements (two colons) style a part of it or add content, like ::before and ::after.',
  },
  {
    id: 'css-important',
    type: 'multiple-choice',
    prompt: 'Why is using !important often considered bad practice?',
    options: [
      'It overrides normal specificity, making styles hard to override and debug later',
      'Browsers ignore it',
      'It makes CSS slower to load',
      'It only works in old browsers',
    ],
    answer: 0,
    explanation: '!important jumps over the normal cascade. The only way to beat it is another !important, which leads to messy "important wars". Fix specificity instead.',
  },
  {
    id: 'html-label',
    type: 'multiple-choice',
    prompt: 'Why should form inputs have a <label> connected to them?',
    options: [
      'Screen readers announce it, and clicking the label focuses the input',
      'Inputs do not work without one',
      'It validates the input automatically',
      'It is only needed for checkboxes',
    ],
    answer: 0,
    explanation: 'Linking a label (with for="id" or by wrapping the input) makes forms accessible and gives a bigger click target on phones.',
  },
  {
    id: 'html-button-div',
    type: 'multiple-choice',
    prompt: 'Why use <button> instead of a <div> with a click handler?',
    options: [
      'Buttons work with the keyboard and screen readers out of the box',
      'Divs cannot have click handlers',
      'Buttons load faster',
      'There is no difference',
    ],
    answer: 0,
    explanation: 'A <button> can be focused with Tab, pressed with Enter or Space, and is announced as a button. A div needs extra code (tabindex, role, key handlers) to match.',
  },
  {
    id: 'html-data-attr',
    type: 'multiple-choice',
    prompt: 'What are data-* attributes (like data-user-id) used for?',
    options: [
      'Storing custom information on an element that JavaScript or CSS can read',
      'Sending data to the server automatically',
      'Connecting to a database',
      'Styling only',
    ],
    answer: 0,
    explanation: 'data-* attributes hold extra info on an element. JavaScript reads them with element.dataset.userId, and CSS can select them with [data-user-id].',
  },
  {
    id: 'html-doctype',
    type: 'multiple-choice',
    prompt: 'What does <!DOCTYPE html> at the top of a page do?',
    options: [
      'Tells the browser to use standards mode instead of quirks mode',
      'Imports the HTML library',
      'Makes the page HTTPS',
      'Defines the page title',
    ],
    answer: 0,
    explanation: 'Without a doctype, browsers fall back to "quirks mode" and copy old buggy behavior. <!DOCTYPE html> turns on modern standards mode.',
  },
]
