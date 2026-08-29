import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { applyEdits, modify, type ParseError, parse } from 'jsonc-parser'
import { cliMcpAdapter } from './mcp-cli'
import type { McpAdapter, McpServer } from './types'

/** The harness-specific half of a JSON/JSONC-file MCP adapter. */
export interface JsonMcp {
  name: string
  /** Absolute path to the harness's config file. */
  file: string
  /** Property path to the servers object, e.g. `['mcpServers']` or `['mcp']`. */
  key: string[]
  /** The entry stored under `<key>.<server-name>`. */
  entry: (server: McpServer) => Record<string, unknown>
  /** Pull the URL back out of an entry, for diffing. */
  urlOf: (entry: unknown) => string | undefined
}

// jsonc-parser edits in place: comments, key order, and formatting survive.
const FORMAT = { insertSpaces: true, tabSize: 2 } as const

/** Build an `McpAdapter` that converges a harness's config file. */
export function jsonMcpAdapter(cfg: JsonMcp): McpAdapter {
  async function readText(): Promise<string> {
    try {
      return await readFile(cfg.file, 'utf8')
    } catch {
      return ''
    }
  }

  function servers(text: string): Record<string, unknown> {
    if (!text.trim()) return {}
    const errors: ParseError[] = []
    const data = parse(text, errors, { allowTrailingComma: true })
    if (errors.length) throw new Error(`${cfg.file}: not valid JSON/JSONC`)
    const node = cfg.key.reduce<unknown>(
      (o, k) => (o as Record<string, unknown> | undefined)?.[k],
      data,
    )
    return (node as Record<string, unknown>) ?? {}
  }

  async function edit(name: string, value: unknown): Promise<void> {
    const text = (await readText()) || '{}'
    const next = applyEdits(
      text,
      modify(text, [...cfg.key, name], value, { formattingOptions: FORMAT }),
    )
    await mkdir(dirname(cfg.file), { recursive: true })
    await writeFile(cfg.file, next)
  }

  return cliMcpAdapter({
    name: cfg.name,

    async list() {
      const found = new Map<string, string>()
      for (const [name, entry] of Object.entries(servers(await readText()))) {
        const url = cfg.urlOf(entry)
        if (url) found.set(name, url)
      }
      return found
    },

    add: (s: McpServer) => edit(s.name, cfg.entry(s)),
    remove: (name: string) => edit(name, undefined),
  })
}
