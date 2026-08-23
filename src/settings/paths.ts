import { homedir } from "node:os";
import { join } from "node:path";

export const REPO = join(import.meta.dir, "..", "..");
export const PERSONALISATION_DIR = join(REPO, "personalisation");
export const SKILLS_DIR = join(REPO, "skills");

export function displayPath(path: string): string {
  const home = homedir();
  return path.startsWith(home) ? `~${path.slice(home.length)}` : path;
}
