import {
  linkPersonalisation,
  renderPersonalisation,
} from '../domains/personalisation'

try {
  const command = process.argv[2] ?? 'sync'
  if (!['render', 'link', 'sync'].includes(command)) {
    throw new Error(`unknown command "${command}" (expected render|link|sync)`)
  }
  if (command === 'render' || command === 'sync') await renderPersonalisation()
  if (command === 'link' || command === 'sync') await linkPersonalisation()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
