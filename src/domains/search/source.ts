import { existsSync } from 'node:fs'
import type { McpResolver, McpServer } from '../../lib/mcp'
import type { SearchIndex } from '../../settings/search'
import { requireString } from '../../lib/parse'
import { SEARCH_WHERE, loadSearchIndexes } from '../../settings/search'

/**
 * The stdio server, with its indexes passed as one JSON argument. It runs in
 * other repos under whatever toolchain they provide, so it reads no config of
 * its own. With no indexes there is nothing to offer, so there is no server.
 */
export function searchServer(
  indexes: SearchIndex[],
  entry: string,
  id: string,
  where: string,
  raw: Record<string, unknown>,
  exists: (path: string) => boolean = existsSync,
): McpServer[] {
  if (indexes.length === 0) return []
  const missing = indexes.find(index => !exists(index.db))
  if (missing) {
    throw new Error(
      `${SEARCH_WHERE}: index \`${missing.name}\` has no database at ${missing.db}`,
    )
  }
  const pinned = Object.fromEntries(
    indexes.map(({ name, db, description }) => [name, { db, description }]),
  )
  return [
    {
      name: id,
      transport: {
        kind: 'stdio',
        command: requireString(where, raw, 'command'),
        args: [entry, '--indexes', JSON.stringify(pinned)],
      },
    },
  ]
}

/** `entry` is passed in, as the entries layer decides where its files live. */
export const searchSource =
  (entry: string): McpResolver =>
  async (id, where, raw) =>
    searchServer(loadSearchIndexes(), entry, id, where, raw)
