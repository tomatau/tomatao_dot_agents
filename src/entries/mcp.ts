import { loadMcpAdapters } from '../adapters/index'
import { kinds } from '../domains/mcp/kinds'
import { loadSources, serversFor } from '../domains/mcp/sources'
import { managedNames, recordPinned } from '../domains/mcp/state'

const dryRun = process.argv.includes('--dry-run')

const sources = await loadSources(kinds)
const managed = await managedNames(sources)
const harnesses = await loadMcpAdapters()

if (harnesses.length === 0) {
  console.log('mcp — no harnesses opted in (set `mcp:` in config/adapters.yml)')
  process.exit(0)
}

console.log(
  `${dryRun ? 'verifying' : 'applying'} ${managed.size} managed server(s)\n`,
)
let failures = 0
for (const { adapter, enable } of harnesses) {
  const desired = serversFor(sources, enable)
  const rows = dryRun
    ? await adapter.verify(desired, managed)
    : await adapter.apply(desired, managed)
  for (const r of rows) {
    if (r.state === 'missing' || r.state === 'wrong-url') failures++
    console.log(
      `${r.name.padEnd(9)}${r.state.padEnd(10)}${r.server.padEnd(24)}${r.detail}`,
    )
  }
}

// Only after every harness converged, so a failure leaves the old set tracked.
if (!dryRun) await recordPinned(sources)

if (dryRun && failures > 0) process.exit(1)
