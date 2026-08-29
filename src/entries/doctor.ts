import { collectSections } from '../domains/health/report'
import { loadSources } from '../domains/mcp/sources'
import { bold, dim } from '../lib/colour'
import { printSection, printSummary, tally } from '../lib/report'
import { REPO, displayPath } from '../settings/paths'
import { kinds } from './kinds'

console.log(`\n${bold('agents doctor')} ${dim(displayPath(REPO))}`)

const sections = await collectSections(await loadSources(kinds))
for (const section of sections) printSection(section)

const counts = tally(sections)
printSummary(counts)
if (counts.warnings > 0) console.log(dim('  run `just sync` to put those right'))
console.log()

process.exit(counts.warnings + counts.failures > 0 ? 1 : 0)
