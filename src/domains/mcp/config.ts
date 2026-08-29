import type { McpTransport } from '../../lib/mcp'
import { requireString, requireUrl, stringArray } from '../../lib/parse'
import { REPO } from '../../settings/paths'

/**
 * A static source names either an endpoint to call or a process to spawn.
 * `{repo}` in a command or its arguments becomes this checkout's path, so a
 * committed config can point at a script that ships with it.
 */
export function parseTransport(
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
