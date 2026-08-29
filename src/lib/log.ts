import { appendFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

/**
 * Append timestamped lines to a file. Logging never takes its caller down, so a
 * failure to write is swallowed rather than raised.
 */
export function fileLogger(path: string): (line: string) => Promise<void> {
  return async (line) => {
    try {
      await mkdir(dirname(path), { recursive: true })
      await appendFile(path, `${new Date().toISOString()} ${line}\n`)
    } catch {}
  }
}
