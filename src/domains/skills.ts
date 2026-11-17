import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { Link, LinkState } from '../lib/links'
import type { AdaptersConfig, HarnessLinks } from '../settings/adapters'
import { checkLinks } from '../lib/links'
import { stripTrailingSlash } from '../lib/path'
import { loadAdaptersConfig, loadDeclaredHarnesses } from '../settings/adapters'
import { REPO, SKILLS_DIR } from '../settings/paths'
import { skillDestinations, reconcileLinks } from './reconcile'

/** Harnesses that mirror `skills/`, mapped to their base link. */
export function skillLinks(config: AdaptersConfig): HarnessLinks {
  return Object.fromEntries(
    Object.entries(config)
      .filter(([, c]) => Array.isArray(c.skills))
      .map(([harness, c]) => [harness, c.skills as HarnessLinks[string]]),
  )
}

/** Harnesses that discover `skills/` directly and need no linking. */
export function nativeSkillHarnesses(config: AdaptersConfig): string[] {
  return Object.entries(config)
    .filter(([, c]) => c.skills === 'native')
    .map(([harness]) => harness)
}

export function planSkillLinks({
  config,
  skills,
}: {
  config: HarnessLinks
  skills: string[]
}): HarnessLinks {
  return Object.fromEntries(
    Object.entries(config).map(([harness, baseLinks]) => [
      harness,
      baseLinks.flatMap(base =>
        skills.map(skill => ({
          dest: join(stripTrailingSlash(base.dest), skill),
          target: join(stripTrailingSlash(base.target), skill),
        })),
      ),
    ]),
  )
}

export async function listSkills(root = SKILLS_DIR): Promise<string[]> {
  const names = await Promise.all(
    (await readdir(root)).map(async name => {
      try {
        return (await stat(join(root, name))).isDirectory() ? name : null
      } catch {
        return null
      }
    }),
  )
  return names.filter((name): name is string => name !== null).sort()
}

export type SkillState = 'ok' | 'missing-skill-md'

export interface SkillCheck {
  name: string
  path: string
  state: SkillState
}

export async function inspectSkills(): Promise<SkillCheck[]> {
  return Promise.all(
    (await listSkills()).map(async name => {
      const path = join(SKILLS_DIR, name, 'SKILL.md')
      try {
        await stat(path)
        return { name, path, state: 'ok' }
      } catch {
        return { name, path, state: 'missing-skill-md' }
      }
    }),
  )
}

/**
 * A real directory where a skill link belongs is a skill of the same name that
 * another tool installs there and will install again. The harness keeps that
 * one, so it is reported rather than replaced or treated as a fault.
 */
const EXTERNAL = 'external'

export interface SkillLinkCheck {
  link: Link
  state: Exclude<LinkState, 'foreign-file'> | typeof EXTERNAL
}

export async function checkSkillLinks({
  links,
}: {
  links: Link[]
}): Promise<SkillLinkCheck[]> {
  return (await checkLinks({ links })).map(({ link, state }) => ({
    link,
    state: state === 'foreign-file' ? EXTERNAL : state,
  }))
}

export async function reconcileSkillLinks({
  destinations,
  planned,
  ownedRoot,
}: {
  destinations: string[]
  planned: Link[]
  ownedRoot: string
}): Promise<void> {
  const checks = await checkSkillLinks({ links: planned })
  const external = checks.filter(check => check.state === EXTERNAL)
  for (const { link } of external) {
    console.log(`${EXTERNAL.padEnd(13)}${link.dest}`)
  }
  await reconcileLinks({
    destinations,
    wanted: checks.filter(check => check.state !== EXTERNAL).map(c => c.link),
    ownedRoot,
  })
}

export async function linkSkills(): Promise<void> {
  const skills = await listSkills()
  const enabled = await loadAdaptersConfig()

  // What this machine wants: only enabled harnesses, only skills still present.
  const planned = Object.values(
    planSkillLinks({ config: skillLinks(enabled), skills }),
  ).flat()

  // A harness switched off here, or a skill that has been deleted, leaves a link
  // behind that nothing points at any more, so it is given up rather than kept.
  await reconcileSkillLinks({
    destinations: skillDestinations(await loadDeclaredHarnesses()),
    planned,
    ownedRoot: REPO,
  })
}
