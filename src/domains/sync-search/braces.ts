/**
 * Expand `{a,b}` alternatives into one pattern per branch.
 *
 * The vault declares its scope with Bun's glob syntax, which reads braces.
 * fidx matches with Python's `Path.glob`, which does not, so each branch has
 * to reach it as a pattern of its own. Groups may nest.
 */
export function expandBraces(pattern: string): string[] {
  const open = pattern.indexOf('{')
  if (open === -1) return [pattern]
  const close = matchingBrace(pattern, open)
  const prefix = pattern.slice(0, open)
  const suffix = pattern.slice(close + 1)
  return branches(pattern.slice(open + 1, close)).flatMap(branch =>
    expandBraces(prefix + branch + suffix),
  )
}

function matchingBrace(pattern: string, open: number): number {
  let depth = 0
  for (let i = open; i < pattern.length; i++) {
    if (pattern[i] === '{') depth++
    if (pattern[i] === '}' && --depth === 0) return i
  }
  throw new Error(`unbalanced braces in \`${pattern}\``)
}

/** Split on the commas of this group only, not those of a nested one. */
function branches(group: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < group.length; i++) {
    if (group[i] === '{') depth++
    if (group[i] === '}') depth--
    if (group[i] === ',' && depth === 0) {
      parts.push(group.slice(start, i))
      start = i + 1
    }
  }
  parts.push(group.slice(start))
  return parts
}
