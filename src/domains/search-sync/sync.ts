import { join } from 'node:path'
import type { IndexPlan } from './types'
import { buildIndex } from '../../clients/leann/build'
import { documentsHash, recordBuild } from '../../clients/leann/state'
import { vaultDir } from '../../settings/vault'
import { loadSearchConfig } from './config'
import { planIndex } from './collect'
import { indexFreshness } from './freshness'

/** Embedding runs locally under this model, so no note leaves the machine. */
const BACKEND = 'hnsw'
const EMBEDDING_MODEL = 'facebook/contriever'

async function freshIndexNames(): Promise<Set<string>> {
  const freshness = await indexFreshness()
  return new Set(freshness.filter(f => f.state === 'fresh').map(f => f.name))
}

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

export interface SyncOptions {
  dryRun?: boolean
  /** Rebuild only what doctor would call stale, so `just sync` stays quick. */
  ifStale?: boolean
}

export async function syncSearch(opts: SyncOptions = {}): Promise<IndexPlan[]> {
  const vault = vaultDir()
  const config = await loadSearchConfig()
  const fresh = opts.ifStale ? await freshIndexNames() : new Set<string>()
  const plans: IndexPlan[] = []
  for (const index of config.indexes) {
    if (fresh.has(index.name)) {
      console.log(`${index.name} — fresh, nothing to build`)
      continue
    }
    const plan = await planIndex(index)
    plans.push(plan)
    console.log(describe(plan))
    if (plan.files.length === 0) {
      throw new Error(
        `${index.name}: no notes matched — refusing to build an empty index`,
      )
    }
    if (opts.dryRun) continue
    await buildIndex({
      name: index.name,
      files: plan.files.map(rel => join(vault, rel)),
      backend: BACKEND,
      embeddingModel: EMBEDDING_MODEL,
    })
    await recordBuild(index.name, {
      builtAt: new Date().toISOString(),
      documentCount: plan.files.length,
      documentsHash: documentsHash(plan.files),
    })
    console.log(`${index.name} — built`)
  }
  if (opts.dryRun) console.log('(dry-run, nothing built)')
  return plans
}
