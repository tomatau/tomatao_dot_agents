import { type McpConfig, mcpTarget } from '../../settings/config'
import type { McpAdapter } from '../types'
import {
  type McpTransport,
  type McpServer,
  transportIdentity,
} from '../../lib/mcp'
import { cliMcpAdapter } from '../mcp-cli'

interface CodexServer {
  name: string
  transport?: { type?: string; url?: string; command?: string; args?: string[] }
}

// Codex owns its MCP config through the `codex mcp` CLI (writes <CODEX_HOME>/config.toml).
// `home` from adapters.yml always pins CODEX_HOME: trusting an inherited one is
// the hazard this field exists to prevent (this repo injects an isolated auth dir).
export function mcp(cfg: McpConfig): McpAdapter {
  const env = { ...process.env, CODEX_HOME: mcpTarget('codex', cfg, 'home') }
  const run = (args: string[]) =>
    Bun.$`codex mcp ${args}`.quiet().nothrow().env(env)

  return cliMcpAdapter({
    name: 'codex',

    async list() {
      const out = (await run(['list', '--json'])).stdout.toString()
      const found = new Map<string, string>()
      for (const s of JSON.parse(out || '[]') as CodexServer[]) {
        const t = s.transport
        const transport: McpTransport | undefined = t?.url
          ? { kind: 'http', url: t.url }
          : t?.command
            ? { kind: 'stdio', command: t.command, args: t.args ?? [] }
            : undefined
        if (transport) found.set(s.name, transportIdentity(transport))
      }
      return found
    },

    async add(s: McpServer) {
      const args =
        s.transport.kind === 'http'
          ? ['add', s.name, '--url', s.transport.url]
          : ['add', s.name, '--', s.transport.command, ...s.transport.args]
      const res = await run(args)
      if (res.exitCode !== 0) {
        throw new Error(
          `codex mcp add ${s.name}: ${res.stderr.toString().trim()}`,
        )
      }
    },

    async remove(name: string) {
      await run(['remove', name])
    },
  })
}
