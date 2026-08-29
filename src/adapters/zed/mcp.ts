import { homedir } from 'node:os'
import { join } from 'node:path'
import type { McpConfig } from '../../settings/config'
import { jsonMcpAdapter } from '../json-mcp'
import { plainEntry, plainTransport } from '../mcp-transport'
import type { McpAdapter } from '../types'

// Zed has no MCP CLI; it reads `context_servers` from `~/.config/zed/settings.json`
// (JSONC, hand-maintained — edits must preserve comments and formatting).
export function mcp(_cfg: McpConfig): McpAdapter {
  return jsonMcpAdapter({
    name: 'zed',
    file: join(homedir(), '.config/zed/settings.json'),
    key: ['context_servers'],
    entry: (s) => plainEntry(s.transport),
    transportOf: plainTransport,
  })
}
