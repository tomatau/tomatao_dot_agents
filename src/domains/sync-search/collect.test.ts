import { expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { collectIndexFiles } from './collect'

test('discovers linked notes and directories through symlink chains', async () => {
  const root = await mkdtemp(join(tmpdir(), 'index-discovery-'))
  try {
    await mkdir(join(root, 'notes'))
    await writeFile(join(root, 'notes', 'included.md'), 'included')
    await writeFile(join(root, 'notes', 'excluded.md'), 'excluded')
    await symlink('notes', join(root, 'linked'))
    await symlink('linked', join(root, 'chained'))
    await symlink('notes/included.md', join(root, 'file.md'))
    await symlink('file.md', join(root, 'chained-file.md'))

    const files = await collectIndexFiles(
      {
        name: 'test',
        sources: ['**/*.md'],
        unindexed: ['**/excluded.md'],
      },
      root,
    )
    expect(files).toEqual([
      'chained-file.md',
      'chained/included.md',
      'file.md',
      'linked/included.md',
      'notes/included.md',
    ])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
