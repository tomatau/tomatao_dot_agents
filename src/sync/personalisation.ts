import { mkdir, lstat, readlink, symlink, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { loadAdapters } from "../adapters/index";

async function render(): Promise<void> {
  for (const adapter of await loadAdapters()) {
    for (const file of await adapter.render()) {
      await mkdir(dirname(file.distPath), { recursive: true });
      await writeFile(file.distPath, file.content);
      console.log(`rendered     ${file.distPath}`);
    }
  }
}

type LinkState = "linked" | "retargeted" | "ok";

async function ensureLink(dest: string, target: string): Promise<LinkState> {
  await mkdir(dirname(dest), { recursive: true });
  let existing = null;
  try {
    existing = await lstat(dest);
  } catch {}
  if (existing?.isSymbolicLink()) {
    if ((await readlink(dest)) === target) return "ok";
    await unlink(dest);
    await symlink(target, dest);
    return "retargeted";
  }
  if (existing) {
    throw new Error(`refusing to replace non-symlink ${dest}`);
  }
  await symlink(target, dest);
  return "linked";
}

async function link(): Promise<void> {
  for (const adapter of await loadAdapters()) {
    for (const l of await adapter.links()) {
      const state = await ensureLink(l.dest, l.target);
      console.log(`${state.padEnd(13)}${l.dest}`);
    }
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
