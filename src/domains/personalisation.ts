import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join } from 'node:path'
import type { SourceFile } from '../adapters/types'
import { loadPersonalisationAdapters } from '../adapters/index'
import { loadDeclaredHarnesses } from '../settings/adapters'
import { PERSONALISATION_DIR, REPO } from '../settings/paths'
import { personalisationDestinations, reconcileLinks } from './reconcile'

const FRONTMATTER = /^---\n[\s\S]*?\n---\n/

export async function listSources(): Promise<SourceFile[]> {
  const entries = await readdir(PERSONALISATION_DIR)
  const files = entries.filter(f => f.endsWith('.md')).sort()
  if (files.length === 0) {
    throw new Error(`no .md sources found in ${PERSONALISATION_DIR}`)
  }
  const sources: SourceFile[] = []
  for (const file of files) {
    const raw = await readFile(join(PERSONALISATION_DIR, file), 'utf8')
    sources.push({
      name: basename(file, extname(file)),
      content: raw.replace(FRONTMATTER, '').trim(),
    })
  }
  return sources
}

export type SourceState = 'ok' | 'local' | 'broken-link' | 'foreign-file'

export interface SourceCheck {
  name: string
  path: string
  state: SourceState
}

export async function inspectSources(): Promise<SourceCheck[]> {
  const entries = await readdir(PERSONALISATION_DIR, { withFileTypes: true })
  const files = entries
    .filter(e => e.name.endsWith('.md'))
    .sort((a, b) => a.name.localeCompare(b.name))
  return Promise.all(
    files.map(async entry => {
      const path = join(PERSONALISATION_DIR, entry.name)
      if (entry.isSymbolicLink()) {
        try {
          await stat(path)
          return { name: entry.name, path, state: 'ok' }
        } catch {
          return { name: entry.name, path, state: 'broken-link' }
        }
      }
      // A real .md file checked into the repo is a deliberate local source.
      if (entry.isFile()) return { name: entry.name, path, state: 'local' }
      return { name: entry.name, path, state: 'foreign-file' }
    }),
  )
}

/** A source that says nothing decides nothing, so bootstrap asks for its content. */
export function isEmptySource({ content }: SourceFile): boolean {
  return content.trim().length === 0
}

export async function renderPersonalisation(): Promise<void> {
  const sources = await listSources()
  for (const adapter of await loadPersonalisationAdapters()) {
    for (const file of adapter.render(sources)) {
      await mkdir(dirname(file.distPath), { recursive: true })
      await writeFile(file.distPath, file.content)
      console.log(`rendered     ${file.distPath}`)
    }
  }
}

export async function linkPersonalisation(): Promise<void> {
  const sources = await listSources()
  const adapters = await loadPersonalisationAdapters()
  const wanted = adapters.flatMap(a => a.links(sources))

  // A harness switched off here keeps its declaration but gives up its links,
  // so the file nothing renders any more does not stay wired up.
  await reconcileLinks({
    destinations: personalisationDestinations(await loadDeclaredHarnesses()),
    wanted,
    ownedRoot: REPO,
  })
}
