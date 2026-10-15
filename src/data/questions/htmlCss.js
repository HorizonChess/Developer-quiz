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

const COLORS = ['red', 'blue', 'green', 'orange', 'purple', 'teal', 'navy', 'gold']

// :nth-child(an+b) matches the positions a*n+b for n = 0, 1, 2, ...
const NTH = [
  { expr: '2n', a: 2, b: 0 },
  { expr: 'even', a: 2, b: 0 },
  { expr: 'odd', a: 2, b: 1 },
  { expr: '3n', a: 3, b: 0 },
  { expr: '3n+1', a: 3, b: 1 },
  { expr: 'n+3', a: 1, b: 3 },
  { expr: '-n+3', a: -1, b: 3 },
  { expr: '2n+3', a: 2, b: 3 },
]
function nthMatches(a, b, count) {
  const out = []
  for (let p = 1; p <= count; p++) {
    if (a === 0 ? p === b : a > 0 ? p >= b && (p - b) % a === 0 : p <= b && (b - p) % -a === 0) out.push(p)
  }
  return out
}

const INHERITED = ['color', 'font-family', 'font-size', 'line-height', 'text-align', 'cursor', 'visibility', 'letter-spacing']
const NOT_INHERITED = ['margin', 'padding', 'border', 'width', 'background-color', 'display', 'position', 'height']

const INPUT_TYPES = ['email', 'tel', 'number', 'date', 'url', 'range', 'hidden', 'radio', 'checkbox', 'password', 'search', 'text']
const INPUT_CASES = [
  { need: 'an email address', type: 'email', tempting: ['text', 'url'] },
  { need: 'a phone number', type: 'tel', tempting: ['number'] },
  { need: 'a birthday', type: 'date', tempting: ['number', 'text'] },
  { need: 'a website address', type: 'url', tempting: ['email', 'search'] },
  { need: 'choosing a volume level on a slider', type: 'range', tempting: ['number'] },
  { need: 'an id that is sent with the form but never shown', type: 'hidden', tempting: ['password'] },
  { need: 'choosing exactly one option from a small group', type: 'radio', tempting: ['checkbox'] },
  { need: 'switching several options on or off independently', type: 'checkbox', tempting: ['radio'] },
  { need: 'a secret value whose characters should be masked', type: 'password', tempting: ['hidden'] },
]

const SEMANTIC_TAGS = ['<nav>', '<article>', '<aside>', '<section>', '<footer>', '<header>', '<main>', '<figure>']
const SEMANTIC_CASES = [
  { what: 'the site\'s main menu of links', tag: '<nav>', avoid: ['<header>'] },
  { what: 'a blog post that would make sense shared on its own', tag: '<article>', avoid: ['<section>', '<main>'] },
  { what: 'a sidebar with ads and loosely related tips', tag: '<aside>', avoid: ['<nav>', '<section>'] },
  { what: 'the one primary content area of the page', tag: '<main>', avoid: ['<article>', '<section>'] },
  { what: 'a chart image together with its caption', tag: '<figure>', avoid: [] },
  { what: 'the copyright and contact links at the bottom of the page', tag: '<footer>', avoid: ['<nav>', '<aside>'] },
  { what: 'the logo and site title at the top of the page', tag: '<header>', avoid: ['<nav>', '<main>'] },
]

const SIDES = ['top', 'right', 'bottom', 'left']

