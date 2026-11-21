import { join } from 'node:path'
import type { SearchIndex } from './types'
import { documentCount } from '../../clients/fidx'
import { countModifiedSince } from '../../lib/files'
import { fidxDb } from '../../settings/paths'
import { vaultDir } from '../../settings/vault'
import { collectIndexFiles } from './collect'
import { loadSearchConfig } from './config'

export type StaleReason = 'scope-changed' | 'notes-edited'

export interface IndexFreshness {
  name: string
  state: 'fresh' | 'stale' | 'missing'
  reason?: StaleReason
  /** Notes the vault's declaration covers right now. */
  inScope: number
  /** Notes the database holds. */
  indexed?: number
  edited: number
  /** When a sync last ran: fidx rewrites the database even when nothing changed. */
  syncedAt?: string
}

/** What the facts about one index add up to; anything unproven is stale. */
export function judge(
  name: string,
  inScope: number,
  synced?: { indexed: number; syncedAt: string; edited: number },
): IndexFreshness {
  if (!synced) return { name, state: 'missing', inScope, edited: 0 }
  const facts = { name, inScope, ...synced }
  if (synced.indexed !== inScope) {
    return { ...facts, state: 'stale', reason: 'scope-changed' }
  }
  if (synced.edited > 0) {
    return { ...facts, state: 'stale', reason: 'notes-edited' }
  }
  return { ...facts, state: 'fresh' }
}

async function freshnessOf(index: SearchIndex): Promise<IndexFreshness> {
  const files = await collectIndexFiles(index)
  const db = Bun.file(fidxDb(index.name))
  if (!(await db.exists())) return judge(index.name, files.length)
  const vault = vaultDir()
  return judge(index.name, files.length, {
    indexed: await documentCount(fidxDb(index.name), index.name),
    syncedAt: new Date(db.lastModified).toISOString(),
    edited: await countModifiedSince(
      files.map(rel => join(vault, rel)),
      db.lastModified,
    ),
  })
}

export async function indexFreshness(): Promise<IndexFreshness[]> {
  const config = await loadSearchConfig()
  return Promise.all(config.indexes.map(freshnessOf))
}
