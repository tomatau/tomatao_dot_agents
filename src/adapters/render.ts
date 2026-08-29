import type { SourceFile } from './types'

/** Fold every source into one document, blank-line separated, trailing newline. */
export function aggregate(sources: SourceFile[]): string {
  return `${sources
    .map((s) => s.content)
    .join('\n\n')
    .trimEnd()}\n`
}
