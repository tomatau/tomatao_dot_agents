import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { REPO } from "./paths";

export interface AdapterLink {
  dest: string;
  target: string;
}

export type AdaptersConfig = Record<string, AdapterLink[]>;

function resolvePath(path: string): string {
  if (path.startsWith("~")) return join(homedir(), path.slice(1));
  if (path.startsWith("/")) return path;
  return join(REPO, path);
}

function resolveLinks(links?: AdapterLink[]): AdapterLink[] {
  if (!links) throw new Error("adapter missing links in adapters.yml");
  return links.map((l) => ({
    ...l,
    dest: resolvePath(l.dest),
    target: resolvePath(l.target),
  }));
}

export async function loadConfig(file = "adapters.yml"): Promise<AdaptersConfig> {
  const raw = await readFile(join(REPO, "config", file), "utf8");
  const parsed = Bun.YAML.parse(raw) as AdaptersConfig;
  return Object.fromEntries(
    Object.entries(parsed).map(([name, links]) => [name, resolveLinks(links)]),
  );
}
