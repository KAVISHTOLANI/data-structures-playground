import { useState, type ReactNode } from 'react';
import { Landing, NotFound, Notice, PageHead, Shell, usePersistentState, useRoute } from './shared/ui';
import { bstDelete, bstInsert, bstSearch, dequeue, enqueue, find, fromKeys, heapPop, heapPush, height, insertAt, layout, parseValue, pop, push, removeValue, reverse, size, traverse, type BNode, type Order, type Result } from './lib/structures';

const KEY = 'node-garden:store';
const NAV = [
  { to: '/', label: 'Overview' },
  { to: '/stack', label: 'Stack' },
  { to: '/queue', label: 'Queue' },
  { to: '/list', label: 'Linked list' },
  { to: '/bst', label: 'Search tree' },
  { to: '/heap', label: 'Heap' },
];
const CAPACITY = 8;

interface LogEntry { op: string; message: string; cost: string; ok: boolean }
interface Store {
  stack: number[];
  queue: number[];
  list: number[];
  bst: BNode | null;
  heap: number[];
  logs: Record<string, LogEntry[]>;
}

const initial = (): Store => ({ stack: [12, 7, 31], queue: [4, 18, 9, 27], list: [8, 15, 23, 42], bst: fromKeys([50, 30, 70, 20, 40, 60, 80, 35, 65]), heap: [2, 5, 3, 9, 6, 8, 4], logs: {} });

export default function App() {
  const [route] = useRoute();
  const [store, setStore] = usePersistentState<Store>(KEY, initial);
  const ctx = { store, setStore };
  let page: ReactNode;
  if (route === '/') page = <Home />;
  else if (route === '/stack') page = <StackPage {...ctx} />;
  else if (route === '/queue') page = <QueuePage {...ctx} />;
  else if (route === '/list') page = <ListPage {...ctx} />;
  else if (route === '/bst') page = <BstPage {...ctx} />;
  else if (route === '/heap') page = <HeapPage {...ctx} />;
  else page = <NotFound />;
  return (
    <Shell name="Node Garden" wordmark={['Node', 'Garden']} nav={NAV} route={route} cta={{ to: '/bst', label: 'Grow a tree' }} footerNote="Each structure keeps its state in this browser; use Reset to start again.">
      {page}
    </Shell>
  );
}

type Ctx = { store: Store; setStore: (s: Store) => void };

/** Applies an operation result and records it in the page’s log. */
function useOp(store: Store, setStore: (s: Store) => void, page: string) {
  const [last, setLast] = useState<{ visited: number[]; message: string; ok: boolean; tick: number } | null>(null);
  function apply<T>(op: string, r: Result<T>, patch: (v: T) => Partial<Store>) {
    setStore({ ...store, ...(r.ok ? patch(r.value) : {}), logs: { ...store.logs, [page]: [{ op, message: r.message, cost: r.cost, ok: r.ok }, ...(store.logs[page] ?? [])].slice(0, 12) } });
    setLast({ visited: r.visited, message: r.message, ok: r.ok, tick: Date.now() });
  }
  return { last, apply, log: store.logs[page] ?? [] };
}

function ValueInput({ label, onSubmit, buttons, hint }: { label: string; onSubmit?: (v: number) => void; buttons: { label: string; need?: boolean; act: (v: number | null) => void; primary?: boolean }[]; hint?: string }) {
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const run = (b: (typeof buttons)[number]) => {
    const v = parseValue(text);
    if (b.need !== false && v == null) return setErr('Enter a whole number from −999 to 999.');
    setErr(null);
    b.act(v);
    if (b.need !== false) setText('');
  };
  return (
    <form className="card ops" onSubmit={(e) => { e.preventDefault(); run(buttons[0]); onSubmit?.(Number(text)); }} noValidate>
      <div className="field">
        <label htmlFor="val">{label}</label>
        <input id="val" inputMode="numeric" value={text} onChange={(e) => setText(e.target.value)} aria-invalid={!!err} aria-describedby={err ? 'val-err' : hint ? 'val-hint' : undefined} />
        {hint && !err && <span className="hint" id="val-hint">{hint}</span>}
        {err && <span className="error-text" id="val-err">{err}</span>}
      </div>
      <div className="row">{buttons.map((b, i) => <button key={b.label} type={i === 0 ? 'submit' : 'button'} className={`btn ${b.primary || i === 0 ? 'btn-primary' : ''}`} onClick={i === 0 ? undefined : () => run(b)}>{b.label}</button>)}</div>
    </form>
  );
}

