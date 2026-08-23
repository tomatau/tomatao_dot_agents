export interface Row {
  name?: string;
  state: string;
  detail: string;
}

export interface Section {
  title: string;
  rows: Row[];
  failures: number;
  informational?: boolean;
}

const NAME_WIDTH = 9;
const STATE_WIDTH = 17;

export function printSection({ title, rows }: Section): void {
  console.log(`\n${title}`);
  for (const row of rows) {
    console.log(
      `${(row.name ?? "").padEnd(NAME_WIDTH)}${row.state.padEnd(STATE_WIDTH)}${row.detail}`,
    );
  }
}

export interface Tally {
  ok: number;
  failures: number;
}

export function tally(sections: Section[]): Tally {
  let ok = 0;
  let failures = 0;
  for (const s of sections) {
    if (s.informational) continue;
    ok += s.rows.length - s.failures;
    failures += s.failures;
  }
  return { ok, failures };
}
