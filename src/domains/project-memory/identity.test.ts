import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { projectBankId } from './identity'

let root: string

/** Real repos, because the behaviour under test is reading real git config. */
async function makeRepo(name: string, remote?: string): Promise<string> {
  const path = join(root, name)
  await Bun.$`mkdir -p ${path}`.quiet()
  await Bun.$`git init -q`.cwd(path).quiet()
  if (remote) await Bun.$`git remote add origin ${remote}`.cwd(path).quiet()
  return path
}

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'identity-'))
})
afterAll(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('naming a repo', () => {
  test('has no bank outside a git repo, rather than inventing one', async () => {
    // Arrange: a plain directory.
    const notARepo = join(root, 'plain')
    await Bun.$`mkdir -p ${notARepo}`.quiet()

    // Act & Assert
    expect(await projectBankId(notARepo)).toBeUndefined()
  })

  test('falls back to the directory when a repo has no remote', async () => {
    const repo = await makeRepo('no-remote')
    const expectedBank = 'project-no-remote'
    expect(await projectBankId(repo)).toBe(expectedBank)
  })

  test.each([
    [
      'an ssh remote',
      'git@github.com:Tomato/My-Repo.git',
      'project-github-com-tomato-my-repo',
    ],
    [
      'an https remote',
      'https://gitlab.com/acme/tools/widget.git',
      'project-gitlab-com-acme-tools-widget',
    ],
    [
      'a remote without the .git suffix',
      'https://github.com/acme/plain',
      'project-github-com-acme-plain',
    ],
  ])('names a repo from %s', async (_case, remote, expectedBank) => {
    // Arrange
    const repo = await makeRepo(`r-${expectedBank}`, remote)

    // Act & Assert: the remote wins, so clones and renames agree.
    expect(await projectBankId(repo)).toBe(expectedBank)
  })

  test('gives a nested directory the same bank as its repo root', async () => {
    // Arrange
    const repo = await makeRepo('nested', 'git@github.com:acme/thing.git')
    const deep = join(repo, 'src', 'deeply', 'nested')
    await Bun.$`mkdir -p ${deep}`.quiet()

    // Act & Assert
    const expectedBank = 'project-github-com-acme-thing'
    expect(await projectBankId(deep)).toBe(expectedBank)
  })

  test('renames a clone to the same bank as its origin', async () => {
    // Arrange: same remote, different directory name.
    const remote = 'git@github.com:acme/shared.git'
    const original = await makeRepo('original-name', remote)
    const clone = await makeRepo('a-different-name', remote)

    // Act & Assert: identity follows the remote, not the path.
    expect(await projectBankId(clone)).toBe(await projectBankId(original))
  })
})
