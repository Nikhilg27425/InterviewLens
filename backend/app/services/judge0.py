"""
Judge0 CE proxy service.

All code execution flows through here so we can:
  - add request logging
  - persist results
  - rate-limit / queue in the future
  - swap the backend without touching route handlers
"""
import asyncio
import json
from typing import Any
import httpx
from app.core.config import settings

BASE = settings.JUDGE0_URL.rstrip("/")

LANGUAGE_IDS: dict[str, int] = {
    "JavaScript": 63,
    "TypeScript":  74,
    "Python":      71,
    "Java":        62,
    "C++":         54,
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


async def _submit(client: httpx.AsyncClient, source_code: str, language: str, stdin: str, expected: str | None) -> str:
    lang_id = LANGUAGE_IDS.get(language)
    if not lang_id:
        raise ValueError(f"Unsupported language: {language}")

    payload = {
        "language_id":     lang_id,
        "source_code":     source_code,
        "stdin":           stdin or "",
        "expected_output": expected,
        "cpu_time_limit":  5,
        "memory_limit":    131072,
    }
    r = await client.post(
        f"{BASE}/submissions?base64_encoded=false&wait=false",
        json=payload,
        timeout=20,
    )
    r.raise_for_status()
    return r.json()["token"]


async def _poll(client: httpx.AsyncClient, token: str, max_attempts: int = 20, interval: float = 0.9) -> dict:
    fields = "status,stdout,stderr,compile_output,time,memory"
    for _ in range(max_attempts):
        await asyncio.sleep(interval)
        r = await client.get(
            f"{BASE}/submissions/{token}?base64_encoded=false&fields={fields}",
            timeout=15,
        )
        r.raise_for_status()
        data = r.json()
        if data.get("status", {}).get("id", 0) >= 3:
            return _parse(data)
    raise TimeoutError("Judge0 timed out")


def _parse(data: dict) -> dict:
    sid   = data.get("status", {}).get("id", 13)
    info  = STATUS.get(sid, {"label": "Unknown", "type": "error"})
    stdout   = (data.get("stdout")         or "").strip()
    stderr   = (data.get("stderr")         or "").strip()
    comp_err = (data.get("compile_output") or "").strip()

    return {
        "status_id":    sid,
        "status_label": info["label"],
        "status_type":  info["type"],
        "passed":       sid == 3,
        "stdout":       stdout,
        "stderr":       stderr,
        "compile_error": comp_err,
        "error":        stderr or comp_err or (info["label"] if info["type"] == "error" else ""),
        "time":   f"{int(float(data['time']) * 1000)}ms" if data.get("time")   else None,
        "memory": f"{float(data['memory']) / 1024:.1f} KB" if data.get("memory") else None,
    }


async def run_all(source_code: str, language: str, test_cases: list[dict]) -> list[dict]:
    """Submit all test cases in parallel, poll all in parallel, return results list."""
    async with httpx.AsyncClient() as client:
        tokens = await asyncio.gather(*[
            _submit(client, source_code, language, tc["stdin"], tc.get("expected"))
            for tc in test_cases
        ])
        results = await asyncio.gather(*[_poll(client, t) for t in tokens])

    return [
        {**r, "id": i + 1, "input": tc.get("label", tc["stdin"]), "expected": tc.get("expected", "")}
        for i, (r, tc) in enumerate(zip(results, test_cases))
    ]


async def run_custom(source_code: str, language: str, stdin: str) -> dict:
    async with httpx.AsyncClient() as client:
        token = await _submit(client, source_code, language, stdin, None)
        return await _poll(client, token)
