import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import {
  HINDSIGHT_LABEL,
  HINDSIGHT_LOG_FILE,
  HINDSIGHT_LOGS_DIR,
  HINDSIGHT_PLIST_REPO,
  HINDSIGHT_WRAPPER,
  REPO,
} from "../../settings/paths";

function plistXml({
  wrapper,
  logFile,
  home,
}: {
  wrapper: string;
  logFile: string;
  home: string;
}): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${HINDSIGHT_LABEL}</string>
  <key>ProgramArguments</key><array><string>${wrapper}</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${logFile}</string>
  <key>StandardErrorPath</key><string>${logFile}</string>
  <key>WorkingDirectory</key><string>${REPO}</string>
  <key>EnvironmentVariables</key><dict>
    <key>HOME</key><string>${home}</string>
    <key>PATH</key><string>${home}/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
</dict>
</plist>
`;
}

export async function render(): Promise<void> {
  const xml = plistXml({
    wrapper: HINDSIGHT_WRAPPER,
    logFile: HINDSIGHT_LOG_FILE,
    home: homedir(),
  });
  await mkdir(HINDSIGHT_LOGS_DIR, { recursive: true });
  await writeFile(HINDSIGHT_PLIST_REPO, xml);
  console.log(`rendered     hindsight/${HINDSIGHT_LABEL}.plist (review, not installed)`);
}
