import { sync } from '../domains/sync'
import { APPLY } from '../lib/mode'
import { vaultReadiness } from '../settings/vault'

try {
  await sync(APPLY, await vaultReadiness())
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
