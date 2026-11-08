import { bold, cyan, dim, terminalWidth } from './colour'

/** One selectable row; `detail` is what it would wire up, shown dimmed. */
export interface Choice {
  label: string
  detail?: string
}

/**
 * How a question is answered. The `Scripted` implementation answers from flags,
 * so one script serves a person at a terminal and a caller that cannot type.
 */
export interface Asker {
  interactive: boolean
  confirm(question: string, fallback: boolean): Promise<boolean>
  text(question: string, hint?: string): Promise<string>
  choose<T extends Choice>(
    question: string,
    options: T[],
    chosen: (option: T) => boolean,
  ): Promise<T[]>
}

/** Collapse a pasted line to something a URL or a path can be. */
function tidy(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, '')
}

function readLine(question: string, hint?: string): Promise<string> {
  const suffix = hint ? ` ${dim(hint)}` : ''
  process.stdout.write(`${question}${suffix} `)
  return new Promise(resolve => {
    process.stdin.resume()
    process.stdin.once('data', chunk => {
      process.stdin.pause()
      resolve(tidy(String(chunk)))
    })
  })
}

/** Answers every question from a list, for a caller that passes flags. */
export class ScriptedAsker implements Asker {
  interactive = false
  constructor(private readonly answers: string[] = []) {}

  async confirm(_question: string, fallback: boolean): Promise<boolean> {
    const next = this.answers.shift()
    if (next === undefined) return fallback
    return /^(y|yes|true)$/i.test(next)
  }

  async text(_question: string): Promise<string> {
    return this.answers.shift() ?? ''
  }

  async choose<T extends Choice>(
    _question: string,
    options: T[],
    chosen: (option: T) => boolean,
  ): Promise<T[]> {
    return options.filter(chosen)
  }
}

/** Rows visible at once; the list scrolls rather than overrunning the terminal. */
const WINDOW = 10

export class TerminalAsker implements Asker {
  interactive = true

  async confirm(question: string, fallback: boolean): Promise<boolean> {
    const answer = await readLine(
      `${question} ${dim(`(${fallback ? 'Y/n' : 'y/N'})`)}`,
    )
    if (!answer) return fallback
    return /^(y|yes)$/i.test(answer)
  }

  async text(question: string, hint?: string): Promise<string> {
    return readLine(question, hint)
  }

  choose<T extends Choice>(
    question: string,
    options: T[],
    chosen: (option: T) => boolean,
  ): Promise<T[]> {
    return new CheckList(question, options, chosen).run()
  }
}

/** A checkbox list: arrows move, space toggles, enter commits. */
class CheckList<T extends Choice> {
  private cursor = 0
  private readonly picked: Set<number>
  private drawn = 0
  private stop: () => void = () => {}

  constructor(
    private readonly question: string,
    private readonly options: T[],
    chosen: (option: T) => boolean,
  ) {
    this.picked = new Set(
      options.flatMap((option, i) => (chosen(option) ? [i] : [])),
    )
  }

  private width(): number {
    return terminalWidth() - 2
  }

  private rule(edge: string): string {
    return `${cyan(edge)}${dim('─'.repeat(this.width()))}${cyan(edge)}`
  }

  private line(text: string): string {
    // A row longer than the frame would break the right edge; trim to fit.
    return `${cyan('│')}${text.slice(0, this.width()).padEnd(this.width())}${cyan('│')}`
  }

  private frame(): string[] {
    const labelWidth = Math.max(...this.options.map(o => o.label.length))
    const first = Math.min(
      Math.max(this.cursor - Math.floor(WINDOW / 2), 0),
      Math.max(this.options.length - WINDOW, 0),
    )
    const rows = this.options.slice(first, first + WINDOW).map((option, i) => {
      const index = first + i
      const here = index === this.cursor
      const mark = this.picked.has(index) ? bold('[x]') : '[ ]'
      const name = here ? bold(option.label) : option.label
      const detail = option.detail ? `  ${dim(option.detail)}` : ''
      return this.line(
        `  ${here ? cyan('▸') : ' '} ${mark} ${name.padEnd(labelWidth)}${detail}`,
      )
    })
    const count = `${this.picked.size}/${this.options.length}`
    return [
      this.rule('┌'),
      ...rows,
      this.line(''),
      this.line(`  ${dim(count)}`),
      this.line(
        `  ${dim('↑/↓ move   space toggle   enter confirm   q cancel')}`,
      ),
      this.rule('└'),
    ]
  }

  private paint(): void {
    const lines = this.frame()
    process.stdout.write(lines.join('\n'))
    this.drawn = lines.length
  }

  private erase(): void {
    if (this.drawn === 0) return
    process.stdout.write(`\x1b[${this.drawn}A\x1b[J`)
    this.drawn = 0
  }

  run(): Promise<T[]> {
    process.stdout.write(`\n${bold(this.question)}\n`)
    this.paint()
    const input = process.stdin
    input.setRawMode?.(true)
    input.resume()
    input.setEncoding('utf8')

    return new Promise(resolve => {
      const finish = (): void => {
        input.setRawMode?.(false)
        input.pause()
        input.off('data', onData)
        this.stop = () => {}
      }
      this.stop = () => {
        finish()
        process.stdout.write('\n')
      }
      const onData = (key: string): void => {
        if (key === '\u0003' || key === 'q') {
          finish()
          process.stdout.write('\n')
          process.exit(130)
        } else if (key === '\r' || key === '\n') {
          if (this.picked.size === 0) return
          const picked = [...this.picked]
            .sort((a, b) => a - b)
            .map(i => this.options[i])
          finish()
          process.stdout.write('\n')
          resolve(picked)
        } else if (key === ' ') {
          if (this.picked.has(this.cursor)) this.picked.delete(this.cursor)
          else this.picked.add(this.cursor)
        } else if (key === '\u001b[A' || key === 'k') {
          this.cursor =
            (this.cursor + this.options.length - 1) % this.options.length
        } else if (key === '\u001b[B' || key === 'j') {
          this.cursor = (this.cursor + 1) % this.options.length
        } else {
          return
        }
        this.erase()
        this.paint()
      }
      input.on('data', onData)
    })
  }
}
