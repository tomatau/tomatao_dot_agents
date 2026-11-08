import type { Remote } from '../../clients/git'
import type { Mode } from '../../lib/mode'
import { CANONICAL_REMOTE, addRemote, remotes } from '../../clients/git'
import { REPO } from '../../settings/paths'

/**
 * Which copy of the repository this checkout is.
 *
 * `origin` naming the canonical repo means this is a working copy of it. Any
 * other url means the checkout has become somebody's own fork, so the canonical
 * repo belongs at `upstream` instead, where a pull cannot fight their pushes.
 */
export type Arrangement =
  | { kind: 'working-copy'; origin: Remote }
  | { kind: 'fork'; origin: Remote }
  | { kind: 'none' }

/**
 * https and ssh spell the same repository differently; compare what is left.
 */
function sameRepo(url: string): boolean {
  const tail = (u: string) =>
    u
      .replace(/^[a-z]+:\/\//, '')
      .replace(/^[^@/]*@/, '')
      .replace(/^([^/]+):(?!\/)/, '$1/')
      .replace(/\.git$/, '')
      .replace(/\/$/, '')
      .toLowerCase()
  return tail(url) === tail(CANONICAL_REMOTE)
}

export async function arrangement(): Promise<Arrangement> {
  const origin = (await remotes(REPO)).find(r => r.name === 'origin')
  if (!origin) return { kind: 'none' }
  return sameRepo(origin.url)
    ? { kind: 'working-copy', origin }
    : { kind: 'fork', origin }
}

/** What bootstrap would do to the remotes, so it can be seen before it is done. */
export async function remotePlan(seen: Arrangement): Promise<string[]> {
  if (seen.kind === 'none') return [`add origin ${CANONICAL_REMOTE}`]
  if (seen.kind !== 'fork') return []
  const names = (await remotes(REPO)).map(remote => remote.name)
  return names.includes('upstream') ? [] : [`add upstream ${CANONICAL_REMOTE}`]
}

export async function applyRemotePlan(
  seen: Arrangement,
  mode: Mode,
): Promise<string[]> {
  const plan = await remotePlan(seen)
  if (mode.dryRun) return plan
  if (seen.kind === 'none') {
    await addRemote(REPO, 'origin', CANONICAL_REMOTE)
  } else if (seen.kind === 'fork') {
    await addRemote(REPO, 'upstream', CANONICAL_REMOTE)
  }
  return plan
}
