import React from 'react';
import { useDrumMachineStore } from '@/lib/stores/useDrumMachine';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QuantizationValue } from '@/lib/types';
import { 
  Trash2, 
  Volume2,
  VolumeX,
  Grid
} from 'lucide-react';

// Props to allow parent component to close panels
interface TransportProps {
  onClose?: () => void;
}

const Transport: React.FC<TransportProps> = ({ onClose }) => {
  const {
    transport,
    setTempo,
    setSwing,
    setQuantization,
    isMetronomeEnabled,
    toggleMetronome,
    clearPattern
  } = useDrumMachineStore();
  
  // Check if on mobile device
  const isMobile = useIsMobile();
  
  // Placeholder for any future control handlers
  
  // Handlers for settings
  const handleTempoChange = (value: number[]) => {
    setTempo(value[0]);
  };
  
  const handleSwingChange = (value: number[]) => {
    setSwing(value[0]);
  };
  
  const handleQuantizationChange = (value: QuantizationValue) => {
    setQuantization(value);
  };
  
  return (
    <div style={{ touchAction: 'auto' }}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4" style={{ marginTop: '20px' }}>
        {/* MPC-style BPM Display & Metronome Toggle */}
        <div 
          className={`${isMetronomeEnabled ? 'bg-orange-600' : 'bg-zinc-800'} border-2 border-zinc-700 rounded-md p-3 col-span-2 flex flex-col items-center justify-center cursor-pointer`}
          onClick={toggleMetronome}
        >
          <div className="text-xs uppercase font-semibold mb-1">Tempo</div>
          <div className="text-3xl font-mono font-bold tracking-widest">{transport.tempo}</div>
          <div className="text-xs uppercase font-semibold mt-1 flex items-center gap-1">
            {isMetronomeEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
            <span>Metronome {isMetronomeEnabled ? 'ON' : 'OFF'}</span>
          </div>
        </div>

        {/* Tempo Controls */}
        <div className="flex flex-col gap-2">
          <div className="text-center text-xs uppercase font-semibold">Tempo</div>
          <Slider
            orientation="vertical"
            value={[transport.tempo]}
            min={60}
            max={160}
            step={1}
            onValueChange={handleTempoChange}
            className="h-20"
          />
        </div>

        {/* Swing Controls */}
        <div className="flex flex-col gap-2">
          <div className="text-center text-xs uppercase font-semibold">Swing</div>
          <Slider
            orientation="vertical"
            value={[transport.swing]}
            min={0}
            max={50}
            step={1}
            onValueChange={handleSwingChange}
            className="h-20"
          />
        </div>

        {/* Simplified Transport Controls */}
        <div className="col-span-2 md:col-span-4 flex justify-center gap-3 mt-2 mb-0">
          {/* Clear pattern button */}
          <div className="flex flex-col items-center">
            <Button
              variant="outline"
              size="icon"
              onClick={clearPattern}
              className={`h-12 w-12 bg-red-800 hover:bg-red-700 border-2 border-red-500 rounded-xl ${isMobile ? 'touch-target' : ''}`}
              title="Clear All"
            >
              <Trash2 size={22} />
            </Button>
            <span className="text-xs font-semibold mt-1">CLEAR ALL</span>
          </div>
        </div>
      </div>
      
      {/* Quantization selector */}
      <div className="mb-4 flex items-center justify-between bg-red-950 p-3 rounded-md border border-red-800">
        <div className="flex items-center gap-2">
          <Grid size={16} />
          <span className="text-sm font-medium">Quantization</span>
        </div>
        
        <Select 
          value={transport.quantization}
          onValueChange={handleQuantizationChange}
        >
          <SelectTrigger className="w-32 bg-red-900 border-red-700">
            <SelectValue placeholder="Quantization" />
          </SelectTrigger>
          <SelectContent className="bg-red-900 border-red-700">
            <SelectItem value="4n">1/4 Note</SelectItem>
            <SelectItem value="8n">1/8 Note</SelectItem>
            <SelectItem value="16n">1/16 Note</SelectItem>
            <SelectItem value="32n">1/32 Note</SelectItem>
            <SelectItem value="64n">1/64 Note</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Current step indicator */}
      <div className="mt-4 flex justify-between">
        {Array.from({ length: 16 }).map((_, i) => (
          <div 
            key={i}
            className={`h-2 w-full mr-0.5 rounded-full ${
              transport.currentStep === i ? 'bg-white' : 'bg-red-600'
            } ${transport.currentStep === i ? 'shadow-glow' : ''}`}
          />
        ))}
      </div>
    </div>
  );
};

export default Transport;
