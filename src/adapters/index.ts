import type { HarnessConfig } from '../settings/adapters'
import type { McpAdapter, PersonalisationAdapter } from './types'
import { loadAdaptersConfig } from '../settings/adapters'
import { mcp as claudeMcp } from './claude/mcp'
import { personalisation as claude } from './claude/personalisation'
import { mcp as codexMcp } from './codex/mcp'
import { personalisation as codex } from './codex/personalisation'
import { mcp as cursorMcp } from './cursor/mcp'
import { personalisation as cursor } from './cursor/personalisation'
import { mcp as opencodeMcp } from './opencode/mcp'
import { personalisation as opencode } from './opencode/personalisation'
import { mcp as warpMcp } from './warp/mcp'
import { personalisation as warp } from './warp/personalisation'
import { mcp as zedMcp } from './zed/mcp'
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
    warp(config.warp?.personalisation ?? []),
  ]
}

const MCP: Record<
  string,
  (cfg: NonNullable<HarnessConfig['mcp']>) => McpAdapter
> = {
  claude: claudeMcp,
  codex: codexMcp,
  opencode: opencodeMcp,
  zed: zedMcp,
  cursor: cursorMcp,
  warp: warpMcp,
}

/** A harness's MCP adapter, with the source ids it opted in to. */
export interface HarnessMcp {
  adapter: McpAdapter
  enable: string[]
}

/** MCP adapters for the harnesses whose `adapters.yml` carries an `mcp:` block. */
export async function loadMcpAdapters(): Promise<HarnessMcp[]> {
  const config = await loadAdaptersConfig()
  return Object.entries(config)
    .filter(([name, cfg]) => cfg.mcp != null && MCP[name])
    .map(([name, cfg]) => ({
      adapter: MCP[name](cfg.mcp!),
      enable: cfg.mcp!.enable ?? [],
    }))
}
