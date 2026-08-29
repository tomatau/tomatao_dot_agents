import type { JsonRpc } from '../../clients/mcp-http'
import type { Action, Event, Session } from './protocol'
import { idle } from './protocol'

/** Fix the bank, then release everything that arrived while it was unsettled. */
function settle(session: Session, rooted?: string): [Session, Action[]] {
  const bank = rooted ?? (session.bank as string)
  const actions: Action[] = []
  if (rooted && rooted !== session.bank) {
    actions.push({
      do: 'log',
      line: `roots says ${rooted}, cwd said ${session.bank}`,
    })
    if (session.init) {
      actions.push({ do: 'connect', bank, init: session.init })
    }
  }
  actions.push({ do: 'ensure-bank', bank })
  for (const message of session.queued) actions.push({ do: 'forward', message })
  return [{ ...session, bank, awaitingRoots: false, queued: [] }, actions]
}

function onMessage(session: Session, message: JsonRpc): [Session, Action[]] {
  if (message.method === 'initialize') {
    const caps = (message.params as { capabilities?: { roots?: unknown } })
      ?.capabilities
    // Forwarded, never synthesised, so the client sees the real capabilities and
    // they cannot drift as Hindsight is upgraded.
    return [
      { ...session, init: message, wantsRoots: caps?.roots !== undefined },
      [{ do: 'connect', bank: session.bank as string, init: message }],
    ]
  }

  // Only once the client is initialised may a server make requests of it.
  if (message.method === 'notifications/initialized') {
    if (!session.wantsRoots) return settle(session)
    return [{ ...session, awaitingRoots: true }, [{ do: 'ask-roots' }]]
  }

  if (session.awaitingRoots) {
    return [{ ...session, queued: [...session.queued, message] }, []]
  }
  return [session, [{ do: 'forward', message }]]
}

/** The whole decision surface: a session and an event become the next of each. */
export function step(session: Session, event: Event): [Session, Action[]] {
  if (event.on === 'roots') return settle(session, event.bank)
  if (!session.bank) return [session, idle(event.message)]
  return onMessage(session, event.message)
}
