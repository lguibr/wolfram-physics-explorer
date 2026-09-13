# Physics service

TypeScript implementation of ordered hypergraph rewriting. Everything runs in the browser or in the Web Worker; there is no Rust or WebAssembly component.

## Active modules

| File | Exports | Role |
| --- | --- | --- |
| `types.ts` | `Hyperedge`, `RewriteEvent`, `ModelState`, `ModelLimits`, `ModelDefinition`, `CompiledRule`, `StopReason`; `PhysicsRule` only for the legacy modules below | Immutable state contract: ordered tuples with occurrence IDs, events with inputs, outputs, parents and generation, monotonic ID counters and a stop reason. |
| `model.ts` | `createModelState`, `findMatch`, `rewriteOnce`, `runEvents`, `DEFAULT_LIMITS`, `DEFAULT_ORDERING`, `ORDERINGS`, `ORDERING_DESCRIPTIONS`, `ORDERING` | Seed validation; match search with arity and bound-position indexes for multi-input rules under a selectable `EventOrdering` (`least-recent-edge`, the SetReplace default, or `oldest-edge`, the first-match convention); atomic rewrite with fresh atoms, causal parents, generation and batch execution under limits. An exhaustive least-recent search that exceeds the candidate budget reports `match-limit` rather than an uncertified match. |
| `customRuleParser.ts` | `parseRelations`, `compileRule`, `formatRelations` | Strict parser for `{{...},{...}} -> {{...}}` signatures and relation lists. |
| `registry.ts` | `RULE_REGISTRY`, `MODEL_GROUPS`, `getRuleById` | Source-backed reference models with explicit seeds: four documentation fixtures and fourteen registry universes copied verbatim from their pages. Unknown IDs throw. |
| `metrics.ts` | `measureGraph`, `summarizeSamples` | Structural measurements of a state and median/p95 of timing samples. |

Semantics, scheduling convention and limits are described in the repository README. The matcher's search budget is counted in candidate examinations; index construction is timed but not counted.

## Tests

`model.test.ts` (semantics, fixtures, limits, matcher equivalence against an independent permutation reference), `__tests__/customRuleParser.test.ts`, `__tests__/engine.test.ts` and `engine.test.ts` (presets and compatibility wrappers), `metrics.test.ts`.

## Compatibility only

`engine.ts` wraps `createModelState` and `rewriteOnce` for older call sites and is used only by its tests. `parseAndApplyCustomRule` in the parser adapts the model to the legacy node/link delta shape. `rules/*.ts` and `utils/ids.ts` are legacy callback modules that the application does not import.
