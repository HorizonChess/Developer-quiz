import { DEPARTMENTS, PEOPLE } from '../pools.js'

// Draws a small table as SQL comments so it can be shown above a query.
function drawTable(name, columns, rows) {
  const cells = [columns, ...rows.map((row) => row.map((v) => (v === null ? 'NULL' : String(v))))]
  const widths = columns.map((_, c) => Math.max(...cells.map((row) => row[c].length)))
  const line = (row) => '-- ' + row.map((v, c) => v.padEnd(widths[c])).join(' | ').trimEnd()
  return [`-- table: ${name}`, line(cells[0]), ...cells.slice(1).map(line)].join('\n')
}

const sqlValue = (v) => (v === null ? 'NULL' : typeof v === 'number' ? String(v) : `'${v}'`)
function createSql(name, columns, rows) {
  return `CREATE TABLE ${name} (${columns.join(', ')});\n` +
    rows.map((row) => `INSERT INTO ${name} VALUES (${row.map(sqlValue).join(', ')});`).join('\n')
}

// A random employees table: distinct names and salaries, 2-3 departments.
function makeEmployees(r, { withEmail = false } = {}) {
  const depts = r.sample(DEPARTMENTS, r.int(2, 3))
  const names = r.sample(PEOPLE, 6)
  const salaries = r.sample([42, 45, 48, 51, 55, 58, 61, 64, 67, 70, 74, 80], 6).map((k) => k * 1000)
  const rows = names.map((name, i) => {
    const row = [i + 1, name, depts[i < depts.length ? i : r.int(0, depts.length - 1)], salaries[i]]
    if (withEmail) row.push(r.chance(0.6) ? `${name.toLowerCase()}@co.com` : null)
    return row
  })
  if (withEmail && rows.every((row) => row[4] !== null)) rows[r.int(0, 5)][4] = null
  if (withEmail && rows.every((row) => row[4] === null)) rows[0][4] = `${rows[0][1].toLowerCase()}@co.com`
  const columns = ['id', 'name', 'department', 'salary', ...(withEmail ? ['email'] : [])]
  return { columns, rows, depts }
}

const employeeQuestion = (table, query) => ({
  code: `${drawTable('employees', table.columns, table.rows)}\n\n${query}`,
  setup: createSql('employees', table.columns, table.rows),
  query,
})
// Any set of tables shown above a query. `tables` is a list of { name, columns, rows }.
function tablesQuestion(tables, query) {
  return {
    code: `${tables.map((t) => drawTable(t.name, t.columns, t.rows)).join('\n\n')}\n\n${query}`,
    setup: tables.map((t) => createSql(t.name, t.columns, t.rows)).join('\n'),
    query,
  }
}

// Customers with ids 1..n (names from PEOPLE).
const makeCustomers = (r, n) => r.sample(PEOPLE, n).map((name, i) => [i + 1, name])

// Backup wrong answers for "how many rows" questions: nearby numbers, never negative.
const nearby = (n) => [n + 1, n - 1, n + 2, n - 2, n + 3].filter((x) => x >= 0).map(String)

const sum = (list) => list.reduce((a, b) => a + b, 0)

const TASK_TITLES = ['Fix login', 'Write tests', 'Update docs', 'Deploy app', 'Review PR', 'Plan sprint', 'Clean logs']
const PRODUCT_NAMES = ['pen', 'mug', 'cap', 'bag', 'lamp', 'book', 'clock', 'scarf']
const ORDER_DATES = ['2024-02-11', '2024-02-28', '2024-03-01', '2024-03-09', '2024-03-15', '2024-03-22', '2024-03-31', '2024-04-01', '2024-04-18']


