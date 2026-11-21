// A stdio MCP server that searches the fidx indexes it was pinned with. It runs
// in other repos under whatever toolchain they provide, so it reads no config of
// its own: `just mcp` resolves config/search.local.yml into `--indexes`. Each
// call starts fidx afresh, so nothing stays loaded between calls.
import type { JsonRpc } from '../clients/mcp-http'
import { readDocument, search } from '../clients/fidx'
import { respond } from '../domains/search/server'
import { parseSearchIndexes } from '../settings/search'

const at = process.argv.indexOf('--indexes')
const indexes = parseSearchIndexes({
  indexes: JSON.parse(at === -1 ? '{}' : (process.argv[at + 1] ?? '{}')),
})
const fidx = { search, readDocument }
const send = (message: JsonRpc) =>
  void process.stdout.write(`${JSON.stringify(message)}\n`)

for await (const line of console) {
  let message: JsonRpc
  try {
    message = JSON.parse(line)
  } catch {
    continue
  }
  // Calls answer in any order, so a slow search holds up nothing else.
  void respond(message, indexes, fidx).then(answer => answer && send(answer))
}
