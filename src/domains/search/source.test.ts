import { expect, test } from 'bun:test'
import { searchServer } from './source'

const ENTRY = '/agents/src/entries/search.ts'
const WHERE = 'mcp/search.yml'
const RAW = { kind: 'search', command: 'bun' }
const NOTES = { name: 'notes', db: '/dbs/notes.db', description: 'My notes.' }
const SPECS = { name: 'specs', db: '/dbs/specs.db', description: 'Specs.' }

test('pins one server with every index as a JSON argument', () => {
  // Arrange
  const pinned = JSON.stringify({
    notes: { db: NOTES.db, description: NOTES.description },
    specs: { db: SPECS.db, description: SPECS.description },
  })

  // Act
  const servers = searchServer(
    [NOTES, SPECS],
    ENTRY,
    'search',
    WHERE,
    RAW,
    () => true,
  )

  // Assert
  expect(servers).toEqual([
    {
      name: 'search',
      transport: {
        kind: 'stdio',
        command: 'bun',
        args: [ENTRY, '--indexes', pinned],
      },
    },
  ])
})

test('offers no server on a machine with no indexes', () => {
  // Act
  const servers = searchServer([], ENTRY, 'search', WHERE, RAW, () => true)

  // Assert
  expect(servers).toEqual([])
})

test('refuses to pin an index whose database is missing', () => {
  // Arrange
  const exists = (path: string) => path !== SPECS.db

  // Act / Assert
  expect(() =>
    searchServer([NOTES, SPECS], ENTRY, 'search', WHERE, RAW, exists),
  ).toThrow('index `specs` has no database at /dbs/specs.db')
})
