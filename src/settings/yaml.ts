import { existsSync, readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { REPO } from './paths'

const CONFIG_DIR = join(REPO, 'config')

export const ADAPTERS_YML = 'adapters.yml'
export const HINDSIGHT_YML = 'hindsight.yml'
export const VAULT_YML = 'vault.yml'
export const VAULT_LOCAL_YML = 'vault.local.yml'

/** How a config file is named when a message points the reader at it. */
export const configWhere = (file: string): string => `config/${file}`

/** `~` is the person's home, a bare path is relative to this checkout. */
export function resolvePath(path: string): string {
  if (path.startsWith('~')) return join(homedir(), path.slice(1))
  if (path.startsWith('/')) return path
  return join(REPO, path)
}

/** Read one file from `config/`. The caller validates what it finds. */
export async function readConfigYaml(file: string): Promise<unknown> {
  return Bun.YAML.parse(await readFile(join(CONFIG_DIR, file), 'utf8'))
}

/**
 * Read a gitignored file from `config/` that each machine writes for itself.
 * A machine that never wrote it has made a choice, so absence is `undefined`
 * rather than a fault.
 */
export function readLocalConfigYaml(file: string): unknown {
  const path = join(CONFIG_DIR, file)
  if (!existsSync(path)) return undefined
  return Bun.YAML.parse(readFileSync(path, 'utf8'))
}
