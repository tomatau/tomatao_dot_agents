import { homedir } from 'node:os'
import { join } from 'node:path'
import type { McpConfig } from '../../settings/config'
import { jsonMcpAdapter } from '../json-mcp'
import type { McpTransport } from '../../lib/mcp'
import type { McpAdapter } from '../types'

// `opencode mcp add` can create entries but there is no `remove`, so we converge
// `~/.config/opencode/opencode.jsonc` directly. It splits remote/local by `type`,
// and a local server's command and args share one array.
export function mcp(_cfg: McpConfig): McpAdapter {
  return jsonMcpAdapter({
    name: 'opencode',
    file: join(homedir(), '.config/opencode/opencode.jsonc'),
    key: ['mcp'],
    entry: s =>
      s.transport.kind === 'http'
        ? { type: 'remote', url: s.transport.url }
        : {
            type: 'local',
            command: [s.transport.command, ...s.transport.args],
          },
    transportOf: (e): McpTransport | undefined => {
      const entry = e as { url?: string; command?: string[] } | null
      if (entry?.url) return { kind: 'http', url: entry.url }
      const [command, ...args] = entry?.command ?? []
      return command ? { kind: 'stdio', command, args } : undefined
    },
  })
}
