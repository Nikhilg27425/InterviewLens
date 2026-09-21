"""
Code similarity analysis engine.

Three complementary metrics are computed and combined:

1. structural_score  — AST-level comparison (Python only; falls back to token score for other langs)
   Extracts the abstract syntax tree, normalises identifier names (rename all vars to v0, v1…),
   then compares the normalised AST dumps with SequenceMatcher.

2. token_score       — Token-sequence similarity using difflib on the tokenised source.
   More resistant to whitespace/comment changes than raw text.

3. literal_score     — Raw character-level SequenceMatcher ratio.
   Fast, catches copy-paste with minimal edits.

Overall score = weighted average:
   0.50 * structural + 0.30 * token + 0.20 * literal   (when AST available)
   0.60 * token      + 0.40 * literal                   (non-Python)

A report is flagged when overall_score >= 0.70.

The reference corpus is currently the starter code templates seeded into the DB.
In production this would also compare against a rolling window of previous submissions
and public LeetCode-style solution banks.
"""

import ast
import re
import difflib
import json
from dataclasses import dataclass
from typing import Optional


# ── AST normalisation ─────────────────────────────────────────────────────────

class _NameNormaliser(ast.NodeTransformer):
    """Replace all Name/arg/FunctionDef/ClassDef identifiers with canonical tokens."""

    def __init__(self):
        self._map: dict[str, str] = {}
        self._counter = 0

    def _norm(self, name: str) -> str:
        if name in self._map:
            return self._map[name]
        tok = f"v{self._counter}"
        self._map[name] = tok
        self._counter += 1
        return tok

    def visit_Name(self, node):
        node.id = self._norm(node.id)
        return node

    def visit_arg(self, node):
        node.arg = self._norm(node.arg)
        return node

    def visit_FunctionDef(self, node):
        node.name = self._norm(node.name)
        self.generic_visit(node)
        return node

    def visit_AsyncFunctionDef(self, node):
        node.name = self._norm(node.name)
        self.generic_visit(node)
        return node

    def visit_ClassDef(self, node):
        node.name = self._norm(node.name)
        self.generic_visit(node)
        return node


def _ast_dump(source: str) -> Optional[str]:
    """Parse Python source, normalise identifiers, return canonical AST dump."""
    try:
        tree = ast.parse(source)
        normaliser = _NameNormaliser()
        norm_tree = normaliser.visit(tree)
        return ast.dump(norm_tree)
    except SyntaxError:
        return None


# ── Tokenisation (language-agnostic) ─────────────────────────────────────────

_COMMENT_RE = re.compile(
    r'//.*?$|/\*.*?\*/|#.*?$|\'\'\'.*?\'\'\'|""".*?"""',
    re.MULTILINE | re.DOTALL,
)
_TOKEN_RE = re.compile(r'[A-Za-z_]\w*|[0-9]+(?:\.[0-9]+)?|[^\s\w]')


def _tokenise(source: str) -> list[str]:
    """Strip comments, extract tokens."""
    stripped = _COMMENT_RE.sub("", source)
    return _TOKEN_RE.findall(stripped)


# ── Similarity metrics ────────────────────────────────────────────────────────

def _seq_ratio(a: str | list, b: str | list) -> float:
    return difflib.SequenceMatcher(None, a, b).ratio()


@dataclass
class SimilarityResult:
    overall_score:    float
    structural_score: float
    token_score:      float
    literal_score:    float
    is_flagged:       bool
    diff_json:        str   # JSON-serialisable diff for the frontend


def compare(candidate_code: str, reference_code: str, language: str = "Python") -> SimilarityResult:
    """
    Compare candidate code against a reference.
    Returns scores in 0.0–1.0 range (multiply by 100 for %).
    """
    # ── literal ──
    literal = _seq_ratio(candidate_code, reference_code)

    # ── token ──
    cand_tokens = _tokenise(candidate_code)
    ref_tokens  = _tokenise(reference_code)
    token = _seq_ratio(cand_tokens, ref_tokens)

    # ── structural (Python only) ──
    structural = token  # default fallback
    if language == "Python":
        cand_ast = _ast_dump(candidate_code)
        ref_ast  = _ast_dump(reference_code)
        if cand_ast and ref_ast:
            structural = _seq_ratio(cand_ast, ref_ast)

    # ── weighted overall ──
    if language == "Python":
        overall = 0.50 * structural + 0.30 * token + 0.20 * literal
    else:
        overall = 0.60 * token + 0.40 * literal

    # ── unified diff for frontend display ──
    diff_lines = list(difflib.unified_diff(
        reference_code.splitlines(),
        candidate_code.splitlines(),
        fromfile="reference",
        tofile="candidate",
        lineterm="",
        n=3,
    ))
    diff_json = json.dumps(diff_lines)

    return SimilarityResult(
        overall_score=round(overall, 4),
        structural_score=round(structural, 4),
        token_score=round(token, 4),
        literal_score=round(literal, 4),
        is_flagged=overall >= 0.70,
        diff_json=diff_json,
    )


def compare_against_corpus(
    candidate_code: str,
    language: str,
    corpus: list[dict],   # [{"label": str, "code": str}]
) -> Optional[tuple[SimilarityResult, str]]:
    """
    Compare against multiple references.
    Returns (worst_result, matched_label) or None if corpus is empty.
    """
    if not corpus:
        return None

    best: Optional[SimilarityResult] = None
    best_label = ""
    for entry in corpus:
        result = compare(candidate_code, entry["code"], language)
        if best is None or result.overall_score > best.overall_score:
            best = result
            best_label = entry["label"]

    return best, best_label
