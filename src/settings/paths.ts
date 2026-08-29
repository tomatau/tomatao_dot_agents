import { homedir } from 'node:os'
import { join } from 'node:path'

export const REPO = join(import.meta.dir, '..', '..')
export const PERSONALISATION_DIR = join(REPO, 'personalisation')
export const SKILLS_DIR = join(REPO, 'skills')
export const MCP_DIR = join(REPO, 'mcp')
/** Names last pinned, so a deleted source can still be cleaned up. */
export const MCP_STATE = join(MCP_DIR, '.state.json')

export const HINDSIGHT_DIR = join(REPO, 'hindsight')
export const HINDSIGHT_ENV_LOCAL = join(HINDSIGHT_DIR, 'env.local')
export const HINDSIGHT_ENV_EXAMPLE = join(HINDSIGHT_DIR, 'env.example')
export const HINDSIGHT_WRAPPER = join(HINDSIGHT_DIR, 'hindsight-api.sh')
export const HINDSIGHT_LOGS_DIR = join(HINDSIGHT_DIR, 'logs')
export const HINDSIGHT_LOG_FILE = join(HINDSIGHT_LOGS_DIR, 'hindsight-api.log')
export const HINDSIGHT_LABEL = 'io.hindsight.api'
export const HINDSIGHT_PLIST_NAME = `${HINDSIGHT_LABEL}.plist`
export const HINDSIGHT_PLIST_REPO = join(HINDSIGHT_DIR, HINDSIGHT_PLIST_NAME)

export function hindsightInstalledPlist(): string {
  return join(homedir(), 'Library/LaunchAgents', HINDSIGHT_PLIST_NAME)
}

/**
 * Hindsight API base URL: `HINDSIGHT_API_URL`, else `HINDSIGHT_API_HOST`/`_PORT`,
 * else the `url` from config/hindsight.yml that the caller passes in.
 */
export function hindsightApiUrl(configured: string): string {
  const explicit = process.env.HINDSIGHT_API_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')
  // A half-set env overrides only its half; the rest comes from `configured`.
  const base = new URL(configured)
  const host = process.env.HINDSIGHT_API_HOST?.trim()
  const port = process.env.HINDSIGHT_API_PORT?.trim()
  if (host) base.hostname = host
  if (port) base.port = port
  return base.origin
}

export function displayPath(path: string): string {
  const home = homedir()
  return path.startsWith(home) ? `~${path.slice(home.length)}` : path
}

export const VAULT_SYNC_CACHE = join(HINDSIGHT_DIR, '.sync-cache.json')
