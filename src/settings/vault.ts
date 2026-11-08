import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { asRecord, requireString } from '../lib/parse'
import { localSetting } from './local'
import { VAULT_YML, configWhere, readConfigYaml } from './yaml'

const WHERE = configWhere(VAULT_YML)

export interface VaultConfig {
  /** Vault-relative path to the note declaring what is in sync scope. */
  syncConfig: string
  /** Vault-relative path to the note declaring what is searchable. */
  searchConfig: string
}

export function vaultDir(): string {
  const dir = localSetting('VAULT_DIR')
  if (!dir) {
    throw new Error(
      'VAULT_DIR not set — add it to hindsight/env.local (see env.example)',
    )
  }
  return dir
}

export async function loadVaultConfig(): Promise<VaultConfig> {
  const raw = asRecord(WHERE, (await readConfigYaml(VAULT_YML)) ?? {})
  return {
    syncConfig: requireString(WHERE, raw, 'syncConfig'),
    searchConfig: requireString(WHERE, raw, 'searchConfig'),
  }
}

/**
 * Whether this machine can sync from a vault at all. Both paths are set in
 * config, and both exist inside a vault this machine actually has. A machine
 * without one still wants everything else, so the answer is reported, never
 * thrown.
 */
export type VaultReadiness =
  | { state: 'ok'; vault: string; config: VaultConfig }
  | { state: 'missing'; detail: string }

async function readable(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

export async function vaultReadiness(): Promise<VaultReadiness> {
  const vault = localSetting('VAULT_DIR')
  if (!vault) {
    return {
      state: 'missing',
      detail: 'VAULT_DIR not set — add it to hindsight/env.local',
    }
  }
  if (!(await readable(vault))) {
    return { state: 'missing', detail: `vault not found: ${vault}` }
  }
  const config = await loadVaultConfig()
  for (const [key, rel] of Object.entries(config)) {
    if (!(await readable(join(vault, rel)))) {
      return { state: 'missing', detail: `${key} not found: ${rel}` }
    }
  }
  return { state: 'ok', vault, config }
}
