#!/usr/bin/env node
// Compare the engine against textual outputs published in the pinned SetReplace documentation.
// Every check runs three times: with the engine under each supported event ordering, and with SetReplace's
// documented default ordering {"LeastRecentEdge", "RuleOrdering", "RuleIndex"} emulated independently on
// top of the engine's state model. The emulation re-implements match enumeration and event application
// (see `emulatedStep` below), so its column cross-checks the engine's own least-recent search.
// Example: node scripts/oracle-compare.mjs --output docs/oracle-comparison.json
import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i += 2) {
  if (!['--root', '--output'].includes(args[i]) || !args[i + 1]) throw new Error('Usage: node oracle-compare.mjs [--root PATH] [--output PATH]');
  options[args[i].slice(2)] = args[i + 1];
}
const root = path.resolve(options.root ?? process.cwd());
const require = createRequire(path.join(root, 'package.json'));
const esbuild = require('esbuild');
const entry = [
  `export { createModelState, rewriteOnce, ORDERINGS, ORDERING_DESCRIPTIONS } from ${JSON.stringify(path.join(root, 'src/services/physics/model.ts'))};`,
  `export { compileRule } from ${JSON.stringify(path.join(root, 'src/services/physics/customRuleParser.ts'))};`,
].join('\n');
const bundle = await esbuild.build({ stdin: { contents: entry, resolveDir: root, sourcefile: 'oracle-entry.ts', loader: 'ts' }, bundle: true, write: false, format: 'esm', platform: 'node', target: 'node22', logLevel: 'silent' });
const engine = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

const PINNED_COMMIT = '44c868bf4622e4542b306846ffdcc47c19d0bba8';
const DOCS = `https://github.com/maxitg/SetReplace/blob/${PINNED_COMMIT}/Documentation/SymbolsAndFunctions/WolframModelAndWolframModelEvolutionObject`;
const LIMITS = { maxNodes: 1e7, maxEdges: 1e7, maxEvents: 1e7, maxMatchChecks: 1e8 };
const num = id => Number(id.slice(1));
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const lexLess = (a, b) => { for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] < b[i]; return a.length < b.length; };
const byCreation = edges => [...edges].sort((a, b) => num(a.id) - num(b.id));

// Engine scheduler: rewriteOnce on a view that hides edges beyond the generation cap, mirroring
// WolframModel declining matches whose generation would exceed the requested number of generations.
const engineStep = ordering => (state, rule, eligible) => {
  const next = engine.rewriteOnce({ ...state, edges: eligible }, rule, LIMITS, ordering);
  if (next.status !== 'ready' && next.status !== 'event-limit') return undefined;
  const event = next.events[next.events.length - 1];
  const consumed = new Set(event.inputEdges);
  const outputs = next.edges.filter(e => e.creator === event.id);
  return { ...next, edges: byCreation(state.edges.filter(e => !consumed.has(e.id)).concat(outputs)) };
};

// Emulated SetReplace default ordering. LeastRecentEdge avoids the newest edges: matches are compared by
// their edge positions sorted newest-first, smallest wins. RuleOrdering then compares positions in
// left-hand-side order. RuleIndex is irrelevant for a single rule.
const emulatedStep = (state, rule, eligible) => {
  const matches = [];
  const visit = (p, used, bindings, chosen) => {
    if (p === rule.lhs.length) { matches.push({ indices: [...chosen], bindings: new Map(bindings) }); return; }
    const pattern = rule.lhs[p];
    for (let i = 0; i < eligible.length; i++) {
      if (used.has(i) || eligible[i].atoms.length !== pattern.length) continue;
      const next = new Map(bindings); let ok = true;
      for (let q = 0; q < pattern.length && ok; q++) {
        const v = pattern[q], atom = eligible[i].atoms[q];
        if (next.has(v) && next.get(v) !== atom) ok = false; else next.set(v, atom);
      }
      if (!ok) continue;
      used.add(i); chosen.push(i); visit(p + 1, used, next, chosen); chosen.pop(); used.delete(i);
    }
  };
  visit(0, new Set(), new Map(), []);
  let best;
  for (const m of matches) {
    const key = [...m.indices].sort((x, y) => y - x);
    if (!best || lexLess(key, best.key) || (same(key, best.key) && lexLess(m.indices, best.m.indices))) best = { key, m };
  }
  if (!best) return undefined;
  const inputs = best.m.indices.map(i => eligible[i]);
  const generation = Math.max(...inputs.map(e => e.generation)) + 1;
  const eventId = state.step + 1;
  let nextAtomId = state.nextAtomId, nextEdgeId = state.nextEdgeId;
  const bindings = new Map(best.m.bindings);
  const outputs = rule.rhs.map(pattern => ({
    id: `e${nextEdgeId++}`, creator: eventId, generation,
    atoms: pattern.map(v => { if (!bindings.has(v)) bindings.set(v, String(nextAtomId++)); return bindings.get(v); }),
  }));
  const consumed = new Set(inputs.map(e => e.id));
  const event = { id: eventId, generation, inputEdges: inputs.map(e => e.id), outputEdges: outputs.map(e => e.id) };
  return { ...state, edges: byCreation(state.edges.filter(e => !consumed.has(e.id)).concat(outputs)), events: [...state.events, event], nextAtomId, nextEdgeId, step: eventId, generation: Math.max(state.generation, generation) };
};

