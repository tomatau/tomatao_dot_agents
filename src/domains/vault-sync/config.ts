import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { SyncConfig, SyncSource } from './types'
import {
  asRecord,
  requireList,
  requireString,
  stringArray,
} from '../../lib/parse'
import { loadVaultConfig, vaultDir } from '../../settings/vault'

function parseSource(where: string, value: unknown, index: number): SyncSource {
  const at = `${where}: source ${index + 1}`
  const raw = asRecord(at, value)
  const tags = raw.tags === undefined ? {} : asRecord(`${at} tags`, raw.tags)
  for (const [key, tag] of Object.entries(tags)) {
    if (typeof tag !== 'string') {
      throw new Error(`${at}: tag \`${key}\` must be a string`)
    }
  }
  return {
    path: requireString(at, raw, 'path'),
    tags: tags as Record<string, string>,
  }
}

/** The vault declares its own sync scope, so this repo only validates it. */
export async function loadSyncConfig(): Promise<SyncConfig> {
  const vault = vaultDir()
  const { syncConfig } = await loadVaultConfig()
  const where = syncConfig
  const raw = asRecord(
    where,
    Bun.YAML.parse(await readFile(join(vault, syncConfig), 'utf8')) ?? {},
  )
  const version = raw.version
  if (typeof version !== 'number') {
    throw new Error(`${where}: \`version\` must be a number`)
  }
  const defaults = asRecord(`${where} defaults`, raw.defaults ?? {})
  return {
    version,
    defaults: {
      exclude: stringArray(`${where} defaults`, defaults, 'exclude'),
      promote_frontmatter: stringArray(
        `${where} defaults`,
        defaults,
        'promote_frontmatter',
      ),
    },
    sources: requireList(where, raw, 'sources').map((s, i) =>
      parseSource(where, s, i),
    ),
  }
}
