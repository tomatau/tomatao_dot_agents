import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { REPO } from "./paths";

export function vaultDir(): string {
  const dir = process.env.VAULT_DIR?.trim();
  if (!dir) throw new Error("VAULT_DIR not set — add it to hindsight/env.local (see env.example)");
  return dir;
}

export interface VaultConfig {
  syncConfig: string;
}

export async function loadVaultConfig(): Promise<VaultConfig> {
  const parsed = (await readYaml("vault.yml")) as VaultConfig;
  return parsed;
}

export interface AdapterLink {
  dest: string;
  target: string;
}

export type AdaptersConfig = Record<string, AdapterLink[]>;

export interface SkillsConfig {
  links: AdaptersConfig;
  native: string[];
}

const CONFIG_DIR = join(REPO, "config");

function resolvePath(path: string): string {
  if (path.startsWith("~")) return join(homedir(), path.slice(1));
  if (path.startsWith("/")) return path;
  return join(REPO, path);
}

function resolveLinks(links?: AdapterLink[]): AdapterLink[] {
  if (!links) throw new Error("adapter missing links");
  return links.map((l) => ({
    ...l,
    dest: resolvePath(l.dest),
    target: resolvePath(l.target),
  }));
}

async function readYaml(file: string): Promise<unknown> {
  return Bun.YAML.parse(await readFile(join(CONFIG_DIR, file), "utf8"));
}

export async function loadAdaptersConfig(): Promise<AdaptersConfig> {
  const parsed = (await readYaml("adapters.yml")) as AdaptersConfig;
  return Object.fromEntries(
    Object.entries(parsed).map(([name, links]) => [name, resolveLinks(links)]),
  );
}

export async function loadSkillsConfig(): Promise<SkillsConfig> {
  const parsed = (await readYaml("skills.yml")) as Partial<SkillsConfig>;
  return {
    links: Object.fromEntries(
      Object.entries(parsed.links ?? {}).map(([name, links]) => [name, resolveLinks(links)]),
    ),
    native: parsed.native ?? [],
  };
}
