import { join } from 'node:path'
import type { SearchIndex } from './types'
import { documentsHash, lastBuilds } from '../../clients/leann/state'
import { countModifiedSince } from '../../lib/files'
import { leannIndexMeta } from '../../settings/paths'
import { vaultDir } from '../../settings/vault'
import { collectIndexFiles } from './collect'
import { loadSearchConfig } from './config'

export type StaleReason = 'unrecorded' | 'scope-changed' | 'notes-edited'

export interface IndexFreshness {
  name: string
  state: 'fresh' | 'stale' | 'missing'
  reason?: StaleReason
  /** Notes the vault's declaration covers right now. */
  inScope: number
  /** Notes the last recorded build covered. */
  indexed?: number
  edited: number
  builtAt?: string
}

/**
 * Facts, not wording: a caller decides whether to rebuild or to report, and
 * anything that cannot be proven fresh is stale rather than assumed current.
 */
async function freshnessOf(index: SearchIndex): Promise<IndexFreshness> {
  const { name } = index
  const files = await collectIndexFiles(index)
  const inScope = files.length
  const built = (await lastBuilds())[name]
  if (!(await Bun.file(leannIndexMeta(name)).exists())) {
    return { name, state: 'missing', inScope, edited: 0 }
  }
  if (!built) {
    return { name, state: 'stale', reason: 'unrecorded', inScope, edited: 0 }
  }
  const { builtAt, documentCount: indexed } = built
  const common = { name, inScope, indexed, builtAt }
  if (built.documentsHash !== documentsHash(files)) {
    return { ...common, state: 'stale', reason: 'scope-changed', edited: 0 }
  }
  const vault = vaultDir()
  const paths = files.map(rel => join(vault, rel))
  const edited = await countModifiedSince(paths, Date.parse(builtAt))
  const state = edited > 0 ? 'stale' : 'fresh'
  const reason = edited > 0 ? ('notes-edited' as const) : undefined
  return { ...common, state, reason, edited }
}

export async function indexFreshness(): Promise<IndexFreshness[]> {
  const config = await loadSearchConfig()
  return Promise.all(config.indexes.map(freshnessOf))
}
