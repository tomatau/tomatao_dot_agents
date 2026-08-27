import { join } from "node:path";
import { status } from "../lib/launchd";
import { HINDSIGHT_LABEL, HINDSIGHT_LOG_FILE, HINDSIGHT_PLIST_REPO } from "../settings/paths";
import { install, render, restart, start, stop, uninstall } from "../domains/hindsight";

const cmd = process.argv[2] ?? "help";
switch (cmd) {
  case "render":
    await render();
    break;
  case "install":
    await install();
    break;
  case "uninstall":
    await uninstall();
    break;
  case "start":
    await start();
    break;
  case "stop":
    await stop();
    break;
  case "restart":
    await restart();
    break;
  case "status":
    await status(HINDSIGHT_LABEL, HINDSIGHT_PLIST_REPO);
    break;
  case "logs":
    await Bun.$`tail -n 200 -F ${join(HINDSIGHT_LOG_FILE)}`.nothrow();
    break;
  default:
    console.log(`usage: hindsight <render|install|uninstall|start|stop|restart|status|logs>`);
    process.exit(1);
}
