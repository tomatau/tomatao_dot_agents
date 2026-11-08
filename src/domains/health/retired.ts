import type { Link } from '../../lib/links'
import type { Row } from '../../lib/report'
import { REPO } from '../../settings/paths'
import { displayPath } from '../../settings/paths'
import { strayLinks } from '../reconcile'

/**
 * A link this repo left behind for something it no longer wants here: a harness
 * switched off, or a skill that has been deleted. Retiring one is `just sync`'s
 * job, so this only says it is still there.
 */
export async function retiredLinkRows({
  destinations,
  wanted,
}: {
  destinations: string[]
  wanted: Link[]
}): Promise<Row[]> {
  const stray = await strayLinks({
    destinations,
    wanted,
    ownedRoot: REPO,
  })
  return stray.map(link => ({
    state: 'unwanted',
    detail: displayPath(link.dest),
  }))
}
