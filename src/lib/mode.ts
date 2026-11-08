/**
 * Whether a run may change anything.
 *
 * A dry run follows the same path as a real one and stops at the point of
 * writing, so what it reports is what the real run would have done rather than a
 * second description of it that can drift.
 */
export interface Mode {
  readonly dryRun: boolean
}

export const APPLY: Mode = { dryRun: false }
export const DRY_RUN: Mode = { dryRun: true }

export function modeFrom(dryRun: boolean): Mode {
  return dryRun ? DRY_RUN : APPLY
}
