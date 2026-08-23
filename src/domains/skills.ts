import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { REPO } from "../settings/paths";
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
  const entries = await readdir(join(REPO, "skills"), { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}
