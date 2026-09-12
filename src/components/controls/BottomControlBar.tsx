import { Play, Pause, SkipForward, StepBack, RotateCcw, Layers } from 'lucide-react';
import { HISTORY_LIMIT, useSimulation } from '@/context/SimulationContext';

export function BottomControlBar() {
  const s = useSimulation();
  return <footer className="transport">
    <div className="transport-buttons">
      <button className="icon-button" title="Reset to seed" aria-label="Reset to seed" onClick={s.resetSimulation}><RotateCcw size={17} /></button>
      <button className="icon-button" title="Previous snapshot" aria-label="Previous snapshot" disabled={!s.currentStepIndex} onClick={s.stepBack}><StepBack size={18} /></button>
      <button className="play-button" onClick={s.togglePlay}>{s.isPlaying ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}{s.isPlaying ? 'Pause' : 'Run'}</button>
      <button title="Apply one event, or advance to the next saved snapshot" onClick={() => s.stepForward()} disabled={s.isCalculating}><SkipForward size={16} />1 event</button>
      <button title="Apply the configured number of events" onClick={() => s.stepForward(s.batchSize)} disabled={s.isCalculating}><Layers size={16} /><span>Batch ×{s.batchSize}</span></button>
    </div>
    <div className="timeline"><label htmlFor="history">Saved snapshots <span>{s.currentStepIndex + 1} / {s.history.length}</span></label>
      <input id="history" type="range" min="0" max={Math.max(0, s.history.length - 1)} value={s.currentStepIndex} disabled={s.history.length < 2} onChange={e => s.jumpToStep(Number(e.target.value))} />
      <span className="timeline-hint">Latest {HISTORY_LIMIT} snapshots retained · batches save their final state</span>
    </div>
    <div className="event-counter"><span>Event</span><strong data-testid="event-count">{String(s.currentState.step).padStart(4, '0')}</strong></div>
  </footer>;
}
