import { describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

const SCRIPT = join(
  import.meta.dir,
  '../../skills/requirements-traceability/checks/traceability.py',
)
const PASSED = { exitCode: 0, findings: [] }

type Files = Record<string, string>

function table(columns: string[], rows: string[][]): string {
  const line = (cells: string[]) => `| ${cells.join(' | ')} |`
  return [
    line(columns),
    line(columns.map(() => '---')),
    ...rows.map(line),
  ].join('\n')
}

function requirements(rows: string[][]): string {
  return `## Requirements\n\n${table(['ID', 'Requirement', 'Applicability'], rows)}\n`
}

function surfacedRequirements(rows: string[][]): string {
  return `## Requirements\n\n${table(['ID', 'Requirement', 'Surfaces'], rows)}\n`
}

async function runCheck(files: Files) {
  const root = await mkdtemp(join(tmpdir(), 'traceability-'))
  try {
    Bun.spawnSync(['git', 'init', '-q'], { cwd: root })
    for (const [path, content] of Object.entries(files)) {
      await mkdir(dirname(join(root, path)), { recursive: true })
      await writeFile(join(root, path), content)
    }
    const run = Bun.spawnSync(['uv', 'run', '--quiet', '--script', SCRIPT], {
      cwd: root,
    })
    const findings = run.stdout.toString().split('\n').filter(Boolean)
    return { exitCode: run.exitCode, findings }
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

const fullyCitedRequirement = {
  'requirements.md': requirements([['REQ-001', 'Renders', 'Current']]),
  'app.test.ts': "test('REQ-001 renders')",
}

const uncitedRequirement = {
  'requirements.md': requirements([['REQ-001', 'Renders', 'Current']]),
}

const uncitedPotentialRequirement = {
  'requirements.md': requirements([['REQ-001', 'Renders', 'Potential']]),
}

const prospectiveRowWithId = {
  'requirements.md': `## Prospective\n\n${table(['ID', 'Requirement'], [['REQ-001', 'Renders']])}\n`,
}

const citationOfUndefinedId = {
  ...fullyCitedRequirement,
  'app.test.ts': "test('REQ-001 renders')\ntest('REQ-002 does not exist')",
}

const unrelatedHyphenatedToken = {
  ...fullyCitedRequirement,
  'hash.ts': "const algorithm = 'SHA-256'",
}

const componentAndHookRequirement = {
  'button/requirements.md': surfacedRequirements([
    ['REQ-001', 'Sets pressed state', '`Button`, `useButton`'],
  ]),
}

const citedOnComponentOnly = {
  ...componentAndHookRequirement,
  'button/spec/button.cy.tsx': "it('REQ-001 sets pressed state')",
}

const citedOnHookOnly = {
  ...componentAndHookRequirement,
  'button/src/use-button.test.tsx': "test('REQ-001 sets pressed state')",
}

const citedFromFileDeclaringComponent = {
  ...componentAndHookRequirement,
  'button/src/use-button.test.tsx':
    "// surface: Button\ntest('REQ-001 sets pressed state')",
}

const sameIdInTwoPackages = {
  'a/requirements.md': requirements([['REQ-001', 'Renders', 'Current']]),
  'b/requirements.md': requirements([['REQ-001', 'Renders', 'Current']]),
}

const citedInOnePackage = {
  ...sameIdInTwoPackages,
  'a/app.test.ts': "test('REQ-001 renders')",
}

const citedOutsideBothPackages = {
  ...sameIdInTwoPackages,
  'smoke.test.ts': "test('REQ-001 renders')",
}

const citedFromPackageNotDefiningId = {
  'a/requirements.md': requirements([['REQ-001', 'Renders', 'Current']]),
  'b/requirements.md': requirements([['REQ-002', 'Renders', 'Potential']]),
  'a/app.test.ts': "test('REQ-001 renders')\ntest('REQ-002 renders')",
}

const systemTestInWorkflow = {
  'cli/requirements.md': `## System tests\n\n${table(['ID', 'System test'], [['SYS-001', 'Installs']])}\n`,
  '.github/workflows/smoke.yml': 'name: SYS-001 installs the published CLI',
}

describe('traceability check', () => {
  const cases: [string, Files, { exitCode: number; findings: string[] }][] = [
    ['passes when the project has no requirements', {}, PASSED],
    [
      'passes when a test cites each current requirement',
      fullyCitedRequirement,
      PASSED,
    ],
    [
      'reports a current requirement no test cites',
      uncitedRequirement,
      { exitCode: 1, findings: ['uncovered\trequirements.md\tREQ-001'] },
    ],
    [
      'ignores requirements that are not current',
      uncitedPotentialRequirement,
      PASSED,
    ],
    ['ignores rows in the prospective section', prospectiveRowWithId, PASSED],
    [
      'reports a citation of an undefined ID',
      citationOfUndefinedId,
      { exitCode: 1, findings: ['unknown\tapp.test.ts:2\tREQ-002'] },
    ],
    [
      'ignores tokens without a requirement prefix',
      unrelatedHyphenatedToken,
      PASSED,
    ],
    [
      'reports each surface a requirement has no citing test on',
      citedOnComponentOnly,
      {
        exitCode: 1,
        findings: ['uncovered\tbutton/requirements.md\tREQ-001\tuseButton'],
      },
    ],
    [
      'infers the most specific surface from the path',
      citedOnHookOnly,
      {
        exitCode: 1,
        findings: ['uncovered\tbutton/requirements.md\tREQ-001\tButton'],
      },
    ],
    [
      'prefers a declared surface over the path',
      citedFromFileDeclaringComponent,
      {
        exitCode: 1,
        findings: ['uncovered\tbutton/requirements.md\tREQ-001\tuseButton'],
      },
    ],
    [
      'resolves an ID to the nearest requirements file',
      citedInOnePackage,
      { exitCode: 1, findings: ['uncovered\tb/requirements.md\tREQ-001'] },
    ],
    [
      "reports an ID that the citing file's package does not define",
      citedFromPackageNotDefiningId,
      { exitCode: 1, findings: ['unknown\ta/app.test.ts:2\tREQ-002'] },
    ],
    [
      'resolves an ID that one requirements file defines, from outside every package',
      systemTestInWorkflow,
      PASSED,
    ],
    [
      'reports an ID that several unrelated requirements files define',
      citedOutsideBothPackages,
      {
        exitCode: 1,
        findings: [
          'ambiguous\tsmoke.test.ts:1\tREQ-001',
          'uncovered\ta/requirements.md\tREQ-001',
          'uncovered\tb/requirements.md\tREQ-001',
        ],
      },
    ],
  ]

  test.each(cases)('%s', async (_, files, expected) => {
    // Act
    const result = await runCheck(files)

    // Assert
    expect(result).toEqual(expected)
  })
})
