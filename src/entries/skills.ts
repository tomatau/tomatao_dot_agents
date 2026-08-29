import { listSkills, planSkillLinks, skillLinks } from '../domains/skills'
import { ensureLinks } from '../lib/links'
import { loadAdaptersConfig } from '../settings/adapters'

const skillPlan = planSkillLinks({
  config: skillLinks(await loadAdaptersConfig()),
  skills: await listSkills(),
})

for (const [harness, links] of Object.entries(skillPlan)) {
  for (const enforced of await ensureLinks({ links })) {
    console.log(
      `${harness.padEnd(9)}${enforced.result.padEnd(13)}${enforced.link.dest}`,
    )
  }
}
