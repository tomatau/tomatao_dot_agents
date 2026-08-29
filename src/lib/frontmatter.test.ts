import { describe, expect, test } from 'bun:test'
import { parseFrontmatter } from './frontmatter'

const NOTE = 'preferences/Example.md'

describe('a note without frontmatter', () => {
  test('is all body, trimmed', () => {
    const parsed = parseFrontmatter(NOTE, '\n# Title\n\nbody\n')
    expect(parsed).toEqual({
      frontmatter: {},
      frontmatterRaw: '',
      body: '# Title\n\nbody',
    })
  })
})

describe('a note with frontmatter', () => {
  test('separates the mapping from the body', () => {
    // Arrange
    const raw = '---\ntype: preference\ntags:\n  - note\n---\n# Title\n'

    // Act
    const { frontmatter, body } = parseFrontmatter(NOTE, raw)

    // Assert
    expect(frontmatter).toEqual({ type: 'preference', tags: ['note'] })
    expect(body).toBe('# Title')
  })

  test('reads an empty block as no keys', () => {
    expect(parseFrontmatter(NOTE, '---\n\n---\nbody\n').frontmatter).toEqual({})
  })
})

describe('a malformed frontmatter block', () => {
  test('names the note rather than syncing it as untagged', () => {
    // Arrange: an unclosed list, which YAML cannot parse.
    const raw = '---\ntags: [note, preference\n---\nbody\n'

    // Act & Assert
    expect(() => parseFrontmatter(NOTE, raw)).toThrow(
      `${NOTE}: frontmatter is not valid YAML`,
    )
  })

  test('rejects a block that is not a mapping', () => {
    const raw = '---\n- one\n- two\n---\nbody\n'
    expect(() => parseFrontmatter(NOTE, raw)).toThrow(
      `${NOTE}: frontmatter must be a mapping`,
    )
  })
})
