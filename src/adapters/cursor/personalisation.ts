import { join } from 'node:path'
import type { Link } from '../../lib/links'
import { stripTrailingSlash } from '../../lib/path'
import type { AdapterLink } from '../../settings/config'
import type { PersonalisationAdapter, SourceFile } from '../types'

// Cursor maps sources 1:1 to rule files; filename becomes the rule's description.
export function personalisation(links: AdapterLink[]): PersonalisationAdapter {
  const pair = (link: AdapterLink, stem: string): Link => ({
    dest: join(stripTrailingSlash(link.dest), `${stem}.mdc`),
    target: join(stripTrailingSlash(link.target), `${stem}.mdc`),
  })

  return {
    name: 'cursor',
    render(sources: SourceFile[]) {
      return links.flatMap((l) =>
        sources.map((source) => ({
          distPath: pair(l, source.name).target,
          content: [
            '---',
            `description: ${source.name}`,
            'alwaysApply: true',
            '---',
            '',
            source.content,
          ].join('\n'),
        })),
      )
    },
    links(sources: SourceFile[]) {
      return links.flatMap((l) => sources.map((s) => pair(l, s.name)))
    },
  }
}
