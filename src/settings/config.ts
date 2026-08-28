import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { REPO } from './paths'

export function vaultDir(): string {
  const dir = process.env.VAULT_DIR?.trim()
  if (!dir)
    throw new Error(
      'VAULT_DIR not set — add it to hindsight/env.local (see env.example)',
    )
  return dir
}

export interface VaultConfig {
  syncConfig: string
}

export async function loadVaultConfig(): Promise<VaultConfig> {
  const parsed = (await readYaml('vault.yml')) as VaultConfig
  return parsed
}

export interface AdapterLink {
  dest: string
  target: string
}

/** `harness -> link list`, the shape the skill-link planner works over. */
export type HarnessLinks = Record<string, AdapterLink[]>

/** Settings for pinning the hindsight bank MCP endpoints to a harness. */
export interface HindsightMcpConfig {
  scope?: string
}

/** One harness's slice of `config/adapters.yml`. */
export interface HarnessConfig {
  personalisation?: AdapterLink[]
  /** Link list to mirror `skills/` into, or `"native"` when the harness discovers them directly. */
  skills?: AdapterLink[] | 'native'
  hindsight_mcp?: HindsightMcpConfig
}

export type AdaptersConfig = Record<string, HarnessConfig>

const CONFIG_DIR = join(REPO, 'config')

function resolvePath(path: string): string {
  if (path.startsWith('~')) return join(homedir(), path.slice(1))
  if (path.startsWith('/')) return path
  return join(REPO, path)
}

function resolveLinks(links?: AdapterLink[]): AdapterLink[] {
  if (!links) throw new Error('adapter missing links')
  return links.map(l => ({
    ...l,
    dest: resolvePath(l.dest),
    target: resolvePath(l.target),
  }))
}

async function readYaml(file: string): Promise<unknown> {
  return Bun.YAML.parse(await readFile(join(CONFIG_DIR, file), 'utf8'))
}

export async function loadAdaptersConfig(): Promise<AdaptersConfig> {
  const parsed = (await readYaml('adapters.yml')) as Record<
    string,
    HarnessConfig
  >
  return Object.fromEntries(
    Object.entries(parsed).map(([name, cfg]) => [
      name,
      {
        ...cfg,
        personalisation:
          cfg.personalisation && resolveLinks(cfg.personalisation),
        skills: Array.isArray(cfg.skills)
          ? resolveLinks(cfg.skills)
          : cfg.skills,
      },
    ]),
  )
}
