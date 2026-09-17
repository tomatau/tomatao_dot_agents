import { syncSearch } from '../domains/search-sync/sync'

const dryRun = process.argv.includes('--dry-run')
const ifStale = process.argv.includes('--if-stale')

try {
  await syncSearch({ dryRun, ifStale })
  process.exit(0)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
