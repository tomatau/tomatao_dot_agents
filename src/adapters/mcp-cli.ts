import { transportIdentity } from '../lib/mcp'
import type { McpAdapter, McpRow } from './types'
import type { McpServer } from '../lib/mcp'

/** The harness-specific half of a CLI-driven MCP adapter. */
export interface CliMcp {
  name: string
  /** Every server the harness has pinned, as `name -> transport identity`. */
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
      n => managed.has(n) && !desired.some(s => s.name === n),
    )

  return {
    name: cli.name,

    async verify(desired, managed) {
      const have = await cli.list()
      const rows = desired.map(s => {
        const want = transportIdentity(s.transport)
        const found = have.get(s.name)
        return row(
          s.name,
          found === want ? 'ok' : found === undefined ? 'missing' : 'wrong-url',
          found ?? want,
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
        const want = transportIdentity(s.transport)
        const found = have.get(s.name)
        if (found === want) {
          rows.push(row(s.name, 'ok', want))
          continue
        }
        if (found !== undefined) await cli.remove(s.name)
        await cli.add(s)
        rows.push(row(s.name, found === undefined ? 'added' : 'updated', want))
      }
      for (const n of staleNames(have, desired, managed)) {
        await cli.remove(n)
        rows.push(row(n, 'stale', 'removed'))
      }
      return rows
    },
  }
}
