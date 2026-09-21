"""
Seed the database with the 3 problems from the frontend problems.js file.
Run once after migration: python -m app.db.seed
"""
import asyncio
import json
from app.db.base import AsyncSessionLocal, engine, Base
from app.models.problem import Problem, TestCase, Difficulty

PROBLEMS = [
    {
        "slug": "two-sum",
        "title": "Two Sum",
        "difficulty": Difficulty.easy,
        "points": 15,
        "order_index": 0,
        "description": (
            "Given an array of integers <code>nums</code> and an integer <code>target</code>, "
            "return the indices of the two numbers such that they add up to <code>target</code>.<br/><br/>"
            "You may assume each input has exactly one solution. You may not use the same element twice."
        ),
        "constraints": json.dumps([
            "2 ≤ nums.length ≤ 10⁴",
            "-10⁹ ≤ nums[i] ≤ 10⁹",
            "-10⁹ ≤ target ≤ 10⁹",
            "Only one valid answer exists.",
        ]),
        "examples": json.dumps([
            {"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]", "explanation": "nums[0] + nums[1] == 9"},
            {"input": "nums = [3,2,4], target = 6", "output": "[1,2]"},
        ]),
        "starter_code": json.dumps({
            "JavaScript": "const readline = require('readline');\nconst rl = readline.createInterface({ input: process.stdin });\nconst lines = [];\nrl.on('line', l => lines.push(l.trim()));\nrl.on('close', () => {\n  const nums = lines[0].split(' ').map(Number);\n  const target = Number(lines[1]);\n\n  function twoSum(nums, target) {\n    const map = new Map();\n    for (let i = 0; i < nums.length; i++) {\n      const comp = target - nums[i];\n      if (map.has(comp)) return [map.get(comp), i];\n      map.set(nums[i], i);\n    }\n    return [];\n  }\n\n  console.log(twoSum(nums, target).join(' '));\n});",
            "Python": "import sys\n\ndef two_sum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        comp = target - n\n        if comp in seen:\n            return [seen[comp], i]\n        seen[n] = i\n    return []\n\nlines = sys.stdin.read().split('\\n')\nnums = list(map(int, lines[0].split()))\ntarget = int(lines[1])\nresult = two_sum(nums, target)\nprint(' '.join(map(str, result)))",
        }),
        "custom_test_default": "2 7 11 15\n9",
        "test_cases": [
            {"label": "nums=[2,7,11,15], target=9", "stdin": "2 7 11 15\n9",  "expected": "0 1"},
            {"label": "nums=[3,2,4], target=6",      "stdin": "3 2 4\n6",      "expected": "1 2"},
            {"label": "nums=[3,3], target=6",         "stdin": "3 3\n6",        "expected": "0 1"},
        ],
    },
    {
        "slug": "valid-parentheses",
        "title": "Valid Parentheses",
        "difficulty": Difficulty.easy,
        "points": 15,
        "order_index": 1,
        "description": (
            "Given a string <code>s</code> containing only <code>'('</code>, <code>')'</code>, "
            "<code>'{'</code>, <code>'}'</code>, <code>'['</code> and <code>']'</code>, "
            "determine if the input string is valid."
        ),
        "constraints": json.dumps([
            "1 ≤ s.length ≤ 10⁴",
            "s consists of parentheses only '()[]{}'",
        ]),
        "examples": json.dumps([
            {"input": 's = "()"', "output": "true"},
            {"input": 's = "()[]{}"', "output": "true"},
            {"input": 's = "(]"', "output": "false"},
        ]),
        "starter_code": json.dumps({
            "JavaScript": "const readline = require('readline');\nconst rl = readline.createInterface({ input: process.stdin });\nrl.on('line', s => {\n  function isValid(s) {\n    const stack = [];\n    const map = { ')': '(', '}': '{', ']': '[' };\n    for (const c of s) {\n      if ('({['.includes(c)) stack.push(c);\n      else if (stack.pop() !== map[c]) return false;\n    }\n    return stack.length === 0;\n  }\n  console.log(isValid(s.trim()).toString());\n  rl.close();\n});",
            "Python": "import sys\ns = sys.stdin.readline().strip()\n\ndef is_valid(s):\n    stack = []\n    mapping = {')': '(', '}': '{', ']': '['}\n    for c in s:\n        if c in '({[':\n            stack.append(c)\n        elif not stack or stack.pop() != mapping[c]:\n            return False\n    return len(stack) == 0\n\nprint(str(is_valid(s)).lower())",
        }),
        "custom_test_default": "()[]{}",
        "test_cases": [
            {"label": '"()"',     "stdin": "()",     "expected": "true"},
            {"label": '"()[]{}"', "stdin": "()[]{}", "expected": "true"},
            {"label": '"(]"',     "stdin": "(]",     "expected": "false"},
            {"label": '"([)]"',   "stdin": "([)]",   "expected": "false"},
        ],
    },
    {
        "slug": "lru-cache",
        "title": "LRU Cache",
        "difficulty": Difficulty.medium,
        "points": 30,
        "order_index": 2,
        "description": (
            "Design a data structure that follows the constraints of a <strong>Least Recently Used (LRU) cache</strong>.<br/><br/>"
            "Implement <code>LRUCache(capacity)</code>, <code>get(key)</code> — return the value or <code>-1</code>, "
            "and <code>put(key, value)</code> — insert or update, evicting LRU key when at capacity."
        ),
        "constraints": json.dumps([
            "1 ≤ capacity ≤ 3000",
            "0 ≤ key ≤ 10⁴",
            "At most 2 × 10⁵ calls to get and put.",
        ]),
        "examples": json.dumps([
            {
                "input": "LRUCache(2) → put(1,1) → put(2,2) → get(1) → put(3,3) → get(2)",
                "output": "null null null 1 null -1",
            }
        ]),
        "starter_code": json.dumps({
            "Python": "import sys\nfrom collections import OrderedDict\n\nlines = sys.stdin.read().strip().split('\\n')\ncapacity = int(lines[0])\n\nclass LRUCache:\n    def __init__(self, cap):\n        self.cap = cap\n        self.cache = OrderedDict()\n    def get(self, key):\n        if key not in self.cache:\n            return -1\n        self.cache.move_to_end(key)\n        return self.cache[key]\n    def put(self, key, value):\n        if key in self.cache:\n            self.cache.move_to_end(key)\n        self.cache[key] = value\n        if len(self.cache) > self.cap:\n            self.cache.popitem(last=False)\n\ncache = LRUCache(capacity)\nout = []\nfor line in lines[1:]:\n    parts = line.split()\n    if parts[0] == 'get':\n        out.append(str(cache.get(int(parts[1]))))\n    else:\n        cache.put(int(parts[1]), int(parts[2]))\n        out.append('null')\nprint(' '.join(out))",
        }),
        "custom_test_default": "2\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 2",
        "test_cases": [
            {
                "label": "cap=2, standard sequence",
                "stdin": "2\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 2\nput 4 4\nget 1\nget 3\nget 4",
                "expected": "null null null 1 null -1 null -1 3 4",
            },
            {
                "label": "cap=1, overwrite",
                "stdin": "1\nput 2 1\nget 2\nput 3 2\nget 2\nget 3",
                "expected": "null 1 null -1 2",
            },
        ],
    },
]


async def seed():
    async with AsyncSessionLocal() as db:
        for p_data in PROBLEMS:
            from sqlalchemy import select
            existing = (await db.execute(select(Problem).where(Problem.slug == p_data["slug"]))).scalar_one_or_none()
            if existing:
                print(f"  skip (exists): {p_data['slug']}")
                continue

            test_cases_data = p_data.pop("test_cases")
            problem = Problem(**p_data)
            db.add(problem)
            await db.flush()

            for i, tc in enumerate(test_cases_data):
                db.add(TestCase(
                    problem_id=problem.id,
                    label=tc["label"],
                    stdin=tc["stdin"],
                    expected=tc["expected"],
                    order_index=i,
                ))

            await db.commit()
            print(f"  seeded: {problem.slug}")


if __name__ == "__main__":
    asyncio.run(seed())