export default [
  // ---------- Templates ----------
  {
    id: 'css-box-model',
    type: 'code-output',
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
    type: 'code-output',
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
        prompt: r.pick(['Which selector has the highest specificity?', 'All four selectors match the same element. Which one wins?']),
        correct: fill(best.sel),
        wrong: rest.map((x) => fill(x.sel)),
        explanation: `When rules clash, the more specific selector wins. Specificity is compared as (ids, classes, elements): an id beats any number of classes, and a class (or :hover, or [attr]) beats any number of elements. "${fill(best.sel)}" scores (${best.s.join(', ')}), the highest here.`,
      }
    },
  },
  {
    id: 'css-rem-em',
    type: 'code-output',
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
    type: 'code-output',
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
    type: 'code-output',
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
  {
    id: 'css-margin-collapse',
    type: 'code-output',
    generate(r) {
      const [a, b] = r.sample([10, 15, 20, 24, 30, 40, 50], 2)
      const [first, second] = r.sample(CLASS_NAMES, 2)
      const gap = Math.max(a, b)
      return {
        prompt: r.pick([
          'These two block elements sit one above the other. How big is the vertical gap between them?',
          'How much space ends up between the two stacked blocks?',
        ]),
        code: `.${first} { margin-bottom: ${a}px; }\n.${second} { margin-top: ${b}px; }\n\n<div class="${first}">One</div>\n<div class="${second}">Two</div>`,
        correct: `${gap}px`,
        wrong: [`${a + b}px`, `${Math.min(a, b)}px`, `${Math.abs(a - b)}px`, `${(a + b) / 2}px`, '0px'],
        explanation: `Vertical margins between block siblings "collapse": instead of adding up, only the bigger one is used. max(${a}, ${b}) = ${gap}px. Padding, borders and flex or grid containers stop this from happening.`,
      }
    },
  },
  {
    id: 'css-nth-child',
    type: 'code-output',
    generate(r) {
      const count = r.int(5, 8)
      const target = r.pick(NTH)
      const fmt = (list) => list.join(', ')
      const correct = fmt(nthMatches(target.a, target.b, count))
      const others = NTH.map((x) => nthMatches(x.a, x.b, count))
      const shifted = nthMatches(target.a, target.b + 1, count)
      const wrong = [...others.map(fmt), fmt(shifted), fmt(nthMatches(target.a, target.b - 1, count))].filter((w) => w && w !== correct)
      return {
        prompt: `The list has ${count} items. Which item numbers turn bold?`,
        code: `li:nth-child(${target.expr}) {\n  font-weight: bold;\n}`,
        correct,
        wrong: r.shuffle([...new Set(wrong)]),
        explanation: `:nth-child(an+b) matches positions a×n+b for n = 0, 1, 2, ..., counting from 1. "${target.expr}" gives ${correct} in a list of ${count}.${target.a < 0 ? ' A negative n like -n+3 means "the first 3".' : ''}`,
      }
    },
  },
  {
    id: 'css-percent-width',
    type: 'code-output',
    generate(r) {
      const width = r.pick([400, 600, 800])
      const padding = r.pick([20, 40])
      const pct = r.pick([25, 50, 75])
      const borderBox = r.chance(0.4)
      const content = borderBox ? width - 2 * padding : width
      const correct = (content * pct) / 100
      const otherBase = borderBox ? width : width + 2 * padding
      return {
        prompt: 'How wide is the child element?',
        code: `.parent {\n  ${borderBox ? 'box-sizing: border-box;\n  ' : ''}width: ${width}px;\n  padding: ${padding}px;\n}\n.child {\n  width: ${pct}%;\n}`,
        correct: `${correct}px`,
        wrong: [`${(otherBase * pct) / 100}px`, `${pct}px`, `${correct - padding}px`, `${correct + padding}px`, `${width - pct}px`],
        explanation: `A percentage width is a share of the parent's content area (inside its padding). ${borderBox ? `With border-box the parent's ${width}px includes padding, so the content is ${width} - 2×${padding} = ${content}px.` : `The parent uses content-box, so its content is the full ${width}px.`} ${pct}% of ${content} = ${correct}px.`,
      }
    },
  },
  {
    id: 'css-viewport-units',
    type: 'code-output',
    generate(r) {
      const vw = r.pick([1000, 1200, 1280, 1440, 1600])
      const vh = r.pick([600, 700, 800, 900, 1000])
      const parent = r.pick([400, 500, 600])
      const n = r.pick([10, 20, 25, 50, 75])
      const useWidth = r.chance()
      const unit = useWidth ? 'vw' : 'vh'
      const prop = useWidth ? 'width' : 'height'
      const correct = (n * (useWidth ? vw : vh)) / 100
      return {
        prompt: `The browser window is ${vw}px wide and ${vh}px tall. The parent is ${parent}px wide and ${parent}px tall. What is the child's ${prop}?`,
        code: `.child {\n  ${prop}: ${n}${unit};\n}`,
        correct: `${correct}px`,
        wrong: [`${(n * parent) / 100}px`, `${(n * (useWidth ? vh : vw)) / 100}px`, `${n}px`, `${n * 16}px`, `${correct * 2}px`],
        explanation: `1${unit} is 1% of the viewport ${useWidth ? 'width' : 'height'} (the browser window), not of the parent. ${n}${unit} = ${n}% of ${useWidth ? vw : vh}px = ${correct}px.`,
      }
    },
  },
  {
    id: 'css-flex-fixed-plus-flexible',
    type: 'code-output',
    generate(r) {
      const fixed = r.pick([100, 150, 200, 240, 300])
      const width = r.pick([800, 900, 960, 1000, 1200])
      const two = r.chance()
      const correct = (width - fixed) / (two ? 2 : 1)
      const side = r.pick(['sidebar', 'menu', 'nav'])
      return {
        prompt: `The flex row is ${width}px wide. How wide is ${two ? 'each .main element' : '.main'}?`,
        code: `.row { display: flex; }\n.${side} { width: ${fixed}px; }\n.main { flex: 1; }\n\n<div class="row">\n  <div class="${side}"></div>\n  <div class="main"></div>${two ? '\n  <div class="main"></div>' : ''}\n</div>`,
        correct: `${correct}px`,
        wrong: [`${Math.round(width / (two ? 3 : 2))}px`, `${width / (two ? 2 : 1)}px`, `${width - fixed / 2}px`, `${width - 2 * fixed}px`, `${width - fixed + 20}px`],
        explanation: `The fixed ${side} keeps its ${fixed}px. flex: 1 lets the rest grow into the leftover space: ${width} - ${fixed} = ${width - fixed}px${two ? `, split equally between two items = ${correct}px each` : ''}.`,
      }
    },
  },
  {
    id: 'css-cascade-color',
    type: 'code-output',
    generate(r) {
      const [c1, c2, c3] = r.sample(COLORS, 3)
      const C = r.pick(CLASS_NAMES)
      const I = r.pick(ID_NAMES)
      const cases = [
        {
          code: `p { color: ${c1}; }\n.${C} { color: ${c2}; }\n.${C} { color: ${c3}; }\n\n<p class="${C}">Hello</p>`,
          correct: c3,
          why: `Both .${C} rules have the same specificity, so the one written later wins. Both beat the plain p selector.`,
        },
        {
          code: `#${I} { color: ${c1}; }\n.${C} { color: ${c2}; }\np { color: ${c3}; }\n\n<p id="${I}" class="${C}">Hello</p>`,
          correct: c1,
          why: 'An id selector is more specific than a class or element selector, so it wins even though it comes first.',
        },
        {
          code: `#${I} { color: ${c2}; }\n.${C} { color: ${c3}; }\n\n<p id="${I}" class="${C}" style="color: ${c1}">Hello</p>`,
          correct: c1,
          why: 'An inline style attribute beats any selector in a stylesheet, including an id (only !important beats it).',
        },
        {
          code: `p { color: ${c1} !important; }\n#${I} { color: ${c2}; }\n.${C} { color: ${c3}; }\n\n<p id="${I}" class="${C}">Hello</p>`,
          correct: c1,
          why: '!important lifts a declaration above all normal ones, so even a low-specificity p rule beats the id.',
        },
        {
          code: `body { color: ${c1}; }\n.${C} { color: ${c2}; }\nspan { color: ${c3}; }\n\n<div class="${C}">\n  <p>Hello</p>\n</div>`,
          correct: c2,
          why: `No rule targets the p, so it inherits color from its nearest ancestor with one, the .${C} div. The span rule does not match anything here.`,
        },
      ]
      const c = r.pick(cases)
      return {
        prompt: r.pick(['What color is the text "Hello"?', 'Which color does "Hello" end up with?']),
        code: c.code,
        correct: c.correct,
        wrong: [c1, c2, c3, 'black'].filter((x) => x !== c.correct),
        explanation: c.why,
      }
    },
  },
  {
    id: 'css-em-on-padding',
    type: 'code-output',
    generate(r) {
      if (r.chance()) {
        const size = r.pick([12, 14, 18, 20, 24])
        const n = r.pick([0.5, 1.5, 2, 2.5])
        return {
          prompt: 'The root font-size is 16px. How much padding does the button get on each side?',
          code: `.button {\n  font-size: ${size}px;\n  padding: ${n}em;\n}`,
          correct: `${size * n}px`,
          wrong: [`${16 * n}px`, `${n}px`, `${size}px`, `${size + n * 16}px`],
          explanation: `em on properties other than font-size is relative to the element's own font-size. ${n}em × ${size}px = ${size * n}px. rem would use the root (16px) instead.`,
        }
      }
      const a = r.pick([1.25, 1.5, 2])
      const b = r.pick([1.5, 2])
      return {
        prompt: 'The root font-size is 16px. What is the font-size of the text inside .inner?',
        code: `.outer { font-size: ${a}em; }\n.inner { font-size: ${b}em; }\n\n<div class="outer">\n  <div class="inner">Text</div>\n</div>`,
        correct: `${16 * a * b}px`,
        wrong: [`${16 * b}px`, `${16 * a}px`, `${16 * (a + b)}px`, `${16 * a + b}px`, `${a * b}px`, `${32 * a * b}px`],
        explanation: `em font sizes compound: .outer is ${a} × 16 = ${16 * a}px, and .inner is ${b} × ${16 * a} = ${16 * a * b}px. That stacking is why many people prefer rem for font sizes.`,
      }
    },
  },
  {
    id: 'css-grid-fr-mixed',
    type: 'code-output',
    generate(r) {
      let fixed, k, width
      do {
        fixed = r.pick([100, 150, 200, 240])
        k = r.int(1, 3)
        width = r.pick([600, 800, 900, 1000, 1200])
      } while ((width - fixed) % (1 + k) !== 0)
      const unit = (width - fixed) / (1 + k)
      const askLast = r.chance()
      const correct = askLast ? unit * k : unit
      return {
        prompt: `The grid is ${width}px wide with no gap. How wide is the ${askLast ? 'third' : 'second'} column?`,
        code: `.layout {\n  display: grid;\n  grid-template-columns: ${fixed}px 1fr ${k === 1 ? '1fr' : `${k}fr`};\n}`,
        correct: `${correct}px`,
        wrong: [`${Math.round(width / (2 + k)) * (askLast ? k : 1)}px`, `${Math.round(width / (1 + k)) * (askLast ? k : 1)}px`, `${askLast ? unit : unit * k}px`, `${width - fixed}px`, `${Math.round((width - fixed) / 3)}px`],
        explanation: `fr shares the space left after fixed sizes. ${width} - ${fixed} = ${width - fixed}px is split into 1 + ${k} = ${1 + k} parts of ${unit}px. The ${askLast ? `third column has ${k}fr` : 'second column has 1fr'}, so it is ${correct}px.`,
      }
    },
  },
  {
    id: 'css-min-max-width',
    type: 'code-output',
    generate(r) {
      const parent = r.pick([400, 600, 800, 1000, 1200])
      const pct = r.pick([50, 80, 90, 100])
      const v = (parent * pct) / 100
      const useMax = r.chance()
      let limit
      do {
        limit = r.pick([300, 360, 480, 500, 640, 700, 720])
      } while (limit === v || limit === parent)
      const correct = useMax ? Math.min(v, limit) : Math.max(v, limit)
      return {
        prompt: `The parent is ${parent}px wide. How wide is the card?`,
        code: `.card {\n  width: ${pct}%;\n  ${useMax ? 'max' : 'min'}-width: ${limit}px;\n}`,
        correct: `${correct}px`,
        wrong: [`${v}px`, `${limit}px`, `${parent}px`, `${pct}px`, `${v / 2}px`, `${(parent + limit) / 2}px`].filter((w) => w !== `${correct}px`),
        explanation: `${pct}% of ${parent}px is ${v}px. ${useMax ? `max-width caps the width, so the card is the smaller of ${v} and ${limit}` : `min-width sets a floor, so the card is the larger of ${v} and ${limit}`}: ${correct}px.`,
      }
    },
  },
  {
    id: 'css-shorthand-sides',
    type: 'code-output',
    generate(r) {
      const n = r.int(2, 4)
      const vals = r.sample([4, 8, 10, 12, 16, 20, 24, 30], n)
      const sides = n === 2 ? [vals[0], vals[1], vals[0], vals[1]] : n === 3 ? [vals[0], vals[1], vals[2], vals[1]] : vals
      const prop = r.pick(['padding', 'margin'])
      const i = r.int(0, 3)
      const correct = `${sides[i]}px`
      return {
        prompt: `What is the ${prop}-${SIDES[i]} of this element?`,
        code: `.box {\n  ${prop}: ${vals.map((v) => `${v}px`).join(' ')};\n}`,
        correct,
        wrong: r.shuffle([...vals.map((v) => `${v}px`), '0px', `${vals[0] + vals[1]}px`, `${vals[n - 1] * 2}px`]),
        explanation: `Shorthand values go clockwise from the top: top, right, bottom, left. With ${n} values, ${n === 2 ? 'the first is top and bottom, the second is left and right' : n === 3 ? 'the first is top, the second is left and right, the third is bottom' : 'each side gets its own value'}. So ${SIDES[i]} is ${correct}.`,
      }
    },
  },
  {
    id: 'css-inheritance',
    type: 'multiple-choice',
    generate(r) {
      const askInherited = r.chance()
      return {
        prompt: askInherited
          ? r.pick(['Which CSS property is inherited by child elements by default?', 'You set one of these on a <div>. Which one also applies to the text in its children?'])
          : 'Which CSS property is NOT inherited by child elements by default?',
        correct: r.pick(askInherited ? INHERITED : NOT_INHERITED),
        wrong: r.sample(askInherited ? NOT_INHERITED : INHERITED, 3),
        explanation: 'Text-related properties like color, font-*, line-height and text-align are inherited. Box and layout properties like margin, padding, border, width and background are not; each element starts fresh. Any property can be forced with the value inherit.',
      }
    },
  },
  {
    id: 'html-input-type',
    type: 'multiple-choice',
    generate(r) {
      const c = r.pick(INPUT_CASES)
      const pool = r.shuffle(INPUT_TYPES.filter((t) => t !== c.type && !c.tempting.includes(t)))
      return {
        prompt: `Which input type is the best fit for ${c.need}?`,
        correct: `type="${c.type}"`,
        wrong: [...c.tempting, ...pool].map((t) => `type="${t}"`),
        explanation: `type="${c.type}" fits ${c.need}. The right type gives built-in validation or behavior and a suitable keyboard on phones (for example tel shows a dial pad; number is for amounts you calculate with, not phone numbers).`,
      }
    },
  },
  {
    id: 'html-semantic-tag',
    type: 'multiple-choice',
    generate(r) {
      const c = r.pick(SEMANTIC_CASES)
      return {
        prompt: r.pick([`Which element best wraps ${c.what}?`, `You are marking up ${c.what}. Which tag fits best?`]),
        correct: c.tag,
        wrong: r.shuffle(SEMANTIC_TAGS.filter((t) => t !== c.tag && !c.avoid.includes(t))),
        explanation: `${c.tag} is the semantic element for ${c.what}. <nav> is major navigation, <article> is self-contained content, <aside> is side content, <main> is the page's primary content (once per page), <figure> pairs media with a caption, and <header>/<footer> are introductory and closing content.`,
      }
    },
  },

  // ---------- Fixed questions ----------
  {
    id: 'html-semantic',
    type: 'multiple-choice',
    prompt: ['Why use semantic HTML like <nav>, <main> and <article> instead of only <div>?', 'What is the main benefit of semantic HTML?'],
    options: [
      'It tells screen readers, search engines and developers what content means',
      'It renders faster, because browsers can skip parsing generic div elements',
      'It adds default styles to each tag, so you need much less CSS',
      'It is required for the page to pass the official HTML validator',
    ],
    answer: 0,
    explanation: 'Semantic tags say what content is. Screen readers can jump to <nav> or <main>, search engines understand the page better, and code is easier to read. Speed and validation are not the reason.',
  },
  {
    id: 'html-alt',
    type: 'multiple-choice',
    prompt: ['What is the alt attribute on an <img> for?', 'Who mainly uses the text in an image\'s alt attribute?'],
    options: [
      'Describing the image for screen readers and when it fails to load',
      'Giving a backup image URL that loads when the main one fails',
      'Setting the tooltip text that appears when hovering over the image',
      'Telling search engines the image file name and its dimensions',
    ],
    answer: 0,
    explanation: 'alt text is read aloud by screen readers and shown if the image fails. Purely decorative images should use alt="" so screen readers skip them. The hover tooltip comes from the title attribute.',
  },
  {
    id: 'css-position',
    type: 'multiple-choice',
    prompt: 'An element has position: absolute. What is it positioned relative to?',
    options: [
      'Its nearest ancestor with a position other than static',
      'Its direct parent element, whatever that parent\'s position is',
      'The browser viewport, even while the page is scrolled',
      'The spot where it would normally sit in the page flow',
    ],
    answer: 0,
    explanation: 'absolute looks up the tree for the nearest "positioned" ancestor (relative, absolute, fixed or sticky). If none exists it uses the page. That is why parents often get position: relative. The viewport is what fixed uses.',
  },
  {
    id: 'css-position-sticky',
    type: 'multiple-choice',
    prompt: 'What does position: sticky do?',
    options: [
      'Scrolls normally until an offset is reached, then stays in place',
      'Stays fixed to the viewport from the moment the page loads',
      'Keeps its normal spot but can be nudged with top or left',
      'Leaves the page flow and pins itself to the top of its parent',
    ],
    answer: 0,
    explanation: 'A sticky element scrolls normally until it reaches its top (or other) offset, then it stays in place within its parent. Common for table headers and nav bars. Being nudged with top/left is what relative does.',
  },
  {
    id: 'css-display-visibility',
    type: 'multiple-choice',
    prompt: 'What is the difference between display: none and visibility: hidden?',
    options: [
      'display: none removes its space; visibility: hidden keeps an empty gap',
      'visibility: hidden removes its space; display: none keeps an empty gap',
      'display: none deletes it from the DOM; visibility: hidden only hides it',
      'Both remove its space, but a visibility: hidden element stays clickable',
    ],
    answer: 0,
    explanation: 'With display: none the element takes no space, as if it were not there (it is still in the DOM). visibility: hidden makes it invisible and unclickable but leaves an empty gap.',
  },
  {
    id: 'css-zindex',
    type: 'multiple-choice',
    prompt: 'You set z-index: 999 on an element but it still appears behind another. What is a likely reason?',
    options: [
      'It is not positioned, or its parent forms a lower stacking context',
      'Browsers cap z-index at 100 and ignore any larger value you set',
      'z-index only works when the element also has display: block set',
      'z-index only takes effect when the element also has a fixed width',
    ],
    answer: 0,
    explanation: 'z-index needs a positioned element (or a flex/grid item). Also, a parent with things like transform or opacity creates a "stacking context", and children cannot escape above it. HTML order only matters when z-index is equal.',
  },
  {
    id: 'css-mobile-first',
    type: 'multiple-choice',
    prompt: ['What does "mobile-first" CSS mean?', 'In mobile-first CSS, how are the styles and media queries usually organised?'],
    options: [
      'Base styles target small screens; min-width queries add larger layouts',
      'Base styles target desktops; max-width queries then adjust for phones',
      'A separate mobile site is built first, then the desktop version follows',
      'Phones download the stylesheet first, before desktop browsers request it',
    ],
    answer: 0,
    explanation: 'Mobile-first starts with the simplest layout and enhances it with @media (min-width: ...) as the screen grows. Starting from desktop and using max-width is the opposite approach ("desktop-first").',
  },
  {
    id: 'html-viewport',
    type: 'multiple-choice',
    prompt: 'What does <meta name="viewport" content="width=device-width, initial-scale=1"> do?',
    options: [
      'Makes mobile browsers lay out at device width, not a desktop width',
      'Stops users from pinch-zooming so the layout always stays at full size',
      'Forces the page into full-screen mode and hides the browser address bar',
      'Scales every font to match the device\'s default text size setting',
    ],
    answer: 0,
    explanation: 'Without it, phones pretend to be about 980px wide and shrink the page. With it, your responsive CSS works as expected. Blocking zoom needs extra options and hurts accessibility.',
  },
  {
    id: 'css-flex-axes',
    type: 'multiple-choice',
    prompt: ['In a flex container with flex-direction: row, what does justify-content control?', 'With flex-direction: row, which alignment does justify-content handle?'],
    options: [
      'Alignment along the main axis, which is horizontal here',
      'Alignment along the cross axis, which is vertical here',
      'Spacing between the lines when the items wrap to new rows',
      'How much each item grows to fill the leftover space',
    ],
    answer: 0,
    explanation: 'justify-content works on the main axis (row = horizontal). align-items works on the cross axis (vertical for a row). Spacing between wrapped lines is align-content, and growing is flex-grow.',
  },
  {
    id: 'css-flex-vs-grid',
    type: 'multiple-choice',
    prompt: 'When is CSS Grid usually a better choice than Flexbox?',
    options: [
      'When you need to control rows and columns at the same time',
      'When you need to center one item horizontally and vertically',
      'When items in a single row should share the space unevenly',
      'When each item\'s content size should decide how wide it gets',
    ],
    answer: 0,
    explanation: 'Flexbox is great in one direction (a row or a column) and lets content size drive the layout. Grid controls rows and columns at the same time, which suits page layouts and card grids. Both can center things.',
  },
  {
    id: 'html-script-defer',
    type: 'multiple-choice',
    prompt: 'What is the difference between <script defer> and <script async>?',
    options: [
      'defer runs in order after parsing; async runs as soon as it downloads',
      'async runs in order after parsing; defer runs as soon as it downloads',
      'defer pauses HTML parsing until it runs; async downloads in the background',
      'Both run after parsing, but only async keeps the scripts in their order',
    ],
    answer: 0,
    explanation: 'Both download without blocking the page. defer waits until parsing is done and keeps script order. async runs whenever it is ready, in any order, so it suits independent scripts like analytics.',
  },
  {
    id: 'css-pseudo',
    type: 'multiple-choice',
    prompt: 'What is the difference between :hover and ::before?',
    options: [
      ':hover selects an element in a state; ::before adds a generated part',
      ':hover adds a generated part; ::before selects an element in a state',
      'Both are pseudo-classes; the double colon is only the newer syntax',
      '::before inserts a real child element into the DOM that JS can query',
    ],
    answer: 0,
    explanation: 'Pseudo-classes (one colon) select an element in a state, like :hover or :focus. Pseudo-elements (two colons) style a part of it or add content, like ::before and ::after. That content is not a real DOM node.',
  },
  {
    id: 'css-important',
    type: 'multiple-choice',
    prompt: 'Why is using !important often considered bad practice?',
    options: [
      'It skips normal specificity, so later overrides need !important too',
      'It slows down rendering because the browser re-checks every rule',
      'Modern browsers ignore it unless it is written in an inline style',
      'It only applies to the first element on the page that matches',
    ],
    answer: 0,
    explanation: '!important jumps over the normal cascade. The only way to beat it is another !important, which leads to messy "important wars". Fix specificity instead.',
  },
  {
    id: 'html-label',
    type: 'multiple-choice',
    prompt: 'Why should form inputs have a <label> connected to them?',
    options: [
      'Screen readers announce it, and clicking it focuses the input',
      'Without a label, the input\'s value is not sent with the form',
      'The label turns on the browser\'s built-in validation for the field',
      'The label text is used as the value when the input is left empty',
    ],
    answer: 0,
    explanation: 'Linking a label (with for="id" or by wrapping the input) makes forms accessible and gives a bigger click target on phones. Sending the value depends on the name attribute, not the label.',
  },
  {
    id: 'html-button-div',
    type: 'multiple-choice',
    prompt: ['Why use <button> instead of a <div> with a click handler?', 'What does a real <button> give you that a clickable <div> does not?'],
    options: [
      'Keyboard focus, Enter and Space support, and a role for screen readers',
      'Click events, since a div only fires them when it has a tabindex',
      'Safer forms, because a button never submits a form unless told to',
      'Faster rendering, because buttons skip the browser\'s layout step',
    ],
    answer: 0,
    explanation: 'A <button> can be focused with Tab, pressed with Enter or Space, and is announced as a button. A div needs extra code (tabindex, role, key handlers) to match. Note a button inside a form submits it by default.',
  },
  {
    id: 'html-data-attr',
    type: 'multiple-choice',
    prompt: 'What are data-* attributes (like data-user-id) used for?',
    options: [
      'Storing custom values on an element for JavaScript or CSS to read',
      'Sending extra fields to the server automatically when a form submits',
      'Passing values down from a parent element to all of its children',
      'Giving search engines structured data about the page\'s content',
    ],
    answer: 0,
    explanation: 'data-* attributes hold extra info on an element. JavaScript reads them with element.dataset.userId, and CSS can select them with [data-user-id]. They are not sent with forms; structured data for search uses schema markup.',
  },
  {
    id: 'html-doctype',
    type: 'multiple-choice',
    prompt: 'What does <!DOCTYPE html> at the top of a page do?',
    options: [
      'Switches the browser into standards mode instead of quirks mode',
      'Tells the browser to download the HTML5 specification it should use',
      'Tells the server to send the page with an HTML content type',
      'Enables the new HTML5 tags, which do not work without it',
    ],
    answer: 0,
    explanation: 'Without a doctype, browsers fall back to "quirks mode" and copy old buggy behavior. <!DOCTYPE html> turns on modern standards mode. The content type is set by the server\'s headers, not the doctype.',
  },
  {
    id: 'css-reflow-repaint',
    type: 'multiple-choice',
    prompt: ['What is the difference between reflow and repaint?', 'In browser rendering, how does a reflow differ from a repaint?'],
    options: [
      'Reflow recalculates sizes and positions; repaint only redraws pixels',
      'Repaint recalculates sizes and positions; reflow only redraws pixels',
      'Reflow happens only on page load; repaint happens on every later change',
      'Reflow is caused by CSS changes; repaint is caused by JavaScript changes',
    ],
    answer: 0,
    explanation: 'Reflow (layout) works out where and how big things are, for example after changing width or adding elements. Repaint just redraws, for example after a color change. Reflow is more expensive and usually triggers a repaint too.',
  },
  {
    id: 'css-transform-performance',
    type: 'multiple-choice',
    prompt: ['Why is animating transform smoother than animating left or top?', 'For a smooth slide-in animation, why is transform: translateX() preferred over left?'],
    options: [
      'Transform can skip layout and be handled by the GPU compositor',
      'Transform changes are batched and applied once the animation ends',
      'Left and top are deprecated for animations in modern browsers',
      'Transform rounds to whole pixels, so the layout changes less often',
    ],
    answer: 0,
    explanation: 'Changing left or top forces layout on every frame. transform (and opacity) can usually be done by the compositor, a step after layout that the GPU speeds up, so frames stay smooth.',
  },
  {
    id: 'css-transition-vs-animation',
    type: 'multiple-choice',
    prompt: 'What is the difference between a CSS transition and a CSS animation?',
    options: [
      'Transitions animate a change between two states; animations use keyframes',
      'Animations need a trigger like hover; transitions start on page load',
      'Transitions can loop forever; animations play only once by default',
      'Transitions only work on colors; animations work on every property',
    ],
    answer: 0,
    explanation: 'A transition smooths a change from one value to another when something changes, like on :hover. An @keyframes animation can have many steps, start on its own and repeat.',
  },
  {
    id: 'css-custom-properties',
    type: 'multiple-choice',
    prompt: ['What is true about CSS custom properties like --main-color?', 'How do CSS variables (--name) differ from Sass variables ($name)?'],
    options: [
      'They cascade and inherit, and JavaScript can change them at runtime',
      'They are swapped for fixed values when the stylesheet is first built',
      'They only work inside :root and cannot be set on other selectors',
      'They are global, so setting one on any element changes it everywhere',
    ],
    answer: 0,
    explanation: 'CSS variables live in the browser: they follow the cascade, children inherit them, and you can override them on any selector or change them with JS (style.setProperty). Sass variables are replaced at build time.',
  },
  {
    id: 'css-bem',
    type: 'multiple-choice',
    prompt: 'In BEM naming, what does the class .card__title--large mean?',
    options: [
      'Element "title" inside block "card", with a "large" modifier',
      'Block "title" inside element "card", with a "large" modifier',
      'Element "title" inside block "card", in a "large" media query',
      'Modifier "title" on block "card", inside a "large" element',
    ],
    answer: 0,
    explanation: 'BEM means Block, Element, Modifier. The block is the component (card), __ joins an element inside it (title), and -- adds a variation (large). It keeps class names flat and predictable.',
  },
  {
    id: 'css-float-clear',
    type: 'multiple-choice',
    prompt: 'What does clear: both do on an element?',
    options: [
      'Moves it below any earlier floated elements on either side',
      'Removes the float from every element that comes after it',
      'Floats the element to both sides so it fills the full width',
      'Resets the element\'s margin and padding back to zero',
    ],
    answer: 0,
    explanation: 'Floated elements let content wrap around them. clear: both says "do not sit next to a float on the left or right", so the element drops below them. It is the idea behind the classic clearfix.',
  },
  {
    id: 'css-center',
    type: 'multiple-choice',
    prompt: ['Which CSS on the parent centers a child both horizontally and vertically?', 'How do you center a div horizontally and vertically inside its parent?'],
    options: [
      'display: flex; justify-content: center; align-items: center;',
      'display: block; text-align: center; vertical-align: middle;',
      'display: inline; justify-content: center; align-items: center;',
      'display: flex; justify-content: center; align-items: stretch;',
    ],
    answer: 0,
    explanation: 'In a flex container justify-content centers along the main axis and align-items along the cross axis. justify-content does nothing on a non-flex element, and vertical-align only affects inline and table cells.',
  },
  {
    id: 'css-stacking-context',
    type: 'multiple-choice',
    prompt: 'Which of these declarations, on its own, creates a new stacking context?',
    options: ['opacity: 0.9', 'position: relative', 'overflow: hidden', 'display: block'],
    answer: 0,
    explanation: 'A stacking context is a group whose children are layered together and cannot be put above things outside it. opacity below 1, transform, and position plus a z-index create one. position: relative alone does not.',
  },
  {
    id: 'html-aria-first-rule',
    type: 'multiple-choice',
    prompt: ['What is the "first rule of ARIA"?', 'When should you reach for ARIA attributes like role="button"?'],
    options: [
      'Use a native HTML element instead of ARIA whenever one exists',
      'Add a role attribute to every element so screen readers can follow',
      'Put aria-label on all images in place of using the alt attribute',
      'Use ARIA mostly on elements that are hidden from sighted users',
    ],
    answer: 0,
    explanation: 'ARIA (Accessible Rich Internet Applications) only changes what assistive tech is told; it adds no behavior. A real <button> or <nav> already has the right role and keyboard support, so prefer native elements.',
  },
  {
    id: 'html-icon-button',
    type: 'multiple-choice',
    prompt: 'A button shows only a magnifying-glass icon. How do you make it accessible?',
    options: [
      'Give the button an aria-label such as "Search"',
      'Add a title attribute to the icon image only',
      'Set role="button" on the icon inside the button',
      'Add tabindex="0" so screen readers can find it',
    ],
    answer: 0,
    explanation: 'Without text, a screen reader just says "button". aria-label gives it an accessible name. The button already has a role and is already focusable, and title is not reliably announced.',
  },
  {
    id: 'html-contrast',
    type: 'multiple-choice',
    prompt: 'What minimum contrast ratio does WCAG AA require for normal-size body text?',
    options: ['4.5:1', '3:1', '7:1', '2.5:1'],
    answer: 0,
    explanation: 'WCAG (Web Content Accessibility Guidelines) level AA asks for 4.5:1 between text and background. Large text only needs 3:1, and the stricter AAA level asks for 7:1.',
  },
  {
    id: 'html-tabindex',
    type: 'multiple-choice',
    prompt: 'What does tabindex="-1" do on an element?',
    options: [
      'Takes it out of the Tab order but lets JavaScript focus it',
      'Puts the element first in the Tab order, before all others',
      'Makes the element unfocusable, even when focus() is called',
      'Adds it to the Tab order at its normal position in the HTML',
    ],
    answer: 0,
    explanation: 'tabindex="0" adds an element to the normal Tab order, and "-1" means "focusable by script only", useful for modals and skip-link targets. Positive values reorder Tab and are best avoided.',
  },
  {
    id: 'css-focus-outline',
    type: 'multiple-choice',
    prompt: 'Why is it a problem to add outline: none to focused buttons and links?',
    options: [
      'Keyboard users can no longer see which element has focus',
      'It also disables the element so it can no longer be clicked',
      'It removes the element from the Tab order for keyboard users',
      'Screen readers stop announcing the element once it is focused',
    ],
    answer: 0,
    explanation: 'The focus outline is how keyboard users know where they are. If you remove it, replace it with another clear style, for example with :focus-visible.',
  },
  {
    id: 'html-fieldset',
    type: 'multiple-choice',
    prompt: 'What are <fieldset> and <legend> used for in a form?',
    options: [
      'Grouping related inputs under a caption, like a set of radio buttons',
      'Validating a group of inputs together before the form is submitted',
      'Sending a group of inputs to the server as one nested object',
      'Hiding a group of optional inputs until the user chooses to expand them',
    ],
    answer: 0,
    explanation: '<fieldset> groups related controls and <legend> gives the group a caption, which screen readers announce with each option (for example "Shipping method").',
  },
  {
    id: 'html-required',
    type: 'multiple-choice',
    prompt: 'An input has the required attribute. Which statement is true?',
    options: [
      'The browser blocks an empty submit, but the server must still validate',
      'The browser blocks an empty submit, so server checks are no longer needed',
      'The field gets a red border, but the form still submits normally',
      'The server rejects the request automatically if the field is empty',
    ],
    answer: 0,
    explanation: 'required gives built-in browser validation, which is nice for users. Anyone can bypass the browser (devtools, curl), so the server must always check the data again.',
  },
  {
    id: 'html-srcset',
    type: 'multiple-choice',
    prompt: ['What does the srcset attribute on an <img> let the browser do?', 'Why add srcset to an image?'],
    options: [
      'Pick the best image file for the screen size and pixel density',
      'Download every listed file and show whichever one finishes first',
      'Swap to the next image in the list when the user hovers over it',
      'Ask the server to crop one image into several sizes automatically',
    ],
    answer: 0,
    explanation: 'srcset lists several versions of an image (by width or density), and sizes says how wide it will display. The browser downloads only the one that fits, saving data on phones.',
  },
  {
    id: 'html-picture',
    type: 'multiple-choice',
    prompt: 'When would you use <picture> with <source> elements instead of a plain <img>?',
    options: [
      'To serve different crops or formats, like WebP with a JPEG fallback',
      'To show several images side by side, like a gallery or a slideshow',
      'To make the image load before the rest of the page content',
      'To add a visible caption under the image that screen readers read',
    ],
    answer: 0,
    explanation: '<picture> lets you give different sources for different media queries ("art direction") or formats. The browser uses the first match and the inner <img> as a fallback. Captions belong in <figure>.',
  },
  {
    id: 'html-meta-description',
    type: 'multiple-choice',
    prompt: 'What is <meta name="description"> mainly used for?',
    options: [
      'A short summary search engines often show under the page title',
      'A list of keywords that search engines use to rank the page',
      'Text shown in the browser tab, next to the page\'s favicon',
      'A summary screen readers announce before reading the page',
    ],
    answer: 0,
    explanation: 'The meta description often appears as the snippet in search results, so it affects whether people click. It is not a ranking keyword list, and the tab text comes from <title>.',
  },
  {
    id: 'html-headings',
    type: 'multiple-choice',
    prompt: 'Which is good practice for headings (<h1> to <h6>)?',
    options: [
      'Use them in order to show structure, not to set a font size',
      'Use a new <h1> for every section so each part is equally important',
      'Pick whichever heading level gives the size you want visually',
      'Skip levels freely, since screen readers ignore heading numbers',
    ],
    answer: 0,
    explanation: 'Headings form an outline that screen-reader users navigate by. Go h1, then h2, then h3 without skipping, and use CSS to change how big they look.',
  },
  {
    id: 'css-media-max-width',
    type: 'multiple-choice',
    prompt: 'When do the styles inside @media (max-width: 600px) { ... } apply?',
    options: [
      'When the viewport is 600px wide or narrower',
      'When the viewport is wider than 600px',
      'When the element itself is 600px or narrower',
      'Only when the screen is exactly 600px wide',
    ],
    answer: 0,
    explanation: 'max-width: 600px means "up to 600px", so it matches narrow screens. min-width matches wider ones. Media queries look at the viewport; checking an element\'s own size is what container queries do.',
  },
  {
    id: 'css-inline-block',
    type: 'multiple-choice',
    prompt: 'How does display: inline-block differ from display: inline?',
    options: [
      'It stays in the line of text but accepts width and height',
      'It starts on a new line but is only as wide as its content',
      'It ignores width and height but lets vertical margins push lines',
      'It looks the same, but the browser removes spaces between elements',
    ],
    answer: 0,
    explanation: 'inline-block sits in a line like inline, but you can set width, height and vertical padding/margin like a block. Plain inline elements ignore width and height.',
  },
  {
    id: 'css-box-sizing-reset',
    type: 'multiple-choice',
    prompt: 'Why do many stylesheets start with * { box-sizing: border-box; }?',
    options: [
      'So width includes padding and border, which makes sizes predictable',
      'So margins are included in width and boxes never overflow parents',
      'So every element gets a visible border that helps debug the layout',
      'So padding is ignored and the content always fills the full width',
    ],
    answer: 0,
    explanation: 'With border-box, width: 300px means the box is 300px even after adding padding and border. With the default content-box they are added on top, which often breaks layouts.',
  },
  {
    id: 'html-lazy-loading',
    type: 'multiple-choice',
    prompt: 'What does loading="lazy" on an <img> do?',
    options: [
      'Delays loading the image until it is close to the viewport',
      'Loads a low-quality version first and sharpens it later on',
      'Waits until every script on the page has finished running',
      'Caches the image so it loads instantly on the next visit',
    ],
    answer: 0,
    explanation: 'Lazy loading skips images far down the page until the user scrolls near them, which makes the first load faster. Do not use it on the main image at the top of the page.',
  },
  {
    id: 'css-visually-hidden',
    type: 'multiple-choice',
    prompt: 'For text meant only for screen readers, why use a "visually hidden" class instead of display: none?',
    options: [
      'display: none also hides the text from screen readers',
      'display: none text still shows up when the page is printed',
      'display: none removes the text from the DOM, so JS cannot find it',
      'Screen readers only read text that has a font and color set',
    ],
    answer: 0,
    explanation: 'display: none and visibility: hidden remove content from the accessibility tree too. A visually hidden class (tiny clipped box) hides it from the eye but keeps it readable by screen readers.',
  },
  {
    id: 'html-input-name',
    type: 'multiple-choice',
    prompt: 'A form input has an id but no name attribute. What happens when the form is submitted?',
    options: [
      'Its value is left out of the submitted form data',
      'Its value is sent using the id as the field name',
      'The browser blocks the submit until a name is added',
      'Its value is sent with an empty string as the key',
    ],
    answer: 0,
    explanation: 'Forms send name=value pairs. Without a name, the browser skips that input. The id is for labels, CSS and JavaScript, not for the submitted data.',
  },
  {
    id: 'css-rem-why',
    type: 'multiple-choice',
    prompt: 'Why are rem units often recommended for font sizes?',
    options: [
      'They scale with the user\'s browser font setting, unlike fixed px',
      'They are relative to the parent, so nested text scales together',
      'They are relative to the viewport, so text shrinks on small phones',
      'They render sharper than px on high-density screens like Retina',
    ],
    answer: 0,
    explanation: 'rem is relative to the root font-size, which follows the user\'s browser setting. Users who need bigger text get it everywhere. Relative-to-parent is em, and relative-to-viewport is vw.',
  },
  {
    id: 'css-grid-areas',
    type: 'multiple-choice',
    prompt: 'What does grid-template-areas do?',
    options: [
      'Names regions of the grid so items can be placed by name',
      'Creates a fixed number of equal columns based on the item count',
      'Sets the gap between the named rows and columns of the grid',
      'Lists which items appear first when the grid wraps on mobile',
    ],
    answer: 0,
    explanation: 'You draw the layout as strings like "header header" "sidebar main", then give items grid-area: header. A dot (.) leaves a cell empty. It makes page layouts easy to read and rearrange in media queries.',
  },
  {
    id: 'css-pseudo-content',
    type: 'multiple-choice',
    prompt: 'A ::before rule sets a color and a size, but nothing shows up. What is the most likely cause?',
    options: [
      'The content property is missing, so nothing is generated',
      'Pseudo-elements only appear while the element is hovered',
      'The rule needs a single colon (:before) to work in browsers',
      'The element needs position: relative before ::before renders',
    ],
    answer: 0,
    explanation: '::before and ::after are only created when content is set, even to an empty string: content: "". Both one and two colons work for them.',
  },
  {
    id: 'css-important-vs-inline',
    type: 'code-output',
    prompt: 'What color is the text "Hello"?',
    code: '/* CSS */\np { color: blue !important; }\n\n<!-- HTML -->\n<p style="color: red">Hello</p>',
    options: ['blue', 'red', 'black', 'purple (both mixed)'],
    answer: 0,
    explanation: 'An inline style normally beats stylesheet rules, but !important in the stylesheet beats a normal inline style. Colors never mix; one declaration wins.',
  },
  {
    id: 'css-span-width',
    type: 'code-output',
    prompt: 'How wide is the gold background?',
    code: 'span {\n  width: 300px;\n  height: 100px;\n  background: gold;\n}\n\n<span>Hi</span>',
    options: ['As wide as the text "Hi"', '300px wide and 100px tall', '300px wide, one line tall', 'The full width of its parent'],
    answer: 0,
    explanation: 'A span is inline, and inline elements ignore width and height. The background only covers the text. Use display: inline-block or block to make the size apply.',
  },
  {
    id: 'css-display-none-child',
    type: 'code-output',
    prompt: 'Is the "Home" link visible on the page?',
    code: '.menu { display: none; }\n.menu .link { display: block; }\n\n<div class="menu">\n  <a class="link" href="/">Home</a>\n</div>',
    options: ['No, the hidden parent hides it too', 'Yes, the child rule is more specific', 'Yes, but it takes up no space', 'Only while the menu is hovered'],
    answer: 0,
    explanation: 'display: none removes the element and everything inside it from the page. A child cannot show itself again, whatever its own display value is.',
  },
  {
    id: 'css-overlap-order',
    type: 'code-output',
    prompt: 'Both boxes sit in the same spot and neither has a z-index. Which one is visible on top?',
    code: '.a { position: absolute; top: 0; background: red; }\n.b { position: absolute; top: 0; background: blue; }\n\n<div class="b">B</div>\n<div class="a">A</div>',
    options: ['A (red), it comes later in the HTML', 'B (blue), its CSS rule comes later', 'B (blue), it comes first in the HTML', 'Neither, they sit side by side'],
    answer: 0,
    explanation: 'With equal stacking (no z-index), elements later in the HTML are painted on top. The order of the CSS rules does not matter for layering.',
  },
  {
    id: 'html-button-submit',
    type: 'code-output',
    prompt: 'What happens when the user clicks "Preview"?',
    code: '<form action="/save">\n  <input name="title">\n  <button>Preview</button>\n</form>',
    options: ['The form is submitted to /save', 'Nothing, it needs an onclick handler', 'The form fields are reset to empty', 'Only the title input is validated'],
    answer: 0,
    explanation: 'A <button> inside a form defaults to type="submit". Add type="button" for buttons that should not submit the form.',
  },
]
