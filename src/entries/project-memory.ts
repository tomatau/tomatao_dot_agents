// A stdio MCP server routing to the memory bank of whichever repo the harness is
// working in. It must be stdio: an HTTP pin is one shared process with no
// per-caller context, so it cannot tell projects apart. Messages are forwarded
// verbatim, keeping this a transport rather than a second API. The decisions live
// in domains/hindsight/bridge.ts; see docs/project-memory.md.
import { McpUpstream, type JsonRpc } from '../clients/mcp-http'
import { step } from '../domains/project-memory/decide'
import { perform } from '../domains/project-memory/effects'
import { projectBankId, rootBankId } from '../domains/project-memory/identity'
import {
  type Event,
  type Session,
  internalError,
  newSession,
} from '../domains/project-memory/protocol'
import { fileLogger } from '../lib/log'
import { BRIDGE_LOG_FILE } from '../settings/paths'

const SOURCE_FILE = 'mcp/project-memory.yml'
const ROOTS_ID = 'bridge/roots'
const ROOTS_TIMEOUT_MS = 5_000

const flag = (name: string): string | undefined => {
  const at = process.argv.indexOf(name)
  return at === -1 ? undefined : process.argv[at + 1]
}

const log = fileLogger(BRIDGE_LOG_FILE)
const base = flag('--url')
const bankPath = flag('--path')

// Arguments come from mcp/project-memory.yml; nothing here reads config, so the
// bridge runs under whatever toolchain the repo it is spawned in provides.
if (!base || !bankPath?.includes('{bank}')) {
  await log(
    `need \`--url <base>\` and \`--path <path with {bank}>\` — see ${SOURCE_FILE}`,
  )
  process.exit(1)
}
const fx = {
  send: (message: JsonRpc) =>
    void process.stdout.write(`${JSON.stringify(message)}\n`),
  log,
  upstream: new McpUpstream(),
  bankUrl: (bank: string) => `${base}${bankPath.replaceAll('{bank}', bank)}`,
  rootsRequest: { jsonrpc: '2.0', id: ROOTS_ID, method: 'roots/list' },
}

let session: Session = newSession(await projectBankId(process.cwd()))
await log(`start cwd=${process.cwd()} bank=${session.bank ?? '(not a repo)'}`)

async function advance(event: Event): Promise<void> {
  const [next, actions] = step(session, event)
  session = next
  for (const action of actions) await perform(action, fx)
}

// A client that never answers roots/list must not wedge the session.
let rootsTimer: ReturnType<typeof setTimeout> | undefined
function armRootsTimeout(): void {
  rootsTimer = setTimeout(() => {
    void log('roots/list unanswered — keeping the cwd bank')
    void advance({ on: 'roots', bank: undefined })
  }, ROOTS_TIMEOUT_MS)
}

for await (const line of console) {
  let message: JsonRpc
  try {
    message = JSON.parse(line)
  } catch {
    continue
  }
  try {
    if (message.id === ROOTS_ID) {
      clearTimeout(rootsTimer)
      await advance({ on: 'roots', bank: await rootBankId(message) })
      continue
    }
    await advance({ on: 'message', message })
    if (session.awaitingRoots && !rootsTimer) armRootsTimeout()
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    await log(`error on ${String(message.method ?? message.id)}: ${detail}`)
    if (message.id !== undefined) fx.send(internalError(message.id, detail))
  }
}
