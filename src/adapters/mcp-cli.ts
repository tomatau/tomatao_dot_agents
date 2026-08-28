import type { McpAdapter, McpRow, McpServer } from './types'

// Only servers under this prefix are ours to manage in a harness's config.
const PREFIX = 'hindsight-'

/** The harness-specific half of a CLI-driven MCP adapter. */
export interface CliMcp {
  name: string
  /** Currently pinned `hindsight-*` servers, as `name -> url`. */
  list(): Promise<Map<string, string>>
  /** Pin a server; throw on failure. */
  add(server: McpServer): Promise<void>
  /** Unpin a server by name. */
  remove(name: string): Promise<void>
}

/** Build an `McpAdapter` that converges a harness's config via its `CliMcp`. */
export function cliMcpAdapter(cli: CliMcp): McpAdapter {
  const row = (
    server: string,
    state: McpRow['state'],
    detail: string,
  ): McpRow => ({
    name: cli.name,
    server,
    state,
    detail,
  })

  const staleNames = (have: Map<string, string>, want: McpServer[]): string[] =>
    [...have.keys()].filter(
      n => n.startsWith(PREFIX) && !want.some(s => s.name === n),
    )

  return {
    name: cli.name,

    async verify(servers) {
      const have = await cli.list()
      const rows = servers.map(s => {
        const url = have.get(s.name)
        return row(
          s.name,
          url === s.url ? 'ok' : url === undefined ? 'missing' : 'wrong-url',
          url ?? s.url,
        )
      })
      for (const n of staleNames(have, servers))
        rows.push(row(n, 'stale', have.get(n) ?? ''))
      return rows
    },

    async apply(servers) {
      const have = await cli.list()
      const rows: McpRow[] = []
      for (const s of servers) {
        const url = have.get(s.name)
        if (url === s.url) {
          rows.push(row(s.name, 'ok', s.url))
          continue
        }
        if (url !== undefined) await cli.remove(s.name)
        await cli.add(s)
        rows.push(row(s.name, url === undefined ? 'added' : 'updated', s.url))
      }
      for (const n of staleNames(have, servers)) {
        await cli.remove(n)
        rows.push(row(n, 'stale', 'removed'))
      }
      return rows
    },
  }
}
