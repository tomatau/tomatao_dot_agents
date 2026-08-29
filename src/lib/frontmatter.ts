const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/

export interface Frontmatter {
  frontmatter: Record<string, unknown>
  frontmatterRaw: string
  body: string
}

/**
 * Split a note into its frontmatter and body. `where` names the note, because a
 * malformed block is a fault in that file: swallowing it would drop the tags a
 * document is meant to carry and sync it as though it had none.
 */
export function parseFrontmatter(where: string, raw: string): Frontmatter {
  const match = raw.match(FRONTMATTER_RE)
  if (!match) return { frontmatter: {}, frontmatterRaw: '', body: raw.trim() }

  let parsed: unknown
  try {
    parsed = Bun.YAML.parse(match[1])
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`${where}: frontmatter is not valid YAML — ${detail}`)
  }
  if (
    parsed !== null &&
    (typeof parsed !== 'object' || Array.isArray(parsed))
  ) {
    throw new Error(`${where}: frontmatter must be a mapping`)
  }
  return {
    frontmatter: (parsed as Record<string, unknown>) ?? {},
    frontmatterRaw: match[1].trim(),
    body: raw.slice(match[0].length).trim(),
  }
}
