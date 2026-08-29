import type { VaultDocument } from './types'
import {
  deleteDocument,
  listDocumentIds,
  type RetainItem,
  retainDocuments,
} from '../../clients/hindsight/documents'
import { planSync, saveCache } from './cache'

const BANK = 'profile'

export interface SyncResult {
  added: number
  updated: number
  purged: number
  unchanged: number
}

export async function syncProfile(
  opts: { dryRun?: boolean } = {},
): Promise<SyncResult> {
  const remoteIds = await listDocumentIds(BANK)
  const plan = await planSync(remoteIds)
  const added = plan.toAdd.length
  const updated = plan.toUpdate.length
  const purged = plan.toPurge.length
  const unchanged = plan.unchanged.length

  console.log(
    `profile sync plan — ${added} added, ${updated} updated, ${purged} purged, ${unchanged} unchanged`,
  )
  if (added + updated > 0) {
    console.log(
      [...plan.toAdd, ...plan.toUpdate]
        .map(d => `  ${d.documentId}`)
        .join('\n'),
    )
  }
  if (purged > 0)
    console.log(plan.toPurge.map(id => `  purge ${id}`).join('\n'))

  if (opts.dryRun) {
    console.log('(dry-run, no writes)')
    return { added, updated, purged, unchanged }
  }

  // Track the cache against what has actually landed and persist after each
  // step, so a mid-run API failure leaves an accurate record rather than
  // forcing a full re-sync against stale state.
  const entries: Record<string, string> = { ...plan.cache.entries }

  for (const id of plan.toPurge) {
    console.log(`purging  ${id}`)
    await deleteDocument(BANK, id)
    delete entries[id]
    await saveCache({ version: 1, entries })
  }

  const toWrite: VaultDocument[] = [...plan.toAdd, ...plan.toUpdate]
  const BATCH = 10
  for (let i = 0; i < toWrite.length; i += BATCH) {
    const batch = toWrite.slice(i, i + BATCH)
    console.log(
      `retaining batch ${i / BATCH + 1}/${Math.ceil(toWrite.length / BATCH)} (${batch.length} docs)`,
    )
    await retainDocuments(
      BANK,
      batch.map(
        (d): RetainItem => ({
          content: d.body,
          document_id: d.documentId,
          tags: d.tags,
          update_mode: 'replace',
        }),
      ),
    )
    for (const d of batch) entries[d.documentId] = d.hash
    await saveCache({ version: 1, entries })
  }

  console.log(`cache updated — ${Object.keys(entries).length} entries`)
  return { added, updated, purged, unchanged }
}
