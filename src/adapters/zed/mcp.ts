import type { McpAdapter } from '../types'
import { plainEntry, plainTransport } from '../../lib/mcp'
import { type McpConfig, mcpTarget } from '../../settings/mcp'
import { jsonMcpAdapter } from '../json-mcp'

// Zed has no MCP CLI; it reads `context_servers` from `~/.config/zed/settings.json`
// (JSONC, hand-maintained — edits must preserve comments and formatting).
export function mcp(cfg: McpConfig): McpAdapter {
  return jsonMcpAdapter({
    name: 'zed',
    file: mcpTarget('zed', cfg, 'file'),
    key: ['context_servers'],
    entry: s => plainEntry(s.transport),
    transportOf: plainTransport,
  })
}
