import type { Mode } from '../../lib/mode'
import { ensureBank } from '../../clients/hindsight/banks'
import { uvToolInstall } from '../../clients/tool'
import { hindsightApiUrl, loadHindsightConfig } from '../../settings/hindsight'
import { HINDSIGHT_LABEL } from '../../settings/paths'
import { inspectBanks } from '../shared-memory/banks'
import { install } from './lifecycle'
import { requireMemorySettings } from './settings'

export type MemoryAction =
  | { kind: 'install-tool' }
  | { kind: 'install-service' }
  | { kind: 'ensure-bank'; id: string }

export async function hindsightReachable(): Promise<boolean> {
  const url = hindsightApiUrl((await loadHindsightConfig()).url)
  try {
    return (await fetch(`${url}/health`, { signal: AbortSignal.timeout(1500) }))
      .ok
  } catch {
    return false
  }
}

/** An offline server cannot reveal its persisted banks. Ensure them after startup. */
export async function planBanks(reachable: boolean): Promise<MemoryAction[]> {
  const banks = reachable
    ? (await inspectBanks()).filter(bank => bank.state === 'missing')
    : (await loadHindsightConfig()).banks
  return banks.map(({ id }) => ({ kind: 'ensure-bank', id }))
}

export async function planMemoryInstall(): Promise<MemoryAction[]> {
  if (process.platform !== 'darwin')
    throw new Error('Hindsight service installation requires macOS launchd')
  const reachable = await hindsightReachable()
  return [
    { kind: 'install-tool' },
    ...(reachable ? [] : [{ kind: 'install-service' } as const]),
    ...(await planBanks(reachable)),
  ]
}

export function describeMemoryAction(action: MemoryAction): string {
  switch (action.kind) {
    case 'install-tool':
      return 'run uv tool install hindsight-api'
    case 'install-service':
      return `install launchd service ${HINDSIGHT_LABEL}`
    case 'ensure-bank':
      return `ensure bank ${action.id}`
  }
}

async function waitForHindsight(): Promise<void> {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (await hindsightReachable()) return
    await Bun.sleep(250)
  }
  throw new Error(
    'Hindsight did not become ready within 30 seconds; check just hindsight logs',
  )
}

export async function applyMemoryAction(action: MemoryAction): Promise<void> {
  switch (action.kind) {
    case 'install-tool': {
      const result = await uvToolInstall('hindsight-api')
      if (!result.ok)
        throw new Error(result.out || 'hindsight-api installation failed')
      break
    }
    case 'install-service':
      await install()
      await waitForHindsight()
      break
    case 'ensure-bank':
      await ensureBank(action.id)
      break
  }
}

/** Both CLIs preview and apply this exact action list. */
export async function setupMemory(
  command: 'install' | 'banks',
  mode: Mode,
): Promise<void> {
  if (command === 'install') await requireMemorySettings(mode)
  const plan =
    command === 'install'
      ? await planMemoryInstall()
      : await planBanks(await hindsightReachable())
  for (const action of plan) {
    console.log(`${mode.dryRun ? 'would ' : ''}${describeMemoryAction(action)}`)
    if (!mode.dryRun) await applyMemoryAction(action)
  }
  if (!plan.length) console.log('memory banks are up to date')
}
