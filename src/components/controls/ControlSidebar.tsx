import { useState, useEffect } from 'react';
import { useSimulation } from '@/context/SimulationContext';
import { MODEL_GROUPS, RULE_REGISTRY } from '@/services/physics/registry';
import { compileRule, parseRelations, formatRelations } from '@/services/physics/customRuleParser';
import type { DisplayTheme, EventOrdering } from '@/services/physics/types';

const ORDERING_LABELS: Record<EventOrdering, string> = {
  'least-recent-edge': 'SetReplace default · least recent edge',
  'oldest-edge': 'Oldest edge · earlier convention',
};
import { ArrowUpRight, Check, RotateCcw } from 'lucide-react';

export function ControlSidebar() {
  const s = useSimulation();
  const [signature, setSignature] = useState(s.definition.signature);
  const [seed, setSeed] = useState(formatRelations(s.definition.seed));
  const [error, setError] = useState('');
  useEffect(() => { setSignature(s.definition.signature); setSeed(formatRelations(s.definition.seed)); setError(''); }, [s.definition]);
  const dirty = signature !== s.definition.signature || seed !== formatRelations(s.definition.seed);
  function apply() {
    try {
      compileRule(signature);
      s.setDefinition({ id: 'custom', name: 'Custom model', group: 'Custom', description: 'A locally defined ordered hypergraph replacement rule.', signature, seed: parseRelations(seed), source: '' });
      setError('');
    } catch (issue) { setError(issue instanceof Error ? issue.message : 'Invalid model.'); }
  }
  return <aside className="model-panel">
    <div className="section-label"><span>01 / Model definition</span><span className="tiny-dot" /></div>
    <h1>Simple rules.<br /><em>Emergent structure.</em></h1>
    <p className="lede">Explore the consequences of an exact, ordered hypergraph rewrite.</p>
    <label className="field-label" htmlFor="model-preset">Reference model</label>
    <select id="model-preset" value={s.definition.id} onChange={event => {
      const model = RULE_REGISTRY.find(rule => rule.id === event.target.value); if (model) s.setDefinition(model);
    }}>
      {MODEL_GROUPS.map(group => <optgroup key={group} label={group}>{RULE_REGISTRY.filter(rule => rule.group === group).map(rule => <option key={rule.id} value={rule.id}>{rule.name}</option>)}</optgroup>)}
      {s.definition.id === 'custom' && <option value="custom">Custom model</option>}
    </select>
    <p className="model-description">{s.definition.description}</p>
    <div className="field-heading"><label htmlFor="rewrite-rule">Replacement rule</label><span>LHS → RHS</span></div>
    <textarea id="rewrite-rule" spellCheck={false} rows={3} value={signature} onChange={e => setSignature(e.target.value)} />
    <div className="field-heading"><label htmlFor="initial-state">Initial relations</label><span>Ordered tuples</span></div>
    <textarea id="initial-state" spellCheck={false} rows={2} value={seed} onChange={e => setSeed(e.target.value)} />
    <p className="input-hint">Each pair of inner braces is one relation. Repeated relations remain distinct occurrences.</p>
    {error && <p className="error-message" role="alert">{error}</p>}
    <button className="apply-button" onClick={apply}><RotateCcw size={14} /> Apply & reset {dirty && <span className="unsaved-dot" />}</button>
    <div className="model-contract"><Check size={14} /><span>{dirty ? 'Draft changes are not running' : 'Running the rule and seed shown above'}</span></div>
    {s.definition.source && <a className="source-link" href={s.definition.source} target="_blank" rel="noreferrer">Read the primary source <ArrowUpRight size={14} /></a>}
    <details className="settings" open>
      <summary>Execution settings</summary>
      <div className="number-fields"><label>Events / batch<input aria-label="Events per batch" type="number" min="1" max="1000" value={s.batchSize} onChange={e => s.setBatchSize(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))} /></label>
      <label>Live atom limit<input aria-label="Live atom limit" type="number" min="1" max="10000" value={s.maxNodes} onChange={e => s.setMaxNodes(Math.max(1, Math.min(10000, Number(e.target.value) || 1)))} /></label></div>
      <label className="field-label" htmlFor="event-ordering">Event ordering</label>
      <select id="event-ordering" value={s.ordering} onChange={e => s.setOrdering(e.target.value as EventOrdering)}>
        {(Object.keys(ORDERING_LABELS) as EventOrdering[]).map(key => <option key={key} value={key}>{ORDERING_LABELS[key]}</option>)}
      </select>
      <p className="input-hint">Which complete match fires when several exist. Changing it starts a new run. Single-input rules evolve identically under both.</p>
      <label className="range-label">Playback interval <span>{s.speedMs} ms</span><input aria-label="Playback interval" type="range" min="100" max="1500" step="100" value={s.speedMs} onChange={e => s.setSpeedMs(Number(e.target.value))} /></label>
      <p className="input-hint">Atomic events · 20,000 relations · 10,000 events · 100,000 candidate checks per event.</p>
    </details>
    <details className="settings"><summary>Display settings</summary>
      <label className="field-label" htmlFor="display-theme">Theme</label>
      <select id="display-theme" value={s.theme} onChange={e => s.setTheme(e.target.value as DisplayTheme)}>
        <option value="dark">Dark</option><option value="plain">Plain · light, monochrome</option>
      </select>
      <label className="check-label"><input type="checkbox" checked={s.flat} onChange={e => s.setFlat(e.target.checked)} /> Flat layout (2D)</label>
      <label className="range-label">Atom size <span>{s.nodeSize}</span><input aria-label="Atom size" type="range" min="1" max="6" step="0.5" value={s.nodeSize} onChange={e => s.setNodeSize(Number(e.target.value))} /></label>
      <label className="range-label">Layout spacing <span>{s.linkDistance}</span><input aria-label="Layout spacing" type="range" min="10" max="100" step="5" value={s.linkDistance} onChange={e => s.setLinkDistance(Number(e.target.value))} /></label>
      <p className="input-hint">Layout distances are display coordinates. They are not physical distances.</p>
    </details>
  </aside>;
}
