import { loadConfig } from "../lib/config";
import type { HarnessAdapter } from "./types";
import { claude } from "./claude";
import { codex } from "./codex";
import { cursor } from "./cursor";
import { opencode } from "./opencode";

export const stubs = ["warp", "zed", "hermes"];

export async function loadAdapters(): Promise<HarnessAdapter[]> {
  const config = await loadConfig();
  return [
    claude(config.claude),
    codex(config.codex),
    opencode(config.opencode),
    cursor(config.cursor),
  ];
}
