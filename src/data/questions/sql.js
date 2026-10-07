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
      'A key used to encrypt the table',
      'A column that must be unique in its own table',
      'An index on a text column',
    ],
    answer: 0,
    explanation: 'A primary key uniquely identifies each row. A foreign key stores another table\'s primary key to link rows, and the database can stop you from pointing at rows that do not exist.',
  },
  {
    id: 'sql-where-having',
    type: 'multiple-choice',
    prompt: 'What is the difference between WHERE and HAVING?',
    options: [
      'WHERE filters rows before grouping; HAVING filters groups after GROUP BY',
      'They are the same',
      'HAVING is faster than WHERE',
      'WHERE only works with numbers',
    ],
    answer: 0,
    explanation: 'WHERE runs on individual rows, so it cannot use COUNT() or SUM(). HAVING runs on the grouped results, so HAVING COUNT(*) > 5 works.',
  },
  {
    id: 'sql-index',
    type: 'multiple-choice',
    prompt: ['What is the trade-off of adding an index to a table?', 'Why not add an index to every column?'],
    options: [
      'Reads get faster, but writes get slower and the index uses extra storage',
      'There is no downside',
      'Indexes make every query slower',
      'Indexes delete duplicate rows',
    ],
    answer: 0,
    explanation: 'An index is like a book\'s index: it finds rows fast without scanning the whole table. But every INSERT, UPDATE and DELETE must also update the index.',
  },
  {
    id: 'sql-injection',
    type: 'multiple-choice',
    prompt: ['What is the best way to prevent SQL injection?', 'Why is building a query like "SELECT * FROM users WHERE name = \'" + input + "\'" dangerous?'],
    options: [
      'Use parameterized queries (placeholders) so input is never treated as SQL',
      'Remove all spaces from user input',
      'Only use SELECT statements',
      'Hide the database password',
    ],
    answer: 0,
    explanation: 'If input is pasted into SQL, a user can type \' OR 1=1 -- and change the query. Placeholders like WHERE name = ? send the value separately, so it is always treated as data.',
  },
  {
    id: 'sql-transaction',
    type: 'multiple-choice',
    prompt: 'You move money between two accounts with two UPDATE statements. Why wrap them in a transaction?',
    options: [
      'So both updates succeed together or neither happens',
      'To make the updates run faster',
      'To hide them from other users forever',
      'Transactions are only for SELECT queries',
    ],
    answer: 0,
    explanation: 'A transaction is all-or-nothing (atomic). If the second update fails, ROLLBACK undoes the first, so money is never lost. This is the "A" in ACID.',
  },
  {
    id: 'sql-delete-truncate-drop',
    type: 'multiple-choice',
    prompt: 'What does DROP TABLE do that DELETE FROM does not?',
    options: [
      'Removes the table itself, including its structure, not just the rows',
      'Only removes rows that match a WHERE',
      'Nothing; they are the same',
      'Creates a backup first',
    ],
    answer: 0,
    explanation: 'DELETE removes rows (optionally with WHERE). TRUNCATE quickly removes all rows but keeps the table. DROP removes the whole table.',
  },
  {
    id: 'sql-union',
    type: 'multiple-choice',
    prompt: 'What is the difference between UNION and UNION ALL?',
    options: [
      'UNION removes duplicate rows; UNION ALL keeps them all',
      'UNION ALL removes duplicates',
      'UNION only works on two columns',
      'There is no difference',
    ],
    answer: 0,
    explanation: 'Both stack the results of two queries. UNION also removes duplicates, which costs extra work. If duplicates are fine or impossible, UNION ALL is faster.',
  },
  {
    id: 'sql-normalization',
    type: 'multiple-choice',
    prompt: 'What is the main goal of database normalization?',
    options: [
      'Reduce duplicated data so each fact is stored in one place',
      'Make every table have exactly 10 columns',
      'Encrypt sensitive columns',
      'Speed up backups',
    ],
    answer: 0,
    explanation: 'If a customer\'s address is copied into every order, changing it means many updates and risks mismatches. Normalization splits data into related tables linked by keys.',
  },
  {
    id: 'sql-vs-nosql',
    type: 'multiple-choice',
    prompt: 'Which statement about SQL and NoSQL databases is generally true?',
    options: [
      'SQL databases use tables with a fixed schema; many NoSQL databases store flexible documents',
      'NoSQL databases cannot store JSON',
      'SQL databases cannot handle more than 1000 rows',
      'NoSQL means the database has no query language at all',
    ],
    answer: 0,
    explanation: 'Relational (SQL) databases like PostgreSQL enforce structure and are great at joins. Document stores like MongoDB allow flexible shapes. The right choice depends on the data.',
  },
  {
    id: 'sql-n-plus-one',
    type: 'multiple-choice',
    prompt: 'Your page loads 50 posts, then runs one extra query per post to get its author. What is this called?',
    options: ['The N+1 query problem', 'A deadlock', 'Normalization', 'A full table scan'],
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
      'SELECT, WHERE, FROM, ORDER BY, GROUP BY, HAVING',
      'FROM, SELECT, WHERE, ORDER BY, HAVING, GROUP BY',
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
    explanation: "In LIKE, % matches any number of characters and _ matches exactly one. 'Jo%' means \"Jo followed by anything\". '%Jo' would match names ending in Jo.",
  },
  {
    id: 'sql-composite-index',
    type: 'multiple-choice',
    prompt: 'A table has an index on (last_name, first_name). Which query can use it best?',
    options: [
      "WHERE last_name = 'Cohen'",
      "WHERE first_name = 'Dana'",
      "WHERE email = 'a@b.com'",
      'None of them can use it',
    ],
    answer: 0,
    explanation: 'A composite index is sorted by the first column, then the second, like a phone book. It helps queries on last_name (or both), but not on first_name alone.',
  },
]
