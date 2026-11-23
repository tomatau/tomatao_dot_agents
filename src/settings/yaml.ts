import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { overlay } from '../lib/overlay'
import { REPO } from './paths'

const CONFIG_DIR = join(REPO, 'config')

export const ADAPTERS_YML = 'adapters.yml'
export const HINDSIGHT_YML = 'hindsight.yml'
export const VAULT_YML = 'vault.yml'
export const SEARCH_YML = 'search.yml'

const YAML_INDENT = 2
const SUFFIX = '.yml'
const LOCAL = '.local'
const LOCAL_SUFFIX = `${LOCAL}${SUFFIX}`

const stem = (file: string): string => file.slice(0, -SUFFIX.length)

/**
 * How a config file is named when a message points the reader at it. A fault
 * may sit in the shared file or in the machine's local one, so it names both.
 */
export const configWhere = (file: string): string =>
  `config/${stem(file)}[${LOCAL}]${SUFFIX}`

/** `~` is the person's home, a bare path is relative to this checkout. */
export function resolvePath(path: string): string {
  if (path.startsWith('~')) return join(homedir(), path.slice(1))
  if (path.startsWith('/')) return path
  return join(REPO, path)
}

/** The gitignored file a machine writes beside `file` to adjust it for itself. */
export const localConfigName = (file: string): string =>
  `${stem(file)}${LOCAL_SUFFIX}`

export const isLocalConfig = (file: string): boolean =>
  file.endsWith(LOCAL_SUFFIX)

/** One config file's own content, or `undefined` when it is absent or empty. */
export function readConfigFile(file: string): unknown {
  const path = join(CONFIG_DIR, file)
  if (!existsSync(path)) return undefined
  return Bun.YAML.parse(readFileSync(path, 'utf8')) ?? undefined
}

/** Replace one config file. Comments and layout in it are not kept. */
export function writeConfigFile(file: string, value: unknown): void {
  const yaml = Bun.YAML.stringify(value, null, YAML_INDENT)
  const lines = yaml.split('\n').map(line => line.trimEnd())
  writeFileSync(join(CONFIG_DIR, file), `${lines.join('\n')}\n`)
}

/**
 * Read one file from `config/`, with this machine's local file laid over it.
 * Either may be absent. The caller validates what it finds.
 */
export function readConfigYaml(file: string): unknown {
  return overlay(readConfigFile(file), readConfigFile(localConfigName(file)))
}
