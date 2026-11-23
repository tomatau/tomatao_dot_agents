import { expect, test } from 'bun:test'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { REPO } from './paths'
import { parseSearchIndexes } from './search'

test('reads each index, resolving its database like other config paths', () => {
  // Arrange
  const raw = {
    indexes: {
      notes: { db: 'fidx/notes.db', description: 'My notes.' },
      specs: { db: '~/specs/index.db', description: 'Specs.' },
    },
  }
  const expected = [
    {
      name: 'notes',
      db: join(REPO, 'fidx/notes.db'),
      description: 'My notes.',
    },
    {
      name: 'specs',
      db: join(homedir(), 'specs/index.db'),
      description: 'Specs.',
    },
  ]

  // Act
  const indexes = parseSearchIndexes(raw)

  // Assert
  expect(indexes).toEqual(expected)
})

test.each([
  ['a misspelt key', { indexs: {} }, 'unknown key `indexs`'],
  [
    'a misspelt index setting',
    { indexes: { notes: { db: 'x.db', descripton: 'x' } } },
    'index `notes`: unknown key `descripton`',
  ],
  ['indexes as a list', { indexes: ['notes'] }, 'expected a mapping'],
  [
    'an index without a database',
    { indexes: { notes: { description: 'x' } } },
    'index `notes`: missing `db`',
  ],
  [
    'an index without a description',
    { indexes: { notes: { db: 'x.db' } } },
    'index `notes`: missing `description`',
  ],
])('refuses %s', (_case, raw, message) => {
  // Act / Assert
  expect(() => parseSearchIndexes(raw)).toThrow(message)
})

test.each([
  ['nothing declared', undefined],
  ['an empty file', null],
  ['an empty `indexes`', { indexes: {} }],
])('offers no indexes for %s', (_case, raw) => {
  expect(parseSearchIndexes(raw)).toEqual([])
})
