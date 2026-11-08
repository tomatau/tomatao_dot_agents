import { describe, expect, test } from 'bun:test'
import { disabledHarnesses, setEnabled } from './enabled'

const FILE = `claude:
  personalisation:
    - dest: '~/.claude/CLAUDE.md'
      target: dist/claude/CLAUDE.md

codex:
  personalisation:
    - dest: '~/.codex/AGENTS.md'
      target: dist/codex/AGENTS.md
  mcp:
    home: '~/.codex/'
    enable: [shared-memory]

pi:
  personalisation:
    - dest: '~/.pi/agent/AGENTS.md'
      target: dist/pi/AGENTS.md
`

describe('setEnabled', () => {
  test('writes the flag at the top of the block it belongs to', () => {
    const after = setEnabled({ text: FILE, harness: 'codex', enabled: false })
    expect(after).toContain('codex:\n  enabled: false\n  personalisation:')
    expect(disabledHarnesses(after)).toEqual(['codex'])
  })

  test('leaves every other harness untouched', () => {
    const after = setEnabled({ text: FILE, harness: 'codex', enabled: false })
    const withoutFlag = after.replace('  enabled: false\n', '')
    expect(withoutFlag).toBe(FILE)
  })

  test('drops the flag when switching a harness back on', () => {
    const off = setEnabled({ text: FILE, harness: 'codex', enabled: false })
    expect(setEnabled({ text: off, harness: 'codex', enabled: true })).toBe(
      FILE,
    )
  })

  test('is idempotent in both directions', () => {
    const off = setEnabled({ text: FILE, harness: 'codex', enabled: false })
    expect(setEnabled({ text: off, harness: 'codex', enabled: false })).toBe(
      off,
    )
    expect(setEnabled({ text: FILE, harness: 'codex', enabled: true })).toBe(
      FILE,
    )
  })

  test('refuses a harness the file does not declare', () => {
    expect(() =>
      setEnabled({ text: FILE, harness: 'warp', enabled: false }),
    ).toThrow('no `warp` block')
  })

  test('switches off the last harness in the file', () => {
    const after = setEnabled({ text: FILE, harness: 'pi', enabled: false })
    expect(disabledHarnesses(after)).toEqual(['pi'])
    expect(after).toStartWith('claude:')
    expect(after.trimEnd()).toEndWith('AGENTS.md')
  })
})

describe('disabledHarnesses', () => {
  test('reports nothing when every harness is enabled', () => {
    expect(disabledHarnesses(FILE)).toEqual([])
  })

  test('reports every harness switched off', () => {
    const after = setEnabled({
      text: setEnabled({ text: FILE, harness: 'claude', enabled: false }),
      harness: 'pi',
      enabled: false,
    })
    expect(disabledHarnesses(after)).toEqual(['claude', 'pi'])
  })
})

for (const indent of ['  ', '    ']) {
  test(`reads and re-enables a commented false flag with ${indent.length}-space indentation`, () => {
    const text = `claude:\n${indent}enabled: false # unused here\n`
    expect(disabledHarnesses(text)).toEqual(['claude'])
    const after = setEnabled({ text, harness: 'claude', enabled: true })
    expect(disabledHarnesses(after)).toEqual([])
    expect(Bun.YAML.parse(after)).toEqual({ claude: { enabled: true } })
  })
}
