import type { Mode } from '../../lib/mode'
import type { Asker } from '../../lib/prompt'
import { bold, dim } from '../../lib/colour'
import { onPath } from '../../lib/shell'
import { PERSONALISATION_DIR, REPO, displayPath } from '../../settings/paths'
import { vaultReadiness } from '../../settings/vault'
import { harnessChoices, writeEnabled } from '../harness/enabled'
import { requireMemorySettings } from '../hindsight/settings'
import { setupMemory } from '../hindsight/setup'
import { isEmptySource, listSources } from '../personalisation'
import { sync } from '../sync'
import { applyRemotePlan, arrangement, remotePlan } from './preflight'

export interface BootstrapOptions {
  mode: Mode
  ask: Asker
  harnesses?: string[]
}

export async function bootstrap({
  mode,
  ask,
  harnesses,
}: BootstrapOptions): Promise<void> {
  console.log(bold('preflight'))
  for (const name of ['git', 'bun', 'just', 'uv']) {
    if (!onPath(name)) throw new Error(`${name} is required on PATH`)
  }
  await requireMemorySettings(mode)
  const vault = await vaultReadiness()

  // Validate flags before changing remotes or harness configuration.
  const declared = await harnessChoices()
  for (const name of harnesses ?? []) {
    if (!declared.some(h => h.name === name))
      throw new Error(`unknown harness: ${name}`)
  }

  console.log(`\n${bold('remotes')}`)
  const seen = await arrangement()
  const plan = await remotePlan(seen)
  if (plan.length && (await ask.confirm(`Add ${plan.join(', ')}?`, true))) {
    for (const line of await applyRemotePlan(seen, mode)) {
      console.log(`${mode.dryRun ? 'would ' : ''}${line}`)
    }
  } else console.log('remotes left as configured')

  console.log(`\n${bold('harnesses')}`)
  const byFlag = harnesses ? new Set(harnesses) : undefined
  const picked = await ask.choose(
    'Which harnesses does this machine use?',
    declared.map(h => ({
      ...h,
      label: h.name,
      chosen: byFlag?.has(h.name) ?? h.enabled,
    })),
    option => option.chosen,
  )
  const wanted = new Set(picked.map(option => option.name))
  const changed = await writeEnabled(
    Object.fromEntries(declared.map(h => [h.name, wanted.has(h.name)])),
    mode,
  )
  for (const line of changed)
    console.log(`${mode.dryRun ? 'would switch ' : ''}${line}`)
  if (!changed.length) console.log('no harness changes')

  console.log(`\n${bold('memory')}`)
  await setupMemory('install', mode)

  console.log(`\n${bold('converge')}`)
  await sync(mode, vault)

  for (const note of (await listSources()).filter(isEmptySource)) {
    console.log(
      `${displayPath(`${PERSONALISATION_DIR}/${note.name}.md`)} says nothing yet`,
    )
  }
  console.log(
    dim(
      `edit personalisation/ and the skills in ${displayPath(`${REPO}/skills`)}`,
    ),
  )
  if (mode.dryRun) console.log('dry run — nothing was changed')
}
