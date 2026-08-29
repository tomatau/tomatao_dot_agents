import { describe, expect, test } from 'bun:test'
import { parseListLine } from './mcp'

const CONNECTED = ' - ✔ Connected'

describe('reading a `claude mcp list` line', () => {
  test.each([
    ['a blank line', ''],
    ['a heading with no separator', 'Checking MCP server health…'],
    ['a name with no detail', 'lonely:'],
  ])('reads %s as nothing', (_case, line) => {
    expect(parseListLine(line)).toBeUndefined()
  })

  test('reads a url marked as HTTP', () => {
    // Arrange
    const line = `shared-memory-profile: http://127.0.0.1:8888/mcp/profile/ (HTTP)${CONNECTED}`

    // Act & Assert
    const expectedUrl = 'http://127.0.0.1:8888/mcp/profile/'
    expect(parseListLine(line)).toEqual([
      'shared-memory-profile',
      { kind: 'http', url: expectedUrl },
    ])
  })

  test('reads a command line with its arguments', () => {
    const line = `project-memory: bun /repo/bridge.ts --path /mcp/{bank}/${CONNECTED}`

    expect(parseListLine(line)).toEqual([
      'project-memory',
      { kind: 'stdio', command: 'bun', args: ['/repo/bridge.ts', '--path', '/mcp/{bank}/'] },
    ])
  })

  test('keeps a name that contains spaces', () => {
    // Arrange: connectors managed by claude.ai are named this way.
    const line = `claude.ai Context7: https://mcp.context7.com/mcp${CONNECTED}`

    // Act & Assert
    const expectedName = 'claude.ai Context7'
    expect(parseListLine(line)?.[0]).toBe(expectedName)
  })

  test('splits on the last separator, so a command may contain one', () => {
    // Arrange: ` - ` appears inside the arguments too.
    const line = `tool: run --flag a - b${CONNECTED}`

    // Act & Assert
    const expectedArgs = ['--flag', 'a', '-', 'b']
    expect(parseListLine(line)?.[1]).toEqual({
      kind: 'stdio',
      command: 'run',
      args: expectedArgs,
    })
  })

  test('reads a failed server unchanged, so a broken pin is not rewritten', () => {
    // Arrange: the format claude prints when a server will not start.
    const line =
      'project-memory: bun /repo/bridge.ts - ✘ Failed to connect — CONNECTION_CLOSED'

    // Act & Assert: identical to a healthy pin, so converging leaves it alone.
    expect(parseListLine(line)).toEqual([
      'project-memory',
      { kind: 'stdio', command: 'bun', args: ['/repo/bridge.ts'] },
    ])
  })
})
