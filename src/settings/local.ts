import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'

/** Use the service wrapper's shell semantics: file assignments override inherited values. */
export function readSettingsFile(path: string): Record<string, string> {
  if (!existsSync(path))
    return Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] => entry[1] !== undefined,
      ),
    )
  let output: string
  try {
    output = execFileSync(
      '/bin/sh',
      ['-euc', 'set -a; . "$1" >/dev/null; /usr/bin/env -0', 'settings', path],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    )
  } catch {
    throw new Error(`cannot load shell settings from ${path}`)
  }
  return Object.fromEntries(
    output
      .split('\0')
      .filter(Boolean)
      .map(entry => {
        const split = entry.indexOf('=')
        return [entry.slice(0, split), entry.slice(split + 1)]
      }),
  )
}
