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

/** An optional list of strings; absent means empty. */
export function stringArray(
  where: string,
  raw: Record<string, unknown>,
  key: string,
): string[] {
  const value = raw[key]
  if (value === undefined) return []
  if (!Array.isArray(value) || value.some(v => typeof v !== 'string')) {
    throw new Error(`${where}: \`${key}\` must be a list of strings`)
  }
  return value as string[]
}

/** A value that must be a mapping; anything else is a malformed source. */
export function asRecord(
  where: string,
  value: unknown,
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${where}: expected a mapping`)
  }
  return value as Record<string, unknown>
}

/** A required list, left unexamined; the caller checks its items. */
export function requireList(
  where: string,
  raw: Record<string, unknown>,
  key: string,
): unknown[] {
  const value = raw[key]
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${where}: \`${key}\` must list at least one entry`)
  }
  return value
}
