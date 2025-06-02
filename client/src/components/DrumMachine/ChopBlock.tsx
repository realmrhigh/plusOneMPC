import React, { useState, useRef, useEffect } from 'react';
import { useDrumMachineStore } from '@/lib/stores/useDrumMachine';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Scissors, Save, Play, Pause, Volume2, Trash2, BarChart4 } from 'lucide-react';

const ChopBlock: React.FC = () => {
  const { pads, assignSampleToPad } = useDrumMachineStore();
  
  // State for the audio clip
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [waveformPattern, setWaveformPattern] = useState<number[]>([]);
  
  // State for chop markers
  const [chopPoints, setChopPoints] = useState<number[]>([]);
  const [selectedChopIndex, setSelectedChopIndex] = useState<number | null>(null);
  const [selectedPadId, setSelectedPadId] = useState<number | null>(null);
  
  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Handler for uploading a new audio file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setAudioFile(file);
      
      // Create a URL for the audio file
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      
      // Reset chop points when a new file is loaded
      setChopPoints([]);
      setSelectedChopIndex(null);
      
      // Generate a consistent waveform pattern based on file name
      // This ensures the pattern stays the same between renders
      const wavePattern = [];
      for (let i = 0; i < 64; i++) {
        // Use a combination of sine waves for a more natural audio waveform look
        const hash = (file.name.length + i) * 13; // Simple hash for consistency
        const value = 20 + Math.sin(i * 0.2 + hash) * 10 + Math.sin(i * 0.5) * 15 + Math.cos(i * 0.1) * 10;
        wavePattern.push(Math.abs(value));
      }
      setWaveformPattern(wavePattern);
    }
  };
  
  // Handler for triggering file upload
  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Handler for playing/pausing audio
  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  // Handler for adding a chop point at the current playback position
  const addChopPoint = () => {
    if (audioRef.current && audioRef.current.currentTime > 0) {
      const newChopPoint = audioRef.current.currentTime;
      // Sort chop points by time
      const newChopPoints = [...chopPoints, newChopPoint].sort((a, b) => a - b);
      setChopPoints(newChopPoints);
    }
  };
  
  // Handler for removing the selected chop point
  const removeChopPoint = () => {
    if (selectedChopIndex !== null) {
      const newChopPoints = chopPoints.filter((_, index) => index !== selectedChopIndex);
      setChopPoints(newChopPoints);
      setSelectedChopIndex(null);
    }
  };
  
  // Handler for selecting a chop region
  const selectChopRegion = (index: number) => {
    setSelectedChopIndex(index);
    
    // Set playback position to the start of the selected region
    if (audioRef.current && chopPoints[index]) {
      audioRef.current.currentTime = chopPoints[index];
      setCurrentTime(chopPoints[index]);
    }
  };
  
  // Handler for assigning a chop to a pad
  const assignChopToPad = async () => {
    if (selectedChopIndex === null || selectedPadId === null || !audioFile || !audioUrl) {
      return;
    }
    
    try {
      // Get the start and end times of the selected chop region
      const startTime = chopPoints[selectedChopIndex];
      const endTime = chopPoints[selectedChopIndex + 1] || duration;
      
      // Extract the audio for the selected region
      // This would need server-side processing or a Web Audio API approach
      // For now, we'll just simulate by creating a new sample reference
      
      // In a real implementation, we would need to extract the audio segment
      // and save it as a new file or buffer, then assign it to the pad
      
      // Placeholder: Name the sample based on original file and chop region
      const chopName = `${audioFile.name.split('.')[0]}_chop_${selectedChopIndex + 1}`;
      
      // In a real implementation, we would upload this chop or save it
      // For now, we'll just use the dummy sample API in our store
      const sampleId = await useDrumMachineStore.getState().uploadSample(audioFile);
      
      if (sampleId) {
        // Assign the sample to the selected pad
        assignSampleToPad(selectedPadId, sampleId);
        
        // Provide feedback to user
        alert(`Assigned chop ${selectedChopIndex + 1} to pad ${selectedPadId + 1}`);
      }
    } catch (error) {
      console.error('Error assigning chop to pad:', error);
      alert('Failed to assign chop to pad');
    }
  };
  
  // Update current time during playback
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };
  
  // When audio is loaded, update duration
  const handleAudioLoaded = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };
  
  // Clean up when component unmounts
  // Generate a default waveform pattern when component first mounts
  useEffect(() => {
    if (waveformPattern.length === 0) {
      const defaultPattern = [];
      for (let i = 0; i < 64; i++) {
        // Generate a default waveform with gentle sine wave appearance
        const value = 30 + Math.sin(i * 0.2) * 15 + Math.sin(i * 0.5) * 8;
        defaultPattern.push(Math.abs(value));
      }
      setWaveformPattern(defaultPattern);
    }

    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl, waveformPattern.length]);
  
  // Render a visualization of the waveform and chop points
  const renderWaveform = () => {
    return (
      <div 
        ref={waveformRef} 
        className="h-24 bg-zinc-800 my-4 relative cursor-pointer border border-red-800 rounded-md overflow-hidden"
        onClick={(e) => {
          if (audioRef.current && waveformRef.current && audioUrl) {
            // Calculate position based on click
            const rect = waveformRef.current.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const percentage = offsetX / rect.width;
            const newTime = percentage * duration;
            
            // Set audio position
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
          } else if (!audioUrl) {
            // Prompt to upload a file if none is loaded
            triggerFileUpload();
          }
        }}
      >
        {/* Optional overlay text when no file is loaded */}
        {!audioUrl && (
          <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
            <div className="text-red-500 text-opacity-70 font-medium">
              Click to upload audio file
            </div>
          </div>
        )}
        {/* Playback position indicator - only show when audio is loaded */}
        {audioUrl && duration > 0 && (
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" 
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />
        )}
        
        {/* Chop points markers */}
        {chopPoints.map((point, index) => (
          <div 
            key={index}
            className={`absolute top-0 bottom-0 w-0.5 ${selectedChopIndex === index ? 'bg-white' : 'bg-yellow-500'} cursor-pointer z-20`}
            style={{ left: `${(point / duration) * 100}%` }}
            onClick={(e) => {
              e.stopPropagation();
              selectChopRegion(index);
            }}
          />
        ))}
        
        {/* Waveform visualization */}
        <div className="w-full h-full">
          {/* Dynamic audio visualization */}
          <div className="w-full h-full flex items-center">
            {/* Create a grid of bars to simulate waveform */}
            <div className="w-full h-3/4 flex items-center">
              {/* If we have a stored waveform pattern, use it, otherwise generate a default pattern */}
              {(waveformPattern.length > 0 ? waveformPattern : Array(64).fill(30)).map((height, idx) => {
                // Use a subtle animation effect for the current position only when audio is loaded
                const isNearCurrentPos = audioUrl && duration > 0 ? 
                  Math.abs((idx / 64) - (currentTime / duration)) < 0.05 : false;
                return (
                  <div 
                    key={idx} 
                    className={`mx-0.5 bg-red-600 ${isNearCurrentPos ? 'opacity-90' : 'opacity-60'}`}
                    style={{ 
                      height: `${height}%`,
                      width: `${100 / 64}%`,
                      transition: 'height 0.2s ease-out'
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="p-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Chop Block</h2>
        <p className="text-sm text-zinc-300 mb-4">
          Upload an audio file, create chop points, and assign segments to pads.
        </p>
        
        {/* File upload */}
        <div className="flex items-center gap-2 p-3 bg-red-950 rounded-lg border border-red-800 mb-4">
          <button
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-md flex items-center gap-2 flex-grow"
            onClick={triggerFileUpload}
          >
            <Upload className="h-4 w-4" />
            <span>{audioFile ? audioFile.name : 'Upload audio file (MP3/WAV)'}</span>
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
        
        {/* Always show waveform visualization for better UX */}
        {renderWaveform()}
        
        {/* Audio player */}
        {audioUrl && (
          <>
            <audio 
              ref={audioRef} 
              src={audioUrl} 
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleAudioLoaded}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            
            {/* Playback controls */}
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="outline"
                size="icon"
                onClick={togglePlayback}
                className="h-10 w-10 bg-red-800 hover:bg-red-700 border-2 border-red-500 rounded-xl"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </Button>
              
              <div className="text-sm">
                {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}
                {' / '}
                {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
              </div>
              
              <Button
                variant="outline"
                size="icon"
                onClick={addChopPoint}
                disabled={!audioUrl}
                className="h-10 w-10 bg-red-800 hover:bg-red-700 border-2 border-red-500 rounded-xl ml-auto"
                title="Add Chop Point"
              >
                <Scissors size={18} />
              </Button>
              
              {selectedChopIndex !== null && (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={removeChopPoint}
                  className="h-10 w-10 rounded-xl"
                  title="Remove Chop Point"
                >
                  <Trash2 size={18} />
                </Button>
              )}
            </div>
            
            {/* Volume control */}
            <div className="flex items-center gap-2 mb-6">
              <Volume2 className="h-4 w-4" />
              <Label className="mr-2">Volume</Label>
              <Slider
                defaultValue={[1]}
                max={1}
                min={0}
                step={0.01}
                onValueChange={(values) => {
                  if (audioRef.current) {
                    audioRef.current.volume = values[0];
                  }
                }}
              />
            </div>
            
            {/* Chop points list */}
            {chopPoints.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-2">Chop Regions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {chopPoints.map((startTime, index) => {
                    const endTime = chopPoints[index + 1] || duration;
                    const isSelected = selectedChopIndex === index;
                    
                    return (
                      <div 
                        key={index} 
                        className={`p-2 rounded-md cursor-pointer ${isSelected ? 'bg-red-700' : 'bg-zinc-800'} hover:bg-red-800`}
                        onClick={() => selectChopRegion(index)}
                      >
                        <div className="text-xs font-mono">
                          {Math.floor(startTime / 60)}:{Math.floor(startTime % 60).toString().padStart(2, '0')}
                          {' - '}
                          {Math.floor(endTime / 60)}:{Math.floor(endTime % 60).toString().padStart(2, '0')}
                        </div>
                        <div className="text-sm">
                          Chop {index + 1} ({(endTime - startTime).toFixed(2)}s)
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Pad assignment */}
            {selectedChopIndex !== null && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Assign to Pad</h3>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {pads.map((pad) => (
                    <button
                      key={pad.id}
                      className={`p-2 text-center rounded-md ${selectedPadId === pad.id ? 'bg-red-600' : 'bg-zinc-800'} hover:bg-zinc-700`}
                      onClick={() => setSelectedPadId(pad.id)}
                    >
                      <div className="text-xl font-bold">{pad.keyLabel}</div>
                    </button>
                  ))}
                </div>
                
                <Button
                  variant="default"
                  onClick={assignChopToPad}
                  disabled={selectedPadId === null}
                  className="w-full bg-red-600 hover:bg-red-500"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Assign Chop to Selected Pad
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* MPC logo at the bottom */}
      <div className="mt-8 text-center">
        <h1 className="text-6xl font-bold font-mono tracking-wider text-red-600 opacity-80">MPC</h1>
      </div>
    </div>
  );
};

export default ChopBlock;