"""Audit or regenerate the native design CSS using Python 3.10+ stdlib only.

From the project root:
    python scripts/design-css.py --verify-only  # default; never writes files
    python scripts/design-css.py --write        # explicitly regenerate CSS

The only inputs are temp/*.html. No browser or external dependencies are used.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
from collections import OrderedDict
from dataclasses import dataclass, field
from pathlib import Path
from functools import lru_cache
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "temp"
DEST = ROOT / "src/styles"


def strip_comments(text: str) -> str:
    output = []
    quote = None
    index = 0
    while index < len(text):
        char = text[index]
        if quote:
            output.append(char)
            if char == "\\" and index + 1 < len(text):
                index += 1
                output.append(text[index])
            elif char == quote:
                quote = None
        elif char in "\"'":
            quote = char
            output.append(char)
        elif text.startswith("/*", index):
            end = text.find("*/", index + 2)
            if end < 0:
                raise ValueError("Unclosed CSS comment")
            index = end + 1
            output.append(" ")
        else:
            output.append(char)
        index += 1
    return "".join(output)


def compact(text: str) -> str:
    """Collapse insignificant runs of whitespace, preserving string literals."""
    output = []
    quote = None
    pending_space = False
    index = 0
    while index < len(text):
        char = text[index]
        if quote:
            output.append(char)
            if char == "\\" and index + 1 < len(text):
                index += 1
                output.append(text[index])
            elif char == quote:
                quote = None
        elif char in "\"'":
            if pending_space and output:
                output.append(" ")
            pending_space = False
            quote = char
            output.append(char)
        elif char.isspace():
            pending_space = True
        else:
            if pending_space and output:
                output.append(" ")
            pending_space = False
            output.append(char)
        index += 1
    return "".join(output).strip()


@dataclass(frozen=True)
class Rule:
    head: str
    body: str


def parse_rules(text: str) -> list[Rule]:
    text = strip_comments(text)
    rules = []
    start = 0
    depth = 0
    quote = None
    open_index = None
    paren = 0
    index = 0
    while index < len(text):
        char = text[index]
        if quote:
            if char == "\\":
                index += 1
            elif char == quote:
                quote = None
        elif char in "\"'":
            quote = char
        elif char == "(":
            paren += 1
        elif char == ")":
            paren -= 1
        elif char == "{" and paren == 0:
            if depth == 0:
                open_index = index
            depth += 1
        elif char == "}" and paren == 0:
            depth -= 1
            if depth < 0:
                raise ValueError("Unbalanced CSS closing brace")
            if depth == 0:
                assert open_index is not None
                rules.append(Rule(compact(text[start:open_index]), compact(text[open_index + 1:index])))
                start = index + 1
        index += 1
    if depth or quote or text[start:].strip():
        raise ValueError("Unclosed or unsupported CSS syntax: " + text[start:start + 100])
    return rules


def split_selectors(text: str) -> list[str]:
    selectors = []
    start = 0
    quote = None
    nesting = 0
    for index, char in enumerate(text):
        if quote:
            if char == quote and (index == 0 or text[index - 1] != "\\"):
                quote = None
        elif char in "\"'":
            quote = char
        elif char in "([":
            nesting += 1
        elif char in ")]":
            nesting -= 1
        elif char == "," and nesting == 0:
            selectors.append(text[start:index].strip())
            start = index + 1
    selectors.append(text[start:].strip())
    return selectors


@lru_cache(maxsize=None)
def source_css(name: str) -> str:
    html = (SOURCE / (name + ".html")).read_text(encoding="utf-8")
    styles = re.findall(r"<style\b[^>]*>(.*?)</style\s*>", html, flags=re.S | re.I)
    if not styles:
        raise ValueError(f"No inline <style> found in temp/{name}.html")
    return "\n".join(styles)


def source_rules(name: str) -> list[Rule]:
    rules = parse_rules(source_css(name))
    # html's two stable document-level rules are defined once in globals.css.
    # Dialog owns body scrolling; body-level visual declarations target the page.
    return [rule for rule in rules if rule.head not in (":root", "html", "body.modal-open")]


@dataclass
class Trie:
    rule: Rule | None = None
    pages: list[str] = field(default_factory=list)
    children: OrderedDict[Rule, "Trie"] = field(default_factory=OrderedDict)


def screen_aliases(page: str) -> list[str]:
    if page == "index":
        return ["index", "home"]
    if page == "prototype-map":
        return ["prototype-map", "overview"]
    return [page]


def scope_for(pages: list[str]) -> str:
    screens = [alias for page in pages for alias in screen_aliases(page)]
    return ":where(" + ",".join("[data-screen='" + page + "']" for page in screens) + ")"


def scoped_rule(rule: Rule, scope: str) -> str:
    if rule.head.startswith(("@media", "@supports", "@container")):
        return rule.head + " {\n" + "\n".join(scoped_rule(child, scope) for child in parse_rules(rule.body)) + "\n}"
    if rule.head.startswith("@"):
        raise ValueError("Review at-rule before scoping: " + rule.head)
    selectors = []
    for selector in split_selectors(rule.head):
        if selector == "body":
            selectors.append(scope)
        elif selector.startswith("body") and re.match(r"body(?:\.|\[|:|\s|>)", selector):
            selectors.append(scope + selector[4:])
        elif selector == "html":
            continue
        else:
            selectors.append(scope + " " + selector)
    return ",\n".join(selectors) + " {" + rule.body + "}"


def count_rules(rules: list[Rule]) -> int:
    return sum(1 + (count_rules(parse_rules(rule.body)) if rule.head.startswith("@") else 0) for rule in rules)


def token_values(body: str) -> OrderedDict[str, str]:
    return OrderedDict((key, value.strip()) for key, value in re.findall(r"(--[\w-]+)\s*:\s*([^;]+)(?:;|$)", body))


def comparable_value(value: str) -> str:
    value = re.sub(r"\s+", "", value)
    value = re.sub(r"(?<!\d)0\.(\d)", r".\1", value)
    value = re.sub(r"#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])(?![0-9a-fA-F])", lambda match: "#" + "".join(char * 2 for char in match.groups()), value)
    return value


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--verify-only", action="store_true", help="verify source order, tokens and stored CSS; this is the default")
    mode.add_argument("--write", action="store_true", help="explicitly overwrite src/styles/tokens.css and reference.css from temp/*.html")
    args = parser.parse_args()
    verify_only = not args.write
    if not (SOURCE / "index.html").is_file():
        parser.error("temp/index.html is required; run this tool from a project containing the native references")
    names = sorted(path.stem for path in SOURCE.glob("*.html"))
    root = Trie()
    inputs = {}
    for name in names:
        rules = source_rules(name)
        inputs[name] = rules
        node = root
        for rule in rules:
            node = node.children.setdefault(rule, Trie(rule))
            node.pages.append(name)

    emitted: dict[str, list[Rule]] = {name: [] for name in names}
    output = [
        "/* Migrated from temp/*.html. Source order is preserved per data-screen.",
        " * Shared CSS prefixes are emitted once. Page scopes use :where() so", 
        " * they add no selector specificity. Tokens live in tokens.css.",
        " * Reuse the React components before adding or changing selectors. */",
    ]
    emitted_count = 0
    group_prefixes = {}

    def walk(node: Trie) -> None:
        nonlocal emitted_count
        for child in node.children.values():
            assert child.rule is not None
            pages = child.pages
            output.append(scoped_rule(child.rule, scope_for(pages)))
            emitted_count += count_rules([child.rule])
            for name in pages:
                emitted[name].append(child.rule)
            group_prefixes[tuple(pages)] = group_prefixes.get(tuple(pages), 0) + 1
            walk(child)

    walk(root)
    for name in names:
        assert emitted[name] == inputs[name], f"Cascade order changed for {name}"

    original_index_rules = parse_rules(source_css("index"))
    root_rule = next(rule for rule in original_index_rules if rule.head == ":root")
    tokens = token_values(root_rule.body)
    assert len(tokens) == 56
    token_text = "/* Exact shared values from the authorized native HTML reference. */\n:root {\n" + "\n".join("  " + key + ": " + value.strip() + ";" for key, value in tokens.items()) + "\n}\n"
    token_overrides = {}
    for name in names:
        page_root = next(rule for rule in parse_rules(source_css(name)) if rule.head == ":root")
        page_values = token_values(page_root.body)
        overrides = OrderedDict((key, value) for key, value in page_values.items() if comparable_value(tokens.get(key, "")) != comparable_value(value))
        if overrides:
            token_overrides[name] = overrides
            token_text += "\n/* Native page-level differences are intentional. */\n" + scope_for([name]) + " {\n" + "\n".join("  " + key + ": " + value + ";" for key, value in overrides.items()) + "\n}\n"
        effective = {**tokens, **overrides}
        assert all(comparable_value(effective[key]) == comparable_value(value) for key, value in page_values.items()), "Token drift in " + name
    reference_text = "\n".join(output) + "\n"
    parse_rules(reference_text)  # verifies the generated nesting and delimiters
    assert "dangerouslySetInnerHTML" not in reference_text
    assert reference_text.count("--bg:") == 0
    if verify_only:
        assert (DEST / "tokens.css").read_text(encoding="utf-8") == token_text, "Stored tokens.css differs from the verified extraction"
        assert (DEST / "reference.css").read_text(encoding="utf-8") == reference_text, "Stored reference.css differs from the verified extraction"
    else:
        DEST.mkdir(parents=True, exist_ok=True)
        (DEST / "tokens.css").write_text(token_text, encoding="utf-8", newline="\n")
        (DEST / "reference.css").write_text(reference_text, encoding="utf-8", newline="\n")

    raw_bytes = sum(len(source_css(name).encode("utf-8")) for name in names)
    original_rule_count = sum(count_rules(rules) for rules in inputs.values())
    report = {
        "pages": len(names),
        "tokens": len(tokens),
        "source_css_bytes": raw_bytes,
        "reference_css_bytes": len(reference_text.encode()),
        "tokens_css_bytes": len(token_text.encode()),
        "generated_gzip_bytes": len(gzip.compress((token_text + reference_text).encode())),
        "source_rules_without_global_tokens": original_rule_count,
        "deduplicated_rules": emitted_count,
        "duplicate_rules_removed": original_rule_count - emitted_count,
        "source_order_verified_pages": len(names),
        "page_token_overrides": token_overrides,
        "mode": "verify-only" if verify_only else "generate",
        "stored_css_matches_extraction": True if verify_only else None,
        "source_css_sha256": {name: hashlib.sha256(source_css(name).encode("utf-8")).hexdigest() for name in names},
        "scope_contract": {name: screen_aliases(name) for name in names},
        "shared_prefix_groups": [{"pages": list(pages), "top_level_rules": count} for pages, count in group_prefixes.items() if len(pages) > 1],
    }
    print(json.dumps({key: value for key, value in report.items() if key not in ('source_css_sha256', 'scope_contract', 'shared_prefix_groups')}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
