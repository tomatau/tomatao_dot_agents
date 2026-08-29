import type { McpServer } from '../../adapters/types'
import { requireString } from '../../lib/parse'
import type { HindsightConfig } from '../../settings/config'
import { hindsightApiUrl } from '../../settings/paths'

/** How an MCP client reaches a bank, from `mcp/<id>.yml`. */
export interface BankEndpoint {
  /** Per-bank path, with `{bank}` standing in for the bank id. */
  path: string
}

const BANK = '{bank}'

/** Read the endpoint settings, rejecting a file that cannot address a bank. */
export function parseEndpoint(
  where: string,
  raw: Record<string, unknown>,
): BankEndpoint {
  const path = requireString(where, raw, 'path')
  if (!path.includes(BANK)) {
    throw new Error(`${where}: \`path\` must contain "${BANK}"`)
  }
  return { path }
}

/** One MCP server per hindsight bank, named `<id>-<bank>`. */
export function bankServers(
  hindsight: HindsightConfig,
  id: string,
  endpoint: BankEndpoint,
): McpServer[] {
  const base = hindsightApiUrl(hindsight.url)
  return hindsight.banks.map(bank => ({
    name: `${id}-${bank.id}`,
    url: `${base}${endpoint.path.replaceAll(BANK, bank.id)}`,
  }))
}
