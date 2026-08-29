import { readFile, writeFile } from 'node:fs/promises'
import type { McpSources } from './sources'
import { MCP_STATE } from '../../settings/paths'

/** The names the sources define right now. */
function sourceNames(sources: McpSources): string[] {
  return [...sources.values()].flat().map(s => s.name)
}

/** The names of the last successful apply; missing or unreadable means none. */
async function lastPinned(): Promise<string[]> {
  try {
    const parsed = JSON.parse(await readFile(MCP_STATE, 'utf8'))
    return Array.isArray(parsed?.servers) ? parsed.servers : []
  } catch {
    return []
  }
}

/**
 * Every server name this repo manages, enabled anywhere or not — the set an
 * adapter may prune from. Names outside it belong to the user, so we leave them.
 * Names pinned before but no longer defined are included, so deleting a source
 * unpins it instead of orphaning it.
 */
export async function managedNames(sources: McpSources): Promise<Set<string>> {
  return new Set([...sourceNames(sources), ...(await lastPinned())])
}

/** Record what is now defined, after every server has been converged. */
export async function recordPinned(sources: McpSources): Promise<void> {
  const servers = [...new Set(sourceNames(sources))].sort()
  await writeFile(MCP_STATE, `${JSON.stringify({ servers }, null, 2)}\n`)
}
