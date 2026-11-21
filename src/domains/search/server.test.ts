import { expect, test } from 'bun:test'
import type { Fidx } from './server'
import { respond } from './server'

const NOTES = { name: 'notes', db: '/dbs/notes.db', description: 'My notes.' }
const SPECS = { name: 'specs', db: '/dbs/specs.db', description: 'Specs.' }
const INDEXES = [NOTES, SPECS]

const HIT = {
  path: 'aria/aria-label.md',
  score: 0.0832,
  snippet: ' Names it. ',
}

/** A fidx that records what it was asked and answers from `answers`. */
function fakeFidx(answers: Partial<Fidx> = {}) {
  const asked: unknown[] = []
  const fidx: Fidx = {
    search: async (...args) => {
      asked.push(['search', ...args])
      return answers.search ? answers.search(...args) : [HIT]
    },
    readDocument: async (...args) => {
      asked.push(['readDocument', ...args])
      return answers.readDocument ? answers.readDocument(...args) : 'body'
    },
  }
  return { fidx, asked }
}

const callTool = (name: string, args: Record<string, unknown>) => ({
  jsonrpc: '2.0',
  id: 7,
  method: 'tools/call',
  params: { name, arguments: args },
})

test('tells the harness up front what each pinned index holds', async () => {
  // Arrange
  const message = { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }

  // Act
  const answer = await respond(message, INDEXES, fakeFidx().fidx)

  // Assert
  const { instructions } = answer?.result as { instructions: string }
  expect(instructions.split('\n').slice(1)).toEqual([
    '- notes: My notes.',
    '- specs: Specs.',
  ])
})

test('offers both tools, each choosing among the pinned indexes', async () => {
  // Arrange
  const message = { jsonrpc: '2.0', id: 1, method: 'tools/list' }

  // Act
  const answer = await respond(message, INDEXES, fakeFidx().fidx)

  // Assert
  const tools = (answer?.result as { tools: any[] }).tools
  expect(tools.map(t => [t.name, t.inputSchema.properties.index.enum])).toEqual(
    [
      ['search', ['notes', 'specs']],
      ['get', ['notes', 'specs']],
    ],
  )
})

test('searches the chosen index and lists each hit with its score', async () => {
  // Arrange
  const { fidx, asked } = fakeFidx()
  const message = callTool('search', {
    index: 'specs',
    query: 'aria-label on a div',
    mode: 'lexical',
    collections: ['aria'],
  })

  // Act
  const answer = await respond(message, INDEXES, fidx)

  // Assert
  expect({ asked, result: answer?.result }).toEqual({
    asked: [
      [
        'search',
        SPECS.db,
        'aria-label on a div',
        { limit: 8, mode: 'lexical', collections: ['aria'] },
      ],
    ],
    result: {
      content: [
        { type: 'text', text: '1. aria/aria-label.md (0.083)\nNames it.' },
      ],
    },
  })
})

test('reads a document from the chosen index', async () => {
  // Arrange
  const { fidx, asked } = fakeFidx()
  const message = callTool('get', { index: 'notes', path: 'vault/a.md' })

  // Act
  const answer = await respond(message, INDEXES, fidx)

  // Assert
  expect({ asked, result: answer?.result }).toEqual({
    asked: [['readDocument', NOTES.db, 'vault/a.md']],
    result: { content: [{ type: 'text', text: 'body' }] },
  })
})

test.each([
  [
    'an index it was not pinned with',
    callTool('search', { index: 'web', query: 'x' }),
    {},
    '`index` must be one of: notes, specs',
  ],
  [
    'a search without a query',
    callTool('search', { index: 'notes' }),
    {},
    '`query` must be some text',
  ],
  [
    'a get without a path',
    callTool('get', { index: 'notes' }),
    {},
    '`path` must be a path from `search`',
  ],
  [
    'collections that are not names',
    callTool('search', { index: 'specs', query: 'x', collections: 'aria' }),
    {},
    '`collections` must list collection names',
  ],
  [
    'fidx failing',
    callTool('get', { index: 'notes', path: 'gone.md' }),
    {
      readDocument: async () => {
        throw new Error('fidx get failed (exit 1): not found')
      },
    },
    'fidx get failed (exit 1): not found',
  ],
])('tells the agent about %s', async (_case, message, answers, expected) => {
  // Act
  const answer = await respond(message, INDEXES, fakeFidx(answers).fidx)

  // Assert
  expect(answer?.result).toEqual({
    content: [{ type: 'text', text: expected }],
    isError: true,
  })
})

test.each([
  [
    'a notification',
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    undefined,
  ],
  [
    'an unknown method',
    { jsonrpc: '2.0', id: 3, method: 'resources/list' },
    {
      jsonrpc: '2.0',
      id: 3,
      error: { code: -32601, message: 'no method `resources/list`' },
    },
  ],
  [
    'an unknown tool',
    callTool('delete', {}),
    {
      jsonrpc: '2.0',
      id: 7,
      error: { code: -32602, message: 'no tool `delete`' },
    },
  ],
])('answers %s as JSON-RPC expects', async (_case, message, expected) => {
  // Act
  const answer = await respond(message, INDEXES, fakeFidx().fidx)

  // Assert
  expect(answer).toEqual(expected)
})

test('says a scoped search that found nothing may name a wrong collection', async () => {
  // Arrange
  const { fidx } = fakeFidx({ search: async () => [] })
  const message = callTool('search', {
    index: 'specs',
    query: 'div',
    collections: ['htmlaria'],
  })

  // Act
  const answer = await respond(message, INDEXES, fidx)

  // Assert
  const [content] = (answer?.result as { content: { text: string }[] }).content
  expect(content?.text).toStartWith(
    'No documents matched. Check each collection',
  )
})
