#!/usr/bin/env node
// Deterministic engine benchmark. Run from the checkout or pass --root PATH.
// Example: node scripts/benchmark.mjs --output /tmp/wolfram-benchmark.json
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { cpus, totalmem, platform, release, arch } from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i += 2) {
  if (!['--root', '--output', '--samples', '--warmup'].includes(args[i]) || !args[i + 1]) {
    throw new Error('Usage: node benchmark.mjs [--root PATH] [--output PATH] [--samples N] [--warmup N]');
  }
  options[args[i].slice(2)] = args[i + 1];
}
const root = path.resolve(options.root ?? process.cwd());
const output = path.resolve(options.output ?? '/tmp/wolfram-performance.json');
const samples = Number(options.samples ?? 7);
const warmup = Number(options.warmup ?? 2);
if (!Number.isSafeInteger(samples) || samples < 1 || samples > 100 || !Number.isSafeInteger(warmup) || warmup < 0 || warmup > 100) {
  throw new Error('Samples must be 1–100; warmup must be 0–100.');
}
const require = createRequire(path.join(root, 'package.json'));
const esbuild = require('esbuild');
const entry = [
  `export { createModelState, findMatch, runEvents, ORDERING } from ${JSON.stringify(path.join(root, 'src/services/physics/model.ts'))};`,
  `export { compileRule } from ${JSON.stringify(path.join(root, 'src/services/physics/customRuleParser.ts'))};`,
  `export { RULE_REGISTRY } from ${JSON.stringify(path.join(root, 'src/services/physics/registry.ts'))};`,
].join('\n');
const bundle = await esbuild.build({ stdin: { contents: entry, resolveDir: root, sourcefile: 'benchmark-entry.ts', loader: 'ts' }, bundle: true, write: false, format: 'esm', platform: 'node', target: 'node22', logLevel: 'silent' });
const { createModelState, findMatch, runEvents, compileRule, RULE_REGISTRY, ORDERING } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1];
const limits = { maxNodes: 100000, maxEdges: 100000, maxEvents: 10000, maxMatchChecks: 20000000 };
const results = [];

function measure(name, input, run, summarize, expected) {
  const inputBefore = hash(input);
  let reference;
  const durations = [];
  for (let i = 0; i < warmup + samples; i++) {
    const started = performance.now();
    const raw = run();
    const duration = performance.now() - started;
    const summary = summarize(raw);
    if (expected) expected(summary);
    const serialized = JSON.stringify(summary);
    if (reference === undefined) reference = serialized;
    if (reference !== serialized) throw new Error(`${name}: nondeterministic result`);
    if (hash(input) !== inputBefore) throw new Error(`${name}: input mutated`);
    if (i >= warmup) durations.push(duration);
  }
  const summary = JSON.parse(reference);
  const result = { name, inputDigest: inputBefore, ...summary, samplesMs: durations, medianMs: percentile(durations, 0.5), p95Ms: percentile(durations, 0.95), minMs: Math.min(...durations), maxMs: Math.max(...durations) };
  results.push(result);
  process.stdout.write(`${name}: ${result.medianMs.toFixed(3)} ms median, ${result.p95Ms.toFixed(3)} ms p95, ${result.candidateChecks} checks\n`);
}

const join = compileRule('{{x,y},{y,z}} -> {{x,z}}');
for (const decoys of [50, 250, 1000]) {
  const state = createModelState([...Array.from({ length: decoys }, (_, i) => [`a${i}`, `b${i}`]), ['join-start', 'join-middle'], ['join-middle', 'join-end']]);
  measure(`join-late-match-${decoys}`, { state, rule: join }, () => findMatch(state.edges, join, limits.maxMatchChecks), result => {
    const semantic = { consumedEdgeIds: result.match?.indices.map(i => state.edges[i].id) ?? [], bindings: result.match ? [...result.match.bindings] : [], exhausted: result.exhausted };
    return { operation: 'findMatch', signature: '{{x,y},{y,z}} -> {{x,z}}', decoyEdges: decoys, inputEdges: state.edges.length, candidateChecks: result.checks, ...semantic, semanticDigest: hash(semantic) };
  }, result => {
    if (result.exhausted || JSON.stringify(result.consumedEdgeIds) !== JSON.stringify([`e${decoys}`, `e${decoys + 1}`])) throw new Error('Canonical first match changed.');
  });
}

for (const [id, eventCount] of [['wm148', 1000], ['setreplace-ternary', 100]]) {
  const definition = RULE_REGISTRY.find(rule => rule.id === id);
  if (!definition) throw new Error(`Missing benchmark rule ${id}`);
  const rule = compileRule(definition.signature);
  const state = createModelState(definition.seed);
  measure(`${id}-${eventCount}-events`, { state, rule, eventCount }, () => runEvents(state, rule, eventCount, limits), result => {
    const { searchChecks: _searchChecks, ...semantic } = result.state;
    return { operation: 'runEvents', signature: definition.signature, seed: definition.seed, requestedEvents: eventCount, completedEvents: result.completed, candidateChecks: result.candidateChecks, status: result.state.status, outputEdges: result.state.edges.length, outputAtoms: new Set(result.state.edges.flatMap(edge => edge.atoms)).size, outputEvents: result.state.events.length, lastConsumedEdgeIds: result.state.events.at(-1)?.inputEdges ?? [], semanticDigest: hash(semantic) };
  }, result => {
    if (result.completedEvents !== eventCount || result.status !== 'ready') throw new Error(`${id}: did not complete requested workload.`);
  });
}

const sources = {};
for (const file of ['src/services/physics/model.ts', 'src/services/physics/customRuleParser.ts', 'src/services/physics/types.ts', 'src/services/physics/registry.ts']) sources[file] = hash(await readFile(path.join(root, file), 'utf8'));
const recordedAt = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZoneName: 'longOffset' }).format(new Date()).replace(' ', 'T').replace(' GMT', '').replace('\u2212', '-'); // Intl emits U+2212 in the offset; strict ISO 8601 needs ASCII '-'.
const report = {
  schemaVersion: 1,
  recordedAt,
  timeZone: 'America/Sao_Paulo',
  checkout: root,
  head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  sources,
  runtime: { node: process.version, v8: process.versions.v8, esbuild: esbuild.version },
  hardware: { platform: platform(), release: release(), arch: arch(), cpuModel: cpus()[0]?.model ?? 'unknown', logicalCpus: cpus().length, memoryBytes: totalmem() },
  methodology: { ordering: ORDERING, limits, warmup, samples, clock: 'performance.now', percentile: 'nearest rank', timedRegion: 'findMatch or runEvents only; excludes bundling, parsing, fixture creation, hashing and report I/O', isolation: 'single process; GC and OS scheduling remain uncontrolled', candidateChecks: 'matcher-reported candidate examinations; index construction is included in timed work but not in candidate-check counts', correctness: 'all warmup and measured results deterministic; inputs unchanged; canonical join consumption and requested event completion asserted; semantic digests exclude searchChecks' },
  workloads: results,
};
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`Saved ${output}\n`);
