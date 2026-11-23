import { expect, test } from 'bun:test'
import { recordChoices } from './enabled'

/** The shared file switches claude and codex on, and opencode off. */
const SHARED = { claude: true, codex: true, opencode: false }
const AS_SHARED = { claude: true, codex: true, opencode: false }

test.each([
  [
    'records nothing when every choice matches the shared file',
    {},
    AS_SHARED,
    {},
  ],
  [
    'records a harness switched off here',
    {},
    { ...AS_SHARED, codex: false },
    { codex: { enabled: false } },
  ],
  [
    'records a harness switched on here that the shared file switches off',
    {},
    { ...AS_SHARED, opencode: true },
    { opencode: { enabled: true } },
  ],
  [
    'forgets a choice that no longer departs from the shared file',
    { codex: { enabled: false } },
    AS_SHARED,
    {},
  ],
  [
    'keeps what else this machine wrote for a harness',
    { codex: { enabled: false, skills: 'native' }, zed: { skills: 'native' } },
    AS_SHARED,
    { codex: { skills: 'native' }, zed: { skills: 'native' } },
  ],
  [
    'leaves a harness nobody was asked about as it was recorded',
    { codex: { enabled: false } },
    { claude: true },
    { codex: { enabled: false } },
  ],
])('%s', (_case, local, chosen, expected) => {
  expect(recordChoices({ shared: SHARED, local, chosen })).toEqual(expected)
})

test('is idempotent', () => {
  const chosen = { ...AS_SHARED, codex: false }
  const once = recordChoices({ shared: SHARED, local: {}, chosen })
  expect(recordChoices({ shared: SHARED, local: once, chosen })).toEqual(once)
})