function Log({ log }: { log: LogEntry[] }) {
  if (!log.length) return <p className="small muted">Operations you run appear here with their cost.</p>;
  return <ol className="oplog" aria-label="Operation log">{log.map((l, i) => <li key={i} className={l.ok ? '' : 'fail'}><span className="mono op">{l.op}</span><span>{l.message}</span><span className="badge">{l.cost}</span></li>)}</ol>;
}

function Status({ last }: { last: ReturnType<typeof useOp>['last'] }) {
  if (!last) return null;
  return <Notice kind={last.ok ? 'info' : 'warn'}><span data-testid="message">{last.message}</span></Notice>;
}

function Cells({ values, visited, tick, labels, vertical }: { values: number[]; visited: number[]; tick?: number; labels?: (i: number) => string | null; vertical?: boolean }) {
  return (
    <ol className={`cells ${vertical ? 'vertical' : ''}`} key={tick}>
      {values.map((v, i) => {
        const step = visited.indexOf(i);
        return (
          <li key={`${i}-${v}`} className={`cell ${step >= 0 ? 'hit' : ''}`} style={{ ['--d' as string]: `${Math.max(0, step) * 180}ms` }}>
            <b>{v}</b>{labels?.(i) && <span className="cell-l">{labels(i)}</span>}
          </li>
        );
      })}
      {!values.length && <li className="cell empty">empty</li>}
    </ol>
  );
}

