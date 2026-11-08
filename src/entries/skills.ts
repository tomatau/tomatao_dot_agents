import { linkSkills } from '../domains/skills'

try {
  await linkSkills()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
