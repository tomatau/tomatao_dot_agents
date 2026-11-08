import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Mode } from '../../lib/mode'
import type { AdaptersConfig } from '../../settings/adapters'
import { APPLY } from '../../lib/mode'
import {
  loadDeclaredHarnesses,
  parseAdaptersConfig,
} from '../../settings/adapters'
import { REPO, displayPath } from '../../settings/paths'
import { ADAPTERS_YML } from '../../settings/yaml'

/**
 * `enabled:` sits at the top of each harness's block, so a harness is one
 * line-keyed block and switching it on or off is one line edited in place.
 *
 * Nothing else in the file moves: the declarations a switched-off harness keeps
 * are what let a sync find its old links and retire them.
 */

const TOP_LEVEL = /^([A-Za-z0-9_-]+):\s*(#.*)?$/

/** Where each harness block starts, and where the next one begins. */
function blocks(lines: string[]): Map<string, { start: number; end: number }> {
  const found = new Map<string, { start: number; end: number }>()
  let current: { name: string; start: number } | undefined
  for (const [i, line] of lines.entries()) {
    const match = line.match(TOP_LEVEL)
    if (match) {
      if (current) found.set(current.name, { start: current.start, end: i })
      current = { name: match[1], start: i }
    }
  }
  if (current)
    found.set(current.name, { start: current.start, end: lines.length })
  return found
}

export function setEnabled({
  text,
  harness,
  enabled,
}: {
  text: string
  harness: string
  enabled: boolean
}): string {
  const lines = text.split('\n')
  const block = blocks(lines).get(harness)
  if (!block)
    throw new Error(`config/${ADAPTERS_YML} has no \`${harness}\` block`)

  const content = lines.slice(block.start + 1, block.end)
  const firstField = content.find(
    line => /^\s+\S/.test(line) && !/^\s*#/.test(line),
  )
  const indent = firstField?.match(/^\s+/)?.[0] ?? '  '
  const flag = `${indent}enabled: ${enabled}`
  const existing = content.findIndex(line =>
    line.startsWith(`${indent}enabled:`),
  )

  if (!enabled) {
    if (existing === -1) lines.splice(block.start + 1, 0, flag)
    else lines[block.start + 1 + existing] = flag
  } else if (existing !== -1) {
    // Drop the default unless it is the mapping's only field: an empty YAML
    // block is null, which is not a harness configuration.
    const hasOtherFields = content.some(
      (line, i) => i !== existing && /^\s+[^\s#]/.test(line),
    )
    if (hasOtherFields) lines.splice(block.start + 1 + existing, 1)
    else lines[block.start + 1 + existing] = flag
  }
  return lines.join('\n')
}

/** The harnesses the file currently switches off. */
export function disabledHarnesses(text: string): string[] {
  return Object.entries(parseAdaptersConfig(Bun.YAML.parse(text)))
    .filter(([, cfg]) => cfg.enabled === false)
    .map(([name]) => name)
}

/** What bootstrap offers: the harnesses the file declares, in its order. */
export async function harnessChoices(): Promise<
  { name: string; enabled: boolean; detail: string }[]
> {
  const declared: AdaptersConfig = await loadDeclaredHarnesses()
  return Promise.all(
    Object.entries(declared).map(async ([name, cfg]) => ({
      name,
      enabled: cfg.enabled !== false,
      detail: await describe(name, cfg),
    })),
  )
}

async function describe(
  name: string,
  cfg: AdaptersConfig[string],
): Promise<string> {
  const parts: string[] = []
  const notes = (cfg.personalisation ?? []).map(link => link.dest)
  if (notes.length > 0) parts.push(notes.map(displayPath).join(', '))
  if (cfg.skills === 'native') parts.push('skills read in place')
  else if (cfg.skills)
    parts.push(
      `skills → ${cfg.skills.map(s => displayPath(s.dest)).join(', ')}`,
    )
  if (cfg.mcp) parts.push('mcp')
  void name
  return parts.join(' · ')
}

/**
 * Write the choice back, touching only the harnesses whose answer changed, so
 * the diff is the decision and nothing else. A dry run stops before writing.
 */
export async function writeEnabled(
  chosen: Record<string, boolean>,
  mode: Mode = APPLY,
): Promise<string[]> {
  const path = join(REPO, 'config', ADAPTERS_YML)
  const before = await readFile(path, 'utf8')
  const current = new Set(disabledHarnesses(before))
  let after = before
  const changed: string[] = []
  for (const [harness, enabled] of Object.entries(chosen)) {
    if (current.has(harness) === !enabled) continue
    after = setEnabled({ text: after, harness, enabled })
    changed.push(`${enabled ? 'on ' : 'off'}  ${harness}`)
  }
  if (after !== before && !mode.dryRun) await writeFile(path, after)
  return changed
}
