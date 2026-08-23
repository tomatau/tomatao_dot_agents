import type { HarnessAdapter } from "./types";
import type { AdapterLink } from "../settings/config";
import { aggregate, listSources } from "../domains/personalisation";

// Renders all personalisation sources into one file per configured link.
export function aggregateAdapter({
  name,
  links,
}: {
  name: string;
  links: AdapterLink[];
}): HarnessAdapter {
  return {
    name,
    async render() {
      const content = aggregate(await listSources());
      return links.map((l) => ({ distPath: l.target, content }));
    },
    async links() {
      return links;
    },
  };
}
