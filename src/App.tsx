import React, { useState } from 'react';
import GraphVisualizer from './components/graph/GraphVisualizer';
import { ControlSidebar } from './components/controls/ControlSidebar';
import { StatsDisplay } from './components/controls/StatsDisplay';
import { BottomControlBar } from './components/controls/BottomControlBar';
import { SimulationProvider, useSimulation } from './context/SimulationContext';
import { Button } from './components/ui/button';
import { Settings, X } from 'lucide-react';

  // Inner component to access context
  const AppContent: React.FC = () => {
    const { 
        currentState, 
        shadowGrowth, 
        nodeSize, 
        auraOpacity, 
        emissionSpeed,
        linkDistance,
        particleSize,
        linkWidth,
        linkOpacity,
        particleCount,
        maxNodes, // Used as pseudo-entropy
        friction,
        autoRotateSpeed
    } = useSimulation();
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const graphContainerRef = React.useRef<HTMLDivElement>(null);

    const extraVisualProps = {
        shadowGrowth,
        nodeSize,
        auraOpacity,
        emissionSpeed,
        linkDistance,
        particleSize,
        linkWidth,
        linkOpacity,
        particleCount, 
        entropy: maxNodes / 5000, 
        signalSpeed: 1, // Default fallback
        friction,
        autoRotateSpeed
    };

  // CSS Grid Layout (Desktop):
  // Col 1: Sidebar (320px)
  // Col 2: Graph (1fr)
  // Row 1: Main Content (1fr)
  // Row 2: Footer (Auto)

  return (
    <div className="w-screen h-screen bg-cosmic-dark font-sans text-white select-none overflow-hidden flex flex-col md:grid md:grid-cols-[320px_1fr] md:grid-rows-[1fr_auto]">
      
      {/* MOBILE HEADER / TOGGLE (Visible only on small screens) */}
      <div className="absolute top-4 left-4 z-40 md:hidden">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setIsSidebarOpen(true)}
            className="bg-black/50 backdrop-blur-md border-white/20 text-white hover:bg-white/10"
          >
              <Settings className="h-5 w-5" />
          </Button>
      </div>

      {/* AREA 1: SIDEBAR (Left) */}
      {/* Mobile: Fixed Slide-over | Desktop: Static Column */}
      <div className={`
          fixed inset-y-0 left-0 z-50 w-80 bg-black/90 backdrop-blur-xl border-r border-white/10 shadow-2xl transform transition-transform duration-300 ease-in-out
          md:relative md:transform-none md:w-full md:bg-black/80 md:overflow-hidden
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
          <div className="h-full flex flex-col">
              {/* Mobile Close Button */}
              <div className="flex justify-end p-2 md:hidden">
                  <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}>
                      <X className="h-5 w-5 text-gray-400" />
                  </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                 <ControlSidebar />
              </div>
          </div>
      </div>

      {/* MOBILE BACKDROP */}
      {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
      )}

      {/* AREA 2: MAIN GRAPH (Right) */}
      {/* AREA 2: MAIN GRAPH (Right) */}
      <div className="relative flex-1 bg-black/50 overflow-hidden md:order-2" ref={graphContainerRef}>
          <GraphVisualizer
               data={currentState}
               extraVisualProps={extraVisualProps}
           />
          
          <StatsDisplay />
      </div>

      {/* AREA 3: FOOTER (Bottom, Spans All) */}
      <div className="border-t border-white/10 bg-black/90 backdrop-blur-xl z-30 flex items-center justify-center p-4 md:col-span-2 md:order-3">
           <BottomControlBar 
             onFocusNode={(id) => console.log("Focus: " + id)}
           />
      </div>

    </div>
  );
};

const App: React.FC = () => {
    return (
        <SimulationProvider>
            <AppContent />
        </SimulationProvider>
    );
};

export default App;