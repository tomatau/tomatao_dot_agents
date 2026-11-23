import type { JsonRpc } from '../../clients/mcp-http'
import type { Action, Event, Session } from './protocol'
import { CATALOGUE_BANK, idle, noProject, withoutProjectPath } from './protocol'

function forward(session: Session, message: JsonRpc): Action[] {
  const { init, route } = session
  if (!init) return idle(message)

  if (route.kind === 'per-call') {
    if (message.method === 'tools/call') {
      return [{ do: 'resolve-project', message }]
    }
    return [
      {
        do: message.method === 'tools/list' ? 'list-tools' : 'forward',
        bank: CATALOGUE_BANK,
        init,
        message,
      },
    ]
  }

  const bank = route.kind === 'fixed' ? route.bank : route.cwdBank
  return bank ? [{ do: 'forward', bank, init, message }] : idle(message)
}

function settle(
  session: Session,
  bank: string | undefined,
  queued: JsonRpc[],
): [Session, Action[]] {
  const next: Session = {
    ...session,
    route: bank ? { kind: 'fixed', bank } : { kind: 'per-call' },
  }
  const announce: Action = bank
    ? { do: 'ensure-bank', bank }
    : { do: 'log', line: 'no repo settled; each call names its own' }
  return [
    next,
    [announce, ...queued.flatMap(message => forward(next, message))],
  ]
}

function onProject(
  session: Session,
  event: Extract<Event, { on: 'project' }>,
): [Session, Action[]] {
  const { bank, message, path } = event
  const { init, route } = session
  if (route.kind !== 'per-call' || !init || !bank) {
    return [session, [noProject(message.id, path)]]
  }
  return [
    session,
    [
      { do: 'ensure-bank', bank },
      { do: 'forward', bank, init, message: withoutProjectPath(message) },
    ],
  ]
}

function onMessage(session: Session, message: JsonRpc): [Session, Action[]] {
  const { route } = session
  if (route.kind === 'starting' && message.method === 'initialize') {
    const { cwdBank } = route
    const actions: Action[] = cwdBank
      ? [{ do: 'connect', bank: cwdBank, init: message }]
      : idle(message)
    return [{ ...session, init: message }, actions]
  }

  if (
    route.kind === 'starting' &&
    message.method === 'notifications/initialized'
  ) {
    const caps = (
      session.init?.params as { capabilities?: { roots?: unknown } }
    )?.capabilities
    if (caps?.roots === undefined) return settle(session, route.cwdBank, [])
    return [
      { ...session, route: { ...route, kind: 'waiting', queued: [] } },
      [{ do: 'ask-roots' }],
    ]
  }

  if (route.kind === 'waiting') {
    return [
      { ...session, route: { ...route, queued: [...route.queued, message] } },
      [],
    ]
  }
  return [session, forward(session, message)]
}

/** The whole decision surface: a session and an event become the next of each. */
export function step(session: Session, event: Event): [Session, Action[]] {
  if (event.on === 'roots') {
    const { route } = session
    if (route.kind !== 'waiting') return [session, []]
    const [next, actions] = settle(
      session,
      event.bank ?? route.cwdBank,
      route.queued,
    )
    if (event.bank && route.cwdBank && event.bank !== route.cwdBank) {
      actions.unshift({
        do: 'log',
        line: `roots says ${event.bank}, cwd said ${route.cwdBank}`,
      })
    }
    return [next, actions]
  }
  if (event.on === 'project') return onProject(session, event)
  return onMessage(session, event.message)
}
