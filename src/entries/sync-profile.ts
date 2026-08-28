import { syncProfile } from "../domains/vault-sync/sync";

const dryRun = process.argv.includes("--dry-run");

try {
  await syncProfile({ dryRun });
  process.exit(0);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
