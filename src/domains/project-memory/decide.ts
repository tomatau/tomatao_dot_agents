import type { JsonRpc } from '../../clients/mcp-http'
import type { Action, Event, Session } from './protocol'
import { idle } from './protocol'

/** Fix the bank, then release everything that arrived while it was unsettled. */
function settle(session: Session, rooted?: string): [Session, Action[]] {
  const bank = rooted ?? session.bank
  const settled = { ...session, bank, awaitingRoots: false, queued: [] }
  if (!bank) return [settled, session.queued.flatMap(idle)]

  const actions: Action[] = []
  if (!session.bank) {
    // The client already has our own initialize reply, so it must not get Hindsight's too.
    if (session.init) {
      actions.push({ do: 'connect', bank, init: session.init, relay: false })
    }
  } else if (rooted && rooted !== session.bank) {
    actions.push({
      do: 'log',
      line: `roots says ${rooted}, cwd said ${session.bank}`,
    })
    if (session.init) {
      actions.push({ do: 'connect', bank, init: session.init, relay: true })
    }
  }
  actions.push({ do: 'ensure-bank', bank })
  for (const message of session.queued) actions.push({ do: 'forward', message })
  return [settled, actions]
}

function onMessage(session: Session, message: JsonRpc): [Session, Action[]] {
  if (message.method === 'initialize') {
    const caps = (message.params as { capabilities?: { roots?: unknown } })
      ?.capabilities
    const next = {
      ...session,
      init: message,
      wantsRoots: caps?.roots !== undefined,
    }
    if (!session.bank) return [next, idle(message)]
    // Forwarded, never synthesised, so the client sees the real capabilities and
    // they cannot drift as Hindsight is upgraded.
    return [
      next,
      [{ do: 'connect', bank: session.bank, init: message, relay: true }],
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
  if (!session.bank) return [session, idle(message)]
  return [session, [{ do: 'forward', message }]]
}

/** The whole decision surface: a session and an event become the next of each. */
export function step(session: Session, event: Event): [Session, Action[]] {
  if (event.on === 'roots') return settle(session, event.bank)
  return onMessage(session, event.message)
}
