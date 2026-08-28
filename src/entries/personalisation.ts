import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { loadPersonalisationAdapters } from '../adapters/index'
import { listSources } from '../domains/personalisation'
import { ensureLinks } from '../lib/links'

async function render(): Promise<void> {
  const sources = await listSources()
  for (const adapter of await loadPersonalisationAdapters()) {
    for (const file of adapter.render(sources)) {
      await mkdir(dirname(file.distPath), { recursive: true })
      await writeFile(file.distPath, file.content)
      console.log(`rendered     ${file.distPath}`)
    }
  }
}

async function link(): Promise<void> {
  const sources = await listSources()
  const adapters = await loadPersonalisationAdapters()
  const links = adapters.flatMap(a => a.links(sources))
  for (const enforced of await ensureLinks({ links })) {
    console.log(`${enforced.result.padEnd(13)}${enforced.link.dest}`)
  }
}

const cmd = process.argv[2] ?? 'sync'
if (cmd === 'render') {
  await render()
} else if (cmd === 'link') {
  await link()
} else if (cmd === 'sync') {
  await render()
  await link()
} else {
  console.error(`unknown command "${cmd}" (expected render|link|sync)`)
  process.exit(1)
}
