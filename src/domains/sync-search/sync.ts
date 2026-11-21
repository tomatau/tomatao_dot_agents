import type { IndexPlan, SearchIndex } from './types'
import {
  documentCount,
  indexCollections,
  registerCollection,
} from '../../clients/fidx'
import { fidxDb } from '../../settings/paths'
import { vaultDir } from '../../settings/vault'
import { expandBraces } from './braces'
import { planIndex } from './collect'
import { loadSearchConfig } from './config'

function describe(plan: IndexPlan): string {
  const folders = new Map<string, number>()
  for (const rel of plan.files) {
    const top = rel.split('/')[0] ?? rel
    folders.set(top, (folders.get(top) ?? 0) + 1)
  }
  const breakdown = [...folders]
    .sort((a, b) => b[1] - a[1])
    .map(([folder, count]) => `${folder} ${count}`)
    .join(', ')
  return `${plan.index.name} — ${plan.files.length} notes (${breakdown})`
}

/**
 * fidx matches patterns itself, with Python's rules rather than Bun's: it
 * does not follow a symlinked folder, for one. Its count must equal the
 * vault's own plan, or the two disagree about what the index covers.
 */
async function build(index: SearchIndex, expected: number): Promise<void> {
  const db = fidxDb(index.name)
  await registerCollection(db, {
    name: index.name,
    root: vaultDir(),
    globs: index.sources.flatMap(expandBraces),
    excludeGlobs: index.unindexed.flatMap(expandBraces),
  })
  await indexCollections(db)
  const indexed = await documentCount(db, index.name)
  if (indexed !== expected) {
    throw new Error(
      `${index.name}: fidx indexed ${indexed} notes, but the scope covers ` +
        `${expected} — a symlinked folder, or a pattern the two read apart`,
    )
  }
}

export interface SyncOptions {
  dryRun?: boolean
}

export async function syncSearch(opts: SyncOptions = {}): Promise<IndexPlan[]> {
  const config = await loadSearchConfig()
  const plans: IndexPlan[] = []
  for (const index of config.indexes) {
    const plan = await planIndex(index)
    plans.push(plan)
    console.log(describe(plan))
    if (plan.files.length === 0) {
      throw new Error(
        `${index.name}: no notes matched — refusing to build an empty index`,
      )
    }
    if (opts.dryRun) continue
    await build(index, plan.files.length)
    console.log(`${index.name} — indexed`)
  }
  if (opts.dryRun) console.log('(dry-run, nothing built)')
  return plans
}
