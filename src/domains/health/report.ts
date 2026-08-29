import type { Section } from '../../lib/report'
import type { McpSources } from '../mcp/sources'
import { loadAdaptersConfig } from '../../settings/adapters'
import { nativeSkillHarnesses } from '../skills'
import { bankRows, mcpPinRows } from './mcp'
import {
  personalisationLinkRows,
  personalisationSourceRows,
  renderRows,
} from './personalisation'
import { nativeSection, skillLinkRows, skillSourceRows } from './skills'

// Doctor must report on broken wiring, never crash because of it.
async function section(
  title: string,
  collect: () => Promise<Section['rows']>,
): Promise<Section> {
  try {
    return { title, rows: await collect() }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return { title, rows: [{ state: 'error', detail }] }
  }
}

/** Grouped by concern, each family in the order its steps depend on. */
export async function collectSections(sources: McpSources): Promise<Section[]> {
  return (
    [
      // memory: a pin means nothing until the bank behind it exists
      await section('hindsight banks', bankRows),
      await section('mcp pins', () => mcpPinRows(sources)),

      // personalisation: source note → rendered file → link into the harness
      await section('personalisation sources', personalisationSourceRows),
      await section('personalisation renders (dist vs fresh)', renderRows),
      await section('personalisation links', personalisationLinkRows),

      // skills: source dir → link into the harness, or read where it lies
      await section('skill sources', skillSourceRows),
      await section('skill links', skillLinkRows),
      nativeSection(nativeSkillHarnesses(await loadAdaptersConfig())),
    ]
      // drop sections with nothing to say
      .filter(s => s.rows.length > 0)
  )
}
