import { describe, expect, it } from 'vitest';
import { bstDelete, bstInsert, bstSearch, dequeue, enqueue, find, fromKeys, heapPop, heapPush, height, insertAt, isMinHeap, layout, parseValue, pop, push, removeValue, reverse, size, traverse } from './structures';

describe('stack and queue', () => {
  it('pushes and pops from the top, reporting underflow', () => {
    const s = push(push([], 1).value, 2).value;
    expect(s).toEqual([1, 2]);
    expect(pop(s)).toMatchObject({ value: [1], popped: 2, ok: true });
    expect(pop([]).ok).toBe(false);
  });
  it('enqueues at the back, dequeues from the front, and respects capacity', () => {
    expect(dequeue(enqueue([1, 2], 3, 5).value).value).toEqual([2, 3]);
    expect(enqueue([1, 2], 3, 2).ok).toBe(false);
    expect(dequeue([]).message).toMatch(/empty/);
  });
});

describe('linked list', () => {
  it('inserts with the right traversal and cost', () => {
    expect(insertAt([1, 2, 3], 0, 9)).toMatchObject({ value: [9, 1, 2, 3], visited: [], cost: 'O(1)' });
    expect(insertAt([1, 2, 3], 2, 9)).toMatchObject({ value: [1, 2, 9, 3], visited: [0, 1], cost: 'O(n)' });
    expect(insertAt([1], 3, 9).ok).toBe(false);
  });
  it('finds, removes and reverses', () => {
    expect(find([4, 5, 6], 6)).toMatchObject({ index: 2, visited: [0, 1, 2], ok: true });
    expect(find([4, 5, 6], 7)).toMatchObject({ index: -1, visited: [0, 1, 2], ok: false });
    expect(removeValue([4, 5, 5, 6], 5).value).toEqual([4, 5, 6]);
    expect(removeValue([4], 9).ok).toBe(false);
    expect(reverse([1, 2, 3]).value).toEqual([3, 2, 1]);
  });
});

describe('binary search tree', () => {
  const t = fromKeys([50, 30, 70, 20, 40, 60, 80, 35]);
  it('keeps BST order and computes size and height', () => {
    expect(traverse(t, 'in')).toEqual([20, 30, 35, 40, 50, 60, 70, 80]);
    expect(traverse(t, 'pre')).toEqual([50, 30, 20, 40, 35, 70, 60, 80]);
    expect(traverse(t, 'post')).toEqual([20, 35, 40, 30, 60, 80, 70, 50]);
    expect(traverse(t, 'level')).toEqual([50, 30, 70, 20, 40, 60, 80, 35]);
    expect(size(t)).toBe(8);
    expect(height(t)).toBe(4);
  });
  it('reports search paths and refuses duplicates', () => {
    expect(bstSearch(t, 35).visited).toEqual([50, 30, 40, 35]);
    expect(bstSearch(t, 65)).toMatchObject({ ok: false, visited: [50, 70, 60] });
    expect(bstInsert(t, 40).ok).toBe(false);
    expect(bstInsert(t, 65).visited).toEqual([50, 70, 60, 65]);
  });
  it('handles all three delete cases', () => {
    const leaf = bstDelete(t, 20);
    expect(leaf.message).toMatch(/leaf/);
    expect(traverse(leaf.value, 'in')).toEqual([30, 35, 40, 50, 60, 70, 80]);
    const one = bstDelete(t, 40);
    expect(one.message).toMatch(/only child/);
    expect(traverse(one.value, 'in')).toEqual([20, 30, 35, 50, 60, 70, 80]);
    const two = bstDelete(t, 30);
    expect(two.message).toMatch(/successor 35/);
    expect(traverse(two.value, 'in')).toEqual([20, 35, 40, 50, 60, 70, 80]);
    expect(traverse(t, 'in')).toHaveLength(8); // original untouched
    expect(bstDelete(t, 99).ok).toBe(false);
  });
  it('lays out nodes by in-order position and depth', () => {
    const { nodes, edges } = layout(fromKeys([2, 1, 3]));
    expect(nodes).toEqual([{ key: 1, x: 0, y: 1 }, { key: 2, x: 1, y: 0 }, { key: 3, x: 2, y: 1 }]);
    expect(edges).toHaveLength(2);
  });
});

describe('min-heap', () => {
  it('keeps the heap property through pushes and pops', () => {
    let h: number[] = [];
    for (const v of [5, 3, 8, 1, 9, 2]) { h = heapPush(h, v).value; expect(isMinHeap(h)).toBe(true); }
    expect(h[0]).toBe(1);
    const out: number[] = [];
    while (h.length) { const r = heapPop(h); out.push(r.min!); h = r.value; expect(isMinHeap(h)).toBe(true); }
    expect(out).toEqual([1, 2, 3, 5, 8, 9]);
  });
  it('records the sift path', () => {
    expect(heapPush([1, 3, 5, 7], 0).visited).toEqual([4, 1, 0]);
    expect(heapPop([]).ok).toBe(false);
  });
  it('parses small integer input', () => {
    expect(parseValue(' 42 ')).toBe(42);
    expect(parseValue('-7')).toBe(-7);
    expect(parseValue('1000')).toBeNull();
    expect(parseValue('x')).toBeNull();
  });
});
