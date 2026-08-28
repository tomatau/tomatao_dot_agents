import { hindsightApiUrl } from '../settings/paths'

function apiUrl(path: string): string {
  return `${hindsightApiUrl()}${path}`
}

export interface RetainItem {
  content: string
  document_id: string
  tags?: string[]
  update_mode?: 'replace' | 'append'
}

export async function retainDocuments(
  bankId: string,
  items: RetainItem[],
): Promise<void> {
  if (items.length === 0) return
  const res = await fetch(
    apiUrl(`/v1/default/banks/${encodeURIComponent(bankId)}/memories`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, async: false }),
    },
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`retain failed ${res.status}: ${text}`)
  }
}

export async function deleteDocument(
  bankId: string,
  documentId: string,
): Promise<void> {
  const res = await fetch(
    apiUrl(
      `/v1/default/banks/${encodeURIComponent(bankId)}/documents/${encodeURIComponent(documentId)}`,
    ),
    { method: 'DELETE' },
  )
  if (!res.ok && res.status !== 404) {
    const text = await res.text()
    throw new Error(`delete ${documentId} failed ${res.status}: ${text}`)
  }
}

/** Every document id currently held by a bank, following pagination to completion. */
export async function listDocumentIds(bankId: string): Promise<string[]> {
  const ids: string[] = []
  const limit = 500
  for (let offset = 0; ; offset += limit) {
    const res = await fetch(
      apiUrl(
        `/v1/default/banks/${encodeURIComponent(bankId)}/documents?limit=${limit}&offset=${offset}`,
      ),
    )
    if (!res.ok)
      throw new Error(
        `list documents failed ${res.status}: ${await res.text()}`,
      )
    const data = (await res.json()) as {
      items: { id: string }[]
      total: number
    }
    for (const item of data.items ?? []) ids.push(item.id)
    if (ids.length >= data.total || (data.items ?? []).length === 0) break
  }
  return ids
}
