import { syncSearch } from '../domains/sync-search/sync'

const dryRun = process.argv.includes('--dry-run')

try {
  await syncSearch({ dryRun })
  process.exit(0)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
