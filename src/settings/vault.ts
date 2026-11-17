import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { asRecord, requireString } from '../lib/parse'
import {
  VAULT_LOCAL_YML,
  VAULT_YML,
  configWhere,
  readConfigYaml,
  readLocalConfigYaml,
  resolvePath,
} from './yaml'

const WHERE = configWhere(VAULT_YML)
const LOCAL_WHERE = configWhere(VAULT_LOCAL_YML)
const NO_VAULT = `no vault declared: set \`dir\` in ${LOCAL_WHERE}`

export interface VaultConfig {
  /** Vault-relative path to the note declaring what is in sync scope. */
  syncConfig: string
  /** Vault-relative path to the note declaring what is searchable. */
  searchConfig: string
}

/**
 * Where this machine keeps its vault. The location differs per host, so it is
 * declared beside the shared vault config in a file git ignores. A machine
 * without that file has no vault.
 */
function declaredVaultDir(): string | undefined {
  const declared = readLocalConfigYaml(VAULT_LOCAL_YML)
  if (declared === undefined) return undefined
  const raw = asRecord(LOCAL_WHERE, declared ?? {})
  return resolvePath(requireString(LOCAL_WHERE, raw, 'dir'))
}

export function vaultDir(): string {
  const dir = declaredVaultDir()
  if (!dir) throw new Error(NO_VAULT)
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
