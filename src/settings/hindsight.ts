import { asRecord, requireList, requireString, requireUrl } from '../lib/parse'
import { HINDSIGHT_YML, configWhere, readConfigYaml } from './yaml'

const WHERE = configWhere(HINDSIGHT_YML)
const ACCESS = ['read', 'write'] as const

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
  const raw = asRecord(at, value)
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
  const raw = asRecord(WHERE, (await readConfigYaml(HINDSIGHT_YML)) ?? {})
  return {
    url: requireUrl(WHERE, raw, 'url'),
    banks: requireList(WHERE, raw, 'banks').map((bank, i) =>
      parseBank(WHERE, bank, i),
    ),
  }
}
