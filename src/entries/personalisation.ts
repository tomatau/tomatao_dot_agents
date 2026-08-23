import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { loadAdapters } from "../adapters/index";
import { ensureLinks } from "../lib/links";

async function render(): Promise<void> {
  for (const adapter of await loadAdapters()) {
    for (const file of await adapter.render()) {
      await mkdir(dirname(file.distPath), { recursive: true });
      await writeFile(file.distPath, file.content);
      console.log(`rendered     ${file.distPath}`);
    }
  }
}

async function link(): Promise<void> {
  const adapters = await loadAdapters();
  const links = (await Promise.all(adapters.map((a) => a.links()))).flat();
  for (const enforced of await ensureLinks({ links })) {
    console.log(`${enforced.result.padEnd(13)}${enforced.link.dest}`);
  }
}

const cmd = process.argv[2] ?? "sync";
if (cmd === "render") {
  await render();
} else if (cmd === "link") {
  await link();
} else if (cmd === "sync") {
  await render();
  await link();
} else {
  console.error(`unknown command "${cmd}" (expected render|link|sync)`);
  process.exit(1);
}
