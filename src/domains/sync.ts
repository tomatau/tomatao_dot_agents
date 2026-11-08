import type { Mode } from '../lib/mode'
import type { VaultReadiness } from '../settings/vault'
import { run } from '../lib/shell'
import { REPO } from '../settings/paths'

/**
 * The steps `just sync` runs, in the order they depend on each other.
 *
 * The repo's own steps run everywhere. The two fed by the vault run only where
 * `syncConfig` and `searchConfig` both resolve inside a vault this machine has,
 * so a machine without one is still fully wired.
 */
const REPO_STEPS = ['sync-personalisation', 'link-skills', 'banks', 'mcp']
const VAULT_STEPS = ['search-sync --if-stale', 'sync-profile']

export function syncSteps(vaultReady: boolean): string[] {
  return [...REPO_STEPS, ...(vaultReady ? VAULT_STEPS : [])]
}

/** Shared convergence runner for bootstrap and subsequent syncs. */
export async function sync(mode: Mode, vault: VaultReadiness): Promise<void> {
  if (vault.state !== 'ok') console.log(`vault sync skipped — ${vault.detail}`)
  for (const step of syncSteps(vault.state === 'ok')) {
    console.log(`${mode.dryRun ? 'would run ' : ''}just ${step}`)
    if (mode.dryRun) continue
    const { code, stdout, stderr } = await run(['just', ...step.split(' ')], {
      cwd: REPO,
    })
    process.stdout.write(stdout)
    process.stderr.write(stderr)
    if (code !== 0) throw new Error(`just ${step} failed (${code})`)
  }
}
