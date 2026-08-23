import { loadAdapters } from "../adapters/index";
import { nativeSkillHarnesses } from "../adapters/native-skills";
import { loadConfig } from "../settings/config";
import { checkLinks, type LinkCheck } from "../lib/links";
import { listSkills, planSkillLinks } from "../domains/skills";

const COLUMN_WIDTH = 13;
const NATIVE_SKILLS_NOTE = "~/.agents/skills (discovered directly)";

interface NamedChecks {
  name: string;
  checks: LinkCheck[];
}

async function adapterChecks(): Promise<NamedChecks[]> {
  return Promise.all(
    (await loadAdapters()).map(async (adapter) => ({
      name: adapter.name,
      checks: await checkLinks({ links: await adapter.links() }),
    })),
  );
}

async function skillChecks(): Promise<NamedChecks[]> {
  const plan = planSkillLinks({
    config: await loadConfig("skills.yml"),
    skills: await listSkills(),
  });
  return Promise.all(
    Object.entries(plan).map(async ([name, links]) => ({
      name,
      checks: await checkLinks({ links }),
    })),
  );
}

function report({ name, checks }: NamedChecks): number {
  let failures = 0;
  for (const check of checks) {
    console.log(`${name.padEnd(9)}${check.state.padEnd(COLUMN_WIDTH)}${check.link.dest}`);
    if (check.state !== "ok") failures++;
  }
  return failures;
}

let failures = 0;
for (const named of [...(await adapterChecks()), ...(await skillChecks())]) {
  failures += report(named);
}
for (const name of nativeSkillHarnesses) {
  console.log(`${name.padEnd(9)}${"native".padEnd(COLUMN_WIDTH)}${NATIVE_SKILLS_NOTE}`);
}
process.exit(failures > 0 ? 1 : 0);
