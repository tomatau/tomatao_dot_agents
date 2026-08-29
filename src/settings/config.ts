import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { requireString, requireUrl } from '../lib/parse'
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

export interface BankConfig {
  id: string
  access: 'read' | 'write'
}

export interface HindsightConfig {
  /** Server base URL; the `HINDSIGHT_API_*` env vars override it. */
  url: string
  banks: BankConfig[]
}

export async function loadHindsightConfig(): Promise<HindsightConfig> {
  const where = 'config/hindsight.yml'
  const raw = ((await readYaml('hindsight.yml')) ?? {}) as Record<
    string,
    unknown
  >
  const banks = raw.banks
  if (!Array.isArray(banks) || banks.length === 0) {
    throw new Error(`${where}: \`banks\` must list at least one bank`)
  }
  return { url: requireUrl(where, raw, 'url'), banks: banks as BankConfig[] }
}

export interface AdapterLink {
  dest: string
  target: string
}

/** `harness -> link list`, the shape the skill-link planner works over. */
export type HarnessLinks = Record<string, AdapterLink[]>

/**
 * Where a harness keeps its MCP configuration: a CLI scope, a CLI home, or a
 * file we converge. Exactly one, so a harness can never be told nothing or two
 * contradictory things.
 */
export type McpTarget = { scope: string } | { home: string } | { file: string }

const TARGETS = ['scope', 'home', 'file'] as const

/** Settings for pinning MCP servers into one harness. */
export type McpConfig = McpTarget & {
  /** Ids of the MCP sources to pin here; see `src/entries/kinds.ts`. */
  enable?: string[]
}

/** Read one harness's `mcp:` block, rejecting a shape no adapter could use. */
export function parseMcpConfig(
  harness: string,
  raw: Record<string, unknown>,
): McpConfig {
  const where = `config/adapters.yml: ${harness} mcp`
  const given = TARGETS.filter(key => raw[key] !== undefined)
  if (given.length !== 1) {
    throw new Error(
      `${where} needs exactly one of \`scope\`, \`home\`, or \`file\`` +
        (given.length ? ` (found ${given.join(', ')})` : ''),
    )
  }
  const [key] = given
  const value = requireString(where, raw, key)
  const enable = raw.enable as string[] | undefined
  const target = key === 'scope' ? value : resolvePath(value)
  return { [key]: target, enable } as McpConfig
}

/** The one target a harness was configured with, when the adapter needs it. */
export function mcpTarget(
  harness: string,
  cfg: McpConfig,
  key: (typeof TARGETS)[number],
): string {
  const value = (cfg as Record<string, unknown>)[key]
  if (typeof value !== 'string' || !value) {
    throw new Error(`config/adapters.yml: ${harness} mcp needs \`${key}\``)
  }
  return value
}

/** One harness's slice of `config/adapters.yml`. */
export interface HarnessConfig {
  personalisation?: AdapterLink[]
  /** Link list to mirror `skills/` into, or `"native"` when the harness discovers them directly. */
  skills?: AdapterLink[] | 'native'
  mcp?: McpConfig
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
        mcp:
          cfg.mcp && parseMcpConfig(name, cfg.mcp as Record<string, unknown>),
      },
    ]),
  )
}
