import { existsSync } from 'node:fs'
import { copyFile } from 'node:fs/promises'
import type { Mode } from '../../lib/mode'
import { readSettingsFile } from '../../settings/local'
import {
  HINDSIGHT_ENV_EXAMPLE,
  HINDSIGHT_ENV_LOCAL,
  displayPath,
} from '../../settings/paths'

const PROVIDER_COMMANDS: Record<string, string> = {
  'claude-code': 'claude',
  'openai-codex': 'codex',
}

export async function requireMemorySettings(mode: Mode): Promise<void> {
  if (!existsSync(HINDSIGHT_ENV_LOCAL)) {
    if (!mode.dryRun) await copyFile(HINDSIGHT_ENV_EXAMPLE, HINDSIGHT_ENV_LOCAL)
    throw new Error(
      `set up ${displayPath(HINDSIGHT_ENV_LOCAL)} from hindsight/env.example before installing memory`,
    )
  }
  const settings = readSettingsFile(HINDSIGHT_ENV_LOCAL)
  const template = readSettingsFile(HINDSIGHT_ENV_EXAMPLE)
  const problems: string[] = []
  const vault = settings.VAULT_DIR?.trim()
  if (!vault || vault === template.VAULT_DIR)
    problems.push('set VAULT_DIR to your vault')
  const provider = settings.HINDSIGHT_API_LLM_PROVIDER?.trim()
  if (!provider) problems.push('set HINDSIGHT_API_LLM_PROVIDER')
  else {
    const command = PROVIDER_COMMANDS[provider] ?? provider.split('-')[0]
    if (!Bun.which(command, { PATH: settings.PATH }))
      problems.push(`provider ${provider} needs ${command} on PATH`)
  }
  if (problems.length)
    throw new Error(
      `${displayPath(HINDSIGHT_ENV_LOCAL)}: ${problems.join('; ')}`,
    )
}
