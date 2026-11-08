import { parseArgs } from 'node:util'
import { bootstrap } from '../domains/bootstrap/setup'
import { modeFrom } from '../lib/mode'
import { ScriptedAsker, TerminalAsker } from '../lib/prompt'

try {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      yes: { type: 'boolean' },
      'dry-run': { type: 'boolean' },
      harnesses: { type: 'string' },
    },
  })
  await bootstrap({
    mode: modeFrom(values['dry-run'] ?? false),
    ask:
      values.yes || values.harnesses !== undefined || !process.stdin.isTTY
        ? new ScriptedAsker()
        : new TerminalAsker(),
    harnesses: values.harnesses
      ?.split(',')
      .map(name => name.trim())
      .filter(Boolean),
  })
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
