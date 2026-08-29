import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { REPO } from './paths'

const CONFIG_DIR = join(REPO, 'config')

export const ADAPTERS_YML = 'adapters.yml'
export const HINDSIGHT_YML = 'hindsight.yml'
export const VAULT_YML = 'vault.yml'

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
