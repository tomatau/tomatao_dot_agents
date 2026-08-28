import type { HindsightMcpConfig } from '../../settings/config'
import { cliMcpAdapter } from '../mcp-cli'
import type { McpAdapter, McpServer } from '../types'

interface CodexServer {
  name: string
  transport?: { url?: string }
}

// Codex owns its MCP config through the `codex mcp` CLI (writes <CODEX_HOME>/config.toml).
// `home` from adapters.yml pins CODEX_HOME so the repo's direnv-injected value (the
// Hindsight server's isolated auth dir) can't misdirect the write.
export function mcp(cfg: HindsightMcpConfig): McpAdapter {
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
        if (s.transport?.url) found.set(s.name, s.transport.url)
      }
      return found
    },

    async add(s: McpServer) {
      const res = await run(['add', s.name, '--url', s.url])
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
