import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
let root: Root;
let container: HTMLDivElement;
const render = (children: ReactNode) => {
  container = document.createElement('div'); document.body.append(container);
  root = createRoot(container); act(() => root.render(children));
};
const screen = {
  getByTestId: (id: string) => container.querySelector(`[data-testid="${id}"]`)!,
  getByText: (text: string) => [...container.querySelectorAll('button')].find(b => b.textContent === text)!,
};
const fireEvent = { click: (element: Element) => act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true }))) };
const cleanup = () => { if (root) act(() => root.unmount()); container?.remove(); };
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import { SimulationProvider, useSimulation } from './SimulationContext';
import { processWorkerRequest, type WorkerRequest, type WorkerResponse } from '@/services/workerProtocol';
import { RULE_REGISTRY } from '@/services/physics/registry';

class FakeWorker {
  static current: FakeWorker;
  onmessage: ((e: { data: WorkerResponse }) => void) | null = null;
  onerror: (() => void) | null = null;
  requests: WorkerRequest[] = [];
  constructor() { FakeWorker.current = this; }
  postMessage(request: WorkerRequest) { this.requests.push(request); }
  terminate() {}
  reply(request = this.requests.at(-1)!) { this.onmessage?.({ data: processWorkerRequest(request) }); }
}
function Harness() {
  const s = useSimulation();
  return <>
    <output data-testid="state">{JSON.stringify({ step: s.currentState.step, status: s.currentState.status, length: s.history.length, busy: s.isCalculating, error: s.error, rule: s.definition.id, ordering: s.ordering })}</output>
    <button onClick={() => s.setOrdering('oldest-edge')}>oldest</button>
    <button onClick={() => s.stepForward()}>step</button>
    <button onClick={() => { s.stepForward(); s.stepForward(); }}>double</button>
    <button onClick={s.resetSimulation}>reset</button>
    <button onClick={() => s.setDefinition(RULE_REGISTRY[1])}>switch</button>
    <button onClick={() => s.jumpToStep(0)}>back</button>
    <button onClick={() => s.setDefinition({ id:'custom',name:'Unary',description:'',signature:'{{x}} -> {{y}}',seed:[['1']],source:'' })}>custom</button>
  </>;
}
const state = () => JSON.parse(screen.getByTestId('state').textContent!);
beforeEach(() => { vi.stubGlobal('Worker', FakeWorker); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('worker and playback lifecycle', () => {
  it('serializes selected custom rules and their explicit seeds', () => {
    render(<SimulationProvider><Harness /></SimulationProvider>);
    fireEvent.click(screen.getByText('custom')); fireEvent.click(screen.getByText('step'));
    const req = FakeWorker.current.requests[0];
    expect(req.signature).toBe('{{x}} -> {{y}}'); expect(req.state.edges[0].atoms).toEqual(['1']);
    act(() => FakeWorker.current.reply()); expect(state().step).toBe(1);
  });
  it('sends the selected event ordering and starts a new run when it changes', () => {
    render(<SimulationProvider><Harness /></SimulationProvider>);
    fireEvent.click(screen.getByText('step'));
    expect(FakeWorker.current.requests[0].ordering).toBe('least-recent-edge');
    act(() => FakeWorker.current.reply()); expect(state().length).toBe(2);
    fireEvent.click(screen.getByText('oldest'));
    expect(state()).toMatchObject({ step: 0, length: 1, ordering: 'oldest-edge' });
    fireEvent.click(screen.getByText('step'));
    expect(FakeWorker.current.requests[1].ordering).toBe('oldest-edge');
  });
  it('allows only one outstanding request even within the same render', () => {
    render(<SimulationProvider><Harness /></SimulationProvider>);
    fireEvent.click(screen.getByText('double'));
    expect(FakeWorker.current.requests).toHaveLength(1);
  });
  it.each(['reset','switch','back'])('ignores a delayed response after %s', action => {
    render(<SimulationProvider><Harness /></SimulationProvider>);
    fireEvent.click(screen.getByText('step'));
    const req = FakeWorker.current.requests[0];
    fireEvent.click(screen.getByText(action));
    act(() => FakeWorker.current.reply(req));
    expect(state()).toMatchObject({ step:0, length:1, busy:false });
  });
  it('surfaces current worker errors without advancing history', () => {
    render(<SimulationProvider><Harness /></SimulationProvider>);
    fireEvent.click(screen.getByText('step'));
    const req = FakeWorker.current.requests[0];
    act(() => FakeWorker.current.onmessage?.({ data: { type:'error', requestId:req.requestId, runId:req.runId, message:'Search failed' } }));
    expect(state()).toMatchObject({ step:0, length:1, busy:false, error:'Search failed' });
  });
  it('surfaces worker startup failure before any request and refuses a dead worker', () => {
    render(<SimulationProvider><Harness /></SimulationProvider>);
    const terminate = vi.spyOn(FakeWorker.current, 'terminate');
    act(() => FakeWorker.current.onerror?.());
    expect(state().error).toMatch(/Reload/);
    expect(terminate).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('step'));
    expect(FakeWorker.current.requests).toHaveLength(0);
    expect(state().busy).toBe(false);
    expect(state().error).toMatch(/unavailable/);
  });
  it('recovers from a synchronous posting failure without remaining busy', () => {
    render(<SimulationProvider><Harness /></SimulationProvider>);
    vi.spyOn(FakeWorker.current, 'postMessage').mockImplementationOnce(() => { throw new Error('Cannot post request'); });
    fireEvent.click(screen.getByText('step'));
    expect(state()).toMatchObject({ step: 0, busy: false, error: 'Cannot post request' });
    fireEvent.click(screen.getByText('step'));
    expect(FakeWorker.current.requests).toHaveLength(1);
  });
  it('ignores obsolete errors too', () => {
    render(<SimulationProvider><Harness /></SimulationProvider>);
    fireEvent.click(screen.getByText('step')); const req = FakeWorker.current.requests[0];
    fireEvent.click(screen.getByText('reset'));
    act(() => FakeWorker.current.onmessage?.({ data: { type:'error', requestId:req.requestId, runId:req.runId, message:'Old error' } }));
    expect(state().error).toBe('');
  });
});
