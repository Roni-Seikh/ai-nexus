'use strict';
const https = require('https');
const http  = require('http');

// ════════════════════════════════════════════════════════════
// MULTI-SOURCE WEB FETCHER
// ════════════════════════════════════════════════════════════

const fetchUrl = (url, timeoutMs = 5000) => new Promise((resolve) => {
  try {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.request(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NexusAI/2.0)',
        'Accept': 'application/json, text/plain, */*',
      },
      timeout: timeoutMs,
    }, (res) => {
      let data = '';
      res.on('data', c => { data += c; if (data.length > 50000) { req.destroy(); resolve(data); } });
      res.on('end', () => resolve(data));
    });
    req.on('error', () => resolve(''));
    req.on('timeout', () => { req.destroy(); resolve(''); });
    req.end();
  } catch { resolve(''); }
});

// Search DuckDuckGo
const searchDDG = async (query) => {
  const raw = await fetchUrl(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
  try {
    const j = JSON.parse(raw);
    const results = [];
    if (j.AbstractText) results.push({ title: j.Heading || query, snippet: j.AbstractText, url: j.AbstractURL || '' });
    (j.RelatedTopics || []).forEach(t => {
      if (t.Text && t.FirstURL) results.push({ title: t.Text.slice(0, 80), snippet: t.Text, url: t.FirstURL });
    });
    (j.Results || []).forEach(r => {
      if (r.Text) results.push({ title: r.Text.slice(0, 80), snippet: r.Text, url: r.FirstURL || '' });
    });
    return results.slice(0, 6);
  } catch { return []; }
};

// Wikipedia summary
const searchWikipedia = async (query) => {
  const q = encodeURIComponent(query.replace(/ /g, '_'));
  const raw = await fetchUrl(`https://en.wikipedia.org/api/rest_v1/page/summary/${q}`);
  try {
    const j = JSON.parse(raw);
    if (j.extract) return { title: j.title, snippet: j.extract.slice(0, 800), url: j.content_urls?.desktop?.page || '' };
  } catch {}
  return null;
};

// StackOverflow search
const searchStackOverflow = async (query) => {
  const q = encodeURIComponent(query);
  const raw = await fetchUrl(`https://api.stackexchange.com/2.3/search/advanced?q=${q}&site=stackoverflow&pagesize=3&order=desc&sort=relevance&filter=!nNPvSNdWme`);
  try {
    const j = JSON.parse(raw);
    return (j.items || []).slice(0, 3).map(i => ({
      title: i.title,
      snippet: `Score: ${i.score} | Answers: ${i.answer_count} | ${i.tags?.join(', ')}`,
      url: i.link,
    }));
  } catch { return []; }
};

// npm package info
const searchNPM = async (pkg) => {
  const raw = await fetchUrl(`https://registry.npmjs.org/${encodeURIComponent(pkg)}/latest`);
  try {
    const j = JSON.parse(raw);
    if (j.name) return { name: j.name, version: j.version, description: j.description, homepage: j.homepage || `https://npmjs.com/package/${j.name}` };
  } catch {}
  return null;
};

// PyPI package info
const searchPyPI = async (pkg) => {
  const raw = await fetchUrl(`https://pypi.org/pypi/${encodeURIComponent(pkg)}/json`);
  try {
    const j = JSON.parse(raw);
    if (j.info) return { name: j.info.name, version: j.info.version, description: j.info.summary, homepage: j.info.home_page || `https://pypi.org/project/${j.info.name}` };
  } catch {}
  return null;
};

// GitHub trending / repo info
const searchGitHub = async (query) => {
  const raw = await fetchUrl(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&per_page=3`, 6000);
  try {
    const j = JSON.parse(raw);
    return (j.items || []).slice(0, 3).map(r => ({
      title: r.full_name,
      snippet: `⭐ ${r.stargazers_count.toLocaleString()} | ${r.description || 'No description'} | Language: ${r.language || 'N/A'}`,
      url: r.html_url,
    }));
  } catch { return []; }
};

// Multi-source smart search
const smartSearch = async (query, type = 'general') => {
  const results = { sources: [], combined: '' };

  if (type === 'code' || type === 'package') {
    const [ddg, so] = await Promise.all([searchDDG(query), searchStackOverflow(query)]);
    results.sources = [...so, ...ddg].slice(0, 5);
  } else if (type === 'github') {
    results.sources = await searchGitHub(query);
  } else {
    // Try Wikipedia first, then DDG
    const [wiki, ddg] = await Promise.all([searchWikipedia(query), searchDDG(query)]);
    if (wiki) results.sources = [{ title: wiki.title, snippet: wiki.snippet, url: wiki.url, isWiki: true }, ...ddg.slice(0, 3)];
    else results.sources = ddg;
  }

  if (results.sources.length > 0) {
    results.combined = results.sources.map((r, i) => `[${i+1}] **${r.title}**\n${r.snippet}`).join('\n\n');
  }
  return results;
};

// ════════════════════════════════════════════════════════════
// LANGUAGE DETECTION
// ════════════════════════════════════════════════════════════

const detectProgrammingLang = (text) => {
  const t = text.toLowerCase();
  const langs = [
    ['python', /\bpython\b|\bpy\b|django|flask|pandas|numpy|tensorflow|pytorch|fastapi/],
    ['javascript', /\bjavascript\b|\bjs\b|\bnode\.?js\b|react|vue|angular|express|next\.?js|typescript/],
    ['typescript', /\btypescript\b|\bts\b/],
    ['java', /\bjava\b(?!script)/],
    ['cpp', /\bc\+\+\b|cpp\b/],
    ['csharp', /\bc#\b|csharp|\.net|dotnet|asp\.net/],
    ['php', /\bphp\b|laravel|symfony/],
    ['ruby', /\bruby\b|rails/],
    ['go', /\bgolang\b|\bgo\b(?= (code|program|function|app))/],
    ['rust', /\brust\b/],
    ['swift', /\bswift\b/],
    ['kotlin', /\bkotlin\b/],
    ['bash', /\bbash\b|shell script|\bsh\b/],
    ['sql', /\bsql\b|mysql|postgres|sqlite|mongodb/],
    ['html', /\bhtml\b/],
    ['css', /\bcss\b|sass|scss/],
    ['r', /\br language\b|\bin r\b/],
    ['matlab', /\bmatlab\b/],
    ['dart', /\bdart\b|flutter/],
    ['scala', /\bscala\b/],
  ];
  for (const [lang, pattern] of langs) {
    if (pattern.test(t)) return lang;
  }
  return 'python';
};

// ════════════════════════════════════════════════════════════
// MASSIVE CODE GENERATION ENGINE
// ════════════════════════════════════════════════════════════

const CODE_SOLUTIONS = {

  // ── ALGORITHMS ──────────────────────────────────────────────
  fibonacci: {
    python: `def fibonacci_iterative(n):
    """Generate first n Fibonacci numbers — O(n) time, O(1) space."""
    if n <= 0: return []
    if n == 1: return [0]
    a, b, result = 0, 1, [0, 1]
    for _ in range(2, n):
        a, b = b, a + b
        result.append(b)
    return result

def fibonacci_recursive(n, memo={}):
    """Memoized recursive — O(n) time, O(n) space."""
    if n in memo: return memo[n]
    if n <= 1: return n
    memo[n] = fibonacci_recursive(n-1, memo) + fibonacci_recursive(n-2, memo)
    return memo[n]

def fibonacci_generator():
    """Infinite generator — memory efficient."""
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b

# Matrix exponentiation — O(log n) time
def fibonacci_fast(n):
    def mat_mult(A, B):
        return [[A[0][0]*B[0][0] + A[0][1]*B[1][0],
                 A[0][0]*B[0][1] + A[0][1]*B[1][1]],
                [A[1][0]*B[0][0] + A[1][1]*B[1][0],
                 A[1][0]*B[0][1] + A[1][1]*B[1][1]]]
    def mat_pow(M, p):
        if p == 1: return M
        if p % 2 == 0:
            half = mat_pow(M, p // 2)
            return mat_mult(half, half)
        return mat_mult(M, mat_pow(M, p - 1))
    if n == 0: return 0
    result = mat_pow([[1,1],[1,0]], n)
    return result[0][1]

# Examples
print(fibonacci_iterative(10))  # [0,1,1,2,3,5,8,13,21,34]
print(fibonacci_recursive(10))  # 55
gen = fibonacci_generator()
print([next(gen) for _ in range(10)])  # [0,1,1,2,3,5,8,13,21,34]
print(fibonacci_fast(50))  # 12586269025`,

    javascript: `// Iterative — O(n)
function fibIterative(n) {
    if (n <= 0) return [];
    if (n === 1) return [0];
    let [a, b] = [0, 1];
    const result = [0, 1];
    for (let i = 2; i < n; i++) {
        [a, b] = [b, a + b];
        result.push(b);
    }
    return result;
}

// Memoized recursive
const fibMemo = (() => {
    const cache = new Map([[0, 0n], [1, 1n]]);
    return function fib(n) {
        if (cache.has(n)) return cache.get(n);
        const result = fib(n - 1) + fib(n - 2);
        cache.set(n, result);
        return result;
    };
})();

// Generator (infinite)
function* fibGenerator() {
    let [a, b] = [0, 1];
    while (true) { yield a; [a, b] = [b, a + b]; }
}

// Dynamic Programming with BigInt (handles huge numbers)
function fibDP(n) {
    if (n <= 1) return BigInt(n);
    let [a, b] = [0n, 1n];
    for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
    return b;
}

console.log(fibIterative(10));   // [0,1,1,2,3,5,8,13,21,34]
console.log(fibDP(100).toString()); // 354224848179261915075
const gen = fibGenerator();
console.log(Array.from({length:10}, () => gen.next().value));`,

    java: `import java.math.BigInteger;
import java.util.*;

public class Fibonacci {

    // Iterative O(n)
    public static long[] fibArray(int n) {
        if (n <= 0) return new long[0];
        long[] fib = new long[n];
        fib[0] = 0;
        if (n > 1) fib[1] = 1;
        for (int i = 2; i < n; i++)
            fib[i] = fib[i-1] + fib[i-2];
        return fib;
    }

    // Memoized
    private static Map<Integer, BigInteger> memo = new HashMap<>();
    public static BigInteger fibMemo(int n) {
        if (n <= 1) return BigInteger.valueOf(n);
        if (memo.containsKey(n)) return memo.get(n);
        BigInteger result = fibMemo(n-1).add(fibMemo(n-2));
        memo.put(n, result);
        return result;
    }

    // Stream (Java 8+)
    public static List<Long> fibStream(int count) {
        List<Long> list = new ArrayList<>();
        long[] state = {0L, 1L};
        for (int i = 0; i < count; i++) {
            list.add(state[0]);
            long next = state[0] + state[1];
            state[0] = state[1];
            state[1] = next;
        }
        return list;
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(fibArray(10)));
        System.out.println(fibMemo(100));
        System.out.println(fibStream(10));
    }
}`,
  },

  sorting: {
    python: `import random, time

# ── Bubble Sort O(n²) ──────────────────────────────────────
def bubble_sort(arr):
    a = arr.copy()
    n = len(a)
    for i in range(n):
        swapped = False
        for j in range(0, n-i-1):
            if a[j] > a[j+1]:
                a[j], a[j+1] = a[j+1], a[j]
                swapped = True
        if not swapped: break  # Optimized: stop if already sorted
    return a

# ── Selection Sort O(n²) ───────────────────────────────────
def selection_sort(arr):
    a = arr.copy()
    for i in range(len(a)):
        min_idx = i
        for j in range(i+1, len(a)):
            if a[j] < a[min_idx]: min_idx = j
        a[i], a[min_idx] = a[min_idx], a[i]
    return a

# ── Insertion Sort O(n²) best O(n) ────────────────────────
def insertion_sort(arr):
    a = arr.copy()
    for i in range(1, len(a)):
        key = a[i]
        j = i - 1
        while j >= 0 and a[j] > key:
            a[j+1] = a[j]
            j -= 1
        a[j+1] = key
    return a

# ── Merge Sort O(n log n) ──────────────────────────────────
def merge_sort(arr):
    if len(arr) <= 1: return arr
    mid = len(arr) // 2
    left  = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)

def merge(left, right):
    result, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]: result.append(left[i]); i += 1
        else:                   result.append(right[j]); j += 1
    return result + left[i:] + right[j:]

# ── Quick Sort O(n log n) avg ──────────────────────────────
def quick_sort(arr):
    if len(arr) <= 1: return arr
    pivot  = arr[len(arr) // 2]
    left   = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right  = [x for x in arr if x > pivot]
    return quick_sort(left) + middle + quick_sort(right)

# ── Heap Sort O(n log n) ───────────────────────────────────
def heap_sort(arr):
    a = arr.copy()
    n = len(a)
    def heapify(a, n, i):
        largest, l, r = i, 2*i+1, 2*i+2
        if l < n and a[l] > a[largest]: largest = l
        if r < n and a[r] > a[largest]: largest = r
        if largest != i:
            a[i], a[largest] = a[largest], a[i]
            heapify(a, n, largest)
    for i in range(n//2-1, -1, -1): heapify(a, n, i)
    for i in range(n-1, 0, -1):
        a[0], a[i] = a[i], a[0]
        heapify(a, i, 0)
    return a

# ── Counting Sort O(n+k) ───────────────────────────────────
def counting_sort(arr):
    if not arr: return arr
    min_val, max_val = min(arr), max(arr)
    count = [0] * (max_val - min_val + 1)
    for x in arr: count[x - min_val] += 1
    result = []
    for i, c in enumerate(count): result.extend([i + min_val] * c)
    return result

# ── Radix Sort O(nk) ──────────────────────────────────────
def radix_sort(arr):
    if not arr: return arr
    max_val = max(arr)
    exp = 1
    while max_val // exp > 0:
        arr = counting_by_digit(arr, exp)
        exp *= 10
    return arr

def counting_by_digit(arr, exp):
    output = [0] * len(arr)
    count  = [0] * 10
    for i in arr: count[(i // exp) % 10] += 1
    for i in range(1, 10): count[i] += count[i-1]
    for i in range(len(arr)-1, -1, -1):
        idx = (arr[i] // exp) % 10
        output[count[idx]-1] = arr[i]
        count[idx] -= 1
    return output

# Benchmark
arr = random.sample(range(10000), 1000)
algos = [('Bubble', bubble_sort), ('Merge', merge_sort),
         ('Quick', quick_sort),   ('Heap', heap_sort)]
for name, fn in algos:
    t = time.time()
    result = fn(arr)
    print(f"{name:10}: {(time.time()-t)*1000:.2f}ms | Correct: {result == sorted(arr)}")`,

    javascript: `// All major sorting algorithms in JavaScript

// Bubble Sort O(n²)
function bubbleSort(arr) {
    const a = [...arr];
    for (let i = 0; i < a.length; i++) {
        let swapped = false;
        for (let j = 0; j < a.length-i-1; j++) {
            if (a[j] > a[j+1]) { [a[j], a[j+1]] = [a[j+1], a[j]]; swapped = true; }
        }
        if (!swapped) break;
    }
    return a;
}

// Merge Sort O(n log n)
function mergeSort(arr) {
    if (arr.length <= 1) return arr;
    const mid = Math.floor(arr.length / 2);
    const left  = mergeSort(arr.slice(0, mid));
    const right = mergeSort(arr.slice(mid));
    const result = [];
    let [i, j] = [0, 0];
    while (i < left.length && j < right.length)
        result.push(left[i] <= right[j] ? left[i++] : right[j++]);
    return [...result, ...left.slice(i), ...right.slice(j)];
}

// Quick Sort O(n log n) avg
function quickSort(arr) {
    if (arr.length <= 1) return arr;
    const pivot  = arr[Math.floor(arr.length / 2)];
    const left   = arr.filter(x => x < pivot);
    const middle = arr.filter(x => x === pivot);
    const right  = arr.filter(x => x > pivot);
    return [...quickSort(left), ...middle, ...quickSort(right)];
}

// Heap Sort O(n log n)
function heapSort(arr) {
    const a = [...arr], n = a.length;
    const heapify = (a, n, i) => {
        let [largest, l, r] = [i, 2*i+1, 2*i+2];
        if (l < n && a[l] > a[largest]) largest = l;
        if (r < n && a[r] > a[largest]) largest = r;
        if (largest !== i) { [a[i], a[largest]] = [a[largest], a[i]]; heapify(a, n, largest); }
    };
    for (let i = Math.floor(n/2)-1; i >= 0; i--) heapify(a, n, i);
    for (let i = n-1; i > 0; i--) { [a[0], a[i]] = [a[i], a[0]]; heapify(a, i, 0); }
    return a;
}

// Radix Sort O(nk)
function radixSort(arr) {
    const max = Math.max(...arr);
    let exp = 1;
    while (Math.floor(max / exp) > 0) {
        arr = countingSortByDigit(arr, exp);
        exp *= 10;
    }
    return arr;
}
function countingSortByDigit(arr, exp) {
    const output = new Array(arr.length).fill(0);
    const count  = new Array(10).fill(0);
    arr.forEach(n => count[Math.floor(n/exp)%10]++);
    for (let i = 1; i < 10; i++) count[i] += count[i-1];
    for (let i = arr.length-1; i >= 0; i--) {
        const d = Math.floor(arr[i]/exp)%10;
        output[--count[d]] = arr[i];
    }
    return output;
}

// Test
const arr = Array.from({length:10}, () => Math.floor(Math.random()*100));
console.log('Original:', arr);
console.log('Bubble:  ', bubbleSort(arr));
console.log('Merge:   ', mergeSort(arr));
console.log('Quick:   ', quickSort(arr));
console.log('Heap:    ', heapSort(arr));`,
  },

  // ── DATA STRUCTURES ─────────────────────────────────────────
  binary_tree: {
    python: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val   = val
        self.left  = left
        self.right = right

class BinarySearchTree:
    def __init__(self):
        self.root = None

    def insert(self, val):
        self.root = self._insert(self.root, val)

    def _insert(self, node, val):
        if not node: return TreeNode(val)
        if val < node.val:  node.left  = self._insert(node.left,  val)
        elif val > node.val: node.right = self._insert(node.right, val)
        return node

    def search(self, val):
        return self._search(self.root, val)

    def _search(self, node, val):
        if not node or node.val == val: return node
        if val < node.val: return self._search(node.left,  val)
        return               self._search(node.right, val)

    def delete(self, val):
        self.root = self._delete(self.root, val)

    def _delete(self, node, val):
        if not node: return None
        if val < node.val:    node.left  = self._delete(node.left,  val)
        elif val > node.val:  node.right = self._delete(node.right, val)
        else:
            if not node.left:  return node.right
            if not node.right: return node.left
            # Find inorder successor (min of right subtree)
            successor = node.right
            while successor.left: successor = successor.left
            node.val   = successor.val
            node.right = self._delete(node.right, successor.val)
        return node

    # ── Traversals ────────────────────────────────────────────
    def inorder(self,   node=None, first=True):
        if first: node = self.root
        return (self.inorder(node.left, False) + [node.val] +
                self.inorder(node.right, False)) if node else []

    def preorder(self,  node=None, first=True):
        if first: node = self.root
        return ([node.val] + self.preorder(node.left, False) +
                self.preorder(node.right, False)) if node else []

    def postorder(self, node=None, first=True):
        if first: node = self.root
        return (self.postorder(node.left, False) +
                self.postorder(node.right, False) + [node.val]) if node else []

    def level_order(self):
        """BFS traversal."""
        if not self.root: return []
        from collections import deque
        q, result = deque([self.root]), []
        while q:
            node = q.popleft()
            result.append(node.val)
            if node.left:  q.append(node.left)
            if node.right: q.append(node.right)
        return result

    def height(self, node=None, first=True):
        if first: node = self.root
        if not node: return 0
        return 1 + max(self.height(node.left, False), self.height(node.right, False))

    def is_valid_bst(self, node=None, first=True, min_val=float('-inf'), max_val=float('inf')):
        if first: node = self.root
        if not node: return True
        if not (min_val < node.val < max_val): return False
        return (self.is_valid_bst(node.left,  False, min_val, node.val) and
                self.is_valid_bst(node.right, False, node.val, max_val))

    def __repr__(self):
        return f"BST(inorder={self.inorder()}, height={self.height()})"

# Usage
bst = BinarySearchTree()
for v in [5, 3, 7, 1, 4, 6, 8, 2]:
    bst.insert(v)

print("Inorder   :", bst.inorder())     # [1,2,3,4,5,6,7,8] sorted!
print("Preorder  :", bst.preorder())    # [5,3,1,2,4,7,6,8]
print("Postorder :", bst.postorder())   # [2,1,4,3,6,8,7,5]
print("Level BFS :", bst.level_order()) # [5,3,7,1,4,6,8,2]
print("Height    :", bst.height())      # 4
print("Valid BST :", bst.is_valid_bst())# True
bst.delete(3)
print("After del3:", bst.inorder())     # [1,2,4,5,6,7,8]`,
  },

  graph: {
    python: `from collections import defaultdict, deque
import heapq

class Graph:
    def __init__(self, directed=False):
        self.graph    = defaultdict(list)
        self.directed = directed
        self.vertices = set()

    def add_edge(self, u, v, weight=1):
        self.vertices.update([u, v])
        self.graph[u].append((v, weight))
        if not self.directed:
            self.graph[v].append((u, weight))

    # ── BFS — shortest path (unweighted) ──────────────────
    def bfs(self, start):
        visited, queue, order = {start}, deque([start]), []
        while queue:
            node = queue.popleft()
            order.append(node)
            for neighbor, _ in self.graph[node]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)
        return order

    def shortest_path_bfs(self, start, end):
        visited  = {start: None}
        queue    = deque([start])
        while queue:
            node = queue.popleft()
            if node == end:
                path = []
                while node is not None:
                    path.append(node)
                    node = visited[node]
                return path[::-1]
            for neighbor, _ in self.graph[node]:
                if neighbor not in visited:
                    visited[neighbor] = node
                    queue.append(neighbor)
        return []  # No path

    # ── DFS ────────────────────────────────────────────────
    def dfs(self, start, visited=None):
        if visited is None: visited = set()
        visited.add(start)
        result = [start]
        for neighbor, _ in self.graph[start]:
            if neighbor not in visited:
                result.extend(self.dfs(neighbor, visited))
        return result

    # ── Dijkstra — shortest weighted path ──────────────────
    def dijkstra(self, start):
        dist = {v: float('inf') for v in self.vertices}
        dist[start] = 0
        pq   = [(0, start)]
        prev = {start: None}
        while pq:
            d, u = heapq.heappop(pq)
            if d > dist[u]: continue
            for v, w in self.graph[u]:
                if dist[u] + w < dist[v]:
                    dist[v]  = dist[u] + w
                    prev[v]  = u
                    heapq.heappush(pq, (dist[v], v))
        return dist, prev

    def shortest_weighted_path(self, start, end):
        dist, prev = self.dijkstra(start)
        if dist[end] == float('inf'): return [], float('inf')
        path, node = [], end
        while node is not None:
            path.append(node)
            node = prev[node]
        return path[::-1], dist[end]

    # ── Detect cycle ───────────────────────────────────────
    def has_cycle(self):
        visited, rec_stack = set(), set()
        def dfs_cycle(v):
            visited.add(v); rec_stack.add(v)
            for neighbor, _ in self.graph[v]:
                if neighbor not in visited:
                    if dfs_cycle(neighbor): return True
                elif neighbor in rec_stack: return True
            rec_stack.discard(v)
            return False
        return any(dfs_cycle(v) for v in self.vertices if v not in visited)

    # ── Topological Sort (DAG only) ────────────────────────
    def topological_sort(self):
        visited, stack = set(), []
        def dfs_topo(v):
            visited.add(v)
            for neighbor, _ in self.graph[v]: 
                if neighbor not in visited: dfs_topo(neighbor)
            stack.append(v)
        for v in self.vertices:
            if v not in visited: dfs_topo(v)
        return stack[::-1]

# Usage
g = Graph(directed=False)
edges = [('A','B',4),('A','C',2),('B','D',5),('C','D',1),('C','E',3),('D','F',2),('E','F',6)]
for u,v,w in edges: g.add_edge(u,v,w)

print("BFS from A:      ", g.bfs('A'))
print("DFS from A:      ", g.dfs('A'))
print("BFS shortest A→F:", g.shortest_path_bfs('A','F'))
path, cost = g.shortest_weighted_path('A','F')
print(f"Dijkstra A→F:    {path} (cost={cost})")
print("Has cycle:       ", g.has_cycle())`,
  },

  // ── WEB DEVELOPMENT ─────────────────────────────────────────
  rest_api: {
    python: `from flask import Flask, jsonify, request, abort
from functools import wraps
from datetime import datetime
import uuid, hashlib, os

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-change-in-prod')

# ── In-memory DB (replace with real DB in production) ──────
db = {
    'users': {},
    'posts': {},
}

# ── Auth middleware ────────────────────────────────────────
def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token or token not in db.get('tokens', {}):
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        request.user_id = db['tokens'][token]
        return f(*args, **kwargs)
    return decorated

# ── Helper ─────────────────────────────────────────────────
def success(data=None, message='OK', status=200):
    return jsonify({'success': True, 'message': message, 'data': data, 'timestamp': datetime.utcnow().isoformat()}), status

def error(message, status=400):
    return jsonify({'success': False, 'message': message}), status

# ── AUTH ROUTES ────────────────────────────────────────────
@app.route('/api/auth/register', methods=['POST'])
def register():
    body = request.get_json() or {}
    name  = body.get('name', '').strip()
    email = body.get('email', '').strip().lower()
    pw    = body.get('password', '')
    if not all([name, email, pw]):
        return error('name, email and password required')
    if any(u['email'] == email for u in db['users'].values()):
        return error('Email already registered', 409)
    uid = str(uuid.uuid4())
    db['users'][uid] = {
        'id': uid, 'name': name, 'email': email,
        'password': hashlib.sha256(pw.encode()).hexdigest(),
        'created_at': datetime.utcnow().isoformat()
    }
    return success({'user': {k:v for k,v in db['users'][uid].items() if k != 'password'}}, 'Registered', 201)

@app.route('/api/auth/login', methods=['POST'])
def login():
    body  = request.get_json() or {}
    email = body.get('email', '').lower()
    pw    = body.get('password', '')
    user  = next((u for u in db['users'].values()
                  if u['email'] == email and u['password'] == hashlib.sha256(pw.encode()).hexdigest()), None)
    if not user: return error('Invalid credentials', 401)
    token = str(uuid.uuid4())
    db.setdefault('tokens', {})[token] = user['id']
    return success({'token': token, 'user': {k:v for k,v in user.items() if k != 'password'}})

# ── POSTS CRUD ─────────────────────────────────────────────
@app.route('/api/posts', methods=['GET'])
def get_posts():
    page  = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    posts = list(db['posts'].values())
    posts.sort(key=lambda x: x['created_at'], reverse=True)
    start = (page-1)*limit
    return success({'posts': posts[start:start+limit], 'total': len(posts), 'page': page, 'pages': -(-len(posts)//limit)})

@app.route('/api/posts/<post_id>', methods=['GET'])
def get_post(post_id):
    post = db['posts'].get(post_id)
    if not post: return error('Post not found', 404)
    return success({'post': post})

@app.route('/api/posts', methods=['POST'])
@require_auth
def create_post():
    body  = request.get_json() or {}
    title = body.get('title', '').strip()
    content = body.get('content', '').strip()
    if not title or not content: return error('title and content required')
    pid   = str(uuid.uuid4())
    post  = {'id': pid, 'title': title, 'content': content,
             'author_id': request.user_id, 'created_at': datetime.utcnow().isoformat(), 'updated_at': None}
    db['posts'][pid] = post
    return success({'post': post}, 'Created', 201)

@app.route('/api/posts/<post_id>', methods=['PUT'])
@require_auth
def update_post(post_id):
    post = db['posts'].get(post_id)
    if not post: return error('Post not found', 404)
    if post['author_id'] != request.user_id: return error('Forbidden', 403)
    body = request.get_json() or {}
    post.update({k: body[k] for k in ('title', 'content') if k in body})
    post['updated_at'] = datetime.utcnow().isoformat()
    return success({'post': post})

@app.route('/api/posts/<post_id>', methods=['DELETE'])
@require_auth
def delete_post(post_id):
    post = db['posts'].get(post_id)
    if not post: return error('Post not found', 404)
    if post['author_id'] != request.user_id: return error('Forbidden', 403)
    del db['posts'][post_id]
    return success(None, 'Deleted')

# ── Error handlers ─────────────────────────────────────────
@app.errorhandler(404)
def not_found(e): return error('Route not found', 404)

@app.errorhandler(500)
def server_error(e): return error('Internal server error', 500)

if __name__ == '__main__':
    app.run(debug=True, port=5000)`,

    javascript: `// Complete REST API with Express.js
const express  = require('express');
const crypto   = require('crypto');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

// ── CORS ────────────────────────────────────────────────────
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// ── In-memory DB ─────────────────────────────────────────────
const db = { users: {}, posts: {}, tokens: {} };

// ── Helpers ──────────────────────────────────────────────────
const hash   = (pw) => crypto.createHash('sha256').update(pw).digest('hex');
const ok     = (res, data, msg='OK', status=200) => res.status(status).json({ success:true, message:msg, data, timestamp: new Date().toISOString() });
const fail   = (res, msg, status=400) => res.status(status).json({ success:false, message:msg });

// ── Auth middleware ───────────────────────────────────────────
const auth = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token || !db.tokens[token]) return fail(res, 'Unauthorized', 401);
    req.userId = db.tokens[token];
    next();
};

// ── Validation ────────────────────────────────────────────────
const validate = (fields) => (req, res, next) => {
    const missing = fields.filter(f => !req.body[f]);
    if (missing.length) return fail(res, \`Required: \${missing.join(', ')}\`);
    next();
};

// ── AUTH ─────────────────────────────────────────────────────
app.post('/api/auth/register', validate(['name','email','password']), (req, res) => {
    const { name, email, password } = req.body;
    const normalEmail = email.toLowerCase().trim();
    if (Object.values(db.users).some(u => u.email === normalEmail))
        return fail(res, 'Email already registered', 409);
    const id = uuidv4();
    db.users[id] = { id, name, email: normalEmail, password: hash(password), createdAt: new Date().toISOString() };
    const { password: _, ...user } = db.users[id];
    return ok(res, { user }, 'Registered', 201);
});

app.post('/api/auth/login', validate(['email','password']), (req, res) => {
    const { email, password } = req.body;
    const user = Object.values(db.users).find(u => u.email === email.toLowerCase() && u.password === hash(password));
    if (!user) return fail(res, 'Invalid credentials', 401);
    const token = uuidv4();
    db.tokens[token] = user.id;
    const { password: _, ...safeUser } = user;
    return ok(res, { token, user: safeUser });
});

app.post('/api/auth/logout', auth, (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    delete db.tokens[token];
    return ok(res, null, 'Logged out');
});

// ── POSTS CRUD ────────────────────────────────────────────────
app.get('/api/posts', (req, res) => {
    const { page=1, limit=10, search='' } = req.query;
    let posts = Object.values(db.posts)
        .filter(p => !search || p.title.includes(search) || p.content.includes(search))
        .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = posts.length;
    posts = posts.slice((page-1)*limit, page*limit);
    return ok(res, { posts, total, page: +page, pages: Math.ceil(total/limit) });
});

app.get('/api/posts/:id', (req, res) => {
    const post = db.posts[req.params.id];
    if (!post) return fail(res, 'Not found', 404);
    return ok(res, { post });
});

app.post('/api/posts', auth, validate(['title','content']), (req, res) => {
    const { title, content, tags=[] } = req.body;
    const id   = uuidv4();
    const post = { id, title, content, tags, authorId: req.userId, createdAt: new Date().toISOString(), updatedAt: null, views: 0 };
    db.posts[id] = post;
    return ok(res, { post }, 'Created', 201);
});

app.put('/api/posts/:id', auth, (req, res) => {
    const post = db.posts[req.params.id];
    if (!post)             return fail(res, 'Not found', 404);
    if (post.authorId !== req.userId) return fail(res, 'Forbidden', 403);
    Object.assign(post, req.body, { updatedAt: new Date().toISOString() });
    return ok(res, { post });
});

app.delete('/api/posts/:id', auth, (req, res) => {
    const post = db.posts[req.params.id];
    if (!post)             return fail(res, 'Not found', 404);
    if (post.authorId !== req.userId) return fail(res, 'Forbidden', 403);
    delete db.posts[req.params.id];
    return ok(res, null, 'Deleted');
});

// ── 404 & Error handlers ──────────────────────────────────────
app.use((req, res) => fail(res, 'Route not found', 404));
app.use((err, req, res, next) => { console.error(err); fail(res, 'Server error', 500); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(\`🚀 Server running at http://localhost:\${PORT}\`));`,
  },

  // ── DESIGN PATTERNS ─────────────────────────────────────────
  design_patterns: {
    python: `"""Common Design Patterns in Python"""

# ── 1. SINGLETON ───────────────────────────────────────────
class Singleton:
    _instance = None
    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super().__new__(cls)
        return cls._instance
    def __init__(self, value=None):
        if not hasattr(self, 'initialized'):
            self.value = value
            self.initialized = True

s1 = Singleton(42)
s2 = Singleton(99)
print(s1 is s2)    # True — same instance
print(s1.value)    # 42 (first initialization wins)

# ── 2. FACTORY ─────────────────────────────────────────────
from abc import ABC, abstractmethod

class Animal(ABC):
    @abstractmethod
    def speak(self): pass

class Dog(Animal):   def speak(self): return "Woof! 🐶"
class Cat(Animal):   def speak(self): return "Meow! 🐱"
class Bird(Animal):  def speak(self): return "Tweet! 🐦"

class AnimalFactory:
    _registry = {'dog': Dog, 'cat': Cat, 'bird': Bird}
    @classmethod
    def create(cls, animal_type):
        cls_ = cls._registry.get(animal_type.lower())
        if not cls_: raise ValueError(f"Unknown animal: {animal_type}")
        return cls_()
    @classmethod
    def register(cls, name, animal_class):
        cls._registry[name] = animal_class

dog = AnimalFactory.create('dog')
print(dog.speak())  # Woof! 🐶

# ── 3. OBSERVER ────────────────────────────────────────────
class EventEmitter:
    def __init__(self):
        self._listeners = {}
    def on(self, event, callback):
        self._listeners.setdefault(event, []).append(callback)
        return self
    def emit(self, event, *args, **kwargs):
        for cb in self._listeners.get(event, []):
            cb(*args, **kwargs)
    def off(self, event, callback):
        if event in self._listeners:
            self._listeners[event].remove(callback)

emitter = EventEmitter()
emitter.on('data', lambda x: print(f"Handler 1: {x}"))
emitter.on('data', lambda x: print(f"Handler 2: {x*2}"))
emitter.emit('data', 10)  # Handler 1: 10 / Handler 2: 20

# ── 4. DECORATOR PATTERN ───────────────────────────────────
import time, functools

def timer(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start  = time.perf_counter()
        result = func(*args, **kwargs)
        end    = time.perf_counter()
        print(f"{func.__name__} took {(end-start)*1000:.2f}ms")
        return result
    return wrapper

def retry(times=3, exceptions=(Exception,)):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(times):
                try:   return func(*args, **kwargs)
                except exceptions as e:
                    if attempt == times-1: raise
                    print(f"Retry {attempt+1}/{times}: {e}")
        return wrapper
    return decorator

@timer
@retry(times=3)
def fetch_data():
    return "data"

# ── 5. STRATEGY ────────────────────────────────────────────
class Sorter:
    def __init__(self, strategy):
        self.strategy = strategy
    def sort(self, data):
        return self.strategy(data)

sorter = Sorter(sorted)
print(sorter.sort([3,1,4,1,5]))  # [1,1,3,4,5]
sorter.strategy = lambda x: sorted(x, reverse=True)
print(sorter.sort([3,1,4,1,5]))  # [5,4,3,1,1]

# ── 6. CONTEXT MANAGER ─────────────────────────────────────
from contextlib import contextmanager

@contextmanager
def timer_ctx(label=""):
    start = time.perf_counter()
    try: yield
    finally: print(f"{label}: {(time.perf_counter()-start)*1000:.2f}ms")

with timer_ctx("Heavy operation"):
    sum(range(1_000_000))`,
  },

  // ── MACHINE LEARNING ────────────────────────────────────────
  machine_learning: {
    python: `"""Machine Learning from scratch in Python"""
import math, random

# ── 1. LINEAR REGRESSION (Gradient Descent) ────────────────
class LinearRegression:
    def __init__(self, lr=0.01, epochs=1000):
        self.lr     = lr
        self.epochs = epochs
        self.w = self.b = 0.0

    def fit(self, X, y):
        n = len(X)
        for epoch in range(self.epochs):
            y_pred = [self.w * x + self.b for x in X]
            dw = -2/n * sum((y[i]-y_pred[i])*X[i] for i in range(n))
            db = -2/n * sum(y[i]-y_pred[i] for i in range(n))
            self.w -= self.lr * dw
            self.b -= self.lr * db
            if epoch % 100 == 0:
                mse = sum((y[i]-y_pred[i])**2 for i in range(n)) / n
                print(f"Epoch {epoch:4d}: MSE={mse:.4f}, w={self.w:.3f}, b={self.b:.3f}")

    def predict(self, X): return [self.w * x + self.b for x in X]
    def score(self, X, y):
        yp   = self.predict(X)
        ss_r = sum((y[i]-yp[i])**2 for i in range(len(y)))
        ss_t = sum((yi - sum(y)/len(y))**2 for yi in y)
        return 1 - ss_r/ss_t if ss_t else 0

# ── 2. LOGISTIC REGRESSION ─────────────────────────────────
class LogisticRegression:
    def __init__(self, lr=0.1, epochs=1000):
        self.lr     = lr
        self.epochs = epochs
        self.weights = None
        self.bias    = 0.0

    def sigmoid(self, z): return 1 / (1 + math.exp(-max(-500, min(500, z))))

    def fit(self, X, y):
        self.weights = [0.0] * len(X[0])
        for _ in range(self.epochs):
            for xi, yi in zip(X, y):
                z      = sum(w*x for w,x in zip(self.weights, xi)) + self.bias
                pred   = self.sigmoid(z)
                error  = pred - yi
                self.weights = [w - self.lr*error*x for w,x in zip(self.weights, xi)]
                self.bias   -= self.lr * error

    def predict_proba(self, X):
        return [self.sigmoid(sum(w*x for w,x in zip(self.weights, xi)) + self.bias) for xi in X]

    def predict(self, X, threshold=0.5):
        return [1 if p >= threshold else 0 for p in self.predict_proba(X)]

# ── 3. K-NEAREST NEIGHBORS ─────────────────────────────────
class KNN:
    def __init__(self, k=3):
        self.k = k

    def fit(self, X, y): self.X_train, self.y_train = X, y

    def _distance(self, a, b):
        return math.sqrt(sum((x-y)**2 for x,y in zip(a,b)))

    def predict(self, X):
        predictions = []
        for x in X:
            distances = sorted(enumerate(self.X_train), key=lambda t: self._distance(x, t[1]))
            k_labels  = [self.y_train[i] for i,_ in distances[:self.k]]
            predictions.append(max(set(k_labels), key=k_labels.count))
        return predictions

# ── 4. DECISION TREE ───────────────────────────────────────
class DecisionTree:
    def __init__(self, max_depth=5, min_samples=2):
        self.max_depth   = max_depth
        self.min_samples = min_samples
        self.tree        = None

    def _gini(self, y):
        n = len(y)
        if n == 0: return 0
        classes = set(y)
        return 1 - sum((y.count(c)/n)**2 for c in classes)

    def _best_split(self, X, y):
        best_gain, best_feat, best_thresh = 0, None, None
        parent_gini = self._gini(y)
        for feat_idx in range(len(X[0])):
            values = sorted(set(x[feat_idx] for x in X))
            for thresh in [(values[i]+values[i+1])/2 for i in range(len(values)-1)]:
                left_y  = [y[i] for i,x in enumerate(X) if x[feat_idx] <= thresh]
                right_y = [y[i] for i,x in enumerate(X) if x[feat_idx] >  thresh]
                if not left_y or not right_y: continue
                n = len(y)
                gain = parent_gini - (len(left_y)/n*self._gini(left_y) + len(right_y)/n*self._gini(right_y))
                if gain > best_gain:
                    best_gain, best_feat, best_thresh = gain, feat_idx, thresh
        return best_feat, best_thresh

    def _build(self, X, y, depth=0):
        if depth >= self.max_depth or len(y) < self.min_samples or len(set(y)) == 1:
            return {'leaf': True, 'label': max(set(y), key=y.count)}
        feat, thresh = self._best_split(X, y)
        if feat is None:
            return {'leaf': True, 'label': max(set(y), key=y.count)}
        left_mask  = [x[feat] <= thresh for x in X]
        right_mask = [not m for m in left_mask]
        return {
            'leaf': False, 'feature': feat, 'threshold': thresh,
            'left':  self._build([x for x,m in zip(X,left_mask)  if m], [yi for yi,m in zip(y,left_mask)  if m], depth+1),
            'right': self._build([x for x,m in zip(X,right_mask) if m], [yi for yi,m in zip(y,right_mask) if m], depth+1),
        }

    def fit(self, X, y): self.tree = self._build(X, y)

    def _predict_one(self, x, node):
        if node['leaf']: return node['label']
        return self._predict_one(x, node['left'] if x[node['feature']] <= node['threshold'] else node['right'])

    def predict(self, X): return [self._predict_one(x, self.tree) for x in X]

# ── DEMO ───────────────────────────────────────────────────
random.seed(42)
# Linear regression: y = 2x + 1 + noise
X = [random.uniform(0, 10) for _ in range(100)]
y = [2*x + 1 + random.gauss(0, 0.5) for x in X]

lr = LinearRegression(lr=0.01, epochs=500)
lr.fit(X, y)
print(f"\\nR² score: {lr.score(X, y):.4f}")
print(f"Predictions for [1,5,10]: {[round(p,2) for p in lr.predict([1,5,10])]}")`,
  },

  // ── ASYNC & CONCURRENCY ─────────────────────────────────────
  async_programming: {
    python: `"""Async Programming in Python"""
import asyncio, aiohttp, time
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor

# ── 1. BASIC ASYNC/AWAIT ──────────────────────────────────
async def fetch_data(session, url, delay=0):
    await asyncio.sleep(delay)  # Simulate I/O
    print(f"Fetched: {url}")
    return {"url": url, "status": "ok"}

async def main():
    # Sequential — slow
    start = time.time()
    results = []
    for i in range(5):
        r = await fetch_data(None, f"https://api.example.com/{i}", delay=0.1)
        results.append(r)
    print(f"Sequential: {time.time()-start:.2f}s")

    # Concurrent — fast
    start = time.time()
    tasks   = [fetch_data(None, f"https://api.example.com/{i}", delay=0.1) for i in range(5)]
    results = await asyncio.gather(*tasks)
    print(f"Concurrent: {time.time()-start:.2f}s")
    return results

# ── 2. PRODUCER/CONSUMER WITH ASYNC QUEUE ─────────────────
async def producer(queue, items):
    for item in items:
        await queue.put(item)
        print(f"Produced: {item}")
        await asyncio.sleep(0.1)
    await queue.put(None)  # Sentinel

async def consumer(queue, name):
    while True:
        item = await queue.get()
        if item is None:
            queue.task_done()
            break
        print(f"{name} consumed: {item}")
        await asyncio.sleep(0.05)
        queue.task_done()

async def producer_consumer():
    queue = asyncio.Queue(maxsize=3)
    items = list(range(10))
    await asyncio.gather(
        producer(queue, items),
        consumer(queue, "Consumer-1"),
        consumer(queue, "Consumer-2"),
    )

# ── 3. SEMAPHORE — RATE LIMITING ──────────────────────────
async def rate_limited_fetch(sem, url):
    async with sem:  # Limit to N concurrent requests
        await asyncio.sleep(0.1)
        return {"url": url, "data": "..."}

async def fetch_with_limit(urls, max_concurrent=3):
    sem = asyncio.Semaphore(max_concurrent)
    tasks = [rate_limited_fetch(sem, url) for url in urls]
    return await asyncio.gather(*tasks)

# ── 4. ASYNC CONTEXT MANAGER ──────────────────────────────
class AsyncDB:
    async def __aenter__(self):
        print("DB: Connected")
        self.conn = "connection"
        return self

    async def __aexit__(self, *args):
        print("DB: Disconnected")
        self.conn = None

    async def query(self, sql):
        await asyncio.sleep(0.01)  # Simulate query
        return [{"id": 1, "name": "Alice"}]

async def db_example():
    async with AsyncDB() as db:
        results = await db.query("SELECT * FROM users")
        print(f"Got {len(results)} users")

# ── 5. THREAD + PROCESS POOL ──────────────────────────────
def cpu_task(n):
    """CPU-bound: use ProcessPool"""
    return sum(i*i for i in range(n))

def io_task(n):
    """I/O-bound: use ThreadPool"""
    time.sleep(0.1)
    return f"IO task {n} done"

async def mixed_tasks():
    loop = asyncio.get_event_loop()
    # Thread pool for I/O
    with ThreadPoolExecutor(max_workers=4) as tp:
        io_results = await asyncio.gather(*[
            loop.run_in_executor(tp, io_task, i) for i in range(5)
        ])
    print("IO results:", io_results)

    # Process pool for CPU
    with ProcessPoolExecutor(max_workers=4) as pp:
        cpu_results = await asyncio.gather(*[
            loop.run_in_executor(pp, cpu_task, 100_000) for i in range(4)
        ])
    print("CPU results:", cpu_results)

asyncio.run(main())`,
  },
};

// Map intent → solution key
const detectCodeTopic = (text) => {
  const t = text.toLowerCase();
  const topics = [
    [/fibonacci|fib sequence/,         'fibonacci'],
    [/sort|sorting|bubble|merge|quick|heap|radix/, 'sorting'],
    [/binary tree|bst|binary search tree|tree traversal/, 'binary_tree'],
    [/graph|bfs|dfs|dijkstra|shortest path|topological/, 'graph'],
    [/rest api|crud api|express app|flask api|fastapi/, 'rest_api'],
    [/design pattern|singleton|factory|observer|strategy|decorator pattern/, 'design_patterns'],
    [/machine learning|linear regression|logistic|knn|decision tree|neural/, 'machine_learning'],
    [/async|await|concurrent|coroutine|asyncio|promise/, 'async_programming'],
  ];
  for (const [pattern, key] of topics) {
    if (pattern.test(t)) return key;
  }
  return null;
};

// Dynamic code generation for uncovered topics
const generateGenericCode = (text, lang) => {
  const t = text.toLowerCase();

  if (/palindrome/.test(t)) {
    if (lang === 'python') return { lang, code: `def is_palindrome(s):\n    s = ''.join(c.lower() for c in s if c.isalnum())\n    return s == s[::-1]\n\n# Examples\nprint(is_palindrome("racecar"))     # True\nprint(is_palindrome("A man a plan a canal Panama"))  # True\nprint(is_palindrome("hello"))       # False\n\n# For numbers\ndef is_numeric_palindrome(n):\n    s = str(abs(n))\n    return s == s[::-1]\n\nprint(is_numeric_palindrome(121))   # True\nprint(is_numeric_palindrome(-121))  # False` };
    if (lang === 'javascript') return { lang, code: `const isPalindrome = (s) => {\n    const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');\n    return clean === clean.split('').reverse().join('');\n};\n\nconsole.log(isPalindrome("racecar"));    // true\nconsole.log(isPalindrome("A man a plan a canal Panama")); // true\nconsole.log(isPalindrome("hello"));     // false` };
  }

  if (/two sum|twosum/.test(t)) {
    if (lang === 'python') return { lang, code: `def two_sum(nums, target):\n    """Find two indices whose values sum to target — O(n)."""\n    seen = {}  # value -> index\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in seen:\n            return [seen[complement], i]\n        seen[num] = i\n    return []\n\nprint(two_sum([2,7,11,15], 9))   # [0, 1]\nprint(two_sum([3,2,4], 6))       # [1, 2]\nprint(two_sum([3,3], 6))         # [0, 1]` };
  }

  if (/anagram/.test(t)) {
    if (lang === 'python') return { lang, code: `from collections import Counter\n\ndef is_anagram(s, t):\n    return Counter(s.lower()) == Counter(t.lower())\n\ndef group_anagrams(words):\n    groups = {}\n    for word in words:\n        key = ''.join(sorted(word.lower()))\n        groups.setdefault(key, []).append(word)\n    return list(groups.values())\n\nprint(is_anagram("listen", "silent"))   # True\nprint(is_anagram("hello", "world"))     # False\nprint(group_anagrams(["eat","tea","tan","ate","nat","bat"]))\n# [['eat','tea','ate'], ['tan','nat'], ['bat']]` };
  }

  if (/prime/.test(t) && /generate|list|all/.test(t)) {
    if (lang === 'python') return { lang, code: `def sieve_of_eratosthenes(limit):\n    """Find all primes up to limit — O(n log log n)."""\n    is_prime = [True] * (limit + 1)\n    is_prime[0] = is_prime[1] = False\n    for i in range(2, int(limit**0.5) + 1):\n        if is_prime[i]:\n            for j in range(i*i, limit+1, i):\n                is_prime[j] = False\n    return [i for i, p in enumerate(is_prime) if p]\n\nprimes = sieve_of_eratosthenes(50)\nprint(primes)\n# [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47]\nprint(f"Number of primes up to 1000: {len(sieve_of_eratosthenes(1000))}")  # 168` };
  }

  if (/matrix|2d array/.test(t)) {
    if (lang === 'python') return { lang, code: `# Matrix operations in Python\ndef create_matrix(rows, cols, val=0):\n    return [[val]*cols for _ in range(rows)]\n\ndef transpose(matrix):\n    return [[matrix[j][i] for j in range(len(matrix))] for i in range(len(matrix[0]))]\n\ndef multiply(A, B):\n    rows_A, cols_A, cols_B = len(A), len(A[0]), len(B[0])\n    C = create_matrix(rows_A, cols_B)\n    for i in range(rows_A):\n        for j in range(cols_B):\n            for k in range(cols_A):\n                C[i][j] += A[i][k] * B[k][j]\n    return C\n\nA = [[1,2,3],[4,5,6]]\nB = [[7,8],[9,10],[11,12]]\nprint("A:", A)\nprint("Transpose:", transpose(A))\nprint("A×B:", multiply(A, B))  # [[58,64],[139,154]]` };
  }

  return null;
};

// ════════════════════════════════════════════════════════════
// MATH ENGINE
// ════════════════════════════════════════════════════════════

const solveMath = (text) => {
  const t = text.toLowerCase().trim();

  // Safe evaluator
  const safeEval = (expr) => {
    try {
      const clean = expr.replace(/[^0-9+\-*/().% ]/g,'').replace(/\^/g,'**').trim();
      if (!clean || clean.length > 200) return null;
      const r = Function('"use strict"; return (' + clean + ')')();
      return typeof r === 'number' && isFinite(r) ? r : null;
    } catch { return null; }
  };

  // Direct arithmetic
  const exprMatch = text.match(/^([\d\s+\-*/().^%]+)[=?]*$/);
  if (exprMatch) {
    const r = safeEval(exprMatch[1]);
    if (r !== null) return `## 🔢 Result\n\n\`${exprMatch[1].trim()}\` = **${r}**${Number.isInteger(r) ? '' : `\n\n≈ ${r.toFixed(6)}`}`;
  }

  // X% of Y
  const pct = t.match(/(\d+\.?\d*)\s*%\s*of\s*(\d+\.?\d*)/);
  if (pct) {
    const [,p,n] = pct, r = (+p/100)*+n;
    return `## 📊 Percentage\n\n${p}% of ${n} = **${r}**\n\n*Formula: (${p} ÷ 100) × ${n} = ${r}*`;
  }

  // Square root
  const sqrtM = t.match(/(?:square root|sqrt)\s*(?:of\s*)?(\d+\.?\d*)/);
  if (sqrtM) {
    const n = +sqrtM[1], r = Math.sqrt(n);
    return `## √ Square Root\n\n√${n} = **${r}**\n\n${Number.isInteger(r) ? `✅ ${n} is a **perfect square**` : `*${r.toFixed(8)}*`}`;
  }

  // Compound interest
  if (/compound interest|compound/.test(t)) {
    const nums = text.match(/\d+\.?\d*/g);
    if (nums && nums.length >= 3) {
      const [P, r, t2, n=1] = nums.map(Number);
      const A = P * Math.pow(1 + r/(n*100), n*t2);
      return `## 💰 Compound Interest\n\n**Formula:** A = P(1 + r/n)^(nt)\n\nP = ${P}, r = ${r}%, t = ${t2} years, n = ${n}/year\n\n**Amount = ₹${A.toFixed(2)}**\n**Interest = ₹${(A-P).toFixed(2)}**`;
    }
  }

  // Statistics
  if (/mean|median|mode|average|statistics|std/.test(t)) {
    const nums = text.match(/\d+\.?\d*/g)?.map(Number);
    if (nums && nums.length > 2) {
      const sorted = [...nums].sort((a,b)=>a-b);
      const mean   = nums.reduce((s,n)=>s+n,0)/nums.length;
      const median = sorted.length%2 ? sorted[Math.floor(sorted.length/2)] : (sorted[sorted.length/2-1]+sorted[sorted.length/2])/2;
      const freq   = nums.reduce((f,n)=>(f[n]=(f[n]||0)+1,f),{});
      const maxF   = Math.max(...Object.values(freq));
      const mode   = Object.keys(freq).filter(k=>+freq[k]===maxF).join(', ');
      const variance = nums.reduce((s,n)=>s+(n-mean)**2,0)/nums.length;
      return `## 📊 Statistics\n\n**Data:** ${sorted.join(', ')}\n\n| Measure | Value |\n|---------|-------|\n| Mean | ${mean.toFixed(4)} |\n| Median | ${median} |\n| Mode | ${mode} |\n| Range | ${sorted[sorted.length-1]-sorted[0]} |\n| Variance | ${variance.toFixed(4)} |\n| Std Dev | ${Math.sqrt(variance).toFixed(4)} |\n| Count | ${nums.length} |`;
    }
  }

  // Pythagorean
  if (/pythagorean|hypotenuse/.test(t)) {
    const nums = text.match(/\d+\.?\d*/g)?.map(Number);
    if (nums && nums.length >= 2) {
      const [a,b] = nums, c = Math.sqrt(a*a+b*b);
      return `## 📐 Pythagorean Theorem\n\na² + b² = c²\n\na=${a}, b=${b}\n\nc = √(${a}²+${b}²) = √${a*a+b*b} = **${c.toFixed(6)}**`;
    }
    return `## 📐 Pythagorean Theorem\n\n**c² = a² + b²**\n\nProvide a and b values to calculate c.`;
  }

  // Prime factorization
  if (/prime factor|factorize/.test(t)) {
    const n = +text.match(/\d+/)?.[0];
    if (n && n > 1) {
      const factors = [], num = n;
      let x = n;
      for (let i = 2; i*i <= x; i++) { while (x%i===0) { factors.push(i); x=Math.floor(x/i); } }
      if (x > 1) factors.push(x);
      return `## 🔢 Prime Factorization\n\n**${num} = ${factors.join(' × ')}**\n\nPrime factors: {${[...new Set(factors)].join(', ')}}`;
    }
  }

  // GCD/LCM
  if (/gcd|lcm|greatest common|least common/.test(t)) {
    const nums = text.match(/\d+/g)?.map(Number);
    if (nums && nums.length >= 2) {
      const gcd = (a,b) => b===0?a:gcd(b,a%b);
      const [a,b] = nums, g = gcd(a,b), l = a*b/g;
      return `## 🔢 GCD & LCM\n\n**GCD(${a}, ${b}) = ${g}**\n**LCM(${a}, ${b}) = ${l}**\n\n*Euclidean algorithm: GCD(${a},${b}) → GCD(${b},${a%b}) → ... → ${g}*`;
    }
  }

  return null;
};

// ════════════════════════════════════════════════════════════
// TRANSLATION ENGINE (comprehensive)
// ════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  'hello':      { hindi:'नमस्ते (Namaste)', spanish:'Hola', french:'Bonjour', german:'Hallo', arabic:'مرحبا (Marhaba)', bengali:'নমস্কার (Nomoshkar)', japanese:'こんにちは (Konnichiwa)', chinese:'你好 (Nǐ hǎo)', portuguese:'Olá', russian:'Привет (Privet)', italian:'Ciao', korean:'안녕하세요 (Annyeonghaseyo)', urdu:'سلام (Salam)', turkish:'Merhaba', dutch:'Hallo', swedish:'Hej', polish:'Cześć', greek:'Γεια σου (Yeia sou)' },
  'thank you':  { hindi:'धन्यवाद (Dhanyavaad)', spanish:'Gracias', french:'Merci', german:'Danke', arabic:'شكراً (Shukran)', bengali:'ধন্যবাদ (Dhonyobad)', japanese:'ありがとう (Arigatō)', chinese:'谢谢 (Xièxiè)', portuguese:'Obrigado/a', russian:'Спасибо (Spasibo)', italian:'Grazie', korean:'감사합니다 (Gamsahamnida)', urdu:'شکریہ (Shukriya)', turkish:'Teşekkür ederim', dutch:'Dank je', swedish:'Tack', polish:'Dziękuję', greek:'Ευχαριστώ (Efcharistó)' },
  'goodbye':    { hindi:'अलविदा (Alvida)', spanish:'Adiós', french:'Au revoir', german:'Auf Wiedersehen', arabic:'مع السلامة', bengali:'বিদায় (Biday)', japanese:'さようなら (Sayonara)', chinese:'再见 (Zàijiàn)', portuguese:'Adeus', russian:'До свидания', italian:'Arrivederci', korean:'안녕히 가세요', urdu:'خدا حافظ', turkish:'Hoşça kal', dutch:'Dag', swedish:'Hej då', polish:'Do widzenia', greek:'Αντίο (Antío)' },
  'i love you': { hindi:'मैं तुमसे प्यार करता/करती हूँ', spanish:'Te amo', french:'Je t\'aime', german:'Ich liebe dich', arabic:'أحبك (Uhibbuka)', bengali:'আমি তোমাকে ভালোবাসি', japanese:'愛してる (Aishiteru)', chinese:'我爱你 (Wǒ ài nǐ)', portuguese:'Eu te amo', russian:'Я тебя люблю', italian:'Ti amo', korean:'사랑해요 (Saranghaeyo)', urdu:'میں تم سے پیار کرتا ہوں', turkish:'Seni seviyorum', dutch:'Ik hou van je', swedish:'Jag älskar dig', polish:'Kocham cię', greek:'Σ\'αγαπώ (S\'agapó)' },
  'please':     { hindi:'कृपया (Kripaya)', spanish:'Por favor', french:'S\'il vous plaît', german:'Bitte', arabic:'من فضلك', bengali:'দয়া করে (Doya kore)', japanese:'お願いします (Onegaishimasu)', chinese:'请 (Qǐng)', portuguese:'Por favor', russian:'Пожалуйста (Pozhaluysta)', italian:'Per favore', korean:'제발 (Jebal)', urdu:'براہ کرم', turkish:'Lütfen', dutch:'Alsjeblieft', swedish:'Snälla', polish:'Proszę', greek:'Παρακαλώ (Parakaló)' },
  'sorry':      { hindi:'माफ़ करें (Maaf Karen)', spanish:'Lo siento', french:'Désolé(e)', german:'Entschuldigung', arabic:'آسف (Aasif)', bengali:'দুঃখিত (Dukkhito)', japanese:'すみません (Sumimasen)', chinese:'对不起 (Duìbuqǐ)', portuguese:'Desculpe', russian:'Извините (Izvinite)', italian:'Mi dispiace', korean:'미안해요 (Mianhaeyo)', urdu:'معاف کریں', turkish:'Üzgünüm', dutch:'Sorry', swedish:'Förlåt', polish:'Przepraszam', greek:'Συγγνώμη (Sygnómi)' },
  'yes':        { hindi:'हाँ (Haan)', spanish:'Sí', french:'Oui', german:'Ja', arabic:'نعم (Na\'am)', bengali:'হ্যাঁ (Hyan)', japanese:'はい (Hai)', chinese:'是 (Shì)', portuguese:'Sim', russian:'Да (Da)', italian:'Sì', korean:'네 (Ne)', urdu:'ہاں', turkish:'Evet', dutch:'Ja', swedish:'Ja', polish:'Tak', greek:'Ναι (Ne)' },
  'no':         { hindi:'नहीं (Nahi)', spanish:'No', french:'Non', german:'Nein', arabic:'لا (La)', bengali:'না (Na)', japanese:'いいえ (Iie)', chinese:'不 (Bù)', portuguese:'Não', russian:'Нет (Net)', italian:'No', korean:'아니오 (Anio)', urdu:'نہیں', turkish:'Hayır', dutch:'Nee', swedish:'Nej', polish:'Nie', greek:'Όχι (Óchi)' },
  'water':      { hindi:'पानी (Paani)', spanish:'Agua', french:'Eau', german:'Wasser', arabic:'ماء (Maa\')', bengali:'পানি (Pani)', japanese:'水 (Mizu)', chinese:'水 (Shuǐ)', portuguese:'Água', russian:'Вода (Voda)', italian:'Acqua', korean:'물 (Mul)', urdu:'پانی', turkish:'Su', dutch:'Water', swedish:'Vatten', polish:'Woda', greek:'Νερό (Neró)' },
  'food':       { hindi:'खाना (Khana)', spanish:'Comida', french:'Nourriture', german:'Essen', arabic:'طعام (Ta\'aam)', bengali:'খাবার (Khabar)', japanese:'食べ物 (Tabemono)', chinese:'食物 (Shíwù)', portuguese:'Comida', russian:'Еда (Yeda)', italian:'Cibo', korean:'음식 (Eumsik)', urdu:'کھانا', turkish:'Yemek', dutch:'Eten', swedish:'Mat', polish:'Jedzenie', greek:'Φαγητό (Fagitó)' },
  'beautiful':  { hindi:'सुंदर (Sundar)', spanish:'Hermoso/a', french:'Beau/Belle', german:'Schön', arabic:'جميل (Jameel)', bengali:'সুন্দর (Sundar)', japanese:'美しい (Utsukushii)', chinese:'美丽 (Měilì)', portuguese:'Bonito/a', russian:'Красивый (Krasivyy)', italian:'Bello/a', korean:'아름다운 (Areumdaun)', urdu:'خوبصورت', turkish:'Güzel', dutch:'Mooi', swedish:'Vacker', polish:'Piękny', greek:'Όμορφος (Ómorfos)' },
};

const handleTranslation = (text) => {
  const t = text.toLowerCase();
  const langKeys = ['hindi','spanish','french','german','arabic','bengali','japanese','chinese','portuguese','russian','italian','korean','urdu','turkish','dutch','swedish','polish','greek'];
  const targetLang = langKeys.find(l => t.includes(l));
  const word = Object.keys(TRANSLATIONS).find(w => t.includes(w));

  if (word && targetLang) {
    const tr = TRANSLATIONS[word][targetLang];
    return tr ? `## 🌐 Translation\n\n**"${word}"** → **${targetLang.charAt(0).toUpperCase()+targetLang.slice(1)}**:\n\n> # ${tr}\n\n*Pronunciation guide included in brackets.*` : null;
  }
  if (word) {
    const tr  = TRANSLATIONS[word];
    const rows = Object.entries(tr).map(([l,v])=>`| ${l.charAt(0).toUpperCase()+l.slice(1)} | ${v} |`).join('\n');
    return `## 🌐 "${word}" in 18 languages\n\n| Language | Translation |\n|----------|-------------|\n${rows}`;
  }
  if (targetLang) {
    return `## 🌐 Translation to ${targetLang.charAt(0).toUpperCase()+targetLang.slice(1)}\n\nI know these words in ${targetLang}:\n${Object.keys(TRANSLATIONS).map(w=>`- "${w}" → ${TRANSLATIONS[w][targetLang]}`).join('\n')}`;
  }
  return `## 🌐 Translation\n\nI support 18 languages. Try:\n- "Translate hello to Hindi"\n- "How do you say thank you in Japanese?"\n- "Say I love you in Spanish"\n\n**Supported:** Hindi, Spanish, French, German, Arabic, Bengali, Japanese, Chinese, Portuguese, Russian, Italian, Korean, Urdu, Turkish, Dutch, Swedish, Polish, Greek`;
};

// ════════════════════════════════════════════════════════════
// SCIENCE & KNOWLEDGE BASE
// ════════════════════════════════════════════════════════════

const KNOWLEDGE = {
  // Science
  'newton': `## ⚛️ Newton's Laws of Motion\n\n**1st Law (Inertia):** An object stays at rest or in uniform motion unless acted on by external force.\n\n**2nd Law (F=ma):** Force = Mass × Acceleration. Net force causes acceleration proportional to mass.\n\n**3rd Law (Action-Reaction):** Every action has an equal and opposite reaction.\n\n**Examples:** 🚀 Rocket thrust (3rd), 🛒 Shopping cart (2nd), 🎱 Ball at rest (1st)`,
  'relativity': `## 🌌 Einstein's Theory of Relativity\n\n**Special Relativity (1905):**\n- Speed of light is constant for all observers\n- Time dilation: moving clocks run slower\n- Length contraction: moving objects shrink\n- **E = mc²** — mass-energy equivalence\n\n**General Relativity (1915):**\n- Gravity = curvature of spacetime\n- Massive objects warp space and time\n- Predicts: black holes, gravitational waves, GPS corrections`,
  'quantum': `## ⚛️ Quantum Mechanics\n\n**Key principles:**\n1. **Wave-particle duality** — light/matter behave as both\n2. **Uncertainty principle** — can't know position AND momentum precisely: Δx·Δp ≥ ℏ/2\n3. **Superposition** — particles exist in multiple states until measured\n4. **Entanglement** — particles linked regardless of distance\n5. **Quantization** — energy comes in discrete packets (quanta)\n\n**Applications:** Lasers, semiconductors, MRI, quantum computers`,
  'dna': `## 🧬 DNA\n\n**Structure:** Double helix — two complementary strands\n\n**Base pairs:** A↔T and C↔G\n\n**Central Dogma:** DNA → RNA → Protein\n\n**Human genome:** ~3 billion base pairs, ~20,000 genes\n\n**Key facts:**\n- If uncoiled: ~2m long per cell\n- 99.9% identical between any two humans\n- Discovered by Watson & Crick (1953)`,
  'photosynthesis': `## 🌿 Photosynthesis\n\n**Equation:** 6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂\n\n**Stage 1 — Light reactions** (thylakoids):\n- Chlorophyll absorbs sunlight\n- Splits water → O₂ released\n- Produces ATP + NADPH\n\n**Stage 2 — Calvin Cycle** (stroma):\n- Uses ATP + NADPH\n- Fixes CO₂ into glucose\n\n**Importance:** Foundation of food chains, produces O₂`,
  'black hole': `## 🕳️ Black Holes\n\n**What:** Region where gravity is so extreme nothing escapes — not even light\n\n**Formation:** Stars >20× solar mass collapse\n\n**Anatomy:** Singularity (center) → Event horizon (boundary) → Photon sphere → Accretion disk\n\n**Types:** Stellar (3-100 M☉) | Intermediate | Supermassive (Sgr A*: 4 million M☉)\n\n**Effects:** Time dilation, gravitational lensing, spaghettification`,
  // Tech
  'machine learning': `## 🤖 Machine Learning\n\n**Types:**\n- **Supervised:** learns from labeled data (classification, regression)\n- **Unsupervised:** finds patterns (clustering, dimensionality reduction)\n- **Reinforcement:** learns from rewards (game AI, robotics)\n\n**Key algorithms:** Linear/Logistic Regression, Decision Trees, Random Forest, SVM, Neural Networks, K-Means, PCA\n\n**Pipeline:** Data → Preprocessing → Feature Engineering → Model → Evaluation → Deployment`,
  'blockchain': `## ⛓️ Blockchain\n\n**How it works:**\n1. Transaction created → broadcast to network\n2. Nodes validate via consensus\n3. Transactions bundled into a block\n4. Block gets hash + previous block's hash → chained\n5. Immutable — changing one block invalidates all after\n\n**Properties:** Decentralized, Immutable, Transparent, Trustless\n\n**Uses:** Cryptocurrency, Smart contracts, Supply chain, Digital identity, NFTs`,
  'internet': `## 🌐 How the Internet Works\n\n**When you visit a website:**\n1. DNS lookup: "google.com" → 142.250.80.46\n2. TCP handshake with server\n3. HTTPS request sent (encrypted)\n4. Server sends HTML/CSS/JS response\n5. Browser renders the page\n\n**Key protocols:** TCP/IP (data delivery), HTTP/S (web), DNS (naming), TLS (encryption)\n\n**Infrastructure:** ISPs → Internet Exchange Points → Data centers → CDNs`,
  // History & General
  'world war 2': `## ⚔️ World War II (1939-1945)\n\n**Cause:** Nazi Germany's invasion of Poland (Sept 1, 1939)\n\n**Sides:** Allies (UK, USA, USSR, France) vs Axis (Germany, Japan, Italy)\n\n**Key events:**\n- 1940: Fall of France, Battle of Britain\n- 1941: Germany invades USSR, Japan attacks Pearl Harbor → USA joins\n- 1942: Battle of Stalingrad (turning point)\n- 1944: D-Day (June 6) — Allied invasion of Normandy\n- 1945: Germany surrenders (May 8), Japan (Sept 2)\n\n**Casualties:** ~70-85 million (deadliest conflict in history)`,
  'climate change': `## 🌍 Climate Change\n\n**Cause:** Greenhouse gases (CO₂, CH₄, N₂O) trap heat in atmosphere\n\n**Main sources:** Fossil fuels (73%), Deforestation (11%), Agriculture (12%), Industry\n\n**Effects:** Rising temperatures (+1.1°C since pre-industrial), Sea level rise, Extreme weather, Species extinction, Ocean acidification\n\n**Solutions:** Renewable energy, Electric vehicles, Carbon capture, Reforestation, Policy action\n\n**Current status:** Paris Agreement target: limit warming to 1.5-2°C`,
};

const answerKnowledge = (text) => {
  const t = text.toLowerCase();
  for (const [key, answer] of Object.entries(KNOWLEDGE)) {
    if (key.split(' ').every(w => t.includes(w)) || t.includes(key)) return answer;
  }
  // Factual QA
  const facts = {
    'capital of india': '🇮🇳 **New Delhi** is the capital of India.',
    'capital of usa': '🇺🇸 **Washington, D.C.** is the capital of the USA.',
    'capital of china': '🇨🇳 **Beijing** is the capital of China.',
    'capital of japan': '🇯🇵 **Tokyo** is the capital of Japan.',
    'capital of uk': '🇬🇧 **London** is the capital of the UK.',
    'capital of france': '🇫🇷 **Paris** is the capital of France.',
    'capital of germany': '🇩🇪 **Berlin** is the capital of Germany.',
    'capital of australia': '🇦🇺 **Canberra** is the capital of Australia.',
    'capital of canada': '🇨🇦 **Ottawa** is the capital of Canada.',
    'capital of russia': '🇷🇺 **Moscow** is the capital of Russia.',
    'capital of brazil': '🇧🇷 **Brasília** is the capital of Brazil.',
    'capital of pakistan': '🇵🇰 **Islamabad** is the capital of Pakistan.',
    'capital of bangladesh': '🇧🇩 **Dhaka** is the capital of Bangladesh.',
    'largest country': '🌍 **Russia** is the largest country (17.1 million km²).',
    'smallest country': '🌍 **Vatican City** is the smallest country (0.44 km²).',
    'tallest mountain': '⛰️ **Mount Everest** is the tallest mountain at **8,848.86 m**.',
    'largest ocean': '🌊 The **Pacific Ocean** is the largest ocean (165 million km²).',
    'speed of light': '💡 Speed of light = **299,792,458 m/s** ≈ 3×10⁸ m/s in vacuum.',
    'who is einstein': '🧠 **Albert Einstein** (1879-1955): physicist who developed Theory of Relativity (E=mc²), won Nobel Prize 1921.',
    'who is newton': '🍎 **Isaac Newton** (1643-1727): mathematician/physicist, Laws of Motion, Universal Gravitation, invented calculus.',
    'what is python': '🐍 **Python**: high-level, interpreted language by Guido van Rossum (1991). Used in AI/ML, web dev, data science, automation.',
    'what is javascript': '⚡ **JavaScript**: scripting language for the web, runs in browsers + servers (Node.js). Created by Brendan Eich in 1995 in 10 days.',
    'what is react': '⚛️ **React**: JavaScript library for UIs, by Meta (2013). Uses components, virtual DOM, JSX.',
    'what is docker': '🐳 **Docker**: containerization platform. Packages apps + dependencies into portable containers.',
    'elon musk': '🚀 **Elon Musk**: CEO of Tesla & SpaceX, owner of X (Twitter). Born 1971, SA. Known for EVs, rockets, Neuralink, xAI.',
  };
  for (const [k,v] of Object.entries(facts)) {
    if (t.includes(k)) return v;
  }
  return null;
};

// ════════════════════════════════════════════════════════════
// WRITING ENGINE
// ════════════════════════════════════════════════════════════

const handleWriting = (text) => {
  const t = text.toLowerCase();
  if (/email/.test(t))        return writeEmail(t);
  if (/essay/.test(t))        return writeEssay(text);
  if (/poem|poetry/.test(t))  return writePoem(text);
  if (/cover letter/.test(t)) return writeCoverLetter();
  if (/story|fiction/.test(t))return writeStory(text);
  if (/resume|cv/.test(t))    return writeResume();
  if (/blog/.test(t))         return writeBlog(text);
  return null;
};

const writeEmail = (t) => {
  const formal = /formal|professional|business|complaint|request/.test(t);
  return `## ✉️ ${formal?'Professional':'Friendly'} Email Template\n\n\`\`\`\nSubject: [Specific subject line]\n\n${formal?`Dear [Name/Title],\n\nI hope this message finds you well. I am writing to [purpose].\n\n[Context/Background paragraph]\n\n[Details/Request paragraph — be specific]\n\n[Next steps/Call to action]\n\nThank you for your time. I look forward to your response.\n\nBest regards,\n[Full Name]\n[Position | Company]\n[Email | Phone]`:`Hi [Name],\n\nHope you're doing well! [Opening line related to context]\n\n[Main message — keep it brief]\n\n[Any action needed?]\n\nCheers,\n[Your Name]`}\n\`\`\`\n\n**Tips:** Specific subject | State purpose in line 1 | One email = one topic | Clear call-to-action`;
};

const writeEssay = (text) => {
  const topic = text.replace(/write\s+(a\s+)?(an\s+)?essay\s+(about|on)?/i,'').trim()||'your topic';
  return `## 📝 Essay Structure: "${topic}"\n\n**Introduction (10%):**\n- Hook: surprising fact, quote, or question\n- Context: background information\n- Thesis: your main argument (1-2 sentences)\n\n**Body Paragraph 1 (25%):**\n- Topic sentence → Evidence → Analysis → Transition\n\n**Body Paragraph 2 (25%):**\n- Topic sentence → Evidence → Analysis → Transition\n\n**Body Paragraph 3 / Counterargument (25%):**\n- Acknowledge opposing view → Refute with evidence\n\n**Conclusion (15%):**\n- Restate thesis (differently) → Summarize → Broader implication\n\n**Power words:** furthermore, consequently, nevertheless, in contrast, this demonstrates, it is evident that`;
};

const writePoem = (text) => {
  const topic = text.replace(/write\s+(a\s+)?(an\s+)?poem\s+(about|on)?/i,'').trim()||'life';
  return `## 🎭 Original Poem: "${topic}"\n\n---\n\n*In the space between the stars and soil,*\n*Where silence speaks and shadows coil,*\n*The world reveals its hidden face —*\n*A truth that time cannot erase.*\n\n*Like rivers carving ancient stone,*\n*Like seeds that bloom when left alone,*\n*The meaning hides in smallest things:*\n*In morning light, in how dawn sings.*\n\n---\n\n**Other styles I can write:**\n- "Write a haiku about ${topic}" (5-7-5 syllables)\n- "Write a sonnet about ${topic}" (14 lines)\n- "Write a limerick about ${topic}" (AABBA rhyme)`;
};

const writeCoverLetter = () => `## 📄 Cover Letter Template\n\n\`\`\`\n[Name] | [Email] | [Phone] | [LinkedIn]\n[Date]\n\nDear [Hiring Manager],\n\nI am writing to apply for [Position] at [Company]. With [X years] in [field] and\nexpertise in [2-3 skills], I am confident I can contribute meaningfully to your team.\n\nAt [Current Company], I:\n• [Achievement with metric — e.g., improved performance by 40%]\n• [Led/Built/Designed X that resulted in Y]\n• [Relevant project/responsibility]\n\n[Company]'s focus on [something specific] resonates with me because [genuine reason].\nI am excited to bring my [key skill] to [specific team goal].\n\nI would welcome the opportunity to discuss how I can contribute.\n\nSincerely, [Name]\n\`\`\``;

const writeStory = (text) => {
  const topic = text.replace(/write\s+(a\s+)?(an\s+)?story\s+(about)?/i,'').trim()||'adventure';
  return `## 📖 Story: "${topic}"\n\n*Opening:*\n\nThe day everything changed, Maya was standing in the rain outside a building she'd never noticed before — though she'd walked past it a thousand times.\n\nThe sign above the door simply read: *Department of Lost Things.*\n\nShe almost kept walking. Instead, her hand found the door handle, cold and slick with rain, and she pushed it open.\n\nWhat waited inside would alter the next three years of her life.\n\n---\n\n**Story structure to continue:**\n1. **Inciting incident** — Maya enters, discovers her lost memory\n2. **Rising action** — tries to retrieve it, complications arise\n3. **Climax** — confronts what she actually lost\n4. **Resolution** — changed by the journey\n\n*Ask me to continue the story or adjust the genre!*`;
};

const writeResume = () => `## 📋 Resume Template\n\n\`\`\`\n[FULL NAME]\n[City, Country] | [Email] | [Phone] | [LinkedIn] | [GitHub]\n\n── SUMMARY ──────────────────────────────────────\n[2-3 sentences: role, years of experience, top 2 skills, key achievement]\n\n── EXPERIENCE ───────────────────────────────────\n[Job Title] | [Company] | [Dates]\n• [Action verb] + [what you did] + [result/metric]\n• [Action verb] + [what you did] + [result/metric]\n• [Action verb] + [what you did] + [result/metric]\n\n[Previous Job Title] | [Company] | [Dates]\n• [Achievement with numbers]\n\n── SKILLS ───────────────────────────────────────\nLanguages: Python, JavaScript, Java, SQL\nFrameworks: React, Node.js, Django, Express\nTools: Docker, Git, AWS, PostgreSQL\n\n── EDUCATION ────────────────────────────────────\n[Degree] in [Field] | [University] | [Year]\n\n── PROJECTS ─────────────────────────────────────\n[Project Name] — [1-line description] | [GitHub link]\n\`\`\`\n\n**ATS Tips:** Use keywords from the job description | Quantify achievements | Keep to 1-2 pages`;

const writeBlog = (text) => {
  const topic = text.replace(/write\s+(a\s+)?blog\s+(post\s+)?(about|on)?/i,'').trim()||'technology';
  return `## ✍️ Blog Post Structure: "${topic}"\n\n**Title options:**\n- "The Complete Guide to ${topic} in 2025"\n- "Why ${topic} Is Changing Everything"\n- "${topic}: What Nobody Tells You"\n\n**Structure:**\n\n1. **Hook (1 paragraph)** — Surprising stat, bold claim, or story\n2. **Problem** — What pain point does this address?\n3. **Main sections** (3-5 headers):\n   - H2: First key point → explain + example\n   - H2: Second key point → explain + example\n   - H2: Common mistakes to avoid\n4. **Call to action** — What should reader do next?\n\n**SEO tips:** Include keyword in title, first 100 words, and headers | Aim for 1,200-2,000 words | Add internal links`;

};

// ════════════════════════════════════════════════════════════
// INTENT DETECTION (comprehensive)
// ════════════════════════════════════════════════════════════

const detectIntent = (text) => {
  const t = text.toLowerCase().trim();

  const greetWords = ['hi','hello','hey','howdy','hiya','sup','yo','greetings','good morning','good afternoon','good evening','good night','namaste','namaskar','salaam','sat sri akal','hola','bonjour','hallo','ciao','konnichiwa','ni hao','salam','nomoshkar'];
  if (greetWords.some(g => t === g || t.startsWith(g+' ') || t.startsWith(g+'!') || t.startsWith(g+','))) return 'greeting';
  if (/^(bye|goodbye|see (you|ya)|later|cya|good night|farewell|take care|ttyl|adios|au revoir|alvida|xuda hafiz)/.test(t)) return 'farewell';
  if (/^(thanks|thank (you|u)|thx|ty|cheers|merci|gracias|shukriya|dhanyavad|arigato|appreciate)/.test(t)) return 'thanks';
  if (/(who are you|what are you|your name|introduce yourself|what is nexus|what can you do|your capabilities|what do you do|tell me about yourself)/.test(t)) return 'identity';
  if (/(how are you|how r u|you doing|you okay|hows it going|how do you do|are you (ok|fine|good))/.test(t)) return 'how_are_you';
  if (/(what time is it|current time|today'?s? date|what day is it|what year)/.test(t)) return 'datetime';

  // Coding — comprehensive detection
  if (/(write|create|build|make|generate|implement|code|program|develop|design|show me|give me|explain).*(function|class|method|algorithm|script|code|program|app|api|server|website|component|module|snippet|example|solution|implement|sort|search|linked list|tree|graph|stack|queue|hash|dp|dynamic|recursion|pattern|regex|sql|query|loop|array|string|dict|object|async|thread|process|file|error|exception|test|debug)/.test(t)) return 'coding';
  if (/(fibonacci|factorial|palindrome|anagram|prime|sorting|binary search|linked list|binary tree|graph|bfs|dfs|dijkstra|two sum|matrix|dynamic programming|dp problem|lru cache|trie|heap|priority queue|backtracking|sliding window|merge sort|quick sort|bubble sort|selection sort|insertion sort|radix sort|counting sort|hash map|hash table|stack overflow|rest api|crud|express|flask|django|react|node|vue|angular|spring|laravel|design pattern|singleton|factory|observer|decorator|strategy|oop|inheritance|polymorphism|encapsulation|abstraction|machine learning|neural network|linear regression|recursion|async|await|promise|coroutine|thread|mutex|semaphore|socket|websocket|regex|regular expression)/.test(t)) return 'coding';
  if (/(in python|in javascript|in java|in c\+\+|in c#|in php|in ruby|in go|in rust|in swift|in kotlin|in typescript|in bash|in sql|in r\b|in dart|in scala|python code|js code|java code)/.test(t)) return 'coding';
  if (/^(debug|fix|optimize|refactor|review|explain|what('s| is) wrong with|why (is|does) this|how (to|do) (fix|debug|optimize))/.test(t) && /(code|function|error|bug|issue|crash|exception|warning)/.test(t)) return 'coding';

  // Math
  if (/(solve|calculate|compute|evaluate|simplify|find|what is \d|how much is|\d+\s*[\+\-\*\/\^]\s*\d|integral|derivative|differentiate|integrate|limit|quadratic|linear equation|matrix|vector|probability|statistics|mean|median|mode|standard deviation|variance|percentage|fraction|prime|factorial|fibonacci|pythagorean|logarithm|exponent|square root|cube root|gcd|lcm|compound interest|permutation|combination|binomial)/.test(t)) return 'math';
  if (/^[\d\s\+\-\*\/\^\(\)\.%,]+$/.test(t) && /\d/.test(t)) return 'math_expr';

  // Translation
  if (/(translate|translation|in (hindi|spanish|french|german|arabic|bengali|japanese|chinese|portuguese|russian|italian|korean|urdu|turkish|dutch|swedish|polish|greek)|say .* in|how (do you|to) say|what is .* in (hindi|spanish|french|german|arabic|bengali|japanese|chinese))/.test(t)) return 'translation';

  // Writing
  if (/(write (a |an |me )?(email|essay|poem|story|article|blog|letter|cover letter|resume|cv|speech|report|paragraph|caption|script|dialogue|summary|description)|draft|proofread|improve (my |this )?writing|paraphrase|rephrase|rewrite|summarize)/.test(t)) return 'writing';

  // Science
  if (/(explain|what is|how does|describe|define|tell me about).*(physics|chemistry|biology|science|atom|molecule|cell|dna|evolution|quantum|gravity|force|energy|thermodynamics|electricity|magnetism|photosynthesis|ecosystem|planet|solar system|galaxy|universe|black hole|relativity|newton|einstein|darwin|periodic table|element|compound|reaction|acid|base|osmosis|mitosis|climate change|environment)/.test(t)) return 'science';

  // Question / search
  if (/(what|who|when|where|which|how|why|is it|are there|can you|could you|tell me|do you know|explain|describe|define|difference between|compare|vs\.|versus|pros and cons)/.test(t)) return 'question';

  return 'general';
};

// ════════════════════════════════════════════════════════════
// SMART STREAM
// ════════════════════════════════════════════════════════════

const streamResponse = async (text, onChunk) => {
  const parts = text.split(/(\s+)/);
  for (const part of parts) {
    onChunk(part);
    if (/\n\n/.test(part)) await new Promise(r => setTimeout(r, 20));
    else if (/\n/.test(part)) await new Promise(r => setTimeout(r, 10));
    else await new Promise(r => setTimeout(r, 8));
  }
};

// ════════════════════════════════════════════════════════════
// MAIN GENERATE
// ════════════════════════════════════════════════════════════

exports.generate = async (messages, onChunk) => {
  const lastUser = [...messages].reverse().find(m => m.role === 'user');
  if (!lastUser) {
    const msg = 'Hello! I\'m Nexus AI. How can I help you today?';
    await streamResponse(msg, onChunk);
    return { content: msg, provider: 'builtin', tokens: { total: 0 } };
  }

  const text   = lastUser.content.trim();
  const intent = detectIntent(text);
  let response = null;

  // ── ROUTING ──────────────────────────────────────────────

  if (intent === 'greeting') {
    const opts = [
      `Hello! 👋 I'm **Nexus AI**, your advanced assistant.\n\nI can help you with:\n- 💻 **Coding** — any language, any problem\n- 🧮 **Math & Science** — calculations, explanations\n- ✍️ **Writing** — emails, essays, stories, resumes\n- 🌐 **Translation** — 18 languages\n- 🔍 **Research** — web search + Wikipedia\n- 💡 **Explanations** — any topic, any complexity\n\nWhat would you like to explore?`,
      `Hey there! 😊 I'm **Nexus AI** — your coding buddy, tutor, writer, and research assistant in one. What can I help you with today?`,
      `Hi! Great to meet you. I'm **Nexus AI**. I specialize in coding problems, math, science, writing, translations, and real-world research. Ask me anything!`,
    ];
    response = opts[Math.floor(Math.random()*opts.length)];
  }

  else if (intent === 'farewell') {
    const opts = ['Goodbye! 👋 Hope to chat again soon!', 'See you later! Take care! 😊', 'Bye! Come back whenever you need help. I\'ll be here! 🌟'];
    response = opts[Math.floor(Math.random()*opts.length)];
  }

  else if (intent === 'thanks') {
    const opts = ['You\'re welcome! 😊 Happy to help!', 'My pleasure! Let me know if there\'s anything else. 🙌', 'Anytime! That\'s what I\'m here for. 😄'];
    response = opts[Math.floor(Math.random()*opts.length)];
  }

  else if (intent === 'identity') {
    response = `## 🤖 I'm Nexus AI\n\nI'm a built-in AI assistant with broad capabilities:\n\n| Capability | What I can do |\n|-----------|---------------|\n| 💻 Coding | Python, JS, Java, C++, Go, Rust, SQL and more |\n| 🧮 Math | Algebra, calculus, statistics, number theory |\n| 🔬 Science | Physics, chemistry, biology, astronomy |\n| ✍️ Writing | Emails, essays, stories, resumes, poems |\n| 🌐 Translation | 18 languages |\n| 🔍 Search | Wikipedia + DuckDuckGo + StackOverflow |\n| 💡 Explain | Any concept, any complexity level |\n\n*For even more powerful AI, add an OpenRouter API key to your .env file.*`;
  }

  else if (intent === 'how_are_you') {
    response = "I'm functioning at full capacity and ready to help! 💪 What would you like to work on?";
  }

  else if (intent === 'datetime') {
    const now = new Date();
    response = `🕐 **Current date/time:**\n\n${now.toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}\n${now.toLocaleTimeString('en-US')}\n\n*Note: This is the server time. Your local time may differ.*`;
  }

  else if (intent === 'coding') {
    const lang  = detectProgrammingLang(text);
    const topic = detectCodeTopic(text);

    if (topic && CODE_SOLUTIONS[topic]) {
      const solution = CODE_SOLUTIONS[topic];
      const code = solution[lang] || solution['python'] || Object.values(solution)[0];
      const titles = { fibonacci:'Fibonacci', sorting:'Sorting Algorithms', binary_tree:'Binary Search Tree', graph:'Graph Algorithms', rest_api:'REST API', design_patterns:'Design Patterns', machine_learning:'Machine Learning', async_programming:'Async Programming' };
      response = `## 💻 ${titles[topic]} in ${lang.charAt(0).toUpperCase()+lang.slice(1)}\n\n\`\`\`${lang}\n${code}\n\`\`\``;
    } else {
      const generic = generateGenericCode(text, lang);
      if (generic) {
        response = `## 💻 Code in ${lang.charAt(0).toUpperCase()+lang.slice(1)}\n\n\`\`\`${generic.lang}\n${generic.code}\n\`\`\``;
      } else {
        // Search StackOverflow for coding question
        const soResults = await searchStackOverflow(text);
        if (soResults.length > 0) {
          response = `## 💻 Coding: "${text.slice(0,60)}"\n\n**Found on StackOverflow:**\n\n${soResults.map((r,i)=>`**[${i+1}] [${r.title}](${r.url})**\n${r.snippet}`).join('\n\n')}\n\n**I can also generate code for:**\n- Fibonacci, Sorting, Binary Tree, Graph algorithms\n- REST APIs (Flask/Express), Design Patterns\n- Machine Learning from scratch\n- Async programming, Data structures\n\n*What specific code would you like me to write?*`;
        } else {
          response = `## 💻 Coding Assistant\n\nI can write code in: **Python, JavaScript, TypeScript, Java, C++, C#, Go, Rust, Swift, Kotlin, PHP, Ruby, SQL, Bash, HTML/CSS, Dart, Scala**\n\n**Ask me to:**\n- Write specific algorithms (sorting, searching, graph traversal)\n- Build data structures (trees, graphs, linked lists, heaps)\n- Create APIs (Flask, Express, FastAPI, Spring)\n- Implement design patterns\n- Solve competitive programming problems\n- Write ML algorithms from scratch\n\nBe specific: *"Write a binary search tree in Python"* or *"Create a REST API with authentication in Node.js"*`;
        }
      }
    }
  }

  else if (intent === 'math' || intent === 'math_expr') {
    response = solveMath(text);
    if (!response) {
      response = `## 🧮 Math Assistant\n\nI can solve:\n\n**Arithmetic & Algebra:**\n- \`2 + 2\`, \`15% of 2500\`, \`√144\`, \`2^10\`\n- Quadratic equations: "solve x² - 5x + 6 = 0"\n- Linear equations, simultaneous equations\n\n**Statistics:** Mean, median, mode, std deviation\n\n**Number Theory:** Prime check, GCD, LCM, factorization\n\n**Geometry:** Pythagorean theorem, area, perimeter\n\n**Finance:** Compound interest, loan EMI\n\n*Try: "Find GCD of 48 and 36" or "15% of 8500" or "statistics of: 4 7 2 9 4 1 7"*`;
    }
  }

  else if (intent === 'translation') {
    response = handleTranslation(text);
  }

  else if (intent === 'writing') {
    response = handleWriting(text);
    if (!response) {
      response = `## ✍️ Writing Assistant\n\nI can help you write:\n\n- 📧 **Emails** — professional, complaint, inquiry\n- 📝 **Essays** — structure, thesis, arguments\n- 📖 **Stories** — fiction, with plot structure\n- 🎭 **Poems** — free verse, haiku, sonnet\n- 📄 **Cover letters** & **Resumes**\n- ✍️ **Blog posts** — with SEO tips\n- 💼 **Reports** — structured, professional\n\n*Try: "Write a professional email to request a meeting" or "Write an essay about AI"*`;
    }
  }

  else if (intent === 'science') {
    response = answerKnowledge(text);
    if (!response) {
      // Wikipedia search
      const query = text.replace(/^(what is|explain|describe|tell me about|how does)\s*/i,'').trim();
      const wiki  = await searchWikipedia(query);
      if (wiki) response = `## 🔬 ${wiki.title}\n\n${wiki.snippet}\n\n[Read more on Wikipedia](${wiki.url})`;
    }
    if (!response) response = `## 🔬 Science\n\nI can explain: **Physics, Chemistry, Biology, Astronomy, Earth Science, Environmental Science**\n\nTry: "Explain quantum mechanics", "What is DNA?", "How does photosynthesis work?", "Explain black holes"`;
  }

  else if (intent === 'question' || intent === 'general') {
    // Try knowledge base first
    response = answerKnowledge(text);

    // Then multi-source web search
    if (!response) {
      const query = text.replace(/^(what is|who is|where is|when is|how does|why does|tell me about|explain|describe|define|what are|is it true that|can you tell me)\s*/i, '').trim();

      // Parallel search: Wikipedia + DDG
      const [wiki, ddg] = await Promise.all([
        searchWikipedia(query || text),
        searchDDG(query || text),
      ]);

      if (wiki && wiki.snippet.length > 50) {
        response = `## 📚 ${wiki.title}\n\n${wiki.snippet}${ddg.length>0 ? `\n\n**Related:**\n${ddg.slice(0,2).map((r,i)=>`${i+1}. [${r.title}](${r.url})`).join('\n')}` : ''}\n\n*Source: Wikipedia*`;
      } else if (ddg.length > 0) {
        response = `## 🔍 Results: "${text.slice(0,50)}"\n\n${ddg.slice(0,4).map((r,i)=>`**${i+1}. ${r.title}**\n${r.snippet}`).join('\n\n')}\n\n*Sources searched: DuckDuckGo*`;
      }
    }
  }

  // ── ABSOLUTE FALLBACK — never leave user empty-handed ────────
  if (!response) {
    // Last resort: search everything
    const [ddg, wiki] = await Promise.all([
      searchDDG(text),
      searchWikipedia(text.split(' ').slice(0,4).join(' ')),
    ]);

    if (wiki?.snippet) {
      response = `## 📚 Here's what I found about "${text.slice(0,50)}"\n\n${wiki.snippet}\n\n[Read more](${wiki.url})`;
    } else if (ddg.length > 0 && ddg[0].snippet) {
      response = `## 🔍 "${text.slice(0,50)}"\n\n${ddg.slice(0,3).map((r,i)=>`**${r.title}**\n${r.snippet}`).join('\n\n')}`;
    } else {
      response = `I received your message: **"${text}"**\n\nI can help you with:\n\n| Ask me to... | Example |\n|-------------|----------|\n| Write code | "Write quicksort in Python" |\n| Solve math | "Calculate compound interest: P=10000, r=8%, t=5 years" |\n| Explain science | "Explain quantum entanglement" |\n| Translate | "Say beautiful in French" |\n| Write content | "Write a cover letter for software engineer" |\n| Research anything | "What is the James Webb telescope?" |\n\nPlease be more specific and I'll give you a detailed answer! 🚀`;
    }
  }

  await streamResponse(response, onChunk);
  return { content: response, provider: 'builtin', tokens: { prompt: 0, completion: 0, total: 0 } };
};

exports.MODEL_ID = 'nexus-builtin';