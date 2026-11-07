import type { McpConfig } from '../../settings/mcp'
import type { McpAdapter } from '../types'
import { plainEntry, plainTransport } from '../../lib/mcp'
import { mcpTarget } from '../../settings/mcp'
import { jsonMcpAdapter } from '../json-mcp'

// Antigravity reads `~/.gemini/config/mcp_config.json`.
export function mcp(cfg: McpConfig): McpAdapter {
  return jsonMcpAdapter({
    name: 'antigravity',
    file: mcpTarget('antigravity', cfg, 'file'),
    key: ['mcpServers'],
    entry: s => plainEntry(s.transport),
    transportOf: plainTransport,
  })
}
