import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { SyncCache, SyncPlan, VaultDocument } from './types'
import { VAULT_SYNC_CACHE } from '../../settings/paths'
import { collectVaultDocuments } from './collect'

export async function loadCache(): Promise<SyncCache> {
  try {
    const raw = await readFile(VAULT_SYNC_CACHE, 'utf8')
    return JSON.parse(raw) as SyncCache
  } catch {
    return { version: 1, entries: {} }
  }
}

export async function saveCache(cache: SyncCache): Promise<void> {
  await mkdir(dirname(VAULT_SYNC_CACHE), { recursive: true })
  await writeFile(VAULT_SYNC_CACHE, `${JSON.stringify(cache, null, 2)}\n`)
}

/**
 * Build the sync plan. Purge is computed against the union of `remoteIds` (what
 * the bank actually holds) and the local cache, so a lost cache still can't
 * strand documents — the declarative-purge contract holds regardless.
 */
export async function planSync(remoteIds: string[] = []): Promise<SyncPlan> {
  const desired = await collectVaultDocuments()
  const cache = await loadCache()
  const toAdd: VaultDocument[] = []
  const toUpdate: VaultDocument[] = []
  const unchanged: VaultDocument[] = []
  for (const [id, doc] of desired) {
    const prev = cache.entries[id]
    if (!prev) toAdd.push(doc)
    else if (prev !== doc.hash) toUpdate.push(doc)
    else unchanged.push(doc)
  }
  const known = new Set<string>([...Object.keys(cache.entries), ...remoteIds])
  const toPurge = [...known].filter(id => !desired.has(id))
  return { desired, cache, toAdd, toUpdate, unchanged, toPurge }
}
