import { unlink } from 'node:fs/promises'
import { ensureLinks } from '../../lib/links'
import { bootout, bootstrap } from '../../clients/launchd'
import {
  HINDSIGHT_LABEL,
  HINDSIGHT_PLIST_REPO,
  hindsightInstalledPlist,
} from '../../settings/paths'
import { render } from './plist'

export async function install(): Promise<void> {
  await render()
  const dest = hindsightInstalledPlist()
  const [enforced] = await ensureLinks({
    links: [{ dest, target: HINDSIGHT_PLIST_REPO }],
  })
  console.log(
    `${enforced.result.padEnd(13)}${enforced.link.dest} -> ${enforced.link.target}`,
  )
  await bootstrap(HINDSIGHT_LABEL, dest)
  console.log(`bootstrapped ${HINDSIGHT_LABEL} (RunAtLoad + KeepAlive)`)
}

export async function uninstall(): Promise<void> {
  await bootout(HINDSIGHT_LABEL)
  try {
    await unlink(hindsightInstalledPlist())
    console.log(`unlinked     ${hindsightInstalledPlist()}`)
  } catch {}
  console.log(`booted out   ${HINDSIGHT_LABEL}`)
}

export async function start(): Promise<void> {
  await bootstrap(HINDSIGHT_LABEL, hindsightInstalledPlist())
  console.log(`started      ${HINDSIGHT_LABEL}`)
}

export async function stop(): Promise<void> {
  await bootout(HINDSIGHT_LABEL)
  console.log(`stopped      ${HINDSIGHT_LABEL}`)
}

export async function restart(): Promise<void> {
  await bootout(HINDSIGHT_LABEL)
  await bootstrap(HINDSIGHT_LABEL, hindsightInstalledPlist())
  console.log(`restarted    ${HINDSIGHT_LABEL}`)
}
