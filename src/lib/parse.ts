/** Field readers for hand-written config: every miss throws naming its source. */

export function requireString(
  where: string,
  raw: Record<string, unknown>,
  key: string,
): string {
  const value = raw[key]
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${where}: missing \`${key}\``)
  }
  return value.trim()
}

/** A required absolute URL, rejected early rather than at request time. */
export function requireUrl(
  where: string,
  raw: Record<string, unknown>,
  key: string,
): string {
  const value = requireString(where, raw, key)
  try {
    new URL(value)
  } catch {
    throw new Error(`${where}: \`${key}\` is not a valid URL (${value})`)
  }
  return value.replace(/\/$/, '')
}
