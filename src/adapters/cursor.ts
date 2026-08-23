import { join } from "node:path";
import type { HarnessAdapter } from "./types";
import type { Link } from "../lib/links";
import type { AdapterLink } from "../settings/config";
import { stripTrailingSlash } from "../lib/path";
import { listSources } from "../domains/personalisation";

export function cursor(links: AdapterLink[]): HarnessAdapter {
  const pair = (link: AdapterLink, stem: string): Link => ({
    dest: join(stripTrailingSlash(link.dest), `${stem}.mdc`),
    target: join(stripTrailingSlash(link.target), `${stem}.mdc`),
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
