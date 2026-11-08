/** One command run without a shell, so nothing in an argument is re-parsed. */
export interface CommandResult {
  /** 127 when the command is not on PATH, as a shell would report. */
  code: number
  stdout: string
  stderr: string
}

/** Run a command and hand back its output instead of throwing. */
export async function run(
  argv: string[],
  { cwd, env }: { cwd?: string; env?: Record<string, string> } = {},
): Promise<CommandResult> {
  const proc = Bun.spawn(argv, {
    cwd,
    env: env ? { ...process.env, ...env } : process.env,
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  return { code, stdout, stderr }
}

/** Whether a command answers on this machine's PATH, without running it. */
export function onPath(command: string): boolean {
  return Bun.which(command) !== null
}
