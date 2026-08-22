import { homedir } from "node:os";
import { join } from "node:path";

export const HOME = homedir();
export const REPO = join(import.meta.dir, "..", "..");
export const PERSONALISATION_DIR = join(REPO, "personalisation");
export const DIST_DIR = join(REPO, "dist");
