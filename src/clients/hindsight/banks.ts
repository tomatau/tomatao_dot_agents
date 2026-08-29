import { apiUrl } from './url'

/** Bank ids the server currently holds. */
export async function listBankIds(): Promise<Set<string>> {
  const res = await fetch(await apiUrl('/v1/default/banks?limit=500'))
  if (!res.ok) {
    throw new Error(`list banks failed ${res.status}: ${await res.text()}`)
  }
  const data = (await res.json()) as { banks: { bank_id: string }[] }
  return new Set((data.banks ?? []).map(b => b.bank_id))
}

/** Create a bank, or leave an existing one as it is. */
export async function putBank(bankId: string): Promise<void> {
  const res = await fetch(
    await apiUrl(`/v1/default/banks/${encodeURIComponent(bankId)}`),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: bankId }),
    },
  )
  if (!res.ok) {
    throw new Error(
      `create bank ${bankId} failed ${res.status}: ${await res.text()}`,
    )
  }
}

/** Create one bank if the server does not have it yet. */
export async function ensureBank(id: string): Promise<boolean> {
  if ((await listBankIds()).has(id)) return false
  await putBank(id)
  return true
}
