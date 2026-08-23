import { access, readdir } from "node:fs/promises";
import { join } from "node:path";
import { SKILLS_DIR } from "../settings/paths";
import { stripTrailingSlash } from "../lib/path";
import type { AdaptersConfig } from "../settings/config";

export function planSkillLinks({
  config,
  skills,
}: {
  config: AdaptersConfig;
  skills: string[];
}): AdaptersConfig {
  return Object.fromEntries(
    Object.entries(config).map(([harness, baseLinks]) => [
      harness,
      baseLinks.flatMap((base) =>
        skills.map((skill) => ({
          dest: join(stripTrailingSlash(base.dest), skill),
          target: join(stripTrailingSlash(base.target), skill),
        })),
      ),
    ]),
  );
}

export async function listSkills(): Promise<string[]> {
  const entries = await readdir(SKILLS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

export type SkillState = "ok" | "missing-skill-md";

export interface SkillCheck {
  name: string;
  path: string;
  state: SkillState;
}

export async function inspectSkills(): Promise<SkillCheck[]> {
  return Promise.all(
    (await listSkills()).map(async (name) => {
      const path = join(SKILLS_DIR, name, "SKILL.md");
      try {
        await access(path);
        return { name, path, state: "ok" };
      } catch {
        return { name, path, state: "missing-skill-md" };
      }
    }),
  );
}
