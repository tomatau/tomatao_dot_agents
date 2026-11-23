import { asRecord, asRecordOf, requireString } from '../lib/parse'
import { SEARCH_YML, configWhere, readConfigYaml, resolvePath } from './yaml'

export const SEARCH_WHERE = configWhere(SEARCH_YML)

export interface SearchIndex {
  /** What an agent passes to choose this index. */
  name: string
  /** The fidx database to search. */
  db: string
  /** What the index holds, so an agent can pick the right one. */
  description: string
}

/**
 * The indexes declared in `raw`, each a name mapped to its database and
 * description. A database path follows `resolvePath`. Declaring none, in any
 * form, offers none.
 */
export function parseSearchIndexes(raw: unknown): SearchIndex[] {
  const { indexes } = asRecordOf(SEARCH_WHERE, raw ?? {}, ['indexes'])
  const declared = asRecord(SEARCH_WHERE, indexes ?? {})
  return Object.entries(declared).map(([name, value]) => {
    const at = `${SEARCH_WHERE}: index \`${name}\``
    const index = asRecordOf(at, value, ['db', 'description'])
    return {
      name,
      db: resolvePath(requireString(at, index, 'db')),
      description: requireString(at, index, 'description'),
    }
  })
}

/** The indexes this machine offers agents. */
export function loadSearchIndexes(): SearchIndex[] {
  return parseSearchIndexes(readConfigYaml(SEARCH_YML))
}
