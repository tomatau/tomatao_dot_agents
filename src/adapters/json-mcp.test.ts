import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { McpServer } from '../lib/mcp'
import { plainEntry, plainTransport } from '../lib/mcp'
import { jsonMcpAdapter } from './json-mcp'

const ours: McpServer = {
  name: 'shared-memory-profile',
  transport: { kind: 'http', url: 'http://127.0.0.1:8888/mcp/profile/' },
}
const alsoOurs: McpServer = {
  name: 'project-memory',
  transport: { kind: 'stdio', command: 'bun', args: ['bridge.ts'] },
}
const managed = new Set([ours.name, alsoOurs.name])

let dir: string
let file: string

const adapter = () =>
  jsonMcpAdapter({
    name: 'harness',
    file,
    key: ['mcpServers'],
    entry: s => plainEntry(s.transport),
    transportOf: plainTransport,
  })

const pinned = async (): Promise<Record<string, unknown>> =>
  JSON.parse(await readFile(file, 'utf8')).mcpServers

const states = (rows: { server: string; state: string }[]) =>
  Object.fromEntries(rows.map(r => [r.server, r.state]))

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'json-mcp-'))
  file = join(dir, 'config.json')
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('converging a harness config', () => {
  test('creates the file when the harness has none yet', async () => {
    // Arrange: no file at all.

    // Act
    const rows = await adapter().apply([ours], managed)

    // Assert
    expect(states(rows)).toEqual({ [ours.name]: 'added' })
    expect(await pinned()).toHaveProperty(ours.name)
  })

  test('is idempotent, reporting no change on a second run', async () => {
    await adapter().apply([ours, alsoOurs], managed)
    const before = await readFile(file, 'utf8')

    const rows = await adapter().apply([ours, alsoOurs], managed)

    expect(states(rows)).toEqual({ [ours.name]: 'ok', [alsoOurs.name]: 'ok' })
    expect(await readFile(file, 'utf8')).toBe(before)
  })

  test('repins a server whose transport changed', async () => {
    // Arrange
    await adapter().apply([ours], managed)
    const moved: McpServer = {
      name: ours.name,
      transport: { kind: 'http', url: 'http://127.0.0.1:9999/mcp/profile/' },
    }

    // Act
    const rows = await adapter().apply([moved], managed)

    // Assert
    const expectedUrl = 'http://127.0.0.1:9999/mcp/profile/'
    expect(states(rows)).toEqual({ [ours.name]: 'updated' })
    expect((await pinned())[ours.name]).toEqual({ url: expectedUrl })
  })

  test('unpins a managed server that is no longer wanted', async () => {
    await adapter().apply([ours, alsoOurs], managed)

    const rows = await adapter().apply([ours], managed)

    expect(states(rows)).toEqual({
      [ours.name]: 'ok',
      [alsoOurs.name]: 'stale',
    })
    expect(await pinned()).not.toHaveProperty(alsoOurs.name)
  })

  test('leaves a server it does not manage untouched', async () => {
    // Arrange: something the person added themselves.
    const theirs = { url: 'https://example.test/mcp' }
    await writeFile(file, JSON.stringify({ mcpServers: { theirs } }, null, 2))

    // Act
    await adapter().apply([ours], managed)

    // Assert
    expect((await pinned()).theirs).toEqual(theirs)
  })
})

describe('reporting without writing', () => {
  test.each([
    ['missing', {}],
    ['wrong-url', { url: 'http://127.0.0.1:1234/mcp/profile/' }],
  ])('reports a %s pin', async (expectedState, entry) => {
    // Arrange
    const existing = expectedState === 'missing' ? {} : { [ours.name]: entry }
    await writeFile(file, JSON.stringify({ mcpServers: existing }, null, 2))
    const before = await readFile(file, 'utf8')

    // Act
    const rows = await adapter().verify([ours], managed)

    // Assert: reported, and nothing was written.
    expect(states(rows)).toEqual({ [ours.name]: expectedState })
    expect(await readFile(file, 'utf8')).toBe(before)
  })
})

describe('a hand-maintained JSONC config', () => {
  test('keeps comments and unrelated settings through an edit', async () => {
    // Arrange: the shape of a real editor settings file.
    const original = [
      '// Editor settings',
      '{',
      '  // how big the text is',
      '  "font_size": 16,',
      '  "theme": "dark"',
      '}',
      '',
    ].join('\n')
    await writeFile(file, original)

    // Act
    await adapter().apply([ours], managed)

    // Assert
    const after = await readFile(file, 'utf8')
    expect(after).toContain('// Editor settings')
    expect(after).toContain('// how big the text is')
    expect(after).toContain('"font_size": 16')
    expect(after).toContain(ours.name)
  })
})
