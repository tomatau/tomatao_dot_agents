import type { Hit, SearchMode, SearchOptions } from '../../clients/fidx'
import type { JsonRpc } from '../../clients/mcp-http'
import type { SearchIndex } from '../../settings/search'

const MODES: SearchMode[] = ['hybrid', 'lexical', 'vector']
const DEFAULT_LIMIT = 8
const MAX_LIMIT = 20

// JSON-RPC codes: no such method, and parameters it cannot use.
const NO_METHOD = -32601
const BAD_PARAMS = -32602

/** What the server does to answer; the entry passes fidx, a test passes fakes. */
export interface Fidx {
  search(db: string, query: string, options: SearchOptions): Promise<Hit[]>
  readDocument(db: string, path: string): Promise<string>
}

const reply = (id: unknown, result: unknown): JsonRpc => ({
  jsonrpc: '2.0',
  id,
  result,
})

const fail = (id: unknown, code: number, message: string): JsonRpc => ({
  jsonrpc: '2.0',
  id,
  error: { code, message },
})

const text = (body: string, isError = false) => ({
  content: [{ type: 'text', text: body }],
  ...(isError && { isError }),
})

const choices = (indexes: SearchIndex[]): string =>
  indexes.map(i => `- ${i.name}: ${i.description}`).join('\n')

/**
 * What a harness tells its agent about this server up front, so an agent knows
 * the indexes exist before it thinks to look for a tool.
 */
export const instructions = (indexes: SearchIndex[]): string =>
  `Local indexes of documents. When a question touches what one holds, search it before answering from memory, and cite the paths you rely on:\n${choices(indexes)}`

/** The two tools, described from the indexes this server was pinned with. */
export function tools(indexes: SearchIndex[]): unknown[] {
  const index = {
    type: 'string',
    enum: indexes.map(i => i.name),
    description: 'Which index to use.',
  }
  return [
    {
      name: 'search',
      description: `Search a local index for the documents that best answer a question. Pick the index whose contents fit:\n${choices(indexes)}`,
      inputSchema: {
        type: 'object',
        properties: {
          index,
          query: { type: 'string', description: 'A question or keywords.' },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: MAX_LIMIT,
            description: `How many documents to return; ${DEFAULT_LIMIT} if unset.`,
          },
          mode: {
            type: 'string',
            enum: MODES,
            description:
              'hybrid (default) mixes keyword and meaning; lexical suits exact names and identifiers; vector suits loose wording.',
          },
          collections: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Search only these collections: the first part of each path, such as `aria` in `aria/aria-label.md`. Every collection if unset.',
          },
        },
        required: ['index', 'query'],
      },
    },
    {
      name: 'get',
      description: 'Read a whole document by the path a search returned.',
      inputSchema: {
        type: 'object',
        properties: {
          index,
          path: { type: 'string', description: 'A path from `search`.' },
        },
        required: ['index', 'path'],
      },
    },
  ]
}

const NONE = 'No documents matched.'

// fidx answers an unknown collection with nothing, so a typo looks like a miss.
const SCOPED_NONE = `${NONE} Check each collection name against the first part of a path from an unscoped search.`

const listing = (hits: Hit[], scoped: boolean): string =>
  hits.length === 0
    ? scoped
      ? SCOPED_NONE
      : NONE
    : hits
        .map(
          (hit, i) =>
            `${i + 1}. ${hit.path} (${hit.score.toFixed(3)})\n${hit.snippet.trim()}`,
        )
        .join('\n\n')

/**
 * Answer one tool call. A bad argument is the caller's to fix, so it comes
 * back as a tool error the agent can read; fidx failing is too.
 */
async function call(
  indexes: SearchIndex[],
  fidx: Fidx,
  params: Record<string, unknown>,
) {
  const args = (params.arguments ?? {}) as Record<string, unknown>
  const index = indexes.find(i => i.name === args.index)
  if (!index) {
    const names = indexes.map(i => i.name).join(', ')
    return text(`\`index\` must be one of: ${names}`, true)
  }
  try {
    if (params.name === 'search') {
      if (typeof args.query !== 'string' || !args.query.trim()) {
        return text('`query` must be some text', true)
      }
      const limit = Math.min(
        Math.max(Number(args.limit ?? DEFAULT_LIMIT) || DEFAULT_LIMIT, 1),
        MAX_LIMIT,
      )
      const mode = MODES.includes(args.mode as SearchMode)
        ? (args.mode as SearchMode)
        : 'hybrid'
      const collections = args.collections ?? []
      if (
        !Array.isArray(collections) ||
        collections.some(c => typeof c !== 'string' || !c.trim())
      ) {
        return text('`collections` must list collection names', true)
      }
      const hits = await fidx.search(index.db, args.query, {
        limit,
        mode,
        collections,
      })
      return text(listing(hits, collections.length > 0))
    }
    if (typeof args.path !== 'string' || !args.path.trim()) {
      return text('`path` must be a path from `search`', true)
    }
    return text(await fidx.readDocument(index.db, args.path))
  } catch (error) {
    return text(error instanceof Error ? error.message : String(error), true)
  }
}

/** The reply to one client message, or none for a notification. */
export async function respond(
  message: JsonRpc,
  indexes: SearchIndex[],
  fidx: Fidx,
): Promise<JsonRpc | undefined> {
  const { id, method } = message
  if (id === undefined) return undefined
  const params = (message.params ?? {}) as Record<string, unknown>
  switch (method) {
    case 'initialize':
      return reply(id, {
        protocolVersion: '2025-06-18',
        capabilities: { tools: {} },
        serverInfo: { name: 'search', version: '0' },
        instructions: instructions(indexes),
      })
    case 'ping':
      return reply(id, {})
    case 'tools/list':
      return reply(id, { tools: tools(indexes) })
    case 'tools/call':
      if (params.name !== 'search' && params.name !== 'get') {
        return fail(id, BAD_PARAMS, `no tool \`${String(params.name)}\``)
      }
      return reply(id, await call(indexes, fidx, params))
    default:
      return fail(id, NO_METHOD, `no method \`${String(method)}\``)
  }
}
