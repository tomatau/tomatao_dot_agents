import type { Link } from '../lib/links'

/** One personalisation source: a vault note, frontmatter stripped. */
export interface SourceFile {
  name: string
  content: string
}

export interface RenderedFile {
  distPath: string
  content: string
}

export interface PersonalisationAdapter {
  name: string
  render(sources: SourceFile[]): RenderedFile[]
  links(sources: SourceFile[]): Link[]
}
