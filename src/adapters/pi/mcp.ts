import type { McpConfig } from '../../settings/mcp'
import type { McpAdapter } from '../types'
import { plainEntry, plainTransport } from '../../lib/mcp'
import { mcpTarget } from '../../settings/mcp'
import { jsonMcpAdapter } from '../json-mcp'

// Pi reads user-level servers from `~/.pi/agent/mcp.json` as `mcpServers`, the
// same plain shape as Claude Desktop and Cursor. It has `pi mcp add`, but the
// file is the documented surface and converging it keeps comments and key order.
export function mcp(cfg: McpConfig): McpAdapter {
  return jsonMcpAdapter({
    name: 'pi',
    file: mcpTarget('pi', cfg, 'file'),
    key: ['mcpServers'],
    entry: s => plainEntry(s.transport),
    transportOf: plainTransport,
  })
}
