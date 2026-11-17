import { afterAll, beforeAll, expect, test } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readSettingsFile } from './local'

let root: string
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'agent-settings-'))
})
afterAll(async () => {
  await rm(root, { recursive: true, force: true })
})

test('uses shell expansion, quoting, comments, and the last assignment', async () => {
  const file = join(root, 'settings')
  await writeFile(
    file,
    'CODEX_HOME=first\nCODEX_HOME="$HOME/a home" # local value\n',
  )
  expect(readSettingsFile(file).CODEX_HOME).toBe(`${process.env.HOME}/a home`)
})

test('file assignments override inherited values, including empty values', async () => {
  const file = join(root, 'override')
  await writeFile(
    file,
    'HOME=/fixture\nCODEX_HOME="$HOME/codex"\nHINDSIGHT_API_PORT=\n',
  )
  const settings = readSettingsFile(file)
  expect(settings.HOME).toBe('/fixture')
  expect(settings.CODEX_HOME).toBe('/fixture/codex')
  expect(settings.HINDSIGHT_API_PORT).toBe('')
})

test('rejects a broken shell file rather than silently falling back', async () => {
  const file = join(root, 'broken')
  await writeFile(file, 'CODEX_HOME="unterminated\n')
  expect(() => readSettingsFile(file)).toThrow('cannot load shell settings')
})
