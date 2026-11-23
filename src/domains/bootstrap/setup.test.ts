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
import { basename, dirname, join } from 'node:path'
import { run } from '../../lib/shell'
import { REPO } from '../../settings/paths'
import { loadVaultConfig } from '../../settings/vault'
import {
  VAULT_YML,
  configWhere,
  isLocalConfig,
  localConfigName,
} from '../../settings/yaml'

const VAULT_LOCAL_YML = localConfigName(VAULT_YML)

const OFFLINE_SETTINGS =
  'HINDSIGHT_API_LLM_PROVIDER=sh\nHINDSIGHT_API_URL=http://127.0.0.1:1\n'

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
  // A fixture starts from the shared config, whatever this machine declares.
  await cp(join(REPO, 'config'), join(path, 'config'), {
    recursive: true,
    filter: source => !isLocalConfig(basename(source)),
  })
  await symlink(join(REPO, 'node_modules'), join(path, 'node_modules'))
  await mkdir(join(path, 'personalisation'))
  await writeFile(
    join(path, 'personalisation/instructions.md'),
    'Fixture instructions\n',
  )
  await mkdir(join(path, 'hindsight'))
  await writeFile(
    join(path, 'hindsight/env.example'),
    'HINDSIGHT_API_LLM_PROVIDER=sh\n',
  )
  const result = await run(['git', 'init', '-q', path])
  if (result.code) throw new Error(result.stderr)
  return path
}

function previewBootstrap(path: string) {
  return run([
    process.execPath,
    join(path, 'src/entries/bootstrap.ts'),
    '--dry-run',
    '--yes',
    '--harnesses=claude',
  ])
}

/** A vault holding the two scope notes, declared as this fixture's vault. */
async function declareVault(path: string): Promise<void> {
  const vault = join(path, 'vault')
  const { syncConfig, searchConfig } = await loadVaultConfig()
  for (const note of [syncConfig, searchConfig]) {
    await mkdir(dirname(join(vault, note)), { recursive: true })
    await writeFile(join(vault, note), 'version: 1\n')
  }
  await writeFile(join(path, 'config', VAULT_LOCAL_YML), `dir: ${vault}\n`)
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
    await writeFile(join(path, 'hindsight/env.local'), OFFLINE_SETTINGS)
    const before = await snapshot(path)
    const result = await previewBootstrap(path)
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('would install launchd service')
    expect(result.stdout).toContain('would ensure bank')
    expect(result.stdout).toContain('would run just sync-personalisation')
    expect(await snapshot(path)).toEqual(before)
  },
)

test.skipIf(process.platform !== 'darwin')(
  'bootstrap skips the vault-fed steps on a machine without a vault',
  async () => {
    // Arrange
    const path = await fixture('no-vault')
    await writeFile(join(path, 'hindsight/env.local'), OFFLINE_SETTINGS)
    const expectedNotice = 'vault sync skipped'
    const vaultFedStep = 'would run just sync-profile'

    // Act
    const result = await previewBootstrap(path)

    // Assert
    expect(result.code).toBe(0)
    expect(result.stdout).toContain(expectedNotice)
    expect(result.stdout).not.toContain(vaultFedStep)
  },
)

test.skipIf(process.platform !== 'darwin')(
  'bootstrap previews the vault-fed steps for a declared vault',
  async () => {
    // Arrange
    const path = await fixture('declared-vault')
    await writeFile(join(path, 'hindsight/env.local'), OFFLINE_SETTINGS)
    await declareVault(path)
    const vaultFedStep = 'would run just sync-profile'

    // Act
    const result = await previewBootstrap(path)

    // Assert
    expect(result.code).toBe(0)
    expect(result.stdout).toContain(vaultFedStep)
  },
)

test('a misspelt vault setting stops bootstrap in preflight', async () => {
  // Arrange
  const path = await fixture('misspelt-vault-setting')
  await writeFile(join(path, 'hindsight/env.local'), OFFLINE_SETTINGS)
  await writeFile(join(path, 'config', VAULT_LOCAL_YML), 'path: ~/vault\n')
  const expectedFault = `${configWhere(VAULT_YML)}: unknown key \`path\``
  const firstStepAfterPreflight = 'remotes'

  // Act
  const result = await previewBootstrap(path)

  // Assert
  expect(result.code).toBe(1)
  expect(result.stderr).toContain(expectedFault)
  expect(result.stdout).not.toContain(firstStepAfterPreflight)
})

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
