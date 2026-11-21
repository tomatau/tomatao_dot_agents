import { expect, test } from 'bun:test'
import { expandBraces } from './braces'

test.each([
  ['a pattern without braces', 'projects/**/*.md', ['projects/**/*.md']],
  [
    'a path with spaces',
    'tomatao/interests/Screen near misses.md',
    ['tomatao/interests/Screen near misses.md'],
  ],
  [
    'one group',
    'records/{people,jobs}/*.md',
    ['records/people/*.md', 'records/jobs/*.md'],
  ],
  ['two groups', '{a,b}/{c,d}', ['a/c', 'a/d', 'b/c', 'b/d']],
  ['a nested group', 'x/{a,b{1,2}}', ['x/a', 'x/b1', 'x/b2']],
  ['an empty branch', 'notes{,-old}.md', ['notes.md', 'notes-old.md']],
])('expands %s', (_case, pattern, expectedPatterns) => {
  expect(expandBraces(pattern)).toEqual(expectedPatterns)
})

test('rejects an unbalanced group, naming the pattern', () => {
  const unbalanced = 'records/{people,jobs/*.md'
  expect(() => expandBraces(unbalanced)).toThrow(
    'unbalanced braces in `records/{people,jobs/*.md`',
  )
})
