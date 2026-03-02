#!/usr/bin/env python3
from __future__ import annotations

import pathlib
import re
import sys


ACRONYMS = {
    "SDE": "Strategic Decision Engine",
    "PDP": "Policy Decision Point",
    "PEP": "Policy Enforcement Point",
    "SKU": "Stock Keeping Unit",
    "CLI": "Command Line Interface",
    "WSL": "Windows Subsystem for Linux",
    "FQDN": "Fully Qualified Domain Name",
    "JSONL": "JSON Lines",
    "SLA": "Service Level Agreement",
    "MTTD": "Mean Time To Detect",
    "MTTR": "Mean Time To Resolve",
    "CI": "Continuous Integration",
    "SIEM": "Security Information and Event Management",
}


def has_glossary_link(text: str) -> bool:
    top = "\n".join(text.splitlines()[:40])
    return "GLOSSARY.md" in top


def acronym_is_used(text: str, acronym: str) -> bool:
    return re.search(rf"\b{re.escape(acronym)}\b", text) is not None


def expansion_present(text: str, expansion: str) -> bool:
    return expansion in text


def lint_file(path: pathlib.Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    errors: list[str] = []

    if not has_glossary_link(text):
        errors.append(f"{path}: missing glossary link near top of file")

    used = [a for a in ACRONYMS if acronym_is_used(text, a)]
    if used and "## Acronym Expansions" not in text:
        errors.append(f"{path}: acronyms used but '## Acronym Expansions' section missing")

    for acronym in used:
        expansion = ACRONYMS[acronym]
        if not expansion_present(text, expansion):
            errors.append(f"{path}: acronym '{acronym}' used but expansion '{expansion}' missing")

    return errors


def main() -> int:
    root = pathlib.Path(__file__).resolve().parents[1]
    docs = sorted(
        p for p in root.glob("*.md") if p.name.upper() != "GLOSSARY.MD"
    )

    all_errors: list[str] = []
    for doc in docs:
        all_errors.extend(lint_file(doc))

    if all_errors:
        print("Documentation terminology lint failed:")
        for err in all_errors:
            print(f"- {err}")
        return 1

    print("Documentation terminology lint passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
