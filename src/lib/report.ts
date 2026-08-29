import { bold, dim, green, red, terminalWidth, yellow } from './colour'

export interface Row {
  name?: string
  state: string
  detail: string
}

export interface Section {
  title: string
  rows: Row[]
  /** Context only: never counted, never fails the run. */
  informational?: boolean
}

export type Severity = 'pass' | 'warn' | 'fail' | 'info'

/**
 * Every state any check can report, graded once so the glyph on a row and the
 * count in the summary can never disagree. `warn` is what `just sync` puts
 * right; `fail` needs a person.
 */
const SEVERITIES: Record<string, Severity> = {
  ok: 'pass',
  fresh: 'pass',
  local: 'pass',
  added: 'pass',
  updated: 'pass',
  created: 'pass',
  linked: 'pass',
  retargeted: 'pass',
  native: 'info',
  stale: 'warn',
  missing: 'warn',
  'wrong-url': 'warn',
  'wrong-target': 'warn',
  'broken-link': 'warn',
  'missing-skill-md': 'warn',
  conflict: 'fail',
  'foreign-file': 'fail',
  error: 'fail',
}

/** An unknown state is a failure, so a new check cannot pass by accident. */
export function severityOf(state: string): Severity {
  return SEVERITIES[state] ?? 'fail'
}

const GLYPH: Record<Severity, string> = {
  pass: '✔',
  warn: '▲',
  fail: '✖',
  info: '·',
}

const PAINT: Record<Severity, (text: string) => string> = {
  pass: green,
  warn: yellow,
  fail: red,
  info: dim,
}

const HEADING_INDENT = '  '
const ROW_INDENT = '    '

/** A title followed by a rule out to the right margin, marking the group. */
function heading(title: string): string {
  const fill = terminalWidth() - HEADING_INDENT.length - title.length - 1
  return `${HEADING_INDENT}${bold(title)} ${dim('─'.repeat(Math.max(fill, 3)))}`
}

/**
 * Dim a path down to its last segment, so the eye lands on the file name.
 * Anything that is not a path — a server name, an error message — is left be.
 */
function paintDetail(detail: string): string {
  if (!detail.startsWith('/') && !detail.startsWith('~/')) return detail
  const cut = detail.lastIndexOf('/')
  return dim(detail.slice(0, cut + 1)) + detail.slice(cut + 1)
}

export function printSection({ title, rows }: Section): void {
  if (rows.length === 0) return
  console.log(`\n${heading(title)}`)
  const nameWidth = Math.max(...rows.map(r => (r.name ?? '').length))
  const stateWidth = Math.max(...rows.map(r => r.state.length))
  let previous: string | undefined
  for (const row of rows) {
    const severity = severityOf(row.state)
    const paint = PAINT[severity]
    // A run of rows for one harness names it once; the rest read as its group.
    const label = row.name === previous ? '' : (row.name ?? '')
    previous = row.name
    const name = nameWidth > 0 ? `${bold(label.padEnd(nameWidth))}  ` : ''
    console.log(
      `${ROW_INDENT}${name}${paint(GLYPH[severity])} ${paint(row.state.padEnd(stateWidth))}  ${paintDetail(row.detail)}`,
    )
  }
}

export interface Tally {
  ok: number
  /** Rows `just sync` can fix. */
  warnings: number
  /** Rows needing a person. */
  failures: number
}

export function tally(sections: Section[]): Tally {
  const counts: Tally = { ok: 0, warnings: 0, failures: 0 }
  for (const section of sections) {
    if (section.informational) continue
    for (const row of section.rows) {
      const severity = severityOf(row.state)
      if (severity === 'pass') counts.ok++
      else if (severity === 'warn') counts.warnings++
      else if (severity === 'fail') counts.failures++
    }
  }
  return counts
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

export function printSummary({ ok, warnings, failures }: Tally): void {
  const parts = [green(`${GLYPH.pass} ${ok} ok`)]
  if (warnings > 0) parts.push(yellow(`${GLYPH.warn} ${warnings} to sync`))
  if (failures > 0) {
    parts.push(red(`${GLYPH.fail} ${plural(failures, 'problem')}`))
  }
  console.log(`\n${HEADING_INDENT}${parts.join('   ')}`)
}
