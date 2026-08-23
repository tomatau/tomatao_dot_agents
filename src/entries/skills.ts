import { loadConfig } from "../settings/config";
import { ensureLinks } from "../lib/links";
import { listSkills, planSkillLinks } from "../domains/skills";

const skillPlan = planSkillLinks({
  config: await loadConfig("skills.yml"),
  skills: await listSkills(),
});

for (const [harness, links] of Object.entries(skillPlan)) {
  for (const enforced of await ensureLinks({ links })) {
    console.log(`${harness.padEnd(9)}${enforced.result.padEnd(13)}${enforced.link.dest}`);
  }
}
