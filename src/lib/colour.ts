/**
 * ANSI colour, off unless the output is a terminal a human is looking at.
 * `NO_COLOR` (any value) disables it; `FORCE_COLOR` turns it back on so piped
 * runs and CI can still be read in colour when asked.
 */
const forced =
  process.env.FORCE_COLOR !== undefined && process.env.FORCE_COLOR !== '0'
const refused =
  process.env.NO_COLOR !== undefined || process.env.TERM === 'dumb'

export const colourEnabled =
  forced || (!refused && Boolean(process.stdout.isTTY))

function style(open: number, close: number): (text: string) => string {
  return text => (colourEnabled ? `\x1b[${open}m${text}\x1b[${close}m` : text)
}

export const bold = style(1, 22)
export const dim = style(2, 22)
export const red = style(31, 39)
export const green = style(32, 39)
export const yellow = style(33, 39)
export const cyan = style(36, 39)

/** Usable width for framing, kept narrow enough to read on a wide terminal. */
export function terminalWidth(max = 76): number {
  return Math.min(process.stdout.columns || max, max)
}
