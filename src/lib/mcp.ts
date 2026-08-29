/** One MCP server to pin into a harness. */
export interface McpServer {
  name: string
  transport: McpTransport
}

/** How a harness reaches a server: an endpoint it calls, or a process it spawns. */
export type McpTransport =
  | { kind: 'http'; url: string }
  | { kind: 'stdio'; command: string; args: string[] }

/**
 * Canonical form of a transport, for diffing a desired pin against what a
 * harness already holds, and for display. Every adapter reduces its own config
 * shape to this, so the converge logic never learns a harness's vocabulary.
 * A url is self-describing; only a command line needs marking.
 */
export function transportIdentity(transport: McpTransport): string {
  return transport.kind === 'http'
    ? transport.url
    : `stdio ${[transport.command, ...transport.args].join(' ')}`
}

/** The `{ url }` / `{ command, args }` entry shape, shared by cursor and zed. */
export function plainEntry(transport: McpTransport): Record<string, unknown> {
  return transport.kind === 'http'
    ? { url: transport.url }
    : { command: transport.command, args: transport.args }
}

export function plainTransport(entry: unknown): McpTransport | undefined {
  const e = entry as { url?: string; command?: string; args?: string[] } | null
  if (e?.url) return { kind: 'http', url: e.url }
  if (e?.command)
    return { kind: 'stdio', command: e.command, args: e.args ?? [] }
  return undefined
}

/**
 * Turns one `mcp/<id>.yml` into the servers it describes. A resolver validates
 * its own settings and throws naming the file, so a bad config fails before any
 * harness is touched rather than pinning something wrong.
 */
export type McpResolver = (
  id: string,
  where: string,
  raw: Record<string, unknown>,
) => Promise<McpServer[]>
