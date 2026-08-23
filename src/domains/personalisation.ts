import { readdir, readFile } from "node:fs/promises";
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
