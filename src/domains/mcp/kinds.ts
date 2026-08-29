import type { McpResolver } from '../../lib/mcp'
import { PROJECT_MEMORY_ENTRY } from '../../settings/paths'
import { projectMemorySource } from '../project-memory/source'
import { sharedMemorySource } from '../shared-memory/sources'

/**
 * Which `kind:` values `mcp/<id>.yml` may use. Only this registry knows the
 * providers; loading and converging stay ignorant of what any kind means.
 */
export const kinds: Record<string, McpResolver> = {
  'shared-memory': sharedMemorySource,
  'project-memory': projectMemorySource(PROJECT_MEMORY_ENTRY),
}
