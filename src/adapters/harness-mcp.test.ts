import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { McpServer } from '../lib/mcp'
import { mcp as cursor } from './cursor/mcp'
import { mcp as opencode } from './opencode/mcp'
import { mcp as zed } from './zed/mcp'
import type { McpConfig } from '../settings/config'
import type { McpAdapter, McpState } from './types'

const remote: McpServer = {
  name: 'shared-memory-profile',
  transport: { kind: 'http', url: 'http://127.0.0.1:8888/mcp/profile/' },
}
const local: McpServer = {
  name: 'project-memory',
  transport: {
    kind: 'stdio',
    command: 'bun',
    args: ['bridge.ts', '--path', '/mcp/'],
  },
}
const managed = new Set([remote.name, local.name])

/** Each harness writes the same two servers in its own vocabulary. */
const harnesses: [
  string,
  (cfg: McpConfig) => McpAdapter,
  string,
  Record<string, unknown>,
  Record<string, unknown>,
][] = [
  [
    'cursor',
    cursor,
    'mcpServers',
    { url: 'http://127.0.0.1:8888/mcp/profile/' },
    { command: 'bun', args: ['bridge.ts', '--path', '/mcp/'] },
  ],
  [
    'zed',
    zed,
    'context_servers',
    { url: 'http://127.0.0.1:8888/mcp/profile/' },
    { command: 'bun', args: ['bridge.ts', '--path', '/mcp/'] },
  ],
  [
    'opencode',
    opencode,
    'mcp',
    { type: 'remote', url: 'http://127.0.0.1:8888/mcp/profile/' },
    { type: 'local', command: ['bun', 'bridge.ts', '--path', '/mcp/'] },
  ],
]

let file: string
let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'harness-'))
  file = join(dir, 'config.json')
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe.each(harnesses)(
  '%s',
  (_name, build, key, expectedRemote, expectedLocal) => {
    test('writes both transports in its own config shape', async () => {
      // Arrange
      const adapter = build({ file })

      // Act
      await adapter.apply([remote, local], managed)

      // Assert
      const written = JSON.parse(await readFile(file, 'utf8'))[key]
      expect(written[remote.name]).toEqual(expectedRemote)
      expect(written[local.name]).toEqual(expectedLocal)
    })

    test('reads its own writing back, so a pin is not rewritten', async () => {
      // Arrange
      const adapter = build({ file })
      await adapter.apply([remote, local], managed)

      // Act
      const rows = await adapter.verify([remote, local], managed)

      // Assert: the round trip is what stops every run churning the config.
      const expectedStates: McpState[] = ['ok', 'ok']
      expect(rows.map(r => r.state)).toEqual(expectedStates)
    })
  },
)

describe('a file-backed harness configured for a CLI instead', () => {
  test.each(harnesses.map(([name, build]) => [name, build]))(
    'tells %s what it is missing rather than guessing a path',
    (name, build) => {
      expect(() => build({ scope: 'user' } as McpConfig)).toThrow(
        `config/adapters.yml: ${name} mcp needs \`file\``,
      )
    },
  )
})
