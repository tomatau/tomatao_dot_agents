import { expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { listSkills } from './skills'

test('discovers skill directories through symlink chains', async () => {
  const root = await mkdtemp(join(tmpdir(), 'skill-discovery-'))
  try {
    await mkdir(join(root, 'real'))
    await writeFile(join(root, 'file'), 'not a skill')
    await symlink('real', join(root, 'linked'))
    await symlink('linked', join(root, 'chained'))
    await symlink('missing', join(root, 'broken'))

    expect(await listSkills(root)).toEqual(['chained', 'linked', 'real'])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
