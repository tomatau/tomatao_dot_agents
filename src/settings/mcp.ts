import { requireString, stringArray } from '../lib/parse'
import { ADAPTERS_YML, configWhere, resolvePath } from './yaml'

/**
 * Where a harness keeps its MCP configuration: a CLI scope, a CLI home, or a
 * file we converge. Exactly one, so a harness can never be told nothing or two
 * contradictory things.
 */
export type McpTarget = { scope: string } | { home: string } | { file: string }

const WHERE = configWhere(ADAPTERS_YML)
const TARGETS = ['scope', 'home', 'file'] as const

/** Settings for pinning MCP servers into one harness. */
export type McpConfig = McpTarget & {
  /** Ids of the MCP sources to pin here; see `src/entries/kinds.ts`. */
  enable?: string[]
}

/** Read one harness's `mcp:` block, rejecting a shape no adapter could use. */
export function parseMcpConfig(
  harness: string,
  raw: Record<string, unknown>,
): McpConfig {
  const where = `${WHERE}: ${harness} mcp`
  const given = TARGETS.filter(key => raw[key] !== undefined)
  if (given.length !== 1) {
    throw new Error(
      `${where} needs exactly one of \`scope\`, \`home\`, or \`file\`` +
        (given.length ? ` (found ${given.join(', ')})` : ''),
    )
  }
  const [key] = given
  const value = requireString(where, raw, key)
  const target = key === 'scope' ? value : resolvePath(value)
  return {
    [key]: target,
    enable: stringArray(where, raw, 'enable'),
  } as McpConfig
}

/** The one target a harness was configured with, when the adapter needs it. */
export function mcpTarget(
  harness: string,
  cfg: McpConfig,
  key: (typeof TARGETS)[number],
): string {
  const value = (cfg as Record<string, unknown>)[key]
  if (typeof value !== 'string' || !value) {
    throw new Error(`${WHERE}: ${harness} mcp needs \`${key}\``)
  }
  return value
}
