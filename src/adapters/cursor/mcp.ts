import type { McpAdapter } from '../types'
import { plainEntry, plainTransport } from '../../lib/mcp'
import { type McpConfig, mcpTarget } from '../../settings/mcp'
import { jsonMcpAdapter } from '../json-mcp'

// Cursor has no MCP CLI; it reads `~/.cursor/mcp.json` (plain JSON).
export function mcp(cfg: McpConfig): McpAdapter {
  return jsonMcpAdapter({
    name: 'cursor',
    file: mcpTarget('cursor', cfg, 'file'),
    key: ['mcpServers'],
    entry: s => plainEntry(s.transport),
    transportOf: plainTransport,
  })
}
