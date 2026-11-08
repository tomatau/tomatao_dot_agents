import { run } from '../lib/shell'

/**
 * The repository this one is a copy of. A checkout that names it as upstream
 * holds a reference; one that names it `origin` holds its own working copy,
 * which is what a checkout already in place here is.
 */
export const CANONICAL_REMOTE = 'git@github.com:tomatau/tomatao_dot_agents.git'

export interface Remote {
  name: string
  url: string
}

async function git(args: string[]): Promise<string> {
  const { code, stdout, stderr } = await run(['git', ...args])
  if (code !== 0) throw new Error(stderr.trim() || `git ${args[0]} failed`)
  return stdout.trim()
}

/** Every remote in the repo at `cwd`, in the order git lists them. */
export async function remotes(cwd: string): Promise<Remote[]> {
  const seen = new Map<string, string>()
  for (const line of (await git(['-C', cwd, 'remote', '-v']))
    .split('\n')
    .filter(Boolean)) {
    const [name, url, kind] = line.split(/\s+/)
    if (kind === '(fetch)' && !seen.has(name)) seen.set(name, url)
  }
  return [...seen].map(([name, url]) => ({ name, url }))
}

/** Point an existing remote at another url. */
export async function setRemoteUrl(
  cwd: string,
  name: string,
  url: string,
): Promise<void> {
  await git(['-C', cwd, 'remote', 'set-url', name, url])
}

/** Add a remote, for a copy that keeps its settings apart from the reference. */
export async function addRemote(
  cwd: string,
  name: string,
  url: string,
): Promise<void> {
  await git(['-C', cwd, 'remote', 'add', name, url])
}

/** Move a remote under another name, leaving the url alone. */
export async function renameRemote(
  cwd: string,
  from: string,
  to: string,
): Promise<void> {
  await git(['-C', cwd, 'remote', 'rename', from, to])
}

/** Drop a remote, for undoing a rename that was not wanted after all. */
export async function removeRemote(cwd: string, name: string): Promise<void> {
  await git(['-C', cwd, 'remote', 'remove', name])
}

/** The repository containing `cwd`, or nothing when there is none. */
export async function repoRoot(cwd: string): Promise<string | undefined> {
  const { code, stdout } = await run([
    'git',
    '-C',
    cwd,
    'rev-parse',
    '--show-toplevel',
  ])
  return code === 0 && stdout.trim() ? stdout.trim() : undefined
}

/** The fetch URL of origin, falling back to the first remote when origin is absent. */
export async function repoRemote(root: string): Promise<string | undefined> {
  const seen = await remotes(root)
  return (seen.find(remote => remote.name === 'origin') ?? seen[0])?.url
}
