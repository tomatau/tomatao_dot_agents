import { describe, expect, test } from 'bun:test'
import { requireString, requireUrl, stringArray } from './parse'

const WHERE = 'config/example.yml'

const expectRejection = (act: () => unknown, expectedDetail: string) => {
  expect(act).toThrow(`${WHERE}: ${expectedDetail}`)
}

describe('requireString', () => {
  test.each([
    ['absent', {}],
    ['empty', { name: '' }],
    ['only whitespace', { name: '   ' }],
    ['not a string', { name: 7 }],
  ])('rejects a value that is %s', (_case, raw) => {
    expectRejection(() => requireString(WHERE, raw, 'name'), 'missing `name`')
  })

  test('returns the value, trimmed', () => {
    const padded = { name: '  hindsight  ' }
    const expectedName = 'hindsight'
    expect(requireString(WHERE, padded, 'name')).toBe(expectedName)
  })
})

describe('requireUrl', () => {
  test.each([
    ['absent', {}, 'missing `url`'],
    ['missing a scheme', { url: '127.0.0.1:8888' }, '`url` is not a valid URL (127.0.0.1:8888)'],
    ['not a URL at all', { url: 'nonsense' }, '`url` is not a valid URL (nonsense)'],
  ])('rejects a url that is %s', (_case, raw, expectedDetail) => {
    expectRejection(() => requireUrl(WHERE, raw, 'url'), expectedDetail)
  })

  test('drops a trailing slash so identities compare equal', () => {
    const withSlash = { url: 'http://127.0.0.1:8888/' }
    const expectedUrl = 'http://127.0.0.1:8888'
    expect(requireUrl(WHERE, withSlash, 'url')).toBe(expectedUrl)
  })
})

describe('stringArray', () => {
  test.each([
    ['not a list', { args: 'one' }],
    ['a list holding a non-string', { args: ['one', 2] }],
  ])('rejects args that are %s', (_case, raw) => {
    expectRejection(
      () => stringArray(WHERE, raw, 'args'),
      '`args` must be a list of strings',
    )
  })

  test.each([
    ['absent', {}, []],
    ['empty', { args: [] }, []],
    ['populated', { args: ['--path', '/mcp/'] }, ['--path', '/mcp/']],
  ])('reads args that are %s', (_case, raw, expectedArgs) => {
    expect(stringArray(WHERE, raw, 'args')).toEqual(expectedArgs)
  })
})
