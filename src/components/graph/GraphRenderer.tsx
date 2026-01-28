import React, { useRef, useEffect } from 'react';
import { useSimulation } from '@/context/SimulationContext';
import { HypergraphState } from '@/types';

// Extra visual configuration passed dynamically
export interface VisualProps {
  shadowGrowth: number;
  nodeSize: number;
  auraOpacity: number;
  emissionSpeed: number;
  linkDistance: number;
  particleSize: number;
  linkWidth: number;
  linkOpacity: number;
  particleCount: number;
  friction: number;
  autoRotateSpeed: number;
}

interface GraphRendererProps {
  data: HypergraphState;
  extraVisualProps?: VisualProps;
  width: number;
  height: number;
}

export interface GraphRendererHandle {
    focusNode: (nodeId: string) => void;
}

const GraphRenderer = React.memo(React.forwardRef<GraphRendererHandle, GraphRendererProps>(({ width, height }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { initRenderer, updateCamera, isWorkerReady } = useSimulation();
  const initRef = useRef(false);

  useEffect(() => {
    if (canvasRef.current && !initRef.current && isWorkerReady) {
        initRef.current = true;
        const offscreen = canvasRef.current.transferControlToOffscreen();
        initRenderer(offscreen);
    }
  }, [initRenderer, isWorkerReady]);

  // Handle Resize

  
  // FIX: access hook inside component
  const { resizeRenderer } = useSimulation();
  
  useEffect(() => {
      // Send resize Update
      if (width > 0 && height > 0) {
          resizeRenderer(width, height);
      }
  }, [width, height, resizeRenderer]);

  // Orbit Control Logic
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const cameraState = useRef({ azimuth: 0, elevation: Math.PI / 2, radius: 150 });

  const sendCameraUpdate = () => {
    const { azimuth, elevation, radius } = cameraState.current;
    const x = radius * Math.sin(elevation) * Math.sin(azimuth);
    const z = radius * Math.sin(elevation) * Math.cos(azimuth);
    const y = radius * Math.cos(elevation);
    updateCamera(x, y, z);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      isDragging.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging.current) return;
      const dx = (e.clientX - lastPos.current.x) * 0.01;
      const dy = (e.clientY - lastPos.current.y) * 0.01;
      
      cameraState.current.azimuth -= dx;
      cameraState.current.elevation = Math.max(0.1, Math.min(Math.PI - 0.1, cameraState.current.elevation - dy));
      
      lastPos.current = { x: e.clientX, y: e.clientY };
      sendCameraUpdate();
  };

  const handleMouseUp = () => {
      isDragging.current = false;
  };
  
  const handleWheel = (e: React.WheelEvent) => {
      cameraState.current.radius = Math.max(10, Math.min(2000, cameraState.current.radius + e.deltaY * 0.5));
      sendCameraUpdate();
  };

  // Send initial camera position
  useEffect(() => {
     // Delay slightly to ensure worker is ready
     setTimeout(sendCameraUpdate, 100);
  }, []);

  React.useImperativeHandle(ref, () => ({
      focusNode: (_nodeId: string) => {
          console.warn("Focus node not yet implemented in Rust renderer");
      }
  }));

  return (
      <div style={{ width, height, overflow: 'hidden' }}
           onMouseDown={handleMouseDown}
           onMouseMove={handleMouseMove}
           onMouseUp={handleMouseUp}
           onMouseLeave={handleMouseUp}
           onWheel={handleWheel}
      >
      <canvas 
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: '100%', height: '100%', display: 'block', backgroundColor: '#050508', cursor: 'grab' }}
      />
      </div>
  );
}));

export default GraphRenderer;
