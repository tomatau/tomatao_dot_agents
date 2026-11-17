import { expect, spyOn, test } from 'bun:test'
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkSkillLinks, listSkills, reconcileSkillLinks } from './skills'

test('links around a skill another tool installed, leaving it in place', async () => {
  const root = await mkdtemp(join(tmpdir(), 'skill-links-'))
  const output = spyOn(console, 'log').mockImplementation(() => {})
  try {
    // Arrange: a harness holding its own copy of one skill and none of the other.
    const repo = join(root, 'repo')
    const harness = join(root, 'harness')
    const theirs = {
      dest: join(harness, 'theirs'),
      target: join(repo, 'theirs'),
    }
    const ours = { dest: join(harness, 'ours'), target: join(repo, 'ours') }
    const theirCopy = 'installed by another tool'
    await mkdir(theirs.dest, { recursive: true })
    await writeFile(join(theirs.dest, 'SKILL.md'), theirCopy)

    // Act
    await reconcileSkillLinks({
      destinations: [harness],
      planned: [theirs, ours],
      ownedRoot: repo,
    })

    // Assert: their copy is untouched and reported, and ours is linked.
    const states = await checkSkillLinks({ links: [theirs, ours] })
    expect(states.map(check => check.state)).toEqual(['external', 'ok'])
    expect(await readFile(join(theirs.dest, 'SKILL.md'), 'utf8')).toBe(
      theirCopy,
    )
  } finally {
    output.mockRestore()
    await rm(root, { recursive: true, force: true })
  }
})

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
