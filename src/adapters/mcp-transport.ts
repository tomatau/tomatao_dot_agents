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
