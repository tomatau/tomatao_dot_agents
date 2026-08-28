import { loadMcpAdapters } from '../adapters/index'
import { bankServers } from '../domains/hindsight/mcp'
import { loadHindsightConfig } from '../settings/config'

const dryRun = process.argv.includes('--dry-run')

const servers = bankServers(await loadHindsightConfig())
const adapters = await loadMcpAdapters()

if (adapters.length === 0) {
  console.log(
    'mcp — no harnesses opted in (set `hindsight_mcp:` in config/adapters.yml)',
  )
  process.exit(0)
}

console.log(
  `${dryRun ? 'verifying' : 'applying'} ${servers.length} server(s)\n`,
)
let failures = 0
for (const adapter of adapters) {
  const rows = dryRun
    ? await adapter.verify(servers)
    : await adapter.apply(servers)
  for (const r of rows) {
    if (r.state === 'missing' || r.state === 'wrong-url') failures++
    console.log(
      `${r.name.padEnd(9)}${r.state.padEnd(10)}${r.server.padEnd(20)}${r.detail}`,
    )
  }
}

if (dryRun && failures > 0) process.exit(1)
