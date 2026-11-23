import { expect, test } from 'bun:test'
import { overlay } from './overlay'

const SHARED = {
  opencode: { skills: 'native', mcp: { enable: ['memory', 'search'] } },
  cursor: { skills: 'native' },
}

test.each([
  ['changes nothing when there is no local value', undefined, SHARED],
  [
    'adds a key inside a nested mapping and keeps its siblings',
    { opencode: { enabled: false } },
    { ...SHARED, opencode: { ...SHARED.opencode, enabled: false } },
  ],
  [
    'replaces a scalar',
    { cursor: { skills: 'linked' } },
    { ...SHARED, cursor: { skills: 'linked' } },
  ],
  [
    'replaces a list whole rather than appending to it',
    { opencode: { mcp: { enable: ['memory'] } } },
    {
      ...SHARED,
      opencode: { skills: 'native', mcp: { enable: ['memory'] } },
    },
  ],
  [
    'adds a top-level key the shared value lacks',
    { zed: { skills: 'native' } },
    { ...SHARED, zed: { skills: 'native' } },
  ],
  [
    'replaces a mapping with a scalar',
    { cursor: false },
    { ...SHARED, cursor: false },
  ],
])('%s', (_case, local, expected) => {
  expect(overlay(SHARED, local)).toEqual(expected)
})

test('stands alone when there is no shared value', () => {
  expect(overlay(undefined, { dir: '~/vault' })).toEqual({ dir: '~/vault' })
})

test('leaves the shared value unmodified', () => {
  const before = structuredClone(SHARED)
  overlay(SHARED, { opencode: { enabled: false } })
  expect(SHARED).toEqual(before)
})
