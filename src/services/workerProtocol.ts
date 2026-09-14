import { compileRule } from './physics/customRuleParser';
import { runEvents } from './physics/model';
import type { EventOrdering, ModelLimits, ModelState } from './physics/types';

export interface WorkerRequest {
  type: 'evolve'; requestId: number; runId: number;
  signature: string; state: ModelState; count: number; limits: ModelLimits;
  ordering?: EventOrdering; // omitted means the model default
}
export type WorkerResponse = {
  type: 'result'; requestId: number; runId: number; sourceStep: number;
  state: ModelState; completed: number; candidateChecks: number; durationMs: number;
} | { type: 'error'; requestId: number; runId: number; message: string };

export function processWorkerRequest(request: WorkerRequest): WorkerResponse {
  const identity = { requestId: request.requestId, runId: request.runId };
  try {
    if (request.type !== 'evolve') throw new Error('Unsupported worker operation.');
    const compiled = compileRule(request.signature);
    const started = performance.now();
    const result = runEvents(request.state, compiled, request.count, request.limits, request.ordering);
    return { type: 'result', ...identity, sourceStep: request.state.step, ...result, durationMs: performance.now() - started };
  } catch (error) {
    return { type: 'error', ...identity, message: error instanceof Error ? error.message : 'Evolution failed.' };
  }
}
