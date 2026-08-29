import type { McpResolver } from '../lib/mcp'
import { PROJECT_MEMORY_ENTRY } from '../settings/paths'
import { projectMemorySource } from '../domains/project-memory/source'
import { sharedMemorySource } from '../domains/shared-memory/sources'

/**
 * Which `kind:` values `mcp/<id>.yml` may use. Composition, so it lives with the
 * commands rather than in a domain: it names every provider, and only the layer
 * above them may do that. Loading and converging stay ignorant of what a kind means.
 */
export const kinds: Record<string, McpResolver> = {
  'shared-memory': sharedMemorySource,
  'project-memory': projectMemorySource(PROJECT_MEMORY_ENTRY),
}