/* ---------- Tree drawing (used by BST and heap) ---------- */
function Tree({ nodes, edges, visited, tick, label }: { nodes: { id: number; label: number; x: number; y: number }[]; edges: { from: number; to: number }[]; visited: number[]; tick?: number; label: string }) {
  if (!nodes.length) return <p className="muted">The tree is empty.</p>;
  const cols = Math.max(...nodes.map((n) => n.x)) + 1, rows = Math.max(...nodes.map((n) => n.y)) + 1;
  const W = Math.max(320, cols * 52), H = rows * 70 + 20;
  const px = (n: { x: number }) => 26 + n.x * ((W - 52) / Math.max(1, cols - 1));
  const py = (n: { y: number }) => 30 + n.y * 70;
  const by = new Map(nodes.map((n) => [n.id, n]));
  return (
    <svg className="tree" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} key={tick}>
      {edges.map((e) => { const a = by.get(e.from)!, b = by.get(e.to)!; return <line key={`${e.from}-${e.to}`} x1={px(a)} y1={py(a)} x2={px(b)} y2={py(b)} className="edge" />; })}
      {nodes.map((n) => {
        const step = visited.indexOf(n.id);
        return (
          <g key={n.id} transform={`translate(${px(n)},${py(n)})`} className={`tnode ${step >= 0 ? 'hit' : ''}`} style={{ ['--d' as string]: `${Math.max(0, step) * 220}ms` }}>
            <circle r={20} />
            <text y={5} textAnchor="middle">{n.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function bstView(root: BNode | null) {
  const { nodes, edges } = layout(root);
  return { nodes: nodes.map((n) => ({ id: n.key, label: n.key, x: n.x, y: n.y })), edges };
}

function heapView(a: number[]) {
  const depth = (i: number) => Math.floor(Math.log2(i + 1));
  const rows = a.length ? depth(a.length - 1) + 1 : 0;
  const cols = 2 ** Math.max(0, rows - 1);
  const nodes = a.map((v, i) => { const d = depth(i), pos = i - (2 ** d - 1), span = cols / 2 ** d; return { id: i, label: v, x: (pos + 0.5) * span * 2 - 1, y: d }; });
  const minX = Math.min(0, ...nodes.map((n) => n.x));
  return { nodes: nodes.map((n) => ({ ...n, x: (n.x - minX) / 1 })), edges: a.slice(1).map((_, k) => ({ from: Math.floor(k / 2), to: k + 1 })) };
}

function HeroPreview() {
  const t = fromKeys([50, 30, 70, 20, 40, 60, 80, 35]);
  const v = bstView(t);
  return (
    <div className="hero-ng">
      <Tree {...v} visited={bstSearch(t, 35).visited} tick={1} label="Binary search tree with the search path for 35 highlighted" />
      <p className="small muted">Searching for 35: 50 → 30 → 40 → 35, four comparisons for {size(t)} keys.</p>
    </div>
  );
}

function Home() {
  return (
    <Landing
      eyebrow="Data structures playground"
      title={<>Push it, pop it, <em>watch it grow.</em></>}
      lead="Operate real stacks, queues, linked lists, binary search trees and heaps. Every operation shows the nodes it visits in order, explains what happened, and logs its cost in Big-O."
      primary={{ href: '#/bst', label: 'Grow a search tree' }}
      secondary={{ href: '#/stack', label: 'Start with a stack' }}
      previewLabel="Search path — live"
      preview={<HeroPreview />}
      compact
      steps={[
        { title: 'Pick a structure', body: 'Five structures, each with its own page and starting data.' },
        { title: 'Run operations', body: 'Type a number and push, enqueue, insert, delete, search, traverse or extract.' },
        { title: 'Read the trail', body: 'Visited nodes light up in order, and the log records each step with its cost.' },
      ]}
      features={[
        { title: 'All three BST deletes', body: 'Leaf, one child, and two children (replaced by the in-order successor).' },
        { title: 'Four traversals', body: 'In-order, pre-order, post-order and level-order, played back node by node.' },
        { title: 'Heap as array and tree', body: 'See the same min-heap both ways while values sift up and down.' },
        { title: 'Honest edge cases', body: 'Underflow, overflow, duplicates and missing values are explained, not hidden.' },
      ]}
      closing={{ title: <>Data structures, <em>hands on.</em></>, action: { href: '#/bst', label: 'Open the playground' } }}
    />
  );
}

/* ---------- Pages ---------- */
function StackPage({ store, setStore }: Ctx) {
  const { last, apply, log } = useOp(store, setStore, 'stack');
  return (
    <div className="stack">
      <PageHead eyebrow="Stack · last in, first out" title={<>The <em>stack.</em></>} description="Like a pile of plates: you add and remove at the top only." actions={<button type="button" className="btn btn-ghost" onClick={() => setStore({ ...store, stack: initial().stack })}>Reset</button>} />
      <ValueInput label="Value" buttons={[{ label: 'Push', act: (v) => apply(`push(${v})`, push(store.stack, v!), (s) => ({ stack: s })) }, { label: 'Pop', need: false, act: () => apply('pop()', pop(store.stack), (s) => ({ stack: s })) }, { label: 'Peek', need: false, act: () => apply('peek()', { value: store.stack, visited: store.stack.length ? [store.stack.length - 1] : [], message: store.stack.length ? `The top is ${store.stack.at(-1)}` : 'The stack is empty', cost: 'O(1)', ok: store.stack.length > 0 }, () => ({})) }]} />
      <Status last={last} />
      <div className="layout-main">
        <section className="card viz-stack" aria-label={`Stack, top to bottom: ${[...store.stack].reverse().join(', ') || 'empty'}`}>
          <Cells values={[...store.stack].reverse()} visited={(last?.visited ?? []).map((i) => store.stack.length - 1 - i)} tick={last?.tick} labels={(i) => (i === 0 ? 'top' : null)} vertical />
        </section>
        <aside className="card stack"><h2 className="h3">Log</h2><Log log={log} /></aside>
      </div>
    </div>
  );
}

function QueuePage({ store, setStore }: Ctx) {
  const { last, apply, log } = useOp(store, setStore, 'queue');
  return (
    <div className="stack">
      <PageHead eyebrow="Queue · first in, first out" title={<>The <em>queue.</em></>} description={`Join at the back, leave from the front. This queue holds up to ${CAPACITY} items.`} actions={<button type="button" className="btn btn-ghost" onClick={() => setStore({ ...store, queue: initial().queue })}>Reset</button>} />
      <ValueInput label="Value" buttons={[{ label: 'Enqueue', act: (v) => apply(`enqueue(${v})`, enqueue(store.queue, v!, CAPACITY), (q) => ({ queue: q })) }, { label: 'Dequeue', need: false, act: () => apply('dequeue()', dequeue(store.queue), (q) => ({ queue: q })) }]} />
      <Status last={last} />
      <div className="layout-main">
        <section className="card stack" aria-label={`Queue, front to back: ${store.queue.join(', ') || 'empty'}`}>
          <div className="row-between small muted"><span>← front (leaves first)</span><span>back (joins here) ←</span></div>
          <Cells values={store.queue} visited={last?.visited ?? []} tick={last?.tick} labels={(i) => (i === 0 ? 'front' : i === store.queue.length - 1 ? 'back' : null)} />
          <div className="progress" role="progressbar" aria-label="Capacity used" aria-valuemin={0} aria-valuemax={CAPACITY} aria-valuenow={store.queue.length}><span style={{ width: `${(store.queue.length / CAPACITY) * 100}%` }} /></div>
          <p className="small muted">{store.queue.length} of {CAPACITY} slots used</p>
        </section>
        <aside className="card stack"><h2 className="h3">Log</h2><Log log={log} /></aside>
      </div>
    </div>
  );
}

function ListPage({ store, setStore }: Ctx) {
  const { last, apply, log } = useOp(store, setStore, 'list');
  const [pos, setPos] = useState('0');
  return (
    <div className="stack">
      <PageHead eyebrow="Singly linked list" title={<>The <em>linked list.</em></>} description="Each node points to the next. Reaching position k means walking k links from the head." actions={<button type="button" className="btn btn-ghost" onClick={() => setStore({ ...store, list: initial().list })}>Reset</button>} />
      <div className="card filters"><div className="field"><label htmlFor="pos">Insert at position</label><input id="pos" inputMode="numeric" value={pos} onChange={(e) => setPos(e.target.value)} style={{ maxWidth: 110 }} /></div></div>
      <ValueInput label="Value" buttons={[
        { label: 'Insert', act: (v) => apply(`insert(${pos}, ${v})`, insertAt(store.list, Number(pos), v!), (l) => ({ list: l })) },
        { label: 'Append', act: (v) => apply(`append(${v})`, insertAt(store.list, store.list.length, v!), (l) => ({ list: l })) },
        { label: 'Find', act: (v) => apply(`find(${v})`, find(store.list, v!), () => ({})) },
        { label: 'Remove', act: (v) => apply(`remove(${v})`, removeValue(store.list, v!), (l) => ({ list: l })) },
        { label: 'Reverse', need: false, act: () => apply('reverse()', reverse(store.list), (l) => ({ list: l })) },
      ]} />
      <Status last={last} />
      <div className="layout-main">
        <section className="card" aria-label={`Linked list: ${store.list.join(' → ') || 'empty'}`}>
          <ol className="links" key={last?.tick}>
            <li className="head-label mono small">head</li>
            {store.list.map((v, i) => { const step = (last?.visited ?? []).indexOf(i); return <li key={`${i}-${v}`} className={`lnode ${step >= 0 ? 'hit' : ''}`} style={{ ['--d' as string]: `${Math.max(0, step) * 180}ms` }}><b>{v}</b><span className="ptr" aria-hidden="true">→</span></li>; })}
            <li className="null mono small">null</li>
          </ol>
          <p className="small muted">Length {store.list.length}</p>
        </section>
        <aside className="card stack"><h2 className="h3">Log</h2><Log log={log} /></aside>
      </div>
    </div>
  );
}

function BstPage({ store, setStore }: Ctx) {
  const { last, apply, log } = useOp(store, setStore, 'bst');
  const [order, setOrder] = useState<Order>('in');
  const [trav, setTrav] = useState<{ keys: number[]; tick: number } | null>(null);
  const v = bstView(store.bst);
  const visited = trav ? trav.keys : last?.visited ?? [];
  return (
    <div className="stack">
      <PageHead eyebrow="Binary search tree" title={<>The <em>search tree.</em></>} description="Smaller keys go left, larger keys go right — so a search only follows one path." actions={<><button type="button" className="btn btn-ghost" onClick={() => setStore({ ...store, bst: initial().bst })}>Reset</button><button type="button" className="btn btn-ghost" onClick={() => setStore({ ...store, bst: null })}>Empty</button></>} />
      <ValueInput label="Key" buttons={[
        { label: 'Insert', act: (k) => { setTrav(null); apply(`insert(${k})`, bstInsert(store.bst, k!), (t) => ({ bst: t })); } },
        { label: 'Search', act: (k) => { setTrav(null); apply(`search(${k})`, bstSearch(store.bst, k!), () => ({})); } },
        { label: 'Delete', act: (k) => { setTrav(null); apply(`delete(${k})`, bstDelete(store.bst, k!), (t) => ({ bst: t })); } },
      ]} />
      <Status last={trav ? null : last} />
      <div className="layout-main">
        <section className="card stack" aria-labelledby="t-h">
          <h2 id="t-h" className="sr-only">Tree</h2>
          <div className="tree-wrap"><Tree {...v} visited={visited} tick={trav?.tick ?? last?.tick} label={`Binary search tree with ${size(store.bst)} keys`} /></div>
          <div className="row">
            <label className="sr-only" htmlFor="order">Traversal order</label>
            <select id="order" value={order} onChange={(e) => setOrder(e.target.value as Order)}><option value="in">In-order</option><option value="pre">Pre-order</option><option value="post">Post-order</option><option value="level">Level-order</option></select>
            <button type="button" className="btn" onClick={() => setTrav({ keys: traverse(store.bst, order), tick: Date.now() })}>Play traversal</button>
          </div>
          {trav && <p className="trav mono" data-testid="traversal">{trav.keys.join(' → ') || 'empty'}</p>}
        </section>
        <aside className="card stack">
          <div className="stats mini"><div className="stat"><span className="stat-label">Keys</span><span className="stat-value">{size(store.bst)}</span></div><div className="stat"><span className="stat-label">Height</span><span className="stat-value">{height(store.bst)}</span></div></div>
          <p className="small muted">A balanced tree of {size(store.bst)} keys would have height {Math.ceil(Math.log2(size(store.bst) + 1))}. Insert keys in sorted order to see it degrade into a list.</p>
          <h2 className="h3">Log</h2><Log log={log} />
        </aside>
      </div>
    </div>
  );
}

function HeapPage({ store, setStore }: Ctx) {
  const { last, apply, log } = useOp(store, setStore, 'heap');
  const v = heapView(store.heap);
  return (
    <div className="stack">
      <PageHead eyebrow="Binary min-heap" title={<>The <em>heap.</em></>} description="Every parent is smaller than its children, so the minimum is always at the root. Stored in an array: the children of i are 2i+1 and 2i+2." actions={<button type="button" className="btn btn-ghost" onClick={() => setStore({ ...store, heap: initial().heap })}>Reset</button>} />
      <ValueInput label="Value" buttons={[{ label: 'Insert', act: (x) => apply(`insert(${x})`, heapPush(store.heap, x!), (h) => ({ heap: h })) }, { label: 'Extract min', need: false, act: () => apply('extractMin()', heapPop(store.heap), (h) => ({ heap: h })) }]} />
      <Status last={last} />
      <div className="layout-main">
        <section className="card stack">
          <div className="tree-wrap"><Tree {...v} visited={last?.visited ?? []} tick={last?.tick} label={`Min-heap as a tree with ${store.heap.length} values`} /></div>
          <h2 className="label">As an array</h2>
          <Cells values={store.heap} visited={last?.visited ?? []} tick={last?.tick} labels={(i) => `[${i}]`} />
        </section>
        <aside className="card stack"><h2 className="h3">Log</h2><Log log={log} /></aside>
      </div>
    </div>
  );
}
