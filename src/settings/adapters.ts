import type { McpConfig } from './mcp'
import { asRecord, asRecordOf, requireString } from '../lib/parse'
import { MCP_KEYS, parseMcpConfig } from './mcp'
import { ADAPTERS_YML, configWhere, readConfigYaml, resolvePath } from './yaml'

const WHERE = configWhere(ADAPTERS_YML)
const HARNESS_KEYS = ['enabled', 'personalisation', 'skills', 'mcp']

export interface AdapterLink {
  dest: string
  target: string
}

/** `harness -> link list`, the shape the skill-link planner works over. */
export type HarnessLinks = Record<string, AdapterLink[]>

/** One harness's slice of `config/adapters.yml`. */
export interface HarnessConfig {
  /** False when this machine does not use the harness, so nothing is wired for it. */
  enabled?: boolean
  personalisation?: AdapterLink[]
  /** Links to mirror `skills/` into, or `"native"` when the harness finds them itself. */
  skills?: AdapterLink[] | 'native'
  mcp?: McpConfig
}

export type AdaptersConfig = Record<string, HarnessConfig>

function parseLinks(where: string, value: unknown): AdapterLink[] {
  if (!Array.isArray(value))
    throw new Error(`${where}: expected a list of links`)
  return value.map((entry, i) => {
    const at = `${where}: link ${i + 1}`
    const raw = asRecordOf(at, entry, ['dest', 'target'])
    return {
      dest: resolvePath(requireString(at, raw, 'dest')),
      target: resolvePath(requireString(at, raw, 'target')),
    }
  })
}

function parseSkills(where: string, value: unknown): HarnessConfig['skills'] {
  if (value === undefined) return undefined
  if (value === 'native') return 'native'
  return parseLinks(`${where} skills`, value)
}

function parseEnabled(where: string, value: unknown): boolean | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') {
    throw new Error(`${where}: \`enabled\` must be true or false`)
  }
  return value
}

function parseHarness(name: string, value: unknown): HarnessConfig {
  const where = `${WHERE}: ${name}`
  const raw = asRecordOf(where, value, HARNESS_KEYS)
  return {
    enabled: parseEnabled(where, raw.enabled),
    personalisation:
      raw.personalisation === undefined
        ? undefined
        : parseLinks(`${where} personalisation`, raw.personalisation),
    skills: parseSkills(where, raw.skills),
    mcp:
      raw.mcp === undefined
        ? undefined
        : parseMcpConfig(name, asRecordOf(`${where} mcp`, raw.mcp, MCP_KEYS)),
  }
}

export function parseAdaptersConfig(value: unknown): AdaptersConfig {
  const raw = asRecord(WHERE, value ?? {})
  return Object.fromEntries(
    Object.entries(raw).map(([name, cfg]) => [name, parseHarness(name, cfg)]),
  )
}

/** Every harness the file lists, enabled or not — what bootstrap asks about. */
export async function loadDeclaredHarnesses(): Promise<AdaptersConfig> {
  return parseAdaptersConfig(readConfigYaml(ADAPTERS_YML))
}

/**
 * Only the harnesses this machine uses. Filtering here means no loader, and
 * therefore no adapter, ever acts on a harness that is switched off — so
 * nothing creates its config directory, or leaves a stale pin behind.
 */
export async function loadAdaptersConfig(): Promise<AdaptersConfig> {
  const declared = await loadDeclaredHarnesses()
  return Object.fromEntries(
    Object.entries(declared).filter(([, cfg]) => cfg.enabled !== false),
  )
}
