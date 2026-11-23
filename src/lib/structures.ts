/* Immutable data-structure operations that also report which nodes they touched. */

export interface Result<T> {
  value: T;
  visited: number[]; // indices or node keys touched, in order
  message: string;
  cost: string; // Big-O of this operation
  ok: boolean;
}

/* ---------- Stack (top = end of array) ---------- */
export function push(s: number[], v: number): Result<number[]> {
  return { value: [...s, v], visited: [s.length], message: `Pushed ${v} onto the top`, cost: 'O(1)', ok: true };
}
export function pop(s: number[]): Result<number[]> & { popped?: number } {
  if (!s.length) return { value: s, visited: [], message: 'The stack is empty — nothing to pop (underflow)', cost: 'O(1)', ok: false };
  return { value: s.slice(0, -1), visited: [s.length - 1], message: `Popped ${s[s.length - 1]} from the top`, cost: 'O(1)', ok: true, popped: s[s.length - 1] };
}

/* ---------- Queue (front = index 0) with a capacity ---------- */
export function enqueue(q: number[], v: number, capacity: number): Result<number[]> {
  if (q.length >= capacity) return { value: q, visited: [], message: `The queue is full (capacity ${capacity}) — overflow`, cost: 'O(1)', ok: false };
  return { value: [...q, v], visited: [q.length], message: `Enqueued ${v} at the back`, cost: 'O(1)', ok: true };
}
export function dequeue(q: number[]): Result<number[]> {
  if (!q.length) return { value: q, visited: [], message: 'The queue is empty — nothing to dequeue', cost: 'O(1)', ok: false };
  return { value: q.slice(1), visited: [0], message: `Dequeued ${q[0]} from the front`, cost: 'O(1)', ok: true };
}

/* ---------- Singly linked list (represented as an array of values, head first) ---------- */
export function insertAt(list: number[], index: number, v: number): Result<number[]> {
  if (!Number.isInteger(index) || index < 0 || index > list.length) return { value: list, visited: [], message: `Position must be between 0 and ${list.length}`, cost: 'O(n)', ok: false };
  const visited = Array.from({ length: index }, (_, i) => i);
  const out = [...list.slice(0, index), v, ...list.slice(index)];
  return { value: out, visited, message: index === 0 ? `Inserted ${v} at the head — no traversal needed` : `Walked ${index} node${index === 1 ? '' : 's'}, then linked in ${v}`, cost: index === 0 ? 'O(1)' : 'O(n)', ok: true };
}
export function removeValue(list: number[], v: number): Result<number[]> {
  const i = list.indexOf(v);
  const visited = Array.from({ length: i < 0 ? list.length : i + 1 }, (_, k) => k);
  if (i < 0) return { value: list, visited, message: `${v} isn’t in the list (checked ${list.length} node${list.length === 1 ? '' : 's'})`, cost: 'O(n)', ok: false };
  return { value: [...list.slice(0, i), ...list.slice(i + 1)], visited, message: `Removed ${v}: its predecessor now points past it`, cost: 'O(n)', ok: true };
}
export function find(list: number[], v: number): Result<number[]> & { index: number } {
  const i = list.indexOf(v);
  const visited = Array.from({ length: i < 0 ? list.length : i + 1 }, (_, k) => k);
  return { value: list, visited, index: i, message: i < 0 ? `${v} not found after ${list.length} step${list.length === 1 ? '' : 's'}` : `Found ${v} at position ${i} after ${i + 1} step${i ? 's' : ''}`, cost: 'O(n)', ok: i >= 0 };
}
export function reverse(list: number[]): Result<number[]> {
  return { value: [...list].reverse(), visited: list.map((_, i) => i), message: `Reversed ${list.length} links in one pass`, cost: 'O(n)', ok: true };
}

/* ---------- Binary search tree ---------- */
export interface BNode {
  key: number;
  left: BNode | null;
  right: BNode | null;
}

export function bstInsert(root: BNode | null, key: number): Result<BNode | null> {
  const path: number[] = [];
  const ins = (n: BNode | null): BNode => {
    if (!n) return { key, left: null, right: null };
    path.push(n.key);
    if (key < n.key) return { ...n, left: ins(n.left) };
    return { ...n, right: ins(n.right) };
  };
  if (bstSearch(root, key).ok) return { value: root, visited: bstSearch(root, key).visited, message: `${key} is already in the tree — duplicates are not inserted`, cost: 'O(h)', ok: false };
  const value = ins(root);
  return { value, visited: [...path, key], message: path.length ? `Compared with ${path.join(' → ')}, then placed ${key}` : `${key} becomes the root`, cost: 'O(h)', ok: true };
}

