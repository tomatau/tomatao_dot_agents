import { homedir } from "node:os";
import { loadHindsightConfig } from "../settings/config";
import { hindsightApiUrl, hindsightInstalledPlist } from "../settings/paths";

export async function bootout(label: string): Promise<void> {
  const uid = (await Bun.$`id -u`.text()).trim();
  await Bun.$`launchctl bootout gui/${uid}/${label}`.quiet().nothrow();
}

export async function bootstrap(label: string, plist: string): Promise<void> {
  const uid = (await Bun.$`id -u`.text()).trim();
  const res = await Bun.$`launchctl bootstrap gui/${uid} ${plist}`.quiet().nothrow();
  if (res.exitCode !== 0) {
    console.error(res.stderr.toString().trim());
    process.exit(res.exitCode);
  }
}

export async function print(label: string): Promise<void> {
  const uid = (await Bun.$`id -u`.text()).trim();
  const res = await Bun.$`launchctl print gui/${uid}/${label}`.nothrow();
  process.exit(res.exitCode);
}

export async function status(label: string, plist: string): Promise<void> {
  const uid = (await Bun.$`id -u`.text()).trim();
  const res = await Bun.$`launchctl print gui/${uid}/${label}`.quiet().nothrow();
  const prettyPlist = plist.replace(homedir(), "~");
  if (res.exitCode !== 0) {
    const installed = await Bun.file(hindsightInstalledPlist()).exists();
    if (installed) {
      console.log(`${label}: stopped`);
      console.log(`plist:  ${prettyPlist}`);
      return;
    }
    console.log(`${label}: not installed (run \`just hindsight install\`)`);
    process.exit(1);
  }
  const out = res.stdout.toString();
  const state = out.match(/state = (\w+)/)?.[1] ?? "unknown";
  const pid = out.match(/pid = (\d+)/)?.[1];
  const exitCode = out.match(/last exit code = ([^\n]+)/)?.[1]?.trim();
  const runs = out.match(/runs = (\d+)/)?.[1];

  const apiUrl = hindsightApiUrl((await loadHindsightConfig()).url);

  const isRunning = state === "running";
  console.log(
    `${label}: ${isRunning ? `running${pid ? ` (pid ${pid})` : ""}` : `stopped (${state})`}`,
  );
  console.log(`plist:  ${prettyPlist}`);
  if (isRunning) {
    const health = await Bun.$`hindsight health`.quiet().nothrow();
    const healthOut = health.stdout.toString() + health.stderr.toString();
    const healthLine =
      healthOut.match(/Status:\s*(\w+)/)?.[1] ??
      (health.exitCode === 0 ? "healthy" : "unreachable");
    const dbLine = healthOut.match(/Database:\s*(\w+)/)?.[1];
    console.log(
      `health: ${healthLine.toLowerCase()}${dbLine ? ` (db ${dbLine.toLowerCase()})` : ""} @ ${apiUrl}`,
    );
  } else if (exitCode && exitCode !== "(never exited)") {
    console.log(`exit:   ${exitCode}${runs ? ` (runs ${runs})` : ""}`);
  }
}

export function launchdHome(): string {
  return homedir();
}
