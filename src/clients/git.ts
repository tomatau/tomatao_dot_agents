import { dirname } from 'node:path'

const run = async (
  cwd: string,
  args: string[],
): Promise<string | undefined> => {
  const res = await Bun.$`git ${args}`.cwd(cwd).quiet().nothrow()
  if (res.exitCode !== 0) return undefined
  const out = res.stdout.toString().trim()
  return out || undefined
}

/** The work tree containing `cwd`, or undefined outside a repo. */
export async function repoRoot(cwd: string): Promise<string | undefined> {
  return run(cwd, ['rev-parse', '--show-toplevel'])
}

/** The fetch URL of `origin`, or of the only remote when it is named otherwise. */
export async function repoRemote(root: string): Promise<string | undefined> {
  const origin = await run(root, ['remote', 'get-url', 'origin'])
  if (origin) return origin
  const first = (await run(root, ['remote']))?.split('\n')[0]
  return first ? run(root, ['remote', 'get-url', first]) : undefined
}

export { dirname }
