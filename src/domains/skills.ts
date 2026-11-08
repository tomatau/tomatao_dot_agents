import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { AdaptersConfig, HarnessLinks } from '../settings/adapters'
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

export async function listSkills(): Promise<string[]> {
  const entries = await readdir(SKILLS_DIR, { withFileTypes: true })
  return entries
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .sort()
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

export async function linkSkills(): Promise<void> {
  const skills = await listSkills()
  const enabled = await loadAdaptersConfig()

  // What this machine wants: only enabled harnesses, only skills still present.
  const wanted = Object.values(
    planSkillLinks({ config: skillLinks(enabled), skills }),
  ).flat()

  // A harness switched off here, or a skill that has been deleted, leaves a link
  // behind that nothing points at any more, so it is given up rather than kept.
  await reconcileLinks({
    destinations: skillDestinations(await loadDeclaredHarnesses()),
    wanted,
    ownedRoot: REPO,
  })
}
