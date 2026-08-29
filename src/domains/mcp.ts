import { readdir, readFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import type { McpServer } from '../adapters/types'
import { requireUrl } from '../lib/parse'
import { loadHindsightConfig } from '../settings/config'
import { MCP_DIR } from '../settings/paths'
import { bankServers, parseEndpoint } from './hindsight/mcp'

/** An MCP source: one id from `adapters.yml`'s `enable:`, yielding one or more servers. */
export type McpSources = Map<string, McpServer[]>

/**
 * Turns one `mcp/<id>.yml` into the servers it describes. Each kind validates
 * its own settings and throws naming the file, so a bad config fails before any
 * harness is touched rather than pinning a wrong URL.
 */
type Resolver = (
  id: string,
  where: string,
  raw: Record<string, unknown>,
) => Promise<McpServer[]>

/** Kinds that expand into several servers from other config. */
const KINDS: Record<string, Resolver> = {
  hindsight: async (id, where, raw) =>
    bankServers(await loadHindsightConfig(), id, parseEndpoint(where, raw)),
}

/** No `kind:` — a single server at an explicit url. */
const staticSource: Resolver = async (id, where, raw) => [
  { name: id, url: requireUrl(where, raw, 'url') },
]

/** Every MCP source this repo knows about, `id -> servers`. */
export async function loadSources(): Promise<McpSources> {
  const sources: McpSources = new Map()
  let files: string[]
  try {
    files = await readdir(MCP_DIR)
  } catch {
    return sources
  }
  for (const name of files.filter(f => f.endsWith('.yml')).sort()) {
    const id = basename(name, extname(name))
    const where = `mcp/${name}`
    const raw = (Bun.YAML.parse(await readFile(join(MCP_DIR, name), 'utf8')) ??
      {}) as Record<string, unknown>
    const kind = raw.kind
    if (kind !== undefined && typeof kind !== 'string') {
      throw new Error(`${where}: \`kind\` must be a string`)
    }
    const resolve = kind ? KINDS[kind] : staticSource
    if (!resolve) throw new Error(`${where}: unknown kind "${kind}"`)
    sources.set(id, await resolve(id, where, raw))
  }
  return sources
}

/** The servers behind a harness's `enable:` list. */
export function serversFor(
  sources: McpSources,
  enable: string[] = [],
): McpServer[] {
  return enable.flatMap(id => {
    const servers = sources.get(id)
    if (!servers) throw new Error(`unknown mcp source "${id}"`)
    return servers
  })
}

/**
 * Every server name this repo manages, enabled anywhere or not — the set an
 * adapter may prune from. Names outside it belong to the user, so we leave them.
 */
export function managedNames(sources: McpSources): Set<string> {
  return new Set([...sources.values()].flat().map(s => s.name))
}
