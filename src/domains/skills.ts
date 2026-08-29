import { access, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { AdaptersConfig, HarnessLinks } from '../settings/config'
import { stripTrailingSlash } from '../lib/path'
import { SKILLS_DIR } from '../settings/paths'

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
        await access(path)
        return { name, path, state: 'ok' }
      } catch {
        return { name, path, state: 'missing-skill-md' }
      }
    }),
  )
}
