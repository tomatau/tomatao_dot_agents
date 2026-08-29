import type { McpConfig } from '../../settings/config'
import { cliMcpAdapter } from '../mcp-cli'
import { type McpTransport, transportIdentity } from '../mcp-transport'
import type { McpAdapter, McpServer } from '../types'

interface CodexServer {
  name: string
  transport?: { type?: string; url?: string; command?: string; args?: string[] }
}

// Codex owns its MCP config through the `codex mcp` CLI (writes <CODEX_HOME>/config.toml).
// `home` from adapters.yml pins CODEX_HOME so a direnv-injected value (this repo
// sets one for an isolated auth dir) can't misdirect the write.
export function mcp(cfg: McpConfig): McpAdapter {
  const env = cfg.home ? { ...process.env, CODEX_HOME: cfg.home } : undefined
  const run = (args: string[]) => {
    const cmd = Bun.$`codex mcp ${args}`.quiet().nothrow()
    return env ? cmd.env(env) : cmd
  }

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
