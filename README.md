# Wolfram Physics Explorer

A browser laboratory for ordered hypergraph rewriting in the style of the Wolfram Physics Project. It applies one documented replacement rule to a multiset of ordered relations, one event at a time, inside a Web Worker, and renders the resulting state and its causal history in 3D.

This is a computational tool. It executes exactly the rule and seed shown on screen. It does not establish spacetime, black holes, quantum behavior, causal invariance or any other physical claim, and it follows a single deterministic trajectory rather than a multiway system.

## What is computed

- **State.** A multiset of ordered tuples. Every relation occurrence has its own ID, a creator event and a generation. Duplicate tuples are distinct occurrences.
- **Rule.** Written as `{{x,y}} -> {{x,y},{y,z}}`. Every label in the rule is a pattern variable. A repeated variable must bind the same atom; distinct variables may bind the same atom. Variables that appear only on the right-hand side receive fresh atoms, shared within one event and new for every event.
- **Event.** One rule application. It consumes distinct input occurrences and creates every output occurrence atomically. Pure deletion (`{{x}} -> {}`) is supported. Generation is one plus the maximum generation of the inputs.
- **Scheduling.** Selectable event ordering. The default, `least-recent-edge`, applies the complete match that avoids the newest occurrences, with ties broken by rule-input order; this is SetReplace's documented default (`LeastRecentEdge`, `RuleOrdering`) and reproduces every published textual output checked below. The `oldest-edge` option keeps the earlier first-match convention (`OldestEdge`, `RuleOrdering`). Single-input rules and non-overlapping systems evolve identically under both; overlapping multi-input rules do not. A least-recent search that exceeds the candidate budget stops with `match-limit` instead of applying an uncertified match.
- **Causal links.** Event B depends on event A when B consumes an occurrence that A created. Sharing an atom alone creates no link. The causal view aggregates dependencies into one link per parent pair, as stated in the UI.
- **Stopping.** No matching input halts the system. Live-atom, relation, event and candidate-check budgets stop it separately. A limit refuses the whole event; it never applies a partial rewrite.

## Reference models

| ID | Rule | Seed | Source |
| --- | --- | --- | --- |
| `wm148` | `{{x,y}} -> {{x,y},{y,z}}` | `{{1,1}}` | https://www.wolframphysics.org/universes/wm148/ |
| `wm121` | `{{x,y}} -> {{x,x},{z,x}}` | `{{1,1}}` | https://www.wolframphysics.org/universes/wm121/ |
| `two-to-four` | `{{x,y},{x,z}} -> {{x,z},{x,w},{y,w},{z,w}}` | `{{0,0},{0,0}}` | SetReplace `CausalGraphs.md` at commit `44c868b` |
| `setreplace-ternary` | `{{a,b,c},{b,d,e}} -> {{e,f,a},{f,d,b},{d,e,c}}` | `{{1,2,3},{2,4,5},{4,6,7}}` | SetReplace README at commit `44c868b` |

