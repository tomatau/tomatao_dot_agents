import { asRecord, requireString } from '../lib/parse'
import { VAULT_YML, configWhere, readConfigYaml } from './yaml'

const WHERE = configWhere(VAULT_YML)

export interface VaultConfig {
  /** Vault-relative path to the note declaring what is in sync scope. */
  syncConfig: string
}

export function vaultDir(): string {
  const dir = process.env.VAULT_DIR?.trim()
  if (!dir) {
    throw new Error(
      'VAULT_DIR not set — add it to hindsight/env.local (see env.example)',
    )
  }
  return dir
}

export async function loadVaultConfig(): Promise<VaultConfig> {
  const raw = asRecord(WHERE, (await readConfigYaml(VAULT_YML)) ?? {})
  return { syncConfig: requireString(WHERE, raw, 'syncConfig') }
}
