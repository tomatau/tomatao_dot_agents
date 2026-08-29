import { type McpConfig, mcpTarget } from '../../settings/config'
import type { McpAdapter } from '../types'
import {
  type McpTransport,
  transportIdentity,
  type McpServer,
} from '../../lib/mcp'
import { cliMcpAdapter } from '../mcp-cli'

// Claude Code owns its MCP config through the `claude mcp` CLI; we never edit
// ~/.claude.json directly.
// `claude mcp list` prints `<name>: <detail> - <status>`, where detail is a url
// marked `(HTTP)` or a command line. Names may contain spaces, so split on the
// last ` - `; connectors managed by claude.ai omit the marker and read as stdio,
// which is harmless because only names we manage are ever compared.
export const parseListLine = (
  line: string,
): [string, McpTransport] | undefined => {
  const colon = line.indexOf(': ')
  const dash = line.lastIndexOf(' - ')
  if (colon === -1 || dash <= colon) return undefined
  const name = line.slice(0, colon)
  const detail = line.slice(colon + 2, dash).trim()
  if (detail.endsWith(' (HTTP)')) {
    return [name, { kind: 'http', url: detail.slice(0, -7).trim() }]
  }
  const [command, ...args] = detail.split(/\s+/)
  return command ? [name, { kind: 'stdio', command, args }] : undefined
}

export function mcp(cfg: McpConfig): McpAdapter {
  const scope = mcpTarget('claude', cfg, 'scope')
  const run = (args: string[]) => Bun.$`claude mcp ${args}`.quiet().nothrow()

  return cliMcpAdapter({
    name: 'claude',

    async list() {
      const out = (await run(['list'])).stdout.toString()
      const found = new Map<string, string>()
      for (const line of out.split('\n')) {
        const parsed = parseListLine(line)
        if (parsed) found.set(parsed[0], transportIdentity(parsed[1]))
      }
      return found
    },

    async add(s: McpServer) {
      const args =
        s.transport.kind === 'http'
          ? ['add', '-s', scope, '-t', 'http', s.name, s.transport.url]
          : [
              'add',
              '-s',
              scope,
              s.name,
              '--',
              s.transport.command,
              ...s.transport.args,
            ]
      const res = await run(args)
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
