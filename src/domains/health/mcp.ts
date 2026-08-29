import type { Row } from '../../lib/report'
import { loadMcpAdapters } from '../../adapters/index'
import { type McpSources, serversFor } from '../mcp/sources'
import { managedNames } from '../mcp/state'
import { inspectBanks } from '../shared-memory/banks'

// Read-only equivalent of `just mcp` — reports whether each opted-in harness has
// the servers it enables pinned, and flags managed pins it no longer wants.
export async function mcpPinRows(sources: McpSources): Promise<Row[]> {
  const harnesses = await loadMcpAdapters()
  if (harnesses.length === 0) return []
  const managed = await managedNames(sources)
  const rows: Row[] = []
  for (const { adapter, enable } of harnesses) {
    const desired = serversFor(sources, enable)
    for (const r of await adapter.verify(desired, managed)) {
      rows.push({ name: adapter.name, state: r.state, detail: r.server })
    }
  }
  return rows
}

// A pin only works if the bank behind it exists, which config alone cannot show.
export async function bankRows(): Promise<Row[]> {
  return (await inspectBanks()).map(b => ({ state: b.state, detail: b.id }))
}