function evolve(step, rule, seed, { generations = Infinity, events = Infinity } = {}) {
  let state = engine.createModelState(seed);
  const perEvent = [state];
  const ever = new Map(state.edges.map(e => [e.id, e]));
  while (state.step < events) {
    const eligible = Number.isFinite(generations) ? state.edges.filter(e => e.generation < generations) : state.edges;
    const next = step(state, rule, eligible);
    if (!next) break;
    next.edges.filter(e => e.creator === next.step).forEach(e => ever.set(e.id, e));
    state = next;
    perEvent.push(state);
  }
  return { final: state, perEvent, edgesEver: byCreation(ever.values()) };
}
const live = state => state.edges.map(e => num(e.id) + 1);
const distinct = edges => new Set(edges.flatMap(e => [...e.atoms])).size;
// Generation-g state as SetReplace defines it: edges of generation <= g not destroyed by an event of generation <= g.
const generationState = (run, g) => {
  const destroyed = new Map(run.final.events.flatMap(ev => ev.inputEdges.map(id => [id, ev.generation])));
  return run.edgesEver.filter(e => e.generation <= g && !(destroyed.has(e.id) && destroyed.get(e.id) <= g));
};
const eventsByGeneration = (run, gens) => gens.map(g => run.final.events.filter(e => e.generation === g).map(e => e.id));

// Hypergraph equality modulo atom relabeling, preserving position order and multiplicity (small states only).
function isomorphic(a, b) {
  if (a.length !== b.length) return false;
  const used = new Array(b.length).fill(false), fwd = new Map(), back = new Map();
  const rec = k => {
    if (k === a.length) return true;
    for (let j = 0; j < b.length; j++) {
      if (used[j] || b[j].length !== a[k].length) continue;
      const added = []; let ok = true;
      for (let p = 0; p < a[k].length && ok; p++) {
        const x = a[k][p], y = b[j][p];
        if (fwd.has(x)) { if (fwd.get(x) !== y) ok = false; } else if (back.has(y)) ok = false; else { fwd.set(x, y); back.set(y, x); added.push(x); }
      }
      if (ok) { used[j] = true; if (rec(k + 1)) return true; used[j] = false; }
      for (const x of added) { back.delete(fwd.get(x)); fwd.delete(x); }
    }
    return false;
  };
  return rec(0);
}

