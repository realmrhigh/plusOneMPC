import React from 'react';
import { useDrumMachineStore } from '@/lib/stores/useDrumMachine';
import { cn } from '@/lib/utils';
import { getSampleById } from '@/lib/samples';
import { Play, Pause } from 'lucide-react';

const Sequencer: React.FC = () => {
  const {
    pads,
    patterns,
    currentPatternId,
    toggleStep,
    transport,
    startPlayback,
    stopPlayback
  } = useDrumMachineStore();
  
  // Get current pattern
  const currentPattern = patterns.find(p => p.id === currentPatternId);
  
  if (!currentPattern) {
    return <div>Pattern not found</div>;
  }
  
  // Arrange steps in a grid format for MPC-style sequencer
  const stepsPerRow = 4; // 4 steps per row (quarter notes)
  const rows = 4;        // 4 rows for a total of 16 steps
  
  return (
    <div className="p-2" style={{ touchAction: 'auto' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Sequencer - {currentPattern.name}</h2>
        
        {/* Play/Stop buttons */}
        <div className="flex space-x-2">
          {!transport.playing ? (
            <button 
              onClick={startPlayback}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-green-600 hover:bg-green-500 text-white"
            >
              <Play size={20} />
            </button>
          ) : (
            <button 
              onClick={stopPlayback}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-red-600 hover:bg-red-500 text-white"
            >
              <Pause size={20} />
            </button>
          )}
        </div>
      </div>
      
      {/* Track labels - left side */}
      <div className="flex">
        <div className="w-24 pr-2">
          {/* Empty corner */}
          <div className="h-10 flex items-center justify-center">
            <span className="text-xs text-zinc-400 font-medium">TRACKS</span>
          </div>
          
          {/* Track names */}
          {currentPattern.tracks.map((track) => {
            const pad = pads.find(p => p.id === track.padId);
            if (!pad) return null;
            
            const sample = pad.sampleId ? getSampleById(pad.sampleId) : null;
            const bgColor = sample ? hexToRgba(sample.color, 0.2) : 'rgba(30, 30, 30, 0.5)';
            
            return (
              <div 
                key={track.id}
                className="h-12 mb-2 flex items-center px-2 rounded-md"
                style={{ backgroundColor: bgColor }}
              >
                <span className="text-xs font-medium truncate w-full text-center">
                  {sample?.name || `Pad ${pad.keyLabel}`}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Grid of step buttons */}
        <div className="flex-1 grid grid-cols-4 gap-2">
          {/* Top row with beat numbers */}
          <div className="col-span-4 grid grid-cols-4 gap-2">
            {Array.from({ length: stepsPerRow }).map((_, i) => (
              <div key={i} className="h-10 flex items-center justify-center">
                <span className="text-xs font-bold text-zinc-300">
                  {i + 1}
                </span>
              </div>
            ))}
          </div>
          
          {/* Step buttons for each track */}
          {currentPattern.tracks.map((track) => {
            const pad = pads.find(p => p.id === track.padId);
            if (!pad) return null;
            
            const sample = pad.sampleId ? getSampleById(pad.sampleId) : null;
            const color = sample?.color || '#666666';
            
            // Chunking the steps into rows based on stepsPerRow
            const stepRows = [];
            for (let row = 0; row < rows; row++) {
              const rowSteps = track.steps.slice(row * stepsPerRow, (row + 1) * stepsPerRow);
              stepRows.push(rowSteps);
            }
            
            return (
              <div key={track.id} className="col-span-4 grid grid-cols-4 gap-2 mb-2">
                {stepRows.map((rowSteps, rowIndex) => (
                  <React.Fragment key={`${track.id}-row-${rowIndex}`}>
                    {rowSteps.map((step) => {
                      const isCurrentStep = transport.currentStep === step.id && transport.playing;
                      const stepPosition = rowIndex * stepsPerRow + step.id % stepsPerRow;
                      
                      return (
                        <button
                          key={`${track.id}-${step.id}`}
                          className={cn(
                            "h-12 rounded-md transition-all relative",
                            isCurrentStep ? "ring-2 ring-white" : "",
                            step.active ? "bg-opacity-100" : "bg-opacity-20 hover:bg-opacity-40"
                          )}
                          style={{
                            backgroundColor: step.active ? color : "#333",
                            borderLeft: isCurrentStep ? `4px solid white` : undefined
                          }}
                          onClick={() => toggleStep(track.id, step.id)}
                        >
                          {isCurrentStep && (
                            <div className="absolute inset-0 bg-white bg-opacity-20 rounded-md"></div>
                          )}
                          <span className="absolute bottom-1 right-1 text-xs opacity-50">
                            {stepPosition + 1}
                          </span>
                        </button>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Helper function to convert hex color to rgba
function hexToRgba(hex: string, alpha: number): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Return rgba
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default Sequencer;
