import { readdir, readFile, writeFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import type { McpTransport } from '../adapters/mcp-transport'
import type { McpServer } from '../adapters/types'
import { requireString, requireUrl, stringArray } from '../lib/parse'
import { loadHindsightConfig } from '../settings/config'
import { MCP_DIR, MCP_STATE, REPO } from '../settings/paths'
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

/**
 * A static source names either an endpoint to call or a process to spawn.
 * `{repo}` in a command or its arguments becomes this checkout's path, so a
 * committed config can point at a script that ships with it.
 */
function parseTransport(
  where: string,
  raw: Record<string, unknown>,
): McpTransport {
  const hasUrl = raw.url !== undefined
  const hasCommand = raw.command !== undefined
  if (hasUrl === hasCommand) {
    throw new Error(`${where}: set exactly one of \`url\` or \`command\``)
  }
  if (hasUrl) return { kind: 'http', url: requireUrl(where, raw, 'url') }
  const fill = (v: string) => v.replaceAll('{repo}', REPO)
  return {
    kind: 'stdio',
    command: fill(requireString(where, raw, 'command')),
    args: stringArray(where, raw, 'args').map(fill),
  }
}

/** No `kind:` — a single server, http or stdio. */
const staticSource: Resolver = async (id, where, raw) => [
  { name: id, transport: parseTransport(where, raw) },
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