export function bstSearch(root: BNode | null, key: number): Result<BNode | null> {
  const visited: number[] = [];
  let n = root;
  while (n) {
    visited.push(n.key);
    if (key === n.key) return { value: root, visited, message: `Found ${key} after ${visited.length} comparison${visited.length === 1 ? '' : 's'}`, cost: 'O(h)', ok: true };
    n = key < n.key ? n.left : n.right;
  }
  return { value: root, visited, message: `${key} is not in the tree (${visited.length} comparison${visited.length === 1 ? '' : 's'})`, cost: 'O(h)', ok: false };
}

export function bstDelete(root: BNode | null, key: number): Result<BNode | null> {
  const found = bstSearch(root, key);
  if (!found.ok) return { ...found, message: `${key} is not in the tree — nothing to delete` };
  let message = '';
  const del = (n: BNode | null, k: number): BNode | null => {
    if (!n) return null;
    if (k < n.key) return { ...n, left: del(n.left, k) };
    if (k > n.key) return { ...n, right: del(n.right, k) };
    if (!n.left && !n.right) { message ||= `Removed leaf ${k}`; return null; }
    if (!n.left || !n.right) { message ||= `Removed ${k}; its only child moves up`; return n.left ?? n.right; }
    let s = n.right;
    while (s.left) s = s.left;
    message ||= `${k} has two children: replaced it with its in-order successor ${s.key}`;
    return { ...n, key: s.key, right: del(n.right, s.key) };
  };
  return { value: del(root, key), visited: found.visited, message, cost: 'O(h)', ok: true };
}

export function fromKeys(keys: number[]): BNode | null {
  return keys.reduce<BNode | null>((r, k) => bstInsert(r, k).value, null);
}

export type Order = 'in' | 'pre' | 'post' | 'level';
export function traverse(root: BNode | null, order: Order): number[] {
  const out: number[] = [];
  if (order === 'level') {
    const q = root ? [root] : [];
    while (q.length) { const n = q.shift()!; out.push(n.key); if (n.left) q.push(n.left); if (n.right) q.push(n.right); }
    return out;
  }
  const walk = (n: BNode | null) => {
    if (!n) return;
    if (order === 'pre') out.push(n.key);
    walk(n.left);
    if (order === 'in') out.push(n.key);
    walk(n.right);
    if (order === 'post') out.push(n.key);
  };
  walk(root);
  return out;
}

export const height = (n: BNode | null): number => (n ? 1 + Math.max(height(n.left), height(n.right)) : 0);
export const size = (n: BNode | null): number => (n ? 1 + size(n.left) + size(n.right) : 0);

/** Lays out nodes: x from in-order position, y from depth. */
export function layout(root: BNode | null) {
  const nodes: { key: number; x: number; y: number }[] = [];
  const edges: { from: number; to: number }[] = [];
  let i = 0;
  const walk = (n: BNode | null, d: number) => {
    if (!n) return;
    walk(n.left, d + 1);
    nodes.push({ key: n.key, x: i++, y: d });
    walk(n.right, d + 1);
    if (n.left) edges.push({ from: n.key, to: n.left.key });
    if (n.right) edges.push({ from: n.key, to: n.right.key });
  };
  walk(root, 0);
  return { nodes, edges };
}

/* ---------- Min-heap (array) ---------- */
export function heapPush(h: number[], v: number): Result<number[]> {
  const a = [...h, v];
  const visited = [a.length - 1];
  let i = a.length - 1, swaps = 0;
  while (i > 0) {
    const p = Math.floor((i - 1) / 2);
    if (a[p] <= a[i]) break;
    [a[p], a[i]] = [a[i], a[p]];
    i = p;
    swaps++;
    visited.push(i);
  }
  return { value: a, visited, message: `Added ${v} at the end and sifted it up ${swaps} level${swaps === 1 ? '' : 's'}`, cost: 'O(log n)', ok: true };
}

export function heapPop(h: number[]): Result<number[]> & { min?: number } {
  if (!h.length) return { value: h, visited: [], message: 'The heap is empty', cost: 'O(log n)', ok: false };
  const a = [...h];
  const min = a[0];
  const last = a.pop()!;
  const visited = [0];
  if (a.length) {
    a[0] = last;
    let i = 0;
    for (;;) {
      const l = 2 * i + 1, r = l + 1;
      let m = i;
      if (l < a.length && a[l] < a[m]) m = l;
      if (r < a.length && a[r] < a[m]) m = r;
      if (m === i) break;
      [a[i], a[m]] = [a[m], a[i]];
      i = m;
      visited.push(i);
    }
  }
  return { value: a, visited, min, message: `Removed the minimum ${min}; moved the last item to the root and sifted it down ${visited.length - 1} level${visited.length === 2 ? '' : 's'}`, cost: 'O(log n)', ok: true };
}

export function isMinHeap(a: number[]): boolean {
  return a.every((v, i) => i === 0 || a[Math.floor((i - 1) / 2)] <= v);
}

export function parseValue(text: string): number | null {
  if (!/^-?\d{1,3}$/.test(text.trim())) return null;
  return Number(text.trim());
}
