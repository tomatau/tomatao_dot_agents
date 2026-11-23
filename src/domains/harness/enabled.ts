import type { Mode } from '../../lib/mode'
import type { AdaptersConfig } from '../../settings/adapters'
import { APPLY } from '../../lib/mode'
import { asRecord } from '../../lib/parse'
import {
  loadDeclaredHarnesses,
  parseAdaptersConfig,
} from '../../settings/adapters'
import { displayPath } from '../../settings/paths'
import {
  ADAPTERS_YML,
  configWhere,
  localConfigName,
  readConfigFile,
  writeConfigFile,
} from '../../settings/yaml'

const LOCAL_YML = localConfigName(ADAPTERS_YML)
const WHERE = configWhere(ADAPTERS_YML)

type Raw = Record<string, unknown>

/**
 * A machine's local file with each choice recorded only where it departs from
 * the shared file, so the file holds this machine's decisions and nothing
 * else. Whatever else the machine wrote there is kept.
 */
export function recordChoices({
  shared,
  local,
  chosen,
}: {
  /** Whether the shared file alone switches each harness on. */
  shared: Record<string, boolean>
  local: Raw
  chosen: Record<string, boolean>
}): Raw {
  const next = { ...local }
  for (const [harness, enabled] of Object.entries(chosen)) {
    const { enabled: _recorded, ...rest } = asRecord(
      WHERE,
      local[harness] ?? {},
    )
    const entry = enabled === shared[harness] ? rest : { ...rest, enabled }
    if (Object.keys(entry).length > 0) next[harness] = entry
    else delete next[harness]
  }
  return next
}

const isEnabled = (cfg?: AdaptersConfig[string]): boolean =>
  cfg?.enabled !== false

/** What bootstrap offers: the harnesses the file declares, in its order. */
export async function harnessChoices(): Promise<
  { name: string; enabled: boolean; detail: string }[]
> {
  const declared: AdaptersConfig = await loadDeclaredHarnesses()
  return Promise.all(
    Object.entries(declared).map(async ([name, cfg]) => ({
      name,
      enabled: isEnabled(cfg),
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
 * Record the choice in this machine's local file, leaving the shared file as
 * every machine has it. A dry run stops before writing.
 */
export async function writeEnabled(
  chosen: Record<string, boolean>,
  mode: Mode = APPLY,
): Promise<string[]> {
  const current = await loadDeclaredHarnesses()
  const changed = Object.entries(chosen)
    .filter(([harness, enabled]) => enabled !== isEnabled(current[harness]))
    .map(([harness, enabled]) => `${enabled ? 'on ' : 'off'}  ${harness}`)
  if (changed.length === 0 || mode.dryRun) return changed

  const shared = parseAdaptersConfig(readConfigFile(ADAPTERS_YML))
  const local = asRecord(WHERE, readConfigFile(LOCAL_YML) ?? {})
  writeConfigFile(
    LOCAL_YML,
    recordChoices({
      shared: Object.fromEntries(
        Object.entries(shared).map(([name, cfg]) => [name, isEnabled(cfg)]),
      ),
      local,
      chosen,
    }),
  )
  return changed
}
