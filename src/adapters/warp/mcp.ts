import type { McpConfig } from '../../settings/mcp'
import type { McpAdapter } from '../types'
import { plainEntry, plainTransport } from '../../lib/mcp'
import { mcpTarget } from '../../settings/mcp'
import { jsonMcpAdapter } from '../json-mcp'

// Warp has no MCP CLI and keeps its own servers in Warp Drive, but it also reads
// the `.mcp.json` convention. We converge its own copy under `~/.warp/` rather
// than this repo's root, which Warp also scans — that one is read by Claude Code
// as project scope too, and would duplicate the user-scope pins.
export function mcp(cfg: McpConfig): McpAdapter {
  return jsonMcpAdapter({
    name: 'warp',
    file: mcpTarget('warp', cfg, 'file'),
    key: ['mcpServers'],
    entry: s => plainEntry(s.transport),
    transportOf: plainTransport,
  })
}
