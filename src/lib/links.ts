import { lstat, mkdir, readlink, symlink, unlink } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'

export interface Link {
  dest: string
  target: string
}

export type LinkState =
  | 'ok'
  | 'missing'
  | 'wrong-target'
  | 'foreign-file'
  /** A symlink into this repo to something the repo no longer puts here. */
  | 'unwanted'

export type EnforceResult = 'ok' | 'linked' | 'retargeted'

export interface LinkCheck {
  link: Link
  state: LinkState
}

export interface EnforcedLink {
  link: Link
  result: EnforceResult
}

export type LinkObservation =
  | { kind: 'missing' }
  | { kind: 'file' }
  | { kind: 'symlink'; target: string }

export function classifyLink({
  expectedTarget,
  observed,
}: {
  expectedTarget: string
  observed: LinkObservation
}): LinkState {
  if (observed.kind === 'missing') return 'missing'
  if (observed.kind === 'file') return 'foreign-file'
  return observed.target === expectedTarget ? 'ok' : 'wrong-target'
}

async function observeLink(dest: string): Promise<LinkObservation> {
  try {
    const st = await lstat(dest)
    if (!st.isSymbolicLink()) return { kind: 'file' }
    return { kind: 'symlink', target: await readlink(dest) }
  } catch {
    return { kind: 'missing' }
  }
}

export async function inspectLinks({
  links,
}: {
  links: Link[]
}): Promise<LinkObservation[]> {
  return Promise.all(links.map(link => observeLink(link.dest)))
}

export async function checkLinks({
  links,
}: {
  links: Link[]
}): Promise<LinkCheck[]> {
  const observations = await inspectLinks({ links })
  return links.map((link, i) => ({
    link,
    state: classifyLink({
      expectedTarget: link.target,
      observed: observations[i],
    }),
  }))
}

export { observeLink as inspectLink }

/** Resolve relative link targets before checking directory containment, even for broken links. */
export function isOwnedLink(
  observed: LinkObservation,
  { dest, ownedRoot }: { dest: string; ownedRoot: string },
): observed is Extract<LinkObservation, { kind: 'symlink' }> {
  if (observed.kind !== 'symlink') return false
  const within = relative(
    resolve(ownedRoot),
    resolve(dirname(dest), observed.target),
  )
  return (
    within !== '..' && !within.startsWith(`..${sep}`) && !isAbsolute(within)
  )
}

/** Recheck ownership at the point of removal; foreign links and real files stay untouched. */
export async function retireLink({
  dest,
  ownedRoot,
}: {
  dest: string
  ownedRoot: string
}): Promise<'ok' | 'removed'> {
  const observed = await observeLink(dest)
  if (!isOwnedLink(observed, { dest, ownedRoot })) return 'ok'
  await unlink(dest)
  return 'removed'
}

export async function ensureLink({
  link,
}: {
  link: Link
}): Promise<EnforceResult> {
  await mkdir(dirname(link.dest), { recursive: true })
  const observed = await observeLink(link.dest)
  const state = classifyLink({ expectedTarget: link.target, observed })
  if (state === 'ok') return 'ok'
  if (state === 'foreign-file')
    throw new Error(`refusing to replace non-symlink ${link.dest}`)
  if (state === 'wrong-target') await unlink(link.dest)
  await symlink(link.target, link.dest)
  return state === 'missing' ? 'linked' : 'retargeted'
}

export async function ensureLinks({
  links,
}: {
  links: Link[]
}): Promise<EnforcedLink[]> {
  const results = await Promise.all(links.map(link => ensureLink({ link })))
  return links.map((link, i) => ({ link, result: results[i] }))
}
