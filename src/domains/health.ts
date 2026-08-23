import { loadAdapters } from "../adapters/index";
import { checkFreshness } from "../adapters/freshness";
import { loadSkillsConfig } from "../settings/config";
import { SKILLS_DIR, displayPath } from "../settings/paths";
import { checkLinks } from "../lib/links";
import type { Row, Section } from "../lib/report";
import { inspectSources } from "./personalisation";
import { inspectSkills, listSkills, planSkillLinks } from "./skills";

const PASS_STATES = new Set(["ok", "fresh"]);

// Doctor must report on broken wiring, never crash because of it.
async function section(title: string, collect: () => Promise<Row[]>): Promise<Section> {
  try {
    const rows = await collect();
    return { title, rows, failures: rows.filter((r) => !PASS_STATES.has(r.state)).length };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { title, rows: [{ state: "error", detail }], failures: 1 };
  }
}

async function personalisationSourceRows(): Promise<Row[]> {
  return (await inspectSources()).map((c) => ({ state: c.state, detail: c.path }));
}

async function skillSourceRows(): Promise<Row[]> {
  return (await inspectSkills()).map((c) => ({ state: c.state, detail: c.path }));
}

async function renderRows(): Promise<Row[]> {
  const rows: Row[] = [];
  for (const adapter of await loadAdapters()) {
    for (const check of await checkFreshness(adapter)) {
      rows.push({ name: check.name, state: check.state, detail: check.distPath });
    }
  }
  return rows;
}

async function personalisationLinkRows(): Promise<Row[]> {
  const rows: Row[] = [];
  for (const adapter of await loadAdapters()) {
    for (const check of await checkLinks({ links: await adapter.links() })) {
      rows.push({ name: adapter.name, state: check.state, detail: check.link.dest });
    }
  }
  return rows;
}

async function skillLinkRows(): Promise<Row[]> {
  const plan = planSkillLinks({
    config: (await loadSkillsConfig()).links,
    skills: await listSkills(),
  });
  const rows: Row[] = [];
  for (const [name, links] of Object.entries(plan)) {
    for (const check of await checkLinks({ links })) {
      rows.push({ name, state: check.state, detail: check.link.dest });
    }
  }
  return rows;
}

function nativeSection(harnesses: string[]): Section {
  return {
    title: "native skills",
    rows: harnesses.map((name) => ({
      name,
      state: "native",
      detail: `${displayPath(SKILLS_DIR)} (discovered directly)`,
    })),
    failures: 0,
    informational: true,
  };
}

export async function collectSections(): Promise<Section[]> {
  return (
    [
      await section("personalisation sources", personalisationSourceRows),
      await section("skill sources", skillSourceRows),
      await section("renders (dist vs fresh render)", renderRows),
      await section("personalisation links", personalisationLinkRows),
      await section("skill links", skillLinkRows),
      nativeSection((await loadSkillsConfig()).native),
    ]
      // drop sections with nothing to say
      .filter((s) => s.informational || s.rows.length > 0)
  );
}
