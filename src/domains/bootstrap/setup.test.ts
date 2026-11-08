import { afterAll, beforeAll, expect, test } from 'bun:test'
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { run } from '../../lib/shell'
import { REPO } from '../../settings/paths'

let root: string
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'agent-bootstrap-'))
})
afterAll(async () => {
  await rm(root, { recursive: true, force: true })
})

async function fixture(name: string): Promise<string> {
  const path = join(root, name)
  await mkdir(path)
  await cp(join(REPO, 'src'), join(path, 'src'), { recursive: true })
  await cp(join(REPO, 'config'), join(path, 'config'), { recursive: true })
  await symlink(join(REPO, 'node_modules'), join(path, 'node_modules'))
  await mkdir(join(path, 'personalisation'))
  await writeFile(
    join(path, 'personalisation/instructions.md'),
    'Fixture instructions\n',
  )
  await mkdir(join(path, 'hindsight'))
  await writeFile(
    join(path, 'hindsight/env.example'),
    'VAULT_DIR="$HOME/template-vault"\nHINDSIGHT_API_LLM_PROVIDER=sh\n',
  )
  const result = await run(['git', 'init', '-q', path])
  if (result.code) throw new Error(result.stderr)
  return path
}

async function snapshot(path: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {}
  for (const entry of await readdir(path, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue
    const child = join(path, entry.name)
    if (entry.isDirectory()) Object.assign(files, await snapshot(child))
    else files[child] = await readFile(child, 'base64')
  }
  return files
}

test.skipIf(process.platform !== 'darwin')(
  'fresh offline bootstrap previews without changing files or Git configuration',
  async () => {
    const path = await fixture('offline')
    await writeFile(
      join(path, 'hindsight/env.local'),
      `VAULT_DIR="${path}/vault"\nHINDSIGHT_API_LLM_PROVIDER=sh\nHINDSIGHT_API_URL=http://127.0.0.1:1\n`,
    )
    const before = await snapshot(path)
    const result = await run([
      process.execPath,
      join(path, 'src/entries/bootstrap.ts'),
      '--dry-run',
      '--yes',
      '--harnesses=claude',
    ])
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('would install launchd service')
    expect(result.stdout).toContain('would ensure bank')
    expect(result.stdout).toContain('would run just sync-personalisation')
    expect(await snapshot(path)).toEqual(before)
  },
)

test('missing settings stop dry-run and install before remote or harness changes', async () => {
  const path = await fixture('missing-settings')
  const before = await snapshot(path)
  const command = [
    process.execPath,
    join(path, 'src/entries/bootstrap.ts'),
    '--yes',
  ]
  const preview = await run([...command, '--dry-run'])
  expect(preview.code).toBe(1)
  expect(preview.stderr).toContain('set up')
  expect(await snapshot(path)).toEqual(before)
  const install = await run(command)
  expect(install.code).toBe(1)
  const after = await snapshot(path)
  delete after[join(path, 'hindsight/env.local')]
  expect(after).toEqual(before)
  expect(await readFile(join(path, 'hindsight/env.local'), 'utf8')).toBe(
    await readFile(join(path, 'hindsight/env.example'), 'utf8'),
  )
})
