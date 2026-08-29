import type { McpResolver, McpServer } from '../../lib/mcp'
import type { HindsightConfig } from '../../settings/hindsight'
import { requireString } from '../../lib/parse'
import { loadHindsightConfig } from '../../settings/hindsight'
import { hindsightApiUrl } from '../../settings/paths'

const BANK = '{bank}'

/**
 * The stdio bridge, with everything it needs passed as arguments. It runs in
 * other repos under whatever toolchain they provide, so it reads no config of
 * its own; arguments are also diffable, which env vars are not.
 */
export function bridgeServer(
  hindsight: HindsightConfig,
  entry: string,
  id: string,
  where: string,
  raw: Record<string, unknown>,
): McpServer[] {
  const path = requireString(where, raw, 'path')
  if (!path.includes(BANK)) {
    throw new Error(`${where}: \`path\` must contain "${BANK}"`)
  }
  return [
    {
      name: id,
      transport: {
        kind: 'stdio',
        command: requireString(where, raw, 'command'),
        args: [entry, '--url', hindsightApiUrl(hindsight.url), '--path', path],
      },
    },
  ]
}

/**
 * The stdio server that routes to whichever repo the harness is working in.
 * `entry` is passed in: where the entries layer keeps its files is not something
 * this domain should know.
 */
export const projectMemorySource =
  (entry: string): McpResolver =>
  async (id, where, raw) =>
    bridgeServer(await loadHindsightConfig(), entry, id, where, raw)
