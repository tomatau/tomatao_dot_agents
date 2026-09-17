import { describe, expect, test } from 'bun:test'
import { homedir } from 'node:os'
import { REPO } from '../../settings/paths'
import { parseTransport } from './config'

describe('static MCP transport paths', () => {
  test('expands stable home and repository paths without relying on PATH', () => {
    expect(
      parseTransport('mcp/example.yml', {
        command: '{home}/.local/bin/example',
        args: ['--config', '{repo}/config/example.yml'],
      }),
    ).toEqual({
      kind: 'stdio',
      command: `${homedir()}/.local/bin/example`,
      args: ['--config', `${REPO}/config/example.yml`],
    })
  })
})
