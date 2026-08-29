import { homedir } from 'node:os'
import { join } from 'node:path'
import type { McpConfig } from '../../settings/config'
import { jsonMcpAdapter } from '../json-mcp'
import { plainEntry, plainTransport } from '../../lib/mcp'
import type { McpAdapter } from '../types'

// Cursor has no MCP CLI; it reads `~/.cursor/mcp.json` (plain JSON).
export function mcp(_cfg: McpConfig): McpAdapter {
  return jsonMcpAdapter({
    name: 'cursor',
    file: join(homedir(), '.cursor/mcp.json'),
    key: ['mcpServers'],
    entry: s => plainEntry(s.transport),
    transportOf: plainTransport,
  })
}