// Each oracle: the published expression, its textual output, and how to observe it from a run.
const oracles = [
  { id: 'creator-events', source: `${DOCS}/Properties/CreatorAndDestroyerEvents.md`, expression: 'WolframModel[{{1,2}}->{{1,3},{3,2}}, {{1,1}}, 4, "EdgeCreatorEventIndices"]',
    rule: '{{x,y}} -> {{x,z},{z,y}}', seed: [['1','1']], run: { generations: 4 }, expected: [0, ...range(1, 15).flatMap(i => [i, i])],
    observe: run => run.edgesEver.map(e => e.creator ?? 0) },
  { id: 'destroyer-events', source: `${DOCS}/Properties/CreatorAndDestroyerEvents.md`, expression: '... "EdgeDestroyerEventIndices"',
    rule: '{{x,y}} -> {{x,z},{z,y}}', seed: [['1','1']], run: { generations: 4 }, expected: [...range(1, 15), ...Array(16).fill('Infinity')],
    observe: run => run.edgesEver.map(e => run.final.events.find(ev => ev.inputEdges.includes(e.id))?.id ?? 'Infinity') },
  { id: 'all-events-list', source: `${DOCS}/Properties/Events.md`, expression: 'WolframModel[{{1,2}}->{{3,4},{3,1},{4,1},{2,4}}, {{1,1}}, 2, "AllEventsList"]',
    rule: '{{x,y}} -> {{z,w},{z,x},{w,x},{y,w}}', seed: [['1','1']], run: { generations: 2 },
    expected: [[1, [2,3,4,5]], [2, [6,7,8,9]], [3, [10,11,12,13]], [4, [14,15,16,17]], [5, [18,19,20,21]]].map(([i, out]) => ({ rule: 1, in: [i], out })),
    observe: run => run.final.events.map(ev => ({ rule: 1, in: ev.inputEdges.map(i => num(i) + 1), out: ev.outputEdges.map(i => num(i) + 1) })) },
  { id: 'generation-events-list', source: `${DOCS}/Properties/Events.md`, expression: '... "GenerationEventsList" (event indices grouped by generation)',
    rule: '{{x,y}} -> {{z,w},{z,x},{w,x},{y,w}}', seed: [['1','1']], run: { generations: 2 }, expected: [[1], [2,3,4,5]], observe: run => eventsByGeneration(run, [1, 2]) },
  { id: 'events-states-list', source: `${DOCS}/Properties/EventsAndStates.md`, expression: '... "EventsStatesList" (state edge indices after each event)',
    rule: '{{x,y}} -> {{z,w},{z,x},{w,x},{y,w}}', seed: [['1','1']], run: { generations: 2 },
    expected: [[2,3,4,5], [3,4,5,6,7,8,9], [4,5,...range(6,13)], [5,...range(6,17)], range(6,21)], observe: run => run.perEvent.slice(1).map(live) },
  { id: 'edge-generations-list', source: `${DOCS}/Properties/EdgeAndEventGenerations.md`, expression: 'WolframModel[{{1,2},{1,3},{1,4}}->{{2,2},{3,2},{3,4},{3,5}}, {{1,1},{1,1},{1,1}}, 5, "EdgeGenerationsList"]',
    rule: '{{a,b},{a,c},{a,d}} -> {{b,b},{c,b},{c,d},{c,e}}', seed: [['1','1'],['1','1'],['1','1']], run: { generations: 5 },
    expected: [0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,5,5,5,5], observe: run => run.edgesEver.map(e => e.generation) },
  { id: 'all-events-generations-list', source: `${DOCS}/Properties/EdgeAndEventGenerations.md`, expression: '... "AllEventsGenerationsList"',
    rule: '{{a,b},{a,c},{a,d}} -> {{b,b},{c,b},{c,d},{c,e}}', seed: [['1','1'],['1','1'],['1','1']], run: { generations: 5 }, expected: [1,2,3,4,5,5], observe: run => run.final.events.map(e => e.generation) },
  { id: 'vertex-count-list', source: `${DOCS}/Properties/ElementCountLists.md`, expression: 'WolframModel[{{1,2,3},{2,4,5}}->{{6,6,3},{2,6,2},{6,4,2},{5,3,6}}, {{1,1,1},{1,1,1}}, 10, "VertexCountList"]',
    rule: '{{a,b,c},{b,d,e}} -> {{f,f,c},{b,f,b},{f,d,b},{e,c,f}}', seed: [['1','1','1'],['1','1','1']], run: { generations: 10 },
    expected: [1,2,4,8,14,27,49,92,171,324,622], observe: run => range(0, 10).map(g => distinct(generationState(run, g))) },
  { id: 'edge-count-list', source: `${DOCS}/Properties/ElementCountLists.md`, expression: '... "EdgeCountList"',
    rule: '{{a,b,c},{b,d,e}} -> {{f,f,c},{b,f,b},{f,d,b},{e,c,f}}', seed: [['1','1','1'],['1','1','1']], run: { generations: 10 },
    expected: [2,4,8,16,28,54,98,184,342,648,1244], observe: run => range(0, 10).map(g => generationState(run, g).length) },
  { id: 'total-element-counts', source: `${DOCS}/Properties/TotalElementCounts.md`, expression: '... {"AllEventsDistinctElementsCount", "AllEventsEdgesCount"}',
    rule: '{{a,b,c},{b,d,e}} -> {{f,f,c},{b,f,b},{f,d,b},{e,c,f}}', seed: [['1','1','1'],['1','1','1']], run: { generations: 10 },
    expected: [622, 2486], observe: run => [distinct(run.edgesEver), run.edgesEver.length] },
  { id: 'generation-events-count-list', source: `${DOCS}/Properties/EventCounts.md`, expression: 'WolframModel[{{1,2}}->{{1,3},{1,3},{3,2}}, {{1,1}}, 5, "GenerationEventsCountList"]',
    rule: '{{x,y}} -> {{x,z},{x,z},{z,y}}', seed: [['1','1']], run: { generations: 5 }, expected: [1,3,9,27,81], observe: run => eventsByGeneration(run, [1,2,3,4,5]).map(g => g.length) },
  { id: 'total-generations-count', source: `${DOCS}/Properties/GenerationCounts.md`, expression: 'WolframModel[{{1,2}}->{{1,3},{1,3},{3,2}}, {{1,1}}, <|"MaxEvents"->42|>, "TotalGenerationsCount"]',
    rule: '{{x,y}} -> {{x,z},{x,z},{z,y}}', seed: [['1','1']], run: { events: 42 }, expected: 5, observe: run => run.final.generation },
  { id: 'generation-complete-5', source: `${DOCS}/Properties/GenerationCounts.md`, expression: '... ["GenerationComplete", 5] (no unconsumed generation-4 edge remains)',
    rule: '{{x,y}} -> {{x,z},{x,z},{z,y}}', seed: [['1','1']], run: { events: 42 }, expected: false, observe: run => run.final.edges.every(e => e.generation !== 4) },
  { id: 'all-events-states-edge-indices', source: `${DOCS}/Properties/StatesAsEdgeIndices.md`, expression: 'WolframModel[{{1,2,3},{4,5,6},{1,4}}->{{2,7,8},{3,9,10},{5,11,12},{6,13,14},{8,12},{11,10},{13,7},{14,9}}, {{1,1,1},{1,1,1},{1,1},{1,1},{1,1}}, 2, "AllEventsStatesEdgeIndicesList"]',
    rule: '{{a,b,c},{d,e,f},{a,d}} -> {{b,g,h},{c,i,j},{e,k,l},{f,m,n},{h,l},{k,j},{m,g},{n,i}}', seed: [['1','1','1'],['1','1','1'],['1','1'],['1','1'],['1','1']], run: { generations: 2 },
    expected: [range(1,5), [4,5,...range(6,13)], [5,8,9,...range(10,21)], range(10,29)], observe: run => run.perEvent.map(live) },
  { id: 'state-edge-indices-after-event-12', source: `${DOCS}/Properties/StatesAsEdgeIndices.md`, expression: '... 6]["StateEdgeIndicesAfterEvent", 12]',
    rule: '{{a,b,c},{d,e,f},{a,d}} -> {{b,g,h},{c,i,j},{e,k,l},{f,m,n},{h,l},{k,j},{m,g},{n,i}}', seed: [['1','1','1'],['1','1','1'],['1','1'],['1','1'],['1','1']], run: { generations: 6 },
    expected: [18,19,29,34,35,36,37,39,40,42,43,44,45,49,50,51,52,53,...range(55,101)], observe: run => live(run.perEvent[12]) },
  { id: 'generation-edge-indices-2', source: `${DOCS}/Properties/StatesAsEdgeIndices.md`, expression: '... 6]["GenerationEdgeIndices", 2]',
    rule: '{{a,b,c},{d,e,f},{a,d}} -> {{b,g,h},{c,i,j},{e,k,l},{f,m,n},{h,l},{k,j},{m,g},{n,i}}', seed: [['1','1','1'],['1','1','1'],['1','1'],['1','1'],['1','1']], run: { generations: 6 },
    expected: range(10,29), observe: run => generationState(run, 2).map(e => num(e.id) + 1) },
  { id: 'event-ordering-least-recent-example', source: `${DOCS}/Options/EventOrderingFunction.md`, expression: 'WolframModel[{{x,y},{y,z}}->{}, {{1,2},{a,b},{b,c},{2,3}}, <|"MaxEvents"->1|>, "AllEventsList", "EventOrderingFunction"->"LeastRecentEdge"] selects edges {2,3}',
    rule: '{{x,y},{y,z}} -> {{x,x}}', seed: [['1','2'],['a','b'],['b','c'],['2','3']], run: { events: 1 }, expected: [2, 3], observe: run => run.final.events[0].inputEdges.map(i => num(i) + 1),
    note: 'The published rule has an empty right-hand side, which the engine rejects; the replacement output does not affect which edges are selected. The same source states OldestEdge selects {1,4}.' },
  { id: 'readme-ternary-one-step', source: `https://github.com/maxitg/SetReplace/blob/${PINNED_COMMIT}/README.md`, expression: 'SetReplace[{{1,2,3},{2,4,5},{4,6,7}}, ToPatternRules[{{1,2,3},{2,4,5}}->{{5,6,1},{6,4,2},{4,5,3}}]] (published as a plot; the expected tuples are derived by hand)',
    rule: '{{a,b,c},{b,d,e}} -> {{e,f,a},{f,d,b},{d,e,c}}', seed: [['1','2','3'],['2','4','5'],['4','6','7']], run: { events: 1 },
    expected: [['4','6','7'],['5','n','1'],['n','4','2'],['4','5','3']], observe: run => run.final.edges.map(e => [...e.atoms]), compare: isomorphic,
    note: 'Compared modulo fresh-atom relabeling and edge order. Not a published textual output.' },
];

