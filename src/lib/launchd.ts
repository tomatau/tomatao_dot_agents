import { homedir } from "node:os";

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
    const { hindsightInstalledPlist } = await import("../settings/paths");
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

  const apiUrl = process.env.HINDSIGHT_API_URL ?? "http://127.0.0.1:8888";

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
