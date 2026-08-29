import { loadPersonalisationAdapters } from '../../adapters/index'
import { checkFreshness } from '../../adapters/freshness'
import { checkLinks } from '../../lib/links'
import type { Row } from '../../lib/report'
import { inspectSources, listSources } from '../personalisation'

export async function personalisationSourceRows(): Promise<Row[]> {
  return (await inspectSources()).map(c => ({
    state: c.state,
    detail: c.path,
  }))
}

export async function renderRows(): Promise<Row[]> {
  const sources = await listSources()
  const rows: Row[] = []
  for (const adapter of await loadPersonalisationAdapters()) {
    for (const check of await checkFreshness(adapter, sources)) {
      rows.push({
        name: check.name,
        state: check.state,
        detail: check.distPath,
      })
    }
  }
  return rows
}

export async function personalisationLinkRows(): Promise<Row[]> {
  const sources = await listSources()
  const rows: Row[] = []
  for (const adapter of await loadPersonalisationAdapters()) {
    for (const check of await checkLinks({ links: adapter.links(sources) })) {
      rows.push({
        name: adapter.name,
        state: check.state,
        detail: check.link.dest,
      })
    }
  }
  return rows
}
