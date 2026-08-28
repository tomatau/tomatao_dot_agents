import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadVaultConfig, vaultDir } from "../../settings/config";
import type { SyncConfig } from "./types";

export async function loadSyncConfig(): Promise<SyncConfig> {
  const vault = vaultDir();
  const { syncConfig } = await loadVaultConfig();
  const raw = await readFile(join(vault, syncConfig), "utf8");
  return Bun.YAML.parse(raw) as SyncConfig;
}
