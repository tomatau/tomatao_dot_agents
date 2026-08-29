import type { Link } from '../lib/links'
import type { McpTransport } from './mcp-transport'

/** One personalisation source: a vault note, frontmatter stripped. */
export interface SourceFile {
  name: string
  content: string
}

export interface RenderedFile {
  distPath: string
  content: string
}

export interface PersonalisationAdapter {
  name: string
  render(sources: SourceFile[]): RenderedFile[]
  links(sources: SourceFile[]): Link[]
}

/** One MCP server to pin into a harness. */
export interface McpServer {
  name: string
  transport: McpTransport
}

export type McpState =
  | 'ok'
  | 'added'
  | 'updated'
  | 'stale'
  | 'missing'
  | 'wrong-url'
  | 'conflict'

export interface McpRow {
  name: string
  server: string
  state: McpState
  detail: string
}

/**
 * Converges one harness's MCP config. `managed` names every server this repo
 * owns; anything pinned outside that set is the user's and is left alone.
 */
export interface McpAdapter {
  name: string
  /** Converge the harness so exactly `desired` of the `managed` names are pinned. */
  apply(desired: McpServer[], managed: Set<string>): Promise<McpRow[]>
  /** Report the harness's current pins against `desired`, without writing. */
  verify(desired: McpServer[], managed: Set<string>): Promise<McpRow[]>
}
