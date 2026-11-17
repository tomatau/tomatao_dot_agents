import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { sha256Hex } from '../../lib/hash'
import { LEANN_STATE } from '../../settings/paths'

export interface IndexBuild {
  /** When the build that produced the live index finished. */
  builtAt: string
  documentCount: number
  /** Identifies the document list, so a changed scope reads as stale. */
  documentsHash: string
}

interface BuildLog {
  version: number
  indexes: Record<string, IndexBuild>
}

const EMPTY: BuildLog = { version: 1, indexes: {} }

/**
 * LEANN's MCP offers search and list but no build or status, so what it cannot
 * answer is recorded here instead: which indexes this machine has built, and
 * when. A reader judging freshness has nowhere else to look.
 */
async function load(): Promise<BuildLog> {
  try {
    const parsed = JSON.parse(await readFile(LEANN_STATE, 'utf8'))
    return parsed?.version === 1 ? (parsed as BuildLog) : EMPTY
  } catch {
    return EMPTY
  }
}

export async function lastBuilds(): Promise<Record<string, IndexBuild>> {
  return (await load()).indexes
}

/**
 * Identifies the document set an index was built from. Its shape is the
 * caller's business — the same list must simply be offered back to compare.
 */
export function documentsHash(documents: string[]): string {
  return sha256Hex(documents.join('\n'))
}

/** Called only once a build has succeeded; a failure leaves the old record. */
export async function recordBuild(
  name: string,
  build: IndexBuild,
): Promise<void> {
  const log = await load()
  log.indexes[name] = build
  await mkdir(dirname(LEANN_STATE), { recursive: true })
  await writeFile(LEANN_STATE, `${JSON.stringify(log, null, 2)}\n`)
}
