import { run } from '../lib/shell'

/** A command's output, or why there was none. */
export interface ToolRun {
  ok: boolean
  out: string
}

/** Run a tool, keeping its output for a message rather than printing it. */
export async function tool(
  argv: string[],
  env?: Record<string, string>,
): Promise<ToolRun> {
  const { code, stdout, stderr } = await run(argv, { env })
  return { ok: code === 0, out: (stdout + stderr).trim() }
}

/**
 * Install a tool into the user's own bin directory. `uv tool install` is
 * idempotent: an installed package is left as it is, so re-running is safe.
 * `PATH` is widened because a daemon inherits none of a login shell's.
 */
export async function uvToolInstall(pkg: string): Promise<ToolRun> {
  return tool(['uv', 'tool', 'install', pkg], {
    PATH: `${process.env.HOME}/.local/bin:${process.env.PATH ?? ''}`,
  })
}
