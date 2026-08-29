import type { Row, Section } from '../../lib/report'
import { checkLinks } from '../../lib/links'
import { loadAdaptersConfig } from '../../settings/adapters'
import { SKILLS_DIR, displayPath } from '../../settings/paths'
import {
  inspectSkills,
  listSkills,
  planSkillLinks,
  skillLinks,
} from '../skills'

export async function skillSourceRows(): Promise<Row[]> {
  return (await inspectSkills()).map(c => ({
    state: c.state,
    detail: c.path,
  }))
}

export async function skillLinkRows(): Promise<Row[]> {
  const plan = planSkillLinks({
    config: skillLinks(await loadAdaptersConfig()),
    skills: await listSkills(),
  })
  const rows: Row[] = []
  for (const [name, links] of Object.entries(plan)) {
    for (const check of await checkLinks({ links })) {
      rows.push({ name, state: check.state, detail: check.link.dest })
    }
  }
  return rows
}

export function nativeSection(harnesses: string[]): Section {
  return {
    title: 'native skills',
    rows: harnesses.map(name => ({
      name,
      state: 'native',
      detail: `${displayPath(SKILLS_DIR)} (discovered directly)`,
    })),
    failures: 0,
    informational: true,
  }
}
