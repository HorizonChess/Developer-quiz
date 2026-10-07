// The quiz topics. `id` is used in links (e.g. /quiz/javascript).
export const TOPICS = [
  { id: 'javascript', name: 'JavaScript', icon: 'JS', color: '#eab308', blurb: 'Scope, closures, async, types' },
  { id: 'html-css', name: 'HTML & CSS', icon: '</>', color: '#f97316', blurb: 'Semantics, layout, the box model' },
  { id: 'react', name: 'React', icon: '⚛', color: '#06b6d4', blurb: 'Components, state, hooks' },
  { id: 'node', name: 'Node & APIs', icon: 'N', color: '#22c55e', blurb: 'Event loop, Express, REST' },
  { id: 'sql', name: 'SQL & Databases', icon: 'DB', color: '#3b82f6', blurb: 'Queries, joins, indexes' },
  { id: 'web', name: 'Web Basics', icon: 'WWW', color: '#a855f7', blurb: 'HTTP, browsers, security' },
]

export function getTopic(id) {
  return TOPICS.find((t) => t.id === id)
}
