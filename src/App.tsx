import { useMemo, useState, useCallback } from 'react';
import { Activity, ArrowDownToLine, Expand, Network, GitBranch } from 'lucide-react';
import GraphVisualizer from './components/graph/GraphVisualizer';
import type { GraphView, VisualNode } from './components/graph/projection';
import { ControlSidebar } from './components/controls/ControlSidebar';
import { StatsDisplay } from './components/controls/StatsDisplay';
import { BottomControlBar } from './components/controls/BottomControlBar';
import { SimulationProvider, useSimulation } from './context/SimulationContext';
import type { StopReason } from './services/physics/types';

const stopLabels: Record<StopReason, string> = {
  ready: 'Ready to rewrite', 'no-match': 'Halted · no matching input',
  'node-limit': 'Stopped · live atom limit', 'edge-limit': 'Stopped · relation limit',
  'event-limit': 'Stopped · event limit', 'match-limit': 'Stopped · search budget',
};
function AppContent() {
  const s = useSimulation();
  const [view, setView] = useState<GraphView>('spatial');
  const [fitKey, setFitKey] = useState(0);
  const [selected, setSelected] = useState<VisualNode | null>(null);
  const selectNode = useCallback((node: VisualNode) => setSelected({ ...node }), []);
  const [filter, setFilter] = useState('');
  const filtered = useMemo(() => s.currentState.edges.filter(edge => !filter || edge.id === filter || edge.atoms.includes(filter)), [s.currentState.edges, filter]);
  const lastEvent = s.currentState.events.at(-1);
  const selectedEvent = selected?.kind === 'event' ? s.currentState.events.find(e => `event:${e.id}` === selected.id) : undefined;
  const selectedAtom = selected?.kind === 'atom' && s.currentState.edges.some(e => e.atoms.includes(selected.label));
  const selectedRelation = selected?.kind === 'relation' ? s.currentState.edges.find(e => `edge:${e.id}` === selected.id) : undefined;
  function exportState() {
    const payload = { format: 'wolfram-explorer-state-v1', scheduler: 'first complete match in LHS order over oldest surviving edge occurrences', definition: s.definition, limits: { maxNodes: s.maxNodes, maxEdges: 20000, maxEvents: 10000, maxMatchChecks: 100000 }, state: s.currentState };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${s.definition.id}-event-${s.currentState.step}.json`; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="laboratory">
    <header className="masthead"><a className="wordmark" href="https://www.wolframphysics.org/" target="_blank" rel="noreferrer"><Activity size={24} /><span>WOLFRAM<span className="wordmark-light"> / PHYSICS EXPLORER</span></span></a>
      <span className="masthead-note">Ordered hypergraph laboratory</span><button className="export-button" onClick={exportState}><ArrowDownToLine size={15} />Export state</button></header>
    <main className="workspace"><ControlSidebar />
      <section className="graph-stage" aria-label="Model visualization">
        <div className="graph-toolbar"><div className="view-switch" role="group" aria-label="Graph view">
          <button aria-pressed={view === 'spatial'} onClick={() => { setView('spatial'); setSelected(null); }}><Network size={15} />Spatial</button>
          <button aria-pressed={view === 'causal'} onClick={() => { setView('causal'); setSelected(null); }}><GitBranch size={15} />Causal</button></div>
          <button className="icon-button" aria-label="Fit graph" title="Fit graph to view" onClick={() => setFitKey(key => key + 1)}><Expand size={16} /></button></div>
        <div className="graph-heading"><span className="eyebrow">{s.definition.id === 'custom' ? 'Custom rule' : `Reference / ${s.definition.id}`}</span><h2>{view === 'spatial' ? 'The evolving structure' : 'How events depend'}</h2><p>{view === 'spatial' ? 'One state. Every relation occurrence.' : 'Aggregated dependencies between rewriting events.'}</p></div>
        <GraphVisualizer data={s.currentState} view={view} nodeSize={s.nodeSize} linkDistance={s.linkDistance} fitKey={fitKey} onSelect={selectNode} />
        <div className="graph-caption"><div className="legend"><span><i className={view === 'spatial' ? 'mint' : 'amber'} />{view === 'spatial' ? 'Atom' : 'Event'}</span>{view === 'spatial' && <span><i className="amber" />Unary / higher-arity relation</span>}</div>
          <span>Drag to orbit · scroll to zoom · select to inspect</span></div>
        {(selectedAtom || selectedRelation || selectedEvent) && <div className="selection-card"><button className="close-selection" aria-label="Close selection" onClick={() => setSelected(null)}>×</button>
          <span className="section-label">Selected {selected!.kind}</span><strong>{selected!.label}</strong>
          {selectedAtom && <button onClick={() => setFilter(selected!.label)}>Show incident relations</button>}
          {selectedRelation && <code>{`{${selectedRelation.atoms.join(', ')}}`} · {selectedRelation.id}</code>}
          {selectedEvent && <p>Generation {selectedEvent.generation}<br />Inputs: {selectedEvent.inputEdges.join(', ')}<br />Outputs: {selectedEvent.outputEdges.join(', ') || 'none'}<br />Parents: {selectedEvent.parents.join(', ') || 'initial boundary'}</p>}
        </div>}
        <div className={`run-status ${s.currentState.status === 'ready' ? '' : 'stopped'}`} role="status"><i />{s.isCalculating ? 'Computing atomic rewrites…' : s.isPlaying ? 'Running' : stopLabels[s.currentState.status]}</div>
        {s.error && <div className="worker-error" role="alert">{s.error}{s.workerFailed && <button onClick={() => window.location.reload()}>Reload</button>}</div>}
      </section>
      <aside className="inspection-panel"><StatsDisplay />
        <details className="relation-inspector" open><summary>03 / Relation inspector <span>{s.currentState.edges.length}</span></summary>
          <input aria-label="Filter relations by atom or occurrence ID" placeholder="Atom label or relation ID…" value={filter} onChange={e => setFilter(e.target.value)} />
          <div className="relation-table" data-testid="relation-table"><table><thead><tr><th>ID</th><th>Ordered tuple</th><th>Creator</th></tr></thead><tbody>{filtered.slice(0, 50).map(edge => <tr key={edge.id}><td>{edge.id}</td><td>{`{${edge.atoms.join(', ')}}`}</td><td>{edge.creator ?? 'seed'}</td></tr>)}</tbody></table></div>
          <p className="input-hint">Showing {Math.min(50, filtered.length)} of {filtered.length} matches. Export contains all relations and events.</p>
        </details>
        {lastEvent && <details className="event-inspector"><summary>Latest event / {lastEvent.id}</summary><p>Generation {lastEvent.generation}<br />Consumed: {lastEvent.inputEdges.join(', ')}<br />Created: {lastEvent.outputEdges.join(', ') || 'none'}<br />Parent events: {lastEvent.parents.join(', ') || 'initial boundary'}</p></details>}
      </aside>
    </main><BottomControlBar />
    <div className="method-bar"><span><i />Deterministic first-match scheduler</span><details><summary>Model semantics & interpretation</summary><div className="method-details"><p>State is a multiset of ordered tuples. Each input occurrence is consumed once. Different variables may match the same atom; RHS-only variables receive fresh atoms. One step applies one event. A generation is one plus the maximum input generation.</p><p>The scheduler selects the first complete match in LHS order over oldest surviving occurrences. This is a project convention; it is not a claim of SetReplace default-order parity. Causal links aggregate dependencies from consumed output occurrences into one link per parent pair.</p><p>Binary arrows indicate tuple order. Amber hubs represent unary or higher-arity relations; hover a link for its tuple position. Layout and colors are presentation only. The explorer does not establish physical laws, causal invariance, or quantum behavior. It follows a single trajectory, not a multiway system.</p><p>Canonical fixtures were checked against primary-source descriptions. Their transitions were derived locally; no external WolframModel execution was performed. <a href="https://www.wolframphysics.org/technical-introduction/" target="_blank" rel="noreferrer">Technical introduction ↗</a></p></div></details></div>
  </div>;
}
export default function App() { return <SimulationProvider><AppContent /></SimulationProvider>; }
