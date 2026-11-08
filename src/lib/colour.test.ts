import { expect, test } from 'bun:test'
import { stripVTControlCharacters } from 'node:util'
import { fitColumns } from './colour'

test('pads styled labels by visible columns', () => {
  const label = '\x1b[1mclaude\x1b[22m'
  const result = fitColumns(label, 12)
  expect(Bun.stringWidth(result)).toBe(12)
  expect(stripVTControlCharacters(result)).toBe('claude      ')
})

test('clips long styled rows without splitting escape sequences', () => {
  const result = fitColumns(
    '\x1b[2ma long path to a skill directory\x1b[22m',
    10,
  )
  expect(Bun.stringWidth(result)).toBe(10)
  expect(stripVTControlCharacters(result)).toBe('a long pat')
  expect(result).toEndWith('\x1b[22m')
})

test('fits wide characters without exceeding the frame', () => {
  const result = fitColumns('界界界', 5)
  expect(Bun.stringWidth(result)).toBe(5)
  expect(result).toBe('界界 ')
})
