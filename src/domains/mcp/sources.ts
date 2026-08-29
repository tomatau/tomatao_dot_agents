import { readdir, readFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import type { McpResolver, McpServer } from '../../lib/mcp'
import { MCP_DIR } from '../../settings/paths'
import { parseTransport } from './config'

/** An MCP source: one id from `adapters.yml`'s `enable:`, yielding one or more servers. */
export type McpSources = Map<string, McpServer[]>

/** No `kind:` — a single server, http or stdio. */
const staticSource: McpResolver = async (id, where, raw) => [
  { name: id, transport: parseTransport(where, raw) },
]

/**
 * Every MCP source this repo knows about, `id -> servers`. Kinds that expand
 * into several servers are supplied by their own domain, so this one stays
 * ignorant of what any of them mean.
 */
export async function loadSources(
  kinds: Record<string, McpResolver>,
): Promise<McpSources> {
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
    const resolve = kind ? kinds[kind] : staticSource
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
