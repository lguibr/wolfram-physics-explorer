import { useMemo, useState, useCallback } from 'react';
import { Activity, ArrowDownToLine, Expand, Network, GitBranch, Settings, Info } from 'lucide-react';
import GraphVisualizer from './components/graph/GraphVisualizer';
import type { GraphView, VisualNode } from './components/graph/projection';
import { ControlSidebar, ModelPicker } from './components/controls/ControlSidebar';
import { StatsDisplay } from './components/controls/StatsDisplay';
import { BottomControlBar } from './components/controls/BottomControlBar';
import { SimulationProvider, useSimulation } from './context/SimulationContext';
import { ORDERING_DESCRIPTIONS } from './services/physics/model';
import type { StopReason } from './services/physics/types';

const stopLabels: Record<StopReason, string> = {
  ready: 'Ready', 'no-match': 'Halted · no matching input',
  'node-limit': 'Stopped · live atom limit', 'edge-limit': 'Stopped · relation limit',
  'event-limit': 'Stopped · event limit', 'match-limit': 'Stopped · search budget',
};
function AppContent() {
  const s = useSimulation();
  const [view, setView] = useState<GraphView>('spatial');
  const [fitKey, setFitKey] = useState(0);
  const [modelOpen, setModelOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<VisualNode | null>(null);
  const selectNode = useCallback((node: VisualNode) => setSelected({ ...node }), []);
  const [filter, setFilter] = useState('');
  const filtered = useMemo(() => s.currentState.edges.filter(edge => !filter || edge.id === filter || edge.atoms.includes(filter)), [s.currentState.edges, filter]);
  const lastEvent = s.currentState.events.at(-1);
  const selectedEvent = selected?.kind === 'event' ? s.currentState.events.find(e => `event:${e.id}` === selected.id) : undefined;
  const selectedAtom = selected?.kind === 'atom' && s.currentState.edges.some(e => e.atoms.includes(selected.label));
  const selectedRelation = selected?.kind === 'relation' ? s.currentState.edges.find(e => `edge:${e.id}` === selected.id) : undefined;
  const atoms = useMemo(() => new Set(s.currentState.edges.flatMap(e => [...e.atoms])).size, [s.currentState.edges]);
  function exportState() {
    const payload = { format: 'wolfram-explorer-state-v1', ordering: s.ordering, scheduler: ORDERING_DESCRIPTIONS[s.ordering], definition: s.definition, limits: { maxNodes: s.maxNodes, maxEdges: 20000, maxEvents: 10000, maxMatchChecks: 100000 }, state: s.currentState };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${s.definition.id}-event-${s.currentState.step}.json`; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className={`laboratory${s.theme === 'plain' ? ' plain' : ''}`}>
    <section className="graph-stage" aria-label="Model visualization">
      <GraphVisualizer data={s.currentState} view={view} nodeSize={s.nodeSize} linkDistance={s.linkDistance} fitKey={fitKey} theme={s.theme} flat={s.flat} onSelect={selectNode} />
    </section>
    <header className="topbar">
      <a className="wordmark" href="https://www.wolframphysics.org/" target="_blank" rel="noreferrer" title="Wolfram Physics Project"><Activity size={16} /></a>
      <ModelPicker />
      <div className="view-switch" role="group" aria-label="Graph view">
        <button aria-pressed={view === 'spatial'} title="Spatial view: atoms and relations" onClick={() => { setView('spatial'); setSelected(null); }}><Network size={14} /></button>
        <button aria-pressed={view === 'causal'} title="Causal view: events and dependencies" onClick={() => { setView('causal'); setSelected(null); }}><GitBranch size={14} /></button>
      </div>
      <button className="icon-button" aria-label="Fit graph" title="Fit graph to view" onClick={() => setFitKey(key => key + 1)}><Expand size={14} /></button>
      <span className="spacer" />
      <button className="icon-button" aria-pressed={modelOpen} aria-label="Model definition and settings" title="Model definition and settings" onClick={() => setModelOpen(open => !open)}><Settings size={14} /></button>
      <button className="icon-button" aria-pressed={detailsOpen} aria-label="Measurements and inspector" title="Measurements and inspector" onClick={() => setDetailsOpen(open => !open)}><Info size={14} /></button>
      <button className="icon-button" aria-label="Export state" title="Export state as JSON" onClick={exportState}><ArrowDownToLine size={14} /></button>
    </header>
    {modelOpen && <aside className="drawer left" aria-label="Model definition and settings"><ControlSidebar /></aside>}
    {detailsOpen && <aside className="drawer right" aria-label="Measurements and inspector"><StatsDisplay />
      <details className="relation-inspector" open><summary>Relation inspector <span>{s.currentState.edges.length}</span></summary>
        <input aria-label="Filter relations by atom or occurrence ID" placeholder="Atom label or relation ID…" value={filter} onChange={e => setFilter(e.target.value)} />
        <div className="relation-table" data-testid="relation-table"><table><thead><tr><th>ID</th><th>Ordered tuple</th><th>Creator</th></tr></thead><tbody>{filtered.slice(0, 50).map(edge => <tr key={edge.id}><td>{edge.id}</td><td>{`{${edge.atoms.join(', ')}}`}</td><td>{edge.creator ?? 'seed'}</td></tr>)}</tbody></table></div>
        <p className="input-hint">Showing {Math.min(50, filtered.length)} of {filtered.length} matches. Export contains all relations and events.</p>
      </details>
      {lastEvent && <details className="event-inspector"><summary>Latest event / {lastEvent.id}</summary><p>Generation {lastEvent.generation}<br />Consumed: {lastEvent.inputEdges.join(', ')}<br />Created: {lastEvent.outputEdges.join(', ') || 'none'}<br />Parent events: {lastEvent.parents.join(', ') || 'initial boundary'}</p></details>}
      <details className="event-inspector"><summary>Model semantics &amp; interpretation</summary><div className="method-details"><p>State is a multiset of ordered tuples. Each input occurrence is consumed once. Different variables may match the same atom; RHS-only variables receive fresh atoms. One step applies one event. A generation is one plus the maximum input generation.</p><p>The default event ordering applies the complete match that avoids the newest occurrences, with ties broken by rule-input order; this is SetReplace's documented default (LeastRecentEdge, RuleOrdering). The oldest-edge option keeps the earlier first-match convention. Both are deterministic, and single-input rules evolve identically under either. Causal links aggregate dependencies from consumed output occurrences into one link per parent pair.</p><p>Binary arrows indicate tuple order. Hubs represent unary or higher-arity relations; hover a link for its tuple position. Layout, theme and colors are presentation only. The explorer does not establish physical laws, causal invariance, or quantum behavior. It follows a single trajectory, not a multiway system.</p><p>Canonical fixtures were derived from primary-source descriptions, and eighteen textual outputs published in the SetReplace documentation are reproduced under the default ordering. No live WolframModel execution was performed. <a href="https://www.wolframphysics.org/technical-introduction/" target="_blank" rel="noreferrer">Technical introduction ↗</a></p></div></details>
    </aside>}
    <div className="hud">
      <span className={`run-status ${s.currentState.status === 'ready' ? '' : 'stopped'}`} role="status"><i />{s.isCalculating ? 'Computing…' : s.isPlaying ? 'Running' : stopLabels[s.currentState.status]}</span>
      <span className="counts"><b data-testid="atom-count">{atoms.toLocaleString()}</b> atoms · <b data-testid="relation-count">{s.currentState.edges.length.toLocaleString()}</b> relations · gen {s.currentState.generation}</span>
      {view === 'spatial' && <span className="legend"><i className="atom-dot" />atom<i className="hub-dot" />relation hub</span>}
    </div>
    {(selectedAtom || selectedRelation || selectedEvent) && <div className="selection-card"><button className="close-selection" aria-label="Close selection" onClick={() => setSelected(null)}>×</button>
      <span className="section-label">Selected {selected!.kind}</span><strong>{selected!.label}</strong>
      {selectedAtom && <button onClick={() => { setFilter(selected!.label); setDetailsOpen(true); }}>Show incident relations</button>}
      {selectedRelation && <code>{`{${selectedRelation.atoms.join(', ')}}`} · {selectedRelation.id}</code>}
      {selectedEvent && <p>Generation {selectedEvent.generation}<br />Inputs: {selectedEvent.inputEdges.join(', ')}<br />Outputs: {selectedEvent.outputEdges.join(', ') || 'none'}<br />Parents: {selectedEvent.parents.join(', ') || 'initial boundary'}</p>}
    </div>}
    {s.error && <div className="worker-error" role="alert">{s.error}{s.workerFailed && <button onClick={() => window.location.reload()}>Reload</button>}</div>}
    <BottomControlBar />
  </div>;
}
export default function App() { return <SimulationProvider><AppContent /></SimulationProvider>; }
