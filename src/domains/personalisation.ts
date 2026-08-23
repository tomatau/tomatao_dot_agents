import { readdir, readFile, readlink, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { PERSONALISATION_DIR } from "../settings/paths";

const FRONTMATTER = /^---\n[\s\S]*?\n---\n/;

export interface SourceFile {
  name: string;
  content: string;
}

export async function listSources(): Promise<SourceFile[]> {
  const entries = await readdir(PERSONALISATION_DIR);
  const files = entries.filter((f) => f.endsWith(".md")).sort();
  if (files.length === 0) {
    throw new Error(`no .md sources found in ${PERSONALISATION_DIR}`);
  }
  const sources: SourceFile[] = [];
  for (const file of files) {
    const raw = await readFile(join(PERSONALISATION_DIR, file), "utf8");
    sources.push({
      name: basename(file, extname(file)),
      content: raw.replace(FRONTMATTER, "").trim(),
    });
  }
  return sources;
}

export function aggregate(sources: SourceFile[]): string {
  return `${sources
    .map((s) => s.content)
    .join("\n\n")
    .trimEnd()}\n`;
}

export type SourceState = "ok" | "broken-link" | "foreign-file";

export interface SourceCheck {
  name: string;
  path: string;
  state: SourceState;
}

export async function inspectSources(): Promise<SourceCheck[]> {
  const entries = await readdir(PERSONALISATION_DIR, { withFileTypes: true });
  const files = entries
    .filter((e) => e.name.endsWith(".md"))
    .sort((a, b) => a.name.localeCompare(b.name));
  return Promise.all(
    files.map(async (entry) => {
      const path = join(PERSONALISATION_DIR, entry.name);
      if (!entry.isSymbolicLink()) return { name: entry.name, path, state: "foreign-file" };
      try {
        await stat(await readlink(path));
        return { name: entry.name, path, state: "ok" };
      } catch {
        return { name: entry.name, path, state: "broken-link" };
      }
    }),
  );
}
