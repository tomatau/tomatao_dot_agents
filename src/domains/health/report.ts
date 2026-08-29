import { loadAdaptersConfig } from '../../settings/config'
import type { Row, Section } from '../../lib/report'
import { bankRows, mcpPinRows } from './mcp'
import {
  personalisationLinkRows,
  personalisationSourceRows,
  renderRows,
} from './personalisation'
import { nativeSkillHarnesses } from '../skills'
import { nativeSection, skillLinkRows, skillSourceRows } from './skills'

const PASS_STATES = new Set(['ok', 'fresh', 'local'])

// Doctor must report on broken wiring, never crash because of it.
async function section(
  title: string,
  collect: () => Promise<Row[]>,
): Promise<Section> {
  try {
    const rows = await collect()
    return {
      title,
      rows,
      failures: rows.filter(r => !PASS_STATES.has(r.state)).length,
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return { title, rows: [{ state: 'error', detail }], failures: 1 }
  }
}

export async function collectSections(): Promise<Section[]> {
  return (
    [
      await section('personalisation sources', personalisationSourceRows),
      await section('skill sources', skillSourceRows),
      await section('renders (dist vs fresh render)', renderRows),
      await section('personalisation links', personalisationLinkRows),
      await section('skill links', skillLinkRows),
      await section('mcp pins', mcpPinRows),
      await section('hindsight banks', bankRows),
      nativeSection(nativeSkillHarnesses(await loadAdaptersConfig())),
    ]
      // drop sections with nothing to say
      .filter(s => s.informational || s.rows.length > 0)
  )
}
