import { readFile } from 'node:fs/promises'
import type { PersonalisationAdapter, SourceFile } from './types'

export type Freshness = 'fresh' | 'stale' | 'missing'

export interface FreshnessCheck {
  name: string
  distPath: string
  state: Freshness
}

// Re-renders in memory and compares against the committed dist files.
export async function checkFreshness(
  adapter: PersonalisationAdapter,
  sources: SourceFile[],
): Promise<FreshnessCheck[]> {
  return Promise.all(
    adapter.render(sources).map(async (file) => {
      let onDisk: string | null = null
      try {
        onDisk = await readFile(file.distPath, 'utf8')
      } catch {
        onDisk = null
      }
      const state: Freshness =
        onDisk === null
          ? 'missing'
          : onDisk === file.content
            ? 'fresh'
            : 'stale'
      return { name: adapter.name, distPath: file.distPath, state }
    }),
  )
}
