#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Check that tests cite the requirements in a project's requirements.md files.

traceability.py, version 1

Copy into a project as .checks/traceability.py and run it from anywhere in the
repository, with `uv run .checks/traceability.py` or `python3`. It needs git
and the standard library only, and takes no arguments.

Canonical copy: ~/.agents/skills/requirements-traceability/checks/traceability.py
Format contract: ~/.agents/skills/requirements-traceability/SKILL.md

Prints one tab-separated finding per line and exits 1 when there are any:
    uncovered  <requirements.md>  <ID>  [surface]   current row no test cites
    unknown    <file:line>        <ID>              citation nothing defines
    ambiguous  <file:line>        <ID>              citation several files define
"""

import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path, PurePosixPath

REQUIREMENTS_FILE = "requirements.md"
CHECKS_DIR = ".checks/"
ID = re.compile(r"[A-Z][A-Z0-9]*-[0-9]+")
SURFACE_DECLARATION = re.compile(r"surface:\s*([A-Za-z0-9_.-]+)")
SEPARATOR_ROW = re.compile(r"^\|[-:| ]+\|$")


@dataclass(frozen=True)
class Requirement:
    file: str
    id: str
    surfaces: tuple[str, ...]
    required: bool

    @property
    def package(self) -> str:
        parent = str(PurePosixPath(self.file).parent)
        return "" if parent == "." else parent


@dataclass(frozen=True)
class Citation:
    file: str
    line: int
    id: str


# Reading requirements


def parse_requirements(file: str, text: str) -> list[Requirement]:
    return [
        requirement
        for section, header, rows in tables(text)
        if "prospective" not in section
        for row in rows
        if (requirement := to_requirement(file, header, row))
    ]


def tables(text: str):
    """Yield (section, header, rows) for each markdown table."""
    section, table = "", []
    for line in text.splitlines() + [""]:
        line = line.strip()
        if line.startswith("|"):
            table.append(cells(line))
            continue
        if table:
            yield section, table[0], [row for row in table[1:] if row]
            table = []
        if line.startswith("#"):
            section = line.lower()


def cells(line: str) -> list[str]:
    if SEPARATOR_ROW.match(line):
        return []
    return [cell.replace("`", "").strip() for cell in line.strip("|").split("|")]


def to_requirement(
    file: str,
    header: list[str],
    row: list[str],
) -> Requirement | None:
    values = dict(zip((name.lower() for name in header), row))
    if not ID.fullmatch(values.get("id", "")):
        return None
    surfaces = tuple(
        s.strip() for s in values.get("surfaces", "").split(",") if s.strip()
    )
    required = values.get("applicability", "current").lower() == "current"
    return Requirement(file, values["id"], surfaces, required)


# Reading tests


def scan(
    file: str,
    text: str,
    prefixes: set[str],
) -> tuple[list[Citation], str | None]:
    citation = re.compile(
        rf"(?<![A-Za-z0-9_-])((?:{'|'.join(prefixes)})-[0-9]+)(?![0-9])"
    )
    citations = [
        Citation(file, number, match)
        for number, line in enumerate(text.splitlines(), start=1)
        for match in citation.findall(line)
    ]
    declared = SURFACE_DECLARATION.search(text)
    return citations, declared and declared.group(1)


# Checking


def normalise(name: str) -> str:
    return re.sub(r"[-_ ]", "", name.lower())


def within(package: str, file: str) -> bool:
    return package == "" or file.startswith(package + "/")


def resolve(
    citation: Citation,
    requirements: list[Requirement],
) -> Requirement | str:
    """Find the requirement a citation refers to, or say why it cannot."""
    candidates = [r for r in requirements if r.id == citation.id]
    enclosing = [r for r in candidates if within(r.package, citation.file)]
    if enclosing:
        return max(enclosing, key=lambda r: len(r.package))
    in_a_package = any(
        r.package and within(r.package, citation.file) for r in requirements
    )
    if in_a_package or not candidates:
        return "unknown"
    return candidates[0] if len(candidates) == 1 else "ambiguous"


def surface_of(file: str, declared: str | None, names: set[str]) -> str:
    """A declared surface wins; otherwise the longest surface name in the path."""
    if declared:
        return normalise(declared)
    path = normalise(file)
    return max((name for name in names if name in path), key=len, default="")


def check(requirements: list[Requirement], tests: dict) -> list[tuple]:
    names_by_file: dict[str, set[str]] = {}
    for r in requirements:
        names_by_file.setdefault(r.file, set()).update(normalise(s) for s in r.surfaces)

    findings, covered = [], set()
    for citations, declared in tests.values():
        for citation in citations:
            target = resolve(citation, requirements)
            if isinstance(target, str):
                findings.append(
                    (target, f"{citation.file}:{citation.line}", citation.id)
                )
                continue
            surface = surface_of(citation.file, declared, names_by_file[target.file])
            covered.update({(target, surface), (target, None)})

    for r in requirements:
        if not r.required:
            continue
        if not r.surfaces and (r, None) not in covered:
            findings.append(("uncovered", r.file, r.id))
        for surface in r.surfaces:
            if (r, normalise(surface)) not in covered:
                findings.append(("uncovered", r.file, r.id, surface))
    return sorted(findings)


# Running


def tracked_files(root: Path) -> list[str]:
    listing = subprocess.run(
        ["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
        cwd=root,
        capture_output=True,
        text=True,
        check=True,
    )
    return [file for file in listing.stdout.split("\0") if (root / file).is_file()]


def read_text(path: Path) -> str | None:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return None


def is_test_candidate(file: str) -> bool:
    name = PurePosixPath(file).name
    return not name.startswith("requirements.") and not file.startswith(CHECKS_DIR)


def main() -> int:
    toplevel = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"],
        capture_output=True,
        text=True,
        check=True,
    )
    root = Path(toplevel.stdout.strip())
    files = tracked_files(root)

    requirements = [
        requirement
        for file in files
        if PurePosixPath(file).name == REQUIREMENTS_FILE
        for requirement in parse_requirements(
            file, (root / file).read_text(encoding="utf-8")
        )
    ]
    prefixes = {r.id.rsplit("-", 1)[0] for r in requirements}
    tests = {}
    if prefixes:
        for file in filter(is_test_candidate, files):
            text = read_text(root / file)
            if text is not None:
                tests[file] = scan(file, text, prefixes)

    findings = check(requirements, tests)
    for finding in findings:
        print("\t".join(finding))
    summary = (
        f"{len(findings)} finding(s)"
        if findings
        else f"ok ({len(requirements)} requirements)"
    )
    print(f"traceability: {summary}", file=sys.stderr)
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
