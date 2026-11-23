import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { asRecordOf, requireString } from '../lib/parse'
import {
  VAULT_YML,
  configWhere,
  localConfigName,
  readConfigYaml,
  resolvePath,
} from './yaml'

const WHERE = configWhere(VAULT_YML)
const NO_VAULT = `no vault declared: set \`dir\` in config/${localConfigName(VAULT_YML)}`
const KEYS = ['syncConfig', 'searchConfig', 'dir']

export interface VaultConfig {
  /** Vault-relative path to the note declaring what is in sync scope. */
  syncConfig: string
  /** Vault-relative path to the note declaring what is searchable. */
  searchConfig: string
}

function declaredVault(): Record<string, unknown> {
  return asRecordOf(WHERE, readConfigYaml(VAULT_YML) ?? {}, KEYS)
}

/**
 * Where this machine keeps its vault. The location differs per host, so each
 * machine declares it in its local file. A machine that declares none has no
 * vault.
 */
function declaredVaultDir(): string | undefined {
  const raw = declaredVault()
  if (raw.dir === undefined) return undefined
  return resolvePath(requireString(WHERE, raw, 'dir'))
}

export function vaultDir(): string {
  const dir = declaredVaultDir()
  if (!dir) throw new Error(NO_VAULT)
  return dir
}

export async function loadVaultConfig(): Promise<VaultConfig> {
  const raw = declaredVault()
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
  const vault = declaredVaultDir()
  if (!vault) return { state: 'missing', detail: NO_VAULT }
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
