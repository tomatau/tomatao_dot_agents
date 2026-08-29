import type { JsonRpc, McpUpstream } from '../../clients/mcp-http'
import type { Action } from './protocol'
import { ensureBank } from '../../clients/hindsight'

/** Everything the bridge needs from the outside world, named rather than reached for. */
export interface Effects {
  send: (message: JsonRpc) => void
  log: (line: string) => Promise<void>
  upstream: McpUpstream
  bankUrl: (bank: string) => string
  rootsRequest: JsonRpc
}

/** Carry out one decision. The choosing happens in `bridge.ts`; this only acts. */
export async function perform(action: Action, fx: Effects): Promise<void> {
  switch (action.do) {
    case 'reply':
      return fx.send(action.message)
    case 'connect': {
      const replies = await fx.upstream.connect(
        fx.bankUrl(action.bank),
        action.init,
      )
      for (const out of replies) fx.send(out)
      return
    }
    case 'forward': {
      for (const out of await fx.upstream.post(action.message)) fx.send(out)
      return
    }
    case 'ask-roots':
      return fx.send(fx.rootsRequest)
    case 'ensure-bank': {
      if (await ensureBank(action.bank))
        await fx.log(`created bank ${action.bank}`)
      return
    }
    case 'log':
      return fx.log(action.line)
  }
}
