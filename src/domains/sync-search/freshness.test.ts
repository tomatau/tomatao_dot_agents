import { expect, test } from 'bun:test'
import type { IndexFreshness } from './freshness'
import { judge } from './freshness'

const SYNCED_AT = '2026-11-21T10:00:00.000Z'

type Case = [
  string,
  number,
  { indexed: number; edited: number } | undefined,
  Pick<IndexFreshness, 'state' | 'reason'>,
]

test.each<Case>([
  ['never synced', 5, undefined, { state: 'missing' }],
  ['in step', 5, { indexed: 5, edited: 0 }, { state: 'fresh' }],
  [
    'scope moved',
    6,
    { indexed: 5, edited: 0 },
    { state: 'stale', reason: 'scope-changed' },
  ],
  [
    'notes edited since',
    5,
    { indexed: 5, edited: 2 },
    { state: 'stale', reason: 'notes-edited' },
  ],
])('an index %s', (_case, inScope, synced, expected) => {
  // Act
  const freshness = judge(
    'notes',
    inScope,
    synced && { ...synced, syncedAt: SYNCED_AT },
  )

  // Assert
  expect({ state: freshness.state, reason: freshness.reason }).toEqual({
    reason: undefined,
    ...expected,
  })
})