export default [
  // ---------- Templates (each one is checked against a real SQLite database in the tests) ----------
  {
    id: 'sql-count-where',
    type: 'code-output',
    generate(r) {
      const t = makeEmployees(r)
      const limit = r.pick([50000, 55000, 60000, 65000])
      const op = r.pick(['>', '>=', '<'])
      const test = { '>': (s) => s > limit, '>=': (s) => s >= limit, '<': (s) => s < limit }[op]
      const n = t.rows.filter((row) => test(row[3])).length
      const q = employeeQuestion(t, `SELECT COUNT(*) FROM employees\nWHERE salary ${op} ${limit};`)
      return {
        prompt: 'What number does this query return?',
        code: q.code,
        correct: String(n),
        wrong: [String(6 - n), String(n + 1), String(Math.abs(n - 1)), '6', '0', String(n + 2), '3'],
        explanation: `WHERE keeps only rows where salary ${op} ${limit}. COUNT(*) then counts those rows: ${n}.`,
        check: { sql: q.setup, query: q.query, format: 'first' },
      }
    },
  },
  {
    id: 'sql-group-having',
    type: 'code-output',
    generate(r) {
      const t = makeEmployees(r)
      const min = r.int(1, 2)
      const counts = {}
      for (const row of t.rows) counts[row[2]] = (counts[row[2]] ?? 0) + 1
      const groups = Object.keys(counts).length
      const n = Object.values(counts).filter((c) => c > min).length
      const q = employeeQuestion(t, `SELECT department, COUNT(*)\nFROM employees\nGROUP BY department\nHAVING COUNT(*) > ${min};`)
      return {
        prompt: 'How many rows does this query return?',
        code: q.code,
        correct: String(n),
        wrong: [String(groups), '6', String(n + 1), String(Math.max(n - 1, 0)), '1', '0'],
        explanation: `GROUP BY makes one row per department (${groups} here). HAVING then filters those groups, keeping departments with more than ${min} employee(s): ${n}. WHERE filters rows before grouping; HAVING filters groups after.`,
        check: { sql: q.setup, query: q.query, format: 'count' },
      }
    },
  },
  {
    id: 'sql-max-where',
    type: 'code-output',
    generate(r) {
      const t = makeEmployees(r)
      const dept = r.pick(t.depts)
      const inDept = t.rows.filter((row) => row[2] === dept).map((row) => row[3])
      const all = t.rows.map((row) => row[3])
      const fn = r.pick(['MAX', 'MIN'])
      const pickFn = fn === 'MAX' ? Math.max : Math.min
      const correct = pickFn(...inDept)
      const q = employeeQuestion(t, `SELECT ${fn}(salary) FROM employees\nWHERE department = '${dept}';`)
      return {
        prompt: 'What does this query return?',
        code: q.code,
        correct: String(correct),
        wrong: [String(pickFn(...all)), String(fn === 'MAX' ? Math.min(...inDept) : Math.max(...inDept)), String(inDept.reduce((a, b) => a + b)), ...all.map(String)],
        explanation: `WHERE first keeps only the ${dept} rows. Then ${fn}() returns the ${fn === 'MAX' ? 'highest' : 'lowest'} salary among them: ${correct}.`,
        check: { sql: q.setup, query: q.query, format: 'first' },
      }
    },
  },
  {
    id: 'sql-order-limit',
    type: 'code-output',
    generate(r) {
      const t = makeEmployees(r)
      const dir = r.pick(['DESC', 'ASC'])
      const offset = r.int(0, 2)
      const sorted = [...t.rows].sort((a, b) => (dir === 'DESC' ? b[3] - a[3] : a[3] - b[3]))
      const correct = sorted[offset][1]
      const q = employeeQuestion(t, `SELECT name FROM employees\nORDER BY salary ${dir}\nLIMIT 1${offset ? ` OFFSET ${offset}` : ''};`)
      return {
        prompt: 'Which name does this query return?',
        code: q.code,
        correct,
        // Likely mistakes first (off by one, wrong direction), then any other name as a backup.
        wrong: [sorted[offset + 1][1], sorted[sorted.length - 1 - offset][1], sorted[offset ? offset - 1 : offset + 2][1], ...sorted.map((row) => row[1])],
        explanation: `ORDER BY salary ${dir} sorts from ${dir === 'DESC' ? 'highest to lowest' : 'lowest to highest'}. OFFSET ${offset} skips ${offset} row(s), and LIMIT 1 returns the next one. This is the classic "find the Nth highest salary" interview question.`,
        check: { sql: q.setup, query: q.query, format: 'first' },
      }
    },
  },
  {
    id: 'sql-null-count',
    type: 'code-output',
    generate(r) {
      const t = makeEmployees(r, { withEmail: true })
      const withEmail = t.rows.filter((row) => row[4] !== null).length
      const nulls = 6 - withEmail
      const variant = r.pick(['count', 'equals', 'is'])
      const query = {
        count: 'SELECT COUNT(*), COUNT(email) FROM employees;',
        equals: 'SELECT COUNT(*) FROM employees\nWHERE email = NULL;',
        is: 'SELECT COUNT(*) FROM employees\nWHERE email IS NULL;',
      }[variant]
      const q = employeeQuestion(t, query)
      const correct = { count: `6 ${withEmail}`, equals: '0', is: String(nulls) }[variant]
      const wrong = {
        count: ['6 6', `${withEmail} ${withEmail}`, `6 ${nulls}`, `${withEmail} 6`],
        equals: [String(nulls), '6', 'NULL', 'An error'],
        is: ['0', String(withEmail), '6', 'NULL'],
      }[variant]
      return {
        prompt: 'What does this query return?',
        code: q.code,
        correct,
        wrong,
        explanation: {
          count: `COUNT(*) counts every row (6). COUNT(email) only counts rows where email is not NULL (${withEmail}).`,
          equals: 'NULL means "unknown", so email = NULL is never true, not even for NULL emails. The result is 0. Always use IS NULL / IS NOT NULL.',
          is: `IS NULL is the correct way to find missing values. ${nulls} employee(s) have no email.`,
        }[variant],
        check: { sql: q.setup, query: q.query, format: 'first' },
      }
    },
  },
  {
    id: 'sql-join-rows',
    type: 'code-output',
    generate(r) {
      const custCount = r.int(3, 4)
      const customers = r.sample(PEOPLE, custCount).map((name, i) => [i + 1, name])
      const orderCount = r.int(3, 5)
      const orders = Array.from({ length: orderCount }, (_, i) => [100 + i, r.int(1, custCount - 1), r.int(2, 30) * 5])
      const join = r.pick(['INNER JOIN', 'LEFT JOIN'])
      const perCustomer = customers.map(([id]) => orders.filter((o) => o[1] === id).length)
      const inner = orders.length
      const left = perCustomer.reduce((sum, n) => sum + Math.max(n, 1), 0)
      const correct = join === 'INNER JOIN' ? inner : left
      const query = `SELECT c.name, o.total\nFROM customers c\n${join} orders o ON o.customer_id = c.id;`
      const cCols = ['id', 'name']
      const oCols = ['id', 'customer_id', 'total']
      return {
        prompt: 'How many rows does this query return?',
        code: `${drawTable('customers', cCols, customers)}\n\n${drawTable('orders', oCols, orders)}\n\n${query}`,
        correct: String(correct),
        wrong: [String(join === 'INNER JOIN' ? left : inner), String(custCount), String(custCount * orderCount), String(correct + 1), String(correct - 1)],
        explanation: join === 'INNER JOIN'
          ? `INNER JOIN only keeps pairs that match. Every order has a customer, so there is one row per order: ${inner}. Customers with no orders are dropped.`
          : `LEFT JOIN keeps every customer. Customers with orders get one row per order, and customers without orders still get one row (with NULL for total): ${left} rows.`,
        check: { sql: `${createSql('customers', cCols, customers)}\n${createSql('orders', oCols, orders)}`, query, format: 'count' },
      }
    },
  },
  {
    id: 'sql-distinct',
    type: 'code-output',
    generate(r) {
      const t = makeEmployees(r)
      const distinct = new Set(t.rows.map((row) => row[2])).size
      const q = employeeQuestion(t, 'SELECT DISTINCT department FROM employees;')
      return {
        prompt: 'How many rows does this query return?',
        code: q.code,
        correct: String(distinct),
        wrong: ['6', '1', String(distinct + 1), String(distinct - 1), '4'],
        explanation: `DISTINCT removes duplicate rows from the result. There are ${distinct} different departments.`,
        check: { sql: q.setup, query: q.query, format: 'count' },
      }
    },
  },
  {
    id: 'sql-outer-join-rows',
    type: 'code-output',
    generate(r) {
      const n = r.int(3, 4)
      const customers = makeCustomers(r, n)
      const matched = r.int(2, 4)
      const orphans = r.int(1, 2)
      // Orders for customers 8 or 9 point at customers that no longer exist.
      const ids = r.shuffle([
        ...Array.from({ length: matched }, () => r.int(1, n - 1)),
        ...Array.from({ length: orphans }, () => r.int(8, 9)),
      ])
      const orders = ids.map((cid, i) => [100 + i, cid, r.int(2, 30) * 5])
      const per = customers.map(([id]) => orders.filter((o) => o[1] === id).length)
      const left = sum(per.map((k) => Math.max(k, 1)))
      const counts = {
        'INNER JOIN': matched,
        'LEFT JOIN': left,
        'RIGHT JOIN': matched + orphans,
        'FULL OUTER JOIN': left + orphans,
      }
      const join = r.pick(Object.keys(counts))
      const correct = counts[join]
      const q = tablesQuestion([
        { name: 'customers', columns: ['id', 'name'], rows: customers },
        { name: 'orders', columns: ['id', 'customer_id', 'total'], rows: orders },
      ], `SELECT c.name, o.total\nFROM customers c\n${join} orders o ON o.customer_id = c.id;`)
      return {
        prompt: 'How many rows does this query return?',
        code: q.code,
        correct: String(correct),
        wrong: [...Object.values(counts).map(String), String(n), String(orders.length + n), ...nearby(correct)],
        explanation: {
          'INNER JOIN': `INNER JOIN keeps only orders whose customer_id matches a customer: ${matched}. Orders for missing customers and customers without orders are dropped.`,
          'LEFT JOIN': `LEFT JOIN keeps every customer (the left table). Each gets one row per matching order, or one row with NULLs if they have none: ${left}. Orders for missing customers are dropped.`,
          'RIGHT JOIN': `RIGHT JOIN keeps every order (the right table), even the ${orphans} whose customer is missing (name becomes NULL). That is one row per order: ${matched + orphans}.`,
          'FULL OUTER JOIN': `FULL OUTER JOIN keeps unmatched rows from both sides: the LEFT JOIN rows (${left}) plus the ${orphans} order(s) with no customer: ${left + orphans}.`,
        }[join],
        check: { sql: q.setup, query: q.query, format: 'count' },
      }
    },
  },
  {
    id: 'sql-cross-join',
    type: 'code-output',
    generate(r) {
      const colors = r.sample(['red', 'blue', 'green', 'black', 'white'], r.int(2, 4)).map((c, i) => [i + 1, c])
      const sizes = r.sample(['S', 'M', 'L', 'XL'], r.int(2, 4)).map((s, i) => [i + 1, s])
      const a = colors.length
      const b = sizes.length
      const query = r.pick([
        'SELECT c.name, s.name\nFROM colors c\nCROSS JOIN sizes s;',
        'SELECT *\nFROM colors, sizes;',
      ])
      const q = tablesQuestion([
        { name: 'colors', columns: ['id', 'name'], rows: colors },
        { name: 'sizes', columns: ['id', 'name'], rows: sizes },
      ], query)
      return {
        prompt: 'How many rows does this query return?',
        code: q.code,
        correct: String(a * b),
        wrong: [String(a + b), String(Math.max(a, b)), String(Math.min(a, b)), ...nearby(a * b), String(a * b * 2)],
        explanation: `A CROSS JOIN (or listing tables with a comma and no condition) pairs every row of one table with every row of the other: ${a} x ${b} = ${a * b} rows. This is also called a Cartesian product.`,
        check: { sql: q.setup, query: q.query, format: 'count' },
      }
    },
  },
  {
    id: 'sql-self-join',
    type: 'code-output',
    generate(r) {
      const names = r.sample(PEOPLE, 6)
      const salaries = r.sample([42, 45, 48, 51, 55, 58, 61, 64, 67, 70, 74, 80], 6).map((k) => k * 1000)
      const twoBosses = r.chance(0.5)
      const rows = names.map((name, i) => {
        const manager = i === 0 || (i === 1 && twoBosses) ? null : r.int(1, i)
        return [i + 1, name, manager, salaries[i]]
      })
      const withManager = rows.filter((row) => row[2] !== null)
      const richer = withManager.filter((row) => row[3] > rows[row[2] - 1][3]).length
      const variant = r.pick(['inner', 'left', 'richer'])
      const join = variant === 'left' ? 'LEFT JOIN' : 'JOIN'
      const query = `SELECT e.name, m.name AS manager\nFROM employees e\n${join} employees m ON e.manager_id = m.id${variant === 'richer' ? '\nWHERE e.salary > m.salary' : ''};`
      const q = tablesQuestion([{ name: 'employees', columns: ['id', 'name', 'manager_id', 'salary'], rows }], query)
      const correct = { inner: withManager.length, left: 6, richer }[variant]
      return {
        prompt: 'How many rows does this query return?',
        code: q.code,
        correct: String(correct),
        wrong: [String(withManager.length), '6', String(richer), String(6 - withManager.length), ...nearby(correct)],
        explanation: {
          inner: `This is a self join: the same table is used twice, once as employees (e) and once as managers (m). A plain JOIN drops people whose manager_id is NULL, so ${withManager.length} rows remain.`,
          left: 'This is a self join with LEFT JOIN, so every employee is kept. People with no manager still appear, with NULL as the manager name: 6 rows.',
          richer: `The self join pairs each employee with their manager. The WHERE then keeps only people who earn more than their own manager: ${richer}.`,
        }[variant],
        check: { sql: q.setup, query: q.query, format: 'count' },
      }
    },
  },
  {
    id: 'sql-second-highest',
    type: 'code-output',
    generate(r) {
      const [top, second, third, fourth] = r.sample([45, 48, 52, 55, 60, 64, 70, 75, 82, 90], 4).sort((a, b) => b - a).map((k) => k * 1000)
      const names = r.sample(PEOPLE, 5)
      const rows = r.shuffle([top, top, second, third, fourth]).map((s, i) => [i + 1, names[i], s])
      const variant = r.pick(['subquery', 'offset', 'distinct'])
      const query = {
        subquery: 'SELECT MAX(salary) FROM employees\nWHERE salary < (SELECT MAX(salary) FROM employees);',
        offset: 'SELECT salary FROM employees\nORDER BY salary DESC\nLIMIT 1 OFFSET 1;',
        distinct: 'SELECT DISTINCT salary FROM employees\nORDER BY salary DESC\nLIMIT 1 OFFSET 1;',
      }[variant]
      const q = tablesQuestion([{ name: 'employees', columns: ['id', 'name', 'salary'], rows }], query)
      const correct = variant === 'offset' ? top : second
      return {
        prompt: r.pick(['What does this query return?', 'Two people share the top salary. What does this query return?']),
        code: q.code,
        correct: String(correct),
        wrong: [String(top), String(second), String(third), String(fourth)],
        explanation: {
          subquery: `The inner query finds the top salary (${top}). The outer query takes the highest salary below it, which is the second-highest distinct salary: ${second}.`,
          offset: `Two rows share the top salary, so after sorting, the row at OFFSET 1 is still ${top}. To get the second-highest value you need DISTINCT or a MAX subquery.`,
          distinct: `DISTINCT removes the repeated ${top} first, so OFFSET 1 lands on the second-highest distinct salary: ${second}.`,
        }[variant],
        check: { sql: q.setup, query: q.query, format: 'first' },
      }
    },
  },
  {
    id: 'sql-rank-window',
    type: 'code-output',
    generate(r) {
      const distinct = r.sample([95, 90, 88, 84, 80, 77, 72, 70, 65], 5).sort((a, b) => b - a)
      const t = r.int(0, 2)
      const scores = [...distinct.slice(0, t + 1), ...distinct.slice(t)] // one tie at positions t and t+1
      const names = r.sample(PEOPLE, 6)
      const rows = scores.map((s, i) => [names[i], s])
      const fn = r.pick(['ROW_NUMBER', 'RANK', 'DENSE_RANK'])
      // ROW_NUMBER picks an arbitrary order for tied rows, so only ask about rows after the tie.
      const i = fn === 'RANK' ? r.int(0, 5) : r.int(t + 2, 5)
      const s = scores[i]
      const values = {
        ROW_NUMBER: i + 1,
        RANK: 1 + scores.filter((x) => x > s).length,
        DENSE_RANK: 1 + new Set(scores.filter((x) => x > s)).size,
      }
      const correct = values[fn]
      const inner = `SELECT name, score,\n  ${fn}() OVER (ORDER BY score DESC) AS pos\nFROM players`
      const q = tablesQuestion([{ name: 'players', columns: ['name', 'score'], rows }], `${inner};`)
      return {
        prompt: `What is pos for ${names[i]}?`,
        code: q.code,
        correct: String(correct),
        wrong: [...Object.values(values).map(String), ...nearby(correct).filter((x) => x !== '0')],
        explanation: `${fn}() numbers rows by score, highest first. ROW_NUMBER gives 1, 2, 3... with no ties. RANK gives tied rows the same number and then skips (1, 2, 2, 4). DENSE_RANK also ties but does not skip (1, 2, 2, 3). Here ${names[i]} gets ${correct}.`,
        check: { sql: q.setup, query: `SELECT pos FROM (\n${inner}\n) WHERE name = '${names[i]}';`, format: 'first' },
      }
    },
  },
  {
    id: 'sql-avg-null',
    type: 'code-output',
    generate(r) {
      const avg = r.pick([400, 500, 600, 700, 800])
      const devs = r.pick([[-200, 0, 200], [-300, 100, 200], [-100, -100, 200], [-300, -100, 100, 300], [-200, -200, 100, 300]])
      const values = r.shuffle(devs.map((d) => avg + d))
      const total = values.length + r.int(1, 2)
      const nullAt = new Set(r.sample([...Array(total).keys()], total - values.length))
      const names = r.sample(PEOPLE, total)
      let v = 0
      const rows = names.map((name, i) => [i + 1, name, nullAt.has(i) ? null : values[v++]])
      const q = tablesQuestion([{ name: 'staff', columns: ['id', 'name', 'bonus'], rows }], 'SELECT AVG(bonus) FROM staff;')
      const s = sum(values)
      return {
        prompt: r.pick(['What does this query return?', 'Some bonuses are NULL. What does this query return?']),
        code: q.code,
        correct: String(avg),
        wrong: [String(Math.round(s / total)), 'NULL', String(s), String(avg + 100), String(avg - 100), String(Math.max(...values))],
        explanation: `AVG ignores NULL values, like the other aggregate functions except COUNT(*). It divides ${s} by the ${values.length} non-NULL bonuses, not by all ${total} rows: ${avg}. Use AVG(COALESCE(bonus, 0)) if NULL should count as 0.`,
        check: { sql: q.setup, query: q.query, format: 'first' },
      }
    },
  },
  {
    id: 'sql-not-equal-null',
    type: 'code-output',
    generate(r) {
      const titles = r.sample(TASK_TITLES, 6)
      const done = r.int(1, 3)
      const nulls = r.int(1, 2)
      const statuses = r.shuffle([...Array(done).fill('done'), ...Array(nulls).fill(null), ...Array(6 - done - nulls).fill('open')])
      const rows = titles.map((title, i) => [i + 1, title, statuses[i]])
      const target = r.pick(['done', 'open'])
      const other = statuses.filter((s) => s !== null && s !== target).length
      const variant = r.pick(['ne', 'ne', 'or-null'])
      const query = `SELECT COUNT(*) FROM tasks\nWHERE status <> '${target}'${variant === 'or-null' ? ' OR status IS NULL' : ''};`
      const q = tablesQuestion([{ name: 'tasks', columns: ['id', 'title', 'status'], rows }], query)
      const correct = variant === 'ne' ? other : other + nulls
      return {
        prompt: 'What number does this query return?',
        code: q.code,
        correct: String(correct),
        wrong: [String(other + nulls), String(other), String(nulls), '6', ...nearby(correct)],
        explanation: variant === 'ne'
          ? `Comparing NULL with <> gives "unknown", not true, so rows with a NULL status are left out. Only the ${other} row(s) with a real, different status are counted.`
          : `status <> '${target}' alone would skip NULL rows, because comparing with NULL is never true. Adding OR status IS NULL brings them back: ${other} + ${nulls} = ${correct}.`,
        check: { sql: q.setup, query: q.query, format: 'first' },
      }
    },
  },
  {
    id: 'sql-not-in-null',
    type: 'code-output',
    generate(r) {
      const n = r.int(4, 5)
      const customers = makeCustomers(r, n)
      const variant = r.pick(['not-in-null', 'not-in', 'not-exists'])
      const ids = Array.from({ length: r.int(3, 4) }, () => r.int(1, n - 2))
      if (variant !== 'not-in') ids.splice(r.int(0, ids.length), 0, null) // a guest order with no customer
      const orders = ids.map((cid, i) => [100 + i, cid])
      const none = customers.filter(([id]) => !ids.includes(id)).length
      const query = variant === 'not-exists'
        ? 'SELECT name FROM customers c\nWHERE NOT EXISTS (\n  SELECT 1 FROM orders o WHERE o.customer_id = c.id\n);'
        : 'SELECT name FROM customers\nWHERE id NOT IN (SELECT customer_id FROM orders);'
      const q = tablesQuestion([
        { name: 'customers', columns: ['id', 'name'], rows: customers },
        { name: 'orders', columns: ['id', 'customer_id'], rows: orders },
      ], query)
      const correct = variant === 'not-in-null' ? 0 : none
      return {
        prompt: 'How many rows does this query return?',
        code: q.code,
        correct: String(correct),
        wrong: [String(none), '0', String(n), String(n - none), ...nearby(correct)],
        explanation: {
          'not-in-null': 'One customer_id in orders is NULL. NOT IN then means "id <> each value AND id <> NULL", and anything compared with NULL is unknown, so no row passes: 0. NOT EXISTS does not have this trap.',
          'not-in': `NOT IN keeps customers whose id never appears in orders.customer_id. ${none} customer(s) have no orders.`,
          'not-exists': `NOT EXISTS keeps a customer when the inner query finds no order for them. The NULL customer_id simply never matches, so the answer is the ${none} customer(s) with no orders.`,
        }[variant],
        check: { sql: q.setup, query: q.query, format: 'count' },
      }
    },
  },
  {
    id: 'sql-in-subquery',
    type: 'code-output',
    generate(r) {
      const n = r.int(4, 5)
      const customers = makeCustomers(r, n)
      const limit = r.pick([50, 80, 100])
      const orders = Array.from({ length: 6 }, (_, i) => [100 + i, r.int(1, n), r.int(2, 30) * 5])
      // Make sure at least one customer has two big orders, so counting orders and customers differ.
      orders[0][2] = limit + 25
      orders[1][2] = limit + 40
      orders[1][1] = orders[0][1]
      const big = orders.filter((o) => o[2] > limit)
      const correct = new Set(big.map((o) => o[1])).size
      const q = tablesQuestion([
        { name: 'customers', columns: ['id', 'name'], rows: customers },
        { name: 'orders', columns: ['id', 'customer_id', 'total'], rows: r.shuffle(orders) },
      ], `SELECT name FROM customers\nWHERE id IN (\n  SELECT customer_id FROM orders WHERE total > ${limit}\n);`)
      return {
        prompt: 'How many rows does this query return?',
        code: q.code,
        correct: String(correct),
        wrong: [String(big.length), String(n), String(6 - big.length), ...nearby(correct)],
        explanation: `The subquery lists customer_ids with an order over ${limit} (${big.length} orders). IN only asks "is this id in the list?", so a customer with several big orders still appears once: ${correct} customers.`,
        check: { sql: q.setup, query: q.query, format: 'count' },
      }
    },
  },
  {
    id: 'sql-union-count',
    type: 'code-output',
    generate(r) {
      const [shared, aOnly, bOnly] = (() => {
        const names = r.sample(PEOPLE, 8)
        const o = r.int(1, 2)
        return [names.slice(0, o), names.slice(o, o + r.int(2, 3)), names.slice(5, 5 + r.int(2, 3))]
      })()
      const a = [...shared, ...aOnly]
      if (r.chance(0.4)) a.push(aOnly[0]) // a repeated name inside team_a
      const b = [...shared, ...bOnly]
      const op = r.pick(['UNION', 'UNION ALL'])
      const q = tablesQuestion([
        { name: 'team_a', columns: ['name'], rows: r.shuffle(a).map((x) => [x]) },
        { name: 'team_b', columns: ['name'], rows: r.shuffle(b).map((x) => [x]) },
      ], `SELECT name FROM team_a\n${op}\nSELECT name FROM team_b;`)
      const all = a.length + b.length
      const distinct = new Set([...a, ...b]).size
      const correct = op === 'UNION' ? distinct : all
      return {
        prompt: 'How many rows does this query return?',
        code: q.code,
        correct: String(correct),
        wrong: [String(distinct), String(all), String(all - shared.length), String(a.length), ...nearby(correct)],
        explanation: op === 'UNION'
          ? `UNION stacks both results and removes every duplicate row, including repeats inside one table. There are ${distinct} different names.`
          : `UNION ALL just stacks both results and keeps duplicates: ${a.length} + ${b.length} = ${all} rows.`,
        check: { sql: q.setup, query: q.query, format: 'count' },
      }
    },
  },
  {
    id: 'sql-case-when',
    type: 'code-output',
    generate(r) {
      const t = makeEmployees(r)
      const high = t.rows.filter((row) => row[3] >= 65000)
      const variant = high.length && r.chance(0.5) ? 'order' : 'normal'
      const row = variant === 'order' ? r.pick(high) : r.pick(t.rows)
      const s = row[3]
      const whens = variant === 'order'
        ? "    WHEN salary >= 50000 THEN 'mid'\n    WHEN salary >= 65000 THEN 'high'"
        : "    WHEN salary >= 65000 THEN 'high'\n    WHEN salary >= 50000 THEN 'mid'"
      const q = employeeQuestion(t, `SELECT CASE\n${whens}\n    ELSE 'low'\n  END AS level\nFROM employees\nWHERE name = '${row[1]}';`)
      const correct = variant === 'order' ? 'mid' : s >= 65000 ? 'high' : s >= 50000 ? 'mid' : 'low'
      return {
        prompt: 'What does this query return?',
        code: q.code,
        correct,
        wrong: ['high', 'mid', 'low', 'NULL'],
        explanation: variant === 'order'
          ? `CASE checks the WHEN branches from top to bottom and stops at the first true one. ${s} >= 50000 is already true, so the result is 'mid' and the 'high' branch is never reached.`
          : `CASE checks each WHEN from top to bottom and returns the first one that is true. ${row[1]} earns ${s}, so the result is '${correct}'.`,
        check: { sql: q.setup, query: q.query, format: 'first' },
      }
    },
  },
  {
    id: 'sql-string-fn',
    type: 'code-output',
    generate(r) {
      const [a, b] = r.sample(PEOPLE.filter((p) => p.length >= 4), 2)
      const variant = r.pick(['substr', 'trim', 'concat'])
      const query = {
        substr: `SELECT SUBSTR('${a}', 2, 3);`,
        trim: `SELECT LENGTH(TRIM('  ${a}  '));`,
        concat: `SELECT UPPER('${a}') || ' ' || LOWER('${b}');`,
      }[variant]
      const correct = {
        substr: a.slice(1, 4),
        trim: String(a.length),
        concat: `${a.toUpperCase()} ${b.toLowerCase()}`,
      }[variant]
      const wrong = {
        substr: [a.slice(0, 3), a.slice(2, 5), a.slice(1, 3), a.slice(0, 2), a.slice(1)],
        trim: [String(a.length + 4), String(a.length + 2), String(a.length - 1), String(a.length + 1)],
        concat: [`${a.toUpperCase()}${b.toLowerCase()}`, `${a} ${b}`, `${a.toUpperCase()} ${b.toUpperCase()}`, `${a.toLowerCase()} ${b.toUpperCase()}`],
      }[variant]
      return {
        prompt: 'What does this query return?',
        code: query,
        correct,
        wrong,
        explanation: {
          substr: `SUBSTR(text, start, length) counts from 1, not 0. Starting at position 2 and taking 3 characters of '${a}' gives '${correct}'.`,
          trim: `TRIM removes the spaces at both ends, so only '${a}' is left. LENGTH then counts its characters: ${a.length}.`,
          concat: `|| joins strings together in SQL (like + in JavaScript). UPPER and LOWER change the case, and the ' ' in the middle adds a space.`,
        }[variant],
        check: { sql: '', query, format: 'first' },
      }
    },
  },
  {
    id: 'sql-group-top',
    type: 'code-output',
    generate(r) {
      const fn = r.pick(['SUM', 'MAX', 'COUNT'])
      let t, stats
      for (let tries = 0; tries < 30; tries++) {
        t = makeEmployees(r)
        stats = t.depts.map((d) => {
          const s = t.rows.filter((row) => row[2] === d).map((row) => row[3])
          return { d, SUM: sum(s), MAX: Math.max(...s), COUNT: s.length }
        }).sort((x, y) => y[fn] - x[fn])
        if (stats[0][fn] !== stats[1][fn]) break
      }
      const [best, next] = stats
      const arg = fn === 'COUNT' ? '*' : 'salary'
      const q = employeeQuestion(t, `SELECT department, ${fn}(${arg}) AS value\nFROM employees\nGROUP BY department\nORDER BY value DESC\nLIMIT 1;`)
      const total = sum(t.rows.map((row) => row[3]))
      return {
        prompt: 'What does this query return?',
        code: q.code,
        correct: `${best.d} ${best[fn]}`,
        wrong: [`${next.d} ${next[fn]}`, ...['SUM', 'MAX', 'COUNT'].map((f) => `${best.d} ${best[f]}`), `${best.d} ${total}`, `${next.d} ${best[fn]}`],
        explanation: `GROUP BY makes one row per department, and ${fn}(${arg}) is computed inside each group. ORDER BY value DESC puts the largest first and LIMIT 1 keeps it: ${best.d} with ${best[fn]}.`,
        check: { sql: q.setup, query: q.query, format: 'first' },
      }
    },
  },
  {
    id: 'sql-having-sum',
    type: 'code-output',
    generate(r) {
      const people = r.sample(PEOPLE, r.int(3, 4))
      const rows = Array.from({ length: 6 }, (_, i) => [100 + i, people[i < people.length ? i : r.int(0, people.length - 1)], r.int(4, 24) * 5])
      const sums = people.map((p) => sum(rows.filter((row) => row[1] === p).map((row) => row[2])))
      const limit = r.pick(sums) - r.pick([0, 5])
      const correct = sums.filter((s) => s > limit).length
      const q = tablesQuestion([{ name: 'orders', columns: ['id', 'customer', 'total'], rows }],
        `SELECT customer, SUM(total)\nFROM orders\nGROUP BY customer\nHAVING SUM(total) > ${limit};`)
      return {
        prompt: 'How many rows does this query return?',
        code: q.code,
        correct: String(correct),
        wrong: [String(rows.filter((row) => row[2] > limit).length), String(people.length), String(sums.filter((s) => s >= limit).length), ...nearby(correct)],
        explanation: `GROUP BY adds up each customer's orders (totals: ${people.map((p, i) => `${p} ${sums[i]}`).join(', ')}). HAVING keeps the groups whose sum is greater than ${limit}: ${correct}.`,
        check: { sql: q.setup, query: q.query, format: 'count' },
      }
    },
  },
  {
    id: 'sql-count-distinct',
    type: 'code-output',
    generate(r) {
      const t = makeEmployees(r)
      for (const i of r.sample([0, 1, 2, 3, 4, 5], r.int(1, 2))) t.rows[i][2] = null
      const values = t.rows.map((row) => row[2]).filter((d) => d !== null)
      const d = new Set(values).size
      const variant = r.pick(['count', 'rows'])
      const q = employeeQuestion(t, variant === 'count'
        ? 'SELECT COUNT(DISTINCT department) FROM employees;'
        : 'SELECT DISTINCT department FROM employees;')
      const correct = variant === 'count' ? d : d + 1
      return {
        prompt: variant === 'count' ? 'What number does this query return?' : 'How many rows does this query return?',
        code: q.code,
        correct: String(correct),
        wrong: [String(d), String(d + 1), String(values.length), '6', ...nearby(correct)],
        explanation: variant === 'count'
          ? `COUNT(DISTINCT department) counts the different non-NULL values. NULL is skipped, so the answer is ${d}.`
          : `SELECT DISTINCT treats all NULLs as one group, so NULL shows up as its own row: ${d} departments + 1 NULL row = ${d + 1}. (COUNT(DISTINCT ...) would skip the NULL.)`,
        check: { sql: q.setup, query: q.query, format: variant === 'count' ? 'first' : 'count' },
      }
    },
  },
  {
    id: 'sql-date-filter',
    type: 'code-output',
    generate(r) {
      const dates = r.sample(ORDER_DATES, 6).sort()
      const rows = dates.map((d, i) => [i + 1, d, r.int(2, 30) * 5])
      const variant = r.pick(['month', 'between', 'after'])
      const where = {
        month: "strftime('%m', order_date) = '03'",
        between: "order_date BETWEEN '2024-03-01' AND '2024-03-31'",
        after: "order_date > '2024-03-15'",
      }[variant]
      const march = dates.filter((d) => d.startsWith('2024-03')).length
      const after = dates.filter((d) => d > '2024-03-15').length
      const afterIncl = dates.filter((d) => d >= '2024-03-15').length
      const marchInner = dates.filter((d) => d > '2024-03-01' && d < '2024-03-31').length
      const q = tablesQuestion([{ name: 'orders', columns: ['id', 'order_date', 'total'], rows }], `SELECT COUNT(*) FROM orders\nWHERE ${where};`)
      const correct = variant === 'after' ? after : march
      return {
        prompt: 'What number does this query return?',
        code: q.code,
        correct: String(correct),
        wrong: [String(march), String(after), String(afterIncl), String(marchInner), ...nearby(correct)],
        explanation: {
          month: `strftime('%m', ...) pulls the month out of a date as text like '03'. ${march} order(s) are in March.`,
          between: `BETWEEN includes both ends, so orders on 2024-03-01 and 2024-03-31 count too. ${march} order(s) fall in that range.`,
          after: `Dates stored as 'YYYY-MM-DD' text sort correctly, so > compares them like dates. > is strict, so an order on exactly 2024-03-15 is not counted: ${after}.`,
        }[variant],
        check: { sql: q.setup, query: q.query, format: 'first' },
      }
    },
  },
  {
    id: 'sql-limit-offset-count',
    type: 'code-output',
    generate(r) {
      const t = makeEmployees(r)
      const limit = r.int(2, 4)
      const offset = r.int(3, 5)
      const mysqlStyle = r.chance(0.35)
      const q = employeeQuestion(t, `SELECT name FROM employees\nORDER BY id\n${mysqlStyle ? `LIMIT ${offset}, ${limit}` : `LIMIT ${limit} OFFSET ${offset}`};`)
      const correct = Math.max(0, Math.min(limit, 6 - offset))
      const swapped = Math.max(0, Math.min(offset, 6 - limit))
      return {
        prompt: 'How many rows does this query return?',
        code: q.code,
        correct: String(correct),
        wrong: [String(limit), String(offset), String(swapped), String(6 - offset + 1), ...nearby(correct)],
        explanation: `${mysqlStyle ? `In the short form LIMIT a, b, the first number is the offset and the second is the row count. So this skips ${offset} rows and takes up to ${limit}.` : `OFFSET ${offset} skips the first ${offset} rows, then LIMIT ${limit} takes up to ${limit} of the rest.`} Only ${6 - offset} row(s) are left after skipping, so the result has ${correct}.`,
        check: { sql: q.setup, query: q.query, format: 'count' },
      }
    },
  },
  {
    id: 'sql-null-arithmetic',
    type: 'code-output',
    generate(r) {
      const names = r.sample(PEOPLE, 5)
      const salaries = r.sample([30, 35, 40, 45, 50, 55, 60], 5)
      const nullAt = new Set(r.sample([0, 1, 2, 3, 4], r.int(1, 2)))
      const rows = names.map((name, i) => [i + 1, name, salaries[i], nullAt.has(i) ? null : r.int(1, 9)])
      const withBonus = rows.filter((row) => row[3] !== null)
      const plus = sum(withBonus.map((row) => row[2] + row[3]))
      const full = sum(salaries) + sum(withBonus.map((row) => row[3]))
      const variant = r.pick(['plus', 'plus', 'coalesce'])
      const expr = variant === 'plus' ? 'salary + bonus' : 'salary + COALESCE(bonus, 0)'
      const q = tablesQuestion([{ name: 'staff', columns: ['id', 'name', 'salary', 'bonus'], rows }], `SELECT SUM(${expr}) FROM staff;`)
      const correct = variant === 'plus' ? plus : full
      return {
        prompt: 'What does this query return?',
        code: q.code,
        correct: String(correct),
        wrong: [String(full), String(plus), String(sum(salaries)), 'NULL', String(correct + 5)],
        explanation: variant === 'plus'
          ? `Any math with NULL gives NULL, so salary + bonus is NULL for people with no bonus. SUM skips those NULL rows completely, losing their salary too: ${plus}.`
          : `COALESCE(bonus, 0) turns a NULL bonus into 0, so every row adds its salary. The total is ${full}.`,
        check: { sql: q.setup, query: q.query, format: 'first' },
      }
    },
  },
  {
    id: 'sql-correlated-avg',
    type: 'code-output',
    generate(r) {
      const t = makeEmployees(r)
      const avgOf = (rows) => sum(rows.map((row) => row[3])) / rows.length
      const correct = t.rows.filter((row) => row[3] > avgOf(t.rows.filter((x) => x[2] === row[2]))).length
      const overall = t.rows.filter((row) => row[3] > avgOf(t.rows)).length
      const q = employeeQuestion(t, 'SELECT name FROM employees e\nWHERE salary > (\n  SELECT AVG(salary) FROM employees\n  WHERE department = e.department\n);')
      return {
        prompt: r.pick(['How many rows does this query return?', 'How many people earn more than their own department\'s average?']),
        code: q.code,
        correct: String(correct),
        wrong: [String(overall), String(t.depts.length), String(6 - correct), ...nearby(correct)],
        explanation: `This is a correlated subquery: it uses e.department from the outer row, so the average is worked out again for each person's own department. ${correct} people earn more than their department's average. A department of one person never counts, because nobody beats their own average.`,
        check: { sql: q.setup, query: q.query, format: 'count' },
      }
    },
  },
  {
    id: 'sql-between',
    type: 'code-output',
    generate(r) {
      const prices = r.sample([5, 10, 12, 15, 18, 20, 25, 30], 6)
      const names = r.sample(PRODUCT_NAMES, 6)
      const rows = names.map((name, i) => [i + 1, name, prices[i]])
      const sorted = [...prices].sort((a, b) => a - b)
      const i = r.int(0, 2)
      const j = r.int(i + 2, 5)
      const inside = j - i + 1
      const not = r.chance(0.35)
      const q = tablesQuestion([{ name: 'products', columns: ['id', 'name', 'price'], rows }],
        `SELECT COUNT(*) FROM products\nWHERE price ${not ? 'NOT ' : ''}BETWEEN ${sorted[i]} AND ${sorted[j]};`)
      const correct = not ? 6 - inside : inside
      return {
        prompt: 'What number does this query return?',
        code: q.code,
        correct: String(correct),
        wrong: not
          ? [String(inside), String(6 - inside + 2), String(6 - inside + 1), ...nearby(correct)]
          : [String(inside - 2), String(inside - 1), String(6 - inside), ...nearby(correct)],
        explanation: `BETWEEN ${sorted[i]} AND ${sorted[j]} includes both ends, like price >= ${sorted[i]} AND price <= ${sorted[j]}. ${inside} prices are in that range${not ? `, so NOT BETWEEN keeps the other ${6 - inside}` : ''}.`,
        check: { sql: q.setup, query: q.query, format: 'first' },
      }
    },
  },

  // ---------- Multiple-choice templates (the scenario changes each time) ----------
  {
    id: 'sql-acid-scenario',
    type: 'multiple-choice',
    generate(r) {
      const cases = [
        ['Atomicity', 'A transfer takes money from one account, then the server crashes before adding it to the other. After restart the first change is undone.', 'Atomicity means all-or-nothing: if any part of a transaction fails, every change in it is rolled back.'],
        ['Atomicity', 'An order row is inserted, but inserting its items fails. The database removes the order row as well.', 'Atomicity means all-or-nothing: a transaction cannot be half applied.'],
        ['Consistency', 'A transaction would leave an order pointing at a customer that does not exist, so the database rejects the whole transaction.', 'Consistency means a transaction can only move the data from one valid state to another, respecting rules like foreign keys and CHECK constraints.'],
        ['Isolation', 'Two people book seats at the same moment, and neither one sees the other\'s half-finished booking.', 'Isolation means transactions running at the same time do not see each other\'s unfinished changes.'],
        ['Durability', 'The database confirms COMMIT, then the power goes out. After restart, the committed data is still there.', 'Durability means once a transaction is committed, it survives crashes and restarts (it is written to disk, not only memory).'],
      ]
      const [right, story, why] = r.pick(cases)
      return {
        prompt: `${story} Which ACID property is this?`,
        correct: right,
        wrong: ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
        explanation: `${why} ACID stands for Atomicity, Consistency, Isolation and Durability.`,
      }
    },
  },
  {
    id: 'sql-isolation-anomaly',
    type: 'multiple-choice',
    generate(r) {
      const cases = [
        ['Dirty read', 'Transaction A reads a price that transaction B changed but has not committed yet. Then B rolls back.', 'A dirty read is reading data that was never committed. The READ COMMITTED isolation level (the default in PostgreSQL) prevents it.'],
        ['Non-repeatable read', 'Transaction A reads the same row twice and gets different values, because B updated and committed it in between.', 'A non-repeatable read is when re-reading one row gives a new value. REPEATABLE READ or stricter isolation prevents it.'],
        ['Phantom read', 'Transaction A runs the same COUNT(*) query twice, and the second result is higher because B inserted a new matching row.', 'A phantom read is when new rows appear in a repeated query. SERIALIZABLE, the strictest isolation level, prevents it.'],
        ['Lost update', 'Two transactions read the same stock count, both subtract one and save, and one of the two changes disappears.', 'A lost update is when one write silently overwrites another. Fix it with UPDATE ... SET stock = stock - 1, row locks, or a stricter isolation level.'],
      ]
      const [right, story, why] = r.pick(cases)
      return {
        prompt: `${story} What is this problem called?`,
        correct: right,
        wrong: ['Dirty read', 'Non-repeatable read', 'Phantom read', 'Lost update'],
        explanation: why,
      }
    },
  },
  {
    id: 'sql-command-category',
    type: 'multiple-choice',
    generate(r) {
      const groups = {
        'DDL (Data Definition Language)': ['CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'TRUNCATE TABLE'],
        'DML (Data Manipulation Language)': ['INSERT', 'UPDATE', 'DELETE'],
        'DCL (Data Control Language)': ['GRANT', 'REVOKE'],
        'TCL (Transaction Control Language)': ['COMMIT', 'ROLLBACK', 'SAVEPOINT'],
      }
      const right = r.pick(Object.keys(groups))
      const command = r.pick(groups[right])
      return {
        prompt: r.pick([`Which category of SQL command is ${command}?`, `${command} belongs to which group of SQL commands?`]),
        correct: right,
        wrong: Object.keys(groups),
        explanation: 'DDL changes the structure (tables, columns). DML changes the data in rows. DCL manages permissions. TCL controls transactions.',
      }
    },
  },
  {
    id: 'sql-join-pick',
    type: 'multiple-choice',
    generate(r) {
      const cases = [
        ['LEFT JOIN', 'List every customer, including customers who have never placed an order.', 'customers LEFT JOIN orders keeps every customer from the left table, with NULL order columns when there is no match.'],
        ['LEFT JOIN', 'Show all products, and their reviews if they have any.', 'products LEFT JOIN reviews keeps every product, even ones with no reviews (their review columns are NULL).'],
        ['CROSS JOIN', 'Build every possible pair of shirt color and shirt size for a product catalog.', 'CROSS JOIN pairs every row of one table with every row of the other, which is exactly "all combinations".'],
        ['FULL OUTER JOIN', 'Compare two lists of emails and show every email from both, marking which list each one is missing from.', 'FULL OUTER JOIN keeps unmatched rows from both sides, so nothing from either list is lost.'],
        ['INNER JOIN', 'Show orders together with their customer name, skipping any order whose customer was deleted.', 'INNER JOIN keeps only rows that have a match on both sides.'],
      ]
      const [right, story, why] = r.pick(cases)
      return {
        prompt: `${story} Which join fits best?`,
        correct: right,
        wrong: ['INNER JOIN', 'LEFT JOIN', 'CROSS JOIN', 'FULL OUTER JOIN'],
        explanation: why,
      }
    },
  },

  // ---------- Fixed questions ----------
  {
    id: 'sql-inner-join',
    type: 'multiple-choice',
    prompt: 'Which JOIN returns only the rows that have a match in both tables?',
    options: ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN'],
    answer: 0,
    explanation: 'INNER JOIN keeps only matching rows. LEFT/RIGHT JOIN also keep unmatched rows from one side, and FULL OUTER JOIN keeps unmatched rows from both.',
  },
  {
    id: 'sql-keys',
    type: 'multiple-choice',
    prompt: ['What is a foreign key?', 'orders.customer_id points to customers.id. What is customer_id called?'],
    options: [
      'A column that references the primary key of another table',
      'A column whose values must be unique within its own table',
      'The column a table uses to uniquely identify its own rows',
      'An index the database adds automatically to speed up joins',
    ],
    answer: 0,
    explanation: 'A primary key uniquely identifies each row. A foreign key stores another table\'s primary key to link rows, and the database can stop you from pointing at rows that do not exist.',
  },
  {
    id: 'sql-where-having',
    type: 'multiple-choice',
    prompt: 'What is the difference between WHERE and HAVING?',
    options: [
      'WHERE filters rows before grouping; HAVING filters groups afterward',
      'HAVING filters rows before grouping; WHERE filters groups afterward',
      'WHERE works on text columns; HAVING works on number columns',
      'They do the same thing, but HAVING is faster on big tables',
    ],
    answer: 0,
    explanation: 'WHERE runs on individual rows, so it cannot use COUNT() or SUM(). HAVING runs on the grouped results, so HAVING COUNT(*) > 5 works.',
  },
  {
    id: 'sql-index',
    type: 'multiple-choice',
    prompt: ['What is the trade-off of adding an index to a table?', 'Why not add an index to every column?'],
    options: [
      'Reads get faster, but writes get slower and storage grows',
      'Reads and writes both get faster, at the cost of storage',
      'Writes get faster, but every read must check the index first',
      'Lookups get faster, but the column can no longer hold duplicates',
    ],
    answer: 0,
    explanation: 'An index is like a book\'s index: it finds rows fast without scanning the whole table. But every INSERT, UPDATE and DELETE must also update the index, and it takes disk space. Only a UNIQUE index forbids duplicates.',
  },
  {
    id: 'sql-injection',
    type: 'multiple-choice',
    prompt: ['What is the best way to prevent SQL injection?', 'Why is building a query like "SELECT * FROM users WHERE name = \'" + input + "\'" dangerous, and how do you fix it?'],
    options: [
      'Use parameterized queries so input is sent separately from the SQL',
      'Strip quote characters from the input in the browser before sending',
      'Check the input length so long attack strings get rejected early',
      'Keep the database password in an environment variable, not code',
    ],
    answer: 0,
    explanation: 'If input is pasted into SQL, a user can type \' OR 1=1 -- and change the query. Placeholders like WHERE name = ? send the value separately, so it is always treated as data. Browser checks can be skipped by an attacker.',
  },
  {
    id: 'sql-transaction',
    type: 'multiple-choice',
    prompt: 'You move money between two accounts with two UPDATE statements. Why wrap them in a transaction?',
    options: [
      'So both updates succeed together, or neither one is applied',
      'So the two updates run in parallel and finish more quickly',
      'So the database automatically retries an update that fails',
      'So other users are blocked from reading both accounts forever',
    ],
    answer: 0,
    explanation: 'A transaction is all-or-nothing (atomic). If the second update fails, ROLLBACK undoes the first, so money is never lost. This is the "A" in ACID.',
  },
  {
    id: 'sql-delete-truncate-drop',
    type: 'multiple-choice',
    prompt: 'What does DROP TABLE do that DELETE FROM does not?',
    options: [
      'It removes the table structure itself, not only the rows',
      'It removes all the rows, but much faster than DELETE does',
      'It removes all rows and resets the ID counter back to one',
      'It deletes the rows but keeps a backup you can restore later',
    ],
    answer: 0,
    explanation: 'DELETE removes rows (optionally with WHERE). TRUNCATE quickly removes all rows but keeps the table. DROP removes the whole table, columns and all.',
  },
  {
    id: 'sql-union',
    type: 'multiple-choice',
    prompt: 'What is the difference between UNION and UNION ALL?',
    options: [
      'UNION removes duplicate rows; UNION ALL keeps every row',
      'UNION ALL removes duplicate rows; UNION keeps every row',
      'UNION joins columns side by side; UNION ALL stacks the rows',
      'UNION needs matching column names; UNION ALL accepts any names',
    ],
    answer: 0,
    explanation: 'Both stack the results of two queries (with the same number of columns). UNION also removes duplicates, which costs extra work. If duplicates are fine or impossible, UNION ALL is faster.',
  },
  {
    id: 'sql-normalization',
    type: 'multiple-choice',
    prompt: 'What is the main goal of database normalization?',
    options: [
      'Store each fact once, to avoid duplicated and conflicting data',
      'Merge related tables into one, so queries need fewer joins',
      'Convert every value to one format, such as lowercase text',
      'Scale numeric columns so their values fall between 0 and 1',
    ],
    answer: 0,
    explanation: 'If a customer\'s address is copied into every order, changing it means many updates and risks mismatches. Normalization splits data into related tables linked by keys. Merging tables is the opposite (denormalization).',
  },
  {
    id: 'sql-vs-nosql',
    type: 'multiple-choice',
    prompt: 'Which statement about SQL and NoSQL databases is generally true?',
    options: [
      'SQL uses tables with a fixed schema; document stores allow flexible shapes',
      'NoSQL stores also use tables, but without primary or foreign keys',
      'SQL databases only scale for reads, so NoSQL must handle the writes',
      'NoSQL means there is no query language, only lookups by a key',
    ],
    answer: 0,
    explanation: 'Relational (SQL) databases like PostgreSQL enforce structure and are great at joins. Document stores like MongoDB allow each record to have a different shape, and many have rich query languages. The right choice depends on the data.',
  },
  {
    id: 'sql-n-plus-one',
    type: 'multiple-choice',
    prompt: 'Your page loads 50 posts, then runs one extra query per post to get its author. What is this called?',
    options: ['The N+1 query problem', 'A connection pool leak', 'A Cartesian product', 'A full table scan'],
    answer: 0,
    explanation: '1 query for the list plus N queries for details is slow. Fix it with a JOIN or one query like WHERE id IN (...), which most ORMs support ("eager loading").',
  },
  {
    id: 'sql-execution-order',
    type: 'multiple-choice',
    prompt: 'In what order does a database logically process these clauses?',
    options: [
      'FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY',
      'SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY',
      'FROM, WHERE, SELECT, GROUP BY, HAVING, ORDER BY',
      'FROM, SELECT, WHERE, GROUP BY, ORDER BY, HAVING',
    ],
    answer: 0,
    explanation: 'You write SELECT first, but it runs after the rows are found, filtered and grouped. That is why WHERE cannot use a column alias defined in SELECT, but ORDER BY can.',
  },
  {
    id: 'sql-like',
    type: 'multiple-choice',
    prompt: 'Which condition finds names that start with "Jo"?',
    options: ["name LIKE 'Jo%'", "name LIKE '%Jo'", "name = 'Jo*'", "name LIKE 'Jo_'"],
    answer: 0,
    explanation: "In LIKE, % matches any number of characters and _ matches exactly one. 'Jo%' means \"Jo followed by anything\". '%Jo' would match names ending in Jo, and 'Jo_' only matches three-letter names.",
  },
  {
    id: 'sql-composite-index',
    type: 'multiple-choice',
    prompt: 'A table has an index on (last_name, first_name). Which query can use it best?',
    options: [
      "WHERE last_name = 'Cohen'",
      "WHERE first_name = 'Dana'",
      "WHERE email = 'a@b.com'",
      "WHERE first_name LIKE 'Da%'",
    ],
    answer: 0,
    explanation: 'A composite index is sorted by the first column, then the second, like a phone book. It helps queries on last_name (or both), but not on first_name alone. This is the "leftmost prefix" rule.',
  },

  // ---------- New fixed questions ----------
  {
    id: 'sql-deadlock',
    type: 'multiple-choice',
    prompt: ['What is a deadlock in a database?', 'Which situation describes a deadlock?'],
    options: [
      'Two transactions each wait for a lock the other one holds',
      'One transaction holds a lock so long that other queries time out',
      'Two transactions update one row and the first change is lost',
      'A query reads data another transaction has not committed yet',
    ],
    answer: 0,
    explanation: 'In a deadlock, A waits for B and B waits for A, so neither can continue. The database notices and cancels one of them. Locking rows in the same order everywhere helps avoid it.',
  },
  {
    id: 'sql-index-not-used',
    type: 'multiple-choice',
    prompt: 'The users table has an index on email. Which WHERE clause usually cannot use that index?',
    options: [
      "WHERE email LIKE '%@gmail.com'",
      "WHERE email = 'dana@co.com'",
      "WHERE email LIKE 'dana%'",
      "WHERE email IN ('a@co.com', 'b@co.com')",
    ],
    answer: 0,
    explanation: 'An index is sorted from the start of the value, like a dictionary. A pattern that starts with % has no known beginning, so the database must scan every row. Wrapping the column in a function, like LOWER(email), has the same effect.',
  },
  {
    id: 'sql-primary-key',
    type: 'multiple-choice',
    prompt: ['Which rule does a primary key enforce?', 'What does declaring a column as PRIMARY KEY guarantee?'],
    options: [
      'Every value is unique, and no value can be NULL',
      'Every value is unique, but one row may be NULL',
      'Values must be numbers that go up by one each row',
      'The column is linked to the same column elsewhere',
    ],
    answer: 0,
    explanation: 'A primary key identifies each row, so it must be unique and NOT NULL. It does not have to be an auto-increment number; that is only a common choice.',
  },
  {
    id: 'sql-unique-vs-pk',
    type: 'multiple-choice',
    prompt: 'What is the difference between a UNIQUE constraint and a PRIMARY KEY?',
    options: [
      'A table has one primary key but can have several UNIQUE columns',
      'UNIQUE columns can never be NULL, but a primary key can be NULL',
      'A primary key may repeat across rows, but UNIQUE values may not',
      'UNIQUE works only on text columns; primary keys work on numbers',
    ],
    answer: 0,
    explanation: 'Both stop duplicates. A table has only one primary key, which also cannot be NULL. You can add UNIQUE to other columns, like email, and they usually allow NULL.',
  },
  {
    id: 'sql-on-delete-cascade',
    type: 'multiple-choice',
    prompt: 'orders.customer_id is a foreign key with ON DELETE CASCADE. What happens when you delete a customer?',
    options: [
      'All of their orders are deleted automatically as well',
      'The delete fails because orders still point to them',
      'Their orders stay, and customer_id is set to NULL',
      'Their orders are moved over to a default customer',
    ],
    answer: 0,
    explanation: 'CASCADE passes the delete on to the rows that point at the customer. Without it (the default), the delete is refused while orders still reference the customer. ON DELETE SET NULL would keep the orders with NULL instead.',
  },
  {
    id: 'sql-check-constraint',
    type: 'multiple-choice',
    prompt: 'You want the database itself to reject any product whose price is below zero. What should you add?',
    options: [
      'A CHECK constraint such as CHECK (price >= 0)',
      'A UNIQUE constraint on the price column',
      'A NOT NULL constraint on the price column',
      'A DEFAULT 0 value for the price column',
    ],
    answer: 0,
    explanation: 'CHECK runs a condition on every insert and update and rejects rows that fail it. NOT NULL only blocks missing values, and DEFAULT only fills in a value when none is given.',
  },
  {
    id: 'sql-1nf',
    type: 'multiple-choice',
    prompt: 'A users table has a tags column with values like "sql,react,node". Which normal form does this break?',
    options: ['First normal form (1NF)', 'Second normal form (2NF)', 'Third normal form (3NF)', 'Boyce-Codd normal form (BCNF)'],
    answer: 0,
    explanation: 'First normal form says each cell holds one single value, not a list. A list in a text column is hard to search and update. Put the tags in their own table with one row per user and tag.',
  },
  {
    id: 'sql-3nf',
    type: 'multiple-choice',
    prompt: 'An employees table stores both department_id and department_name. What is the problem with this design?',
    options: [
      'department_name depends on department_id, so copies can get out of sync',
      'department_id should be the primary key of the employees table instead',
      'department_name must be indexed, or every lookup will scan the table',
      'Two department columns break first normal form, which allows only one',
    ],
    answer: 0,
    explanation: 'The name is a fact about the department, not the employee. If a department is renamed, every employee row must change. Third normal form (3NF) says to keep it only in a departments table.',
  },
  {
    id: 'sql-denormalization',
    type: 'multiple-choice',
    prompt: 'When might a team choose to denormalize, for example by copying the customer name into every order?',
    options: [
      'When reads are very frequent and the joins have become too slow',
      'When the data changes often and every copy must stay in sync',
      'When the database has no support for foreign key constraints',
      'When the tables are small and storage space is very limited',
    ],
    answer: 0,
    explanation: 'Denormalization stores some data twice on purpose to skip joins and speed up reads. The cost is more storage and extra work to keep the copies in sync when data changes.',
  },
  {
    id: 'sql-orm',
    type: 'multiple-choice',
    prompt: ['What does an ORM such as Prisma, Sequelize or Hibernate do?', 'What is an ORM?'],
    options: [
      'It maps database rows to objects in your code',
      'It caches query results in memory to speed up reads',
      'It copies data between databases during a migration',
      'It turns a SQL database into a NoSQL document store',
    ],
    answer: 0,
    explanation: 'ORM means Object-Relational Mapping. You work with objects like user.posts and the ORM writes the SQL for you. The downside is that it can hide slow queries, like the N+1 problem.',
  },
  {
    id: 'sql-sharding-replication',
    type: 'multiple-choice',
    prompt: 'What is the difference between replication and sharding?',
    options: [
      'Replication copies the same data to servers; sharding splits data across them',
      'Sharding copies the same data to servers; replication splits data across them',
      'Replication is only used for backups; sharding is used for serving queries',
      'Replication works for SQL databases; sharding works only for NoSQL ones',
    ],
    answer: 0,
    explanation: 'Replication keeps full copies on several servers, which helps with reads and with failover if one server dies. Sharding gives each server only part of the data (for example users A-M and N-Z), which helps when one server cannot hold or write it all.',
  },
  {
    id: 'sql-view',
    type: 'multiple-choice',
    prompt: ['What is a view in SQL?', 'What do you get from CREATE VIEW active_users AS SELECT ...?'],
    options: [
      'A saved query that you can select from like a table',
      'A copy of a table that is refreshed every night',
      'A read-only user account limited to SELECT queries',
      'A temporary table that is dropped when you log out',
    ],
    answer: 0,
    explanation: 'A normal view stores only the query, not the data. Each time you select from it, the query runs again on the current data. (A "materialized view" is the variant that stores the results.)',
  },
  {
    id: 'sql-stored-procedure',
    type: 'multiple-choice',
    prompt: 'What is a stored procedure?',
    options: [
      'Named SQL code saved in the database that you can call',
      'A query the database runs by itself on a fixed schedule',
      'A saved backup of a table that can be restored later',
      'A rule that runs by itself whenever a row is inserted',
    ],
    answer: 0,
    explanation: 'A stored procedure is like a function that lives in the database: CALL transfer_money(1, 2, 50) runs its SQL there. Code that runs automatically when a row changes is a trigger, not a procedure.',
  },
  {
    id: 'sql-explain',
    type: 'multiple-choice',
    prompt: ['What does putting EXPLAIN before a SELECT do?', 'A query is slow. Why would you run EXPLAIN on it?'],
    options: [
      'Shows the plan the database will use, such as which indexes',
      'Runs the query and explains any syntax errors in plain words',
      'Rewrites the query into a faster form and then runs that',
      'Prints a description of every column in the selected table',
    ],
    answer: 0,
    explanation: 'EXPLAIN shows how the database plans to find the rows: which indexes it uses, or whether it scans the whole table. It is the first step when a query is slow.',
  },
  {
    id: 'sql-group-by-column',
    type: 'multiple-choice',
    prompt: 'Why does SELECT department, name, COUNT(*) FROM employees GROUP BY department fail in most databases?',
    options: [
      'name is not in GROUP BY and not inside an aggregate function',
      'COUNT(*) must be the first column listed after the SELECT',
      'GROUP BY needs a HAVING clause to know which groups to keep',
      'department must also be listed in an ORDER BY clause first',
    ],
    answer: 0,
    explanation: 'Each group (department) has many names, so the database cannot pick one. Every selected column must be in GROUP BY or wrapped in something like COUNT, MAX or MIN. (SQLite and old MySQL allow it and pick any row, which hides bugs.)',
  },
  {
    id: 'sql-window-vs-group',
    type: 'multiple-choice',
    prompt: 'What is the key difference between a window function like SUM(salary) OVER (...) and GROUP BY?',
    options: [
      'A window function keeps every row; GROUP BY collapses rows into groups',
      'GROUP BY keeps every row; a window function collapses rows into groups',
      'Window functions only work on dates; GROUP BY works on any column',
      'Window functions run before WHERE, so they can filter the rows',
    ],
    answer: 0,
    explanation: 'GROUP BY returns one row per group. A window function adds a calculated value to each row, so you can show each employee next to their department total or their rank.',
  },
  {
    id: 'sql-update-without-where',
    type: 'multiple-choice',
    prompt: 'What happens if you run UPDATE users SET active = 0; with no WHERE clause?',
    options: [
      'Every row in users gets active set to 0',
      'The database rejects it as a syntax error',
      'Only the most recently inserted row changes',
      'Only rows where active is NULL get updated',
    ],
    answer: 0,
    explanation: 'Without WHERE, UPDATE and DELETE apply to every row in the table. Run the WHERE as a SELECT first, or do it inside a transaction so you can ROLLBACK.',
  },
  {
    id: 'sql-correlated-subquery',
    type: 'multiple-choice',
    prompt: 'What makes a subquery "correlated"?',
    options: [
      'It uses a column from the outer query, so it runs once per row',
      'It returns more than one column, so it must go in the FROM clause',
      'It joins two tables inside the parentheses before the outer query',
      'It runs once before the outer query, and its result is reused',
    ],
    answer: 0,
    explanation: 'In WHERE salary > (SELECT AVG(salary) FROM employees WHERE department = e.department), the inner query uses e.department from the outer row, so its answer changes for each row. A normal subquery runs once.',
  },
  {
    id: 'sql-many-to-many',
    type: 'multiple-choice',
    prompt: 'Students can take many courses, and each course has many students. How do you usually model this?',
    options: [
      'A junction table with student_id and course_id columns',
      'A course_id column added to the students table',
      'A student_id column added to the courses table',
      'One students column holding a list of course IDs',
    ],
    answer: 0,
    explanation: 'One foreign key column can only point to one row. A junction table (like enrollments) holds one row per student-course pair, with a foreign key to each side.',
  },
  {
    id: 'sql-migration',
    type: 'multiple-choice',
    prompt: 'In a typical web project, what is a database migration?',
    options: [
      'A versioned script that changes the schema in a repeatable way',
      'Moving the whole database over to a new hosting provider',
      'Copying production data into the test database every night',
      'Converting the database from one SQL engine to another one',
    ],
    answer: 0,
    explanation: 'Migrations are files like 004_add_email_to_users that run in order. They keep every developer\'s and server\'s schema the same, and they live in version control with the code.',
  },
  {
    id: 'sql-index-choice',
    type: 'multiple-choice',
    prompt: 'A users table has millions of rows. Which column usually benefits LEAST from its own index?',
    options: [
      'is_active, a true or false flag',
      'email, used for login lookups',
      'created_at, used for date range filters',
      'username, used to search for profiles',
    ],
    answer: 0,
    explanation: 'An index helps when it narrows the search to a few rows. A true/false column splits the table into two huge halves, so the database often scans the table anyway. Columns with many different values gain the most.',
  },
  {
    id: 'sql-order-by-default',
    type: 'multiple-choice',
    prompt: ['What order does ORDER BY price use if you write neither ASC nor DESC?', 'SELECT * FROM products ORDER BY price; Which product comes first?'],
    options: [
      'Ascending, so the lowest price is first',
      'Descending, so the highest price is first',
      'The order in which rows were inserted',
      'A random order that changes every time',
    ],
    answer: 0,
    explanation: 'ASC (smallest to largest) is the default. Without any ORDER BY at all, the database may return rows in any order, so never rely on insert order.',
  },
]
