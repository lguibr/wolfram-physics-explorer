import React from 'react';
import { HypergraphState } from '@/types';
import GraphRenderer from './GraphRenderer';

import { GraphRendererHandle, VisualProps } from './GraphRenderer';

interface GraphVisualizerProps {
  data: HypergraphState;
  extraVisualProps?: VisualProps;
}

const GraphVisualizer = React.forwardRef<GraphRendererHandle, GraphVisualizerProps>(({ data, extraVisualProps }, ref) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = React.useState({ width: window.innerWidth, height: window.innerHeight });

  React.useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions(prev => {
             // Precise check to avoid re-renders on sub-pixel jitter or redundant callbacks
             if (Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1) return prev;
             return { width, height };
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    
    // Initial size
    setDimensions({ 
        width: containerRef.current.clientWidth, 
        height: containerRef.current.clientHeight 
    });

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full absolute inset-0 bg-cosmic-dark overflow-hidden">
        {/* Always render, with at least fallback dimensions if 0 */}
        <GraphRenderer 
          ref={ref} 
          data={data} 
          extraVisualProps={extraVisualProps} 
          width={dimensions.width || 800} // Fallback to avoid hidden renderer
          height={dimensions.height || 600}
        />
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(5,5,8,0.6)_100%)]"></div>
    </div>
  );
});

export default GraphVisualizer;
