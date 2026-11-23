import { isAbsolute } from 'node:path'
import type { JsonRpc, McpUpstream } from '../../clients/mcp-http'
import type { Action, Event } from './protocol'
import { ensureBank } from '../../clients/hindsight/banks'
import { projectPath, withProjectPath } from './protocol'

/** Everything the bridge needs from the outside world, named rather than reached for. */
export interface Effects {
  send: (message: JsonRpc) => void
  log: (line: string) => Promise<void>
  upstream: McpUpstream
  bankUrl: (bank: string) => string
  rootsRequest: JsonRpc
  bankFor: (path: string) => Promise<string | undefined>
}

/**
 * Carry out one decision. The choosing happens in `decide.ts`; this only acts,
 * returning an event when what it found must go back there to be decided on.
 */
export async function perform(
  action: Action,
  fx: Effects,
): Promise<Event | undefined> {
  switch (action.do) {
    case 'reply':
      fx.send(action.message)
      return
    case 'connect': {
      const replies = await fx.upstream.connect(
        fx.bankUrl(action.bank),
        action.init,
      )
      for (const out of replies) fx.send(out)
      return
    }
    case 'forward':
    case 'list-tools': {
      const replies = await fx.upstream.postTo(
        fx.bankUrl(action.bank),
        action.init,
        action.message,
      )
      for (const reply of replies) {
        fx.send(action.do === 'list-tools' ? withProjectPath(reply) : reply)
      }
      return
    }
    case 'resolve-project': {
      const path = projectPath(action.message)
      // Relative paths would resolve against wherever the harness spawned us.
      const bank = path && isAbsolute(path) ? await fx.bankFor(path) : undefined
      return { on: 'project', message: action.message, path, bank }
    }
    case 'ask-roots':
      fx.send(fx.rootsRequest)
      return
    case 'ensure-bank': {
      if (await ensureBank(action.bank))
        await fx.log(`created bank ${action.bank}`)
      return
    }
    case 'log':
      await fx.log(action.line)
      return
  }
}
