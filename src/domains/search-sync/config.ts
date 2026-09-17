import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { SearchConfig, SearchIndex } from './types'
import {
  asRecord,
  requireList,
  requireString,
  stringArray,
} from '../../lib/parse'
import { loadVaultConfig, vaultDir } from '../../settings/vault'

function parseIndex(where: string, name: string, value: unknown): SearchIndex {
  const at = `${where}: index \`${name}\``
  const raw = asRecord(at, value)
  const sources = requireList(at, raw, 'sources').map((entry, i) => {
    const source = `${at} source ${i + 1}`
    return requireString(source, asRecord(source, entry), 'path')
  })
  return { name, sources, unindexed: stringArray(at, raw, 'unindexed') }
}

/** The vault declares its own search scope, so this repo only validates it. */
export async function loadSearchConfig(): Promise<SearchConfig> {
  const { searchConfig } = await loadVaultConfig()
  const where = searchConfig
  const raw = asRecord(
    where,
    Bun.YAML.parse(await readFile(join(vaultDir(), searchConfig), 'utf8')) ??
      {},
  )
  const version = raw.version
  if (typeof version !== 'number') {
    throw new Error(`${where}: \`version\` must be a number`)
  }
  const indexes = asRecord(`${where} indexes`, raw.indexes ?? {})
  const parsed = Object.entries(indexes).map(([name, value]) =>
    parseIndex(where, name, value),
  )
  if (parsed.length === 0) {
    throw new Error(`${where}: \`indexes\` must name at least one index`)
  }
  return { version, indexes: parsed }
}
