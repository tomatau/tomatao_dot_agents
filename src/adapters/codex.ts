import type { HarnessAdapter } from "./types";
import type { AdapterLink } from "../lib/config";
import { aggregate, listSources } from "../lib/sources";

export function codex(links: AdapterLink[]): HarnessAdapter {
  return {
    name: "codex",
    async render() {
      const content = aggregate(await listSources());
      return links.map((l) => ({ distPath: l.target, content }));
    },
    links() {
      return links;
    },
  };
}