The picker also lists every universe on the first index page of the [Registry of Notable Universe Models](https://www.wolframphysics.org/universes/), read on 2026-09-13. Rule text, the self-loop initial condition and the generation count come from each page's own `WolframModel` command; the numeric labels in these rules are pattern variables, exactly as printed.

| ID | Rule | Seed | Signature | Source |
| --- | --- | --- | --- | --- |
| `wm1113` | `{{1,2}}->{{3,3},{3,2},{1,2}}` | `{{1,1}}` | 1₂ → 3₂ | https://www.wolframphysics.org/universes/wm1113/ |
| `wm1116` | `{{1,2},{3,2}}->{{4,1},{1,4},{2,4},{3,4}}` | `{{1,1},{1,1}}` | 2₂ → 4₂ | https://www.wolframphysics.org/universes/wm1116/ |
| `wm1137` | `{{1,1,2}}->{{2,2,2},{2,1,2},{1,2,3},{3,3,1}}` | `{{1,1,1}}` | 1₃ → 4₃ | https://www.wolframphysics.org/universes/wm1137/ |
| `wm1157` | `{{1,2},{1,3},{1,4}}->{{1,1},{5,1},{5,2},{3,5},{4,3}}` | `{{1,1},{1,1},{1,1}}` | 3₂ → 5₂ | https://www.wolframphysics.org/universes/wm1157/ |
| `wm1158` | `{{1,1,2},{3,2,4}}->{{2,2,4},{5,2,3},{3,5,1}}` | `{{1,1,1},{1,1,1}}` | 2₃ → 3₃ | https://www.wolframphysics.org/universes/wm1158/ |
| `wm1167` | `{{1,1,2},{3,4,1}}->{{1,1,4},{5,4,3},{2,5,1}}` | `{{1,1,1},{1,1,1}}` | 2₃ → 3₃ | https://www.wolframphysics.org/universes/wm1167/ |
| `wm1172` | `{{1,2},{3,2}}->{{4,1},{4,2},{1,2},{4,3}}` | `{{1,1},{1,1}}` | 2₂ → 4₂ | https://www.wolframphysics.org/universes/wm1172/ |
| `wm1173` | `{{1,2,1},{3,4,5}}->{{6,1,6},{1,5,2},{2,3,7},{3,5,8}}` | `{{1,1,1},{1,1,1}}` | 2₃ → 4₃ | https://www.wolframphysics.org/universes/wm1173/ |
| `wm1194` | `{{1,1,2}}->{{3,3,1},{2,1,1}}` | `{{1,1,1}}` | 1₃ → 2₃ | https://www.wolframphysics.org/universes/wm1194/ |
| `wm1199` | `{{1,1,1},{2,3,1}}->{{3,3,3},{3,1,3},{4,4,2}}` | `{{1,1,1},{1,1,1}}` | 2₃ → 3₃ | https://www.wolframphysics.org/universes/wm1199/ |
| `wm1218` | `{{1,2},{2,3}}->{{2,4},{2,4},{4,1},{3,4}}` | `{{1,1},{1,1}}` | 2₂ → 4₂ | https://www.wolframphysics.org/universes/wm1218/ |
| `wm1268` | `{{1,1,2},{3,4,2}}->{{4,4,2},{1,5,2},{1,5,3}}` | `{{1,1,1},{1,1,1}}` | 2₃ → 3₃ | https://www.wolframphysics.org/universes/wm1268/ |
| `wm11114` | `{{1,2,3},{4,3,5},{3,6}}->{{6,7,8},{6,9,10},{11,8,10},{5,2,9},{9,9},{1,9},{7,5},{8,5}}` | `{{1,1,1},{1,1,1},{1,1}}` | 1₂ 2₃ → 4₂ 4₃ | https://www.wolframphysics.org/universes/wm11114/ |
| `wm12518` | `{{1,2,3},{4,3,5},{6,1}}->{{7,5,4},{5,1,2},{8,2,7},{3,2,9},{10,5},{11,5},{12,4},{13,9}}` | `{{1,1,1},{1,1,1},{1,1}}` | 1₂ 2₃ → 4₂ 4₃ | https://www.wolframphysics.org/universes/wm12518/ |

Expected one-event results were derived by hand from the cited descriptions and encoded as tests. No WolframModel or SetReplace software was executed as an oracle; instead, `scripts/oracle-compare.mjs` checks the engine against 18 textual outputs printed in the SetReplace documentation at commit `44c868b`.

## Rule and seed notation

Flat ordered relations only. Labels are either names (`[A-Za-z][A-Za-z0-9]*`) or integers; integer spellings such as `01` and `-0` normalize to one identity, and integers outside the safe range are rejected. Bounds: 16 positions per relation, 20,000 relations, 200,000 input characters. Malformed or trailing text is rejected. This is not a Wolfram Language evaluator.

## Workbench

The graph is the page. Everything else is a small overlay: a top bar with the model picker, the spatial/causal switch, fit, and three icon buttons (model definition and settings, measurements and inspector, export); a floating transport pill at the bottom; and a one-line status with atom, relation and generation counts. The two panels open as drawers over the graph and are closed by default.

- Rule and seed editor with a source link for each reference model, in the model drawer.
- Spatial view (atoms, ordered binary arrows, hubs for unary and higher-arity relations, curved duplicate edges and self-loops) and causal view (events, aggregated dependencies).
- Display settings: a dark or plain theme (plain is a white page with a monochrome graph) and a flat 2D layout toggle. Both are presentation only.
- Selection card on click; filterable relation table, latest-event details and the model-semantics note in the inspector drawer.
- Transport pill: reset, previous snapshot, run/pause, one event, batch, a snapshot slider over the latest 100 snapshots and the event counter. Batches save their final state; event provenance keeps the full trajectory. Changing the event ordering starts a new run, because a trajectory is recorded under one ordering.
- Measurements, in the inspector drawer: live atoms, relations, incidences, components, incidence degree, arity counts, self-loops, events and generation, plus rewrite time, worker round trip, candidate checks and visible-tab frame cadence. Cadence measures animation callbacks, not GPU time.
- JSON export of the definition, limits, event ordering and canonical state. Import is not implemented.

Layout position, force distance, atom size, theme, flat or 3D layout and colors are display settings and never affect the rewrite.

## Commands

```sh
npm install
npm run dev                 # Vite on http://127.0.0.1:3011/
npm run build               # tsc, then vite build into dist/
npm run preview             # serve the built bundle
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vitest run src/services/physics/model.test.ts src/services/physics/__tests__/customRuleParser.test.ts
./node_modules/.bin/vitest run src/context/SimulationContext.test.tsx
npm test                    # whole suite in watch mode
node scripts/benchmark.mjs --output /path/to/report.json
node scripts/oracle-compare.mjs --output docs/oracle-comparison.json
```

`scripts/benchmark.mjs` runs deterministic matcher and evolution workloads, checks input and result digests, and records hardware, source hashes and raw samples. `docs/performance-baseline.json` and `docs/performance-current.json` are measured reports for the matcher before and after candidate indexing.

`scripts/oracle-compare.mjs` replays every published textual `WolframModel` output from the pinned SetReplace documentation (creator and destroyer indices, event lists, generation lists, per-generation vertex and edge counts, edge-index states, the ordering example and the README ternary step) under each engine ordering and under an independent emulation of SetReplace's default ordering. `docs/oracle-comparison.json` is its report. `docs/performance-least-recent-edge.json` is the benchmark report taken after the default ordering changed; the join workloads examine one more candidate each to certify the choice, the single-input workload is unchanged, and the ternary workload follows a different trajectory.

## Verification status

- Unit tests cover the model (including a 3,200-case comparison against an independent brute-force matcher), the parser, presets, the worker protocol, metrics, the projection and the playback lifecycle.
- Headless Chromium checks against the dev server and the built bundle verified exact first-event tuples for wm148 and wm121, custom unary growth and deletion, whole-event refusal at the live-atom limit, stale worker replies after reset and model switch, causal view, JSON export, a 500-event batch, timeline replay, no horizontal overflow at 1440, 768 and 390 pixels, and recovery messaging when the worker fails to start.
- Published SetReplace outputs: 18 of 18 checks match under the default `least-recent-edge` ordering, and the independent emulation agrees on all 18. Under `oldest-edge` 13 of 18 match; the five differences are all ordering choices on overlapping multi-input rules (see `docs/oracle-comparison.json`).
- Not verified: live execution against a Wolfram kernel, tie situations SetReplace resolves at random (none occur in the checked examples), multiway behavior, and any physical interpretation.

## Source layout

| Path | Role |
| --- | --- |
| `src/services/physics/` | Model, parser, registry, metrics and types. See its README. |
| `src/services/workerProtocol.ts`, `src/services/worker.ts` | Serializable evolve requests and typed result or error replies. |
| `src/context/SimulationContext.tsx` | Worker ownership, request identity guards, history and playback. |
| `src/components/graph/` | Spatial and causal projection, mutable visual copies, 3D renderer. |
| `src/components/controls/`, `src/App.tsx` | Editor, measurements, transport and inspectors. |

Legacy modules remain for compatibility and are not used by the application: `src/services/physics/rules/*`, `src/services/physics/engine.ts`, the `parseAndApplyCustomRule` adapter, the graph types in `src/types.ts`, the former renderer helpers `src/components/graph/factories/*`, `geometries.ts` and `materials/*`, the `@google/genai` dependency and the import map and icon stylesheet in `index.html`.
