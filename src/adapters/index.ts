import { loadAdaptersConfig } from '../settings/config'
import { personalisation as claude } from './claude/personalisation'
import { personalisation as codex } from './codex/personalisation'
import { personalisation as cursor } from './cursor/personalisation'
import { personalisation as opencode } from './opencode/personalisation'
import { personalisation as zed } from './zed/personalisation'
import type { PersonalisationAdapter } from './types'

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
