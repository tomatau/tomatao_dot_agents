import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { Link } from '../lib/links'
import type { AdaptersConfig } from '../settings/adapters'
import { ensureLinks, inspectLink, isOwnedLink, retireLink } from '../lib/links'

/**
 * Destinations the file declares for a harness, on or off. A disabled harness
 * stays in `config/adapters.yml`, which is how a sync still finds its links and
 * can give them up; only the filtered view the adapters read excludes it.
 */
export function personalisationDestinations(
  declared: AdaptersConfig,
): string[] {
  return Object.values(declared).flatMap(cfg =>
    (cfg.personalisation ?? []).map(link => link.dest),
  )
}

/** Base directories a harness mirrors `skills/` into, on or off. */
export function skillDestinations(declared: AdaptersConfig): string[] {
  return Object.values(declared).flatMap(cfg =>
    Array.isArray(cfg.skills) ? cfg.skills.map(base => base.dest) : [],
  )
}

/**
 * Links this repo left behind at a declared destination and no longer wants.
 *
 * It works from what is on disk rather than from what could be named: a
 * destination is either a file or a directory of files, and the files in it
 * change without the declaration changing. Anything there that is a symlink
 * into this repo, and is not wanted now, is ours to retire. A real file is
 * somebody's own and is never touched.
 */
export async function strayLinks({
  destinations,
  wanted,
  ownedRoot,
}: {
  destinations: string[]
  wanted: Link[]
  ownedRoot: string
}): Promise<Link[]> {
  const keep = new Set(wanted.map(link => link.dest))
  const stray: Link[] = []
  for (const dest of destinations) {
    for (const path of await expansions(dest)) {
      if (keep.has(path)) continue
      const observed = await inspectLink(path)
      if (!isOwnedLink(observed, { dest: path, ownedRoot })) continue
      stray.push({ dest: path, target: observed.target })
    }
  }
  return stray
}

/** Inspect a symlink itself; only real directories may be scanned for child links. */
async function expansions(dest: string): Promise<string[]> {
  if ((await inspectLink(dest)).kind !== 'file') return [dest]
  try {
    const entries = await readdir(dest)
    return entries.map(name => join(dest, name))
  } catch {
    return [dest]
  }
}

/** Desired links and retired links share coordination, but have distinct operations. */
export async function reconcileLinks(options: {
  destinations: string[]
  wanted: Link[]
  ownedRoot: string
}): Promise<void> {
  const stray = await strayLinks(options)
  for (const { link, result } of await ensureLinks({ links: options.wanted })) {
    console.log(`${result.padEnd(13)}${link.dest}`)
  }
  for (const link of stray) {
    const result = await retireLink({
      dest: link.dest,
      ownedRoot: options.ownedRoot,
    })
    if (result === 'removed') console.log(`${result.padEnd(13)}${link.dest}`)
  }
}
