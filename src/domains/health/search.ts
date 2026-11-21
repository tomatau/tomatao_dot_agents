import type { Row } from '../../lib/report'
import type { IndexFreshness } from '../sync-search/freshness'
import { indexFreshness } from '../sync-search/freshness'

function ago(iso: string): string {
  const hours = (Date.now() - Date.parse(iso)) / 3_600_000
  if (hours < 1) return 'synced just now'
  if (hours < 48) return `synced ${Math.round(hours)}h ago`
  return `synced ${Math.round(hours / 24)}d ago`
}

function detailOf(freshness: IndexFreshness): string {
  const { inScope, indexed, edited, syncedAt = '' } = freshness
  switch (freshness.reason) {
    case 'scope-changed':
      return `scope changed — ${inScope} notes in scope, ${indexed} indexed`
    case 'notes-edited':
      return `${edited} of ${inScope} notes edited since it ${ago(syncedAt)}`
    default:
      return freshness.state === 'missing'
        ? 'never synced'
        : `${inScope} notes, ${ago(syncedAt)}`
  }
}

/**
 * An index nobody can prove fresh is worse than none, so the freshness check
 * decides the state and this only says it out loud.
 */
export async function searchIndexRows(): Promise<Row[]> {
  return (await indexFreshness()).map(f => ({
    name: f.name,
    state: f.state,
    detail: detailOf(f),
  }))
}
