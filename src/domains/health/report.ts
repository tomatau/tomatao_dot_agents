import type { Row, Section } from '../../lib/report'
import type { McpSources } from '../mcp/sources'
import { loadPersonalisationAdapters } from '../../adapters/index'
import {
  loadAdaptersConfig,
  loadDeclaredHarnesses,
} from '../../settings/adapters'
import { listSources } from '../personalisation'
import { personalisationDestinations, skillDestinations } from '../reconcile'
import {
  nativeSkillHarnesses,
  skillLinks,
  planSkillLinks,
  listSkills,
} from '../skills'
import { bankRows, mcpPinRows } from './mcp'
import {
  personalisationLinkRows,
  personalisationSourceRows,
  renderRows,
} from './personalisation'
import { retiredLinkRows } from './retired'
import { searchIndexRows } from './search'
import { nativeSection, skillLinkRows, skillSourceRows } from './skills'
import { vaultRows } from './vault'

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
/**
 * Links the file still declares but this machine no longer wants. Composing
 * them needs the adapters, which is why it happens here rather than in the
 * report — every other section resolves its own sources.
 */
async function retiredRows(): Promise<Row[]> {
  const declared = await loadDeclaredHarnesses()
  const notes = await listSources()
  const wantedNotes = (await loadPersonalisationAdapters()).flatMap(adapter =>
    adapter.links(notes),
  )
  const wantedSkills = Object.values(
    planSkillLinks({
      config: skillLinks(await loadAdaptersConfig()),
      skills: await listSkills(),
    }),
  ).flat()
  return [
    ...(await retiredLinkRows({
      destinations: personalisationDestinations(declared),
      wanted: wantedNotes,
    })),
    ...(await retiredLinkRows({
      destinations: skillDestinations(declared),
      wanted: wantedSkills,
    })),
  ]
}

export async function collectSections(sources: McpSources): Promise<Section[]> {
  return (
    [
      // what a pin reaches for, before the pins themselves: a bank that does
      // not exist and an index that cannot be proven fresh both make one moot
      await section('vault paths', vaultRows),
      await section('hindsight banks', bankRows),
      await section('search indexes', searchIndexRows),
      await section('mcp pins', () => mcpPinRows(sources)),

      // personalisation: source note → rendered file → link into the harness
      await section('personalisation sources', personalisationSourceRows),
      await section('personalisation renders (dist vs fresh)', renderRows),
      await section('personalisation links', personalisationLinkRows),

      // skills: source dir → link into the harness, or read where it lies
      await section('skill sources', skillSourceRows),
      await section('skill links', skillLinkRows),
      nativeSection(nativeSkillHarnesses(await loadAdaptersConfig())),

      // links the repo used to own: `just sync` retires these
      await section('retired links', retiredRows),
    ]
      // drop sections with nothing to say
      .filter(s => s.rows.length > 0)
  )
}
