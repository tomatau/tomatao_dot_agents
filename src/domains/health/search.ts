import type { Row } from '../../lib/report'
import type { IndexFreshness } from '../search-sync/freshness'
import { indexFreshness } from '../search-sync/freshness'

function ago(iso: string): string {
  const hours = (Date.now() - Date.parse(iso)) / 3_600_000
  if (hours < 1) return 'built just now'
  if (hours < 48) return `built ${Math.round(hours)}h ago`
  return `built ${Math.round(hours / 24)}d ago`
}

function scopeDrift({ inScope, indexed }: IndexFreshness): string {
  // Equal counts still mean a different set: a note renamed, or one swapped
  // for another.
  return inScope === indexed
    ? `scope changed — ${inScope} notes, but not the same ones`
    : `scope changed — ${inScope} notes in scope, ${indexed} indexed`
}

function detailOf(freshness: IndexFreshness): string {
  const { inScope, edited, builtAt = '' } = freshness
  switch (freshness.reason) {
    case 'unrecorded':
      return 'build not recorded'
    case 'scope-changed':
      return scopeDrift(freshness)
    case 'notes-edited':
      return `${edited} of ${inScope} notes edited since it ${ago(builtAt)}`
    default:
      return freshness.state === 'missing'
        ? 'never built'
        : `${inScope} notes, ${ago(builtAt)}`
  }
}

/**
 * An index nobody can prove fresh is worse than none, so `just search-sync`
 * decides the state and this only says it out loud.
 */
export async function searchIndexRows(): Promise<Row[]> {
  return (await indexFreshness()).map(f => ({
    name: f.name,
    state: f.state,
    detail: detailOf(f),
  }))
}
