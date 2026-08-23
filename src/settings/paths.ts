import { join } from "node:path";

export const REPO = join(import.meta.dir, "..", "..");
export const PERSONALISATION_DIR = join(REPO, "personalisation");
