import { describe, expect, test } from 'bun:test'
import { severityOf, tally } from './report'

describe('severityOf', () => {
  test('grades states a check can report', () => {
    expect(severityOf('ok')).toBe('pass')
    expect(severityOf('local')).toBe('pass')
    expect(severityOf('native')).toBe('info')
    expect(severityOf('stale')).toBe('warn')
    expect(severityOf('conflict')).toBe('fail')
  })

  test('treats an unrecognised state as a failure', () => {
    expect(severityOf('something-new')).toBe('fail')
  })
})

describe('tally', () => {
  test('splits rows into passes, sync-fixable, and hard failures', () => {
    expect(
      tally([
        {
          title: 'renders',
          rows: [
            { state: 'fresh', detail: 'a' },
            { state: 'stale', detail: 'b' },
            { state: 'missing', detail: 'c' },
            { state: 'error', detail: 'd' },
          ],
        },
      ]),
    ).toEqual({ ok: 1, warnings: 2, failures: 1 })
  })

  test('leaves informational sections out of the counts', () => {
    expect(
      tally([
        {
          title: 'native skills',
          rows: [{ state: 'native', detail: 'a' }],
          informational: true,
        },
      ]),
    ).toEqual({ ok: 0, warnings: 0, failures: 0 })
  })
})
