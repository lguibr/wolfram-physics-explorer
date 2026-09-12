import { describe, expect, it } from 'vitest';
import { processWorkerRequest } from './workerProtocol';
import { createModelState } from './physics/model';

describe('serialized worker protocol', () => {
  const request = { type: 'evolve' as const, requestId: 7, runId: 3, signature: '{{x}} -> {{y}}', state: createModelState([['1']]), count: 1, limits: { maxNodes: 1 } };
  it('executes a custom signature instead of resolving a main-thread registry ID', () => {
    const result = processWorkerRequest(structuredClone(request));
    expect(result.type).toBe('result');
    if (result.type !== 'result') throw new Error(result.message);
    expect(result.state.edges[0].atoms).toEqual(['2']);
    expect(result).toMatchObject({ requestId: 7, runId: 3, sourceStep: 0, completed: 1 });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
  it('returns identifiable errors instead of successful unchanged states', () => {
    expect(processWorkerRequest({ ...request, signature: 'invalid' })).toMatchObject({ type: 'error', requestId: 7, runId: 3 });
  });
  it('reports no match without inventing an event', () => {
    const result = processWorkerRequest({ ...request, signature: '{{x,y}} -> {{x,y}}' });
    expect(result.type === 'result' && result.state.status).toBe('no-match');
    expect(result.type === 'result' && result.completed).toBe(0);
  });
  it('rejects unsupported shared-buffer execution', () => {
    expect(processWorkerRequest({ ...request, type: 'STEP_SHARED' } as unknown as typeof request).type).toBe('error');
  });
});
