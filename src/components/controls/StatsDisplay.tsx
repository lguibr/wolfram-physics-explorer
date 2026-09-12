import { useEffect, useMemo, useState } from 'react';
import { useSimulation } from '@/context/SimulationContext';
import { measureGraph, summarizeSamples } from '@/services/physics/metrics';

function FrameCadence() {
  const [sample, setSample] = useState<{ median: number; p95: number; count: number } | null>(null);
  useEffect(() => {
    let handle = 0, previous = 0, published = 0;
    let values: number[] = [];
    const frame = (now: number) => {
      if (document.hidden) { previous = 0; values = []; }
      else {
        if (previous) values.push(now - previous);
        previous = now;
        if (now - published >= 1000) {
          if (values.length) setSample({ ...summarizeSamples(values), count: values.length });
          values = []; published = now;
        }
      }
      handle = requestAnimationFrame(frame);
    };
    handle = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(handle);
  }, []);
  return <><div className="metric-row"><span>Browser cadence</span><strong>{sample ? `${(1000 / sample.median).toFixed(0)} Hz` : 'Sampling…'}</strong></div>
    <div className="metric-row"><span>Frame interval · median / p95</span><strong>{sample ? `${sample.median.toFixed(1)} / ${sample.p95.toFixed(1)} ms` : '—'}</strong></div>
    <p className="input-hint">Visible-tab animation callbacks; {sample?.count ?? 0} samples in the latest window. Includes browser scheduling, not GPU render time.</p></>;
}
export function StatsDisplay() {
  const { currentState, batchMetrics } = useSimulation();
  const m = useMemo(() => measureGraph(currentState), [currentState]);
  return <section className="metrics-panel" aria-label="Model and performance measurements">
    <div className="section-label">02 / Measurements</div>
    <div className="primary-metrics">
      <div><span>Live atoms</span><strong data-testid="atom-count">{m.atoms.toLocaleString()}</strong></div>
      <div><span>Relations</span><strong data-testid="relation-count">{m.relations.toLocaleString()}</strong></div>
    </div>
    <div className="metric-row"><span>Completed events</span><strong>{m.events.toLocaleString()}</strong></div>
    <div className="metric-row" title="Maximum event generation reached; an event's generation is one plus the maximum generation of its inputs."><span>Maximum generation</span><strong>{m.generation}</strong></div>
    <div className="metric-row" title="Connected components of the undirected incidence structure."><span>Connected components</span><strong>{m.components}</strong></div>
    <div className="metric-row" title="Every tuple position counts, including repeated atoms."><span>Incidences</span><strong>{m.incidences.toLocaleString()}</strong></div>
    <div className="metric-row"><span>Incidence / atom · mean / max</span><strong>{m.meanIncidence.toFixed(2)} / {m.maxIncidence}</strong></div>
    <div className="metric-row"><span>Binary self-loops</span><strong>{m.selfLoops}</strong></div>
    <div className="arity"><span className="field-label">Relation arity</span>{Object.entries(m.arityCounts).map(([arity, count]) => <div className="arity-row" key={arity}><span>{arity}-ary</span><div><i style={{ width: `${count / m.relations * 100}%` }} /></div><strong>{count}</strong></div>)}{!m.relations && <small>Empty multiset</small>}</div>
    <div className="section-label runtime-label">Runtime / latest batch</div>
    <div className="metric-row"><span>Rewrite computation</span><strong>{batchMetrics ? `${batchMetrics.rewriteMs.toFixed(2)} ms` : '—'}</strong></div>
    <div className="metric-row"><span>Worker round trip</span><strong>{batchMetrics ? `${batchMetrics.roundTripMs.toFixed(2)} ms` : '—'}</strong></div>
    <div className="metric-row"><span>Events / candidate checks</span><strong>{batchMetrics ? `${batchMetrics.events} / ${batchMetrics.candidateChecks.toLocaleString()}` : '—'}</strong></div>
    <p className="input-hint">Computation includes matching and state construction. Round trip also includes messaging and rule parsing. Index construction is timed but is not a candidate check.</p>
    <FrameCadence />
  </section>;
}
