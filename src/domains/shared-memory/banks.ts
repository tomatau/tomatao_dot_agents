import { listBankIds, putBank } from '../../clients/hindsight/banks'
import { loadHindsightConfig } from '../../settings/hindsight'

export type BankState = 'ok' | 'missing' | 'created'

export interface BankCheck {
  id: string
  state: BankState
}

/** Which configured banks the server actually holds. A pin without one is dead. */
export async function inspectBanks(): Promise<BankCheck[]> {
  const { banks } = await loadHindsightConfig()
  const have = await listBankIds()
  return banks.map(b => ({
    id: b.id,
    state: have.has(b.id) ? 'ok' : 'missing',
  }))
}

/** Create every configured bank the server is missing. */
export async function ensureBanks(): Promise<BankCheck[]> {
  const checks = await inspectBanks()
  for (const check of checks) {
    if (check.state !== 'missing') continue
    await putBank(check.id)
    check.state = 'created'
  }
  return checks
}
