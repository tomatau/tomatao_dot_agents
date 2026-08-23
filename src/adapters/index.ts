import { loadAdaptersConfig } from "../settings/config";
import type { HarnessAdapter } from "./types";
import { aggregateAdapter } from "./aggregate";
import { cursor } from "./cursor";

export async function loadAdapters(): Promise<HarnessAdapter[]> {
  const config = await loadAdaptersConfig();
  return [
    aggregateAdapter({ name: "claude", links: config.claude }),
    aggregateAdapter({ name: "codex", links: config.codex }),
    aggregateAdapter({ name: "opencode", links: config.opencode }),
    cursor(config.cursor),
  ];
}
