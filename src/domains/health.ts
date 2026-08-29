import { loadMcpAdapters, loadPersonalisationAdapters } from '../adapters/index'
import { checkFreshness } from '../adapters/freshness'
import { loadAdaptersConfig } from '../settings/config'
import { SKILLS_DIR, displayPath } from '../settings/paths'
import { checkLinks } from '../lib/links'
import type { Row, Section } from '../lib/report'
import { inspectBanks } from './hindsight/banks'
import { loadSources, managedNames, serversFor } from './mcp'
import { inspectSources, listSources } from './personalisation'
import {
  inspectSkills,
  listSkills,
  nativeSkillHarnesses,
  planSkillLinks,
  skillLinks,
} from './skills'

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

async function personalisationSourceRows(): Promise<Row[]> {
  return (await inspectSources()).map(c => ({ state: c.state, detail: c.path }))
}

async function skillSourceRows(): Promise<Row[]> {
  return (await inspectSkills()).map(c => ({ state: c.state, detail: c.path }))
}

async function renderRows(): Promise<Row[]> {
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

async function personalisationLinkRows(): Promise<Row[]> {
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

async function skillLinkRows(): Promise<Row[]> {
  const plan = planSkillLinks({
    config: skillLinks(await loadAdaptersConfig()),
    skills: await listSkills(),
  })
  const rows: Row[] = []
  for (const [name, links] of Object.entries(plan)) {
    for (const check of await checkLinks({ links })) {
      rows.push({ name, state: check.state, detail: check.link.dest })
    }
  }
  return rows
}

// Read-only equivalent of `just mcp` — reports whether each opted-in harness has
// the servers it enables pinned, and flags managed pins it no longer wants.
async function mcpPinRows(): Promise<Row[]> {
  const harnesses = await loadMcpAdapters()
  if (harnesses.length === 0) return []
  const sources = await loadSources()
  const managed = managedNames(sources)
  const rows: Row[] = []
  for (const { adapter, enable } of harnesses) {
    const desired = serversFor(sources, enable)
    for (const r of await adapter.verify(desired, managed)) {
      rows.push({ name: adapter.name, state: r.state, detail: r.server })
    }
  }
  return rows
}

// A pin only works if the bank behind it exists, which config alone cannot show.
async function bankRows(): Promise<Row[]> {
  return (await inspectBanks()).map(b => ({ state: b.state, detail: b.id }))
}

function nativeSection(harnesses: string[]): Section {
  return {
    title: 'native skills',
    rows: harnesses.map(name => ({
      name,
      state: 'native',
      detail: `${displayPath(SKILLS_DIR)} (discovered directly)`,
    })),
    failures: 0,
    informational: true,
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
