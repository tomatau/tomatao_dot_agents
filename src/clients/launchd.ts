import { homedir } from 'node:os'
import { run } from '../lib/shell'
import { hindsightApiUrl, loadHindsightConfig } from '../settings/hindsight'
import { hindsightInstalledPlist } from '../settings/paths'

export async function bootout(label: string): Promise<void> {
  const uid = (await run(['id', '-u'])).stdout.trim()
  await run(['launchctl', 'bootout', `gui/${uid}/${label}`])
}

/** Start a launch agent from its plist. Already loaded is the desired state. */
export async function bootstrap(label: string, plist: string): Promise<void> {
  const uid = (await run(['id', '-u'])).stdout.trim()
  const { code, stderr } = await run([
    'launchctl',
    'bootstrap',
    `gui/${uid}`,
    plist,
  ])
  // launchd reports a service that is already loaded as a failure.
  if (code !== 0 && !/already loaded|Bootstrap failed: 5/.test(stderr)) {
    console.error(stderr.trim())
    process.exit(code)
  }
  void label
}

export async function print(label: string): Promise<void> {
  const uid = (await run(['id', '-u'])).stdout.trim()
  const { code, stdout } = await run([
    'launchctl',
    'print',
    `gui/${uid}/${label}`,
  ])
  process.stdout.write(stdout)
  process.exit(code)
}

export async function status(label: string, plist: string): Promise<void> {
  const uid = (await run(['id', '-u'])).stdout.trim()
  const res = await run(['launchctl', 'print', `gui/${uid}/${label}`])
  const prettyPlist = plist.replace(homedir(), '~')
  if (res.code !== 0) {
    const installed = await Bun.file(hindsightInstalledPlist()).exists()
    if (installed) {
      console.log(`${label}: stopped`)
      console.log(`plist:  ${prettyPlist}`)
      return
    }
    console.log(`${label}: not installed (run \`just hindsight install\`)`)
    process.exit(1)
  }
  const out = res.stdout
  const state = out.match(/state = (\w+)/)?.[1] ?? 'unknown'
  const pid = out.match(/pid = (\d+)/)?.[1]
  const exitCode = out.match(/last exit code = ([^\n]+)/)?.[1]?.trim()
  const runs = out.match(/runs = (\d+)/)?.[1]

  const apiUrl = hindsightApiUrl((await loadHindsightConfig()).url)

  const isRunning = state === 'running'
  console.log(
    `${label}: ${isRunning ? `running${pid ? ` (pid ${pid})` : ''}` : `stopped (${state})`}`,
  )
  console.log(`plist:  ${prettyPlist}`)
  if (isRunning) {
    const health = await run(['hindsight', 'health'])
    const healthOut = health.stdout + health.stderr
    const healthLine =
      healthOut.match(/Status:\s*(\w+)/)?.[1] ??
      (health.code === 0 ? 'healthy' : 'unreachable')
    const dbLine = healthOut.match(/Database:\s*(\w+)/)?.[1]
    console.log(
      `health: ${healthLine.toLowerCase()}${dbLine ? ` (db ${dbLine.toLowerCase()})` : ''} @ ${apiUrl}`,
    )
  } else if (exitCode && exitCode !== '(never exited)') {
    console.log(`exit:   ${exitCode}${runs ? ` (runs ${runs})` : ''}`)
  }
}

/** Whether this machine has a launchd to install the service into. */
export const launchdSupported = process.platform === 'darwin'

export function launchdHome(): string {
  return homedir()
}
