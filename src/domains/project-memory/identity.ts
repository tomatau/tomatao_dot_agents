import { basename } from 'node:path'
import type { JsonRpc } from '../../clients/mcp-http'
import { repoRemote, repoRoot } from '../../clients/git'

/** `host/owner/name` from a remote URL, in either scp or url form. */
function remoteSlug(remote: string): string | undefined {
  const scp = remote.match(/^[^@]+@([^:]+):(.+?)(?:\.git)?$/)
  const parts = scp
    ? [scp[1], ...scp[2].split('/')]
    : (() => {
        try {
          const u = new URL(remote)
          return [u.hostname, ...u.pathname.replace(/\.git$/, '').split('/')]
        } catch {
          return []
        }
      })()
  const clean = parts.filter(Boolean)
  return clean.length >= 2 ? clean.join('-') : undefined
}

/** Lowercase, and safe for a bank id and a URL path. */
function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * The bank id for the repo containing `cwd`: named after the remote where there
 * is one, else the directory. The remote survives clones and renames, which a
 * path does not. Undefined outside a repo — we invent no bank.
 */
export async function projectBankId(cwd: string): Promise<string | undefined> {
  const root = await repoRoot(cwd)
  if (!root) return undefined
  const remote = await repoRemote(root)
  const slug = (remote && remoteSlug(remote)) || basename(root)
  return `project-${normalise(slug)}`
}

/**
 * The bank every root a client reports agrees on. Roots naming more than one
 * repo, or any root outside a repo, name none: the bridge cannot tell which of
 * them the session is about.
 */
export async function rootBankId(
  message: JsonRpc,
): Promise<string | undefined> {
  const roots = (message.result as { roots?: { uri?: string }[] })?.roots ?? []
  const banks = new Set(
    await Promise.all(
      roots.map(({ uri }) =>
        uri?.startsWith('file://')
          ? projectBankId(decodeURIComponent(new URL(uri).pathname))
          : undefined,
      ),
    ),
  )
  return banks.size === 1 ? [...banks][0] : undefined
}
