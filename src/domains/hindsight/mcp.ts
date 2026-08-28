import type { McpServer } from '../../adapters/types'
import type { HindsightConfig } from '../../settings/config'
import { hindsightApiUrl } from '../../settings/paths'

/** One MCP server per hindsight bank, pointing at its live endpoint. */
export function bankServers(hindsight: HindsightConfig): McpServer[] {
  const base = hindsightApiUrl()
  return hindsight.banks.map(bank => ({
    name: `hindsight-${bank.id}`,
    url: `${base}/mcp/${bank.id}/`,
  }))
}
