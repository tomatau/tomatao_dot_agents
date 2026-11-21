import { asRecord, requireString } from '../lib/parse'
import {
  SEARCH_LOCAL_YML,
  configWhere,
  readLocalConfigYaml,
  resolvePath,
} from './yaml'

const WHERE = configWhere(SEARCH_LOCAL_YML)

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
 * description. A database path follows `resolvePath`.
 */
export function parseSearchIndexes(raw: unknown): SearchIndex[] {
  const indexes = asRecord(WHERE, asRecord(WHERE, raw ?? {}).indexes ?? {})
  const entries = Object.entries(indexes)
  if (entries.length === 0) {
    throw new Error(`${WHERE}: \`indexes\` must declare at least one index`)
  }
  return entries.map(([name, value]) => {
    const at = `${WHERE}: index \`${name}\``
    const index = asRecord(at, value)
    return {
      name,
      db: resolvePath(requireString(at, index, 'db')),
      description: requireString(at, index, 'description'),
    }
  })
}

/**
 * The indexes this machine offers agents. The databases sit in different
 * places on each machine, so they are declared in a file git ignores. A
 * machine without that file offers none.
 */
export function loadSearchIndexes(): SearchIndex[] {
  const declared = readLocalConfigYaml(SEARCH_LOCAL_YML)
  return declared === undefined ? [] : parseSearchIndexes(declared)
}
