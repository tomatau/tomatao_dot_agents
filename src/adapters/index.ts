import type { HarnessConfig } from '../settings/config'
import { loadAdaptersConfig } from '../settings/config'
import { mcp as claudeMcp } from './claude/mcp'
import { personalisation as claude } from './claude/personalisation'
import { mcp as codexMcp } from './codex/mcp'
import { personalisation as codex } from './codex/personalisation'
import { personalisation as cursor } from './cursor/personalisation'
import { personalisation as opencode } from './opencode/personalisation'
import type { McpAdapter, PersonalisationAdapter } from './types'
import { personalisation as zed } from './zed/personalisation'

export async function loadPersonalisationAdapters(): Promise<
  PersonalisationAdapter[]
> {
  const config = await loadAdaptersConfig()
  return [
    claude(config.claude?.personalisation ?? []),
    codex(config.codex?.personalisation ?? []),
    opencode(config.opencode?.personalisation ?? []),
    zed(config.zed?.personalisation ?? []),
    cursor(config.cursor?.personalisation ?? []),
  ]
}

const MCP: Record<
  string,
  (cfg: NonNullable<HarnessConfig['hindsight_mcp']>) => McpAdapter
> = {
  claude: claudeMcp,
  codex: codexMcp,
}

/** MCP adapters for the harnesses whose `adapters.yml` opts in to the bank pins. */
export async function loadMcpAdapters(): Promise<McpAdapter[]> {
  const config = await loadAdaptersConfig()
  return Object.entries(config)
    .filter(([name, cfg]) => cfg.hindsight_mcp != null && MCP[name])
    .map(([name, cfg]) => MCP[name](cfg.hindsight_mcp!))
}
