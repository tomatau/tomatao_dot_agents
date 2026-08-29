import type { AdapterLink } from '../settings/adapters'
import type { PersonalisationAdapter, SourceFile } from './types'
import { aggregate } from './render'

/** Personalisation adapter that folds every source into one document per link. */
export function aggregateAdapter(name: string) {
  return (links: AdapterLink[]): PersonalisationAdapter => ({
    name,
    render(sources: SourceFile[]) {
      const content = aggregate(sources)
      return links.map(l => ({ distPath: l.target, content }))
    },
    links() {
      return links
    },
  })
}
