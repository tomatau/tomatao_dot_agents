import type { IndexPlan, SearchIndex } from './types'
import { Glob } from 'bun'
import { vaultDir } from '../../settings/vault'

/**
 * The notes one index covers. An exclusion always wins, so widening a source
 * glob can never pull an unindexed folder in by accident.
 */
export async function collectIndexFiles(index: SearchIndex): Promise<string[]> {
  const vault = vaultDir()
  const excluded = index.unindexed.map(pattern => new Glob(pattern))
  const found = new Set<string>()
  for (const source of index.sources) {
    const glob = new Glob(source)
    for await (const rel of glob.scan({ cwd: vault, onlyFiles: true })) {
      if (!rel.endsWith('.md')) continue
      if (excluded.some(excl => excl.match(rel))) continue
      found.add(rel)
    }
  }
  return [...found].sort()
}

export async function planIndex(index: SearchIndex): Promise<IndexPlan> {
  return { index, files: await collectIndexFiles(index) }
}
