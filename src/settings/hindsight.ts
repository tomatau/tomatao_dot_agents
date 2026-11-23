import {
  asRecordOf,
  requireList,
  requireString,
  requireUrl,
} from '../lib/parse'
import { readSettingsFile } from './local'
import { HINDSIGHT_ENV_LOCAL } from './paths'
import { HINDSIGHT_YML, configWhere, readConfigYaml } from './yaml'

const WHERE = configWhere(HINDSIGHT_YML)
const ACCESS = ['read', 'write'] as const

let serviceEnvironment: Record<string, string> | undefined

/** Load once per command, just as the service sources its environment once at startup. */
function serviceSetting(key: string): string | undefined {
  serviceEnvironment ??= readSettingsFile(HINDSIGHT_ENV_LOCAL)
  return serviceEnvironment[key]?.trim() || undefined
}

export interface BankConfig {
  id: string
  access: (typeof ACCESS)[number]
}

export interface HindsightConfig {
  /** Server base URL; the `HINDSIGHT_API_*` env vars override it. */
  url: string
  banks: BankConfig[]
}

function parseBank(where: string, value: unknown, index: number): BankConfig {
  const at = `${where}: bank ${index + 1}`
  const raw = asRecordOf(at, value, ['id', 'access'])
  const access = requireString(at, raw, 'access')
  if (!ACCESS.includes(access as BankConfig['access'])) {
    throw new Error(`${at}: \`access\` must be ${ACCESS.join(' or ')}`)
  }
  return {
    id: requireString(at, raw, 'id'),
    access: access as BankConfig['access'],
  }
}

export async function loadHindsightConfig(): Promise<HindsightConfig> {
  const raw = asRecordOf(WHERE, readConfigYaml(HINDSIGHT_YML) ?? {}, [
    'url',
    'banks',
  ])
  return {
    url: requireUrl(WHERE, raw, 'url'),
    banks: requireList(WHERE, raw, 'banks').map((bank, i) =>
      parseBank(WHERE, bank, i),
    ),
  }
}

/**
 * Hindsight API base URL: `HINDSIGHT_API_URL`, else `HINDSIGHT_API_HOST`/`_PORT`,
 * else the `url` from config/hindsight.yml that the caller passes in.
 */
export function hindsightApiUrl(configured: string): string {
  const explicit = serviceSetting('HINDSIGHT_API_URL')
  if (explicit) return explicit.replace(/\/$/, '')
  // A half-set env overrides only its half; the rest comes from `configured`.
  const base = new URL(configured)
  const host = serviceSetting('HINDSIGHT_API_HOST')
  const port = serviceSetting('HINDSIGHT_API_PORT')
  if (host) base.hostname = host
  if (port) base.port = port
  return base.origin
}
