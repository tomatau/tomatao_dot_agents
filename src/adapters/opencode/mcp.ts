import { homedir } from 'node:os'
import { join } from 'node:path'
import type { McpConfig } from '../../settings/config'
import { jsonMcpAdapter } from '../json-mcp'
import type { McpAdapter } from '../types'

// `opencode mcp add` can create entries but there is no `remove`, so we converge
// `~/.config/opencode/opencode.jsonc` directly. Remote entries are `{ type: 'remote', url }`.
export function mcp(_cfg: McpConfig): McpAdapter {
  return jsonMcpAdapter({
    name: 'opencode',
    file: join(homedir(), '.config/opencode/opencode.jsonc'),
    key: ['mcp'],
    entry: s => ({ type: 'remote', url: s.url }),
    urlOf: e => (e as { url?: string } | null)?.url,
  })
}
