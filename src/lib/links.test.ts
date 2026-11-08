import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { LinkObservation } from './links'
import { strayLinks } from '../domains/reconcile'
import { classifyLink, retireLink } from './links'

const TARGET = '/repo/dist/claude/CLAUDE.md'

const linkState = (observed: LinkObservation): string =>
  classifyLink({ expectedTarget: TARGET, observed })

describe('classifyLink', () => {
  test.each([
    ['missing', { kind: 'missing' } as LinkObservation, 'missing'],
    ['a real file', { kind: 'file' } as LinkObservation, 'foreign-file'],
    [
      'a link elsewhere',
      { kind: 'symlink', target: '/somewhere/else' } as LinkObservation,
      'wrong-target',
    ],
    [
      'a link to the target',
      { kind: 'symlink', target: TARGET } as LinkObservation,
      'ok',
    ],
  ])('reports %s as its own state', (_case, observed, expected) => {
    expect(linkState(observed)).toBe(expected)
  })
})

let root: string
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'link-retirement-'))
})
afterAll(async () => {
  await rm(root, { recursive: true, force: true })
})

for (const [name, target, owned] of [
  ['absolute-owned', 'repo/skill', true],
  ['relative-owned', './repo/skill', true],
  ['sibling', 'repo-other/skill', false],
  ['normalised-escape', './repo/../repo-other/skill', false],
] as const) {
  test(`discovery and retirement agree on ${name}`, async () => {
    const dest = join(root, name)
    const ownedRoot = join(root, 'repo')
    await symlink(name === 'absolute-owned' ? join(root, target) : target, dest)
    const stray = await strayLinks({
      destinations: [dest],
      wanted: [],
      ownedRoot,
    })
    expect(stray).toHaveLength(owned ? 1 : 0)
    expect(await retireLink({ dest, ownedRoot })).toBe(owned ? 'removed' : 'ok')
    if (owned) expect(await lstat(dest).catch(() => undefined)).toBeUndefined()
    else expect((await lstat(dest)).isSymbolicLink()).toBe(true)
  })
}

test('retirement leaves real files alone', async () => {
  const dest = join(root, 'real-file')
  await writeFile(dest, 'personal content')
  expect(await retireLink({ dest, ownedRoot: root })).toBe('ok')
  expect(await readFile(dest, 'utf8')).toBe('personal content')
})

test('discovery never follows a foreign directory symlink', async () => {
  const foreign = join(root, 'foreign-directory')
  await mkdir(foreign)
  await symlink(join(root, 'repo/skill'), join(foreign, 'child'))
  const dest = join(root, 'directory-link')
  await symlink(foreign, dest)
  expect(
    await strayLinks({
      destinations: [dest],
      wanted: [],
      ownedRoot: join(root, 'repo'),
    }),
  ).toEqual([])
  expect((await lstat(join(foreign, 'child'))).isSymbolicLink()).toBe(true)
})
