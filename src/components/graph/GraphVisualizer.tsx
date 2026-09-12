import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import GraphRenderer, { type GraphRendererProps } from './GraphRenderer';

class GraphBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div className="graph-empty" role="alert">3D rendering is unavailable in this browser. The relation inspector and computation controls remain available.</div> : this.props.children;
  }
}
export default function GraphVisualizer(props: Omit<GraphRendererProps, 'width' | 'height'>) {
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setSize({ width: Math.floor(entry.contentRect.width), height: Math.floor(entry.contentRect.height) }));
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  return <div className="graph-canvas" ref={container} aria-label={props.view === 'spatial' ? '3D ordered hypergraph' : '3D aggregated causal dependencies'}>
    {size.width > 0 && size.height > 0 && <GraphBoundary><GraphRenderer {...props} {...size} /></GraphBoundary>}
    {props.view === 'causal' && !props.data.events.length && <div className="graph-empty">No events yet.<br /><small>Apply a rewrite to see its causal history.</small></div>}
    {props.view === 'spatial' && !props.data.edges.length && <div className="graph-empty">The relation multiset is empty.</div>}
  </div>;
}
