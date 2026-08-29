import { appendFile, mkdir, rename, stat } from 'node:fs/promises'
import { dirname } from 'node:path'

/** Roll over at this size, keeping one previous file. Sessions append forever. */
const MAX_BYTES = 256 * 1024

async function rotate(path: string): Promise<void> {
  try {
    const { size } = await stat(path)
    if (size >= MAX_BYTES) await rename(path, `${path}.1`)
  } catch {
    // No file yet, or it vanished under us; either way there is nothing to roll.
  }
}

/**
 * Append timestamped lines to a file, rolling it over once it grows large.
 * Logging never takes its caller down, so a failure to write is swallowed.
 */
export function fileLogger(path: string): (line: string) => Promise<void> {
  return async line => {
    try {
      await mkdir(dirname(path), { recursive: true })
      await rotate(path)
      await appendFile(path, `${new Date().toISOString()} ${line}\n`)
    } catch {}
  }
}
