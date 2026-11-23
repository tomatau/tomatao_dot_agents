// unit: unreachable
import { describe, expect, test } from 'bun:test'
import type { Action, Event, Session } from './protocol'
import { step } from './decide'
import { CATALOGUE_BANK, newSession, PROJECT_PATH } from './protocol'

const THIS_REPO = 'project-here'
const OTHER_REPO = 'project-there'

const initialize = (capabilities: object): Event => ({
  on: 'message',
  message: {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { capabilities },
  },
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

const pathCallMessage = {
  jsonrpc: '2.0',
  id: 3,
  method: 'tools/call',
  params: {
    name: 'recall',
    arguments: { query: 'why', [PROJECT_PATH]: '/code/there' },
  },
}
const pathCall: Event = { on: 'message', message: pathCallMessage }
/** What the shell reports once it has resolved a call's path with git. */
const projectFound = (bank?: string): Event => ({
  on: 'project',
  message: pathCallMessage,
  path: '/code/there',
  bank,
})

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

const kinds = (actions: Action[]) => actions.map(a => a.do)

describe('outside a git repo', () => {
  test('answers initialize itself, since there is nothing to proxy', () => {
    // Arrange & Act
    const { actions } = run([initialize(withoutRoots)])

    // Assert
    const expectedName = 'project-memory'
    expect(kinds(actions)).toEqual(['reply'])
    const reply = actions[0] as Extract<Action, { do: 'reply' }>
    expect(
      (reply.message.result as { serverInfo: { name: string } }).serverInfo
        .name,
    ).toBe(expectedName)
  })

  test('falls back to calls naming their repo, connected only to list tools', () => {
    // Arrange & Act
    const { session, actions } = run([
      initialize(withoutRoots),
      initialized,
      toolsList,
    ])

    // Assert
    expect(kinds(actions)).toEqual(['reply', 'log', 'list-tools'])
    expect(actions[2]).toMatchObject({ bank: CATALOGUE_BANK })
    expect(session.route.kind).toBe('per-call')
  })

  test('resolves the repo a call names before reaching any bank', () => {
    const { actions } = run([initialize(withoutRoots), initialized, pathCall])

    expect(kinds(actions)).toEqual(['reply', 'log', 'resolve-project'])
  })

  test('routes a call to the bank its path names, without the path', () => {
    // Arrange & Act
    const { actions } = run([
      initialize(withoutRoots),
      initialized,
      projectFound(OTHER_REPO),
    ])

    expect(actions.slice(2)).toMatchObject([
      { do: 'ensure-bank', bank: OTHER_REPO },
      {
        do: 'forward',
        bank: OTHER_REPO,
        message: { params: { name: 'recall', arguments: { query: 'why' } } },
      },
    ])
    const forward = actions[3]
    if (forward.do !== 'forward') throw new Error('Expected a forwarded call')
    expect(forward.message.params).toEqual({
      name: 'recall',
      arguments: { query: 'why' },
    })
  })

  test('refuses a call whose path names no repo, reaching no bank', () => {
    // Arrange & Act
    const { actions } = run([
      initialize(withoutRoots),
      initialized,
      projectFound(undefined),
    ])

    // Assert
    const expectedCode = -32002
    expect(kinds(actions.slice(2))).toEqual(['reply'])
    const reply = actions[2] as Extract<Action, { do: 'reply' }>
    expect((reply.message.error as { code: number }).code).toBe(expectedCode)
  })
})

describe('started outside a git repo, by a client that supports roots', () => {
  test('asks for roots rather than settling for no bank', () => {
    const { actions } = run([initialize(withRoots), initialized])

    expect(kinds(actions)).toEqual(['reply', 'ask-roots'])
  })

  test('adopts the bank roots name, without a second initialize reply', () => {
    // Arrange & Act
    const { session, actions } = run([
      initialize(withRoots),
      initialized,
      toolsList,
      { on: 'roots', bank: OTHER_REPO },
    ])

    // Assert: the held request is released against the bank roots named.
    expect(kinds(actions)).toEqual([
      'reply',
      'ask-roots',
      'ensure-bank',
      'forward',
    ])
    expect(actions.at(-1)).toMatchObject({ bank: OTHER_REPO })
    expect(session.route).toEqual({ kind: 'fixed', bank: OTHER_REPO })
  })

  test('falls back to calls naming their repo when roots name no single repo', () => {
    // Arrange & Act: undefined is also what a timeout reports.
    const { session, actions } = run([
      initialize(withRoots),
      initialized,
      toolsList,
      { on: 'roots', bank: undefined },
    ])

    // Assert: the held listing is released through the fallback.
    expect(kinds(actions)).toEqual(['reply', 'ask-roots', 'log', 'list-tools'])
    expect(session.route.kind).toBe('per-call')
  })

  test('keeps per-call routing when roots replies after the timeout', () => {
    const { actions } = run([
      initialize(withRoots),
      initialized,
      { on: 'roots' },
      { on: 'roots', bank: THIS_REPO },
      toolsList,
    ])

    expect(actions.slice(2)).toMatchObject([
      { do: 'log' },
      { do: 'list-tools', bank: CATALOGUE_BANK },
    ])
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
    const afterInitialized = run(
      [initialize(withRoots), initialized],
      THIS_REPO,
    )

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
    expect(session.route).toMatchObject({
      kind: 'waiting',
      queued: [toolCall.message],
    })
  })

  test('forwards to the bank named by roots when it disagrees with cwd', () => {
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
      'ensure-bank',
      'forward',
    ])
    expect(actions.at(-1)).toMatchObject({ bank: OTHER_REPO })
    expect(session.route).toEqual({ kind: 'fixed', bank: OTHER_REPO })
  })

  test.each([
    ['roots agrees with cwd', THIS_REPO],
    ['roots answers nothing, as on a timeout', undefined],
  ])('keeps the cwd bank when %s', (_case, rooted) => {
    // Arrange & Act
    const { session, actions } = run(
      [
        initialize(withRoots),
        initialized,
        toolCall,
        { on: 'roots', bank: rooted },
      ],
      THIS_REPO,
    )

    // Assert: no second connect, and the held request is released.
    expect(kinds(actions)).toEqual([
      'connect',
      'ask-roots',
      'ensure-bank',
      'forward',
    ])
    expect(actions.at(-1)).toMatchObject({ bank: THIS_REPO })
    expect(session.route).toEqual({ kind: 'fixed', bank: THIS_REPO })
  })
})
