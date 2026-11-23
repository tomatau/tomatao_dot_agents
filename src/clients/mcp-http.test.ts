import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import type { JsonRpc } from './mcp-http'
import { McpUpstream } from './mcp-http'

/**
 * A streamable-HTTP MCP server that can end every session at once, as Hindsight
 * does on its idle timeout, and answers what it no longer knows with 404.
 */
const live = new Set<string>()
const received: string[] = []
let next = 0

const server = Bun.serve({
  port: 0,
  async fetch(req) {
    const message = (await req.json()) as JsonRpc
    received.push(String(message.method))
    const sid = req.headers.get('mcp-session-id')
    if (message.method === 'initialize') {
      const id = `s${++next}`
      live.add(id)
      return Response.json(
        { jsonrpc: '2.0', id: message.id, result: {} },
        { headers: { 'mcp-session-id': id } },
      )
    }
    if (!sid || !live.has(sid)) {
      return new Response('{"error":"Session not found"}', { status: 404 })
    }
    if (message.id === undefined) return new Response(null, { status: 202 })
    return Response.json({ jsonrpc: '2.0', id: message.id, result: { sid } })
  },
})
const URL = `http://127.0.0.1:${server.port}/mcp/bank/`

const init = { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }
const call = { jsonrpc: '2.0', id: 2, method: 'tools/call', params: {} }
const endSessions = () => live.clear()

beforeEach(() => {
  endSessions()
  received.length = 0
})
afterAll(() => server.stop(true))

describe('a session the server has ended', () => {
  test('is reopened and the message resent, once', async () => {
    // Arrange
    const reopened: string[] = []
    const upstream = new McpUpstream(url => reopened.push(url))
    await upstream.connect(URL, init)
    endSessions()

    // Act
    const [reply] = await upstream.post(call)

    // Assert: the call is answered on a fresh session, replayed from `init`.
    expect(reply).toMatchObject({ id: 2, result: { sid: `s${next}` } })
    expect(reopened).toEqual([URL])
    expect(received.filter(m => m === 'initialize')).toHaveLength(2)
  })

  test('stays reopened for the messages after it', async () => {
    const upstream = new McpUpstream()
    await upstream.connect(URL, init)
    endSessions()
    await upstream.post(call)
    const before = received.length

    await upstream.post(call)

    expect(received.slice(before)).toEqual(['tools/call'])
  })

  test('is not reopened while the session is still live', async () => {
    const reopened: string[] = []
    const upstream = new McpUpstream(url => reopened.push(url))
    await upstream.connect(URL, init)

    await upstream.post(call)

    expect(reopened).toEqual([])
  })
})
