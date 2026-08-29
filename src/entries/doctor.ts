import { collectSections } from '../domains/health/report'
import { loadSources } from '../domains/mcp/sources'
import { printSection, tally } from '../lib/report'
import { kinds } from './kinds'

const sections = await collectSections(await loadSources(kinds))
for (const s of sections) printSection(s)

const { ok, failures } = tally(sections)
console.log(
  `\n${ok} ok, ${failures} problem${failures === 1 ? '' : 's'} — ${failures > 0 ? 'FAIL' : 'OK'}`,
)
process.exit(failures > 0 ? 1 : 0)
