import { describe, expect, test } from 'bun:test'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { type McpConfig, mcpTarget, parseMcpConfig } from './mcp'

const NEEDS_ONE =
  'config/adapters.yml: cursor mcp needs exactly one of `scope`, `home`, or `file`'

describe('reading a harness mcp block', () => {
  test.each([
    ['nothing at all', {}],
    ['only an enable list', { enable: ['shared-memory'] }],
  ])('rejects a block naming %s', (_case, raw) => {
    expect(() => parseMcpConfig('cursor', raw)).toThrow(NEEDS_ONE)
  })

  test('rejects a block naming two targets, which would contradict', () => {
    // Arrange: a plausible mistake — moving a harness from a CLI to a file.
    const both = { scope: 'user', file: '~/.cursor/mcp.json' }

    // Act & Assert: the message names what it found.
    expect(() => parseMcpConfig('cursor', both)).toThrow(
      `${NEEDS_ONE} (found scope, file)`,
    )
  })

  test('rejects a target that is present but empty', () => {
    expect(() => parseMcpConfig('cursor', { file: '   ' })).toThrow(
      'config/adapters.yml: cursor mcp: missing `file`',
    )
  })

  test('resolves a path target against home', () => {
    // Arrange
    const raw = { file: '~/.cursor/mcp.json' }

    // Act
    const parsed = parseMcpConfig('cursor', raw)

    // Assert
    const expectedFile = join(homedir(), '.cursor/mcp.json')
    expect(parsed).toEqual({ file: expectedFile, enable: [] })
  })

  test('leaves a scope alone, since it names no path', () => {
    const parsed = parseMcpConfig('claude', { scope: 'user', enable: ['a'] })
    expect(parsed).toEqual({ scope: 'user', enable: ['a'] })
  })
})

describe('reading the target back', () => {
  test('returns the value a harness was configured with', () => {
    const cfg = { home: '/tmp/codex' } as McpConfig
    expect(mcpTarget('codex', cfg, 'home')).toBe('/tmp/codex')
  })

  test('says which key is missing when a harness wants another kind', () => {
    // Arrange: a valid block, but not the kind this adapter needs.
    const fileBacked = { file: '/tmp/x.json' } as McpConfig

    // Act & Assert
    expect(() => mcpTarget('codex', fileBacked, 'home')).toThrow(
      'config/adapters.yml: codex mcp needs `home`',
    )
  })
})
