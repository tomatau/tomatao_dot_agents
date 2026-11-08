import type { Row } from '../../lib/report'
import { vaultReadiness } from '../../settings/vault'

/**
 * Whether this machine can sync from a vault at all. Without one the two
 * vault-fed steps are skipped rather than broken, so a missing vault is a
 * warning, never a failure.
 */
export async function vaultRows(): Promise<Row[]> {
  const readiness = await vaultReadiness()
  return readiness.state === 'ok'
    ? [
        { state: 'ok', detail: readiness.config.syncConfig },
        { state: 'ok', detail: readiness.config.searchConfig },
      ]
    : [{ state: 'missing', detail: readiness.detail }]
}
