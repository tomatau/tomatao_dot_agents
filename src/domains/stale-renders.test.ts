import { expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { staleRenders } from './stale-renders'

test('reports only the files a render no longer writes', async () => {
  const dist = await mkdtemp(join(tmpdir(), 'stale-renders-'))
  try {
    // Arrange: one harness rendering a file per source, one a single file.
    const rules = join(dist, 'cursor', 'rules')
    const claude = join(dist, 'claude')
    await mkdir(join(rules, 'nested'), { recursive: true })
    await mkdir(claude)
    const kept = join(rules, 'Kept.mdc')
    const removed = join(rules, 'Removed.mdc')
    const aggregate = join(claude, 'CLAUDE.md')
    for (const path of [kept, removed, aggregate]) await writeFile(path, '')

    // Act and assert: the removed source's file is stale, directories are not.
    expect(await staleRenders([kept, aggregate])).toEqual([removed])
  } finally {
    await rm(dist, { recursive: true, force: true })
  }
})
