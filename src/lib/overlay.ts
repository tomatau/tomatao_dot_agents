type Mapping = Record<string, unknown>

const isMapping = (value: unknown): value is Mapping =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * `local` laid over `shared`. Mappings merge key by key at every depth; a
 * scalar or a list replaces what it covers whole. An absent `local` changes
 * nothing.
 */
export function overlay(shared: unknown, local: unknown): unknown {
  if (local === undefined) return shared
  if (!isMapping(shared) || !isMapping(local)) return local
  const merged: Mapping = { ...shared }
  for (const [key, value] of Object.entries(local)) {
    merged[key] = overlay(shared[key], value)
  }
  return merged
}
