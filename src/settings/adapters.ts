import type { McpConfig } from './mcp'
import { asRecord, requireString } from '../lib/parse'
import { parseMcpConfig } from './mcp'
import { ADAPTERS_YML, configWhere, readConfigYaml, resolvePath } from './yaml'

const WHERE = configWhere(ADAPTERS_YML)

export interface AdapterLink {
  dest: string
  target: string
}

/** `harness -> link list`, the shape the skill-link planner works over. */
export type HarnessLinks = Record<string, AdapterLink[]>

/** One harness's slice of `config/adapters.yml`. */
export interface HarnessConfig {
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
    const raw = asRecord(at, entry)
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

function parseHarness(name: string, value: unknown): HarnessConfig {
  const where = `${WHERE}: ${name}`
  const raw = asRecord(where, value)
  return {
    personalisation:
      raw.personalisation === undefined
        ? undefined
        : parseLinks(`${where} personalisation`, raw.personalisation),
    skills: parseSkills(where, raw.skills),
    mcp:
      raw.mcp === undefined
        ? undefined
        : parseMcpConfig(name, asRecord(`${where} mcp`, raw.mcp)),
  }
}

export async function loadAdaptersConfig(): Promise<AdaptersConfig> {
  const raw = asRecord(WHERE, (await readConfigYaml(ADAPTERS_YML)) ?? {})
  return Object.fromEntries(
    Object.entries(raw).map(([name, cfg]) => [name, parseHarness(name, cfg)]),
  )
}
