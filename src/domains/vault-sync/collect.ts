import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Glob } from 'bun'
import { vaultDir } from '../../settings/config'
import { parseFrontmatter } from '../../lib/frontmatter'
import { sha256Hex } from '../../lib/hash'
import { loadSyncConfig } from './config'
import type { VaultDocument } from './types'

function hashContent(
  frontmatterRaw: string,
  body: string,
  tags: string[],
): string {
  return sha256Hex(
    `${frontmatterRaw}\n${body}\n${tags.slice().sort().join(',')}`,
  )
}

async function collectFiles(
  vault: string,
  pattern: string,
  excludes: Glob[],
): Promise<string[]> {
  const glob = new Glob(pattern)
  const results: string[] = []
  for await (const rel of glob.scan({ cwd: vault, onlyFiles: true })) {
    if (!rel.endsWith('.md')) continue
    if (excludes.some((excl) => excl.match(rel))) continue
    results.push(rel)
  }
  return results
}

export async function collectVaultDocuments(): Promise<
  Map<string, VaultDocument>
> {
  const vault = vaultDir()
  const config = await loadSyncConfig()
  const excludes = (config.defaults.exclude ?? []).map(
    (pattern) => new Glob(pattern),
  )
  const promoteKeys = new Set(config.defaults.promote_frontmatter ?? [])
  const desired = new Map<string, VaultDocument>()

  for (const source of config.sources) {
    const files = await collectFiles(vault, source.path, excludes)
    for (const rel of files) {
      const abs = join(vault, rel)
      const raw = await readFile(abs, 'utf8')
      const { frontmatter, frontmatterRaw, body } = parseFrontmatter(raw)
      const tags = new Set<string>(['source:obsidian'])
      for (const [k, v] of Object.entries(source.tags ?? {}))
        tags.add(`${k}:${v}`)
      for (const key of promoteKeys) {
        const val = frontmatter[key]
        if (typeof val === 'string' && val.trim())
          tags.add(`${key}:${val.trim()}`)
        else if (Array.isArray(val))
          for (const v of val)
            if (typeof v === 'string' && v.trim())
              tags.add(`${key}:${v.trim()}`)
      }
      const tagList = [...tags].sort()
      const hash = hashContent(frontmatterRaw, body, tagList)
      const documentId = `obsidian:${rel}`
      if (!desired.has(documentId)) {
        desired.set(documentId, {
          vaultRelative: rel,
          documentId,
          body,
          tags: tagList,
          hash,
          frontmatter,
        })
      }
    }
  }
  return desired
}
