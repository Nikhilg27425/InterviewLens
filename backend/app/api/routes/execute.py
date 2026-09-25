"""
/api/execute — Judge0 proxy endpoint.

The browser cannot call ce.judge0.com directly due to CORS. All code
execution requests go through here, which:
  1. Forwards to Judge0 CE with wait=true (synchronous — simpler, avoids
     the browser needing to poll a separate token endpoint)
  2. Returns a normalised result immediately
  3. Handles all Judge0 status codes into a clean response shape

For batches (multiple test cases) we use asyncio.gather to run them in
parallel server-side, which is fast because the server has no CORS limit.
"""

import asyncio
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.config import settings

router = APIRouter(prefix="/execute", tags=["execute"])

BASE = settings.JUDGE0_URL.rstrip("/")

LANGUAGE_IDS: dict[str, int] = {
    "JavaScript": 63,
    "TypeScript": 74,
    "Python":     71,
    "Java":       62,
    "C++":        54,
}

STATUS: dict[int, dict] = {
    1:  {"label": "In Queue",                "type": "pending"},
    2:  {"label": "Processing",              "type": "pending"},
    3:  {"label": "Accepted",                "type": "success"},
    4:  {"label": "Wrong Answer",            "type": "wrong"},
    5:  {"label": "Time Limit Exceeded",     "type": "tle"},
    6:  {"label": "Compilation Error",       "type": "error"},
    7:  {"label": "Runtime Error (SIGSEGV)", "type": "error"},
    8:  {"label": "Runtime Error (SIGXFSZ)", "type": "error"},
    9:  {"label": "Runtime Error (SIGFPE)",  "type": "error"},
    10: {"label": "Runtime Error (SIGABRT)", "type": "error"},
    11: {"label": "Runtime Error (NZEC)",    "type": "error"},
    12: {"label": "Runtime Error (Other)",   "type": "error"},
    13: {"label": "Internal Error",          "type": "error"},
    14: {"label": "Exec Format Error",       "type": "error"},
}


class TestCase(BaseModel):
    label:    str = ""
    stdin:    str = ""
    expected: str | None = None


class RunRequest(BaseModel):
    source_code: str
    language:    str
    test_cases:  list[TestCase]


class SingleRunRequest(BaseModel):
    source_code: str
    language:    str
    stdin:       str = ""


def _parse(data: dict, label: str = "", expected: str = "") -> dict:
    sid      = data.get("status", {}).get("id", 13)
    info     = STATUS.get(sid, {"label": "Unknown", "type": "error"})
    stdout   = (data.get("stdout")         or "").strip()
    stderr   = (data.get("stderr")         or "").strip()
    comp_err = (data.get("compile_output") or "").strip()
    time_ms  = f"{int(float(data['time']) * 1000)}ms" if data.get("time")   else None
    mem_kb   = f"{float(data['memory']) / 1024:.1f} KB" if data.get("memory") else None

    return {
        "status_id":     sid,
        "status_label":  info["label"],
        "status_type":   info["type"],
        "passed":        sid == 3,
        "stdout":        stdout,
        "stderr":        stderr,
        "compile_error": comp_err,
        "error":         stderr or comp_err or (info["label"] if info["type"] == "error" else ""),
        "time":          time_ms,
        "memory":        mem_kb,
        "input":         label,
        "expected":      expected,
    }


async def _run_one(client: httpx.AsyncClient, source_code: str, language: str,
                   stdin: str, expected: str | None, label: str) -> dict:
    lang_id = LANGUAGE_IDS.get(language)
    if not lang_id:
        raise HTTPException(400, f"Unsupported language: {language}")

    payload = {
        "language_id":     lang_id,
        "source_code":     source_code,
        "stdin":           stdin,
        "expected_output": expected,
        "cpu_time_limit":  5,
        "memory_limit":    131072,
    }

    try:
        # wait=true makes Judge0 block until done — no polling needed
        r = await client.post(
            f"{BASE}/submissions?base64_encoded=false&wait=true",
            json=payload,
            timeout=30,
        )
        r.raise_for_status()
        return _parse(r.json(), label=label, expected=expected or "")
    except httpx.TimeoutException:
        return {
            "status_id": 13, "status_label": "Judge0 Timeout", "status_type": "error",
            "passed": False, "stdout": "", "stderr": "", "compile_error": "",
            "error": "Judge0 did not respond in time. Try again in a few seconds.",
            "time": None, "memory": None, "input": label, "expected": expected or "",
        }
    except httpx.HTTPStatusError as e:
        return {
            "status_id": 13, "status_label": "Judge0 Error", "status_type": "error",
            "passed": False, "stdout": "", "stderr": str(e), "compile_error": "",
            "error": f"Judge0 returned HTTP {e.response.status_code}",
            "time": None, "memory": None, "input": label, "expected": expected or "",
        }


@router.post("/run")
async def run_code(body: RunRequest):
    """
    Run source_code against all test_cases in parallel.
    Returns list of result objects, one per test case.
    No authentication required — this is called by the client directly.
    """
    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(*[
            _run_one(client, body.source_code, body.language,
                     tc.stdin, tc.expected, tc.label or tc.stdin)
            for tc in body.test_cases
        ])

    return [{"id": i + 1, **r} for i, r in enumerate(results)]


@router.post("/run-custom")
async def run_custom(body: SingleRunRequest):
    """Run with arbitrary stdin. Returns single result."""
    async with httpx.AsyncClient() as client:
        result = await _run_one(
            client, body.source_code, body.language, body.stdin, None, body.stdin
        )
    return result
