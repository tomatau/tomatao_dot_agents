import { describe, expect, test } from 'bun:test'
import { step } from './decide'
import { type Action, type Event, type Session, newSession } from './protocol'

const THIS_REPO = 'project-here'
const OTHER_REPO = 'project-there'

const initialize = (capabilities: object): Event => ({
  on: 'message',
  message: { jsonrpc: '2.0', id: 1, method: 'initialize', params: { capabilities } },
})
const initialized: Event = {
  on: 'message',
  message: { jsonrpc: '2.0', method: 'notifications/initialized' },
}
const toolCall: Event = {
  on: 'message',
  message: { jsonrpc: '2.0', id: 2, method: 'tools/call' },
}
const toolsList: Event = {
  on: 'message',
  message: { jsonrpc: '2.0', id: 2, method: 'tools/list' },
}

const withRoots = { roots: {} }
const withoutRoots = {}

/** Fold a whole session, since the behaviour worth testing spans several turns. */
function run(
  events: Event[],
  bank?: string,
): { session: Session; actions: Action[] } {
  let session = newSession(bank)
  const actions: Action[] = []
  for (const event of events) {
    const [next, produced] = step(session, event)
    session = next
    actions.push(...produced)
  }
  return { session, actions }
}

const kinds = (actions: Action[]) => actions.map((a) => a.do)

describe('outside a git repo', () => {
  test('answers initialize itself, since there is nothing to proxy', () => {
    // Arrange & Act
    const { actions } = run([initialize(withoutRoots)])

    // Assert
    const expectedName = 'project-memory'
    expect(kinds(actions)).toEqual(['reply'])
    const reply = actions[0] as Extract<Action, { do: 'reply' }>
    expect((reply.message.result as { serverInfo: { name: string } }).serverInfo.name)
      .toBe(expectedName)
  })

  test('offers no tools rather than inventing a bank', () => {
    const { actions } = run([initialize(withoutRoots), toolsList])

    const reply = actions[1] as Extract<Action, { do: 'reply' }>
    expect((reply.message.result as { tools: unknown[] }).tools).toEqual([])
  })

  test('never reaches for a bank', () => {
    const { actions } = run([initialize(withoutRoots), initialized, toolCall])

    expect(kinds(actions)).not.toContain('ensure-bank')
    expect(kinds(actions)).not.toContain('forward')
  })
})

describe('a client that does not support roots', () => {
  test('routes on the cwd bank without asking', () => {
    // Arrange & Act
    const { actions } = run(
      [initialize(withoutRoots), initialized, toolCall],
      THIS_REPO,
    )

    // Assert: connected, bank made, request forwarded — and roots never asked.
    expect(kinds(actions)).toEqual(['connect', 'ensure-bank', 'forward'])
  })

  test('connects to the bank the cwd named', () => {
    const { actions } = run([initialize(withoutRoots)], THIS_REPO)

    const connect = actions[0] as Extract<Action, { do: 'connect' }>
    expect(connect.bank).toBe(THIS_REPO)
  })
})

describe('a client that supports roots', () => {
  test('asks for roots only once the client is initialised', () => {
    // Arrange & Act: the spec forbids a server requesting anything earlier.
    const { actions } = run([initialize(withRoots)], THIS_REPO)
    const afterInitialized = run([initialize(withRoots), initialized], THIS_REPO)

    // Assert
    expect(kinds(actions)).not.toContain('ask-roots')
    expect(kinds(afterInitialized.actions)).toContain('ask-roots')
  })

  test('holds requests while the bank is unsettled', () => {
    // Arrange & Act
    const { session, actions } = run(
      [initialize(withRoots), initialized, toolCall],
      THIS_REPO,
    )

    // Assert: nothing was answered against the guess.
    expect(kinds(actions)).toEqual(['connect', 'ask-roots'])
    expect(session.queued).toHaveLength(1)
  })

  test('switches bank and reconnects when roots disagrees with cwd', () => {
    // Arrange & Act
    const { session, actions } = run(
      [
        initialize(withRoots),
        initialized,
        toolCall,
        { on: 'roots', bank: OTHER_REPO },
      ],
      THIS_REPO,
    )

    // Assert: the held request is released only after the switch.
    expect(kinds(actions)).toEqual([
      'connect',
      'ask-roots',
      'log',
      'connect',
      'ensure-bank',
      'forward',
    ])
    expect(session.bank).toBe(OTHER_REPO)
  })

  test('reconnects to the bank roots named', () => {
    const { actions } = run(
      [initialize(withRoots), initialized, { on: 'roots', bank: OTHER_REPO }],
      THIS_REPO,
    )

    const connects = actions.filter((a) => a.do === 'connect')
    const reconnect = connects.at(-1) as Extract<Action, { do: 'connect' }>
    expect(reconnect.bank).toBe(OTHER_REPO)
  })

  test.each([
    ['roots agrees with cwd', THIS_REPO],
    ['roots answers nothing, as on a timeout', undefined],
  ])('keeps the cwd bank when %s', (_case, rooted) => {
    // Arrange & Act
    const { session, actions } = run(
      [initialize(withRoots), initialized, toolCall, { on: 'roots', bank: rooted }],
      THIS_REPO,
    )

    // Assert: no second connect, and the held request is released.
    expect(kinds(actions)).toEqual([
      'connect',
      'ask-roots',
      'ensure-bank',
      'forward',
    ])
    expect(session.bank).toBe(THIS_REPO)
  })
})
