import { join } from "node:path";
import type { HarnessAdapter, Link } from "./types";
import type { AdapterLink } from "../lib/config";
import { listSources } from "../lib/sources";

export function cursor(links: AdapterLink[]): HarnessAdapter {
  const dir = (path: string) => path.replace(/\/+$/, "");
  const pair = (link: AdapterLink, stem: string): Link => ({
    dest: join(dir(link.dest), `${stem}.mdc`),
    target: join(dir(link.target), `${stem}.mdc`),
  });

  return {
    name: "cursor",
    async render() {
      const sources = await listSources();
      return links.flatMap((l) =>
        sources.map((source) => ({
          distPath: pair(l, source.name).target,
          content: [
            "---",
            `description: ${source.name}`,
            "alwaysApply: true",
            "---",
            "",
            source.content,
          ].join("\n"),
        })),
      );
    },
    async links() {
      const sources = await listSources();
      return links.flatMap((l) => sources.map((s) => pair(l, s.name)));
    },
  };
}
