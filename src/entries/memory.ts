import { setupMemory } from '../domains/hindsight/setup'
import { modeFrom } from '../lib/mode'

const args = process.argv.slice(2)
const command = args.find(arg => !arg.startsWith('-'))
try {
  if (command !== 'install' && command !== 'banks') {
    throw new Error('usage: memory <install|banks> [--dry-run]')
  }
  await setupMemory(command, modeFrom(args.includes('--dry-run')))
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
