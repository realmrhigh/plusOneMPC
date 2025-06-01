import React, { useState, useRef, useEffect } from 'react';
import { useDrumMachineStore } from '@/lib/stores/useDrumMachine';
import { getSampleById, sampleLibrary } from '@/lib/samples';
import { setupAudioContext } from '@/lib/audio';
import { saveDrumKits } from '@/lib/persistence';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sample } from '@/lib/types';
import { 
  Volume2,
  Music,
  Clock,
  Upload,
  Loader2
} from 'lucide-react';

const SampleProcessor: React.FC = () => {
  // Initialize all samples when component mounts
  useEffect(() => {
    console.log('Initializing audio context...');
    async function initAudio() {
      const audioContext = await setupAudioContext();
      console.log('Audio context started');
    }
    initAudio();
  }, []);
  const {
    pads,
    processorSettings,
    updateProcessorSettings,
    activePadId,
    triggerPad,
    assignSampleToPad,
    uploadSample,
    samples, // Add access to samples array
    updateSampleColor // Add the new color update function
  } = useDrumMachineStore();
  
  // State for selected pad and sample management
  const [selectedPadId, setSelectedPadId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get the currently selected pad (either explicitly selected or last active)
  const currentPadId = selectedPadId !== null ? selectedPadId : activePadId !== null ? activePadId : 0;
  
  // Get the pad and its settings
  const currentPad = pads.find(p => p.id === currentPadId);
  const currentSettings = processorSettings.find(s => s.padId === currentPadId) || {
    padId: currentPadId,
    volume: 0,
    pitch: 0,
    decay: 0.5
  };
  
  // Get sample info
  const sample = currentPad?.sampleId ? getSampleById(currentPad.sampleId) : null;
  
  // We no longer list all samples as requested - user will only use pad assignment
  // and upload their own samples
  
  // Function to assign a sample to the current pad
  const assignSample = (sampleId: string | null) => {
    if (currentPadId !== null) {
      assignSampleToPad(currentPadId, sampleId);
    }
  };
  
  // Enhanced file upload with more reliable pad assignment
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || currentPadId === null) return;
    
    try {
      setIsUploading(true);
      console.log(`Starting upload for pad ${currentPadId}`);
      
      // Only process the first file
      const file = files[0];
      
      // Check file type
      if (!file.type.startsWith('audio/')) {
        alert('Please upload an audio file (MP3, WAV, etc)');
        return;
      }
      
      // Save the current pad ID to a local variable to ensure it doesn't change during async operations
      const targetPadId = currentPadId;
      
      try {
        // First log the current state
        console.log(`Pre-upload state: Pad ${targetPadId} has sample: ${pads.find(p => p.id === targetPadId)?.sampleId}`);
        
        // Upload the sample and wait for it to load completely
        const sampleId = await uploadSample(file);
        
        // If upload was successful, assign to the current pad with a more robust approach
        if (sampleId) {
          console.log(`Sample upload successful, assigning ${sampleId} to pad ${targetPadId}`);
          
          // Force a clean assignment with verification
          const assignAndVerify = async () => {
            // Make the assignment
            assignSampleToPad(targetPadId, sampleId);
            
            // Verify the assignment after a short delay
            setTimeout(() => {
              const currentAssignment = pads.find(p => p.id === targetPadId)?.sampleId;
              console.log(`Verification: Pad ${targetPadId} now has sample ${currentAssignment}`);
              
              if (currentAssignment !== sampleId) {
                console.warn(`Assignment failed, retry: ${sampleId} to pad ${targetPadId}`);
                // Try one more time
                assignSampleToPad(targetPadId, sampleId);
              }
            }, 200);
          };
          
          // Execute the assignment process
          await assignAndVerify();
        } else {
          console.error('Sample upload returned null ID');
          alert('Error loading sample - please try another file');
        }
      } catch (uploadError) {
        console.error('Error in sample upload:', uploadError);
        alert('Error uploading sample - please try again');
      }
    } catch (error) {
      console.error('Error uploading sample:', error);
      alert('Error uploading sample. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Trigger file selection dialog
  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Local state for slider values to make them more responsive
  const [localVolume, setLocalVolume] = useState<number>(currentSettings.volume);
  const [localPitch, setLocalPitch] = useState<number>(currentSettings.pitch);
  const [localDecay, setLocalDecay] = useState<number>(currentSettings.decay);
  
  // Update local state when current settings change (e.g., when selecting different pads)
  useEffect(() => {
    setLocalVolume(currentSettings.volume);
    setLocalPitch(currentSettings.pitch);
    setLocalDecay(currentSettings.decay);
  }, [currentPadId, currentSettings]);
  
  // Update settings handlers with local state
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setLocalVolume(newVolume);
    updateProcessorSettings({
      ...currentSettings,
      volume: newVolume
    });
  };
  
  const handlePitchChange = (value: number[]) => {
    const newPitch = value[0];
    setLocalPitch(newPitch);
    updateProcessorSettings({
      ...currentSettings,
      pitch: newPitch
    });
  };
  
  const handleDecayChange = (value: number[]) => {
    const newDecay = value[0];
    setLocalDecay(newDecay);
    updateProcessorSettings({
      ...currentSettings,
      decay: newDecay
    });
  };
  
  // Play the sample to hear changes
  const playSample = () => {
    if (currentPad?.id !== undefined) {
      console.log(`Testing sample on pad ${currentPad.id} with sample ID ${currentPad.sampleId}`);
      // Force a refresh of the current pad info before playing
      const updatedPad = pads.find(p => p.id === currentPad.id);
      if (updatedPad && updatedPad.sampleId) {
        console.log(`Triggering pad ${updatedPad.id} with sample ${updatedPad.sampleId}`);
        triggerPad(updatedPad.id);
      } else {
        console.warn(`Cannot play sample: pad ${currentPad.id} has no sample assigned`);
      }
    }
  };
  
  return (
    <div style={{ touchAction: 'auto' }}>
      {/* Pad selector */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {pads.map((pad) => {
          const hasSample = !!pad.sampleId;
          const isSelected = pad.id === currentPadId;
          const padSample = pad.sampleId ? getSampleById(pad.sampleId) : null;
          const borderColor = padSample?.color || '#550000';
          
          return (
            <button
              key={pad.id}
              className={`
                p-2 text-center rounded-md text-sm font-medium
                ${isSelected
                  ? 'bg-red-600 text-white'
                  : hasSample
                    ? 'bg-zinc-700 hover:bg-zinc-600 text-white'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-dashed border-red-600'}
              `}
              onClick={() => setSelectedPadId(pad.id)}
              style={{ borderLeft: hasSample ? `4px solid ${borderColor}` : undefined }}
            >
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold">{pad.keyLabel}</span>
                {padSample && <span className="text-xs truncate w-full">{padSample.name}</span>}
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Sample info & controls */}
      <div className="flex flex-col space-y-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center">
              {sample ? sample.name : 'No Sample'}
              {currentPad && (
                <span className="ml-2 text-sm px-2 py-1 bg-red-900 rounded-md text-white">
                  Pad {currentPad.keyLabel}
                </span>
              )}
            </h3>
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                className="px-3 py-2 bg-red-700 rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => assignSample(null)}
                disabled={!sample || currentPadId === null}
              >
                Clear
              </button>
              
              <button
                className="px-4 py-2 bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={playSample}
                disabled={!currentPad || !currentPad.sampleId}
              >
                Test
              </button>
            </div>
            
            {/* Color selection options */}
            {sample && (
              <div className="mt-2">
                <h4 className="text-xs font-semibold mb-1">PAD COLOR</h4>
                <div className="flex gap-2">
                  <button 
                    className="w-8 h-8 rounded-full border-2 border-white bg-blue-500 hover:opacity-80" 
                    onClick={() => sample && updateSampleColor(sample.id, '#3b82f6')}
                  />
                  <button 
                    className="w-8 h-8 rounded-full border-2 border-white bg-red-500 hover:opacity-80" 
                    onClick={() => sample && updateSampleColor(sample.id, '#ef4444')}
                  />
                  <button 
                    className="w-8 h-8 rounded-full border-2 border-white bg-yellow-500 hover:opacity-80" 
                    onClick={() => sample && updateSampleColor(sample.id, '#eab308')}
                  />
                  <button 
                    className="w-8 h-8 rounded-full border-2 border-white bg-green-500 hover:opacity-80" 
                    onClick={() => sample && updateSampleColor(sample.id, '#22c55e')}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Upload control */}
        <div className="flex items-center gap-2 p-3 bg-red-950 rounded-lg border border-red-800">
          <button
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-md flex items-center gap-2 flex-grow"
            onClick={triggerFileUpload}
            disabled={isUploading || currentPadId === null}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Uploading audio...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>Upload MP3/WAV to selected pad</span>
              </>
            )}
          </button>
          
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="audio/mp3,audio/wav,audio/mpeg,audio/x-wav"
            className="hidden"
          />
        </div>
        
        {/* Sample selection panel removed as requested */}
      </div>
      
      {/* Controls */}
      <div className="space-y-6">
        {/* Volume slider */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            <Label>Volume</Label>
            <span className="ml-auto">{localVolume} dB</span>
          </div>
          <Slider
            value={[localVolume]}
            min={-24}
            max={12}
            step={1}
            onValueChange={handleVolumeChange}
            onValueCommit={() => playSample()}
            disabled={!sample}
          />
        </div>
        
        {/* Pitch slider */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            <Label>Pitch</Label>
            <span className="ml-auto">{localPitch > 0 ? '+' : ''}{localPitch} st</span>
          </div>
          <Slider
            value={[localPitch]}
            min={-12}
            max={12}
            step={1}
            onValueChange={handlePitchChange}
            onValueCommit={() => playSample()}
            disabled={!sample}
          />
        </div>
        
        {/* Decay slider */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <Label>Decay</Label>
            <span className="ml-auto">{localDecay.toFixed(2)} s</span>
          </div>
          <Slider
            value={[localDecay]}
            min={0.1}
            max={2}
            step={0.05}
            onValueChange={handleDecayChange}
            onValueCommit={() => playSample()}
            disabled={!sample}
          />
        </div>
      </div>
      
      {/* MPC logo at the bottom */}
      <div className="mt-8 text-center">
        <h1 className="text-6xl font-bold font-mono tracking-wider text-red-600 opacity-80">MPC</h1>
      </div>
    </div>
  );
};

export default SampleProcessor;
