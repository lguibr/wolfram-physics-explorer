import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { createModelState } from '@/services/physics/model';
import { compileRule } from '@/services/physics/customRuleParser';
import { RULE_REGISTRY } from '@/services/physics/registry';
import type { ModelDefinition, ModelState } from '@/services/physics/types';
import type { WorkerRequest, WorkerResponse } from '@/services/workerProtocol';

export const HISTORY_LIMIT = 100;
export interface BatchMetrics { rewriteMs: number; roundTripMs: number; events: number; candidateChecks: number }
interface SimulationContextType {
  history: ModelState[]; currentStepIndex: number; currentState: ModelState;
  definition: ModelDefinition; setDefinition: (definition: ModelDefinition) => void;
  isPlaying: boolean; isCalculating: boolean; error: string; workerFailed: boolean;
  togglePlay: () => void; stepForward: (count?: number) => void;
  stepBack: () => void; jumpToStep: (index: number) => void; resetSimulation: () => void;
  speedMs: number; setSpeedMs: (value: number) => void;
  maxNodes: number; setMaxNodes: (value: number) => void;
  batchSize: number; setBatchSize: (value: number) => void;
  nodeSize: number; setNodeSize: (value: number) => void;
  linkDistance: number; setLinkDistance: (value: number) => void;
  batchMetrics: BatchMetrics | null;
}
const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [definition, updateDefinition] = useState(RULE_REGISTRY[0]);
  const [history, setHistory] = useState<ModelState[]>(() => [createModelState(RULE_REGISTRY[0].seed)]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState('');
  const [workerFailed, setWorkerFailed] = useState(false);
  const [speedMs, setSpeedMs] = useState(300);
  const [maxNodes, setMaxNodes] = useState(2000);
  const [batchSize, setBatchSize] = useState(10);
  const [nodeSize, setNodeSize] = useState(3);
  const [linkDistance, setLinkDistance] = useState(30);
  const [batchMetrics, setBatchMetrics] = useState<BatchMetrics | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const runId = useRef(0);
  const nextRequestId = useRef(0);
  const pending = useRef<{ requestId: number; runId: number; sourceStep: number; started: number } | null>(null);
  const currentState = history[currentStepIndex];

  useEffect(() => {
    const worker = new Worker(new URL('../services/worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
      const active = pending.current;
      if (!active || data.requestId !== active.requestId || data.runId !== active.runId) return;
      if (data.type === 'result' && data.sourceStep !== active.sourceStep) return;
      pending.current = null;
      setIsCalculating(false);
      if (data.type === 'error') {
        setError(data.message); setIsPlaying(false); return;
      }
      setBatchMetrics({ rewriteMs: data.durationMs, roundTripMs: performance.now() - active.started, events: data.completed, candidateChecks: data.candidateChecks });
      if (data.state.status !== 'ready') setIsPlaying(false);
      setHistory(previous => {
        if (data.completed === 0) return [...previous.slice(0, -1), data.state];
        return [...previous, data.state].slice(-HISTORY_LIMIT);
      });
      if (data.completed > 0) setCurrentStepIndex(index => Math.min(index + 1, HISTORY_LIMIT - 1));
    };
    worker.onerror = () => {
      // Fires for module-load failure (usually before any request) and for uncaught worker exceptions.
      // Either way the worker is unusable: drop it so later steps refuse instead of waiting forever.
      worker.terminate(); workerRef.current = null;
      pending.current = null; setIsCalculating(false); setIsPlaying(false); setWorkerFailed(true);
      setError('The computation worker failed. Reload the page to restart it.');
    };
    return () => { worker.terminate(); workerRef.current = null; };
  }, []);

  const invalidate = useCallback(() => {
    runId.current += 1; pending.current = null;
    setIsCalculating(false); setIsPlaying(false); setError('');
  }, []);
  const resetWith = useCallback((model: ModelDefinition) => {
    compileRule(model.signature);
    const initial = createModelState(model.seed);
    invalidate(); setHistory([initial]); setCurrentStepIndex(0); setBatchMetrics(null);
  }, [invalidate]);
  const setDefinition = useCallback((model: ModelDefinition) => {
    resetWith(model); updateDefinition({ ...model, seed: model.seed.map(edge => [...edge]) });
  }, [resetWith]);
  const resetSimulation = useCallback(() => resetWith(definition), [resetWith, definition]);
  const jumpToStep = useCallback((index: number) => {
    invalidate(); setCurrentStepIndex(Math.max(0, Math.min(Math.trunc(index), history.length - 1)));
  }, [invalidate, history.length]);
  const stepForward = useCallback((count = 1) => {
    if (pending.current) return;
    if (currentStepIndex < history.length - 1) {
      setCurrentStepIndex(index => index + 1); return;
    }
    const worker = workerRef.current;
    if (!worker) { setError('The computation worker is unavailable.'); return; }
    const identity = { requestId: ++nextRequestId.current, runId: runId.current };
    pending.current = { ...identity, sourceStep: currentState.step, started: performance.now() };
    setIsCalculating(true); setError('');
    const request: WorkerRequest = { type: 'evolve', ...identity, state: currentState, signature: definition.signature, count,
      limits: { maxNodes, maxEdges: 20000, maxEvents: 10000, maxMatchChecks: 100000 } };
    try { worker.postMessage(request); }
    catch (issue) {
      pending.current = null; setIsCalculating(false); setIsPlaying(false);
      setError(issue instanceof Error ? issue.message : 'Unable to post the computation request.');
    }
  }, [currentStepIndex, history.length, currentState, definition.signature, maxNodes]);
  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => stepForward(batchSize), speedMs);
    return () => window.clearInterval(timer);
  }, [isPlaying, speedMs, batchSize, stepForward]);

  return <SimulationContext.Provider value={{ history, currentStepIndex, currentState, definition, setDefinition,
    isPlaying, isCalculating, error, workerFailed, togglePlay: () => setIsPlaying(value => !value), stepForward,
    stepBack: () => jumpToStep(currentStepIndex - 1), jumpToStep, resetSimulation,
    speedMs, setSpeedMs, maxNodes, setMaxNodes, batchSize, setBatchSize, nodeSize, setNodeSize,
    linkDistance, setLinkDistance, batchMetrics }}>{children}</SimulationContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSimulation() {
  const context = useContext(SimulationContext);
  if (!context) throw new Error('useSimulation must be used within SimulationProvider');
  return context;
}
