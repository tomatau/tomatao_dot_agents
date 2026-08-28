import type { Link } from '../lib/links'

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

/** One MCP server to pin into a harness (an HTTP streamable endpoint). */
export interface McpServer {
  name: string
  url: string
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

export interface McpAdapter {
  name: string
  /** Converge the harness's config so exactly `servers` are pinned. */
  apply(servers: McpServer[]): Promise<McpRow[]>
  /** Report the harness's current pins against `servers`, without writing. */
  verify(servers: McpServer[]): Promise<McpRow[]>
}
