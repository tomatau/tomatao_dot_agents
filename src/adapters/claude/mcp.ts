import type { HindsightMcpConfig } from '../../settings/config'
import { cliMcpAdapter } from '../mcp-cli'
import type { McpAdapter, McpServer } from '../types'

// Claude Code owns its MCP config through the `claude mcp` CLI; we never edit
// ~/.claude.json directly.
export function mcp(cfg: HindsightMcpConfig): McpAdapter {
  const scope = cfg.scope ?? 'user'
  const run = (args: string[]) => Bun.$`claude mcp ${args}`.quiet().nothrow()

  return cliMcpAdapter({
    name: 'claude',

    // `claude mcp list` prints `name: url (HTTP) - status` per server.
    async list() {
      const out = (await run(['list'])).stdout.toString()
      const found = new Map<string, string>()
      for (const line of out.split('\n')) {
        const m = line.match(/^(hindsight-\S+):\s+(\S+)\s+\(HTTP\)/)
        if (m) found.set(m[1], m[2])
      }
      return found
    },

    async add(s: McpServer) {
      const res = await run(['add', '-s', scope, '-t', 'http', s.name, s.url])
      if (res.exitCode !== 0) {
        throw new Error(
          `claude mcp add ${s.name}: ${res.stderr.toString().trim()}`,
        )
      }
    },

    async remove(name: string) {
      await run(['remove', '-s', scope, name])
    },
  })
}
