import { lstat, mkdir, readlink, symlink, unlink } from "node:fs/promises";
import { dirname } from "node:path";

export interface Link {
  dest: string;
  target: string;
}

export type LinkState = "ok" | "missing" | "wrong-target" | "foreign-file";

export type EnforceResult = "ok" | "linked" | "retargeted";

export interface LinkCheck {
  link: Link;
  state: LinkState;
}

export interface EnforcedLink {
  link: Link;
  result: EnforceResult;
}

export type LinkObservation =
  | { kind: "missing" }
  | { kind: "file" }
  | { kind: "symlink"; target: string };

export function classifyLink({
  expectedTarget,
  observed,
}: {
  expectedTarget: string;
  observed: LinkObservation;
}): LinkState {
  if (observed.kind === "missing") return "missing";
  if (observed.kind === "file") return "foreign-file";
  return observed.target === expectedTarget ? "ok" : "wrong-target";
}

async function observeLink(link: Link): Promise<LinkObservation> {
  try {
    const st = await lstat(link.dest);
    if (!st.isSymbolicLink()) return { kind: "file" };
    return { kind: "symlink", target: await readlink(link.dest) };
  } catch {
    return { kind: "missing" };
  }
}

export async function inspectLinks({ links }: { links: Link[] }): Promise<LinkObservation[]> {
  return Promise.all(links.map(observeLink));
}

export async function checkLinks({ links }: { links: Link[] }): Promise<LinkCheck[]> {
  const observations = await inspectLinks({ links });
  return links.map((link, i) => ({
    link,
    state: classifyLink({ expectedTarget: link.target, observed: observations[i] }),
  }));
}

async function ensureOne(link: Link): Promise<EnforceResult> {
  await mkdir(dirname(link.dest), { recursive: true });
  const state = classifyLink({
    expectedTarget: link.target,
    observed: await observeLink(link),
  });
  if (state === "ok") return "ok";
  if (state === "foreign-file") throw new Error(`refusing to replace non-symlink ${link.dest}`);
  if (state === "wrong-target") await unlink(link.dest);
  await symlink(link.target, link.dest);
  return state === "missing" ? "linked" : "retargeted";
}

export async function ensureLinks({ links }: { links: Link[] }): Promise<EnforcedLink[]> {
  const results = await Promise.all(links.map(ensureOne));
  return links.map((link, i) => ({ link, result: results[i] }));
}
