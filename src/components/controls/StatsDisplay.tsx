import React from 'react';
import { Card } from '@/components/ui/card';
import { Activity, Share2 } from 'lucide-react';
import { useSimulation } from '@/context/SimulationContext';



export const StatsDisplay: React.FC = () => {
    const { currentState } = useSimulation();
    const nodeCount = currentState.nodes.length;
    const edgeCount = currentState.links.length;

    return (
        <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-auto">
            <div className="flex gap-2">
                <Card className="px-4 py-2 flex items-center gap-3 bg-black/60 border-white/10 backdrop-blur-xl">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-gray-400 font-mono uppercase">Nodes</span>
                        <span className="text-lg font-bold text-g-green leading-none">{nodeCount}</span>
                    </div>
                    <Activity className="h-4 w-4 text-white/30" />
                </Card>
                
                <Card className="px-4 py-2 flex items-center gap-3 bg-black/60 border-white/10 backdrop-blur-xl">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-gray-400 font-mono uppercase">Links</span>
                        <span className="text-lg font-bold text-g-yellow leading-none">{edgeCount}</span>
                    </div>
                    <Share2 className="h-4 w-4 text-white/30" />
                </Card>
            </div>


        </div>
    );
}
