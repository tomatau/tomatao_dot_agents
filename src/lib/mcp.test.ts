import { describe, expect, test } from 'bun:test'
import type { McpTransport } from './mcp'
import { plainEntry, plainTransport, transportIdentity } from './mcp'

const http: McpTransport = { kind: 'http', url: 'http://127.0.0.1:8888/mcp/a/' }
const stdio: McpTransport = {
  kind: 'stdio',
  command: 'bun',
  args: ['x.ts', '--flag'],
}

describe('transportIdentity', () => {
  test.each([
    ['a url, which is self-describing', http, 'http://127.0.0.1:8888/mcp/a/'],
    ['a marked command line', stdio, 'stdio bun x.ts --flag'],
  ])('renders %s', (_case, transport, expectedIdentity) => {
    expect(transportIdentity(transport)).toBe(expectedIdentity)
  })

  test('separates transports that would otherwise look alike', () => {
    // Arrange: a command whose text resembles a url.
    const commandNamedLikeUrl: McpTransport = {
      kind: 'stdio',
      command: 'http://127.0.0.1:8888/mcp/a/',
      args: [],
    }

    // Act & Assert: the marker keeps the two identities distinct.
    expect(transportIdentity(commandNamedLikeUrl)).not.toBe(
      transportIdentity(http),
    )
  })
})

describe('plain entry shape', () => {
  test.each([
    ['an http server', http],
    ['a stdio server', stdio],
  ])('round-trips %s unchanged', (_case, transport) => {
    // Arrange, Act: write the harness shape, then read it back.
    const written = plainEntry(transport)
    const readBack = plainTransport(written)

    // Assert
    expect(readBack).toEqual(transport)
  })

  test.each([
    ['null', null],
    ['an unrelated object', { type: 'something-else' }],
    ['a stdio entry with no command', { args: ['x'] }],
  ])('reads %s as no transport, leaving it alone', (_case, entry) => {
    expect(plainTransport(entry)).toBeUndefined()
  })

  test('defaults absent args so a bare command still reads back', () => {
    const bareCommand = { command: 'bun' }
    const expectedTransport: McpTransport = {
      kind: 'stdio',
      command: 'bun',
      args: [],
    }
    expect(plainTransport(bareCommand)).toEqual(expectedTransport)
  })
})
