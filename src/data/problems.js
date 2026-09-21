/**
 * Problem bank with real Judge0-compatible test cases.
 *
 * Each test case has:
 *   stdin    — what is piped into the program via standard input
 *   expected — the exact stdout we expect (trimmed)
 *   label    — human-readable description shown in the UI
 *
 * Starter code for each language reads from stdin, calls the function,
 * and prints the result — so Judge0 can do exact output comparison.
 */

export const PROBLEMS = [
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 1,
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    points: 15,
    description: `Given an array of integers <code>nums</code> and an integer <code>target</code>, return the indices of the two numbers such that they add up to <code>target</code>.<br/><br/>You may assume each input has exactly one solution. You may not use the same element twice. Return the answer in any order.`,
    examples: [
      { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'nums[0] + nums[1] == 9' },
      { input: 'nums = [3,2,4], target = 6',     output: '[1,2]', explanation: 'nums[1] + nums[2] == 6' },
    ],
    constraints: [
      '2 ≤ nums.length ≤ 10⁴',
      '-10⁹ ≤ nums[i] ≤ 10⁹',
      '-10⁹ ≤ target ≤ 10⁹',
      'Only one valid answer exists.',
    ],
    testCases: [
      { label: 'nums=[2,7,11,15], target=9',  stdin: '2 7 11 15\n9',  expected: '0 1' },
      { label: 'nums=[3,2,4], target=6',       stdin: '3 2 4\n6',      expected: '1 2' },
      { label: 'nums=[3,3], target=6',         stdin: '3 3\n6',        expected: '0 1' },
    ],
    customTestDefault: '2 7 11 15\n9',
    starterCode: {
      JavaScript: `const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
const lines = [];
rl.on('line', l => lines.push(l.trim()));
rl.on('close', () => {
  const nums = lines[0].split(' ').map(Number);
  const target = Number(lines[1]);

  function twoSum(nums, target) {
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
      const comp = target - nums[i];
      if (map.has(comp)) return [map.get(comp), i];
      map.set(nums[i], i);
    }
    return [];
  }

  const result = twoSum(nums, target);
  console.log(result.join(' '));
});`,

      Python: `import sys

def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        comp = target - n
        if comp in seen:
            return [seen[comp], i]
        seen[n] = i
    return []

lines = sys.stdin.read().split('\\n')
nums = list(map(int, lines[0].split()))
target = int(lines[1])
result = two_sum(nums, target)
print(' '.join(map(str, result)))`,

      TypeScript: `import * as readline from 'readline';
const rl = readline.createInterface({ input: process.stdin });
const lines: string[] = [];
rl.on('line', (l: string) => lines.push(l.trim()));
rl.on('close', () => {
  const nums = lines[0].split(' ').map(Number);
  const target = Number(lines[1]);

  function twoSum(nums: number[], target: number): number[] {
    const map = new Map<number, number>();
    for (let i = 0; i < nums.length; i++) {
      const comp = target - nums[i];
      if (map.has(comp)) return [map.get(comp)!, i];
      map.set(nums[i], i);
    }
    return [];
  }

  console.log(twoSum(nums, target).join(' '));
});`,

      Java: `import java.util.*;
public class Main {
  public static int[] twoSum(int[] nums, int target) {
    Map<Integer,Integer> map = new HashMap<>();
    for (int i = 0; i < nums.length; i++) {
      int comp = target - nums[i];
      if (map.containsKey(comp)) return new int[]{map.get(comp), i};
      map.put(nums[i], i);
    }
    return new int[]{};
  }
  public static void main(String[] args) {
    Scanner sc = new Scanner(System.in);
    String[] parts = sc.nextLine().trim().split(" ");
    int target = Integer.parseInt(sc.nextLine().trim());
    int[] nums = Arrays.stream(parts).mapToInt(Integer::parseInt).toArray();
    int[] res = twoSum(nums, target);
    System.out.println(res[0] + " " + res[1]);
  }
}`,

      'C++': `#include <bits/stdc++.h>
using namespace std;
vector<int> twoSum(vector<int>& nums, int target) {
  unordered_map<int,int> m;
  for (int i = 0; i < (int)nums.size(); i++) {
    int comp = target - nums[i];
    if (m.count(comp)) return {m[comp], i};
    m[nums[i]] = i;
  }
  return {};
}
int main() {
  string line; int target;
  getline(cin, line); cin >> target;
  istringstream ss(line);
  vector<int> nums; int x;
  while (ss >> x) nums.push_back(x);
  auto res = twoSum(nums, target);
  cout << res[0] << " " << res[1] << endl;
}`,
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 2,
    slug: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    points: 15,
    description: `Given a string <code>s</code> containing only <code>'('</code>, <code>')'</code>, <code>'{'</code>, <code>'}'</code>, <code>'['</code> and <code>']'</code>, determine if the input string is valid.<br/><br/>An input string is valid if open brackets are closed by the same type of bracket and in the correct order.`,
    examples: [
      { input: 's = "()"',      output: 'true'  },
      { input: 's = "()[]{}"',  output: 'true'  },
      { input: 's = "(]"',      output: 'false' },
    ],
    constraints: [
      '1 ≤ s.length ≤ 10⁴',
      "s consists of parentheses only '()[]{}'",
    ],
    testCases: [
      { label: '"()"',      stdin: '()',      expected: 'true'  },
      { label: '"()[]{}"',  stdin: '()[]{}'  , expected: 'true'  },
      { label: '"(]"',      stdin: '(]',      expected: 'false' },
      { label: '"([)]"',    stdin: '([)]',    expected: 'false' },
      { label: '"{[]}"',    stdin: '{[]}',    expected: 'true'  },
    ],
    customTestDefault: '()[]{}',
    starterCode: {
      JavaScript: `const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', s => {
  function isValid(s) {
    const stack = [];
    const map = { ')': '(', '}': '{', ']': '[' };
    for (const c of s) {
      if ('({['.includes(c)) stack.push(c);
      else if (stack.pop() !== map[c]) return false;
    }
    return stack.length === 0;
  }
  console.log(isValid(s.trim()).toString());
  rl.close();
});`,

      Python: `import sys
s = sys.stdin.readline().strip()

def is_valid(s):
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    for c in s:
        if c in '({[':
            stack.append(c)
        elif not stack or stack.pop() != mapping[c]:
            return False
    return len(stack) == 0

print(str(is_valid(s)).lower())`,

      TypeScript: `import * as readline from 'readline';
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (s: string) => {
  function isValid(s: string): boolean {
    const stack: string[] = [];
    const map: Record<string,string> = { ')': '(', '}': '{', ']': '[' };
    for (const c of s) {
      if ('({['.includes(c)) stack.push(c);
      else if (stack.pop() !== map[c]) return false;
    }
    return stack.length === 0;
  }
  console.log(isValid(s.trim()).toString());
  rl.close();
});`,

      Java: `import java.util.*;
public class Main {
  public static boolean isValid(String s) {
    Deque<Character> stack = new ArrayDeque<>();
    for (char c : s.toCharArray()) {
      if (c=='('||c=='{'||c=='[') stack.push(c);
      else {
        if (stack.isEmpty()) return false;
        char t = stack.pop();
        if (c==')' && t!='(') return false;
        if (c=='}' && t!='{') return false;
        if (c==']' && t!='[') return false;
      }
    }
    return stack.isEmpty();
  }
  public static void main(String[] args) {
    Scanner sc = new Scanner(System.in);
    System.out.println(isValid(sc.nextLine().trim()));
  }
}`,

      'C++': `#include <bits/stdc++.h>
using namespace std;
bool isValid(string s) {
  stack<char> st;
  for (char c : s) {
    if (c=='('||c=='{'||c=='[') st.push(c);
    else {
      if (st.empty()) return false;
      char t = st.top(); st.pop();
      if (c==')' && t!='(') return false;
      if (c=='}' && t!='{') return false;
      if (c==']' && t!='[') return false;
    }
  }
  return st.empty();
}
int main() {
  string s; cin >> s;
  cout << (isValid(s) ? "true" : "false") << endl;
}`,
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 3,
    slug: 'lru-cache',
    title: 'LRU Cache',
    difficulty: 'Medium',
    points: 30,
    description: `Design a data structure that follows the constraints of a <strong>Least Recently Used (LRU) cache</strong>.<br/><br/>Implement <code>LRUCache(capacity)</code>, <code>get(key)</code> — return the value or <code>-1</code> if not found, and <code>put(key, value)</code> — insert or update, evicting the LRU key when at capacity.`,
    examples: [
      {
        input: 'LRUCache(2) → put(1,1) → put(2,2) → get(1) → put(3,3) → get(2) → put(4,4) → get(1) → get(3) → get(4)',
        output: 'null null null 1 null -1 null -1 3 4',
        explanation: 'After put(3,3) key 2 is evicted; after put(4,4) key 1 is evicted.',
      },
    ],
    constraints: [
      '1 ≤ capacity ≤ 3000',
      '0 ≤ key ≤ 10⁴',
      '0 ≤ value ≤ 10⁵',
      'At most 2 × 10⁵ calls to get and put.',
    ],
    testCases: [
      {
        label: 'cap=2, standard sequence',
        stdin: '2\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 2\nput 4 4\nget 1\nget 3\nget 4',
        expected: 'null null null 1 null -1 null -1 3 4',
      },
      {
        label: 'cap=1, overwrite',
        stdin: '1\nput 2 1\nget 2\nput 3 2\nget 2\nget 3',
        expected: 'null 1 null -1 2',
      },
    ],
    customTestDefault: '2\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 2',
    starterCode: {
      JavaScript: `const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
const lines = [];
rl.on('line', l => lines.push(l.trim()));
rl.on('close', () => {
  const capacity = parseInt(lines[0]);

  class LRUCache {
    constructor(cap) {
      this.cap = cap;
      this.map = new Map();
    }
    get(key) {
      if (!this.map.has(key)) return -1;
      const val = this.map.get(key);
      this.map.delete(key);
      this.map.set(key, val);
      return val;
    }
    put(key, value) {
      if (this.map.has(key)) this.map.delete(key);
      else if (this.map.size >= this.cap)
        this.map.delete(this.map.keys().next().value);
      this.map.set(key, value);
    }
  }

  const cache = new LRUCache(capacity);
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(' ');
    if (parts[0] === 'get') out.push(cache.get(parseInt(parts[1])));
    else { cache.put(parseInt(parts[1]), parseInt(parts[2])); out.push('null'); }
  }
  console.log(out.join(' '));
});`,

      Python: `import sys
from collections import OrderedDict

lines = sys.stdin.read().strip().split('\\n')
capacity = int(lines[0])

class LRUCache:
    def __init__(self, cap):
        self.cap = cap
        self.cache = OrderedDict()
    def get(self, key):
        if key not in self.cache:
            return -1
        self.cache.move_to_end(key)
        return self.cache[key]
    def put(self, key, value):
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.cap:
            self.cache.popitem(last=False)

cache = LRUCache(capacity)
out = []
for line in lines[1:]:
    parts = line.split()
    if parts[0] == 'get':
        out.append(str(cache.get(int(parts[1]))))
    else:
        cache.put(int(parts[1]), int(parts[2]))
        out.append('null')
print(' '.join(out))`,

      TypeScript: `import * as readline from 'readline';
const rl = readline.createInterface({ input: process.stdin });
const lines: string[] = [];
rl.on('line', (l: string) => lines.push(l.trim()));
rl.on('close', () => {
  const capacity = parseInt(lines[0]);
  class LRUCache {
    private cap: number;
    private map: Map<number,number>;
    constructor(cap: number) { this.cap = cap; this.map = new Map(); }
    get(key: number): number {
      if (!this.map.has(key)) return -1;
      const val = this.map.get(key)!;
      this.map.delete(key); this.map.set(key, val);
      return val;
    }
    put(key: number, value: number): void {
      if (this.map.has(key)) this.map.delete(key);
      else if (this.map.size >= this.cap)
        this.map.delete(this.map.keys().next().value!);
      this.map.set(key, value);
    }
  }
  const cache = new LRUCache(capacity);
  const out: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const p = lines[i].split(' ');
    if (p[0]==='get') out.push(String(cache.get(+p[1])));
    else { cache.put(+p[1],+p[2]); out.push('null'); }
  }
  console.log(out.join(' '));
});`,

      Java: `import java.util.*;
public class Main {
  static LinkedHashMap<Integer,Integer> cache;
  static int cap;
  static int get(int key){
    if(!cache.containsKey(key)) return -1;
    int v=cache.remove(key); cache.put(key,v); return v;
  }
  static void put(int key,int val){
    cache.remove(key);
    if(cache.size()>=cap) cache.remove(cache.keySet().iterator().next());
    cache.put(key,val);
  }
  public static void main(String[] args){
    Scanner sc=new Scanner(System.in);
    cap=Integer.parseInt(sc.nextLine().trim());
    cache=new LinkedHashMap<>();
    List<String> out=new ArrayList<>();
    while(sc.hasNextLine()){
      String[] p=sc.nextLine().trim().split(" ");
      if(p[0].equals("get")) out.add(String.valueOf(get(Integer.parseInt(p[1]))));
      else { put(Integer.parseInt(p[1]),Integer.parseInt(p[2])); out.add("null"); }
    }
    System.out.println(String.join(" ",out));
  }
}`,

      'C++': `#include <bits/stdc++.h>
using namespace std;
int cap;
list<pair<int,int>> lst;
unordered_map<int,list<pair<int,int>>::iterator> mp;
int lget(int k){
  if(!mp.count(k)) return -1;
  lst.splice(lst.end(),lst,mp[k]);
  return mp[k]->second;
}
void lput(int k,int v){
  if(mp.count(k)) lst.erase(mp[k]);
  else if((int)lst.size()>=cap){ mp.erase(lst.front().first); lst.pop_front(); }
  lst.push_back({k,v}); mp[k]=prev(lst.end());
}
int main(){
  string line; getline(cin,line); cap=stoi(line);
  vector<string> out;
  while(getline(cin,line)){
    istringstream ss(line); string op; ss>>op;
    if(op=="get"){ int k; ss>>k; out.push_back(to_string(lget(k))); }
    else { int k,v; ss>>k>>v; lput(k,v); out.push_back("null"); }
  }
  for(int i=0;i<(int)out.size();i++){ if(i) cout<<" "; cout<<out[i]; }
  cout<<endl;
}`,
    },
  },
]
