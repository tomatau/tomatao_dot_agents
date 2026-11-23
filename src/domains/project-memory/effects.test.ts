// unit: unreachable
import { describe, expect, mock, test } from 'bun:test'
import type { JsonRpc } from '../../clients/mcp-http'
import type { Effects } from './effects'
import { McpUpstream } from '../../clients/mcp-http'
import { perform } from './effects'
import { PROJECT_PATH } from './protocol'

const callWith = (path: unknown) => ({
  jsonrpc: '2.0',
  id: 3,
  method: 'tools/call',
  params: { name: 'recall', arguments: { query: 'why', [PROJECT_PATH]: path } },
})

function effects(bank?: string): Effects {
  return {
    send: () => {},
    log: async () => {},
    upstream: new McpUpstream(),
    bankUrl: bank => bank,
    rootsRequest: {},
    bankFor: mock(async () => bank),
  }
}

describe('resolving the repo a call names', () => {
  test('reports the bank git finds for an absolute path', async () => {
    const fx = effects('project-there')

    const found = await perform(
      { do: 'resolve-project', message: callWith('/code/there') },
      fx,
    )

    expect(found).toMatchObject({ path: '/code/there', bank: 'project-there' })
  })

  test.each([
    ['a relative path', 'code/there'],
    ['no path', undefined],
    ['a path that is not a string', 42],
  ])('reports no bank, without asking git, for %s', async (_case, path) => {
    // Arrange: a relative path would resolve against wherever we were spawned.
    const fx = effects('project-anywhere')

    // Act
    const found = await perform(
      { do: 'resolve-project', message: callWith(path) },
      fx,
    )

    // Assert
    expect(found).toMatchObject({ on: 'project', bank: undefined })
    expect(fx.bankFor).not.toHaveBeenCalled()
  })
})

test('retries a failed bank switch before forwarding any call', async () => {
  const replies: JsonRpc[] = []
  const attempts: string[] = []
  const server = Bun.serve({
    port: 0,
    async fetch(request) {
      const bank = new URL(request.url).pathname.slice(1)
      const message = (await request.json()) as JsonRpc
      if (message.method === 'initialize') {
        attempts.push(bank)
        if (bank === 'target' && attempts.length === 2) {
          return new Response(null, { status: 503 })
        }
      }
      if (message.id === undefined) return new Response(null, { status: 202 })
      return Response.json({ jsonrpc: '2.0', id: message.id, result: { bank } })
    },
  })

  try {
    const fx = {
      ...effects(),
      bankUrl: (bank: string) => new URL(bank, server.url).href,
      send: (message: JsonRpc) => replies.push(message),
    }
    const init = { jsonrpc: '2.0', id: 1, method: 'initialize' }
    await fx.upstream.connect(fx.bankUrl('previous'), init)
    const call = {
      do: 'forward' as const,
      bank: 'target',
      init,
      message: { jsonrpc: '2.0', id: 2, method: 'tools/call' },
    }

    await expect(perform(call, fx)).rejects.toThrow('503')
    expect(replies).toEqual([])
    await perform(call, fx)
    await perform(call, fx)

    expect(replies.map(reply => reply.result)).toEqual([
      { bank: 'target' },
      { bank: 'target' },
    ])
    expect(attempts).toEqual(['previous', 'target', 'target'])
  } finally {
    server.stop(true)
  }
})
