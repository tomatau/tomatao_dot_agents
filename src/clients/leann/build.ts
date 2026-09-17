import { mkdir } from 'node:fs/promises'
import { LEANN_BIN, LEANN_DIR } from '../../settings/paths'

export interface BuildRequest {
  /** Index name, unique across every directory LEANN has registered. */
  name: string
  /** Absolute paths, one per document. */
  files: string[]
  backend: string
  embeddingModel: string
}

/**
 * Build one index from an explicit file list.
 *
 * LEANN takes no exclusion argument and reads only a `.gitignore` beside the
 * documents it is given, so naming every file is what keeps an unlisted note
 * out. `--force` makes this a full rebuild: the published backends cannot drop
 * a document that an incremental build has already embedded.
 */
export async function buildIndex(req: BuildRequest): Promise<void> {
  await mkdir(LEANN_DIR, { recursive: true })
  const args = [
    'build',
    req.name,
    '--backend-name',
    req.backend,
    '--embedding-model',
    req.embeddingModel,
    '--force',
    // Last, so the file list cannot swallow a following flag.
    '--docs',
    ...req.files,
  ]
  const result = await Bun.$`${LEANN_BIN} ${args}`.cwd(LEANN_DIR).nothrow()
  if (result.exitCode !== 0) {
    throw new Error(`leann build failed (exit ${result.exitCode})`)
  }
}
