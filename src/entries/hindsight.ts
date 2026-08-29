import { join } from "node:path";
import { status } from "../clients/launchd";
import { HINDSIGHT_LABEL, HINDSIGHT_LOG_FILE, HINDSIGHT_PLIST_REPO } from "../settings/paths";
import { render } from "../domains/hindsight/plist";
import { ensureBanks } from "../domains/hindsight/banks";
import { install, restart, start, stop, uninstall } from "../domains/hindsight/lifecycle";

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
  case "banks": {
    for (const b of await ensureBanks()) console.log(`${b.state.padEnd(10)}${b.id}`);
    break;
  }
  case "logs":
    await Bun.$`tail -n 200 -F ${join(HINDSIGHT_LOG_FILE)}`.nothrow();
    break;
  default:
    console.log(`usage: hindsight <render|install|uninstall|start|stop|restart|status|banks|logs>`);
    process.exit(1);
}
