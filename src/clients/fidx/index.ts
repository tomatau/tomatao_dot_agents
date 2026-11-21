import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { run } from '../../lib/shell'
import { FIDX_BIN } from '../../settings/paths'

export interface Collection {
  name: string
  /** Absolute directory the patterns are relative to. */
  root: string
  /** Python `Path.glob` patterns, so no braces. */
  globs: string[]
  /** Patterns that win over `globs`. */
  excludeGlobs: string[]
}

async function fidx(db: string, args: string[]): Promise<string> {
  const { code, stdout, stderr } = await run([FIDX_BIN, '--db', db, ...args])
  if (code !== 0) {
    const detail = (stderr || stdout).trim()
    throw new Error(`fidx ${args[0]} failed (exit ${code}): ${detail}`)
  }
  return stdout
}

/**
 * Register a collection, replacing its patterns if it already exists, so a
 * changed scope takes effect on the next `indexCollections`.
 */
export async function registerCollection(
  db: string,
  collection: Collection,
): Promise<void> {
  await mkdir(dirname(db), { recursive: true })
  const { name, root, globs, excludeGlobs } = collection
  await fidx(db, [
    'collection',
    'add',
    root,
    '--name',
    name,
    ...globs.flatMap(glob => ['--glob', glob]),
    ...excludeGlobs.flatMap(glob => ['--exclude-glob', glob]),
  ])
}

/**
 * Bring the database in line with its collections. fidx embeds only new or
 * changed documents and drops deleted ones, so a re-run with nothing changed
 * is quick.
 */
export async function indexCollections(db: string): Promise<void> {
  await fidx(db, ['index'])
}

interface Status {
  collections: { name: string; documents: number }[]
}

export async function documentCount(db: string, name: string): Promise<number> {
  const status = JSON.parse(await fidx(db, ['status', '--json'])) as Status
  const collection = status.collections.find(c => c.name === name)
  if (!collection) throw new Error(`fidx has no collection \`${name}\``)
  return collection.documents
}

export type SearchMode = 'hybrid' | 'lexical' | 'vector'

export interface Hit {
  /** `<collection>/<path below its root>`, which `readDocument` takes back. */
  path: string
  score: number
  snippet: string
}

interface Found {
  path: string
  score: number
  snippet?: string
}

export async function search(
  db: string,
  query: string,
  { limit, mode }: { limit: number; mode: SearchMode },
): Promise<Hit[]> {
  const out = await fidx(db, [
    'search',
    query,
    '--json',
    '-n',
    String(limit),
    '--mode',
    mode,
  ])
  const { results } = JSON.parse(out) as { results: Found[] }
  return results.map(({ path, score, snippet }) => ({
    path,
    score,
    snippet: snippet ?? '',
  }))
}

/** A document's full text, by the path a search hit gave. */
export async function readDocument(db: string, path: string): Promise<string> {
  return fidx(db, ['get', path, '--full'])
}
