import type { McpAdapter, McpRow, McpServer } from './types'

/** The harness-specific half of a CLI-driven MCP adapter. */
export interface CliMcp {
  name: string
  /** Every remote server the harness has pinned, as `name -> url`. */
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

  // Pinned, ours to manage, but no longer wanted here.
  const staleNames = (
    have: Map<string, string>,
    desired: McpServer[],
    managed: Set<string>,
  ): string[] =>
    [...have.keys()].filter(
      (n) => managed.has(n) && !desired.some((s) => s.name === n),
    )

  return {
    name: cli.name,

    async verify(desired, managed) {
      const have = await cli.list()
      const rows = desired.map((s) => {
        const url = have.get(s.name)
        return row(
          s.name,
          url === s.url ? 'ok' : url === undefined ? 'missing' : 'wrong-url',
          url ?? s.url,
        )
      })
      for (const n of staleNames(have, desired, managed))
        rows.push(row(n, 'stale', have.get(n) ?? ''))
      return rows
    },

    async apply(desired, managed) {
      const have = await cli.list()
      const rows: McpRow[] = []
      for (const s of desired) {
        const url = have.get(s.name)
        if (url === s.url) {
          rows.push(row(s.name, 'ok', s.url))
          continue
        }
        if (url !== undefined) await cli.remove(s.name)
        await cli.add(s)
        rows.push(row(s.name, url === undefined ? 'added' : 'updated', s.url))
      }
      for (const n of staleNames(have, desired, managed)) {
        await cli.remove(n)
        rows.push(row(n, 'stale', 'removed'))
      }
      return rows
    },
  }
}
