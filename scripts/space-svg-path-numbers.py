#!/usr/bin/env python3
"""Separate SVG path numbers that AppInspect mistakes for public IP addresses.

SVG path data lets numbers run together without a delimiter, because a second
decimal point always starts a new number: `3.57.65.44` is the three values
3.57, 0.65 and 0.44. AppInspect's IPv4 regex reads that as an address and
rejects the package on Splunkbase, even though no address is present — the
runs come from icon artwork inside third-party dependencies.

Inserting a space at a boundary the parser already recognised is semantically
inert, so this rewrites `3.57.65.44` to `3.57 .65.44` and the pattern no
longer looks like an address.

The rewrite is confined to the contents of `d="..."` / `d:"..."` attributes.
Touching bare digit runs anywhere in a bundle would risk corrupting real
version strings.

Usage: space-svg-path-numbers.py <dir>
"""

import pathlib
import re
import sys

# Four 1-3 digit groups, not glued to a longer run of digits or dots.
IPV4_SHAPED = re.compile(r"(?<![\d.])(\d{1,3}\.\d{1,3})(\.\d{1,3}\.\d{1,3})(?![\d.])")

# The `d` attribute in JSX object form (d:"…") or markup form (d="…").
PATH_ATTR = re.compile(r"""(\bd[:=]\s*")([^"]*)(")""")


def despace_free(path_data: str) -> tuple[str, int]:
    """Insert a space at each boundary the SVG parser already implies."""
    return IPV4_SHAPED.subn(r"\1 \2", path_data)


def process(path: pathlib.Path) -> int:
    text = path.read_text(errors="surrogateescape")
    total = 0

    def repl(match: re.Match) -> str:
        nonlocal total
        fixed, count = despace_free(match.group(2))
        total += count
        return match.group(1) + fixed + match.group(3)

    rewritten = PATH_ATTR.sub(repl, text)
    if total:
        path.write_text(rewritten, errors="surrogateescape")
    return total


def main() -> int:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    root = pathlib.Path(sys.argv[1])

    changed = 0
    for js in sorted(root.rglob("*.js")):
        changed += process(js)

    # Anything still matching is outside path data and needs a human decision,
    # so fail rather than ship a package Splunkbase will reject.
    leftovers = []
    for f in sorted(root.rglob("*")):
        if not f.is_file() or f.suffix not in {".js", ".css", ".html", ".json"}:
            continue
        for m in IPV4_SHAPED.finditer(f.read_text(errors="surrogateescape")):
            leftovers.append(f"{f.relative_to(root)}: {m.group(0)}")

    print(f"Separated {changed} IP-shaped number run(s) in SVG path data")
    if leftovers:
        print("IP-shaped strings remain outside SVG path data:", file=sys.stderr)
        for line in leftovers[:20]:
            print(f"  {line}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
