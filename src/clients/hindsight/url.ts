import { hindsightApiUrl, loadHindsightConfig } from '../../settings/hindsight'

// Read once: every call in a run resolves the same base URL.
let base: Promise<string> | undefined

export async function apiUrl(path: string): Promise<string> {
  base ??= loadHindsightConfig().then(c => hindsightApiUrl(c.url))
  return `${await base}${path}`
}
