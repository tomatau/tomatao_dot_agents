const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/

export function parseFrontmatter(raw: string): {
  frontmatter: Record<string, unknown>
  frontmatterRaw: string
  body: string
} {
  const match = raw.match(FRONTMATTER_RE)
  if (!match) return { frontmatter: {}, frontmatterRaw: '', body: raw.trim() }
  let frontmatter: Record<string, unknown> = {}
  try {
    frontmatter = (Bun.YAML.parse(match[1]) as Record<string, unknown>) ?? {}
  } catch {
    frontmatter = {}
  }
  return {
    frontmatter,
    frontmatterRaw: match[1].trim(),
    body: raw.slice(match[0].length).trim(),
  }
}
