import { Play, Pause, SkipForward, StepBack, RotateCcw, Layers } from 'lucide-react';
import { useSimulation } from '@/context/SimulationContext';

export function BottomControlBar() {
  const s = useSimulation();
  return <footer className="transport" aria-label="Playback">
    <button className="icon-button" title="Reset to seed" aria-label="Reset to seed" onClick={s.resetSimulation}><RotateCcw size={14} /></button>
    <button className="icon-button" title="Previous snapshot" aria-label="Previous snapshot" disabled={!s.currentStepIndex} onClick={s.stepBack}><StepBack size={15} /></button>
    <button className="play-button" aria-label={s.isPlaying ? 'Pause' : 'Run'} title={s.isPlaying ? 'Pause' : 'Run'} onClick={s.togglePlay}>{s.isPlaying ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}</button>
    <button className="icon-button" title="Apply one event, or advance to the next saved snapshot" aria-label="Apply one event, or advance to the next saved snapshot" onClick={() => s.stepForward()} disabled={s.isCalculating}><SkipForward size={15} /></button>
    <button title="Apply the configured number of events" aria-label="Apply the configured number of events" onClick={() => s.stepForward(s.batchSize)} disabled={s.isCalculating}><Layers size={14} />×{s.batchSize}</button>
    <input className="timeline" aria-label="Saved snapshots" title={`Saved snapshots ${s.currentStepIndex + 1} / ${s.history.length}`} type="range" min="0" max={Math.max(0, s.history.length - 1)} value={s.currentStepIndex} disabled={s.history.length < 2} onChange={e => s.jumpToStep(Number(e.target.value))} />
    <span className="event-counter" title="Completed events"><strong data-testid="event-count">{String(s.currentState.step).padStart(4, '0')}</strong></span>
  </footer>;
}