const schedulers = Object.fromEntries([...engine.ORDERINGS.map(o => [`engine:${o}`, engineStep(o)]), ['emulated-least-recent-edge', emulatedStep]]);
const results = oracles.map(o => {
  const rule = engine.compileRule(o.rule);
  const observed = {};
  for (const [name, step] of Object.entries(schedulers)) {
    const value = o.observe(evolve(step, rule, o.seed, o.run));
    observed[name] = { value, pass: (o.compare ?? same)(o.expected, value) };
  }
  return { id: o.id, source: o.source, expression: o.expression, rule: o.rule, seed: o.seed, run: o.run, expected: o.expected, note: o.note, observed };
});
const summary = Object.fromEntries(Object.keys(schedulers).map(name => [name, `${results.filter(r => r.observed[name].pass).length}/${results.length}`]));
const report = {
  generatedAt: new Date().toISOString(),
  pinnedSetReplaceCommit: PINNED_COMMIT,
  engineOrderings: engine.ORDERING_DESCRIPTIONS,
  emulatedOrdering: 'SetReplace default {"LeastRecentEdge", "RuleOrdering", "RuleIndex"} re-implemented in this script',
  unsupportedPublishedExamples: [
    'pattern rules with arithmetic or conditions (AllEdgesThroughoutEvolution, CausalGraphs, FinalElementCounts, TerminationReason)',
    'more than one rule per model (RuleIndicesForEvents, EventOrderingFunction multi-rule example)',
    'multiway event selection (MultiwayQ)',
  ],
  summary, results,
};
for (const r of results) {
  const cells = Object.entries(r.observed).map(([name, o]) => `${o.pass ? 'PASS' : 'FAIL'} ${name}`).join('  ');
  console.log(`${cells}  ${r.id}`);
  for (const [name, o] of Object.entries(r.observed)) if (!o.pass) console.log(`      ${name} observed ${JSON.stringify(o.value)}\n      expected ${JSON.stringify(r.expected)}`);
}
console.log('\nsummary', summary);
if (options.output) { await writeFile(path.resolve(options.output), JSON.stringify(report, null, 2) + '\n'); console.log('report written to', path.resolve(options.output)); }
