import { readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'

/**
 * Files a render left behind. A directory that receives rendered files holds
 * nothing else, so a file there that this render did not write came from a
 * source that has since gone.
 */
export async function staleRenders(rendered: string[]): Promise<string[]> {
  const keep = new Set(rendered)
  const stale: string[] = []
  for (const dir of new Set(rendered.map(path => dirname(path)))) {
    const entries = await readdir(dir, { withFileTypes: true })
    const files = entries.filter(e => e.isFile()).map(e => join(dir, e.name))
    stale.push(...files.filter(path => !keep.has(path)))
  }
  return stale.sort()
}
