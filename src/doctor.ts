import { lstat, readlink } from "node:fs/promises";
import { loadAdapters, stubs } from "./adapters/index";

let failures = 0;

for (const adapter of await loadAdapters()) {
  for (const link of await adapter.links()) {
    let state = "MISSING";
    try {
      const st = await lstat(link.dest);
      if (!st.isSymbolicLink()) {
        state = "FOREIGN FILE";
        failures++;
      } else if ((await readlink(link.dest)) !== link.target) {
        state = "WRONG TARGET";
        failures++;
      } else {
        state = "ok";
      }
    } catch {
      failures++;
    }
    console.log(`${adapter.name.padEnd(9)}${state.padEnd(13)}${link.dest}`);
  }
}

for (const name of stubs) {
  console.log(`${name.padEnd(9)}${"stub".padEnd(22)}adapter not implemented`);
}

process.exit(failures > 0 ? 1 : 0);
