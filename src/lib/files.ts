import { stat } from 'node:fs/promises'

/**
 * How many of these paths changed after a moment. A path that has since gone
 * counts as unchanged: its absence is a separate fact, for the caller to find.
 */
export async function countModifiedSince(
  paths: string[],
  since: number,
): Promise<number> {
  let modified = 0
  for (const path of paths) {
    try {
      const { mtimeMs } = await stat(path)
      if (mtimeMs > since) modified++
    } catch {}
  }
  return modified
}
